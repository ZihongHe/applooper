"""Isolated experience-surface runtimes exposed through a small RFB server.

The first driver intentionally targets Web surfaces.  Chromium runs headless
with an isolated profile, DevTools supplies exact viewport frames and accepts
page-scoped input, and the built-in RFB endpoint lets the existing noVNC PWA
remain the common viewer.  Nothing in this module captures the host desktop.
"""

from __future__ import annotations

import base64
import contextlib
import io
import json
import os
import queue
import re
import shutil
import socket
import struct
import subprocess
import tempfile
import threading
import time
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, BinaryIO


_DURABLE_PROFILE_SCHEMA_VERSION = 1


class SurfaceRuntimeError(RuntimeError):
    """Raised when an isolated surface cannot be started or controlled."""


def trial_seed_apply_expression(seed: dict[str, Any] | None) -> str:
    """Build a page-scoped script that writes temporary trial data."""

    payload = seed if isinstance(seed, dict) else {}
    return (
        "(() => { const seed = "
        + json.dumps(payload, ensure_ascii=True)
        + "; try {"
        " const keys = [];"
        " try { for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i) || ''); } catch (_e) {}"
        " const preferred = String(seed.storage_key || '');"
        " const chosen = preferred || keys[0] || '';"
        " const listKey = String(seed.list_key || '');"
        " const records = Array.isArray(seed.records) ? seed.records : [];"
        " const need = Math.max(0, Math.min(8, Number(seed.ensure_count || seed.ensure_logs || 0)));"
        " if (chosen && (records.length || need > 0)) {"
        "   let raw = {}; try { raw = JSON.parse(localStorage.getItem(chosen) || '{}') || {}; } catch (_e2) { raw = {}; }"
        "   if (records.length && listKey) {"
        "     if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};"
        "     if (!Array.isArray(raw[listKey])) raw[listKey] = [];"
        "     records.forEach((rec) => {"
        "       if (!rec || typeof rec !== 'object') return;"
        "       const id = String(rec.id || '');"
        "       if (id && raw[listKey].some((row) => row && String(row.id || '') === id)) return;"
        "       raw[listKey].push(rec);"
        "     });"
        "     if (listKey === 'pets' && !raw.selectedPetId && raw.pets && raw.pets[0]) raw.selectedPetId = raw.pets[0].id;"
        "   } else {"
        "     const today = new Date().toISOString().slice(0, 10);"
        "     if (raw.days && typeof raw.days === 'object') {"
        "       let day = raw.days[today]; if (!day || typeof day !== 'object') day = {count:0,logs:[],goal:8};"
        "       if (!Array.isArray(day.logs)) day.logs = [];"
        "       while (day.logs.length < need) day.logs.push({time:'12:00',ts:Date.now()-day.logs.length*60000});"
        "       day.count = Math.max(Number(day.count||0), day.logs.length); raw.days[today] = day;"
        "     } else {"
        "       const found = listKey || ['pets','items','todos','tasks','records','list'].find((name) => Array.isArray(raw[name]));"
        "       if (found) {"
        "         if (!Array.isArray(raw[found])) raw[found] = [];"
        "         while (raw[found].length < need) raw[found].push({id:'trial-'+Date.now(), title:'Trial item', name:'Trial item'});"
        "       } else if (Array.isArray(raw)) {"
        "         while (raw.length < need) raw.push({id:'trial-'+Date.now(), title:'Trial item'});"
        "       }"
        "     }"
        "   }"
        "   localStorage.setItem(chosen, JSON.stringify(raw));"
        " }"
        " const id = String(seed.focus_id || '');"
        " if (id) { const node = document.getElementById(id); if (node) { try { node.scrollIntoView({block:'center'}); } catch (_e3) {} } }"
        "} catch (_err) {} return true; })()"
    )


@dataclass(frozen=True)
class BrowserSurfaceConfig:
    run_id: str
    surface_id: str
    url: str
    width: int
    height: int
    mobile: bool
    platform: str
    device_name: str
    runtime_dir: Path
    proxy_url: str = ""
    # Managed AppLooper surfaces pass a directory below the participant's
    # durable WF_AGENT_HOME volume.  The optional form keeps standalone callers
    # on the former disposable-profile behavior.
    profile_dir: Path | None = None
    profile_pool_dir: Path | None = None


@dataclass(frozen=True)
class _RfbPixelFormat:
    bits_per_pixel: int
    depth: int
    big_endian: bool
    true_color: bool
    red_max: int
    green_max: int
    blue_max: int
    red_shift: int
    green_shift: int
    blue_shift: int

    _STRUCT = struct.Struct(">BBBBHHHBBBxxx")

    @classmethod
    def from_wire(cls, payload: bytes) -> "_RfbPixelFormat":
        if len(payload) != cls._STRUCT.size:
            raise ConnectionError("Invalid RFB pixel-format payload")
        (
            bits_per_pixel,
            depth,
            big_endian,
            true_color,
            red_max,
            green_max,
            blue_max,
            red_shift,
            green_shift,
            blue_shift,
        ) = cls._STRUCT.unpack(payload)
        pixel_format = cls(
            bits_per_pixel=bits_per_pixel,
            depth=depth,
            big_endian=bool(big_endian),
            true_color=bool(true_color),
            red_max=red_max,
            green_max=green_max,
            blue_max=blue_max,
            red_shift=red_shift,
            green_shift=green_shift,
            blue_shift=blue_shift,
        )
        pixel_format._validate()
        return pixel_format

    def _validate(self) -> None:
        if self.bits_per_pixel not in {8, 16, 32}:
            raise ConnectionError("Unsupported RFB bits-per-pixel value")
        if not 0 < self.depth <= self.bits_per_pixel:
            raise ConnectionError("Invalid RFB pixel depth")
        if not self.true_color:
            raise ConnectionError("RFB color-map pixel formats are not supported")

        masks: list[int] = []
        useful_bits = 0
        for maximum, shift in (
            (self.red_max, self.red_shift),
            (self.green_max, self.green_shift),
            (self.blue_max, self.blue_shift),
        ):
            if maximum <= 0:
                raise ConnectionError("Invalid RFB color maximum")
            if maximum & (maximum + 1):
                raise ConnectionError("RFB color maximum must be one less than a power of two")
            component_bits = maximum.bit_length()
            useful_bits += component_bits
            if shift + component_bits > self.bits_per_pixel:
                raise ConnectionError("RFB color component exceeds the pixel width")
            masks.append(((1 << component_bits) - 1) << shift)
        if useful_bits > self.depth:
            raise ConnectionError("RFB color components exceed the declared depth")
        if masks[0] & masks[1] or masks[0] & masks[2] or masks[1] & masks[2]:
            raise ConnectionError("Overlapping RFB color components")

    def to_wire(self) -> bytes:
        return self._STRUCT.pack(
            self.bits_per_pixel,
            self.depth,
            int(self.big_endian),
            int(self.true_color),
            self.red_max,
            self.green_max,
            self.blue_max,
            self.red_shift,
            self.green_shift,
            self.blue_shift,
        )


_DEFAULT_RFB_PIXEL_FORMAT = _RfbPixelFormat(
    bits_per_pixel=32,
    depth=24,
    big_endian=False,
    true_color=True,
    red_max=255,
    green_max=255,
    blue_max=255,
    red_shift=16,
    green_shift=8,
    blue_shift=0,
)


class _ChromeDevTools:
    def __init__(self, websocket_url: str):
        try:
            import websocket  # type: ignore
        except ImportError as exc:  # pragma: no cover - dependency diagnostic
            raise SurfaceRuntimeError(
                "websocket-client is required for the isolated Web runtime"
            ) from exc
        self._socket = websocket.create_connection(
            websocket_url,
            timeout=8,
            origin="http://127.0.0.1",
        )
        self._lock = threading.RLock()
        self._next_id = 0

    def call(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        with self._lock:
            self._next_id += 1
            request_id = self._next_id
            self._socket.send(
                json.dumps(
                    {"id": request_id, "method": method, "params": params or {}},
                    separators=(",", ":"),
                )
            )
            while True:
                raw = self._socket.recv()
                if not isinstance(raw, str):
                    continue
                try:
                    message = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                if message.get("id") != request_id:
                    continue
                if isinstance(message.get("error"), dict):
                    detail = str(message["error"].get("message") or method)
                    raise SurfaceRuntimeError(f"Chromium DevTools failed: {detail}")
                result = message.get("result")
                return result if isinstance(result, dict) else {}

    def close(self) -> None:
        try:
            self._socket.close()
        except Exception:
            pass

    def request_browser_close(self) -> None:
        """Ask Chromium to exit without waiting on a socket it will close."""

        with self._lock:
            self._next_id += 1
            self._socket.send(
                json.dumps(
                    {"id": self._next_id, "method": "Browser.close", "params": {}},
                    separators=(",", ":"),
                )
            )


class BrowserSurfaceRuntime:
    """Headless Chromium page bridged to noVNC through loopback-only RFB."""

    def __init__(self, executable: Path, config: BrowserSurfaceConfig):
        self.executable = executable.resolve(strict=True)
        self.config = config
        self.config.runtime_dir.mkdir(parents=True, exist_ok=True)
        self._stop = threading.Event()
        self._server: socket.socket | None = None
        self._accept_thread: threading.Thread | None = None
        self._client_threads: set[threading.Thread] = set()
        self._client_sockets: set[socket.socket] = set()
        self._client_lock = threading.RLock()
        self._lifecycle_lock = threading.RLock()
        self._process: subprocess.Popen[bytes] | None = None
        self._stderr_file: BinaryIO | None = None
        self._profile_lease_file: BinaryIO | None = None
        self._pending_browser_major_upgrade = False
        self._cdp: _ChromeDevTools | None = None
        self._last_frame_at = 0.0
        self._last_page_health_at = 0.0
        self._last_profile_quota_at = 0.0
        self._interaction_until = 0.0
        self._unhealthy_error = ""
        self._frame_lock = threading.RLock()
        # A fresh generation identifies this exact isolated browser process.
        # Session bindings therefore rotate even when the OS happens to reuse
        # the same loopback RFB port after a restart or surface reconfiguration.
        self.generation = os.urandom(16).hex()
        requested_profile = self.config.profile_dir
        self._persistent_profile = requested_profile is not None
        if requested_profile is not None:
            requested = requested_profile.expanduser()
            if requested.exists() and requested.is_symlink():
                raise SurfaceRuntimeError("The durable browser profile cannot be a symlink")
            self._profile_dir = requested.resolve(strict=False)
            self._profile_root = self._profile_dir.parent
        else:
            # Standalone callers keep a short disposable root. Managed Web
            # surfaces always supply a durable per-run/surface path instead.
            self._profile_root = Path(tempfile.gettempdir()) / "AppLooper" / "surface-profiles"
            self._profile_dir = self._profile_root / self.generation
        self._browser_major = (
            self._detect_browser_major(self.executable) if self._persistent_profile else 0
        )
        self._stderr_path = self.config.runtime_dir / f"chromium-{self.generation}.stderr.log"
        self.host = "127.0.0.1"
        self.port = 0

    @staticmethod
    def _reserve_port() -> int:
        probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            probe.bind(("127.0.0.1", 0))
            return int(probe.getsockname()[1])
        finally:
            probe.close()

    def start(self) -> None:
        with self._lifecycle_lock:
            self._start_locked()

    def _start_locked(self) -> None:
        if self._server is not None:
            return
        with self._client_lock:
            live_clients = [thread for thread in self._client_threads if thread.is_alive()]
            if live_clients:
                raise SurfaceRuntimeError("The previous RFB clients are still stopping")
            self._client_threads.clear()
            self._client_sockets.clear()
        self._stop.clear()
        self._unhealthy_error = ""
        cdp_port = self._reserve_port()
        self._prepare_profile_dir()
        argv = [
            str(self.executable),
            "--headless=new",
            "--remote-debugging-address=127.0.0.1",
            f"--remote-debugging-port={cdp_port}",
            "--remote-allow-origins=http://127.0.0.1",
            f"--user-data-dir={self._profile_dir}",
            f"--window-size={self.config.width},{self.config.height}",
            "--force-device-scale-factor=1",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-default-apps",
            "--disable-extensions",
            "--disable-gpu-shader-disk-cache",
            # Keep disposable network/media caches bounded on the participant
            # state volume. Origin data such as localStorage and IndexedDB is
            # deliberately not cleared across runtime generations.
            "--disk-cache-size=33554432",
            "--media-cache-size=8388608",
            "--disable-background-networking",
            "--disable-component-update",
            "--disable-quic",
            "--disable-features=AutofillServerCommunication,PasswordManagerOnboarding,Translate,OptimizationHints",
            "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
            "--disable-save-password-bubble",
            "--disable-sync",
            "about:blank",
        ]
        if self.config.proxy_url:
            argv[1:1] = [
                f"--proxy-server={self.config.proxy_url}",
                "--proxy-bypass-list=<-loopback>",
            ]
        stderr_file = self._stderr_path.open("ab", buffering=0)
        popen_kwargs: dict[str, Any] = {
            "stdin": subprocess.DEVNULL,
            "stdout": subprocess.DEVNULL,
            "stderr": stderr_file,
            "shell": False,
            "close_fds": True,
            "cwd": str(self.executable.parent),
        }
        if os.name == "nt":
            flags = int(getattr(subprocess, "CREATE_NO_WINDOW", 0))
            if flags:
                popen_kwargs["creationflags"] = flags
        try:
            self._process = subprocess.Popen(argv, **popen_kwargs)
        except Exception:
            stderr_file.close()
            self._release_profile_lease()
            raise
        self._stderr_file = stderr_file
        try:
            websocket_url = self._wait_for_page_target(cdp_port)
            self._cdp = _ChromeDevTools(websocket_url)
            self._initialize_page()
            self._commit_profile_engine_metadata()
            server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            try:
                server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                server.bind((self.host, 0))
                server.listen(8)
                server.settimeout(0.5)
            except Exception:
                self._close_socket(server)
                raise
            self._server = server
            self.port = int(server.getsockname()[1])
            accept_thread = threading.Thread(
                target=self._accept_loop,
                name=f"surface-rfb-{self.config.surface_id}",
                daemon=True,
            )
            accept_thread.start()
            self._accept_thread = accept_thread
        except Exception:
            self.stop()
            raise

    @staticmethod
    def _bounded_profile_quota() -> int:
        default = 128 * 1024 * 1024
        raw = str(os.environ.get("WF_SURFACE_PROFILE_MAX_BYTES") or "").strip()
        try:
            value = int(raw) if raw else default
        except ValueError:
            value = default
        return max(32 * 1024 * 1024, min(4 * 1024 * 1024 * 1024, value))

    @staticmethod
    def _detect_browser_major(executable: Path) -> int:
        try:
            result = subprocess.run(
                [str(executable), "--version"],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                timeout=5,
                check=False,
                shell=False,
            )
        except (OSError, subprocess.SubprocessError):
            return 0
        text = result.stdout.decode("utf-8", errors="replace")[:512]
        match = re.search(
            r"(?:Chromium|Google Chrome|Chrome|Microsoft Edge)\s+([0-9]{1,4})(?:\.|\s|$)",
            text,
            re.IGNORECASE,
        )
        return int(match.group(1)) if match else 0

    @staticmethod
    def _fsync_directory(path: Path) -> None:
        if os.name != "posix":
            return
        descriptor: int | None = None
        try:
            descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            os.fsync(descriptor)
        except OSError:
            return
        finally:
            if descriptor is not None:
                with contextlib.suppress(OSError):
                    os.close(descriptor)

    def _write_profile_engine_metadata(self, major: int) -> None:
        path = self._profile_dir / ".applooper-browser-profile.json"
        temporary = self._profile_dir / (
            ".applooper-browser-profile." + os.urandom(8).hex() + ".tmp"
        )
        payload = {
            "schema_version": _DURABLE_PROFILE_SCHEMA_VERSION,
            "browser_engine": "chromium",
            "maximum_opened_major": int(major),
        }
        try:
            descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
                json.dump(payload, handle, sort_keys=True, separators=(",", ":"))
                handle.write("\n")
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, path)
            with contextlib.suppress(OSError):
                path.chmod(0o600)
            self._fsync_directory(self._profile_dir)
        finally:
            with contextlib.suppress(FileNotFoundError):
                temporary.unlink()

    def _prepare_profile_engine_metadata(self) -> None:
        path = self._profile_dir / ".applooper-browser-profile.json"
        if not path.exists():
            ignored = {
                ".applooper-profile.lease",
                "SingletonLock",
                "SingletonSocket",
                "SingletonCookie",
            }
            try:
                meaningful = any(child.name not in ignored for child in self._profile_dir.iterdir())
            except OSError as exc:
                raise SurfaceRuntimeError("The browser profile cannot be inspected") from exc
            if meaningful:
                raise SurfaceRuntimeError(
                    "The browser profile has data without a compatible schema marker"
                )
            self._write_profile_engine_metadata(self._browser_major)
            return
        if path.is_symlink() or not path.is_file():
            raise SurfaceRuntimeError("The browser profile schema marker is unsafe")
        try:
            raw = path.read_bytes()
            if len(raw) > 2048:
                raise ValueError("marker too large")
            metadata = json.loads(raw)
            if not isinstance(metadata, dict):
                raise ValueError("marker is not an object")
            recorded_major = int(metadata.get("maximum_opened_major"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, TypeError, ValueError) as exc:
            raise SurfaceRuntimeError("The browser profile schema marker is invalid") from exc
        if (
            metadata.get("schema_version") != _DURABLE_PROFILE_SCHEMA_VERSION
            or metadata.get("browser_engine") != "chromium"
            or recorded_major < 0
        ):
            raise SurfaceRuntimeError("The browser profile schema is incompatible")
        if recorded_major and not self._browser_major:
            raise SurfaceRuntimeError("The Chromium profile version cannot be verified")
        if self._browser_major and recorded_major > self._browser_major:
            raise SurfaceRuntimeError(
                "The Chromium profile was opened by a newer incompatible browser major"
            )
        self._pending_browser_major_upgrade = self._browser_major > recorded_major

    def _commit_profile_engine_metadata(self) -> None:
        if self._persistent_profile and self._pending_browser_major_upgrade:
            self._write_profile_engine_metadata(self._browser_major)
            self._pending_browser_major_upgrade = False

    @staticmethod
    def _bounded_profile_pool_quota() -> int:
        default = 512 * 1024 * 1024
        raw = str(os.environ.get("WF_SURFACE_PROFILE_POOL_MAX_BYTES") or "").strip()
        try:
            value = int(raw) if raw else default
        except ValueError:
            value = default
        return max(128 * 1024 * 1024, min(16 * 1024 * 1024 * 1024, value))

    @staticmethod
    def _tree_size_without_links(root: Path, *, stop_after: int) -> int:
        total = 0
        pending = [root]
        while pending:
            directory = pending.pop()
            try:
                entries = tuple(os.scandir(directory))
            except (FileNotFoundError, NotADirectoryError):
                continue
            except OSError as exc:
                raise SurfaceRuntimeError("The durable browser profile cannot be inspected") from exc
            for entry in entries:
                try:
                    if entry.is_symlink():
                        continue
                    if entry.is_dir(follow_symlinks=False):
                        pending.append(Path(entry.path))
                    elif entry.is_file(follow_symlinks=False):
                        total += int(entry.stat(follow_symlinks=False).st_size)
                except FileNotFoundError:
                    continue
                except OSError as exc:
                    raise SurfaceRuntimeError(
                        "The durable browser profile cannot be inspected"
                    ) from exc
                if total > stop_after:
                    return total
        return total

    def _profile_used_by_live_process(self) -> bool:
        """Discover a live Chromium owner without trusting SingletonLock PIDs."""

        if os.name != "posix" or not Path("/proc").is_dir():
            # On Windows an active Chromium holds these files open, so the
            # conservative unlink below fails rather than forcing a second
            # browser onto the profile. Other platforms receive the same
            # fail-closed behavior when a singleton artifact cannot be removed.
            return False
        expected = f"--user-data-dir={self._profile_dir}".encode()
        try:
            processes = tuple(Path("/proc").iterdir())
        except OSError:
            return True
        for process_dir in processes:
            if not process_dir.name.isdecimal():
                continue
            try:
                argv = (process_dir / "cmdline").read_bytes().split(b"\0")
            except (FileNotFoundError, PermissionError, ProcessLookupError):
                continue
            except OSError:
                # An unreadable process cannot safely be assumed unrelated.
                return True
            if expected in argv:
                return True
        return False

    def _acquire_profile_lease(self) -> None:
        if not self._persistent_profile or self._profile_lease_file is not None:
            return
        lease_path = self._profile_dir / ".applooper-profile.lease"
        try:
            handle = lease_path.open("a+b", buffering=0)
            with contextlib.suppress(OSError):
                lease_path.chmod(0o600)
            if os.name == "nt":
                import msvcrt

                handle.seek(0, os.SEEK_END)
                if handle.tell() == 0:
                    handle.write(b"\0")
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            elif os.name == "posix":
                import fcntl

                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            else:  # pragma: no cover - supported deployment targets are NT/POSIX.
                handle.close()
                raise SurfaceRuntimeError(
                    "Durable browser profiles require a supported file-lock platform"
                )
        except (OSError, BlockingIOError) as exc:
            with contextlib.suppress(Exception):
                handle.close()  # type: ignore[possibly-undefined]
            raise SurfaceRuntimeError(
                "The durable browser profile is leased by another runtime"
            ) from exc
        self._profile_lease_file = handle

    def _release_profile_lease(self) -> None:
        handle, self._profile_lease_file = self._profile_lease_file, None
        if handle is None:
            return
        with contextlib.suppress(Exception):
            if os.name == "nt":
                import msvcrt

                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            elif os.name == "posix":
                import fcntl

                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        with contextlib.suppress(Exception):
            handle.close()

    def _remove_singleton_artifacts(self) -> None:
        if self._profile_used_by_live_process():
            raise SurfaceRuntimeError("The durable browser profile is already in use")
        for name in ("SingletonLock", "SingletonSocket", "SingletonCookie"):
            artifact = self._profile_dir / name
            try:
                if artifact.is_dir() and not artifact.is_symlink():
                    raise SurfaceRuntimeError(
                        f"The durable browser profile has an invalid {name} artifact"
                    )
                artifact.unlink(missing_ok=True)
            except SurfaceRuntimeError:
                raise
            except OSError as exc:
                raise SurfaceRuntimeError(
                    "The durable browser profile is still locked by another process"
                ) from exc

    def _prune_disposable_profile_caches(self) -> None:
        # These are Chromium's reproducible network/code/GPU caches. Service
        # worker Cache Storage, cookies, Local Storage and IndexedDB are not on
        # this list and therefore survive a rollout.
        relative_paths = (
            Path("Default") / "Cache",
            Path("Default") / "Code Cache",
            Path("Default") / "GPUCache",
            Path("Default") / "DawnCache",
            Path("ShaderCache"),
            Path("GrShaderCache"),
            Path("GraphiteDawnCache"),
            Path("component_crx_cache"),
            Path("extensions_crx_cache"),
        )
        profile = self._profile_dir.resolve(strict=False)
        for relative in relative_paths:
            candidate = profile / relative
            try:
                if candidate.is_symlink() or candidate.is_file():
                    candidate.unlink(missing_ok=True)
                elif candidate.is_dir():
                    resolved = candidate.resolve(strict=False)
                    if resolved == profile or profile not in resolved.parents:
                        raise SurfaceRuntimeError("Browser cache path escaped the profile")
                    shutil.rmtree(resolved)
            except FileNotFoundError:
                continue
            except SurfaceRuntimeError:
                raise
            except OSError as exc:
                raise SurfaceRuntimeError("A disposable browser cache could not be pruned") from exc

    def _assert_profile_storage_quota(self, *, force: bool = False) -> None:
        if not self._persistent_profile:
            return
        now = time.monotonic()
        if not force and now - self._last_profile_quota_at < 5.0:
            return
        self._last_profile_quota_at = now
        quota = self._bounded_profile_quota()
        exceeded = self._tree_size_without_links(
            self._profile_dir,
            stop_after=quota,
        ) > quota
        pool = self.config.profile_pool_dir
        if not exceeded and pool is not None:
            pool_path = pool.expanduser().resolve(strict=False)
            profile = self._profile_dir.resolve(strict=False)
            if pool_path == profile or pool_path not in profile.parents:
                raise SurfaceRuntimeError("The browser profile is outside its tenant pool")
            pool_quota = self._bounded_profile_pool_quota()
            exceeded = self._tree_size_without_links(
                pool_path,
                stop_after=pool_quota,
            ) > pool_quota
        if exceeded:
            process = self._process
            if process is not None:
                # Stop further background IndexedDB/CacheStorage writes as soon
                # as the periodic frame health check observes an overage.
                self._terminate_process_tree(process)
            raise SurfaceRuntimeError(
                "The durable browser storage exceeds its configured tenant quota"
            )

    def _prepare_profile_dir(self) -> None:
        self._profile_root.mkdir(parents=True, exist_ok=True)
        if self._profile_root.is_symlink():
            raise SurfaceRuntimeError("The browser profile root cannot be a symlink")
        self._profile_dir.mkdir(parents=True, exist_ok=True)
        if self._profile_dir.is_symlink() or not self._profile_dir.is_dir():
            raise SurfaceRuntimeError("The browser profile path is not a private directory")
        with contextlib.suppress(OSError):
            self._profile_root.chmod(0o700)
            self._profile_dir.chmod(0o700)
        if not self._persistent_profile:
            return
        self._acquire_profile_lease()
        try:
            self._prepare_profile_engine_metadata()
            self._remove_singleton_artifacts()
            self._prune_disposable_profile_caches()
            self._assert_profile_storage_quota(force=True)
        except Exception:
            self._release_profile_lease()
            raise

    def _wait_for_page_target(self, cdp_port: int) -> str:
        deadline = time.monotonic() + 15.0
        endpoint = f"http://127.0.0.1:{cdp_port}/json/list"
        last_error: Exception | None = None
        while time.monotonic() < deadline:
            if self._process is not None and self._process.poll() is not None:
                raise SurfaceRuntimeError(
                    self._chromium_startup_error(
                        "Chromium exited before the surface was ready",
                        self._process.returncode,
                    )
                )
            try:
                with urllib.request.urlopen(endpoint, timeout=1.0) as response:
                    targets = json.loads(response.read(2_000_000).decode("utf-8"))
                for target in targets if isinstance(targets, list) else []:
                    if target.get("type") == "page" and target.get("webSocketDebuggerUrl"):
                        return str(target["webSocketDebuggerUrl"])
            except Exception as exc:  # Chromium may still be starting.
                last_error = exc
            time.sleep(0.1)
        summary = "Chromium DevTools did not become ready within 15 seconds"
        if last_error is not None:
            summary += f"; last DevTools error: {last_error}"
        returncode = self._process.poll() if self._process is not None else None
        raise SurfaceRuntimeError(self._chromium_startup_error(summary, returncode))

    def _chromium_stderr_tail(self, limit: int = 4096) -> str:
        stderr_file = self._stderr_file
        if stderr_file is not None:
            try:
                stderr_file.flush()
            except Exception:
                pass
        try:
            size = self._stderr_path.stat().st_size
            with self._stderr_path.open("rb") as source:
                source.seek(max(0, size - limit))
                payload = source.read(limit)
        except OSError:
            return ""
        lines = [
            line.strip()
            for line in payload.decode("utf-8", errors="replace").splitlines()
            if line.strip()
        ]
        return " | ".join(lines[-4:])

    def _chromium_startup_error(self, summary: str, returncode: int | None) -> str:
        details = [summary]
        if returncode is not None:
            details.append(f"exit code {returncode}")
        # Keep the diagnostic useful without leaking a user's absolute home or
        # workspace path to the remote PWA.  The log itself remains local.
        details.append(f"stderr log: {self._stderr_path.name}")
        stderr_tail = self._chromium_stderr_tail()
        if stderr_tail:
            details.append(f"stderr: {stderr_tail}")
        return "; ".join(details)

    def _initialize_page(self) -> None:
        assert self._cdp is not None
        cdp = self._cdp
        cdp.call("Page.enable")
        cdp.call("Runtime.enable")
        cdp.call("Network.enable")
        cdp.call(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": self.config.width,
                "height": self.config.height,
                "deviceScaleFactor": 1,
                "mobile": self.config.mobile,
                "screenWidth": self.config.width,
                "screenHeight": self.config.height,
            },
        )
        cdp.call(
            "Emulation.setTouchEmulationEnabled",
            {"enabled": self.config.mobile, "maxTouchPoints": 5},
        )
        if self.config.mobile:
            cdp.call(
                "Network.setUserAgentOverride",
                {
                    "userAgent": (
                        "Mozilla/5.0 (Linux; Android 15; Pixel 8) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/136.0 Mobile Safari/537.36"
                    ),
                    "platform": "Android",
                },
            )
        navigation = cdp.call("Page.navigate", {"url": self.config.url})
        navigation_error = str(navigation.get("errorText") or "").strip()
        if navigation_error:
            raise SurfaceRuntimeError(
                "目标应用无法连接：" + navigation_error[:240]
            )
        deadline = time.monotonic() + 20.0
        while time.monotonic() < deadline:
            ready = cdp.call(
                "Runtime.evaluate",
                {"expression": "document.readyState", "returnByValue": True},
            )
            value = ((ready.get("result") or {}).get("value"))
            if value in {"interactive", "complete"}:
                self._assert_page_healthy(force=True)
                return
            time.sleep(0.1)
        raise SurfaceRuntimeError("The Web surface did not finish its initial navigation")

    def navigate_trial(self, url: str, seed: dict[str, Any] | None = None) -> None:
        """Jump the live trial page and optionally seed temporary local data."""

        target = str(url or "").strip()
        if not target:
            raise SurfaceRuntimeError("trial jump url is empty")
        cdp = self._cdp
        if cdp is None:
            raise SurfaceRuntimeError("The isolated browser is not connected")
        navigation = cdp.call("Page.navigate", {"url": target})
        navigation_error = str(navigation.get("errorText") or "").strip()
        if navigation_error:
            raise SurfaceRuntimeError("目标应用无法跳转：" + navigation_error[:240])
        deadline = time.monotonic() + 12.0
        while time.monotonic() < deadline:
            ready = cdp.call(
                "Runtime.evaluate",
                {"expression": "document.readyState", "returnByValue": True},
            )
            value = ((ready.get("result") or {}).get("value"))
            if value in {"interactive", "complete"}:
                break
            time.sleep(0.1)
        payload = seed if isinstance(seed, dict) else {}
        expression = trial_seed_apply_expression(payload)
        cdp.call("Runtime.evaluate", {"expression": expression, "returnByValue": True})
        records = payload.get("records") if isinstance(payload.get("records"), list) else []
        need = 0
        with contextlib.suppress(TypeError, ValueError):
            need = max(0, int(payload.get("ensure_count") or payload.get("ensure_logs") or 0))
        if records or need > 0:
            cdp.call("Page.reload", {"ignoreCache": False})
            deadline = time.monotonic() + 12.0
            while time.monotonic() < deadline:
                ready = cdp.call(
                    "Runtime.evaluate",
                    {"expression": "document.readyState", "returnByValue": True},
                )
                value = ((ready.get("result") or {}).get("value"))
                if value in {"interactive", "complete"}:
                    break
                time.sleep(0.1)

    def _page_health_snapshot(self) -> dict[str, Any]:
        """Return public page health without exposing page content or secrets."""

        cdp = self._cdp
        if cdp is None:
            raise SurfaceRuntimeError("The isolated browser is not connected")
        result = cdp.call(
            "Runtime.evaluate",
            {
                "expression": """
                    (() => {
                      const errorNode = document.querySelector('#main-frame-error, .interstitial-wrapper');
                      const codeNode = document.querySelector('.error-code');
                      const nav = performance.getEntriesByType('navigation')[0];
                      return {
                        chromeError: location.protocol === 'chrome-error:' || Boolean(errorNode),
                        errorCode: codeNode ? String(codeNode.textContent || '').trim() : '',
                        responseStatus: nav && Number.isFinite(nav.responseStatus) ? nav.responseStatus : 0
                      };
                    })()
                """,
                "returnByValue": True,
            },
        )
        value = ((result.get("result") or {}).get("value"))
        return value if isinstance(value, dict) else {}

    def _assert_page_healthy(self, *, force: bool = False) -> None:
        """Reject Chromium network error pages instead of streaming them as success."""

        now = time.monotonic()
        self._assert_profile_storage_quota(force=force)
        if not force and now - self._last_page_health_at < 1.0:
            return
        self._last_page_health_at = now
        snapshot = self._page_health_snapshot()
        status = int(snapshot.get("responseStatus") or 0)
        code = str(snapshot.get("errorCode") or "").strip().upper()
        chrome_error = bool(snapshot.get("chromeError"))
        if status >= 400 or chrome_error:
            if not code and status:
                code = f"HTTP {status}"
            if code.startswith("HTTP ERROR "):
                code = "HTTP " + code.removeprefix("HTTP ERROR ")
            detail = code if code else "浏览器网络错误"
            raise SurfaceRuntimeError(
                f"目标应用返回 {detail}；请检查该应用的本地服务和必要后端依赖"
            )

    def ready(self) -> bool:
        return bool(
            self._server is not None
            and self.port
            and not self._stop.is_set()
            and self._process is not None
            and self._process.poll() is None
            and self._cdp is not None
            and not self._unhealthy_error
        )

    def probe_frame(self) -> None:
        """Require one real page-scoped frame before publishing the runtime."""

        if not self.ready():
            raise SurfaceRuntimeError("The Web surface is not ready")
        self._capture_jpeg()

    def _mark_unhealthy(self, error: BaseException) -> None:
        if not self._stop.is_set() and not self._unhealthy_error:
            self._unhealthy_error = str(error) or error.__class__.__name__

    def _accept_loop(self) -> None:
        server = self._server
        if server is None:
            return
        while not self._stop.is_set():
            try:
                client, _address = server.accept()
            except socket.timeout:
                continue
            except OSError:
                break
            client.settimeout(30.0)
            thread = threading.Thread(
                target=self._serve_client,
                args=(client,),
                name=f"surface-rfb-client-{self.config.surface_id}",
                daemon=True,
            )
            close_client = False
            with self._client_lock:
                if self._stop.is_set():
                    close_client = True
                else:
                    self._client_sockets.add(client)
                    self._client_threads.add(thread)
                    try:
                        thread.start()
                    except RuntimeError:
                        self._client_sockets.discard(client)
                        self._client_threads.discard(thread)
                        close_client = True
            if close_client:
                self._close_socket(client)

    @staticmethod
    def _recv_exact(connection: socket.socket, length: int) -> bytes:
        result = bytearray()
        while len(result) < length:
            chunk = connection.recv(length - len(result))
            if not chunk:
                raise ConnectionError("RFB client closed the connection")
            result.extend(chunk)
        return bytes(result)

    @staticmethod
    def _close_socket(connection: socket.socket) -> None:
        try:
            connection.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass
        try:
            connection.close()
        except OSError:
            pass

    @staticmethod
    def _encode_bgrx(frame: bytes, pixel_format: _RfbPixelFormat) -> bytes:
        if len(frame) % 4:
            raise SurfaceRuntimeError("Chromium returned a malformed BGRX frame")
        if pixel_format == _DEFAULT_RFB_PIXEL_FORMAT:
            return frame

        pixel_count = len(frame) // 4
        bytes_per_pixel = pixel_format.bits_per_pixel // 8
        output = bytearray(pixel_count * bytes_per_pixel)

        # The common 32-bit formats can be encoded with C-level slice copies.
        # This covers noVNC's negotiated formats without a Python loop.
        maxima = (
            pixel_format.red_max,
            pixel_format.green_max,
            pixel_format.blue_max,
        )
        shifts = (
            pixel_format.red_shift,
            pixel_format.green_shift,
            pixel_format.blue_shift,
        )
        if maxima == (255, 255, 255) and all(shift % 8 == 0 for shift in shifts):
            for source_byte, shift in zip((2, 1, 0), shifts):
                destination_byte = shift // 8
                if pixel_format.big_endian:
                    destination_byte = bytes_per_pixel - 1 - destination_byte
                output[destination_byte::bytes_per_pixel] = frame[source_byte::4]
            return bytes(output)

        red_scale = tuple(
            (value * pixel_format.red_max + 127) // 255 for value in range(256)
        )
        green_scale = tuple(
            (value * pixel_format.green_max + 127) // 255 for value in range(256)
        )
        blue_scale = tuple(
            (value * pixel_format.blue_max + 127) // 255 for value in range(256)
        )
        byte_order = "big" if pixel_format.big_endian else "little"
        destination = 0
        for source in range(0, len(frame), 4):
            value = (
                (red_scale[frame[source + 2]] << pixel_format.red_shift)
                | (green_scale[frame[source + 1]] << pixel_format.green_shift)
                | (blue_scale[frame[source]] << pixel_format.blue_shift)
            )
            output[destination : destination + bytes_per_pixel] = value.to_bytes(
                bytes_per_pixel, byte_order
            )
            destination += bytes_per_pixel
        return bytes(output)

    def _serve_client(self, connection: socket.socket) -> None:
        try:
            connection.sendall(b"RFB 003.008\n")
            version = self._recv_exact(connection, 12)
            if version != b"RFB 003.008\n":
                raise ConnectionError("Only RFB 3.8 clients are supported")
            connection.sendall(b"\x01\x01")  # one security type: None
            if self._recv_exact(connection, 1) != b"\x01":
                raise ConnectionError("RFB client rejected the local security mode")
            connection.sendall(struct.pack(">I", 0))
            self._recv_exact(connection, 1)  # shared flag
            name = f"AppLooper isolated {self.config.surface_id}".encode("utf-8")
            pixel_format = _DEFAULT_RFB_PIXEL_FORMAT
            connection.sendall(
                struct.pack(">HH", self.config.width, self.config.height)
                + pixel_format.to_wire()
                + struct.pack(">I", len(name))
                + name
            )
            connection.settimeout(None)
            button_mask = 0
            accepted_encodings: set[int] = set()
            last_jpeg_frame: bytes | None = None
            while not self._stop.is_set():
                message_type = self._recv_exact(connection, 1)[0]
                if message_type == 0:  # SetPixelFormat
                    payload = self._recv_exact(connection, 19)
                    pixel_format = _RfbPixelFormat.from_wire(payload[3:])
                elif message_type == 2:  # SetEncodings
                    header = self._recv_exact(connection, 3)
                    count = struct.unpack(">H", header[1:3])[0]
                    encoded = self._recv_exact(connection, count * 4)
                    accepted_encodings = (
                        set(struct.unpack(f">{count}i", encoded)) if count else set()
                    )
                elif message_type == 3:  # FramebufferUpdateRequest
                    request = self._recv_exact(connection, 9)
                    incremental = bool(request[0])
                    # noVNC advertises the standard JPEG rectangle encoding
                    # (21).  A 1440x900 raw rectangle is over 5 MB, which can
                    # leave mobile Safari showing a black canvas while each
                    # frame crosses the public WebSocket.  Chromium can supply
                    # the same page-scoped frame as JPEG directly, normally in
                    # tens of kilobytes, without ever capturing the desktop.
                    if 21 in accepted_encodings:
                        try:
                            jpeg_frame = self._capture_jpeg()
                        except Exception as exc:
                            self._mark_unhealthy(exc)
                            raise
                        if incremental and jpeg_frame == last_jpeg_frame:
                            connection.sendall(b"\x00\x00\x00\x00")
                            continue
                        connection.sendall(
                            b"\x00\x00\x00\x01"
                            + struct.pack(
                                ">HHHHi",
                                0,
                                0,
                                self.config.width,
                                self.config.height,
                                21,
                            )
                            + jpeg_frame
                        )
                        last_jpeg_frame = jpeg_frame
                    else:
                        try:
                            raw_frame = self._capture_bgrx()
                        except Exception as exc:
                            self._mark_unhealthy(exc)
                            raise
                        expected_size = self.config.width * self.config.height * 4
                        if len(raw_frame) != expected_size:
                            raise SurfaceRuntimeError(
                                "Chromium returned an incomplete BGRX frame"
                            )
                        frame = self._encode_bgrx(raw_frame, pixel_format)
                        connection.sendall(
                            b"\x00\x00\x00\x01"
                            + struct.pack(
                                ">HHHHi",
                                0,
                                0,
                                self.config.width,
                                self.config.height,
                                0,
                            )
                            + frame
                        )
                elif message_type == 4:  # KeyEvent
                    payload = self._recv_exact(connection, 7)
                    self._dispatch_key(bool(payload[0]), struct.unpack(">I", payload[3:7])[0])
                elif message_type == 5:  # PointerEvent
                    payload = self._recv_exact(connection, 5)
                    new_mask = payload[0]
                    x, y = struct.unpack(">HH", payload[1:5])
                    self._dispatch_pointer(button_mask, new_mask, x, y)
                    button_mask = new_mask
                elif message_type == 6:  # ClientCutText
                    payload = self._recv_exact(connection, 7)
                    length = struct.unpack(">I", payload[3:7])[0]
                    if length > 1_000_000:
                        raise ConnectionError("RFB clipboard payload is too large")
                    self._recv_exact(connection, length)
                elif message_type == 150:  # EnableContinuousUpdates
                    self._recv_exact(connection, 9)
                elif message_type == 248:  # ClientFence
                    payload = self._recv_exact(connection, 8)
                    length = payload[7]
                    self._recv_exact(connection, length)
                else:
                    raise ConnectionError(f"Unsupported RFB client message: {message_type}")
        except (ConnectionError, OSError):
            pass
        except SurfaceRuntimeError as exc:
            # A Chromium-generated network error page is a runtime failure,
            # not a valid frame.  Keep the reason so the service can replace
            # this generation instead of advertising it as connected.
            self._mark_unhealthy(exc)
        except Exception as exc:
            # A dead renderer/CDP socket can leave the Chromium root process
            # alive.  Mark the runtime unusable so the service replaces this
            # generation on the next session poll instead of reconnecting a
            # phone to the same permanently black surface.
            self._mark_unhealthy(exc)
        finally:
            self._close_socket(connection)
            current = threading.current_thread()
            with self._client_lock:
                self._client_sockets.discard(connection)
                self._client_threads.discard(current)

    def _capture_bgrx(self) -> bytes:
        try:
            from PIL import Image
        except ImportError as exc:  # pragma: no cover - dependency diagnostic
            raise SurfaceRuntimeError("Pillow is required for Web surface frames") from exc
        with self._frame_lock:
            cdp = self._cdp
            if self._stop.is_set() or cdp is None:
                raise SurfaceRuntimeError("The Web surface is stopping")
            self._assert_page_healthy()
            delay = 0.12 - (time.monotonic() - self._last_frame_at)
            if delay > 0:
                time.sleep(delay)
            result = cdp.call(
                "Page.captureScreenshot",
                {"format": "png", "fromSurface": True, "captureBeyondViewport": False},
            )
            encoded = str(result.get("data") or "")
            if not encoded:
                raise SurfaceRuntimeError("Chromium returned an empty surface frame")
            image = Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGB")
            if image.size != (self.config.width, self.config.height):
                image = image.resize((self.config.width, self.config.height))
            self._last_frame_at = time.monotonic()
            return image.tobytes("raw", "BGRX")

    def _capture_jpeg(self) -> bytes:
        """Capture a bandwidth-bounded page frame for noVNC.

        Idle surfaces are intentionally sampled at a modest rate.  After a
        key, click, touch or wheel input, the runtime temporarily enters a
        faster burst so interaction still feels responsive.  The lock also
        caps the aggregate capture rate when the same surface is open on more
        than one phone or browser tab.
        """

        try:
            from PIL import Image
        except ImportError as exc:  # pragma: no cover - dependency diagnostic
            raise SurfaceRuntimeError("Pillow is required for Web surface frames") from exc

        with self._frame_lock:
            cdp = self._cdp
            if self._stop.is_set() or cdp is None:
                raise SurfaceRuntimeError("The Web surface is stopping")
            self._assert_page_healthy()
            now = time.monotonic()
            # Static pages do not need multi-frame-per-second screenshots.
            # A lower idle cadence keeps Chromium, Pillow and mobile Safari's
            # canvas work bounded, while real touch/key input still enables a
            # short 10 FPS burst through _mark_interaction().
            interval = 0.10 if now < self._interaction_until else 0.90
            delay = interval - (now - self._last_frame_at)
            if delay > 0:
                time.sleep(delay)
            result = cdp.call(
                "Page.captureScreenshot",
                {
                    "format": "jpeg",
                    "quality": 58,
                    "fromSurface": True,
                    "captureBeyondViewport": False,
                },
            )
            encoded = str(result.get("data") or "")
            if not encoded:
                raise SurfaceRuntimeError("Chromium returned an empty surface frame")
            frame = base64.b64decode(encoded)
            if not (frame.startswith(b"\xff\xd8") and frame.endswith(b"\xff\xd9")):
                raise SurfaceRuntimeError("Chromium returned a malformed JPEG frame")
            image = Image.open(io.BytesIO(frame))
            image.load()
            if image.size != (self.config.width, self.config.height):
                image = image.convert("RGB").resize((self.config.width, self.config.height))
                output = io.BytesIO()
                image.save(output, format="JPEG", quality=58, optimize=True)
                frame = output.getvalue()
            self._last_frame_at = time.monotonic()
            return frame

    def _mark_interaction(self) -> None:
        self._interaction_until = max(self._interaction_until, time.monotonic() + 2.0)

    def _dispatch_pointer(self, old_mask: int, new_mask: int, x: int, y: int) -> None:
        cdp = self._cdp
        if self._stop.is_set() or cdp is None:
            raise SurfaceRuntimeError("The Web surface is stopping")
        self._mark_interaction()
        x = max(0, min(self.config.width - 1, int(x)))
        y = max(0, min(self.config.height - 1, int(y)))
        if new_mask & 8:
            cdp.call(
                "Input.dispatchMouseEvent",
                {"type": "mouseWheel", "x": x, "y": y, "deltaX": 0, "deltaY": -120},
            )
        if new_mask & 16:
            cdp.call(
                "Input.dispatchMouseEvent",
                {"type": "mouseWheel", "x": x, "y": y, "deltaX": 0, "deltaY": 120},
            )
        buttons = ((1, "left"), (2, "middle"), (4, "right"))
        for bit, name in buttons:
            if bool(old_mask & bit) == bool(new_mask & bit):
                continue
            cdp.call(
                "Input.dispatchMouseEvent",
                {
                    "type": "mousePressed" if new_mask & bit else "mouseReleased",
                    "x": x,
                    "y": y,
                    "button": name,
                    "buttons": new_mask & 7,
                    "clickCount": 1,
                },
            )
        cdp.call(
            "Input.dispatchMouseEvent",
            {"type": "mouseMoved", "x": x, "y": y, "button": "none", "buttons": new_mask & 7},
        )

    @staticmethod
    def _keysym_character(keysym: int) -> str:
        if 0x01000000 <= keysym <= 0x0110FFFF:
            codepoint = keysym & 0x00FFFFFF
        elif 0x20 <= keysym <= 0xFF:
            codepoint = keysym
        else:
            return ""
        if codepoint > 0x10FFFF or 0xD800 <= codepoint <= 0xDFFF:
            return ""
        return chr(codepoint)

    @staticmethod
    def _keysym_name(keysym: int) -> tuple[str, str, int]:
        special = {
            0xFF08: ("Backspace", "Backspace", 8),
            0xFF09: ("Tab", "Tab", 9),
            0xFF0D: ("Enter", "Enter", 13),
            0xFF1B: ("Escape", "Escape", 27),
            0xFFFF: ("Delete", "Delete", 46),
            0xFF50: ("Home", "Home", 36),
            0xFF51: ("ArrowLeft", "ArrowLeft", 37),
            0xFF52: ("ArrowUp", "ArrowUp", 38),
            0xFF53: ("ArrowRight", "ArrowRight", 39),
            0xFF54: ("ArrowDown", "ArrowDown", 40),
            0xFF55: ("PageUp", "PageUp", 33),
            0xFF56: ("PageDown", "PageDown", 34),
            0xFF57: ("End", "End", 35),
        }
        if keysym in special:
            return special[keysym]
        char = BrowserSurfaceRuntime._keysym_character(keysym)
        if char:
            upper = char.upper()
            virtual_key = ord(upper) if len(upper) == 1 and ord(upper) <= 0x7F else 0
            return char, char, virtual_key
        return "Unidentified", "", 0

    def _dispatch_key(self, down: bool, keysym: int) -> None:
        cdp = self._cdp
        if self._stop.is_set() or cdp is None:
            raise SurfaceRuntimeError("The Web surface is stopping")
        self._mark_interaction()
        key, text, virtual_key = self._keysym_name(keysym)
        params: dict[str, Any] = {
            "type": "keyDown" if down else "keyUp",
            "key": key,
            "windowsVirtualKeyCode": virtual_key,
            "nativeVirtualKeyCode": virtual_key,
        }
        if down and text and len(text) == 1:
            params["text"] = text
            params["unmodifiedText"] = text
        cdp.call("Input.dispatchKeyEvent", params)

    @staticmethod
    def _join_threads(threads: tuple[threading.Thread, ...], timeout: float) -> None:
        deadline = time.monotonic() + timeout
        current = threading.current_thread()
        for thread in threads:
            if thread is current or thread.ident is None:
                continue
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            try:
                thread.join(timeout=remaining)
            except RuntimeError:
                # A Thread.start() failure can leave an unstarted object behind.
                continue

    @staticmethod
    def _terminate_process_tree(process: subprocess.Popen[bytes]) -> None:
        try:
            process_running = process.poll() is None
        except Exception:
            process_running = True
        if not process_running:
            return

        if os.name == "nt":
            # Chromium owns renderer, GPU and utility child processes.  Killing
            # only the browser PID leaves those children alive on Windows, and
            # they can retain the profile lock after the Web service restarts.
            # taskkill is scoped to the exact PID that this runtime spawned.
            system_root = Path(os.environ.get("SystemRoot", r"C:\Windows"))
            taskkill = system_root / "System32" / "taskkill.exe"
            command = [
                str(taskkill if taskkill.exists() else "taskkill.exe"),
                "/PID",
                str(process.pid),
                "/T",
                "/F",
            ]
            flags = int(getattr(subprocess, "CREATE_NO_WINDOW", 0))
            try:
                subprocess.run(
                    command,
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=10,
                    check=False,
                    creationflags=flags,
                )
            except Exception:
                try:
                    process.terminate()
                except Exception:
                    pass
        else:
            try:
                process.terminate()
            except Exception:
                pass

        try:
            process.wait(timeout=5)
        except Exception:
            try:
                process.kill()
            except Exception:
                pass
            try:
                process.wait(timeout=5)
            except Exception:
                pass

    def stop(self) -> None:
        with self._lifecycle_lock:
            self._stop_locked()

    def _stop_locked(self) -> None:
        self._stop.set()
        server, self._server = self._server, None
        if server is not None:
            self._close_socket(server)
        accept_thread, self._accept_thread = self._accept_thread, None
        with self._client_lock:
            client_sockets = tuple(self._client_sockets)
            client_threads = tuple(self._client_threads)
        for connection in client_sockets:
            self._close_socket(connection)

        if accept_thread is not None:
            self._join_threads((accept_thread,), 2.0)
        # Idle workers leave as soon as their sockets are shut down. Give them
        # that chance before closing DevTools out from under an active capture.
        self._join_threads(client_threads, 2.0)

        cdp, self._cdp = self._cdp, None
        process, self._process = self._process, None
        if cdp is not None:
            # Browser.close performs Chromium's own profile shutdown sequence,
            # which is the strongest available guarantee that Local Storage,
            # IndexedDB and service-worker metadata reach the durable volume.
            # A wedged browser still falls back to the scoped TERM/KILL path.
            try:
                cdp.request_browser_close()
            except Exception:
                pass
        if process is not None:
            with contextlib.suppress(Exception):
                process.wait(timeout=3)
        if cdp is not None:
            with contextlib.suppress(Exception):
                cdp.close()
        # Closing DevTools interrupts a capture that was already in flight.
        self._join_threads(client_threads, 2.0)
        if process is not None:
            self._terminate_process_tree(process)
        stderr_file, self._stderr_file = self._stderr_file, None
        if stderr_file is not None:
            try:
                stderr_file.close()
            except Exception:
                pass
        if self._persistent_profile:
            # Chromium normally removes these itself. A hard container stop
            # cannot, so make a best-effort exact cleanup only after the
            # process tree is gone. Persistent origin data is never deleted.
            with contextlib.suppress(SurfaceRuntimeError, OSError):
                self._remove_singleton_artifacts()
            self._release_profile_lease()
        else:
            # A standalone disposable directory is generated under our own
            # short temp root. Remove only that exact generation.
            try:
                profile = self._profile_dir.resolve(strict=False)
                root = self._profile_root.resolve(strict=False)
                if profile.parent == root and profile.name == self.generation:
                    shutil.rmtree(profile, ignore_errors=True)
            except OSError:
                pass
        # A wedged DevTools call may only unblock once Chromium has exited.
        self._join_threads(client_threads, 2.0)

        with self._client_lock:
            remaining_sockets = tuple(self._client_sockets)
            self._client_sockets.clear()
            self._client_threads = {
                client_thread
                for client_thread in self._client_threads
                if client_thread.is_alive()
            }
        for connection in remaining_sockets:
            self._close_socket(connection)


@dataclass(frozen=True)
class AndroidAdbSurfaceConfig:
    run_id: str
    surface_id: str
    adb_path: Path
    device_serial: str
    width: int
    height: int
    runtime_dir: Path


class AndroidAdbSurfaceRuntime:
    """Android emulator frame/input bridged to noVNC through loopback-only RFB."""

    _ADB_KEYCODES = {
        0xFF08: 67,  # Backspace
        0xFF09: 61,  # Tab
        0xFF0D: 66,  # Enter
        0xFF1B: 111,  # Escape
        0xFFFF: 112,  # Delete
        0xFF50: 122,  # Home
        0xFF51: 21,  # ArrowLeft
        0xFF52: 19,  # ArrowUp
        0xFF53: 22,  # ArrowRight
        0xFF54: 20,  # ArrowDown
        0xFF55: 92,  # PageUp
        0xFF56: 93,  # PageDown
        0xFF57: 123,  # End
    }

    def __init__(self, config: AndroidAdbSurfaceConfig):
        self.config = config
        self.config.runtime_dir.mkdir(parents=True, exist_ok=True)
        self._stop = threading.Event()
        self._server: socket.socket | None = None
        self._accept_thread: threading.Thread | None = None
        self._client_threads: set[threading.Thread] = set()
        self._client_sockets: set[socket.socket] = set()
        self._client_lock = threading.RLock()
        self._lifecycle_lock = threading.RLock()
        self._last_frame_at = 0.0
        self._interaction_until = 0.0
        self._unhealthy_error = ""
        self._frame_lock = threading.RLock()
        self._device_width = 0
        self._device_height = 0
        self._frame_width = max(1, int(config.width))
        self._frame_height = max(1, int(config.height))
        self._input_queue: queue.SimpleQueue[tuple[str, ...]] = queue.SimpleQueue()
        self._input_thread: threading.Thread | None = None
        self.generation = os.urandom(16).hex()
        self.host = "127.0.0.1"
        self.port = 0

    def start(self) -> None:
        with self._lifecycle_lock:
            if self._server is not None:
                return
            self._stop.clear()
            self._unhealthy_error = ""
            self._sync_frame_geometry()
            if self._input_thread is None or not self._input_thread.is_alive():
                self._input_thread = threading.Thread(
                    target=self._input_worker,
                    name=f"android-input-{self.config.surface_id}",
                    daemon=True,
                )
                self._input_thread.start()
            self.probe_frame()
            server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            try:
                server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                server.bind((self.host, 0))
                server.listen(8)
                server.settimeout(0.5)
            except Exception:
                BrowserSurfaceRuntime._close_socket(server)
                raise
            self._server = server
            self.port = int(server.getsockname()[1])
            accept_thread = threading.Thread(
                target=self._accept_loop,
                name=f"android-rfb-{self.config.surface_id}",
                daemon=True,
            )
            accept_thread.start()
            self._accept_thread = accept_thread

    def ready(self) -> bool:
        return bool(
            self._server is not None
            and self.port
            and not self._stop.is_set()
            and not self._unhealthy_error
        )

    def probe_frame(self) -> None:
        self._capture_jpeg()

    def stop(self) -> None:
        with self._lifecycle_lock:
            self._stop.set()
            server, self._server = self._server, None
            if server is not None:
                BrowserSurfaceRuntime._close_socket(server)
            accept_thread, self._accept_thread = self._accept_thread, None
            with self._client_lock:
                client_sockets = tuple(self._client_sockets)
                client_threads = tuple(self._client_threads)
            for connection in client_sockets:
                BrowserSurfaceRuntime._close_socket(connection)
            if accept_thread is not None:
                BrowserSurfaceRuntime._join_threads((accept_thread,), 2.0)
            BrowserSurfaceRuntime._join_threads(client_threads, 2.0)
            with self._client_lock:
                self._client_sockets.clear()
                self._client_threads.clear()

    def _adb_command(self, *args: str, timeout: float = 20.0) -> subprocess.CompletedProcess[bytes]:
        argv = [
            str(self.config.adb_path),
            "-s",
            self.config.device_serial,
            *args,
        ]
        popen_kwargs: dict[str, Any] = {
            "capture_output": True,
            "timeout": timeout,
            "shell": False,
        }
        if os.name == "nt":
            flags = int(getattr(subprocess, "CREATE_NO_WINDOW", 0))
            if flags:
                popen_kwargs["creationflags"] = flags
        return subprocess.run(argv, **popen_kwargs)

    def _sync_frame_geometry(self) -> None:
        image = self._load_screencap_image()
        width, height = image.size
        self._frame_width = width
        self._frame_height = height
        self._remember_device_size(width, height)

    def _detect_device_size(self) -> None:
        try:
            result = self._adb_command("shell", "wm", "size", timeout=5.0)
            text = result.stdout.decode("utf-8", errors="replace")
        except (OSError, subprocess.SubprocessError, SurfaceRuntimeError):
            return
        for line in text.splitlines():
            match = re.search(r"(?:Physical|Override)\s+size:\s*(\d+)x(\d+)", line, re.I)
            if match:
                self._device_width = int(match.group(1))
                self._device_height = int(match.group(2))
                if "Physical" in line or "physical" in line.lower():
                    break

    def _remember_device_size(self, width: int, height: int) -> None:
        if width > 0 and height > 0:
            self._device_width = width
            self._device_height = height

    def _device_point(self, x: int, y: int) -> tuple[int, int]:
        frame_w = max(1, int(self._frame_width))
        frame_h = max(1, int(self._frame_height))
        return (
            max(0, min(frame_w - 1, int(x))),
            max(0, min(frame_h - 1, int(y))),
        )

    def _input_worker(self) -> None:
        while not self._stop.is_set():
            try:
                args = self._input_queue.get(timeout=0.25)
            except queue.Empty:
                continue
            try:
                self._adb_command(*args, timeout=8.0)
            except (OSError, subprocess.SubprocessError, SurfaceRuntimeError):
                continue

    def _enqueue_input(self, *args: str) -> None:
        self._input_queue.put(args)

    def _load_screencap_image(self):
        try:
            from PIL import Image
        except ImportError as exc:  # pragma: no cover - dependency diagnostic
            raise SurfaceRuntimeError("Pillow is required for Android surface frames") from exc
        result = self._adb_command("exec-out", "screencap", timeout=12.0)
        payload = bytes(result.stdout or b"")
        if payload.startswith(b"\x89PNG"):
            image = Image.open(io.BytesIO(payload)).convert("RGB")
            self._remember_device_size(image.width, image.height)
            return image
        if len(payload) >= 12:
            width, height, pixel_format = struct.unpack("<III", payload[:12])
            expected = 12 + width * height * 4
            if pixel_format == 1 and len(payload) >= expected:
                image = Image.frombytes("RGBA", (width, height), payload[12:expected]).convert("RGB")
                self._remember_device_size(width, height)
                return image
        raise SurfaceRuntimeError("Android screencap returned malformed frame data")

    def _frame_image(self):
        return self._load_screencap_image()

    def _capture_interval(self) -> float:
        now = time.monotonic()
        return 0.08 if now < self._interaction_until else 0.35

    def _capture_jpeg(self) -> bytes:
        try:
            from PIL import Image
        except ImportError as exc:  # pragma: no cover - dependency diagnostic
            raise SurfaceRuntimeError("Pillow is required for Android surface frames") from exc
        with self._frame_lock:
            if self._stop.is_set():
                raise SurfaceRuntimeError("The Android surface is stopping")
            now = time.monotonic()
            interval = self._capture_interval()
            delay = interval - (now - self._last_frame_at)
            if delay > 0:
                time.sleep(delay)
            image = self._frame_image()
            output = io.BytesIO()
            image.save(output, format="JPEG", quality=55, optimize=True)
            frame = output.getvalue()
            if not (frame.startswith(b"\xff\xd8") and frame.endswith(b"\xff\xd9")):
                raise SurfaceRuntimeError("Android surface returned a malformed JPEG frame")
            self._last_frame_at = time.monotonic()
            return frame

    def _capture_bgrx(self) -> bytes:
        with self._frame_lock:
            if self._stop.is_set():
                raise SurfaceRuntimeError("The Android surface is stopping")
            delay = self._capture_interval() - (time.monotonic() - self._last_frame_at)
            if delay > 0:
                time.sleep(delay)
            frame = self._frame_image().tobytes("raw", "BGRX")
            self._last_frame_at = time.monotonic()
            return frame

    def _mark_interaction(self) -> None:
        self._interaction_until = max(self._interaction_until, time.monotonic() + 3.0)

    def _mark_unhealthy(self, error: BaseException) -> None:
        if not self._stop.is_set() and not self._unhealthy_error:
            self._unhealthy_error = str(error) or error.__class__.__name__

    def _dispatch_pointer(self, old_mask: int, new_mask: int, x: int, y: int) -> None:
        if self._stop.is_set():
            raise SurfaceRuntimeError("The Android surface is stopping")
        self._mark_interaction()
        device_x, device_y = self._device_point(x, y)
        if (new_mask & 8) and not (old_mask & 8):
            self._enqueue_input(
                "shell",
                "input",
                "swipe",
                str(device_x),
                str(device_y),
                str(device_x),
                str(max(0, device_y - int((self._device_height or self.config.height) * 0.12))),
                "100",
            )
        elif (new_mask & 16) and not (old_mask & 16):
            device_h = self._device_height or self.config.height
            self._enqueue_input(
                "shell",
                "input",
                "swipe",
                str(device_x),
                str(device_y),
                str(device_x),
                str(min(device_h - 1, device_y + int(device_h * 0.12))),
                "100",
            )
        elif (new_mask & 1) and not (old_mask & 1):
            self._enqueue_input(
                "shell",
                "input",
                "motionevent",
                "DOWN",
                str(device_x),
                str(device_y),
            )
            self._enqueue_input(
                "shell",
                "input",
                "motionevent",
                "UP",
                str(device_x),
                str(device_y),
            )

    def _dispatch_key(self, down: bool, keysym: int) -> None:
        if not down or self._stop.is_set():
            return
        self._mark_interaction()
        keycode = self._ADB_KEYCODES.get(keysym)
        if keycode is not None:
            self._enqueue_input("shell", "input", "keyevent", str(keycode))
            return
        char = BrowserSurfaceRuntime._keysym_character(keysym)
        if char:
            escaped = char.replace(" ", "%s").replace("&", "\\&")
            self._enqueue_input("shell", "input", "text", escaped)

    def _accept_loop(self) -> None:
        server = self._server
        if server is None:
            return
        while not self._stop.is_set():
            try:
                client, _address = server.accept()
            except socket.timeout:
                continue
            except OSError:
                break
            client.settimeout(30.0)
            thread = threading.Thread(
                target=self._serve_client,
                args=(client,),
                name=f"android-rfb-client-{self.config.surface_id}",
                daemon=True,
            )
            close_client = False
            with self._client_lock:
                if self._stop.is_set():
                    close_client = True
                else:
                    self._client_sockets.add(client)
                    self._client_threads.add(thread)
                    try:
                        thread.start()
                    except RuntimeError:
                        self._client_sockets.discard(client)
                        self._client_threads.discard(thread)
                        close_client = True
            if close_client:
                BrowserSurfaceRuntime._close_socket(client)

    def _serve_client(self, connection: socket.socket) -> None:
        try:
            connection.sendall(b"RFB 003.008\n")
            version = BrowserSurfaceRuntime._recv_exact(connection, 12)
            if version != b"RFB 003.008\n":
                raise ConnectionError("Only RFB 3.8 clients are supported")
            connection.sendall(b"\x01\x01")
            if BrowserSurfaceRuntime._recv_exact(connection, 1) != b"\x01":
                raise ConnectionError("RFB client rejected the local security mode")
            connection.sendall(struct.pack(">I", 0))
            BrowserSurfaceRuntime._recv_exact(connection, 1)
            name = f"AppLooper android {self.config.surface_id}".encode("utf-8")
            pixel_format = _DEFAULT_RFB_PIXEL_FORMAT
            frame_width = max(1, int(self._frame_width))
            frame_height = max(1, int(self._frame_height))
            connection.sendall(
                struct.pack(">HH", frame_width, frame_height)
                + pixel_format.to_wire()
                + struct.pack(">I", len(name))
                + name
            )
            connection.settimeout(None)
            button_mask = 0
            accepted_encodings: set[int] = set()
            last_jpeg_frame: bytes | None = None
            while not self._stop.is_set():
                message_type = BrowserSurfaceRuntime._recv_exact(connection, 1)[0]
                if message_type == 0:
                    payload = BrowserSurfaceRuntime._recv_exact(connection, 19)
                    pixel_format = _RfbPixelFormat.from_wire(payload[3:])
                elif message_type == 2:
                    header = BrowserSurfaceRuntime._recv_exact(connection, 3)
                    count = struct.unpack(">H", header[1:3])[0]
                    encoded = BrowserSurfaceRuntime._recv_exact(connection, count * 4)
                    accepted_encodings = (
                        set(struct.unpack(f">{count}i", encoded)) if count else set()
                    )
                elif message_type == 3:
                    request = BrowserSurfaceRuntime._recv_exact(connection, 9)
                    incremental = bool(request[0])
                    if 21 in accepted_encodings:
                        try:
                            jpeg_frame = self._capture_jpeg()
                        except Exception as exc:
                            self._mark_unhealthy(exc)
                            raise
                        if incremental and jpeg_frame == last_jpeg_frame:
                            connection.sendall(b"\x00\x00\x00\x00")
                            continue
                        connection.sendall(
                            b"\x00\x00\x00\x01"
                            + struct.pack(
                                ">HHHHi",
                                0,
                                0,
                                frame_width,
                                frame_height,
                                21,
                            )
                            + jpeg_frame
                        )
                        last_jpeg_frame = jpeg_frame
                    else:
                        try:
                            raw_frame = self._capture_bgrx()
                        except Exception as exc:
                            self._mark_unhealthy(exc)
                            raise
                        frame = BrowserSurfaceRuntime._encode_bgrx(raw_frame, pixel_format)
                        connection.sendall(
                            b"\x00\x00\x00\x01"
                            + struct.pack(
                                ">HHHHi",
                                0,
                                0,
                                frame_width,
                                frame_height,
                                0,
                            )
                            + frame
                        )
                elif message_type == 4:
                    payload = BrowserSurfaceRuntime._recv_exact(connection, 7)
                    self._dispatch_key(bool(payload[0]), struct.unpack(">I", payload[3:7])[0])
                elif message_type == 5:
                    payload = BrowserSurfaceRuntime._recv_exact(connection, 5)
                    new_mask = payload[0]
                    x, y = struct.unpack(">HH", payload[1:5])
                    self._dispatch_pointer(button_mask, new_mask, x, y)
                    button_mask = new_mask
                elif message_type == 6:
                    payload = BrowserSurfaceRuntime._recv_exact(connection, 7)
                    length = struct.unpack(">I", payload[3:7])[0]
                    if length > 1_000_000:
                        raise ConnectionError("RFB clipboard payload is too large")
                    BrowserSurfaceRuntime._recv_exact(connection, length)
                elif message_type == 150:
                    BrowserSurfaceRuntime._recv_exact(connection, 9)
                elif message_type == 248:
                    payload = BrowserSurfaceRuntime._recv_exact(connection, 8)
                    length = payload[7]
                    BrowserSurfaceRuntime._recv_exact(connection, length)
                else:
                    raise ConnectionError(f"Unsupported RFB client message: {message_type}")
        except (ConnectionError, OSError):
            pass
        except SurfaceRuntimeError as exc:
            self._mark_unhealthy(exc)
        except Exception as exc:
            self._mark_unhealthy(exc)
        finally:
            BrowserSurfaceRuntime._close_socket(connection)
            current = threading.current_thread()
            with self._client_lock:
                self._client_sockets.discard(connection)
                self._client_threads.discard(current)
