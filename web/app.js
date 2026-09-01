"use strict";

(() => {
  const API = "/api";
  const POLL_MS = 5000;
  const text = {
    en: {
      tagline: "Build applications on your own computer",
      loading: "Connecting…",
      connectTitle: "Connect to AppLooper",
      connectHelp: "Enter the six-digit code shown by AppLooper on your computer.",
      pairingCode: "Pairing code",
      connect: "Connect",
      unavailableTitle: "AppLooper is unavailable",
      unavailableText: "Check that the local service is running, then try again.",
      retry: "Retry",
      myApps: "My applications",
      newApp: "New",
      connected: "Connected",
      disconnected: "Disconnected",
      selectApp: "Select an application",
      selectHint: "Choose an application from the sidebar or create a new one.",
      refresh: "Refresh",
      develop: "Develop",
      trial: "Trial",
      publish: "Publish",
      emptyTitle: "Create your first application",
      emptyCopy: "Describe what you want to build and choose a local workspace.",
      messageLabel: "Tell the developer agent what to build or improve",
      messagePlaceholder: "Describe a feature, issue, or change…",
      send: "Send",
      trialTitle: "Application preview",
      trialWaiting: "The preview will appear when the application is ready.",
      trialReady: "The application preview is ready.",
      reload: "Reload",
      feedbackLabel: "Share trial feedback with the developer agent",
      feedbackPlaceholder: "Describe what worked or what needs improvement…",
      sendFeedback: "Send feedback",
      downloadTitle: "Download application package",
      downloadCopy: "Export the current workspace as a source archive. Secret-looking values are removed from the archive.",
      download: "Download package",
      createTitle: "Create an application",
      createCopy: "AppLooper can start in a fresh folder or continue an existing project.",
      audience: "Who is it for?",
      audiencePlaceholder: "For example: busy parents",
      appType: "Application type",
      typePlaceholder: "For example: meal planner",
      description: "Description",
      descriptionPlaceholder: "Describe the application and its main requirements.",
      codingAgent: "Coding agent",
      workspacePath: "Workspace folder",
      workspacePlaceholder: "Absolute path to an existing folder",
      workspaceHelp: "Use the configured workspace root for a fresh project, or choose an existing project folder.",
      cancel: "Cancel",
      create: "Create",
      installed: "Available",
      notInstalled: "Not installed",
      you: "You",
      developer: "Developer agent",
      noMessages: "No messages yet. Tell the developer agent what you want to build.",
      created: "Created",
      queued: "Queued",
      working: "Working",
      delivered: "Ready",
      paused: "Needs attention",
      saved: "Saved",
      feedbackSent: "Feedback sent",
      messageSent: "Message sent",
      loadingApp: "Loading application…",
      unknownError: "The operation could not be completed.",
      workspaceRequired: "Choose an existing local folder.",
      codingAgentRequired: "Install and select an available coding agent.",
      createInProgress: "Creating…",
      previewUnavailable: "The preview is not ready yet.",
      statusPrefix: "Status",
      workspacePrefix: "Workspace",
    },
    "zh-CN": {
      tagline: "在你自己的电脑上构建应用",
      loading: "正在连接…",
      connectTitle: "连接 AppLooper",
      connectHelp: "请输入 AppLooper 在电脑上显示的六位配对码。",
      pairingCode: "配对码",
      connect: "连接",
      unavailableTitle: "暂时无法连接 AppLooper",
      unavailableText: "请确认本地服务正在运行，然后重试。",
      retry: "重试",
      myApps: "我的应用",
      newApp: "新建",
      connected: "已连接",
      disconnected: "连接中断",
      selectApp: "选择一个应用",
      selectHint: "从侧边栏选择应用，或新建一个应用。",
      refresh: "刷新",
      develop: "研发",
      trial: "试用",
      publish: "发布",
      emptyTitle: "创建你的第一个应用",
      emptyCopy: "描述你想构建的内容，并选择本地工作区。",
      messageLabel: "告诉研发智能体要构建或改进什么",
      messagePlaceholder: "描述一个功能、问题或调整…",
      send: "发送",
      trialTitle: "应用预览",
      trialWaiting: "应用就绪后会在这里显示预览。",
      trialReady: "应用预览已经就绪。",
      reload: "重新加载",
      feedbackLabel: "把试用反馈发送给研发智能体",
      feedbackPlaceholder: "描述哪些地方好用，或哪些地方需要改进…",
      sendFeedback: "发送反馈",
      downloadTitle: "下载应用软件包",
      downloadCopy: "把当前工作区导出为源码压缩包；导出时会清除疑似敏感值。",
      download: "下载软件包",
      createTitle: "创建应用",
      createCopy: "AppLooper 可以在新工作区中从零开始，也可以继续已有项目。",
      audience: "面向谁？",
      audiencePlaceholder: "例如：忙碌的家长",
      appType: "应用类型",
      typePlaceholder: "例如：膳食规划工具",
      description: "应用描述",
      descriptionPlaceholder: "描述应用及其主要需求。",
      codingAgent: "编程智能体",
      workspacePath: "工作区文件夹",
      workspacePlaceholder: "电脑上已有文件夹的绝对路径",
      workspaceHelp: "选择默认工作区根目录可创建全新项目，也可以选择已有项目文件夹继续开发。",
      cancel: "取消",
      create: "创建",
      installed: "可用",
      notInstalled: "未安装",
      you: "你",
      developer: "研发智能体",
      noMessages: "还没有消息。告诉研发智能体你想构建什么吧。",
      created: "已创建",
      queued: "已排队",
      working: "进行中",
      delivered: "已就绪",
      paused: "需要处理",
      saved: "已保存",
      feedbackSent: "反馈已发送",
      messageSent: "消息已发送",
      loadingApp: "正在加载应用…",
      unknownError: "操作未能完成。",
      workspaceRequired: "请选择电脑上已有的本地文件夹。",
      codingAgentRequired: "请安装并选择一个可用的编程智能体。",
      createInProgress: "正在创建…",
      previewUnavailable: "应用预览尚未就绪。",
      statusPrefix: "状态",
      workspacePrefix: "工作区",
    },
  };

  const byId = (id) => document.getElementById(id);
  const state = {
    locale: loadLocale(),
    apps: [],
    currentId: "",
    detail: null,
    system: null,
    tab: "develop",
    polling: false,
    toastTimer: 0,
  };

  function loadLocale() {
    let stored = "";
    try { stored = localStorage.getItem("applooper.locale") || ""; } catch { /* optional */ }
    const candidate = stored || navigator.language || "en";
    return String(candidate).toLowerCase().startsWith("zh") ? "zh-CN" : "en";
  }

  function t(key) {
    return text[state.locale]?.[key] || text.en[key] || key;
  }

  function applyLocale() {
    document.documentElement.lang = state.locale;
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      node.placeholder = t(node.dataset.i18nPlaceholder);
    });
    byId("languageButton").textContent = state.locale === "en" ? "中文" : "EN";
    renderApps();
    renderCurrent();
  }

  function localized(value, fallback = "") {
    if (value && typeof value === "object") {
      const exact = value[state.locale];
      const english = value.en;
      const chinese = value["zh-CN"] || value.zh;
      return String(exact ?? (state.locale === "en" ? english : chinese) ?? english ?? chinese ?? fallback);
    }
    return String(value ?? fallback);
  }

  async function request(path, options = {}) {
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    const init = { credentials: "same-origin", ...options, headers };
    if (init.body && typeof init.body !== "string") {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(init.body);
    }
    const response = await fetch(path, init);
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : null;
    if (!response.ok) {
      const message = payload?.message || payload?.detail || payload?.error?.message || payload?.error || `${response.status} ${response.statusText}`;
      const error = new Error(String(message || t("unknownError")));
      error.status = response.status;
      error.code = payload?.code || payload?.error?.code || "";
      throw error;
    }
    return payload;
  }

  function setConnection(online) {
    byId("connectionDot").classList.toggle("offline", !online);
    byId("connectionText").textContent = online ? t("connected") : t("disconnected");
  }

  function showToast(message) {
    const toast = byId("toast");
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3500);
  }

  function showAccess(name) {
    for (const id of ["accessChecking", "accessForm", "accessUnavailable"]) byId(id).hidden = id !== name;
  }

  async function verifyAccess() {
    showAccess("accessChecking");
    try {
      const access = await request(`${API}/access/status`);
      if (!access?.authenticated) {
        showAccess("accessForm");
        return;
      }
      byId("accessGate").hidden = true;
      byId("workspace").hidden = false;
      await initializeWorkspace();
    } catch (error) {
      byId("accessUnavailableText").textContent = error.message || t("unavailableText");
      showAccess("accessUnavailable");
    }
  }

  async function initializeWorkspace() {
    try {
      state.system = await request(`${API}/system`);
      updateCodingAgentOptions();
      const root = state.system?.workspace_root || state.system?.workspace || "";
      if (root) byId("workspaceInput").value = root;
      await loadApps();
      setConnection(true);
      window.setInterval(() => { void refreshCurrent(false); }, POLL_MS);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js").catch(() => undefined);
      }
    } catch (error) {
      setConnection(false);
      showToast(error.message || t("unknownError"));
    }
  }

  function appName(app) {
    return localized(app?.name_i18n, app?.name || app?.app_type || app?.workspace_name || "AppLooper");
  }

  function statusKey(raw) {
    const value = String(raw || "").toLowerCase();
    if (value.includes("deliver") || value.includes("ready") || value.includes("complete")) return "delivered";
    if (value.includes("pause") || value.includes("error") || value.includes("recover")) return "paused";
    if (value.includes("queue") || value.includes("created") || value.includes("start")) return value.includes("created") ? "created" : "queued";
    return value ? "working" : "created";
  }

  function renderApps() {
    const list = byId("appList");
    if (!list) return;
    list.replaceChildren();
    for (const app of state.apps) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `app-item${app.run_id === state.currentId ? " active" : ""}`;
      const title = document.createElement("strong");
      const subtitle = document.createElement("small");
      title.textContent = appName(app);
      subtitle.textContent = `${t(statusKey(app.status))} · ${localized(app.audience_i18n, app.audience || app.workspace_name || "")}`;
      button.append(title, subtitle);
      button.addEventListener("click", () => void selectApp(app.run_id));
      list.append(button);
    }
  }

  async function loadApps(preferredId = "") {
    const payload = await request(`${API}/apps`);
    state.apps = Array.isArray(payload?.apps) ? payload.apps : [];
    const wanted = preferredId || state.currentId || state.apps[0]?.run_id || "";
    renderApps();
    if (wanted) await selectApp(wanted, false);
    else renderCurrent();
  }

  async function selectApp(runId, closeDrawer = true) {
    if (!runId) return;
    state.currentId = runId;
    state.detail = null;
    byId("appTitle").textContent = t("loadingApp");
    renderApps();
    if (closeDrawer) byId("appsPanel").classList.remove("open");
    try {
      state.detail = await request(`${API}/apps/${encodeURIComponent(runId)}`);
      const index = state.apps.findIndex((app) => app.run_id === runId);
      if (index >= 0 && state.detail?.state) state.apps[index] = { ...state.apps[index], ...state.detail.state };
      setConnection(true);
      renderApps();
      renderCurrent();
    } catch (error) {
      setConnection(false);
      showToast(error.message || t("unknownError"));
    }
  }

  async function refreshCurrent(showMessage = true) {
    if (!state.currentId || state.polling) return;
    state.polling = true;
    try {
      const detail = await request(`${API}/apps/${encodeURIComponent(state.currentId)}`);
      state.detail = detail;
      const index = state.apps.findIndex((app) => app.run_id === state.currentId);
      if (index >= 0 && detail?.state) state.apps[index] = { ...state.apps[index], ...detail.state };
      setConnection(true);
      renderApps();
      renderCurrent();
      if (showMessage) showToast(t("saved"));
    } catch (error) {
      setConnection(false);
      if (showMessage) showToast(error.message || t("unknownError"));
    } finally {
      state.polling = false;
    }
  }

  function currentPublicState() {
    return state.detail?.state || state.apps.find((app) => app.run_id === state.currentId) || null;
  }

  function renderCurrent() {
    const app = currentPublicState();
    const selected = Boolean(app && state.currentId);
    byId("emptyState").hidden = selected;
    byId("appTabs").hidden = !selected;
    byId("developView").hidden = !selected || state.tab !== "develop";
    byId("trialView").hidden = !selected || state.tab !== "trial";
    byId("publishView").hidden = !selected || state.tab !== "publish";
    byId("refreshButton").disabled = !selected;
    if (!selected) {
      byId("appTitle").textContent = t("selectApp");
      byId("phaseText").textContent = t("selectHint");
      byId("statusBadge").classList.remove("visible");
      return;
    }
    byId("appTitle").textContent = appName(app);
    const key = statusKey(app.status);
    byId("statusBadge").textContent = t(key);
    byId("statusBadge").classList.add("visible");
    const workspaceName = app.workspace_name || "";
    const current = localized(app.developer_activity?.current_i18n, app.developer_activity?.current || "");
    byId("phaseText").textContent = current || `${t("statusPrefix")}: ${t(key)}${workspaceName ? ` · ${t("workspacePrefix")}: ${workspaceName}` : ""}`;
    renderMessages();
    renderTrial();
  }

  function renderMessages() {
    const stream = byId("chatStream");
    const messages = Array.isArray(state.detail?.messages) ? state.detail.messages : [];
    stream.replaceChildren();
    const visible = messages.filter((item) => localized(item?.body_i18n, item?.body || item?.text || "").trim());
    if (!visible.length) {
      const empty = document.createElement("p");
      empty.className = "messages-empty";
      empty.textContent = t("noMessages");
      stream.append(empty);
      return;
    }
    for (const item of visible) {
      const inbound = String(item.direction || "").toLowerCase() === "inbound";
      const article = document.createElement("article");
      article.className = `message ${inbound ? "inbound" : "outbound"}`;
      const meta = document.createElement("div");
      const bubble = document.createElement("div");
      meta.className = "message-meta";
      bubble.className = "bubble";
      const time = item.at || item.created_at;
      let formatted = "";
      if (time) {
        const date = new Date(time);
        if (!Number.isNaN(date.valueOf())) formatted = new Intl.DateTimeFormat(state.locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
      }
      meta.textContent = `${inbound ? t("you") : t("developer")}${formatted ? ` · ${formatted}` : ""}`;
      bubble.textContent = localized(item.body_i18n, item.body || item.text || "");
      article.append(meta, bubble);
      stream.append(article);
    }
    stream.scrollTop = stream.scrollHeight;
  }

  function previewEntry() {
    const twin = state.detail?.experience_twin || {};
    const direct = String(twin.entry || "").trim();
    if (direct) return direct;
    const views = Array.isArray(twin.views) ? twin.views : [];
    return String(views.find((view) => view?.entry)?.entry || views.find((view) => view?.url)?.url || "");
  }

  function renderTrial(force = false) {
    const frame = byId("previewFrame");
    const empty = byId("previewEmpty");
    const entry = previewEntry();
    if (!entry) {
      frame.hidden = true;
      frame.removeAttribute("src");
      empty.hidden = false;
      byId("trialSummary").textContent = t("trialWaiting");
      return;
    }
    const url = new URL(entry, window.location.href).href;
    if (force || frame.src !== url) frame.src = url;
    frame.hidden = false;
    empty.hidden = true;
    byId("trialSummary").textContent = t("trialReady");
  }

  function setTab(tab) {
    state.tab = ["develop", "trial", "publish"].includes(tab) ? tab : "develop";
    document.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === state.tab));
    renderCurrent();
  }

  function updateCodingAgentOptions() {
    const agents = state.system?.coding_agents || {};
    for (const name of ["codex", "claude"]) {
      const input = document.querySelector(`input[name="codingAgent"][value="${name}"]`);
      const installed = Boolean(agents[name]?.installed);
      input.disabled = !installed;
      byId(`${name}Status`).textContent = installed ? t("installed") : t("notInstalled");
    }
    const selected = document.querySelector('input[name="codingAgent"]:checked');
    if (!selected || selected.disabled) {
      const available = document.querySelector('input[name="codingAgent"]:not(:disabled)');
      if (available) available.checked = true;
    }
  }

  function openCreate() {
    byId("createError").hidden = true;
    updateCodingAgentOptions();
    if (!byId("workspaceInput").value) byId("workspaceInput").value = state.system?.workspace_root || state.system?.workspace || "";
    byId("createDialog").showModal();
  }

  async function createApp(event) {
    event.preventDefault();
    const button = byId("createSubmitButton");
    const errorBox = byId("createError");
    const coding = document.querySelector('input[name="codingAgent"]:checked:not(:disabled)');
    if (!coding) {
      errorBox.textContent = t("codingAgentRequired");
      errorBox.hidden = false;
      return;
    }
    const workspace = byId("workspaceInput").value.trim();
    if (!workspace) {
      errorBox.textContent = t("workspaceRequired");
      errorBox.hidden = false;
      return;
    }
    button.disabled = true;
    button.textContent = t("createInProgress");
    errorBox.hidden = true;
    try {
      const detail = await request(`${API}/apps`, {
        method: "POST",
        body: {
          audience: byId("audienceInput").value.trim(),
          app_type: byId("appTypeInput").value.trim(),
          needs: byId("needsInput").value.trim(),
          coding_agent: coding.value,
          workspace,
          locale: state.locale,
        },
      });
      const runId = detail?.state?.run_id;
      byId("createDialog").close();
      byId("createForm").reset();
      if (state.system?.workspace_root) byId("workspaceInput").value = state.system.workspace_root;
      await loadApps(runId);
    } catch (error) {
      errorBox.textContent = error.message || t("unknownError");
      errorBox.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = t("create");
    }
  }

  async function sendMessage(event, source, successKey) {
    event.preventDefault();
    if (!state.currentId) return;
    const input = byId(source);
    const body = input.value.trim();
    if (!body) return;
    const submit = event.submitter;
    if (submit) submit.disabled = true;
    try {
      await request(`${API}/apps/${encodeURIComponent(state.currentId)}/messages`, {
        method: "POST",
        body: {
          text: body,
          channel: "main",
          mention_target: "developer",
          locale: state.locale,
          client_request_id: crypto.randomUUID ? crypto.randomUUID() : `web-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        },
      });
      input.value = "";
      showToast(t(successKey));
      await refreshCurrent(false);
    } catch (error) {
      showToast(error.message || t("unknownError"));
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  async function switchLocale() {
    state.locale = state.locale === "en" ? "zh-CN" : "en";
    try { localStorage.setItem("applooper.locale", state.locale); } catch { /* optional */ }
    applyLocale();
    if (state.currentId) {
      request(`${API}/apps/${encodeURIComponent(state.currentId)}/ui-locale`, { method: "POST", body: { locale: state.locale } }).catch(() => undefined);
    }
  }

  function bindEvents() {
    byId("accessRetryButton").addEventListener("click", () => void verifyAccess());
    byId("accessForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const errorBox = byId("accessError");
      const code = byId("accessCodeInput").value.trim();
      errorBox.hidden = true;
      try {
        await request(`${API}/access/verify`, { method: "POST", body: { code, device_name: navigator.userAgent.slice(0, 120) } });
        await verifyAccess();
      } catch (error) {
        errorBox.textContent = error.message || t("unknownError");
        errorBox.hidden = false;
      }
    });
    for (const id of ["openCreateButton", "emptyCreateButton"]) byId(id).addEventListener("click", openCreate);
    byId("closeCreateButton").addEventListener("click", () => byId("createDialog").close());
    byId("cancelCreateButton").addEventListener("click", () => byId("createDialog").close());
    byId("createForm").addEventListener("submit", createApp);
    byId("composer").addEventListener("submit", (event) => void sendMessage(event, "messageInput", "messageSent"));
    byId("trialFeedbackForm").addEventListener("submit", (event) => void sendMessage(event, "trialFeedbackInput", "feedbackSent"));
    byId("refreshButton").addEventListener("click", () => void refreshCurrent(true));
    byId("reloadPreviewButton").addEventListener("click", () => renderTrial(true));
    byId("downloadSourceExportButton").addEventListener("click", () => {
      if (state.currentId) window.location.assign(`${API}/apps/${encodeURIComponent(state.currentId)}/source-export`);
    });
    byId("languageButton").addEventListener("click", () => void switchLocale());
    byId("openAppsButton").addEventListener("click", () => byId("appsPanel").classList.toggle("open"));
    document.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));
    window.addEventListener("online", () => setConnection(true));
    window.addEventListener("offline", () => setConnection(false));
  }

  applyLocale();
  bindEvents();
  void verifyAccess();
})();
