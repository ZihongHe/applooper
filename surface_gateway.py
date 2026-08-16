"""Private, target-bound HTTP/WebSocket gateway for isolated Web surfaces.

The public AppLooper Preview capability is intentionally read-only.  A
headless Chromium surface needs a different boundary: forms, API mutations,
cookies and same-origin WebSockets must work, but application JavaScript must
not gain a generic route to other services on the host.

``SurfaceOriginGateway`` binds only to loopback and is immutable after start.
Each instance maps one random ``*.localhost`` browser origin to exactly one
pre-validated loopback upstream origin.  It can also be configured as
Chromium's HTTP proxy; absolute-form requests for every other origin and all
CONNECT requests are rejected.  This prevents a page from navigating or
fetching an arbitrary localhost service while preserving ordinary same-origin
application behaviour.
"""

from __future__ import annotations

import base64
import hashlib
import http.client
import ipaddress
import re
import secrets
import select
import socket
import ssl
import threading
import urllib.parse
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Iterable


DEFAULT_MAX_REQUEST_BYTES = 32 * 1024 * 1024
DEFAULT_MAX_RESPONSE_BYTES = 64 * 1024 * 1024
DEFAULT_TIMEOUT_SECONDS = 20.0
MAX_WEBSOCKET_HEADER_BYTES = 64 * 1024
ALLOWED_METHODS = frozenset({"GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"})

_HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "proxy-connection",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
}
_HOST_METADATA_HEADERS = {
    "forwarded",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-port",
    "x-forwarded-proto",
    "via",
}
_BLOCKED_COOKIE_NAMES = {"__host-workflow_session", "workflow_session"}
_SURFACE_HOST_RE = re.compile(r"^surface-[a-f0-9]{32}\.localhost$")


class SurfaceGatewayError(RuntimeError):
    """Raised when a private surface gateway cannot be created or started."""


@dataclass(frozen=True)
class _UpstreamTarget:
    scheme: str
    host: str
    connect_host: str
    port: int
    origin: str
    base_path: str
    base_query: str


def _authority(host: str, port: int, scheme: str) -> str:
    rendered = f"[{host}]" if ":" in host and not host.startswith("[") else host
    default = 443 if scheme == "https" else 80
    return rendered if port == default else f"{rendered}:{port}"


def _normalized_origin(scheme: str, host: str, port: int) -> str:
    return f"{scheme}://{_authority(host, port, scheme)}"


def _resolve_loopback_target(upstream_url: str) -> _UpstreamTarget:
    try:
        parsed = urllib.parse.urlsplit(str(upstream_url or ""))
        scheme = parsed.scheme.casefold()
        host = str(parsed.hostname or "").casefold().rstrip(".")
        port = parsed.port or (443 if scheme == "https" else 80)
    except ValueError as exc:
        raise SurfaceGatewayError("The surface upstream URL is invalid") from exc
    if scheme not in {"http", "https"} or not host:
        raise SurfaceGatewayError("The surface upstream must be an HTTP(S) loopback URL")
    if parsed.username is not None or parsed.password is not None or parsed.fragment:
        raise SurfaceGatewayError("The surface upstream URL must not contain credentials or a fragment")
    try:
        candidates = {
            str(item[4][0])
            for item in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
            if item[4]
        }
        if not candidates or any(not ipaddress.ip_address(value).is_loopback for value in candidates):
            raise ValueError("non-loopback address")
    except (OSError, ValueError) as exc:
        raise SurfaceGatewayError("The surface upstream must resolve only to loopback") from exc
    # Connect to an already-validated numeric address.  The request Host and
    # TLS SNI still use the configured name; request data can never trigger a
    # second DNS lookup or select a different destination.
    connect_host = sorted(candidates, key=lambda value: (":" in value, value))[0]
    return _UpstreamTarget(
        scheme=scheme,
        host=host,
        connect_host=connect_host,
        port=port,
        origin=_normalized_origin(scheme, host, port),
        base_path=parsed.path or "/",
        base_query=parsed.query,
    )


class _PinnedHTTPSConnection(http.client.HTTPSConnection):
    """HTTPSConnection whose TCP peer was validated before request dispatch."""

    def __init__(
        self,
        host: str,
        port: int,
        *,
        connect_host: str,
        timeout: float,
        context: ssl.SSLContext | None,
    ) -> None:
        super().__init__(host, port, timeout=timeout, context=context)
        self._connect_host = connect_host

    def connect(self) -> None:
        raw = socket.create_connection(
            (self._connect_host, self.port),
            self.timeout,
            self.source_address,
        )
        self.sock = self._context.wrap_socket(raw, server_hostname=self.host)


class _SurfaceGatewayServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 64

    def __init__(self, gateway: "SurfaceOriginGateway") -> None:
        self.gateway = gateway
        super().__init__(("127.0.0.1", 0), _SurfaceGatewayHandler)

    def get_request(self):  # type: ignore[no-untyped-def]
        connection, address = super().get_request()
        connection.settimeout(self.gateway.timeout_seconds)
        return connection, address


class SurfaceOriginGateway:
    """One loopback-only interactive browser origin bound to one upstream."""

    def __init__(
        self,
        upstream_url: str,
        *,
        max_request_bytes: int = DEFAULT_MAX_REQUEST_BYTES,
        max_response_bytes: int = DEFAULT_MAX_RESPONSE_BYTES,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
        tls_context: ssl.SSLContext | None = None,
        origin_key: str = "",
    ) -> None:
        if not 0 < int(max_request_bytes) <= 1024 * 1024 * 1024:
            raise SurfaceGatewayError("max_request_bytes is outside the supported range")
        if not 0 < int(max_response_bytes) <= 1024 * 1024 * 1024:
            raise SurfaceGatewayError("max_response_bytes is outside the supported range")
        if not 0 < float(timeout_seconds) <= 300:
            raise SurfaceGatewayError("timeout_seconds is outside the supported range")
        self.target = _resolve_loopback_target(upstream_url)
        self.max_request_bytes = int(max_request_bytes)
        self.max_response_bytes = int(max_response_bytes)
        self.timeout_seconds = float(timeout_seconds)
        self.tls_context = tls_context
        self._nonce = secrets.token_hex(16)
        normalized_origin_key = str(origin_key or "").strip()
        if normalized_origin_key and re.fullmatch(r"[a-f0-9]{32}", normalized_origin_key) is None:
            raise SurfaceGatewayError("origin_key must be 32 lowercase hexadecimal characters")
        # The proxy's listening port is deliberately ephemeral, but a managed
        # browser may supply a durable per-run/surface origin key.  Decoupling
        # those two authorities lets Chromium keep the same cookie,
        # localStorage and IndexedDB namespace after a container replacement
        # without binding a predictable host port.  Callers that do not opt in
        # retain the former one-shot origin behavior.
        self._origin_key = normalized_origin_key
        self._surface_host = f"surface-{normalized_origin_key or self._nonce}.localhost"
        self._origin_port = 80 if normalized_origin_key else None
        if not _SURFACE_HOST_RE.fullmatch(self._surface_host):  # defensive assertion
            raise SurfaceGatewayError("Unable to create a private surface host")
        self._server: _SurfaceGatewayServer | None = None
        self._thread: threading.Thread | None = None
        self._lifecycle_lock = threading.RLock()
        self._bridge_lock = threading.RLock()
        self._bridge_sockets: set[socket.socket] = set()

    @property
    def port(self) -> int:
        server = self._server
        if server is None:
            raise SurfaceGatewayError("The surface gateway has not started")
        return int(server.server_address[1])

    @property
    def origin(self) -> str:
        authority = self._gateway_authority()
        return f"http://{authority}"

    @property
    def base_url(self) -> str:
        """Synthetic browser URL corresponding to the configured upstream entry."""

        return urllib.parse.urlunsplit(
            ("http", self._gateway_authority(), self.target.base_path, self.target.base_query, "")
        )

    @property
    def proxy_url(self) -> str:
        """Loopback proxy URL for Chromium's ``--proxy-server`` switch."""

        return f"http://127.0.0.1:{self.port}"

    @property
    def origin_key(self) -> str:
        """Stable managed-origin key, or empty for a disposable gateway."""

        return self._origin_key

    def start(self) -> "SurfaceOriginGateway":
        with self._lifecycle_lock:
            if self._server is not None:
                return self
            server: _SurfaceGatewayServer | None = None
            try:
                server = _SurfaceGatewayServer(self)
                thread = threading.Thread(
                    target=server.serve_forever,
                    kwargs={"poll_interval": 0.25},
                    name=f"surface-origin-{self._nonce[:8]}",
                    daemon=True,
                )
                self._server = server
                thread.start()
                self._thread = thread
            except Exception:
                self._server = None
                self._thread = None
                try:
                    if server is not None:
                        server.server_close()
                except Exception:
                    pass
                raise
        return self

    def stop(self) -> None:
        with self._lifecycle_lock:
            server, self._server = self._server, None
            thread, self._thread = self._thread, None
            with self._bridge_lock:
                bridges = tuple(self._bridge_sockets)
                self._bridge_sockets.clear()
            for connection in bridges:
                try:
                    connection.shutdown(socket.SHUT_RDWR)
                except OSError:
                    pass
                try:
                    connection.close()
                except OSError:
                    pass
            if server is not None:
                server.shutdown()
                server.server_close()
            if thread is not None and thread is not threading.current_thread():
                thread.join(timeout=3.0)

    def __enter__(self) -> "SurfaceOriginGateway":
        return self.start()

    def __exit__(self, *_: object) -> None:
        self.stop()

    def _register_bridge(self, *connections: socket.socket) -> None:
        with self._bridge_lock:
            self._bridge_sockets.update(connections)

    def _unregister_bridge(self, *connections: socket.socket) -> None:
        with self._bridge_lock:
            for connection in connections:
                self._bridge_sockets.discard(connection)

    def _gateway_authority(self) -> str:
        origin_port = self._origin_port
        if origin_port is None:
            origin_port = self.port
        if origin_port == 80:
            return self._surface_host
        return f"{self._surface_host}:{origin_port}"

    def request_target(self, raw_target: str, host_headers: Iterable[str]) -> str:
        """Validate a proxy/origin-form request and return path plus query."""

        hosts = [str(value).strip() for value in host_headers if str(value).strip()]
        expected = self._gateway_authority().casefold()
        if len(hosts) != 1 or hosts[0].casefold() != expected:
            raise PermissionError("The request Host is not this private surface origin")
        if not raw_target or any(ord(char) < 32 for char in raw_target) or "\\" in raw_target:
            raise PermissionError("The request target is invalid")
        try:
            parsed = urllib.parse.urlsplit(raw_target)
        except ValueError as exc:
            raise PermissionError("The request target is invalid") from exc
        if parsed.fragment:
            raise PermissionError("Fragments are not valid HTTP request targets")
        if parsed.scheme or parsed.netloc:
            if (
                parsed.scheme.casefold() not in {"http", "ws"}
                or parsed.hostname is None
                or parsed.hostname.casefold().rstrip(".") != self._surface_host
                or (parsed.port or 80) != (self._origin_port or self.port)
            ):
                raise PermissionError("The proxy request is outside this surface origin")
        elif not raw_target.startswith("/") or raw_target.startswith("//"):
            raise PermissionError("The request target must be origin-form or this gateway's absolute URL")
        path = parsed.path or "/"
        return path + (("?" + parsed.query) if parsed.query else "")

    def upstream_connection(self) -> http.client.HTTPConnection:
        if self.target.scheme == "https":
            return _PinnedHTTPSConnection(
                self.target.host,
                self.target.port,
                connect_host=self.target.connect_host,
                timeout=self.timeout_seconds,
                context=self.tls_context,
            )
        return http.client.HTTPConnection(
            self.target.connect_host,
            self.target.port,
            timeout=self.timeout_seconds,
        )

    def websocket_socket(self) -> socket.socket:
        raw = socket.create_connection(
            (self.target.connect_host, self.target.port),
            timeout=self.timeout_seconds,
        )
        if self.target.scheme == "https":
            context = self.tls_context or ssl.create_default_context()
            return context.wrap_socket(raw, server_hostname=self.target.host)
        return raw


class _SurfaceGatewayHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "AppLooperSurfaceGateway/1"

    @property
    def gateway(self) -> SurfaceOriginGateway:
        return self.server.gateway  # type: ignore[attr-defined,no-any-return]

    def log_message(self, *_: object) -> None:
        return

    def _error(self, status: int, code: str, message: str, *, allow: str = "") -> None:
        body = (f'{{"error":"{code}","message":"{message}"}}').encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "close")
        if allow:
            self.send_header("Allow", allow)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)
        self.close_connection = True

    def _validated_target(self) -> str | None:
        try:
            return self.gateway.request_target(self.path, self.headers.get_all("Host", []))
        except (PermissionError, ValueError):
            self._error(HTTPStatus.FORBIDDEN, "surface_origin_forbidden", "Request is outside this surface origin")
            return None

    @staticmethod
    def _connection_tokens(headers) -> set[str]:  # type: ignore[no-untyped-def]
        return {
            token.strip().casefold()
            for value in headers.get_all("Connection", [])
            for token in value.split(",")
            if token.strip()
        }

    @staticmethod
    def _filter_cookie(value: str) -> str:
        kept: list[str] = []
        for part in str(value or "").split(";"):
            item = part.strip()
            if not item:
                continue
            name = item.partition("=")[0].strip().casefold()
            if name not in _BLOCKED_COOKIE_NAMES:
                kept.append(item)
        return "; ".join(kept)

    def _request_headers(self, *, websocket: bool = False) -> dict[str, str]:
        connection_tokens = self._connection_tokens(self.headers)
        skipped = _HOP_BY_HOP_HEADERS | _HOST_METADATA_HEADERS | connection_tokens | {"host", "content-length"}
        result: dict[str, str] = {}
        for name, value in self.headers.items():
            lowered = name.casefold()
            if lowered in skipped or lowered.startswith("proxy-"):
                continue
            if lowered == "cookie":
                value = self._filter_cookie(value)
                if not value:
                    continue
            elif lowered == "origin":
                origin = value.rstrip("/")
                if origin == self.gateway.origin:
                    value = self.gateway.target.origin
                elif origin not in {"null", self.gateway.target.origin}:
                    raise PermissionError("Cross-origin request metadata is not allowed")
            elif lowered == "referer":
                if value.startswith(self.gateway.origin + "/") or value == self.gateway.origin:
                    value = self.gateway.target.origin + value[len(self.gateway.origin) :]
                else:
                    continue
            result[name] = value
        result["Host"] = _authority(
            self.gateway.target.host,
            self.gateway.target.port,
            self.gateway.target.scheme,
        )
        if websocket:
            result["Upgrade"] = "websocket"
            result["Connection"] = "Upgrade"
        return result

    def _read_request_body(self) -> bytes | None:
        if self.headers.get_all("Transfer-Encoding", []):
            self._error(
                HTTPStatus.BAD_REQUEST,
                "unsupported_transfer_encoding",
                "Transfer-Encoding is not supported",
            )
            return None
        lengths = self.headers.get_all("Content-Length", [])
        if not lengths:
            return b""
        if len(lengths) != 1 or re.fullmatch(r"[0-9]+", lengths[0]) is None:
            self._error(HTTPStatus.BAD_REQUEST, "invalid_content_length", "Content-Length is invalid")
            return None
        length = int(lengths[0])
        if length > self.gateway.max_request_bytes:
            self._error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "request_too_large", "Request body is too large")
            return None
        body = self.rfile.read(length)
        if len(body) != length:
            self._error(HTTPStatus.BAD_REQUEST, "incomplete_request", "Request body is incomplete")
            return None
        return body

    @staticmethod
    def _rewrite_set_cookie(value: str) -> str:
        parts = [part.strip() for part in str(value or "").split(";")]
        if not parts or "=" not in parts[0]:
            return ""
        return "; ".join(
            part for index, part in enumerate(parts) if index == 0 or part.partition("=")[0].strip().casefold() != "domain"
        )

    def _rewrite_location(self, value: str, request_target: str) -> str:
        upstream_url = self.gateway.target.origin + request_target
        resolved = urllib.parse.urlsplit(urllib.parse.urljoin(upstream_url, value))
        resolved_port = resolved.port or (443 if resolved.scheme.casefold() == "https" else 80)
        if (
            resolved.scheme.casefold() != self.gateway.target.scheme
            or (resolved.hostname or "").casefold().rstrip(".") != self.gateway.target.host
            or resolved_port != self.gateway.target.port
        ):
            raise PermissionError("The upstream attempted a cross-origin redirect")
        return urllib.parse.urlunsplit(
            ("http", self.gateway._gateway_authority(), resolved.path or "/", resolved.query, resolved.fragment)
        )

    def _response_headers(
        self,
        headers: list[tuple[str, str]],
        request_target: str,
    ) -> list[tuple[str, str]]:
        connection_tokens = {
            token.strip().casefold()
            for name, value in headers
            if name.casefold() == "connection"
            for token in value.split(",")
            if token.strip()
        }
        skipped = _HOP_BY_HOP_HEADERS | connection_tokens | {"content-length"}
        result: list[tuple[str, str]] = []
        for name, value in headers:
            lowered = name.casefold()
            if lowered in skipped:
                continue
            if lowered == "set-cookie":
                value = self._rewrite_set_cookie(value)
                if not value:
                    continue
            elif lowered == "location":
                value = self._rewrite_location(value, request_target)
            elif lowered == "access-control-allow-origin" and value.rstrip("/") == self.gateway.target.origin:
                value = self.gateway.origin
            result.append((name, value))
        return result

    def _is_websocket(self) -> bool:
        return (
            self.command == "GET"
            and self.headers.get("Upgrade", "").strip().casefold() == "websocket"
            and "upgrade" in self._connection_tokens(self.headers)
        )

    def _relay_http(self, method: str) -> None:
        target = self._validated_target()
        if target is None:
            return
        if self._is_websocket():
            self._relay_websocket(target)
            return
        body = self._read_request_body()
        if body is None:
            return
        try:
            request_headers = self._request_headers()
        except PermissionError:
            self._error(HTTPStatus.FORBIDDEN, "surface_origin_forbidden", "Cross-origin request is not allowed")
            return
        if body:
            request_headers["Content-Length"] = str(len(body))
        connection = self.gateway.upstream_connection()
        try:
            connection.request(method, target, body=body or None, headers=request_headers)
            upstream = connection.getresponse()
            response_body = b"" if method == "HEAD" else upstream.read(self.gateway.max_response_bytes + 1)
            if len(response_body) > self.gateway.max_response_bytes:
                self._error(HTTPStatus.BAD_GATEWAY, "surface_response_too_large", "Upstream response is too large")
                return
            try:
                headers = self._response_headers(upstream.getheaders(), target)
            except PermissionError:
                self._error(HTTPStatus.BAD_GATEWAY, "surface_redirect_forbidden", "Cross-origin redirect was blocked")
                return
            self.send_response(upstream.status, upstream.reason)
            for name, value in headers:
                self.send_header(name, value)
            if method == "HEAD":
                upstream_length = upstream.getheader("Content-Length", "")
                response_length = upstream_length if upstream_length.isdigit() else "0"
            else:
                response_length = str(len(response_body))
            self.send_header("Content-Length", response_length)
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            if method != "HEAD" and response_body:
                self.wfile.write(response_body)
        except (OSError, ssl.SSLError, http.client.HTTPException, ValueError):
            self._error(HTTPStatus.BAD_GATEWAY, "surface_upstream_unavailable", "Surface upstream is unavailable")
        finally:
            connection.close()

    @staticmethod
    def _read_header_block(connection: socket.socket) -> bytes:
        data = bytearray()
        while b"\r\n\r\n" not in data:
            chunk = connection.recv(1)
            if not chunk:
                raise ConnectionError("WebSocket upstream closed during handshake")
            data.extend(chunk)
            if len(data) > MAX_WEBSOCKET_HEADER_BYTES:
                raise ConnectionError("WebSocket handshake is too large")
        return bytes(data)

    def _rewrite_websocket_response(self, response: bytes) -> bytes:
        """Validate a 101 response and keep its cookies on the surface origin."""

        try:
            header_block, remainder = response.split(b"\r\n\r\n", 1)
            lines = header_block.split(b"\r\n")
            first_line = lines[0]
            if not re.match(rb"^HTTP/1\.[01] 101(?: |$)", first_line):
                raise ValueError("WebSocket upstream rejected the upgrade")
            rewritten: list[bytes] = [first_line]
            connection_tokens: set[str] = set()
            upgrade = ""
            for raw_line in lines[1:]:
                if b":" not in raw_line:
                    raise ValueError("Malformed WebSocket response header")
                raw_name, raw_value = raw_line.split(b":", 1)
                name = raw_name.decode("ascii", errors="strict").strip()
                value = raw_value.decode("iso-8859-1").strip()
                lowered = name.casefold()
                if lowered == "set-cookie":
                    value = self._rewrite_set_cookie(value)
                    if not value:
                        continue
                elif lowered == "access-control-allow-origin" and value.rstrip("/") == self.gateway.target.origin:
                    value = self.gateway.origin
                elif lowered == "connection":
                    connection_tokens.update(token.strip().casefold() for token in value.split(",") if token.strip())
                elif lowered == "upgrade":
                    upgrade = value.casefold()
                rewritten.append(f"{name}: {value}".encode("iso-8859-1"))
            if upgrade != "websocket" or "upgrade" not in connection_tokens:
                raise ValueError("WebSocket upstream returned an invalid upgrade")
            return b"\r\n".join(rewritten) + b"\r\n\r\n" + remainder
        except (UnicodeError, ValueError) as exc:
            raise ConnectionError("WebSocket upstream returned an invalid handshake") from exc

    def _relay_websocket(self, target: str) -> None:
        try:
            request_headers = self._request_headers(websocket=True)
        except PermissionError:
            self._error(HTTPStatus.FORBIDDEN, "surface_origin_forbidden", "Cross-origin request is not allowed")
            return
        upstream: socket.socket | None = None
        try:
            upstream = self.gateway.websocket_socket()
            lines = [f"GET {target} HTTP/1.1"] + [f"{name}: {value}" for name, value in request_headers.items()]
            upstream.sendall(("\r\n".join(lines) + "\r\n\r\n").encode("iso-8859-1"))
            response = self._rewrite_websocket_response(self._read_header_block(upstream))
            self.wfile.write(response)
            self.wfile.flush()
            self.close_connection = True
            client = self.connection
            self.gateway._register_bridge(client, upstream)
            while True:
                readable, _, _ = select.select([client, upstream], [], [], 1.0)
                if not readable:
                    if self.gateway._server is None:
                        break
                    continue
                for source in readable:
                    payload = source.recv(64 * 1024)
                    if not payload:
                        return
                    (upstream if source is client else client).sendall(payload)
        except (OSError, ssl.SSLError, ConnectionError, ValueError):
            if not self.close_connection:
                self._error(HTTPStatus.BAD_GATEWAY, "surface_websocket_unavailable", "Surface WebSocket is unavailable")
        finally:
            if upstream is not None:
                self.gateway._unregister_bridge(self.connection, upstream)
                try:
                    upstream.close()
                except OSError:
                    pass

    def _method(self) -> None:
        if self.command not in ALLOWED_METHODS:
            self._error(
                HTTPStatus.METHOD_NOT_ALLOWED,
                "surface_method_forbidden",
                "Method is not allowed",
                allow=", ".join(sorted(ALLOWED_METHODS)),
            )
            return
        self._relay_http(self.command)

    do_GET = _method
    do_HEAD = _method
    do_POST = _method
    do_PUT = _method
    do_PATCH = _method
    do_DELETE = _method
    do_OPTIONS = _method

    def do_CONNECT(self) -> None:  # noqa: N802
        self._method()

    def do_TRACE(self) -> None:  # noqa: N802
        self._method()


__all__ = [
    "ALLOWED_METHODS",
    "SurfaceGatewayError",
    "SurfaceOriginGateway",
]
