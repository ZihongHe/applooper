(() => {
  "use strict";

  const ZH = "zh-CN";
  const EN = "en";
  const STORAGE_KEY = "applooper.locale";
  const LEGACY_KEYS = ["workflow-language", "applooper_ui_locale"];
  let catalog = {};
  const EARLY_SHELL_CATALOG = {
    "meta.description": pair(
      "集中查看应用开发进度、体验反馈并与研发智能体沟通。",
      "Track application development, experience feedback, and developer-agent conversations in one place."
    ),
    "a11y.skip_to_chat": pair("跳到与研发智能体的对话", "Skip to the developer-agent conversation"),
    "brand.name": pair("AppLooper", "AppLooper"),
    "brand.tagline": pair("开始构建你的应用", "Start building your application"),
    "language.label": pair("界面语言", "Interface language"),
    "language.zh_long": pair("中文", "ZH"),
    "language.zh_short": pair("中", "ZH"),
    "language.en_short": pair("EN", "EN"),
    "access.gate_aria": pair("访问 AppLooper", "Access AppLooper"),
    "access.connecting_title": pair("AppLooper正在加载中…", "AppLooper is loading…"),
    "access.first_connection": pair("首次连接", "First connection"),
    "access.connect_title": pair("连接你的电脑", "Connect to your computer"),
    "access.help": pair(
      "建议先把此页添加到主屏幕，再从桌面图标打开并输入电脑显示的 6 位配对码。",
      "Add this page to your Home Screen, open it from the icon, then enter the 6-digit code shown on your computer."
    ),
    "access.code_label": pair("6 位配对码", "6-digit pairing code"),
    "access.connect_button": pair("连接电脑", "Connect"),
    "access.footnote": pair(
      "配对码 5 分钟内有效。连接成功后，这台手机 90 天内无需重复登录。",
      "The code is valid for 5 minutes. After pairing, this phone stays signed in for 90 days."
    ),
    "access.success_title": pair("连接成功", "Connected"),
    "access.success_copy": pair(
      "连接已保存 90 天。要在退出页面后收到研发提醒，再完成下面两步。",
      "This connection is saved for 90 days. To receive developer alerts after closing the page, finish these two steps."
    ),
    "access.install_step_share": pair(
      "点击 Safari 右下角“…”；如果看到了“分享”图标，也可直接点击",
      "Tap … at the bottom right of Safari, or tap Share if its icon is already visible"
    ),
    "access.install_step_home": pair(
      "选择“分享”→“添加到主屏幕”，再从桌面打开 AppLooper",
      "Choose Share → Add to Home Screen, then open AppLooper from the new icon"
    ),
    "access.enter": pair("进入工作台", "Open workspace"),
    "access.unavailable_title": pair("暂时无法连接电脑", "Cannot reach your computer"),
    "access.unavailable_copy": pair(
      "请确认电脑在线且网页服务仍在运行。",
      "Make sure the computer is online and the web service is still running."
    ),
    "access.retry": pair("重新连接", "Try again"),
  };

  function normalizeLocale(value) {
    return String(value || "").toLowerCase().startsWith("en") ? EN : ZH;
  }

  function containsCjk(value) {
    return /[\u3400-\u9fff\uf900-\ufaff]/u.test(String(value ?? ""));
  }

  function pair(zh = "", en = "") {
    return { [ZH]: String(zh ?? ""), [EN]: String(en ?? "") };
  }

  function resolvePair(value, locale, fallback = "") {
    const normalized = normalizeLocale(locale);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const selected = String(value[normalized] ?? value[normalized === EN ? "en-US" : "zh"] ?? "");
      if (selected) return selected;
      // A controlled English interface must never silently leak the Chinese
      // field. Missing translations remain observable and testable.
      return normalized === EN ? String(fallback || "") : String(value[ZH] ?? fallback ?? "");
    }
    const legacy = String(value ?? fallback ?? "");
    return normalized === EN && containsCjk(legacy) ? String(fallback || "") : legacy;
  }

  function field(object, name, locale, fallback = "") {
    const source = object && typeof object === "object" ? object : {};
    const localized = source[`${name}_i18n`];
    if (localized && typeof localized === "object") {
      return resolvePair(localized, locale, fallback);
    }
    return resolvePair(source[name], locale, fallback);
  }

  function configure(nextCatalog) {
    const source = nextCatalog && typeof nextCatalog === "object" ? nextCatalog : {};
    catalog = {};
    const keys = new Set([
      ...Object.keys(source[ZH] || {}),
      ...Object.keys(source[EN] || {}),
    ]);
    keys.forEach((key) => {
      catalog[key] = pair(source[ZH]?.[key] ?? "", source[EN]?.[key] ?? "");
    });
    return catalog;
  }

  function text(key, locale, variables = {}) {
    const template = resolvePair(catalog[key], locale, key);
    return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : match
    );
  }

  function getLocale() {
    try {
      for (const key of [STORAGE_KEY, ...LEGACY_KEYS]) {
        const value = localStorage.getItem(key);
        if (value) return normalizeLocale(value);
      }
    } catch {
      // Storage is an optional device-local convenience.
    }
    return normalizeLocale(navigator.language);
  }

  function setLocale(locale) {
    const normalized = normalizeLocale(locale);
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
      LEGACY_KEYS.forEach((key) => localStorage.setItem(key, normalized));
    } catch {
      // The selected value is still returned for the current navigation.
    }
    return normalized;
  }

  function applyEarlyShell(root = document, locale = getLocale()) {
    const normalized = normalizeLocale(locale);
    document.documentElement.lang = normalized;
    const mappings = [
      ["data-i18n", "textContent"],
      ["data-i18n-placeholder", "placeholder"],
      ["data-i18n-aria-label", "aria-label"],
      ["data-i18n-title", "title"],
      ["data-i18n-alt", "alt"],
      ["data-i18n-content", "content"],
    ];
    mappings.forEach(([attribute, property]) => {
      root.querySelectorAll?.(`[${attribute}]`).forEach((node) => {
        const localized = EARLY_SHELL_CATALOG[node.getAttribute(attribute)];
        if (!localized) return;
        const value = resolvePair(localized, normalized);
        if (property === "textContent") node.textContent = value;
        else node.setAttribute(property, value);
      });
    });
    return normalized;
  }

  function auditVisibleEnglish(root = document) {
    const failures = [];
    if (normalizeLocale(document.documentElement.lang) !== EN) return failures;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      if (!element || element.closest("[data-user-content], pre, code, iframe, canvas, [hidden]")) continue;
      if (node.nodeType === Node.TEXT_NODE && containsCjk(node.nodeValue)) {
        failures.push({ kind: "text", value: node.nodeValue.trim().slice(0, 160), element });
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        for (const attribute of ["placeholder", "title", "aria-label", "alt"]) {
          const value = element.getAttribute?.(attribute) || "";
          if (containsCjk(value)) failures.push({ kind: attribute, value: value.slice(0, 160), element });
        }
      }
    }
    return failures;
  }

  window.AppLooperI18n = Object.freeze({
    ZH,
    EN,
    storageKey: STORAGE_KEY,
    normalizeLocale,
    containsCjk,
    pair,
    resolvePair,
    field,
    configure,
    text,
    getLocale,
    setLocale,
    applyEarlyShell,
    auditVisibleEnglish,
  });
  applyEarlyShell(document);
})();
