"use strict";

const CACHE_NAME = "applooper-web-v202";
const NAVIGATION_TIMEOUT_MS = 30_000;
const ASSET_TIMEOUT_MS = 0;
const APP_SHELL_CORE = [
  "./",
  "./index.html",
  "./styles.css?v=202",
  "./boot.js?v=202",
  "./i18n.js?v=202",
  "./app.js?v=202",
  "./manifest.webmanifest",
];
const APP_SHELL_OPTIONAL = [
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./vendor/agent-avatars/development.png",
  "./vendor/agent-avatars/internal-test.png",
  "./vendor/agent-avatars/owner-intent.png",
  "./vendor/agent-avatars/virtual-user-office.png",
  "./vendor/agent-avatars/virtual-user-student.png",
];

const GATEWAY_ROUTE_SEGMENTS = new Set(["api"]);
const GATEWAY_ASSETS = new Set();

function scopeRelativePath(url) {
  const scopePath = new URL(self.registration.scope).pathname;
  const scopePrefix = scopePath.endsWith("/") ? scopePath : `${scopePath}/`;
  if (!url.pathname.startsWith(scopePrefix)) return null;
  return url.pathname.slice(scopePrefix.length).replace(/^\/+/, "");
}

function isGatewayOwnedRequest(url) {
  const relativePath = scopeRelativePath(url);
  if (relativePath === null) return true;
  const firstSegment = relativePath.split("/", 1)[0].toLowerCase();
  return GATEWAY_ROUTE_SEGMENTS.has(firstSegment) || GATEWAY_ASSETS.has(relativePath);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(APP_SHELL_CORE);
        await Promise.allSettled(APP_SHELL_OPTIONAL.map((asset) => cache.add(asset)));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isGatewayOwnedRequest(url)) return;

  const isNavigation = request.mode === "navigate";
  event.respondWith(
    networkFirst(request, isNavigation)
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_error) {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const runId = /^wf-\d{8}-\d{6}-[0-9a-f]{8}$/.test(String(payload.run_id || ""))
    ? String(payload.run_id)
    : "";
  const title = String(payload.title || "AppLooper update").slice(0, 100);
  const body = String(payload.body || "Open AppLooper to view the latest progress.").slice(0, 360);
  const eventId = String(payload.event_id || "").slice(0, 300);
  const fallbackTargetUrl = runId
    ? `./?app=${encodeURIComponent(runId)}&tab=development${eventId ? `&event=${encodeURIComponent(eventId)}` : ""}`
    : "./?tab=development";
  const targetUrl = String(payload.url || fallbackTargetUrl).slice(0, 800);
  event.waitUntil(deliverDeveloperMessage(payload, { runId, title, body, targetUrl }));
});

async function deliverDeveloperMessage(payload, message) {
  let windows = [];
  try {
    windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  } catch (_error) {
    // If client discovery fails, preserve the user-visible background notice.
  }

  const visibleClients = windows.filter((client) => client.visibilityState === "visible");
  if (visibleClients.length) {
    const clientPayload = {
      type: payload.type === "agent_mention" ? "agent_mention" : "developer_message",
      run_id: message.runId,
      event_id: String(payload.event_id || "").slice(0, 300),
      message_id: String(payload.message_id || "").slice(0, 300),
      title: message.title,
      body: message.body,
      count: Math.max(1, Math.floor(Number(payload.count) || 1)),
      url: message.targetUrl,
      system_notification_shown: true,
    };
    visibleClients.forEach((client) => client.postMessage(clientPayload));
  }

  // WebKit requires every push event to produce a user-visible notification.
  // Showing it consistently also makes foreground/background behavior match
  // across iOS, Android, and desktop browsers.
  await self.registration.showNotification(message.title, {
    body: message.body,
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: message.runId ? `developer-${message.runId}` : "developer-feedback",
    renotify: true,
    data: { url: message.targetUrl },
  });
  if (self.navigator && typeof self.navigator.setAppBadge === "function") {
    const count = Math.max(1, Math.floor(Number(payload.count) || 1));
    await self.navigator.setAppBadge(count).catch(() => {});
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = String(event.notification?.data?.url || "./");
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      for (const client of windows) {
        if ("navigate" in client) await client.navigate(targetUrl);
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined;
    })
  );
});

async function networkFirst(request, isNavigation) {
  try {
    const response = await fetchWithTimeout(
      request,
      isNavigation ? NAVIGATION_TIMEOUT_MS : ASSET_TIMEOUT_MS,
    );
    if (response.ok) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const cacheKey = isNavigation ? "./index.html" : request;
        await cache.put(cacheKey, response.clone());
      } catch (_cacheError) {
        // A quota/write failure must not replace a valid network response
        // with an older cached asset.
      }
    }
    return response;
  } catch (_error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (isNavigation) {
      const appShell = await caches.match("./index.html");
      if (appShell) return appShell;
    }
    return Response.error();
  }
}

async function fetchWithTimeout(request, timeoutMs) {
  // Static generation URLs are immutable and may take longer than a few
  // seconds over a cold mobile Funnel connection. Aborting app.js/boot.js
  // here caused the installed PWA to render a blank document. Navigations
  // remain bounded, while static assets use the browser's network lifecycle.
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return fetch(request);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
