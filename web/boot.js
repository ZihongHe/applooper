"use strict";

(() => {
  const SHELL_VERSION = "202";
  const CACHE_PREFIX = "applooper-web-";
  // Funnel relay latency can occasionally exceed 20 seconds even while the
  // local service is healthy. Keep this bounded, but do not report a false
  // disconnect before the access handshake has had a realistic chance.
  const BOOT_TIMEOUT_MS = 120_000;
  let recoveryInFlight = false;

  window.__APPLOOPER_SHELL_VERSION__ = SHELL_VERSION;
  window.__APPLOOPER_BOOT_COMPLETE__ = false;
  window.__APPLOOPER_INIT_STARTED__ = false;

  function bootText(zh, en) {
    const i18n = window.AppLooperI18n;
    if (i18n?.pair && i18n?.resolvePair && i18n?.getLocale) {
      return i18n.resolvePair(i18n.pair(zh, en), i18n.getLocale(), en);
    }
    let locale = document.documentElement.lang || navigator.language || "";
    try {
      locale = localStorage.getItem("applooper.locale") || locale;
    } catch {
      // Device-local locale storage is optional during the recovery path.
    }
    return String(locale).toLowerCase().startsWith("en") ? en : zh;
  }

  window.addEventListener("error", (event) => {
    if (window.__APPLOOPER_BOOT_COMPLETE__) return;
    const message = String(event?.error?.message || event?.message || bootText(
      "页面脚本运行出错。",
      "A page script failed.",
    ));
    showStaticBootFailure(`${message} ${bootText("请点击“重新连接”重试。", 'Select "Reconnect" to try again.')}`);
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (window.__APPLOOPER_BOOT_COMPLETE__) return;
    const reason = event?.reason;
    const message = String(reason?.message || reason || bootText(
      "页面初始化未完成。",
      "Page initialization did not complete.",
    ));
    showStaticBootFailure(`${message} ${bootText("请点击“重新连接”重试。", 'Select "Reconnect" to try again.')}`);
  });

  /**
   * Clear only AppLooper's generated shell caches and request a fresh page.
   * Automatic recovery is bounded to one attempt per version. An explicit
   * retry remains available and receives a unique cache-busting URL.
   */
  window.__APPLOOPER_RECOVER_BOOT__ = async function recoverBoot(version, force = false) {
    if (recoveryInFlight) return false;
    const current = new URL(window.location.href);
    const requestedVersion = version ? String(version) : "";
    if (!force && requestedVersion && current.searchParams.get("boot_refresh") === requestedVersion) {
      return false;
    }

    recoveryInFlight = true;
    try {
      // Remove the currently active interceptor before deleting its cache.
      // Otherwise the next navigation can still be handled by an old worker
      // whose now-empty cache turns a slow Funnel request into a white page.
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
        await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
      }
      if (typeof caches !== "undefined") {
        const keys = await caches.keys().catch(() => []);
        await Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX))
            .map((key) => caches.delete(key).catch(() => false)),
        );
      }
    } finally {
      const target = new URL(window.location.href);
      target.searchParams.set(
        "boot_refresh",
        requestedVersion || `${SHELL_VERSION}-${Date.now()}`,
      );
      if (force) target.searchParams.set("boot_retry", String(Date.now()));
      window.location.replace(target.href);
    }
    return true;
  };

  function showStaticBootFailure(messageText) {
    if (window.__APPLOOPER_BOOT_COMPLETE__) return;
    const gate = document.getElementById("accessGate");
    if (!gate || gate.hidden) return;
    const unavailable = document.getElementById("accessUnavailable");
    if (unavailable && !unavailable.hidden) return;
    const checking = document.getElementById("accessChecking");
    const message = document.getElementById("accessUnavailableText");
    const retry = document.getElementById("accessRetryButton");
    gate.dataset.bootTimedOut = "true";
    gate.classList.remove("is-loading");
    if (checking) checking.hidden = true;
    if (unavailable) unavailable.hidden = false;
    if (message) message.textContent = messageText;
    if (retry && retry.dataset.bootRecoveryBound !== "true" && !window.__APPLOOPER_ACCESS_RETRY_MANAGED__) {
      retry.dataset.bootRecoveryBound = "true";
      retry.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        void window.__APPLOOPER_RECOVER_BOOT__(SHELL_VERSION, true);
      }, { capture: true });
    }
  }

  // Deferred scripts execute after parsing and in document order, so the app
  // bundle element is available here even when its download has failed.
  const appBundle = document.getElementById("appBundle");
  if (appBundle) {
    appBundle.addEventListener("error", () => {
      showStaticBootFailure(
        bootText(
          "页面程序未能完整加载。请点击“重新连接”，AppLooper 将获取最新版本。",
          'The page bundle did not load completely. Select "Reconnect" to get the latest AppLooper version.',
        ),
      );
    }, { once: true });
  }

  window.setTimeout(() => {
    const gate = document.getElementById("accessGate");
    if (
      window.__APPLOOPER_BOOT_COMPLETE__
      || !gate
      || gate.hidden
      || !gate.classList.contains("is-loading")
    ) return;
    showStaticBootFailure(
      bootText(
        "启动等待时间过长。请点击“重新连接”，AppLooper 将清理旧页面缓存并加载最新版本。",
        'Startup took too long. Select "Reconnect" to clear the old page cache and load the latest version.',
      ),
    );
  }, BOOT_TIMEOUT_MS);
})();
