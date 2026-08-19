(() => {
  "use strict";

  const API_ROOT = "/api";
  const DETAIL_REFRESH_MS = 5_000;
  const DEVELOPMENT_REFRESH_MS = 2_500;
  const LIST_REFRESH_MS = 30_000;
  const ACCESS_BOOT_TIMEOUT_MS = 45_000;
  const ACCESS_BOOT_ATTEMPTS = 6;
  const ACCESS_BOOT_ATTEMPT_TIMEOUT_MS = 15_000;
  const ACCESS_RECONNECT_INTERVAL_MS = 3_000;
  const ACCESS_SESSION_OK_KEY = "applooper-access-session-ok";
  const APP_LIST_BOOT_TIMEOUT_MS = 12_000;
  const DEVELOPMENT_BOOT_TIMEOUT_MS = 18_000;
  const MESSAGE_REQUEST_TIMEOUT_MS = 12_000;
  const RESUME_REQUEST_TIMEOUT_MS = 8_000;
  const RESUME_CONFIRM_TIMEOUT_MS = 15_000;
  const RESUME_PENDING_STALE_MS = 120_000;
  const UPLOAD_REQUEST_TIMEOUT_MS = 120_000;
  const REPOSITORY_COMMIT_GENERATE_TIMEOUT_MS = 200_000;
  const NOTIFICATION_REQUEST_TIMEOUT_MS = 12_000;
  const OPERATIONS_SKILL_GENERATE_REQUEST_TIMEOUT_MS = 15_000;
  const OPERATIONS_SKILL_GENERATE_POLL_MS = 2_500;
  const OPERATIONS_SKILL_GENERATE_MAX_WAIT_MS = 600_000;
  const NOTIFICATION_PERMISSION_TIMEOUT_MS = 30_000;
  const SERVICE_WORKER_VERSION = "209";
  const REMOTE_TRIAL_SESSION_TIMEOUT_MS = 45_000;
  const RELEASE_VERIFY_MIN_OPERATIONS = 2;
  const RELEASE_VERIFY_MIN_DWELL_MS = 20_000;
  const AGENT_AVATAR_ROOT = "./vendor/agent-avatars";
  const AGENT_AVATAR_SOURCES = Object.freeze({
    developer: `${AGENT_AVATAR_ROOT}/development.png`,
    "internal-test": `${AGENT_AVATAR_ROOT}/internal-test.png`,
    "owner-intent": `${AGENT_AVATAR_ROOT}/owner-intent.png`,
    "virtual-user-office": `${AGENT_AVATAR_ROOT}/virtual-user-office.png`,
    "virtual-user-student": `${AGENT_AVATAR_ROOT}/virtual-user-student.png`,
  });
  const CODING_AGENT_IDS = ["codex", "claude"];
  const EXPERIENCE_ACTORS = new Set(["experience", "persona"]);
  const LANGUAGE_STORAGE_KEY = window.AppLooperI18n?.storageKey || "applooper.locale";
  const TAB_READ_STORAGE_KEY = "applooper-tab-read-v1";
  const CONVERSATION_TAB_STORAGE_KEY = "applooper-conversation-tab-v1";
  const AUTO_LAUNCH_STORAGE_KEY = "applooper-auto-launch-v1";
  const GROWTH_TOOLS_STORAGE_KEY = "applooper-growth-tools-open-v1";
  const GIT_SHORTCUTS_STORAGE_KEY = "applooper-git-shortcuts-v1";
  const GIT_SYNC_WORKFLOW_STORAGE_KEY = "applooper-git-sync-workflow-v1";
  const REPOSITORY_DIALOG_SESSION_KEY = "applooper-repository-dialog-v1";
  const GIT_SHORTCUTS_MAX = 12;
  const DEVELOPMENT_CACHE_PREFIX = "applooper-development-cache-v4:";
  const EXPERIENCE_SURFACE_PRESETS = {
    desktop_web: { surface: "desktop_web", platform: "Windows 11 / Chrome", deviceName: "Desktop browser", width: 1440, height: 900, runtimeProvider: "builtin_browser" },
    mobile_web: { surface: "mobile_web", platform: "Android / Chrome", deviceName: "Pixel 8", width: 390, height: 844, runtimeProvider: "builtin_browser" },
    linux_app: { surface: "linux_app", platform: "Linux", deviceName: "Linux isolated display", width: 1280, height: 800, runtimeProvider: "docker_xvfb" },
    android_app: { surface: "android_app", platform: "Android", deviceName: "Pixel 8", width: 412, height: 915, runtimeProvider: "host_adapter" },
    wear_os: { surface: "wear_os", platform: "Wear OS", deviceName: "Wear OS watch", width: 400, height: 400, runtimeProvider: "host_adapter" },
    windows_app: { surface: "windows_app", platform: "Windows 11", deviceName: "Windows application", width: 1280, height: 800, runtimeProvider: "host_adapter" },
    custom: { surface: "other", platform: "", deviceName: "", width: 1280, height: 800, runtimeProvider: "host_adapter" },
  };

  function requiresExplicitStudyWorkflowChoice() { return false; }
  function usesDirectDeveloperStudyConversation() { return true; }
  function studyHideProjectManagerAgent() { return true; }
  function studyShowRepositoryManagement() { return false; }
  function usesAppLooperStudyTreatment() { return true; }

  function participantFacingReviewTitle(value) {
    const original = String(value || "").trim();
    if (!original || !usesDirectDeveloperStudyConversation()) return original;
    const cleaned = original
      .replace(/\bP[0-3]\b/gi, " ")
      .replace(/含\s*P[0-3]/gi, " ")
      .replace(/快速闭环/g, " ")
      .replace(/端口验证/g, " ")
      .replace(/无凭据/g, " ")
      .replace(/no[ -]?credentials?/gi, " ")
      .replace(/manifest[ -]?only(?:\s*AI)?/gi, " ")
      .replace(/\b(?:candidate|feedback|scenario|virtual_replay):[^\s·]+/gi, " ")
      .replace(/\s+/g, " ")
      .replace(/[、,;；]{2,}/g, "、")
      .replace(/^[、,;；\s]+|[、,;；\s]+$/g, "")
      .trim();
    return cleaned || original;
  }

  function clearExplicitStudyWorkflowChoice() {
    try {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("study_choose")) return;
      url.searchParams.delete("study_choose");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // URL cleanup is optional; the selected workflow remains usable.
    }
  }

  const TRANSLATIONS = {
    "zh-CN": {
      "meta.title": "AppLooper",
      "meta.description": "集中查看应用开发进度、体验反馈并与研发智能体沟通。",
      "release.brief_who": "谁遇到了什么",
      "release.brief_screenshot": "界面截图",
      "release.brief_change": "本版本怎么改",
      "release.brief_check": "您现在只需检查什么",
      "release.brief_no_screenshot": "本条发现没有可展示的界面截图；请以可执行试用窗口为准。",
      "release.evidence_disclosure": "完整证据与技术日志（可展开）",
      "release.blocking_badge": "P0 阻止放行",
      "a11y.skip_to_chat": "跳到与研发智能体的对话",
      "brand.name": "AppLooper",
      "brand.tagline": "开始构建你的应用",
      "icon.developer": "研",
      "icon.operations": "营",
      "icon.project_manager": "管",
      "icon.version": "版",
      "icon.launch": "上",
      "icon.feedback": "馈",
      "icon.analytics": "数",
      "icon.traffic": "流",
      "language.label": "界面语言",
      "language.zh_long": "中文",
      "language.zh_short": "中",
      "language.en_short": "EN",
      "notification.title": "研发智能体新消息通知",
      "notification.copy": "关闭页面后也可收到研发进展",
      "notification.action": "消息通知",
      "notification.composer_action": "开启研发提醒",
      "notification.composer_disable_action": "取消通知",
      "notification.install_action": "添加到主屏幕后开启提醒",
      "notification.ios_version": "这台 iPhone 需要 iOS 16.4 或更高版本，并从主屏幕图标打开 AppLooper，才能接收系统通知。",
      "notification.setup_once": "只需设置一次，约 10 秒",
      "notification.activity_state": "通知：{state}",
      "notification.toggle_aria": "研发消息通知开关",
      "notification.off": "关闭",
      "notification.on": "已开启",
      "notification.checking": "检查中",
      "notification.enabling": "开启中",
      "notification.disabling": "关闭中",
      "notification.ios_install": "iPhone 需先添加到主屏幕；点“开启研发提醒”查看 10 秒指引。",
      "notification.unsupported": "此浏览器暂不支持后台通知。",
      "notification.denied": "通知权限已被系统关闭，请在系统设置中允许此工作台发送通知。",
      "notification.unavailable": "电脑端通知服务暂不可用，请确认依赖已安装并重启网页服务。",
      "notification.paired_required": "请在已配对的手机上开启或关闭通知。",
      "notification.enabled": "研发智能体新消息通知已开启。",
      "notification.test_accepted": "测试通知已由 Apple/浏览器推送服务接收，请查看手机通知中心。",
      "notification.test_apple_accepted": "Apple 推送服务已接收测试通知，请查看手机通知中心。",
      "notification.test_browser_accepted": "浏览器推送服务已接收测试通知，请查看手机通知中心。",
      "notification.apple_accepted": "Apple 推送服务已接收最近一次通知。",
      "notification.browser_accepted": "浏览器推送服务已接收最近一次通知。",
      "notification.test_failed": "测试通知发送失败；通知订阅已保留，可稍后重试。",
      "notification.delivery_failed": "最近一次推送失败，请关闭通知后重新开启。",
      "notification.disabled": "研发智能体新消息通知已关闭。",
      "notification.enable_failed": "通知未能开启，请稍后重试。",
      "notification.disable_failed": "通知未能关闭，请稍后重试。",
      "notification.request_timeout": "连接通知服务超时，请检查电脑网络和工作流服务后重试。",
      "notification.permission_not_granted": "系统没有授予通知权限；请在系统设置中允许 AppLooper 通知后重试。",
      "notification.new_message": "研发智能体发来新消息：{message}",
      "notification.new_messages": "研发智能体发来 {count} 条新消息，最新一条：{message}",
      "notification.message_fallback": "打开“研发”查看最新进展。",
      "common.wait": "请稍等片刻。",
      "common.cancel": "取消",
      "common.done": "完成",
      "common.retry": "重新加载",
      "common.failed": "操作未能完成，请稍后重试。",
      "common.request_timeout": "连接等待时间过长，请重新加载。",
      "common.network_error": "无法连接工作流服务，请检查网络后重试。",
      "common.request_cancelled": "请求已取消。",
      "common.api_failed": "请求未能完成：{message}",
      "common.api_failed_code": "请求未能完成（错误代码 {status}）。",
      "access.connecting_title": "AppLooper正在加载中…",
      "access.gate_aria": "访问 AppLooper",
      "access.first_connection": "首次连接",
      "access.connect_title": "连接你的电脑",
      "access.help": "建议先把此页添加到主屏幕，再从桌面图标打开并输入电脑显示的 6 位配对码。",
      "access.code_label": "6 位配对码",
      "access.connect_button": "连接电脑",
      "access.connecting_button": "正在连接…",
      "access.opening": "正在打开…",
      "access.footnote": "配对码 5 分钟内有效。连接成功后，这台手机 90 天内无需重复登录。",
      "access.success_title": "连接成功",
      "access.success_copy": "连接已保存 90 天。要在退出页面后收到研发提醒，再完成下面两步。",
      "access.install_step_share": "点击 Safari 右下角“…”；如果看到了“分享”图标，也可直接点击",
      "access.install_step_home": "选择“分享”→“添加到主屏幕”，再从桌面打开 AppLooper",
      "access.enter": "进入工作台",
      "access.unavailable_title": "暂时无法连接电脑",
      "access.unavailable_copy": "请确认电脑在线且网页服务仍在运行。",
      "access.reconnecting_title": "正在重新连接…",
      "access.reconnecting_copy": "电脑服务短暂不可达，AppLooper 会自动重试。",
      "access.retry": "重新连接",
      "access.code_incomplete": "请输入完整的 6 位配对码。",
      "access.too_many": "尝试次数过多，请稍后再试。",
      "access.expired": "配对码已过期，请在电脑上点击“刷新配对码”。",
      "access.invalid": "配对码不正确，请查看电脑上显示的号码。",
      "access.failed": "暂时无法连接这台电脑，请检查网络后重试。",
      "access.session_expired": "当前手机的会话已失效，请重新输入电脑显示的配对码。",
      "connection.offline_banner": "当前处于离线状态，已加载的内容仍可查看。",
      "connection.connecting": "正在连接",
      "connection.connected": "服务已连接",
      "connection.interrupted": "连接暂时中断",
      "connection.device_offline": "设备已离线",
      "coding.none_warning": "未检测到可用的本地 Coding 软件，请安装 Codex 或 Claude Code 后刷新",
      "coding.none_dialog_warning": "未检测到可用的本地 Coding 软件，请先安装 Codex 或 Claude Code 并刷新页面。",
      "coding.checking": "正在检测",
      "coding.cli_unavailable": "命令行不可用",
      "coding.not_installed": "未安装",
      "coding.available": "可用",
      "coding.unknown": "状态未知",
      "coding.install_first": "请先安装 Codex 或 Claude Code，然后刷新页面",
      "coding.choose_available": "请选择一个可用的本地 Coding 软件",
      "coding.checking_environment": "正在检查系统环境",
      "apps.mine": "我的应用",
      "apps.new": "新建",
      "apps.select": "选择一个应用",
      "apps.create_first": "创建第一个应用",
      "apps.empty_title": "还没有应用",
      "apps.generic": "应用",
      "apps.empty_copy": "从一个清晰的目标开始",
      "apps.loading": "正在加载应用",
      "apps.loading_one": "正在加载",
      "apps.reload": "重新加载",
      "apps.load_failed": "暂时无法加载",
      "apps.unnamed": "未命名应用",
      "apps.list_failed": "无法加载应用列表，请稍后重试。",
      "apps.detail_failed": "无法加载这个应用，请稍后重试。",
      "apps.workflow_loading": "正在加载工作流",
      "apps.almost_ready": "很快就好。",
      "apps.open_failed": "无法打开这个应用",
      "install.device": "安装到设备",
      "install.home": "添加到主屏幕",
      "install.phone": "手机使用",
      "install.installed": "AppLooper 已安装到设备。",
      "install.ios_hint": "在 Safari 中点击“分享”，再选择“添加到主屏幕”。",
      "install.browser_hint": "请打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。",
      "install.mobile_tip": "小提示：打开浏览器菜单或“分享”，选择“添加到主屏幕”，以后可从桌面打开 AppLooper。",
      "install.mobile_tip_action": "查看步骤",
      "install.mobile_tip_close": "关闭添加到主屏幕提示",
      "ios_guide.kicker": "iPhone · 只需设置一次",
      "ios_guide.title": "开启研发消息提醒",
      "ios_guide.close": "关闭开启提醒指引",
      "ios_guide.intro": "这是 iPhone 的系统要求，约 10 秒；不会重新登录，也不用重新配对。",
      "ios_guide.step_menu_title": "点 Safari 右下角“…”",
      "ios_guide.step_menu_copy": "如果你直接看到了“分享”图标，点它也可以。",
      "ios_guide.step_home_title": "点“分享”→“添加到主屏幕”",
      "ios_guide.step_home_copy": "按右上角“添加”完成。",
      "ios_guide.step_open_title": "从桌面打开 AppLooper",
      "ios_guide.step_open_copy": "回到这里点“开启研发提醒”，系统会询问是否允许通知。",
      "ios_guide.later": "暂不开启",
      "ios_guide.done": "知道了",
      "nav.other_apps": "切换",
      "nav.home": "AppLooper 首页",
      "nav.close_apps": "关闭应用列表",
      "nav.open_other_apps": "切换应用",
      "nav.agents": "智能体",
      "nav.open_agents": "打开智能体",
      "twin.open": "试用",
      "twin.open_short": "试用",
      "twin.tab_hint": "远程操作",
      "validation.tab": "试用",
      "validation.tab_hint": "验证与反馈",
      "validation.records": "查看内测记录",
      "validation.preparing_title": "验证环境正在准备中",
      "validation.preparing_copy": "研发完成当前步骤后，即可在这里试用；内测记录仍可随时查看。",
      "validation.text_only_copy": "当前流程采用文字证据验证；内测记录仍可随时查看。",
      "twin.back": "返回对话",
      "twin.title": "远程试用",
      "twin.subtitle": "选择应用形态后，直接远程操作电脑上的真实运行环境",
      "twin.sandbox_title": "我要试用",
      "twin.sandbox_expand": "跳转到要试用的功能",
      "twin.sandbox_copy": "说明你要试用的功能，系统会先准备临时状态并跳转到对应界面。",
      "twin.sandbox_label": "我要试用的功能",
      "twin.sandbox_placeholder": "例如：我要试用一句话记录功能",
      "twin.sandbox_configure": "跳转",
      "twin.sandbox_configuring": "正在准备并跳转…",
      "twin.sandbox_connecting_jump": "正在连接试用窗口并跳转…",
      "twin.sandbox_ready": "已跳转到“{label}”，可直接在当前试用窗口操作。",
      "twin.sandbox_not_ready": "试用窗口还没准备好，已尝试在当前窗口跳转。这不是给研发的需求。",
      "twin.sandbox_wait_preview": "正在连接试用窗口，连接完成后会自动跳转。",
      "twin.sandbox_busy": "应用正在更新，请稍后再跳转。",
      "twin.sandbox_missing_target": "当前应用里还没有这个界面，所以没法跳转。请在现有页面里查找，或等研发完成后再试。",
      "twin.sandbox_failed": "跳转失败，请重试。",
      "twin.feedback_title": "向研发智能体描述需要优化的点",
      "twin.feedback_expand": "描述需要优化的点",
      "twin.feedback_copy": "清楚说明哪里需要优化，研发智能体会继续处理。",
      "twin.feedback_placeholder": "例如：搜索结果不够清晰，希望突出匹配内容",
      "twin.feedback_send": "发送给研发智能体",
      "twin.feedback_hint": "",
      "twin.feedback_sending": "正在发送给研发智能体…",
      "twin.feedback_sent": "需要优化的点已发送给研发智能体。",
      "twin.feedback_failed": "发送失败，请重试。",
      "twin.shared": "统一远程会话",
      "twin.views_aria": "选择试用形态和设备",
      "twin.scale_aria": "远程画面缩放方式",
      "twin.fit": "适应窗口",
      "twin.actual": "原始尺寸",
      "twin.fullscreen_enter": "全屏呈现",
      "twin.fullscreen_exit": "退出全屏",
      "twin.fullscreen_unavailable": "当前浏览器不支持全屏呈现",
      "twin.reload": "重新连接",
      "twin.new_window": "在新窗口打开",
      "twin.keyboard_open": "键盘",
      "twin.keyboard_close": "收起",
      "twin.keyboard_placeholder": "点这里输入，内容会直接出现在试用窗口",
      "twin.keyboard_input_aria": "输入中文或英文到试用窗口",
      "twin.ime_badge": "中 / EN",
      "twin.ime_drag_title": "拖动可移开输入条；双击复位",
      "twin.ime_placeholder": "先点选试用窗口中的输入框，再在这里输入中文或 English",
      "twin.ime_send": "输入",
      "twin.ime_sent": "已输入到试用窗口",
      "twin.ime_target_hint": "请先点选试用窗口中的输入框",
      "twin.keyboard_backspace": "退格",
      "twin.keyboard_enter": "回车",
      "twin.stop": "结束试用",
      "twin.loading": "正在读取可试用环境",
      "twin.empty_title": "还没有可远程试用的应用形态",
      "twin.empty_copy": "当前应用尚未配置远程运行环境，请先在 {agent} 中运行或补充应用形态。",
      "twin.error_title": "远程试用暂时不可用",
      "twin.error_copy": "没有改变你的项目文件；可重试，或回到 {agent} 继续运行和验证。",
      "twin.retry": "重试连接",
      "twin.return_agent": "返回 {agent} 端体验",
      "twin.responsive": "响应式",
      "twin.viewport": "{width} × {height}",
      "twin.iframe_title": "{label} 体验视图",
      "twin.frame_loading": "正在连接 {label}",
      "twin.frame_handshake_ready": "连接成功，正在加载应用画面…",
      "twin.frame_reconnecting": "应用画面尚未到达，正在重试（{attempt}/3）…",
      "twin.frame_reconnect_exhausted": "应用画面连续 3 次未加载成功，请点击重新连接。",
      "twin.preview_loading": "AppLooper 正在加载中…",
      "twin.preview_failed": "体验页面暂时无法加载，请点刷新后重试。",
      "twin.preview_timeout": "体验页面加载超时，请点刷新后重试。",
      "twin.web_ready_title": "网页已可直接试用",
      "twin.web_ready_copy": "网页形态无需启动模拟器；可直接点击、输入和切换页面。",
      "twin.remote_browser_title": "正在通过电脑浏览器安全试用",
      "twin.remote_browser_copy": "这个网页可能需要脚本或后端服务；如果需要登录，只能使用合成测试账号。AppLooper 会在专属隔离浏览器窗口中运行它，并只显示当前应用。",
      "twin.synthetic_only_notice": "本试用仅可使用 AppLooper 生成或合成的数据。禁止输入真实密码、API 密钥、电话号码、电子邮箱、支付信息或账户凭据。",
      "twin.synthetic_only_dismiss": "关闭此提示",
      "twin.available_views": "{count} 种可试用形态",
      "twin.reconnecting": "正在重新连接远程环境",
      "twin.reconnecting_copy": "连接恢复后会自动显示可操作画面。",
      "twin.expired_title": "远程会话已结束",
      "twin.expired_copy": "这次试用连接已失效，重新连接即可继续。",
      "twin.history_for": "{label}变更历史",
      "twin.history_count": "{count} 条",
      "twin.history_empty": "这个应用形态还没有变更记录",
      "twin.local_web_title": "本地 Web 试用路径",
      "twin.local_web_copy": "在这台电脑的浏览器中直接打开；地址由 AppLooper 安全转发，不会暴露项目服务端口。",
      "twin.local_open": "打开本地网页",
      "twin.local_copy_url": "复制地址",
      "twin.local_copied": "本地试用地址已复制。",
      "twin.local_package_title": "手机端试用文件",
      "twin.local_package_copy": "已生成可下载的安装文件，可传到对应设备完成真机试用。",
      "twin.local_package_missing_title": "手机安装包尚未生成",
      "twin.local_package_missing_copy": "研发智能体完成可安装文件并验证后，下载按钮会自动出现在这里。",
      "twin.local_download": "下载执行文件",
      "twin.local_same_wifi": "手机与这台电脑必须连接同一 Wi‑Fi 才能打开本地服务；如需在手机上直接下载，请先通过“手机使用”完成配对。",
      "twin.local_unavailable": "本地试用入口尚未通过验证，请让研发智能体重新生成并检查产物。",
      "twin.behavior_preview_title": "行为快速体验",
      "twin.behavior_preview_copy": "这里用于快速核对跨端流程，并非原生系统界面。安装包、系统组件和像素级效果请在真机或本地开发端核对。",
      "twin.view.desktop_web": "电脑网页端",
      "twin.view.mobile_web": "手机网页端",
      "twin.view.mobile_app": "手机应用",
      "twin.view.mobile_app_behavior": "手机应用·行为预览",
      "twin.view.watch_app": "手表应用",
      "twin.view.watch_app_behavior": "手表应用·行为预览",
      "twin.view.tablet_web": "平板网页端",
      "twin.view.tablet_app": "平板应用",
      "twin.view.tablet_app_behavior": "平板应用·行为预览",
      "twin.view.desktop_app": "电脑应用",
      "twin.view.desktop_app_behavior": "电脑应用·行为预览",
      "twin.view.other": "其他形态",
      "twin.view.responsive": "自适应网页",
      "twin.view.unknown": "视图 {index}",
      "twin.platform.web": "Web",
      "twin.platform.desktop_browser": "电脑浏览器",
      "twin.platform.mobile_browser": "手机浏览器",
      "twin.platform.tablet_browser": "平板浏览器",
      "twin.platform.mobile_unknown": "系统待确认",
      "twin.platform.device_unknown": "设备型号待确认",
      "twin.platform.watch_unknown": "系统待确认",
      "twin.platform.tablet_unknown": "系统待确认",
      "twin.platform.desktop_unknown": "系统待确认",
      "twin.remote_connecting_title": "正在连接隔离试用窗口",
      "twin.remote_connecting_copy": "正在连接当前应用形态的专属画面；不会读取整台电脑桌面。",
      "twin.remote_preparing_title": "正在准备试用环境",
      "twin.remote_preparing_copy": "AppLooper 正在启动所选应用和对应的运行环境。",
      "twin.remote_idle_title": "试用窗口尚未启动",
      "twin.remote_idle_copy": "点击“开始试用”即可启动当前应用的隔离试用窗口。",
      "twin.remote_preparation_timeout_title": "试用环境启动超时",
      "twin.remote_preparation_timeout_copy": "启动没有在预期时间内完成。请点击重试；系统不会继续显示无期限的准备状态。",
      "twin.remote_waiting_bridge_title": "等待运行环境提供远程画面",
      "twin.remote_waiting_bridge_copy": "对应的专属模拟器或应用窗口尚未启动。准备完成后会自动连接；不会改为共享电脑桌面。",
      "twin.remote_start_display": "在电脑上启动画面",
      "twin.remote_starting_display": "正在让电脑启动画面…",
      "twin.remote_start_display_failed": "电脑未能启动画面服务，请查看提示后重试。",
      "twin.remote_display_install_title": "电脑缺少画面服务",
      "twin.remote_display_install_action": "查看安装方案",
      "twin.remote_display_install_message": "我同意在这台电脑上安装并配置受支持的 VNC 画面服务，用于当前应用的远程试用。请先说明将安装什么，并在执行安装前再次向我确认。",
      "twin.remote_display_install_sent": "安装方案已准备好，请核对后再次确认。",
      "twin.remote_install_confirm_title": "再次确认安装应用形态适配器",
      "twin.remote_install_confirm_copy": "只会安装并启动当前应用形态所需的隔离适配器，不会共享整台电脑桌面。",
      "twin.remote_install_final_action": "确认并开始安装",
      "twin.remote_install_cancel_action": "暂不安装",
      "twin.remote_installing_title": "正在安装应用形态适配器",
      "twin.remote_installing_copy": "正在准备当前模拟器或应用窗口的隔离画面；离开页面后再回来仍可查看进度。",
      "twin.remote_configuring_title": "正在配置安全连接",
      "twin.remote_configuring_copy": "正在限制为本机回环连接，并接入 AppLooper 的已配对远程通道。",
      "twin.remote_install_error_title": "应用形态适配器安装未完成",
      "twin.remote_install_retry_action": "重新查看并安装",
      "twin.remote_missing_title": "电脑缺少所需模拟器",
      "twin.remote_missing_copy": "要试用 {surface}，需要先安装：{runtimes}。安装前必须得到你的同意。",
      "twin.remote_waiting_install_title": "等待你同意安装",
      "twin.remote_waiting_install_copy": "同意后会记录允许在这台电脑安装 {runtimes}，并交给研发智能体处理。",
      "twin.remote_install_action": "同意安装",
      "twin.remote_install_decline": "暂不安装",
      "twin.remote_surface_adapter_label": "应用形态适配器",
      "twin.remote_start": "开始试用",
      "twin.remote_ready_title": "远程试用已连接",
      "twin.remote_ready_copy": "这里只显示并操作当前应用形态；不会共享电脑桌面，也不会控制你的真实鼠标和键盘。",
      "twin.remote_unavailable_title": "这个形态暂时不能远程试用",
      "twin.remote_unavailable_copy": "当前电脑没有可用的运行环境；已自动开启 {agent} 配置会话。",
      "twin.surface_prep_starting": "正在开启配置会话…",
      "twin.surface_prep_configuring": "正在安装并配置试用环境",
      "twin.surface_prep_configuring_copy": "可通过下方「查看配置状态」实时查看 Claude Code / Codex 执行上下文。",
      "twin.surface_prep_view_status": "查看配置状态",
      "twin.surface_prep_start_failed": "暂时无法开启配置会话，请稍后重试。",
      "twin.remote_session_error": "远程环境没有成功启动",
      "twin.remote_session_error_copy": "你可以重试；如果仍然失败，请回到研发页查看研发智能体的提示。",
      "twin.remote_missing_unknown": "对应的模拟器",
      "twin.runtime.browser": "电脑浏览器",
      "twin.runtime.android_emulator": "Android 模拟器",
      "twin.runtime.wear_os_emulator": "Wear OS 模拟器",
      "twin.runtime.ios_simulator": "iOS 模拟器（需要 macOS）",
      "twin.runtime.watchos_simulator": "watchOS 模拟器（需要 macOS）",
      "twin.runtime.harmonyos_emulator": "HarmonyOS 模拟器",
      "twin.runtime.novnc": "noVNC 远程组件",
      "twin.remote_viewer_title": "{label} 隔离试用画面",
      "twin.remote_open_develop": "返回研发",
      "surface_add.action": "添加形态",
      "surface_add.kicker": "试用 · 新应用形态",
      "surface_add.title": "添加应用形态",
      "surface_add.close": "关闭添加应用形态",
      "surface_add.type": "应用形态",
      "surface_add.type_desktop_web": "电脑网页",
      "surface_add.type_mobile_web": "手机网页",
      "surface_add.type_linux_app": "Linux 应用",
      "surface_add.type_android_app": "Android 应用",
      "surface_add.type_wear_os": "Wear OS 应用",
      "surface_add.type_windows_app": "Windows 应用",
      "surface_add.type_custom": "自定义",
      "surface_add.name": "名称",
      "surface_add.name_placeholder": "例如：Pixel 8 手机应用",
      "surface_add.platform": "系统 / 浏览器",
      "surface_add.platform_placeholder": "例如：Android 15",
      "surface_add.device": "设备 / 环境",
      "surface_add.device_placeholder": "例如：Pixel 8",
      "surface_add.width": "宽度",
      "surface_add.height": "高度",
      "surface_add.route": "入口 route",
      "surface_add.route_placeholder": "例如：/ 或 /mobile",
      "surface_add.route_help": "只填写应用内入口路径，不要输入命令、密码或访问令牌。",
      "surface_add.agent": "准备环境的 Coding 软件",
      "surface_add.agent_help": "沿用这个应用当前选择的软件，不需要重复配置。",
      "surface_add.safety": "添加后研发智能体会先准备对应环境。安装模拟器、修改系统设置等高风险操作仍会在执行前再次向你确认。",
      "surface_add.submit": "添加形态",
      "surface_add.submitting": "正在添加…",
      "surface_add.waiting": "已添加，等待研发智能体准备环境。",
      "surface_add.route_invalid": "入口 route 必须是以 / 开头的应用内路径。",
      "surface_add.failed": "暂时无法添加这个应用形态，请稍后重试。",
      "conversation.main": "对话",
      "conversation.main_hint": "应用管理智能体统筹",
      "conversation.experience": "研发",
      "conversation.experience_count": "{count} 条",
      "conversation.developer_hint": "直接对话",
      "conversation.study_tabs_aria": "切换研发、试用和上线",
      "conversation.tabs_aria": "切换对话、研发、试用和上线",
      "conversation.main_aria": "你与应用管理智能体的对话",
      "intent.launch_go": "自验证已通过，建议可以上线",
      "intent.launch_hold": "建议先完成上线自验证再发布",
      "intent.checklist_title": "上线前自验证清单",
      "intent.open": "查看",
      "composer.mention_hint": "输入 @ 可直接找研发智能体或运营智能体；默认由应用管理智能体统筹",
      "conversation.experience_aria": "虚拟用户智能体组与真实用户反馈交流记录",
      "conversation.experience_title": "迭代交流",
      "conversation.experience_copy": "虚拟用户智能体组的试用记录与真实用户反馈在这里分层呈现；虚拟用户结果仅作为模拟证据。",
      "conversation.read_only": "只读记录",
      "conversation.beta_preparing_title": "正在准备本轮迭代验证",
      "conversation.beta_preparing_copy": "研发更新通过验收后，会先在这里说明更新点，再由虚拟用户智能体组进行小批量试用。",
      "conversation.beta_running_title": "本轮更新已发布，正在迭代验证",
      "conversation.beta_running_copy": "虚拟用户智能体组正在试用最新版本；真实用户反馈会分开呈现。",
      "conversation.in_progress": "进行中",
      "conversation.filter_aria": "按虚拟用户智能体筛选交流记录",
      "conversation.all": "全部",
      "conversation.preparing_title": "体验交流正在准备中",
      "conversation.preparing_copy": "虚拟用户智能体组生成并完成首轮体验后，问题和研发回复会出现在这里。",
      "conversation.empty_title": "还没有体验交流",
      "conversation.empty_copy": "虚拟用户智能体提出问题后，研发智能体的修复回复会按角色归档在这里。",
      "conversation.show_earlier": "查看更早的 {count} 条消息",
      "conversation.fix_reply_to": "修复回复 · {name}",
      "launch.tab": "发布",
      "launch.tab_hint": "版本与上线",
      "launch.unread": "{count} 条更新",
      "launch.auto_policy_label": "自动上线策略",
      "launch.auto_policy_title": "达到发布条件后自动推进",
      "launch.auto_policy_copy": "开启后，研发智能体会按上线 Skill 检查并准备发布；涉及付费、凭据或公开发布仍会先向你确认。",
      "launch.auto_policy_toggle": "启用自动上线",
      "launch.checklist_label": "上线向导",
      "launch.checklist_title": "按步骤完成版本发布",
      "launch.checklist_copy": "一次只处理一步；研发部署完成后，已识别环境会自动填入。",
      "launch.checklist_step_version": "形成可发布版本",
      "launch.checklist_step_version_hint": "新功能完成后登记版本说明与发布材料",
      "launch.checklist_action_version": "检查发布条件",
      "launch.history": "版本与发布记录",
      "release.review_label": "上线前审查",
      "release.review_title": "逐项确认后再发布",
      "release.review_copy": "这份清单只对应当前版本；请逐项确认核心功能。",
      "release.scenario_title": "场景已准备",
      "release.scenario_title_with_id": "场景已准备 · {scenario}",
      "release.scenario_interacted": "我已实际操作",
      "release.scenario_pass": "通过此场景",
      "release.scenario_return": "退回修改",
      "release.scenario_prepared_verified": "预置状态已验证",
      "release.scenario_prepared_unverified": "预置状态尚未验证",
      "release.scenario_cleanup": "清理：{status}",
      "release.snapshot_label": "返回验收时先看这里",
      "release.snapshot_title": "当前发布快照",
      "release.snapshot_verified": "已经验证",
      "release.snapshot_judgment": "仍需你判断",
      "release.snapshot_paths": "建议试用路径",
      "release.snapshot_provenance": "检查结果来自哪里及其局限",
      "release.snapshot_verified_count": "下方 {total} 项均对应当前版本；你已复核其中 {checked} 项。",
      "release.snapshot_judgment_copy": "实际流程是否符合你的目标、交互是否可接受，以及自动检查未覆盖的体验。",
      "release.snapshot_provenance_copy": "研发摘要、独立检查、自动测试与您的实际试用会分别呈现；任何一项显示“通过”都不代表应用完全正确。",
      "release.snapshot_no_paths": "从应用首页开始，按原始需求逐项试用核心路径。",
      "release.snapshot_scope_candidate": "本次确认只适用于当前版本；版本变化后需要重新验收。",
      "release.snapshot_scope_run": "本次确认适用于当前研发流程；上线前请确认页面仍是你刚刚检查的版本。",
      "release.section_version": "发布前自验清单",
      "release.section_feedback": "用户反馈",
      "release.gate_draft": "待审查",
      "release.gate_ready": "可上线",
      "release.gate_deferred": "已暂缓",
      "release.gate_released": "已发布",
      "release.attestation_label": "责任声明文本（开关打开后需完整输入）",
      "release.attestation_placeholder": "请完整输入上方声明文本",
      "release.attestation_optional_hint": "责任声明开关当前为关闭，确认上线时无需输入声明文本。",
      "release.attestation": "我确认已审查上述版本更新与用户反馈项，并承担对外发布责任。",
      "release.confirm": "我已确认，可以上线",
      "release.final_verdict_title": "我的最终判定",
      "release.final_verdict_hint": "请先给每一项自验证功能标记通过或不通过，再做最终判定。",
      "release.final_pass": "我认为已符合发布条件",
      "release.final_fail": "我认为暂不符合发布条件",
      "release.final_pass_done": "已记录：你认为当前版本符合发布条件",
      "release.final_fail_done": "已记录：你认为当前版本暂不符合发布条件",
      "release.final_confirm_title": "确认最终判定",
      "release.final_confirm_copy": "您确认选择下面这项吗？确认后无法修改。",
      "release.final_confirm_ok": "确认",
      "release.final_confirm_think": "我再想想",
      "release.final_confirm_countdown": "{n} 秒后可确认",
      "release.final_confirm_ready": "现在可以确认",
      "release.guide_me": "带我检查",
      "release.verify_prompt": "请按下面步骤验收「{title}」",
      "release.verify_done": "验证完毕",
      "release.verify_need_trial": "请先在试用窗口里实际操作至少两次，或停留超过 20 秒后再点验证完毕。",
      "release.verify_need_both_surfaces": "电脑网页端和手机网页端都要试用后再点验证完毕",
      "release.verify_surface_hint": "电脑端和手机端都要试用",
      "release.verify_verdict_kicker": "上线前审查",
      "release.verify_verdict_title": "这项功能是否验证通过？",
      "release.verify_pass": "通过",
      "release.verify_fail": "不通过",
      "release.verify_fail_note_label": "不通过时可填写意见（可选）",
      "release.verify_fail_note_placeholder": "可选：简述哪里不符合预期",
      "release.verdict_unverified": "尚未验证",
      "release.verdict_passed": "已验证通过",
      "release.verdict_failed": "已验证不通过",
      "release.platform_switch_off": "关闭",
      "release.platform_switch_on": "开启",
      "release.items_loading": "正在加载发布前自验清单，请稍候…",
      "release.defer": "暂不上线",
      "release.defer_done": "已记录暂缓上线",
      "release.confirm_done": "发布审查已完成，可以上线",
      "release.publish_community": "发布到研究测试社区",
      "release.publishing_community": "正在发布到研究测试社区…",
      "release.community_published": "已发布到研究测试社区",
      "release.community_publish_done": "应用已发布到研究测试社区，可供其他测试参与者体验",
      "release.item_guide": "试用",
      "release.owner_proxy_label": "所有者意图模拟智能体 · 非您本人",
      "release.owner_proxy_copy": "仅依据您明确确认的需求、约束和反馈进行只读复测；不推断未表达偏好，也不能确认发布。",
      "release.owner_proxy_bypassed": "已跳过智能体复测",
      "release.owner_proxy_bypass": "跳过此智能体复测",
      "release.preparation_fixture": "已准备测试夹具",
      "release.preparation_replay": "已准备界面回放",
      "release.preparation_fallback": "未预置 / 普通路径",
      "release.maintainer_title": "分层检查结果（非真实运营数据）",
      "release.maintainer_empty": "暂无测试维护结果",
      "release.maintainer_flaky": "flaky 未解决",
      "release.maintainer_quarantine": "quarantine 未解决",
      "release.maintainer_mutation": "mutation 未解决",
      "export.download": "下载应用包",
      "export.downloading": "正在打包…",
      "export.done": "应用包已开始下载",
      "export.failed": "无法导出应用包，请稍后重试",
      "export.need_app": "请先选择一个应用",
      "export.copy": "下载当前应用的源码压缩包。导出内容不含密钥。",
      "internal.analysis_title": "独立内部测试分析智能体",
      "internal.simulated_evidence_label": "模拟证据 · 非真实用户/运营指标",
      "internal.analysis_copy": "独立于研发智能体，负责归并可复现问题；不能修改应用或决定发布，也不将浏览或点击次数解释为兴趣。",
      "internal.layered_evidence_title": "分层测试证据（与真实运营数据分离）",
      "internal.raw_trails_summary": "展开原始模拟轨迹",
      "internal.changes": "P0/P1 / 版本变更",
      "internal.cohort": "虚拟用户智能体组覆盖",
      "internal.clusters": "问题聚类",
      "internal.personas": "受影响画像",
      "internal.replays": "修复与重放",
      "internal.no_evidence": "暂无模拟证据",
      "internal.no_trails": "暂无原始模拟轨迹",
      "internal.contract_missing": "未提供维护 contract",
      "internal.results": "结果: {value}",
      "internal.no_results": "暂无结果",
      "internal.risks": "隔离风险: {value}",
      "internal.no_risks": "无未解决 flaky/quarantine/mutation 状态",
      "owner_proxy.skipped_notice": "已跳过所有者意图模拟智能体复测；场景结论与最终发布确认仍需您本人完成。",
      "owner_proxy.skip_failed": "无法跳过所有者意图模拟智能体复测。",
      "owner_proxy.round": "第 {round} 轮",
      "owner_proxy.profile_basis": "复测依据：仅使用你已经明确表达的需求、约束和反馈。",
      "owner_proxy.profile_ready": "已根据现有信息准备复测；最终上线仍由你确认。",
      "owner_proxy.profile_waiting": "当前信息不足，智能体暂不判断；最终上线仍由你确认。",
      "owner_proxy.refs": "来源/证据: {value}",
      "owner_proxy.outcome": "结果: {value}",
      "owner_proxy.differences": "差异: {value}",
      "owner_proxy.risks": "未解决风险: {value}",
      "owner_proxy.none": "暂无所有者意图模拟智能体复测记录",
      "common.not_provided": "未提供",
      "common.no_record": "无记录",
      "release.deploy_blocked": "请先完成上线前审查清单并确认发布责任",
      "release.required_badge": "必填",
      "eufr.label": "用户反馈",
      "eufr.title": "用户反馈清单",
      "eufr.copy": "这里只记录用户主动说出来的问题与建议（应用内反馈、邮件、表单等），不含页面浏览等行为数据。",
      "eufr.empty": "还没有收到用户主动反馈",
      "eufr.empty_hint": "内测/Beta 阶段即可收集用户主动反馈；P0 问题会自动进入研发修复队列。",
      "eufr.guide_title": "用户声音从哪里来？",
      "eufr.guide_intro": "系统把三类信号分开处理，避免混淆：",
      "eufr.guide_track_feedback": "用户主动反馈 → 本清单（用于发布审查与跟进修复）",
      "eufr.guide_track_metrics": "真实用户数据 → 下方运营看板（趋势、留存、异常，仅聚合统计）",
      "eufr.guide_track_iteration": "虚拟用户试用 → 迭代页（研发验证用，不代表真实用户意见）",
      "eufr.guide_step_publish": "应用进入内测或 Beta 后即可收集真实用户反馈（不必等正式发布）",
      "eufr.guide_step_feedback_entry": "在应用内添加反馈入口（按钮、表单或支持邮箱）",
      "eufr.guide_step_analytics": "接入数据统计 Skill，看板会解释真实用户行为变化",
      "eufr.guide_step_agent": "不确定怎么接？让运营智能体按你的应用给具体方案",
      "eufr.ask_setup": "问如何收集用户反馈",
      "eufr.ask_setup_prompt": "请说明这个应用应如何对接真实用户并收集用户主动反馈（应用内入口、邮件或表单）。告诉我当前缺什么、推荐的最小方案，以及配置好后反馈会如何进入「用户反馈清单」。",
      "feedback.collection_title": "用户反馈收集",
      "feedback.skill_label": "用户反馈 Skill",
      "feedback.skill_default": "用户反馈 Skill",
      "feedback.ask_agent": "问运营智能体",
      "feedback.ask_agent_prompt": "请根据当前应用的用户反馈 Skill 和已识别收集路径，说明如何汇总最新用户反馈、跟进高优先级主题，以及还缺哪些配置。",
      "feedback.summary_empty": "暂无最新用户反馈总结",
      "feedback.theme_empty": "还没有收到用户反馈",
      "feedback.view_detail": "查看详情",
      "feedback.collection_copy": "来自工作区扫描；用户通过这些入口提交的反馈会进入下方清单。",
      "feedback.collection_empty": "尚未在工作区识别到反馈入口。可添加应用内表单、支持邮箱或第三方客服组件。",
      "feedback.collection_detected": "已识别",
      "feedback.collection_not_detected": "未识别",
      "feedback.collection_scanned_at": "扫描于 {time}",
      "feedback.kind.mailto": "邮箱链接",
      "feedback.kind.email": "支持邮箱",
      "feedback.kind.in_app_route": "应用内页面/表单",
      "feedback.kind.widget": "第三方客服/组件",
      "feedback.kind.external_form": "外部表单",
      "feedback.kind.api_route": "反馈 API",
      "feedback.kind.source_module": "反馈源码模块",
      "feedback.kind.conversation": "对话中确认",
      "feedback.path_source": "来源",
      "feedback.path_route": "路由",
      "feedback.path_destination": "去向",
      "eufr.drawer_close": "关闭",
      "eufr.raw_entries": "原始反馈",
      "eufr.resolution": "处理说明",
      "eufr.status.collected": "已收集",
      "eufr.status.acknowledged": "已确认",
      "eufr.status.in_progress": "处理中",
      "eufr.status.fixed_in_build": "版本已修复",
      "eufr.status.verified_in_release": "发布已验证",
      "eufr.status.closed": "已关闭",
      "eufr.status.wont_fix": "不修复",
      "eufr.status.deferred": "已延期",
      "growth.tab": "运营",
      "growth.tab_hint": "数据与智能体",
      "growth.unread": "{count} 条新消息",
      "growth.agent_copy": "它会接入真实用户数据、解释变化，并在需要你决定时主动提醒。",
      "growth.conversation_copy": "询问真实用户数据、异常或下一步运营动作。",
      "growth.conversation_placeholder": "问真实用户数据，或说明要如何统计和运营…",
      "growth.composer_target": "发送给运营智能体",
      "growth.composer_target_copy": "询问真实用户数据、异常或下一步运营动作",
      "growth.composer_target_aria": "当前消息发送对象：运营智能体",
      "growth.composer_hint": "消息只会发送给运营智能体 · Enter 发送",
      "growth.attach_title": "给运营智能体添加附件",
      "growth.tools_open": "数据与看板",
      "growth.tools_close_short": "收起",
      "growth.tools_close": "收起数据与看板",
      "growth.tools_kicker": "运营配置",
      "growth.tools_title": "用户反馈 · 运营数据 · 投流推广",
      "operations.module_feedback": "用户反馈",
      "operations.module_analytics": "运营数据",
      "operations.module_traffic": "投流推广",
      "operations.activation_feedback": "用户反馈收集生效方式",
      "operations.activation_analytics": "运营数据收集生效方式",
      "operations.activation_traffic": "投流策略生效方式",
      "operations.board_feedback": "用户反馈收集看板",
      "operations.board_analytics": "运营数据收集看板",
      "operations.board_traffic": "投流策略看板",
      "operations.board_refresh_feedback": "刷新用户反馈看板",
      "operations.board_refresh_analytics": "刷新运营数据看板",
      "operations.board_refresh_traffic": "刷新投流看板",
      "operations.board_refreshed": "看板已同步最新数据",
      "operations.board_refreshing": "正在同步…",
      "operations.activation_auto": "自动生效（随工作区扫描更新）",
      "operations.activation_manual": "手动配置生效",
      "operations.activation_channels": "已识别 {count} 个反馈入口",
      "operations.activation_no_channels": "尚未识别反馈入口",
      "operations.activation_sources": "{configured}/{total} 个模块已授权生效",
      "operations.activation_no_sources": "尚未配置数据来源",
      "operations.activation_analytics_pending": "请先在 Skill 精细化配置中添加数据来源",
      "operations.activation_analytics_skill_sources": "Skill 已定义 {count} 个数据来源",
      "operations.activation_analytics_skill_saved_awaiting": "Skill 已保存，{count} 个模块已完成接入，等待逐个授权",
      "operations.activation_analytics_brief_saved": "Skill 规则已保存，请在精细化配置中补充数据来源",
      "composer.drop_files": "松开即可添加附件",
      "operations.authorization_details": "详情",
      "operations.authorization_authorize": "授权",
      "operations.authorization_authorized": "已授权",
      "operations.authorization_busy": "授权中…",
      "operations.authorization_success": "“{name}”已完成授权并生效",
      "operations.authorization_failed": "模块授权失败，请稍后重试。",
      "operations.authorization_open_entry": "打开授权页面",
      "operations.authorization_complete_info": "补全信息",
      "operations.authorization_view_requirements": "查看验证要求",
      "operations.authorization_badge_needs_information": "需补全 · 暂不可授权",
      "operations.authorization_badge_pending_verification": "等待验证 · 暂不可授权",
      "operations.authorization_missing_default": "请先补全数据入口并完成一次脱敏聚合数据验证。",
      "operations.board_needs_authorization": "模块已按 Skill 完成接入。请逐个查看详情并授权；每次授权只对当前模块生效。",
      "operations.board_needs_information": "当前模块还不能保证授权后立即生效。请先按卡片提示补全信息并完成接入验证。",
      "operations.board_still_no_data": "暂未检测到可用指标。通常还需要：应用内落地埋点 → 平台/API 授权 → 真实用户访问。",
      "operations.board_refresh_no_metrics": "已刷新，但尚无通过隐私校验的聚合指标。",
      "operations.dashboard_copy_needs_information": "模块缺少必要接入信息或验证结果，补全并验证后才开放授权。",
      "operations.dashboard_copy_needs_auth": "Skill 已完成模块接入，待逐个授权后显示真实聚合数字。",
      "operations.dashboard_copy_needs_data": "授权链路已建立，等待真实用户产生数据或运营智能体拉取聚合快照。",
      "operations.activation_step_authorize": "逐模块最终授权",
      "operations.source_detail_kicker": "模块生效详情",
      "operations.source_detail_close": "关闭模块详情",
      "operations.source_detail_done": "关闭",
      "operations.source_detail_pending": "Skill 接入已完成，等待你对当前模块做最终授权",
      "operations.source_detail_active": "当前模块已授权，数据链路已生效",
      "operations.source_detail_needs_information": "当前模块缺少必要信息，暂不开放授权",
      "operations.source_detail_pending_verification": "信息已完整，等待脱敏聚合数据验证通过后开放授权",
      "operations.source_field_integration": "接入状态",
      "operations.source_field_readiness": "授权前校验",
      "operations.source_field_authorization": "授权状态",
      "operations.source_field_module": "匹配模块",
      "operations.source_field_metrics": "采集指标",
      "operations.source_field_entry": "数据入口",
      "operations.source_field_adapter": "适配方式",
      "operations.source_value_integrated": "已通过 Skill 完成",
      "operations.source_value_ready": "信息与聚合输出已验证，可安全授权",
      "operations.source_value_needs_information": "缺少必要信息",
      "operations.source_value_pending_verification": "等待聚合输出验证",
      "operations.source_value_pending": "仅当前模块待授权",
      "operations.source_value_authorized": "当前模块已授权",
      "operations.source_value_not_provided": "未单独填写",
      "operations.source_flow_title": "详细生效方式",
      "operations.source_flow_skill": "Skill 已保存并匹配到“{name}”。",
      "operations.source_flow_integrated": "AppLooper 已按 Skill 完成模块接入与聚合数据边界配置。",
      "operations.source_flow_complete_information": "补全下列必要信息并保存 Skill，AppLooper 才会继续验证真实数据链路。",
      "operations.source_flow_verify_pending": "数据端需产生一次服务端签名的脱敏聚合测试快照。",
      "operations.source_flow_authorize_pending": "你授权当前模块后，它才可以读取允许范围内的聚合数据。",
      "operations.source_flow_authorize_done": "当前模块已获得独立授权。",
      "operations.source_flow_refresh": "产生真实用户数据后，刷新看板即可查看指标。",
      "operations.source_privacy": "授权粒度仅限当前模块；只读取聚合、脱敏指标，不读取原始事件，数据最多保留 {days} 天。",
      "operations.authorization_edit_skill_sources": "在 Skill 中补充数据来源",
      "operations.guided_start": "开始引导补全",
      "operations.guided_complete_required": "补充待确认信息",
      "operations.skill_refining_activation": "正在根据最新 Skill 细化生效模块与授权前检查…",
      "operations.guided_kicker": "运营智能体 · 引导补全",
      "operations.guided_title_analytics": "补全数据统计来源",
      "operations.guided_title_feedback": "补全用户反馈来源",
      "operations.guided_title_traffic": "补全投流推广配置",
      "operations.guided_progress": "第 {current}/{total} 步",
      "operations.guided_back": "上一步",
      "operations.guided_next": "下一步",
      "operations.guided_finish": "完成并保存",
      "operations.guided_close": "关闭引导",
      "operations.guided_pick_one": "请至少选择一项",
      "operations.guided_fill_required": "请填写此项",
      "operations.guided_saved": "Skill 配置已保存，请继续在生效方式中完成授权。",
      "operations.guided_source_saved": "信息已补全并完成模块适配，请检查后授权。",
      "operations.guided_analytics_metrics": "你想统计哪些用户行为？（可多选）",
      "operations.guided_analytics_source": "数据主要来自哪里？（可多选）",
      "operations.guided_analytics_module": "请问你要用哪个页面或模块的数据来进行适配？",
      "operations.guided_analytics_module_placeholder": "例如：首页、设置页、导出流程、Trial 页面",
      "operations.guided_analytics_endpoint": "上线后可访问的聚合数据入口 URL 是什么？",
      "operations.guided_analytics_endpoint_assisted": "AI 已根据代码推断数据入口。你可以直接采用默认答案，知道正式地址时也可以修改。",
      "operations.guided_analytics_endpoint_placeholder": "https://your-dashboard.example/metrics",
      "operations.guided_metric_page_views": "页面访问",
      "operations.guided_metric_feature_usage": "功能使用",
      "operations.guided_metric_retention": "留存与活跃",
      "operations.guided_metric_errors": "错误与崩溃",
      "operations.guided_source_in_app": "应用内埋点",
      "operations.guided_source_nginx": "Nginx / 服务器日志",
      "operations.guided_source_mysql": "MySQL / 数据库",
      "operations.guided_source_api": "外部 API 看板",
      "operations.guided_feedback_channel": "用户反馈从哪里收集？",
      "operations.guided_feedback_module": "反馈入口在哪个页面或模块？",
      "operations.guided_feedback_module_placeholder": "例如：设置-意见反馈、帮助中心",
      "operations.guided_feedback_endpoint": "反馈提交地址或邮箱（可选）",
      "operations.guided_channel_in_app": "应用内反馈表单",
      "operations.guided_channel_email": "邮件 / 客服邮箱",
      "operations.guided_channel_api": "API 接口",
      "operations.guided_channel_widget": "第三方反馈组件",
      "operations.guided_traffic_platform": "准备在哪些平台投放？",
      "operations.guided_traffic_method": "主要投放方式是什么？",
      "operations.guided_traffic_target": "落地页或下载页 URL 是什么？",
      "operations.guided_traffic_target_placeholder": "https://your-app.example/download",
      "operations.guided_traffic_budget": "预算或投放节奏（可选）",
      "operations.guided_traffic_budget_placeholder": "例如：日预算 200 元，工作日投放",
      "operations.guided_platform_wechat": "微信",
      "operations.guided_platform_douyin": "抖音",
      "operations.guided_platform_xhs": "小红书",
      "operations.guided_platform_google": "Google",
      "operations.guided_platform_meta": "Meta / Facebook",
      "operations.guided_platform_other": "其他平台",
      "operations.guided_method_feed": "信息流广告",
      "operations.guided_method_search": "搜索广告",
      "operations.guided_method_kol": "KOL / 内容合作",
      "operations.guided_method_other": "其他方式",
      "operations.guided_option_custom": "自定义…",
      "operations.guided_custom_label": "请填写自定义内容",
      "operations.guided_custom_placeholder": "输入你的具体方案",
      "operations.guided_apply_recommendation": "采用 AI 推荐",
      "operations.guided_ai_assist": "AI 辅助判断",
      "operations.guided_ai_assisting": "AI 判断中…",
      "operations.guided_ai_applied": "已采用 AI 建议，你可以继续调整",
      "operations.guided_ai_unavailable": "AI 暂未判断出可靠答案，请手动选择或补充信息",
      "operations.guided_recommended_badge": "AI 推荐",
      "operations.guided_loading_recommendations": "正在根据项目现状生成 AI 初稿与推荐…",
      "operations.guided_prefilled_notice": "已根据 AI 初稿预填，可直接下一步或修改后保存。",
      "operations.guided_custom_required": "请填写自定义内容",
      "operations.activation_feedback_pending": "尚未配置反馈收集来源，请完成引导补全",
      "operations.activation_traffic_pending": "尚未登记投放平台，请完成引导补全",
      "operations.authorization_badge_skill": "已接入 · 待授权",
      "operations.activation_platforms": "已登记 {count} 个投放平台",
      "operations.activation_no_platforms": "尚未登记投放平台",
      "growth.analytics_section": "数据统计",
      "growth.analytics_section_title": "安全埋点与真实用户看板",
      "growth.traffic_section": "流量投放",
      "growth.traffic_section_title": "平台、方式与投放节奏",
      "growth.ask_analytics": "问运营智能体",
      "growth.ask_traffic": "问运营智能体",
      "growth.ask_analytics_prompt": "请根据数据统计 Skill 检查应用内安全埋点与已授权平台的数据接入情况，并告诉我下一步该怎么适配和查看数据。",
      "growth.ask_traffic_prompt": "请根据流量投放 Skill 说明应在哪些平台、以什么方式投放，并整理预算、周期或触发条件。",
      "operations.tab": "上线",
      "operations.tab_hint": "版本与发布",
      "operations.summary_aria": "版本、发布与真实用户数据",
      "operations.next_label": "智能体建议",
      "operations.next_default_title": "先把应用做完，我会在适合发布时提醒你",
      "operations.next_default_copy": "版本、发布材料和上线后的运营建议会自动整理在这里。",
      "operations.missing_title": "发布前还缺 {count} 项信息",
      "operations.next_version_title": "下一版最值得注意",
      "operations.ask_agent": "交给智能体准备",
      "operations.version": "当前版本",
      "operations.version_empty": "尚未形成可发布版本",
      "operations.version_copy": "新功能完成后自动形成一个版本",
      "operations.repository": "项目仓库",
      "operations.repository_checking": "正在检测",
      "operations.repository_empty": "尚未设置项目仓库",
      "operations.repository_copy": "自动读取当前项目；也可设置 GitHub 或自定义仓库",
      "operations.real_metrics": "真实用户",
      "operations.metrics_empty": "尚未接入真实运营数据",
      "operations.metrics_copy": "发布后由智能体帮助接入并解释，不会把模拟体验当成真实用户",
      "operations.release_label": "发布准备",
      "operations.release_waiting": "还没到需要你处理发布的时候",
      "operations.release_waiting_copy": "研发智能体会在合适的时候告诉你缺什么，并一次只让你决定一件事。",
      "operations.prepare_release": "让智能体检查发布",
      "operations.history": "版本与运营记录",
      "operations.history_empty": "这里会保留每次版本、发布和运营建议",
      "operations.release_ready": "这个版本已经可以准备发布",
      "operations.release_ready_copy": "我可以先整理版本说明、发布材料和恢复点，再让你确认发布到哪里。",
      "operations.release_in_progress": "当前版本仍在研发和迭代验证",
      "operations.release_in_progress_copy": "无需现在学习发布；达到条件后智能体会主动提醒你。",
      "operations.action_release": "请检查当前应用的发布条件，告诉我还缺什么，并帮我准备版本说明、发布材料和可恢复版本。一次只问我一个必须决定的问题。",
      "operations.action_deploy": "请严格按照当前上线 Skill 检查并执行上线；涉及凭据、付费、公开发布或其他高风险操作时先向用户确认。",
      "operations.action_connect": "请按代码仓管理 Skill 检查并连接这个应用的代码仓库。优先沿用已有配置；如果缺少信息，一次只问我一个最简单的问题。不要自动提交、推送或发布。",
      "operations.action_metrics": "请帮我为这个应用接入真实用户运营数据，并明确区分真实用户与虚拟用户。请先给出最小、隐私友好的方案，一次只问我一个必须决定的问题。",
      "operations.checklist_label": "上线向导",
      "operations.checklist_title": "按步骤完成真实用户数据接入",
      "operations.checklist_copy": "一次只处理一步；研发部署完成后，已识别环境会自动填入。",
      "operations.checklist_step_version": "形成可发布版本",
      "operations.checklist_step_version_hint": "新功能完成后登记版本说明与发布材料",
      "operations.checklist_step_version_deployed": "代码已部署到 {url}",
      "operations.checklist_step_version_deployed_generic": "代码已完成部署",
      "operations.checklist_step_repository": "连接项目仓库",
      "operations.checklist_step_repository_hint": "沿用当前项目配置，或设置 GitHub / 自定义仓库",
      "operations.checklist_step_repository_done": "{provider} · 已连接",
      "operations.checklist_action_version": "检查发布条件",
      "operations.checklist_action_repository": "连接项目仓库",
      "operations.prefill_title": "已识别环境（来自研发部署）",
      "operations.prefill_server": "服务器 URL",
      "operations.prefill_analytics": "统计入口",
      "operations.simulation_title": "迭代与试用数据说明",
      "operations.simulation_copy": "迭代页中的虚拟用户记录与远程试用操作仅供产品验证，不会计入下方真实用户看板。",
      "operations.action_strategy": "请根据当前版本、真实用户数据和反馈，给我一个最值得优先做的运营建议；先解释为什么，再帮我准备下一版本。",
      "operations.metric_summary": "{users} 位真实用户 · {events} 次关键使用",
      "operations.unread": "{count} 条新消息",
      "operations.skills_aria": "上线与运营方式",
      "operations.launch_skill": "上线方式 Skill",
      "operations.launch_skill_default": "默认上线方式",
      "operations.growth_skill": "运营方式 Skill",
      "operations.growth_skill_default": "运营方式 Skill",
      "operations.analytics_skill": "数据统计 Skill",
      "operations.analytics_skill_default": "数据统计 Skill",
      "operations.traffic_skill": "流量投放 Skill",
      "operations.traffic_skill_default": "流量投放 Skill",
      "operations.feedback_skill": "用户反馈 Skill",
      "operations.feedback_skill_default": "用户反馈 Skill",
      "operations.traffic_panel_title": "投放计划摘要",
      "operations.traffic_summary_empty": "通过对话定义平台、投放方式、周期或触发条件。",
      "operations.traffic_status_not_configured": "尚未配置",
      "operations.traffic_status_draft": "草稿",
      "operations.traffic_status_scheduled": "已排期",
      "operations.traffic_status_running": "投放中",
      "operations.traffic_status_paused": "已暂停",
      "operations.traffic_status_completed": "已完成",
      "operations.traffic_status_error": "需要检查",
      "operations.traffic_platforms_empty": "还没有登记投放平台",
      "operations.traffic_platform_schedule": "周期：{schedule}",
      "operations.traffic_platform_triggers": "触发：{triggers}",
      "operations.skill_unconfigured": "使用平台默认规则，可随时编辑",
      "operations.skill_configured": "已配置 · 第 {revision} 版",
      "operations.skill_auto_generated": "自动生成 · 来自项目与对话",
      "operations.skill_manual": "手动设置 · 第 {revision} 版",
      "operations.skill_edit": "编辑",
      "operations.deploy": "手动上线",
      "project_secrets.button": "私密配置",
      "project_secrets.kicker": "本机安全配置",
      "project_secrets.title": "补全上线所需密钥",
      "project_secrets.close": "关闭私密配置",
      "project_secrets.copy": "密钥仅保存在当前设备的本地安全存储中；不会写入聊天、项目源码、运行日志或版本库。",
      "project_secrets.agnes_placeholder": "粘贴 Agnes API Key",
      "project_secrets.agnes_missing": "尚未配置；这是唯一需要你提供的密钥。",
      "project_secrets.agnes_configured": "已安全配置；无需重新输入。",
      "project_secrets.generated_title": "平台自动生成",
      "project_secrets.generated_copy": "生产会话密钥和统计访问令牌会在保存时自动生成，无需填写。",
      "project_secrets.save": "安全保存并继续",
      "project_secrets.saved": "私密配置已保存，研发进程已安全加载。",
      "project_secrets.load_failed": "无法读取私密配置状态。",
      "project_secrets.save_failed": "私密配置保存失败。",
      "project_secrets.required_before_deploy": "上线前只需补全 Agnes API Key；其余生产密钥由平台自动生成。",
      "operations.conversation_title": "与运营智能体对话",
      "operations.conversation_copy": "可询问数据统计、流量投放，或让运营智能体更新对应 Skill 与查看数据。",
      "operations.conversation_placeholder": "问运营数据，或说明要怎样上线和运营…",
      "operations.skill_name": "Skill 名称",
      "operations.skill_close": "关闭 Skill 设置",
      "operations.skill_mode_aria": "Skill 配置方式",
      "operations.skill_provider": "平台或服务",
      "operations.skill_provider_placeholder": "例如：GitHub Pages、App Store 或自定义平台",
      "operations.skill_data_provider": "数据平台或来源",
      "operations.skill_data_provider_placeholder": "例如：应用商店统计、公开看板或自定义数据源",
      "operations.skill_target": "目标地址或数据入口（可选）",
      "operations.skill_target_help": "不要填写密码或访问令牌；需要授权时智能体会单独说明。",
      "operations.skill_rules": "Skill 说明",
      "operations.skill_rules_placeholder": "用自然语言描述要如何统计、投放或上线；智能体会按此执行。也可点 AI 智能生成。",
      "operations.skill_rules_help": "此处既供您阅读，也会直接交给智能体。展开精细化配置项后，保存时会追加到说明末尾。",
      "operations.skill_mode_simple": "简要描述",
      "operations.skill_mode_advanced": "精细化配置",
      "operations.skill_summary": "配置说明",
      "operations.skill_summary_placeholder": "用一段话描述要如何统计或投放；也可点 AI 智能生成初稿。",
      "operations.skill_advanced_toggle": "展开精细化配置项",
      "operations.skill_add_item": "添加一项",
      "operations.skill_add_data_source": "添加数据来源",
      "operations.skill_add_campaign": "添加投放项",
      "operations.skill_generate": "AI 智能生成",
      "operations.skill_generating": "正在生成…",
      "operations.skill_generated": "Skill 初稿已生成，可直接编辑后保存。",
      "operations.skill_generate_failed": "暂时无法生成 Skill 初稿，请手动填写或稍后重试。",
      "operations.skill_generate_background": "正在后台生成，您可以稍后查看",
      "operations.skill_generate_background_continue": "生成仍在后台进行，完成后会自动填入；您可先关闭此窗口。",
      "operations.skill_generate_already_running": "已在后台生成中，请稍候…",
      "operations.skill_generate_running_notice": "正在根据项目现状生成 Skill 初稿…",
      "operations.skill_missing_title": "AI 建议补充（可直接改下方 Skill 说明）",
      "operations.skill_missing_copy": "点击「一键润色」，AI 会把建议合并成清晰步骤并填入 Skill 说明。自建服务器通常只需 Nginx 日志或自定义打点接口，不必选第三方 SDK。",
      "operations.skill_missing_hint": "AI 初稿已就绪，点编辑查看；可用「一键润色」整理步骤",
      "operations.skill_polish": "一键润色",
      "operations.skill_polishing": "润色中…",
      "operations.skill_polished": "Skill 说明已润色，请确认后保存",
      "operations.skill_polish_failed": "润色失败，请手动编辑 Skill 说明或稍后重试",
      "operations.skill_polish_focus_analytics": "目标：统计官网首页每日 PV（优先 Nginx 日志或自建 /api/metrics，不用第三方 SDK）",
      "operations.skill_draft_ready": "AI 初稿已就绪，点编辑查看并保存",
      "operations.skill_generating_card": "正在后台生成 Skill 初稿…",
      "operations.skill_item_data_source": "数据来源 {index}",
      "operations.skill_item_campaign": "投放项 {index}",
      "operations.skill_source_kind": "来源类型",
      "operations.skill_source_kind_internal": "系统内埋点",
      "operations.skill_source_kind_api": "外部看板 / API",
      "operations.skill_source_name": "名称",
      "operations.skill_source_description": "说明",
      "operations.skill_source_endpoint": "API / 看板入口",
      "operations.skill_source_metrics": "关注指标",
      "operations.skill_source_module": "关联模块 / 页面",
      "operations.skill_source_notes": "适配说明",
      "operations.skill_campaign_platform": "平台",
      "operations.skill_campaign_method": "投放方式",
      "operations.skill_campaign_budget": "预算上限",
      "operations.skill_campaign_schedule": "周期",
      "operations.skill_campaign_triggers": "触发条件",
      "operations.skill_campaign_target": "落地页链接",
      "operations.skill_campaign_audience": "受众 / 创意",
      "operations.skill_campaign_notes": "备注",
      "operations.skill_remove_item": "移除",
      "operations.skill_reset": "恢复默认",
      "operations.skill_launch_kicker": "上线 · Skill",
      "operations.skill_launch_title": "配置上线方式",
      "operations.skill_launch_intro": "告诉研发智能体你希望通过哪个平台完成上线；已有配置会优先沿用。",
      "operations.skill_growth_kicker": "运营 · 数据统计 Skill",
      "operations.skill_growth_title": "配置数据统计方式",
      "operations.skill_traffic_kicker": "运营 · 流量投放 Skill",
      "operations.skill_traffic_title": "配置流量投放方式",
      "operations.skill_traffic_intro": "告诉运营智能体投放平台、方式、预算、周期或触发条件；已有配置会优先沿用。",
      "operations.skill_feedback_kicker": "用户反馈收集",
      "operations.skill_feedback_title": "编辑用户反馈 Skill",
      "operations.skill_feedback_intro": "说明用户反馈如何收集、如何合并成主题、如何汇总最新反馈；工作区已识别的入口会作为参考。",
      "operations.skill_item_feedback_channel": "收集渠道 {index}",
      "operations.skill_traffic_provider": "投放平台",
      "operations.skill_traffic_provider_placeholder": "例如：Meta Ads、Google Ads、抖音、小红书",
      "operations.skill_growth_intro": "指定真实数据来源和统计规则；没有来源或证据的数字不会显示在看板中。",
      "operations.skill_default_launch_name": "我的上线方式",
      "operations.skill_default_growth_name": "我的运营方式",
      "operations.skill_saved": "Skill 已保存。",
      "operations.skill_reset_done": "已恢复默认 Skill。",
      "operations.skill_saving": "正在保存…",
      "operations.skill_failed": "Skill 保存失败，请稍后重试。",
      "operations.skill_url_invalid": "请输入 http:// 或 https:// 开头的公开地址，或留空。",
      "operations.agent_label": "运营智能体",
      "operations.agent_idle": "等待应用达到上线条件",
      "operations.agent_queued": "运营任务已排队",
      "operations.agent_running": "正在读取真实运营数据",
      "operations.agent_waiting_for_configuration": "等待配置真实数据来源",
      "operations.agent_completed": "最近一次运营任务已完成",
      "operations.agent_error": "运营任务需要检查",
      "operations.agent_copy": "它会整理发布、版本和真实用户数据，并在需要你决定时主动提醒。",
      "operations.agent_view_status": "查看状态",
      "operations.agent_status_title": "实时运行状态",
      "operations.agent_status_close": "关闭运营智能体状态",
      "operations.agent_status_notice": "这里显示运营智能体的任务、数据来源和最近刷新结果；没有来源的数据不会显示成真实指标。",
      "operations.agent_no_activity": "还没有运营任务",
      "operations.agent_source": "数据来源",
      "operations.agent_request": "刷新任务",
      "operations.agent_session": "运行会话",
      "operations.agent_last_refresh": "最近刷新",
      "operations.agent_last_error": "失败原因",
      "operations.dashboard_label": "真实用户数据",
      "operations.dashboard_title": "运营数据看板",
      "operations.dashboard_copy": "上线并接入数据后，智能体会在这里解释变化和异常。",
      "operations.dashboard_waiting": "等待接入",
      "operations.dashboard_ready": "已从真实来源更新",
      "operations.dashboard_refreshing": "正在刷新",
      "operations.dashboard_error": "刷新失败",
      "operations.metrics_aria": "关键指标",
      "operations.metric_users": "月活用户",
      "operations.metric_active": "日活用户",
      "operations.metric_retention": "留存",
      "operations.metric_version": "主要版本",
      "operations.trend": "活跃趋势",
      "operations.trend_empty": "有真实用户后显示趋势",
      "operations.trend_aria": "运营趋势图",
      "operations.version_distribution": "版本",
      "operations.version_distribution_empty": "发布版本后显示分布",
      "operations.anomalies": "异常",
      "operations.anomaly_empty": "暂无需要关注的异常",
      "operations.anomaly_no_data": "尚无异常数据",
      "operations.metric_no_data": "无数据",
      "operations.metric_dau": "日活 {value}",
      "operations.metric_mau": "月活 {value}",
      "operations.metric_retention_value": "留存 {value}",
      "operations.environment_not_detected": "尚未识别公开上线环境",
      "operations.environment_detected": "已识别公开上线环境",
      "operations.environment_awaiting_authorization": "已识别环境，等待数据授权",
      "operations.environment_connected": "公开环境与真实数据已连接",
      "operations.environment_stale": "公开环境数据需要刷新",
      "operations.environment_error": "公开环境检查失败",
      "operations.privacy_boundary": "仅显示聚合、脱敏数据；最多保留 {days} 天",
      "operations.source_needs_authorization": "已接入 · 待授权",
      "operations.source_detected": "已自动识别",
      "operations.source_configured": "已授权 · 已生效",
      "operations.metric_provenance": "来源：{source}",
      "operations.refresh": "刷新真实数据",
      "operations.refresh_queued": "真实数据刷新已交给运营智能体。",
      "operations.refresh_waiting": "请先配置支持统计指标的真实数据来源。",
      "operations.refresh_failed": "无法请求刷新运营数据，请稍后重试。",
      "operations.load_failed": "无法加载上线与运营配置，请稍后重试。",
      "common.cancel": "取消",
      "common.save": "保存",
      "repository.kicker": "研发 · 代码仓",
      "repository.title": "代码仓管理",
      "repository.dev_title": "代码仓管理",
      "repository.dev_empty": "默认 GitHub，也可配置 Gitee 等",
      "repository.dev_connected": "{provider} · 已连接",
      "repository.configure": "配置",
      "repository.gitee": "Gitee",
      "repository.close": "关闭代码仓管理",
      "repository.manage": "查看",
      "repository.setup": "设置",
      "repository.detecting": "正在读取当前项目…",
      "repository.detecting_copy": "如果项目已经连接仓库，就不需要再次输入地址。",
      "repository.connected": "{provider} · 已连接",
      "repository.connected_copy": "已自动读取当前项目 · {branch}",
      "repository.default_branch": "默认分支",
      "repository.not_connected": "尚未设置代码仓库",
      "repository.not_connected_copy": "选择 GitHub、Gitee 或自定义仓库，只需填写一次。",
      "repository.intro": "AppLooper 会先沿用项目已有配置。只有尚未配置或你主动更换时，才需要填写仓库地址。",
      "repository.change": "更换代码仓库",
      "repository.type": "仓库类型",
      "repository.custom": "自定义",
      "repository.custom_name": "仓库服务名称",
      "repository.custom_name_placeholder": "例如：Unity Version Control",
      "repository.url": "HTTPS / SSH 地址",
      "repository.url_placeholder": "https://github.com/组织/项目.git、gitee.com/组织/项目.git 或 SSH 地址",
      "repository.url_help": "不要粘贴密码或访问令牌；智能体不会自动提交、推送或发布。",
      "repository.use_existing": "使用当前仓库",
      "repository.save": "交给研发智能体检查",
      "repository.saving": "正在提交…",
      "repository.saved": "代码仓要求已发送给研发智能体。",
      "repository.github_invalid": "请输入 github.com 的 HTTPS 或 SSH 仓库地址。",
      "repository.gitee_invalid": "请输入 gitee.com 的 HTTPS 或 SSH 仓库地址。",
      "repository.custom_name_required": "请填写仓库服务名称。",
      "repository.url_required": "请填写 HTTPS 或 SSH 仓库地址。",
      "repository.skill_unavailable": "代码仓管理暂时无法运行，请修改 Skill 配置后重试。",
      "repository.failed": "代码仓设置未能提交，请检查后重试。",
      "repository.push_now": "一键 Push",
      "repository.dev_push_ready": "GitHub · 可 Push",
      "repository.push_ready_title": "可以 Push 了",
      "repository.push_ready_copy": "研发智能体已整理 commit 说明，确认后即可 push。",
      "repository.push_commit_label": "Commit 说明",
      "repository.push_confirm": "确认并 Push",
      "repository.push_commit_required": "请填写 commit 说明。",
      "repository.commit_generate": "AI 生成",
      "repository.commit_generating": "正在生成…",
      "repository.commit_generated": "Commit 说明已生成。",
      "repository.commit_generate_failed": "暂时无法生成 commit 说明，请手动填写。",
      "repository.commit_generate_resume": "页面刷新已中断 AI 生成，请重新点击「AI 生成」。",
      "repository.commit_generate_timeout": "AI 生成超时，已填入本地 commit 摘要，可编辑后 Push 或稍后重试。",
      "repository.commit_generate_restart": "AI 生成需要重启 AppLooper Web 服务后再试；已尝试填入当前可用的 commit 建议。",
      "repository.commit_generate_fallback": "服务尚未加载 AI 接口，已填入当前 commit 建议。",
      "repository.push_confirm_prompt": "请使用以下 commit message 完成 push：\n\n{message}\n\n步骤：git status → git add 需要的文件 → git commit → push 到远程{branchHint}。不要 force push，也不要修改 git config。",
      "repository.push_prompt": "请检查当前项目工作区的 Git 变更：先 git status，再 git add 需要的文件并 commit（commit message 如需确认请先问我一句），然后 push 到已连接的远程仓库{branchHint}。不要 force push，也不要修改 git config。",
      "repository.push_branch_hint": "（默认分支：{branch}）",
      "repository.sync_now": "一键同步仓库",
      "repository.sync_prompt": "请在本地项目工作区完成代码仓同步：先 git status，再 git add .，然后 git commit 并 push 到已连接远程{branchHint}。commit message 如需确认请先问我一句。不要 force push，也不要修改 git config。",
      "repository.sync_confirm_prompt": "请在本地项目工作区完成代码仓同步：git add . → 使用以下 commit message 提交 → push 到远程{branchHint}。\n\n{message}\n\n完成后把执行结果摘要告诉我。不要 force push，也不要修改 git config。",
      "repository.sync_workflow_prompt": "请在本地项目工作区按以下 Git 命令顺序完成代码仓同步{branchHint}。commit message 使用：{message}\n\n{commands}\n\n完成后把执行结果摘要告诉我。不要 force push，也不要修改 git config。",
      "repository.push_action": "PUSH",
      "repository.push_disabled_hint": "请先填入项目本次更新内容后才可以PUSH，可以用AI生成",
      "repository.sync_workflow_title": "PUSH 集成命令",
      "repository.sync_workflow_copy": "每行一条 Git 命令；提交说明用 {commit_message} 占位。可只 add 特定文件、restore 排除敏感文件等。",
      "repository.sync_workflow_save": "保存 PUSH 命令",
      "repository.sync_workflow_saved": "PUSH 集成命令已保存。",
      "repository.sync_workflow_reset": "恢复默认 PUSH 命令",
      "repository.sync_workflow_reset_done": "已恢复默认 PUSH 集成命令。",
      "repository.sync_workflow_required": "PUSH 集成命令不能为空。",
      "repository.sync_message_pending": "（请先与我确认 commit 说明）",
      "repository.shortcut_config": "快捷命令",
      "repository.shortcuts_toggle": "配置快捷命令",
      "repository.shortcuts_toggle_close": "收起快捷命令",
      "repository.shortcuts_title": "常用 Git 快捷命令",
      "repository.shortcut_manage": "管理快捷命令",
      "repository.shortcut_add": "添加",
      "repository.shortcut_label": "显示名称",
      "repository.shortcut_label_placeholder": "例如：暂存全部",
      "repository.shortcut_command": "命令",
      "repository.shortcut_command_placeholder": "例如：git add .",
      "repository.shortcut_prompt": "请在当前项目工作区执行：`{command}`。完成后把执行结果摘要告诉我。不要执行未要求的其他 Git 操作（如 push），除非我明确要求。",
      "repository.shortcut_saved": "快捷命令已添加。",
      "repository.shortcut_removed": "快捷命令已删除。",
      "repository.shortcuts_reset": "恢复默认",
      "repository.shortcuts_reset_done": "已恢复默认快捷命令。",
      "repository.shortcut_label_required": "请填写显示名称。",
      "repository.shortcut_command_required": "请填写 Git 命令。",
      "repository.shortcut_limit": "最多保存 12 条快捷命令。",
      "repository.shortcut_remove": "删除",
      "repository.shortcut_run": "运行",
      "session.kicker": "研发智能体",
      "session.title": "实时工作记录",
      "session.title_agent": "{name} · 实时状态",
      "session.close": "关闭实时工作记录",
      "session.loading": "正在读取 Claude Code / Codex 当前会话…",
      "session.notice": "按原时间顺序显示当前任务推理、回复与工具调用；系统提示和可能含凭证的参数仍会脱敏。",
      "session.open": "查看状态",
      "session.enable_notifications": "开启提醒",
      "session.empty": "当前还没有可显示的研发会话记录。",
      "session.error": "暂时无法读取研发会话，请稍后重试。",
      "session.live": "实时更新",
      "session.heartbeat": "最后心跳 {time}",
      "session.active_tool": "工具执行中：{name}",
      "session.session_rotated": "已切换到新的实时会话",
      "session.not_started": "研发会话尚未启动",
      "session.unavailable": "暂时无法读取研发会话",
      "session.paused": "研发会话已暂停",
      "session.stopped": "研发会话已停止",
      "session.completed": "最近更新于 {time}",
      "session.tool": "使用工具：{name}",
      "session.tool_status": "工具状态：{status}",
      "session.status_started": "运行中",
      "session.status_completed": "已完成",
      "session.status_failed": "失败",
      "session.turn": "本轮任务：{status}",
      "session.assistant": "研发智能体",
      "session.reasoning": "推理过程",
      "session.user": "当前研发任务",
      "developer.welcome_title": "直接告诉研发智能体你想做什么",
      "developer.welcome_copy": "创建应用后，研发智能体会在这里主动汇报进度、提出待确认问题；你也可以随时发送修改意见。",
      "developer.name": "研发智能体",
      "developer.ready": "研发智能体已经准备好",
      "developer.ready_copy": "直接在下方输入需求、问题或修改意见；研发智能体的反馈会出现在这里。",
      "activity.starting": "研发智能体正在启动",
      "activity.working": "研发智能体正在工作",
      "activity.plan": "研发智能体正在梳理需求和开发计划",
      "activity.develop": "研发智能体正在处理第 {round} 轮的 {count} 个体验问题",
      "activity.develop_plain": "研发智能体正在更新第 {round} 轮代码",
      "activity.review": "研发智能体正在验收第 {round} 轮版本",
      "activity.experience": "虚拟用户正在进行第 {round} 轮体验",
      "activity.deliver": "研发智能体正在整理并交付候选版本",
      "activity.waiting": "研发智能体正在等待你的确认",
      "activity.retrying": "研发智能体正在自动恢复并重试",
      "activity.recovering": "研发智能体正在切换上游并重建会话",
      "activity.offline": "研发智能体后台当前未运行",
      "activity.stopped": "研发智能体已停止",
      "activity.delivered": "研发智能体已完成本轮交付",
      "activity.detail": "第 {round} 轮 · 状态更新于 {time}",
      "activity.detail_no_round": "状态更新于 {time}",
      "activity.label": "研发动态",
      "activity.public_summary": "公开工作摘要",
      "activity.public_note": "这里只展示任务边界和公开进度，不包含内部推理或思维链。",
      "activity.current": "正在做",
      "activity.next": "下一步",
      "activity.waiting_for": "等待",
      "activity.started_at": "本项开始",
      "activity.queued_messages": "排队消息",
      "activity.queued_count": "{count} 条",
      "activity.none": "暂无",
      "pending.title": "有一项内容需要确认",
      "pending.reply": "回复研发智能体",
      "pending.waiting": "研发智能体正在等待你的回复",
      "pending.card_aria": "研发智能体需要你确认的事项",
      "pending.card_title": "研发智能体需要你确认",
      "pending.options_aria": "回复研发智能体的可选答案",
      "pending.reply_context": "回复研发智能体的当前确认事项",
      "pending.default_title": "研发智能体有一项内容需要你确认",
      "composer.target": "发送给应用管理智能体",
      "composer.target_copy": "说出你的目标或问题；需要时用 @ 直达研发/运营智能体",
      "composer.target_aria": "当前消息发送对象：应用管理智能体",
      "composer.attach_title": "给应用管理智能体添加附件",
      "composer.attach_a11y": "给应用管理智能体添加图片、视频、音频或其他文件",
      "composer.label": "告诉应用管理智能体",
      "composer.placeholder": "告诉应用管理智能体你想做什么，或用 @ 指定智能体…",
      "composer.developer_target": "发送给研发智能体",
      "composer.developer_target_copy": "直接写需求、问题或修改意见",
      "composer.developer_target_aria": "当前消息发送对象：研发智能体",
      "composer.developer_attach_title": "给研发智能体添加附件",
      "composer.developer_placeholder": "可以告诉研发智能体：想新增的功能、哪里不好用、结果与预期哪里不同，或下一步希望怎么改…",
      "composer.developer_hint": "消息直接发送给研发智能体 · Enter 发送",
      "composer.send": "发送",
      "common.send": "发送",
      "composer.sending": "正在发送",
      "composer.hint": "默认由应用管理智能体统筹 · @ 可直达研发/运营智能体 · Enter 发送",
      "composer.sent": "已发送给研发智能体。",
      "message.you": "你",
      "message.system_update": "工作流状态已更新",
      "message.sent_aria": "你发送给研发智能体的消息",
      "message.sent_aria_operations": "你发送给运营智能体的消息",
      "message.feedback_aria": "研发智能体给你的反馈",
      "message.reply_quote_label": "回复",
      "message.reply_quote_aria": "引用的消息",
      "message.other_aria": "{sender}的消息",
      "message.unread": "研发智能体未读",
      "message.processing": "研发智能体已读，正在回复中…",
      "message.processing_active": "研发智能体正在生成回复…",
      "message.operations_unread": "运营智能体未读",
      "message.operations_processing": "运营智能体已读，正在回复中…",
      "message.operations_processing_active": "运营智能体正在生成回复…",
      "message.operations_replied": "运营智能体已回复",
      "message.waiting_recovery": "研发智能体已读，等待自动恢复后继续回复…",
      "message.waiting_task": "研发智能体已读，等待当前任务完成后回复…",
      "message.waiting_quota": "研发智能体已读，等待 Claude Code 额度恢复",
      "message.replied": "研发智能体已回复",
      "message.sending": "正在发送…",
      "message.failed": "发送失败",
      "message.failed_reason": "发送失败：{reason}",
      "message.retry_send": "重新发送",
      "message.waiting_persona": "请稍后，研发智能体正在基于 {name}（虚拟用户）的反馈意见优化中",
      "message.waiting_current": "请稍后，研发智能体正在完成当前任务；完成后会优先处理你的消息",
      "message.waiting_task_detail": "请稍后，{task}；完成后会优先处理你的消息",
      "message.waiting_retry": "正在重试，你的消息仍在队列中，恢复后会继续处理",
      "message.waiting_paused": "工作流已暂停，恢复后将优先处理你的消息",
      "message.feedback": "给你的研发反馈",
      "message.experience_reply": "给虚拟用户的修复回复",
      "message.experience_reply_aria": "研发智能体给虚拟用户的修复回复",
      "message.experience_report": "虚拟用户反馈",
      "message.experience_report_aria": "{sender} 提出的体验问题",
      "message.internal_test_report": "测试智能体反馈",
      "message.internal_test_report_aria": "测试智能体的独立检查结果",
      "message.real_user_insight": "真实用户反馈",
      "message.real_user_insight_aria": "运营智能体汇总的真实用户数据反馈",
      "message.real_user_reply": "回复运营智能体",
      "message.real_user_reply_aria": "研发智能体针对真实用户反馈的优化回复",
      "message.status_updated": "状态已更新",
      "media.original": "点击查看原图",
      "media.image": "消息图片",
      "media.video": "消息视频",
      "media.audio": "消息音频",
      "media.file": "文件",
      "media.attachment": "附件",
      "media.open": "点击查看",
      "media.loading": "正在加载图片",
      "media.load_failed": "图片加载失败",
      "media.retry": "重新加载",
      "media.more": "查看其余 {count} 张",
      "media.collapse": "收起多余截图",
      "agents.title": "智能体",
      "agents.close": "关闭智能体",
      "agents.profile": "智能体资料",
      "agents.close_profile": "关闭智能体资料",
      "agents.select_app": "选择应用后查看智能体",
      "agents.count_zero": "0 个智能体",
      "agents.count": "{count} 个智能体",
      "agents.project_manager_section": "应用管理智能体 · 默认对话",
      "agents.developer_section": "研发智能体 · 直接对话",
      "agents.operations_section": "运营智能体 · 直接对话",
      "agents.owner_intent_section": "需求验收智能体 · 按你的目标试用",
      "agents.internal_test_section": "测试智能体 · 定期检查功能",
      "agents.experience_section": "用来参与应用体验和反馈的虚拟用户",
      "agents.experience": "虚拟用户智能体",
      "agents.internal_test_name": "测试智能体",
      "agents.internal_test_role": "定期试用当前版本，发现问题后 @研发智能体",
      "agents.internal_test_object": "检查功能能否顺利完成",
      "agents.internal_test_profile_kind": "功能检查智能体",
      "agents.internal_test_responsibility": "定期打开应用完成关键操作，把遇到的问题和发生位置清楚地告诉研发智能体。",
      "agents.internal_test_authority": "可以提出问题并确认修复效果。",
      "agents.owner_intent_name": "需求验收智能体",
      "agents.owner_intent_role": "按照你说过的需求亲自试用，并 @你告知验收结果",
      "agents.owner_intent_object": "代表你的已表达目标进行验收",
      "agents.owner_intent_profile_kind": "需求验收智能体（所有者意图模拟）",
      "agents.owner_intent_responsibility": "按照你明确提出的功能和反馈操作应用，告诉你哪些已满足、哪些仍需改进。",
      "agents.owner_intent_authority": "可以反馈验收结果；最终发布仍由你确认。",
      "agents.project_manager_name": "应用管理智能体",
      "agents.project_manager_role": "统筹分发 · 引导上线与运营",
      "agents.developer_role": "开发者",
      "agents.member": "智能体",
      "agents.implementation_role": "实现与验证",
      "agents.operations_role": "数据与运营",
      "agents.experience_role": "目标用户场景体验",
      "agents.direct_object": "你的直接沟通对象 · {role}",
      "agents.records_only": "仅查看 · {role}{records}",
      "agents.record_suffix": " · {count} 条体验记录",
      "agents.profile_direct": "当前直接沟通对象",
      "agents.profile_readonly": "体验资料 · 可编辑",
      "agents.profile_fixed": "研究虚拟用户资料 · 只读",
      "persona.add": "添加虚拟用户智能体",
      "persona.edit": "编辑资料",
      "persona.delete": "删除虚拟用户智能体",
      "persona.save": "保存",
      "persona.create": "创建虚拟用户智能体",
      "persona.segments": "覆盖细分群体",
      "persona.segments_placeholder": "用逗号分隔，例如：学生, 职场新人",
      "persona.task_script": "试用步骤（每行一步）",
      "persona.test_account": "测试账号",
      "persona.test_account_placeholder": "如 zhaoqiming",
      "persona.auth_notes": "登录说明",
      "persona.auth_notes_placeholder": "使用测试账号登录，不要使用真实手机号",
      "persona.initial_state": "初始状态",
      "persona.saved": "虚拟用户智能体已保存",
      "persona.created": "虚拟用户智能体已创建",
      "persona.deleted": "虚拟用户智能体已删除",
      "persona.delete_confirm": "确定删除该虚拟用户智能体？",
      "persona.save_failed": "虚拟用户智能体保存失败",
      "agents.records_count": "{count} 条体验记录",
      "agents.persona_ready": "已就位，首轮版本完成后开始体验",
      "agents.persona_testing": "正在体验，完成后点击虚拟用户头像查看记录",
      "agents.persona_creating": "体验资料（创建中）",
      "agents.persona_creating_copy": "正在生成虚拟用户智能体画像，仅供查看",
      "agents.persona_empty": "虚拟用户智能体组生成后会出现在这里，仅供查看",
      "agents.open_developer_profile": "{name}，你的直接沟通对象，点击查看资料",
      "agents.open_project_manager_tab": "{name}，跳转到对话",
      "agents.open_developer_tab": "{name}，跳转到研发对话",
      "agents.open_internal_test_profile": "{name}，点击查看职责",
      "agents.open_operations_tab": "{name}，跳转到运营对话",
      "agents.open_experience_profile": "{name}，体验资料仅供查看，点击查看画像和体验记录",
      "profile.introduction": "自我介绍",
      "profile.name": "姓名",
      "profile.identity": "身份",
      "profile.responsibility": "当前职责",
      "profile.authority": "权限边界",
      "profile.environment": "工作环境",
      "profile.status": "当前状态",
      "profile.age": "年龄",
      "profile.gender": "性别",
      "profile.location": "地域",
      "profile.tech_level": "技术熟练度",
      "profile.device": "设备",
      "profile.motivation": "动机",
      "profile.constraints": "约束",
      "profile.scenario": "场景",
      "profile.habits": "习惯",
      "profile.not_provided": "未提供",
      "profile.experience_records": "体验记录",
      "profile.no_records": "尚无体验记录，完成后会自动显示在这里。",
      "profile.task_script": "任务脚本",
      "profile.test_account": "测试账号",
      "profile.auth_notes": "登录说明",
      "profile.not_generated": "尚未生成",
      "profile.default_responsibility": "根据需求实现功能、运行验证并交付候选版本。",
      "profile.default_environment": "当前应用工作空间",
      "profile.record_title": "{sender}的记录",
      "profile.empty_record": "这条记录没有附加内容。",
      "profile.unnamed_step": "未命名步骤",
      "profile.view_status": "查看状态",
      "upload.remove": "移除 {name}",
      "composer.send_failed": "消息未能发送给研发智能体，请在该消息下方重新发送。",
      "upload.missing_id": "附件已经上传，但服务没有返回附件编号，请重新选择文件。",
      "create.kicker": "新工作流",
      "create.title": "创建一个应用",
      "create.close": "关闭应用设置",
      "create.audience": "面向谁",
      "create.audience_placeholder": "例如：小学英语老师",
      "create.type": "应用类型",
      "create.type_placeholder": "例如：备课网页工具",
      "create.needs": "需要解决什么",
      "create.needs_placeholder": "例如：快速生成可编辑的分层练习，并导出打印版",
      "create.coding_agent": "本地 Coding 软件",
      "create.bridge_mode": "Claude Code 上游",
      "create.bridge_native_help": "官方 CLI，不经本地代理",
      "create.bridge_anyllm_help": "走 whit3rabbit/anyllm-proxy",
      "create.bridge_help": "仅在选择 Claude Code 时生效；Codex 始终走原生 CLI。",
      "create.coding_help": "状态来自这台电脑的命令行检测结果。",
      "create.workspace": "Workspace（电脑路径）",
      "create.workspace_placeholder": "例如：C:\\Users\\你的名字\\Documents\\现有项目",
      "create.workspace_help": "直接读取并继续修改此目录已有文件，不会创建额外子目录。",
      "create.workspace_browse": "选择文件夹",
      "create.materials": "详细资料（可选）",
      "create.materials_add": "选择文件",
      "create.materials_help": "支持一次选择多个不同格式的文件；资料会原样交给 Coding 软件。",
      "create.materials_remove": "移除 {name}",
      "create.materials_uploading": "正在上传资料…",
      "create.materials_upload_failed": "“{name}”上传失败，请移除后重新选择，或直接重试。",
      "create.intent_label": "提交给工作流的需求",
      "create.intent_default": "我要开发一个面向目标用户的合适应用，需要满足他们的核心需求",
      "create.intent": "我要开发一个面向{audience}的{appType}应用，需要{needs}",
      "create.audience_default": "目标用户",
      "create.type_default": "合适",
      "create.needs_default": "满足他们的核心需求",
      "create.submit": "开始创建",
      "create.creating": "正在创建…",
      "create.checking_system": "正在检查系统环境，请稍等片刻。",
      "create.choose_agent": "请选择一个可用的本地 Coding 软件。",
      "create.created": "应用工作流已创建。",
      "create.failed": "应用未能创建，请检查填写内容后重试。",
      "workspace.not_found": "路径不存在",
      "workspace.not_directory": "该路径不是目录",
      "workspace.invalid": "请输入有效的电脑目录路径",
      "workspace.unreadable": "无法读取此目录，请检查访问权限",
      "workspace.edit": "编辑",
      "workspace.edit_kicker": "项目目录",
      "workspace.edit_title": "修改 Workspace",
      "workspace.edit_help": "修改后，研发智能体与运营扫描都会指向新的项目文件夹。",
      "workspace.save": "保存",
      "workspace.saving": "保存中…",
      "workspace.updated": "Workspace 已更新",
      "workspace.update_failed": "无法更新 Workspace",
      "workspace.update_blocked": "工作流正在运行，请先暂停后再修改 workspace",
      "coding_agent.edit": "高级参数",
      "coding_agent.edit_kicker": "Coding CLI",
      "coding_agent.edit_title": "Coding 高级参数",
      "coding_agent.edit_intro": "每行一个参数，会追加到 AppLooper 调用的当前 Coding Agent 命令。留空表示不额外传参。",
      "coding_agent.edit_title_current": "{agent} 高级参数",
      "coding_agent.edit_intro_current": "每行一个参数，会追加到 AppLooper 调用的 {agent} 命令。留空表示不额外传参。",
      "coding_agent.claude_label": "Claude Code 额外参数",
      "coding_agent.codex_label": "Codex 额外参数",
      "coding_agent.claude_placeholder": "例如：\n--max-budget-usd 20\n--max-turns 12",
      "coding_agent.codex_placeholder": "例如：\n--profile project",
      "coding_agent.save": "保存",
      "coding_agent.saving": "正在保存…",
      "coding_agent.saved": "Coding 高级参数已保存。",
      "coding_agent.update_blocked": "工作流正在运行，请先停止后再修改 Coding 高级参数。",
      "coding_agent.update_failed": "Coding 高级参数未能保存，请稍后重试。",
      "coding_agent.error_banner": "Coding 失败：{summary}",
      "workspace_browser.kicker": "远端电脑",
      "workspace_browser.title": "选择工作区文件夹",
      "workspace_browser.close": "关闭文件夹选择",
      "workspace_browser.up": "返回上一级",
      "workspace_browser.loading": "正在读取电脑文件夹…",
      "workspace_browser.empty": "这个文件夹中没有子文件夹",
      "workspace_browser.new_folder": "新建文件夹",
      "workspace_browser.new_folder_label": "新文件夹名称",
      "workspace_browser.new_folder_placeholder": "例如：我的新应用",
      "workspace_browser.create": "创建",
      "workspace_browser.creating": "创建中…",
      "workspace_browser.choose": "选择此文件夹",
      "workspace_browser.load_failed": "无法读取这个文件夹，请检查电脑路径和访问权限。",
      "workspace_browser.retry": "重新读取",
      "workspace_browser.create_failed": "无法创建文件夹，请检查名称和访问权限。",
      "workspace_browser.name_required": "请输入文件夹名称。",
      "pairing.kicker": "手机远程使用",
      "pairing.close": "关闭手机连接",
      "pairing.title": "连接一台手机",
      "pairing.intro": "手机无需安装 Tailscale。用 Safari 打开下面的 HTTPS 地址，建议先添加到主屏幕，再从桌面图标打开并输入配对码。",
      "pairing.url_label": "手机访问地址",
      "pairing.copy_url": "复制地址",
      "pairing.url_help": "这是这台电脑提供的公网 HTTPS 地址。",
      "pairing.generating": "正在生成配对码…",
      "pairing.refreshing": "正在刷新配对码…",
      "pairing.copy_code": "复制配对码",
      "pairing.refresh_code": "刷新配对码",
      "pairing.regenerate": "重新生成",
      "pairing.generate_new": "生成新配对码",
      "pairing.qr_alt": "用手机扫描打开工作台",
      "pairing.qr_caption": "手机扫码打开",
      "pairing.session_strong": "这台手机配对后将保持登录 90 天。",
      "pairing.session_copy": "清除浏览器数据、主动撤销或会话到期后才需重新配对。",
      "pairing.revoke": "撤销全部手机会话",
      "pairing.copied_url": "手机访问地址已复制。",
      "pairing.copied_code": "配对码已复制。",
      "pairing.expires_in": "{time} 后失效",
      "pairing.expired": "已过期，请生成新的配对码",
      "pairing.unavailable": "暂时无法生成",
      "pairing.revoking": "正在撤销…",
      "pairing.revoked": "已撤销全部手机会话。",
      "pairing.invalid_response": "服务没有返回有效的 6 位配对码。",
      "pairing.url_unavailable": "公网 HTTPS 地址尚未准备好，请稍后刷新配对码。",
      "pairing.generate_failed": "暂时无法生成配对码，请稍后重试。",
      "pairing.code_aria": "配对码 {code}",
      "pairing.copy_failed": "无法自动复制，请长按内容手动复制。",
      "pairing.revoke_confirm": "撤销后，所有已配对手机都需要重新输入配对码。确定继续吗？",
      "pairing.revoke_failed": "未能撤销手机会话，请稍后重试。",
      "network.title": "手机连接检查",
      "network.idle": "如果手机打不开地址，可先在这台电脑上检查。",
      "network.check": "检查连接",
      "network.checking": "正在检查直连和系统代理…",
      "network.healthy": "连接正常，手机可以直接打开上方地址。",
      "network.repair_available": "检测到系统代理阻断；可以安全地仅让 *.ts.net 走直连。",
      "network.unreachable": "直连也失败，请检查 Tailscale、网络或电脑是否休眠。",
      "network.unavailable": "公网地址尚未准备好。",
      "network.repair": "修复连接",
      "network.restore": "恢复原设置",
      "network.repair_confirm": "将把 *.ts.net 加入 Windows 代理例外，不会关闭或修改你的代理服务器。原设置会保存在本地私密配置中，可随时恢复。确定继续吗？",
      "network.restore_confirm": "确定恢复 AppLooper 修改前的 Windows 代理例外设置吗？",
      "network.repaired": "连接已修复，请重新打开或刷新浏览器。",
      "network.restored": "已恢复原来的代理例外设置。",
      "network.failed": "连接检查或修复失败，请稍后重试。",
      "compat.title": "研发兼容性",
      "compat.legend": "Claude Code 上游模式",
      "compat.idle": "选择 Claude Code 走官方 API，还是本地 anyllm-proxy。Codex 始终走原生 CLI。",
      "compat.refresh": "刷新状态",
      "compat.save": "保存设置",
      "compat.saved": "兼容性设置已保存。",
      "compat.failed": "无法读取或保存兼容性设置。",
      "compat.mode.native": "原生 Claude / Codex",
      "compat.mode.auto": "自动（优先 anyllm-proxy）",
      "compat.mode.anyllm": "仅 anyllm-proxy",
      "compat.status.native": "当前生效：原生 Claude Code / Codex",
      "compat.status.anyllm_proxy": "当前生效：anyllm-proxy ({label})",
      "compat.status.legacy_litellm": "当前生效：旧 LiteLLM 桥接 ({label})",
      "compat.status.anyllm_missing": "已选择 anyllm-proxy，但未检测到本地注册。请运行 Start-AppLooperAnyLLMProxy.ps1。",
      "compat.status.auto_native": "自动模式：未检测到代理，使用原生 Claude Code",
      "compat.switch_app": "切换上游",
      "compat.app_title": "切换 Claude Code 上游",
      "compat.app_intro": "为当前应用选择 Claude Code 走官方 API，还是本地 anyllm-proxy。保存后建议停止并恢复工作流。",
      "compat.app_saved": "应用上游设置已保存。",
      "llm.title": "自定义 LLM 上游",
      "llm.help": "配置保存到本机 anyllm-proxy 目录，不会进入 Git 或工作流 state。",
      "llm.preset": "预设",
      "llm.custom": "自定义 OpenAI 兼容",
      "llm.base_url": "上游 Base URL",
      "llm.api_key": "API Key",
      "llm.model": "模型",
      "llm.listen_port": "本地代理端口",
      "llm.proxy_note": "保存后请确保 anyllm-proxy 已在本机运行。",
      "llm.key_configured": "已配置 Key {hint}，留空则保持不变",
      "llm.key_required": "选择 anyllm-proxy 时必须填写 API Key（或已在本机保存过 Key）。",
      "llm.next_steps": "设置已保存。请运行 integrations/anyllm-proxy/Start-AppLooperAnyLLMProxy.ps1 启动本地代理，然后停止并恢复工作流。",
      "status.created": "已创建",
      "status.starting": "正在启动",
      "status.resume_requested": "正在恢复",
      "status.running": "进行中",
      "status.waiting_user": "等待确认",
      "status.paused": "已暂停",
      "status.paused_error": "异常暂停",
      "status.paused_safety": "安全暂停",
      "status.offline": "进程已停止",
      "status.background": "后台研发中",
      "status.retrying_error": "正在重试",
      "status.recovering": "正在重试",
      "retry.context_too_large": "上下文过大",
      "retry.provider_protocol_incompatible": "本地代理暂不兼容 Claude Code 的多轮工具调用",
      "retry.rate_limited": "研发服务繁忙",
      "retry.coding_agent_quota_exhausted": "Claude Code 额度已用完",
      "retry.command_line_too_long": "启动参数过长",
      "retry.timeout": "研发响应超时",
      "retry.invalid_result_format": "研发结果格式异常",
      "retry.invalid_result_detail": "研发结果没有通过平台格式校验；项目进度已保留，AppLooper 会自动重试。",
      "retry.background_step_detail": "研发智能体本轮未能完成；项目进度已保留，AppLooper 会自动重试。",
      "retry.invalid_experience_summary": "体验摘要格式异常",
      "retry.background_step_failed": "研发步骤失败",
      "retry.countdown": "正在重试 · {time} 后再次尝试",
      "retry.now": "正在重试 · 即将再次尝试",
      "retry.recovering_line": "正在重试 · {countdown} · {reason}",
      "retry.recovering_hint": "上一轮未完成，AppLooper 会自动重试；项目进度和你的消息都已保留",
      "retry.rotated": "已切换新会话",
      "status.delivered": "已交付",
      "status.stopped": "已停止",
      "status.unknown": "未知状态",
      "phase.PLAN": "规划",
      "phase.DEVELOP": "开发",
      "phase.REVIEW": "验收",
      "phase.EXPERIENCE": "体验",
      "phase.WAIT_USER": "等待确认",
      "phase.DELIVER": "交付",
      "phase.DELIVERED": "持续回访",
      "phase.REPLAY": "定期复测",
      "phase.STOPPED": "已停止",
      "header.current": "当前：{phase}",
      "header.updated": "更新于 {time}",
      "header.auto_refresh": "状态将自动刷新",
      "workflow.resume": "恢复",
      "workflow.stop": "停止",
      "workflow.confirm_stop": "确定停止这个工作流吗？已保存的进度不会丢失，之后可以继续。",
      "workflow.checking": "正在检查…",
      "workflow.stopping": "正在停止…",
      "workflow.resuming": "正在恢复…",
      "workflow.resumed": "工作流已恢复。",
      "workflow.resume_accepted": "恢复请求已接受，正在等待后台进程接管。",
      "workflow.stop_requested": "已请求停止工作流。",
      "workflow.resume_failed": "工作流未能恢复，请稍后重试。",
      "workflow.stop_failed": "工作流未能停止，请稍后重试。",
      "workflow.resume_title": "后台进程未运行，点击从已保存进度恢复",
      "time.today": "今天",
      "time.yesterday": "昨天",
      "time.just_now": "刚刚",
      "time.minutes_ago": "{count} 分钟前",
      "time.hours_ago": "{count} 小时前"
    },
    en: {
      "meta.title": "AppLooper",
      "meta.description": "Track app development, experience feedback, and communicate with the developer agent.",
      "a11y.skip_to_chat": "Skip to the developer agent conversation",
      "brand.name": "AppLooper",
      "brand.tagline": "Start building your app",
      "icon.developer": "D",
      "icon.operations": "O",
      "icon.project_manager": "P",
      "icon.version": "V",
      "icon.launch": "L",
      "icon.feedback": "F",
      "icon.analytics": "A",
      "icon.traffic": "T",
      "language.label": "Interface language",
      "language.zh_long": "ZH",
      "language.zh_short": "ZH",
      "language.en_short": "EN",
      "notification.title": "Developer agent notifications",
      "notification.copy": "Receive development updates when the app is closed",
      "notification.action": "Notifications",
      "notification.composer_action": "Enable developer alerts",
      "notification.composer_disable_action": "Turn off notifications",
      "notification.install_action": "Add to Home Screen to enable alerts",
      "notification.ios_version": "This iPhone needs iOS 16.4 or later, and AppLooper must be opened from its Home Screen icon, to receive system notifications.",
      "notification.setup_once": "One-time setup, about 10 seconds",
      "notification.activity_state": "Notifications: {state}",
      "notification.toggle_aria": "Developer message notification switch",
      "notification.off": "Off",
      "notification.on": "On",
      "notification.checking": "Checking",
      "notification.enabling": "Enabling",
      "notification.disabling": "Disabling",
      "notification.ios_install": "On iPhone, add AppLooper to your Home Screen first. Tap “Enable developer alerts” for a 10-second guide.",
      "notification.unsupported": "This browser does not support background notifications.",
      "notification.denied": "Notifications are blocked. Allow this workspace to send notifications in system settings.",
      "notification.unavailable": "The notification service on your computer is unavailable. Install its requirements and restart the web service.",
      "notification.paired_required": "Enable or disable notifications from a paired phone.",
      "notification.enabled": "Developer agent notifications are on.",
      "notification.test_accepted": "The Apple/browser push service accepted the test. Check your notification center.",
      "notification.test_apple_accepted": "Apple Push Service accepted the test. Check your notification center.",
      "notification.test_browser_accepted": "The browser push service accepted the test. Check your notification center.",
      "notification.apple_accepted": "Apple Push Service accepted the latest notification.",
      "notification.browser_accepted": "The browser push service accepted the latest notification.",
      "notification.test_failed": "The test notification failed. The subscription was kept so you can retry later.",
      "notification.delivery_failed": "The latest push failed. Turn notifications off and on again.",
      "notification.disabled": "Developer agent notifications are off.",
      "notification.enable_failed": "Could not enable notifications. Please try again.",
      "notification.disable_failed": "Could not disable notifications. Please try again.",
      "notification.request_timeout": "The notification service timed out. Check the computer network and workflow service, then try again.",
      "notification.permission_not_granted": "Notification permission was not granted. Allow AppLooper notifications in system settings, then try again.",
      "notification.new_message": "New developer message: {message}",
      "notification.new_messages": "{count} new developer messages. Latest: {message}",
      "notification.message_fallback": "Open Develop to see the latest update.",
      "common.wait": "Just a moment.",
      "common.cancel": "Cancel",
      "common.done": "Done",
      "common.retry": "Reload",
      "common.failed": "Could not complete the operation. Please try again.",
      "common.request_timeout": "The connection took too long. Please reload and try again.",
      "common.network_error": "Cannot connect to the workflow service. Check the connection and try again.",
      "common.request_cancelled": "The request was cancelled.",
      "common.api_failed": "The request could not be completed: {message}",
      "common.api_failed_code": "The request could not be completed (error {status}).",
      "access.connecting_title": "AppLooper is loading…",
      "access.gate_aria": "Access AppLooper",
      "access.first_connection": "First connection",
      "access.connect_title": "Connect to your computer",
      "access.help": "Add this page to your Home Screen, open it from the icon, then enter the 6-digit code shown on your computer.",
      "access.code_label": "6-digit pairing code",
      "access.connect_button": "Connect",
      "access.connecting_button": "Connecting…",
      "access.opening": "Opening…",
      "access.footnote": "The code is valid for 5 minutes. After pairing, this phone stays signed in for 90 days.",
      "access.success_title": "Connected",
      "access.success_copy": "This connection is saved for 90 days. To receive developer alerts after closing the page, finish these two steps.",
      "access.install_step_share": "Tap … at the bottom right of Safari, or tap Share if its icon is already visible",
      "access.install_step_home": "Choose Share → Add to Home Screen, then open AppLooper from the new icon",
      "access.enter": "Open workspace",
      "access.unavailable_title": "Cannot reach your computer",
      "access.unavailable_copy": "Make sure the computer is online and the web service is still running.",
      "access.reconnecting_title": "Reconnecting…",
      "access.reconnecting_copy": "The computer service is briefly unreachable. AppLooper will retry automatically.",
      "access.retry": "Try again",
      "access.code_incomplete": "Enter the complete 6-digit pairing code.",
      "access.too_many": "Too many attempts. Please try again later.",
      "access.expired": "The code has expired. Click “Refresh code” on your computer.",
      "access.invalid": "That code is incorrect. Check the number shown on your computer.",
      "access.failed": "Could not connect to this computer. Check your network and try again.",
      "access.session_expired": "This phone’s session has expired. Enter the pairing code shown on your computer.",
      "connection.offline_banner": "You are offline. Previously loaded content is still available.",
      "connection.connecting": "Connecting",
      "connection.connected": "Service connected",
      "connection.interrupted": "Connection interrupted",
      "connection.device_offline": "Device offline",
      "coding.none_warning": "No local coding tool found. Install Codex or Claude Code, then refresh.",
      "coding.none_dialog_warning": "No local coding tool found. Install Codex or Claude Code, then refresh this page.",
      "coding.checking": "Checking",
      "coding.cli_unavailable": "CLI unavailable",
      "coding.not_installed": "Not installed",
      "coding.available": "Available",
      "coding.unknown": "Unknown",
      "coding.install_first": "Install Codex or Claude Code, then refresh the page",
      "coding.choose_available": "Choose an available local coding tool",
      "coding.checking_environment": "Checking the local environment",
      "apps.mine": "My apps",
      "apps.new": "New",
      "apps.select": "Select an app",
      "apps.create_first": "Create your first app",
      "apps.empty_title": "No apps yet",
      "apps.generic": "Application",
      "apps.empty_copy": "Start with a clear goal",
      "apps.loading": "Loading apps",
      "apps.loading_one": "Loading",
      "apps.reload": "Reload",
      "apps.load_failed": "Could not load",
      "apps.unnamed": "Untitled app",
      "apps.list_failed": "Could not load the app list. Please try again.",
      "apps.detail_failed": "Could not load this app. Please try again.",
      "apps.workflow_loading": "Loading workflow",
      "apps.almost_ready": "Almost ready.",
      "apps.open_failed": "Could not open this app",
      "install.device": "Install",
      "install.home": "Add to Home Screen",
      "install.phone": "Use on phone",
      "install.installed": "AppLooper has been installed.",
      "install.ios_hint": "In Safari, tap Share, then choose “Add to Home Screen”.",
      "install.browser_hint": "Open the browser menu and choose “Install app” or “Add to Home Screen”.",
      "install.mobile_tip": "Tip: open the browser menu or Share, then choose Add to Home Screen to launch AppLooper from your Home Screen.",
      "install.mobile_tip_action": "Show steps",
      "install.mobile_tip_close": "Dismiss Add to Home Screen tip",
      "ios_guide.kicker": "iPhone · One-time setup",
      "ios_guide.title": "Enable developer message alerts",
      "ios_guide.close": "Close alert setup guide",
      "ios_guide.intro": "This is an iPhone system requirement and takes about 10 seconds. You will not need to sign in or pair again.",
      "ios_guide.step_menu_title": "Tap … at the bottom right of Safari",
      "ios_guide.step_menu_copy": "If the Share icon is already visible, you can tap it directly.",
      "ios_guide.step_home_title": "Tap Share → Add to Home Screen",
      "ios_guide.step_home_copy": "Finish by tapping Add at the top right.",
      "ios_guide.step_open_title": "Open AppLooper from your Home Screen",
      "ios_guide.step_open_copy": "Tap “Enable developer alerts” here. iPhone will then ask whether to allow notifications.",
      "ios_guide.later": "Not now",
      "ios_guide.done": "Got it",
      "nav.other_apps": "Switch",
      "nav.home": "AppLooper home",
      "nav.close_apps": "Close app list",
      "nav.open_other_apps": "Switch app",
      "nav.agents": "Agents",
      "nav.open_agents": "Open agents",
      "twin.open": "Try",
      "twin.open_short": "Try",
      "twin.tab_hint": "Remote control",
      "validation.tab": "Experience",
      "validation.tab_hint": "Validation & feedback",
      "validation.records": "View internal test records",
      "validation.preparing_title": "Validation environment is being prepared",
      "validation.preparing_copy": "You can try it here after development finishes the current step. Internal test records remain available.",
      "validation.text_only_copy": "This workflow uses text evidence for validation. Internal test records remain available.",
      "twin.back": "Back to conversation",
      "twin.title": "Remote trial",
      "twin.subtitle": "Choose a surface, then control its real runtime on your computer",
      "twin.sandbox_title": "I want to try",
      "twin.sandbox_expand": "Jump to the feature you want to try",
      "twin.sandbox_copy": "Describe the feature. The trial window will prepare temporary state and jump there.",
      "twin.sandbox_label": "Feature I want to try",
      "twin.sandbox_placeholder": "For example: I want to try the one-line memory feature",
      "twin.sandbox_configure": "Jump",
      "twin.sandbox_configuring": "Preparing and jumping…",
      "twin.sandbox_connecting_jump": "Connecting the trial window and jumping…",
      "twin.sandbox_ready": "Jumped to “{label}”. You can use it in the current trial window.",
      "twin.sandbox_not_ready": "The trial window is not ready yet. Tried jumping in the current window. This is not an R&D request.",
      "twin.sandbox_wait_preview": "Connecting the trial window. It will jump automatically after the screen appears.",
      "twin.sandbox_busy": "The app is updating. Try jumping again in a moment.",
      "twin.sandbox_missing_target": "This app does not have that screen yet, so the jump cannot be made. Look for it on the current pages, or try again after development finishes.",
      "twin.sandbox_failed": "Could not jump. Please retry.",
      "twin.feedback_title": "Describe what the developer agent should improve",
      "twin.feedback_expand": "Describe what needs improvement",
      "twin.feedback_copy": "Explain what should improve and the developer agent will continue from it.",
      "twin.feedback_placeholder": "For example: search results are hard to scan; highlight the matching text",
      "twin.feedback_send": "Send to developer agent",
      "twin.feedback_hint": "",
      "twin.feedback_sending": "Sending to the developer agent…",
      "twin.feedback_sent": "The improvement request was sent to the developer agent.",
      "twin.feedback_failed": "Could not send the request. Please retry.",
      "twin.shared": "One remote session",
      "twin.views_aria": "Choose a trial surface and device",
      "twin.scale_aria": "Remote display scaling",
      "twin.fit": "Fit",
      "twin.actual": "Actual size",
      "twin.fullscreen_enter": "Full screen",
      "twin.fullscreen_exit": "Exit full screen",
      "twin.fullscreen_unavailable": "Full screen is unavailable in this browser",
      "twin.reload": "Reconnect",
      "twin.new_window": "Open in new window",
      "twin.keyboard_open": "Keyboard",
      "twin.keyboard_close": "Hide",
      "twin.keyboard_placeholder": "Type here to enter text in the trial window",
      "twin.keyboard_input_aria": "Type Chinese or English into the trial window",
      "twin.ime_badge": "CN / EN",
      "twin.ime_drag_title": "Drag to move this input bar; double-click to reset",
      "twin.ime_placeholder": "Select a field in the trial window, then type Chinese or English here",
      "twin.ime_send": "Insert",
      "twin.ime_sent": "Inserted into the trial window",
      "twin.ime_target_hint": "Select an input field in the trial window first",
      "twin.keyboard_backspace": "Backspace",
      "twin.keyboard_enter": "Enter",
      "twin.stop": "End trial",
      "twin.loading": "Checking available trial environments",
      "twin.empty_title": "No remotely runnable surface is available yet",
      "twin.empty_copy": "This app has no remote runtime configured yet. Run it from {agent} or add a target surface first.",
      "twin.error_title": "Remote trial is temporarily unavailable",
      "twin.error_copy": "Your project files were not changed. Retry, or continue running and validating it from {agent}.",
      "twin.retry": "Reconnect",
      "twin.return_agent": "Return to {agent}",
      "twin.responsive": "Responsive",
      "twin.viewport": "{width} × {height}",
      "twin.iframe_title": "{label} experience view",
      "twin.frame_loading": "Connecting to {label}",
      "twin.frame_handshake_ready": "Connected. Loading the app display…",
      "twin.frame_reconnecting": "The app display has not arrived. Retrying ({attempt}/3)…",
      "twin.frame_reconnect_exhausted": "The app display failed to load three times. Select Reconnect to try again.",
      "twin.preview_loading": "AppLooper is loading…",
      "twin.preview_failed": "The experience page could not load. Refresh and try again.",
      "twin.preview_timeout": "The experience page took too long to load. Refresh and try again.",
      "twin.web_ready_title": "The web app is ready to try",
      "twin.web_ready_copy": "Web surfaces do not need an emulator. You can click, type, and navigate here directly.",
      "twin.remote_browser_title": "Opening an isolated browser trial",
      "twin.remote_browser_copy": "This page may require scripts or backend services; if it needs a login, use a synthetic test login only. AppLooper runs it in a dedicated isolated browser surface that shows only the current app.",
      "twin.synthetic_only_notice": "Use only AppLooper-generated or synthetic data in this trial. Never enter real passwords, API keys, phone numbers, email addresses, payment information, or account credentials.",
      "twin.synthetic_only_dismiss": "Dismiss this message",
      "twin.available_views": "{count} trial surfaces",
      "twin.reconnecting": "Reconnecting to the remote runtime",
      "twin.reconnecting_copy": "The interactive display will return automatically when connected.",
      "twin.expired_title": "The remote session has ended",
      "twin.expired_copy": "This trial connection has expired. Reconnect to continue.",
      "twin.history_for": "{label} change history",
      "twin.history_count": "{count}",
      "twin.history_empty": "No changes have been recorded for this surface yet",
      "twin.local_web_title": "Local web trial path",
      "twin.local_web_copy": "Open it directly in this computer's browser. AppLooper securely proxies the address without exposing the project's service port.",
      "twin.local_open": "Open local web app",
      "twin.local_copy_url": "Copy address",
      "twin.local_copied": "Local trial address copied.",
      "twin.local_package_title": "Mobile trial file",
      "twin.local_package_copy": "A verified installable file is ready to download and transfer to the target device.",
      "twin.local_package_missing_title": "No mobile package yet",
      "twin.local_package_missing_copy": "The download button will appear after the developer agent builds and verifies an installable file.",
      "twin.local_download": "Download executable",
      "twin.local_same_wifi": "The phone and this computer must use the same Wi-Fi to reach local services. Pair the phone through Mobile access before downloading directly on it.",
      "twin.local_unavailable": "The local trial entry has not passed verification. Ask the developer agent to rebuild and check the artifact.",
      "twin.behavior_preview_title": "Fast behavior preview",
      "twin.behavior_preview_copy": "Use this view to check cross-device flows. It is not the native system UI; verify packages, system integrations, and pixel-level visuals on a real device or in the local coding tool.",
      "twin.view.desktop_web": "Desktop web",
      "twin.view.mobile_web": "Mobile web",
      "twin.view.mobile_app": "Mobile app",
      "twin.view.mobile_app_behavior": "Mobile app · behavior preview",
      "twin.view.watch_app": "Watch app",
      "twin.view.watch_app_behavior": "Watch app · behavior preview",
      "twin.view.tablet_web": "Tablet web",
      "twin.view.tablet_app": "Tablet app",
      "twin.view.tablet_app_behavior": "Tablet app · behavior preview",
      "twin.view.desktop_app": "Desktop app",
      "twin.view.desktop_app_behavior": "Desktop app · behavior preview",
      "twin.view.other": "Other surface",
      "twin.view.responsive": "Responsive web",
      "twin.view.unknown": "View {index}",
      "twin.platform.web": "Web",
      "twin.platform.desktop_browser": "Desktop browser",
      "twin.platform.mobile_browser": "Mobile browser",
      "twin.platform.tablet_browser": "Tablet browser",
      "twin.platform.mobile_unknown": "System pending",
      "twin.platform.device_unknown": "Device model pending",
      "twin.platform.watch_unknown": "System pending",
      "twin.platform.tablet_unknown": "System pending",
      "twin.platform.desktop_unknown": "System pending",
      "twin.remote_connecting_title": "Connecting to the isolated trial surface",
      "twin.remote_connecting_copy": "Connecting only to this app surface; your full desktop is never read or shared.",
      "twin.remote_preparing_title": "Preparing the trial environment",
      "twin.remote_preparing_copy": "AppLooper is starting the selected app and its runtime.",
      "twin.remote_idle_title": "The trial window has not started",
      "twin.remote_idle_copy": "Select Start trial to open an isolated window for this app.",
      "twin.remote_preparation_timeout_title": "Trial environment startup timed out",
      "twin.remote_preparation_timeout_copy": "Startup did not finish in time. Retry to start a fresh session; this screen will not remain in an indefinite preparing state.",
      "twin.remote_waiting_bridge_title": "Waiting for a remote display",
      "twin.remote_waiting_bridge_copy": "The dedicated emulator or app window is not running yet. It will connect automatically when ready and will never fall back to sharing your desktop.",
      "twin.remote_start_display": "Start display on computer",
      "twin.remote_starting_display": "Asking the computer to start the display…",
      "twin.remote_start_display_failed": "The computer could not start the display service. Review the message and try again.",
      "twin.remote_display_install_title": "A display service is missing",
      "twin.remote_display_install_action": "Review install plan",
      "twin.remote_display_install_message": "I approve installing and configuring a supported VNC display service on this computer for the current app's remote trial. Explain what will be installed and ask me once more before performing the installation.",
      "twin.remote_display_install_sent": "The installation plan is ready. Review it and confirm once more.",
      "twin.remote_install_confirm_title": "Confirm the app-surface adapter installation",
      "twin.remote_install_confirm_copy": "Only the isolated adapter for this app surface will be installed; the full desktop is never shared.",
      "twin.remote_install_final_action": "Confirm and install",
      "twin.remote_install_cancel_action": "Not now",
      "twin.remote_installing_title": "Installing the app-surface adapter",
      "twin.remote_installing_copy": "Preparing the isolated simulator or app window. Progress remains available after reopening this page.",
      "twin.remote_configuring_title": "Securing the local connection",
      "twin.remote_configuring_copy": "Restricting VNC to loopback and connecting it to AppLooper's paired remote channel.",
      "twin.remote_install_error_title": "App-surface adapter installation did not finish",
      "twin.remote_install_retry_action": "Review and retry",
      "twin.remote_missing_title": "A required emulator is missing",
      "twin.remote_missing_copy": "Trying {surface} requires: {runtimes}. Installation always needs your approval.",
      "twin.remote_waiting_install_title": "Waiting for install approval",
      "twin.remote_waiting_install_copy": "Approval records permission to install {runtimes} on this computer and hands it to the developer agent.",
      "twin.remote_install_action": "Approve install",
      "twin.remote_install_decline": "Not now",
      "twin.remote_surface_adapter_label": "App-surface adapter",
      "twin.remote_start": "Start trial",
      "twin.remote_ready_title": "Remote trial connected",
      "twin.remote_ready_copy": "Only this app surface is visible and interactive. Your desktop, physical mouse, and physical keyboard are never shared or controlled.",
      "twin.remote_unavailable_title": "This surface cannot be tried remotely yet",
      "twin.remote_unavailable_copy": "No compatible runtime is available on this computer. A dedicated {agent} configuration session has started.",
      "twin.surface_prep_starting": "Starting configuration session…",
      "twin.surface_prep_configuring": "Installing and configuring the trial environment",
      "twin.surface_prep_configuring_copy": "Use View configuration status below to inspect the live Claude Code / Codex execution context.",
      "twin.surface_prep_view_status": "View configuration status",
      "twin.surface_prep_start_failed": "The configuration session could not be started. Try again shortly.",
      "twin.remote_session_error": "The remote runtime did not start",
      "twin.remote_session_error_copy": "Retry, or return to Develop to review the developer agent's guidance.",
      "twin.remote_missing_unknown": "the required emulator",
      "twin.runtime.browser": "desktop browser",
      "twin.runtime.android_emulator": "Android Emulator",
      "twin.runtime.wear_os_emulator": "Wear OS Emulator",
      "twin.runtime.ios_simulator": "iOS Simulator (macOS required)",
      "twin.runtime.watchos_simulator": "watchOS Simulator (macOS required)",
      "twin.runtime.harmonyos_emulator": "HarmonyOS Emulator",
      "twin.runtime.novnc": "noVNC remote component",
      "twin.remote_viewer_title": "{label} isolated trial surface",
      "twin.remote_open_develop": "Back to Develop",
      "surface_add.action": "Add surface",
      "surface_add.kicker": "Try · New app surface",
      "surface_add.title": "Add an app surface",
      "surface_add.close": "Close add-app-surface dialog",
      "surface_add.type": "App surface",
      "surface_add.type_desktop_web": "Desktop web",
      "surface_add.type_mobile_web": "Mobile web",
      "surface_add.type_linux_app": "Linux app",
      "surface_add.type_android_app": "Android app",
      "surface_add.type_wear_os": "Wear OS app",
      "surface_add.type_windows_app": "Windows app",
      "surface_add.type_custom": "Custom",
      "surface_add.name": "Name",
      "surface_add.name_placeholder": "For example: Pixel 8 mobile app",
      "surface_add.platform": "System / browser",
      "surface_add.platform_placeholder": "For example: Android 15",
      "surface_add.device": "Device / environment",
      "surface_add.device_placeholder": "For example: Pixel 8",
      "surface_add.width": "Width",
      "surface_add.height": "Height",
      "surface_add.route": "Entry route",
      "surface_add.route_placeholder": "For example: / or /mobile",
      "surface_add.route_help": "Enter only an in-app route. Never enter commands, passwords, or access tokens.",
      "surface_add.agent": "Coding tool preparing the environment",
      "surface_add.agent_help": "Uses this app's current coding tool; there is nothing else to configure.",
      "surface_add.safety": "The developer agent will prepare the environment first. Installing emulators or changing system settings still requires a separate confirmation before execution.",
      "surface_add.submit": "Ask to add surface",
      "surface_add.submitting": "Adding…",
      "surface_add.waiting": "Surface added. Waiting for the developer agent to prepare its environment.",
      "surface_add.route_invalid": "The entry route must be an in-app path starting with /.",
      "surface_add.failed": "This app surface could not be added. Try again shortly.",
      "conversation.main": "Chat",
      "conversation.main_hint": "Managed by the app-management agent",
      "conversation.experience": "Develop",
      "conversation.experience_count": "{count} messages",
      "conversation.developer_hint": "Direct chat",
      "conversation.study_tabs_aria": "Switch between Develop, Experience, and Launch",
      "conversation.tabs_aria": "Switch between Chat, Develop, Experience, Launch, and Operations",
      "conversation.main_aria": "Conversation with the app-management agent",
      "intent.launch_go": "Self-checks passed — you're good to launch",
      "intent.launch_hold": "Finish the pre-launch self-checks before releasing",
      "intent.checklist_title": "Pre-launch self-verification checklist",
      "intent.open": "Open",
      "composer.mention_hint": "Type @ to reach the developer or operations agent directly; the app-management agent coordinates by default",
      "conversation.experience_aria": "Virtual-user and real-user feedback exchange",
      "conversation.experience_title": "Iteration exchange",
      "conversation.experience_copy": "Virtual-user trials and real-user analytics meet here. The operations agent periodically summarizes real-user signals for the developer agent, who replies after optimizing.",
      "conversation.read_only": "View only",
      "conversation.beta_preparing_title": "Preparing this iteration validation",
      "conversation.beta_preparing_copy": "After review, update notes appear here before a small virtual-user cohort tries the build.",
      "conversation.beta_running_title": "This release is in iteration validation",
      "conversation.beta_running_copy": "Virtual users are trying the latest build; real-user feedback appears here too.",
      "conversation.in_progress": "In progress",
      "conversation.filter_aria": "Filter exchange records by virtual user",
      "conversation.all": "All",
      "conversation.preparing_title": "Experience exchange is being prepared",
      "conversation.preparing_copy": "Issues and developer replies will appear here after virtual users are ready and finish their first run.",
      "conversation.empty_title": "No experience exchange yet",
      "conversation.empty_copy": "Virtual-user issues and the developer agent's replies will be filed here by user.",
      "conversation.show_earlier": "Show {count} earlier messages",
      "conversation.fix_reply_to": "Fix reply · {name}",
      "launch.tab": "Publish",
      "launch.tab_hint": "Versions & launch",
      "launch.unread": "{count} update(s)",
      "launch.auto_policy_label": "Auto-launch policy",
      "launch.auto_policy_title": "Advance automatically when release-ready",
      "launch.auto_policy_copy": "When enabled, the developer agent checks and prepares release using the launch skill. Paid plans, credentials, and public release still require your confirmation.",
      "launch.auto_policy_toggle": "Enable auto-launch",
      "launch.checklist_label": "Launch checklist",
      "launch.checklist_title": "Complete release step by step",
      "launch.checklist_copy": "Handle one step at a time. Detected environments are prefilled after deployment.",
      "launch.checklist_step_version": "Create a publishable version",
      "launch.checklist_step_version_hint": "Register release notes and publishing assets when a feature is ready",
      "launch.checklist_action_version": "Check release readiness",
      "launch.history": "Version and release history",
      "release.review_label": "Pre-release review",
      "release.review_title": "Confirm item by item before release",
      "release.review_copy": "This checklist applies only to the current version. Confirm each core feature.",
      "release.scenario_title": "Scenario prepared",
      "release.scenario_title_with_id": "Scenario prepared · {scenario}",
      "release.scenario_interacted": "I interacted with this scenario",
      "release.scenario_pass": "Pass this scenario",
      "release.scenario_return": "Return for changes",
      "release.scenario_prepared_verified": "Prepared state verified",
      "release.scenario_prepared_unverified": "Prepared state not yet verified",
      "release.scenario_cleanup": "Cleanup: {status}",
      "release.snapshot_label": "Start here when you return",
      "release.snapshot_title": "Current release snapshot",
      "release.snapshot_verified": "What is verified",
      "release.snapshot_judgment": "What still needs your judgment",
      "release.snapshot_paths": "Core paths to try",
      "release.snapshot_provenance": "Where the check results came from and their limits",
      "release.snapshot_verified_count": "All {total} items below refer to the current version; you have reviewed {checked}.",
      "release.snapshot_judgment_copy": "Whether the actual workflow matches your goal, whether the interaction is acceptable, and what automated checks did not cover.",
      "release.snapshot_provenance_copy": "The development summary, independent checks, automated tests, and your own trial are shown separately. No single “Pass” means the whole app is correct.",
      "release.snapshot_no_paths": "Start from the application home page and exercise the core paths in the original requirement.",
      "release.snapshot_scope_candidate": "This approval applies only to the current version. A changed version requires another review.",
      "release.snapshot_scope_run": "This confirmation applies to the current development flow. Before going live, make sure the page still shows the version you just checked.",
      "release.brief_who": "Who encountered what",
      "release.brief_screenshot": "Interface screenshot",
      "release.brief_change": "What changed in this version",
      "release.brief_check": "What you need to check now",
      "release.brief_no_screenshot": "No UI screenshot is available for this finding. Use the executable preview as the source of truth.",
      "release.evidence_disclosure": "Full evidence and technical logs (expandable)",
      "release.blocking_badge": "P0 blocks release",
      "release.section_version": "Pre-release self-check list",
      "release.section_feedback": "User feedback",
      "release.gate_draft": "In review",
      "release.gate_ready": "Ready",
      "release.gate_deferred": "Deferred",
      "release.gate_released": "Released",
      "release.attestation_label": "Attestation text (required only when the switch is on)",
      "release.attestation_placeholder": "Type the attestation text shown above",
      "release.attestation_optional_hint": "The attestation switch is off, so you can confirm launch without typing the statement.",
      "release.attestation": "I confirm that I have reviewed the version updates and user feedback items above and accept responsibility for public release.",
      "release.confirm": "I confirm — ready to release",
      "release.final_verdict_title": "My final judgment",
      "release.final_verdict_hint": "Mark every self-verification item as pass or fail before making a final judgment.",
      "release.final_pass": "I think it meets the release conditions",
      "release.final_fail": "I think it does not meet the release conditions yet",
      "release.final_pass_done": "Recorded: you believe this version meets the release conditions",
      "release.final_fail_done": "Recorded: you believe this version does not meet the release conditions yet",
      "release.final_confirm_title": "Confirm the final judgment",
      "release.final_confirm_copy": "Confirm the choice below? This cannot be changed.",
      "release.final_confirm_ok": "Confirm",
      "release.final_confirm_think": "Let me think again",
      "release.final_confirm_countdown": "You can confirm in {n}s",
      "release.final_confirm_ready": "You can confirm now",
      "release.guide_me": "Guide me",
      "release.verify_prompt": "Follow these steps to verify “{title}”",
      "release.verify_done": "Verification done",
      "release.verify_need_trial": "Please interact with the trial window at least twice, or stay there for more than 20 seconds, before marking verification done.",
      "release.verify_need_both_surfaces": "Try both the desktop web and mobile web views before marking verification done.",
      "release.verify_surface_hint": "Try both desktop and phone",
      "release.verify_verdict_kicker": "Pre-launch review",
      "release.verify_verdict_title": "Did this feature pass verification?",
      "release.verify_pass": "Pass",
      "release.verify_fail": "Fail",
      "release.verify_fail_note_label": "Optional note if it failed",
      "release.verify_fail_note_placeholder": "Optional: briefly describe what looks wrong",
      "release.verdict_unverified": "Not verified yet",
      "release.verdict_passed": "Verified and passed",
      "release.verdict_failed": "Verified, still a problem",
      "release.platform_switch_off": "Off",
      "release.platform_switch_on": "On",
      "release.items_loading": "Loading the pre-release self-check list. Please wait…",
      "release.defer": "Not now",
      "release.defer_done": "Release deferred",
      "release.confirm_done": "Release review complete — you may deploy",
      "release.publish_community": "Publish to the research test community",
      "release.publishing_community": "Publishing to the research test community…",
      "release.community_published": "Published to the research test community",
      "release.community_publish_done": "The app is available for other test participants to experience",
      "release.item_guide": "Try",
      "release.owner_proxy_label": "Owner-intent simulation agent · not you",
      "release.owner_proxy_copy": "This read-only re-check uses only requirements, constraints, and feedback you explicitly confirmed. It does not infer unstated preferences and cannot authorize release.",
      "release.owner_proxy_bypassed": "Agent re-check skipped",
      "release.owner_proxy_bypass": "Skip this agent re-check",
      "release.preparation_fixture": "Test fixture prepared",
      "release.preparation_replay": "UI replay prepared",
      "release.preparation_fallback": "No preset / ordinary path",
      "release.maintainer_title": "Layered test evidence (not real operational data)",
      "release.maintainer_empty": "No test-maintenance result yet",
      "release.maintainer_flaky": "flaky unresolved",
      "release.maintainer_quarantine": "quarantine unresolved",
      "release.maintainer_mutation": "mutation unresolved",
      "export.download": "Download app package",
      "export.downloading": "Preparing package…",
      "export.done": "Download started",
      "export.failed": "Could not export the app package. Try again later.",
      "export.need_app": "Select an app first",
      "export.copy": "Download a source archive of the current app. Secrets are stripped.",
      "internal.analysis_title": "Independent internal-test analysis agent",
      "internal.simulated_evidence_label": "Simulated evidence · not real-user or operational metrics",
      "internal.analysis_copy": "This agent is independent of the developer agent and consolidates reproducible findings. It cannot modify the app or decide release, and it does not interpret views or clicks as interest.",
      "internal.layered_evidence_title": "Layered test evidence (separate from real operational data)",
      "internal.raw_trails_summary": "Show raw simulated trails",
      "internal.changes": "P0/P1 / version changes",
      "internal.cohort": "Virtual-user cohort coverage",
      "internal.clusters": "Issue clusters",
      "internal.personas": "Affected personas",
      "internal.replays": "Fixes and replays",
      "internal.no_evidence": "No simulated evidence yet",
      "internal.no_trails": "No raw simulated trail yet",
      "internal.contract_missing": "No maintainer contract",
      "internal.results": "Results: {value}",
      "internal.no_results": "No results yet",
      "internal.risks": "Isolation risks: {value}",
      "internal.no_risks": "No unresolved flaky/quarantine/mutation state",
      "owner_proxy.skipped_notice": "The owner-intent simulation re-check was skipped. You must still provide the scenario verdict and final release confirmation.",
      "owner_proxy.skip_failed": "Could not skip the owner-intent simulation re-check.",
      "owner_proxy.round": "Round {round}",
      "owner_proxy.profile_basis": "Re-check basis: only requirements, constraints, and feedback you explicitly provided.",
      "owner_proxy.profile_ready": "Ready to re-check with the available information; you still make the final release decision.",
      "owner_proxy.profile_waiting": "There is not enough information to judge yet; you still make the final release decision.",
      "owner_proxy.refs": "Sources / evidence: {value}",
      "owner_proxy.outcome": "Outcome: {value}",
      "owner_proxy.differences": "Differences: {value}",
      "owner_proxy.risks": "Unresolved risks: {value}",
      "owner_proxy.none": "No owner-intent simulation re-check record yet",
      "common.not_provided": "Not provided",
      "common.no_record": "No record",
      "release.deploy_blocked": "Complete the release review checklist and attestation first",
      "release.required_badge": "Required",
      "eufr.label": "User feedback",
      "eufr.title": "Feedback themes",
      "eufr.copy": "Only what users explicitly report (in-app feedback, email, forms)—not page views or behavioral metrics.",
      "eufr.empty": "No user-initiated feedback yet",
      "eufr.empty_hint": "Collect explicit feedback during beta; P0 issues auto-enter the developer fix queue.",
      "eufr.guide_title": "Where does user voice come from?",
      "eufr.guide_intro": "Three signal tracks stay separate:",
      "eufr.guide_track_feedback": "Explicit feedback → this list (release review & follow-up)",
      "eufr.guide_track_metrics": "Real-user metrics → dashboard below (trends, retention; aggregate only)",
      "eufr.guide_track_iteration": "Virtual testers → Iteration tab (for dev validation, not real users)",
      "eufr.guide_step_publish": "Start collecting real user feedback once the app reaches beta (no full launch required)",
      "eufr.guide_step_feedback_entry": "Add a feedback entry point in the app (button, form, or support email)",
      "eufr.guide_step_analytics": "Connect the analytics skill; the dashboard explains behavior changes",
      "eufr.guide_step_agent": "Not sure how to wire it? Ask the operations agent for a minimal plan",
      "eufr.ask_setup": "Ask how to collect feedback",
      "eufr.ask_setup_prompt": "Explain how this app should connect to real users and collect explicit feedback (in-app entry, email, or form). Tell me what's missing, the smallest recommended setup, and how feedback will appear in the feedback theme list once configured.",
      "feedback.collection_title": "User feedback collection",
      "feedback.skill_label": "Feedback Skill",
      "feedback.skill_default": "Feedback Skill",
      "feedback.ask_agent": "Ask operations agent",
      "feedback.ask_agent_prompt": "Based on this app's feedback Skill and detected collection paths, explain how to summarize the latest user feedback, follow up on high-priority themes, and what configuration is still missing.",
      "feedback.summary_empty": "No latest feedback summary yet",
      "feedback.theme_empty": "No user feedback received yet",
      "feedback.view_detail": "View details",
      "feedback.collection_copy": "Detected from your workspace scan; user submissions via these paths feed the list below.",
      "feedback.collection_empty": "No feedback entry points detected in the workspace yet. Add an in-app form, support email, or a support widget.",
      "feedback.collection_detected": "Detected",
      "feedback.collection_not_detected": "Not detected",
      "feedback.collection_scanned_at": "Scanned {time}",
      "feedback.kind.mailto": "Mailto link",
      "feedback.kind.email": "Support email",
      "feedback.kind.in_app_route": "In-app page/form",
      "feedback.kind.widget": "Third-party widget",
      "feedback.kind.external_form": "External form",
      "feedback.kind.api_route": "Feedback API",
      "feedback.kind.source_module": "Feedback source module",
      "feedback.kind.conversation": "From conversation",
      "feedback.path_source": "Source",
      "feedback.path_route": "Route",
      "feedback.path_destination": "Destination",
      "eufr.drawer_close": "Close",
      "eufr.raw_entries": "Raw feedback",
      "eufr.resolution": "Resolution",
      "eufr.status.collected": "Collected",
      "eufr.status.acknowledged": "Acknowledged",
      "eufr.status.in_progress": "In progress",
      "eufr.status.fixed_in_build": "Fixed in build",
      "eufr.status.verified_in_release": "Verified in release",
      "eufr.status.closed": "Closed",
      "eufr.status.wont_fix": "Won't fix",
      "eufr.status.deferred": "Deferred",
      "growth.tab": "Growth",
      "growth.tab_hint": "Data & agent",
      "growth.unread": "{count} new message(s)",
      "growth.agent_copy": "It connects real-user data, explains changes, and notifies you when a decision is needed.",
      "growth.conversation_copy": "Ask about real-user metrics, anomalies, or the next growth action.",
      "growth.conversation_placeholder": "Ask about real-user data or describe tracking and growth preferences…",
      "growth.composer_target": "Send to the operations agent",
      "growth.composer_target_copy": "Ask about real-user metrics, anomalies, or the next growth action",
      "growth.composer_target_aria": "Current recipient: operations agent",
      "growth.composer_hint": "Messages go only to the operations agent · Enter to send",
      "growth.attach_title": "Add attachments for the operations agent",
      "growth.tools_open": "Data & dashboard",
      "growth.tools_close_short": "Collapse",
      "growth.tools_close": "Collapse data and dashboard",
      "growth.tools_kicker": "Operations setup",
      "growth.tools_title": "Feedback · Analytics · Traffic",
      "operations.module_feedback": "User feedback",
      "operations.module_analytics": "Operations data",
      "operations.module_traffic": "Traffic acquisition",
      "operations.activation_feedback": "Feedback collection activation",
      "operations.activation_analytics": "Data collection activation",
      "operations.activation_traffic": "Traffic strategy activation",
      "operations.board_feedback": "Feedback collection board",
      "operations.board_analytics": "Operations data board",
      "operations.board_traffic": "Traffic strategy board",
      "operations.board_refresh_feedback": "Refresh feedback board",
      "operations.board_refresh_analytics": "Refresh analytics board",
      "operations.board_refresh_traffic": "Refresh traffic board",
      "operations.board_refreshed": "Board synced with latest data",
      "operations.board_refreshing": "Syncing…",
      "operations.activation_auto": "Auto (updates with workspace scan)",
      "operations.activation_manual": "Manual configuration",
      "operations.activation_channels": "{count} feedback entry points detected",
      "operations.activation_no_channels": "No feedback entry points detected",
      "operations.activation_sources": "{configured}/{total} modules authorized and active",
      "operations.activation_no_sources": "No data sources configured",
      "operations.activation_analytics_pending": "Add data sources in Skill advanced config first",
      "operations.activation_analytics_skill_sources": "{count} data sources defined in the Skill",
      "operations.activation_analytics_skill_saved_awaiting": "Skill saved; {count} modules are integrated and await individual authorization",
      "operations.activation_analytics_brief_saved": "Skill rules saved; add structured data sources in advanced config",
      "composer.drop_files": "Drop to attach files",
      "operations.authorization_details": "Details",
      "operations.authorization_authorize": "Authorize",
      "operations.authorization_authorized": "Authorized",
      "operations.authorization_busy": "Authorizing…",
      "operations.authorization_success": "“{name}” is authorized and active",
      "operations.authorization_failed": "Module authorization failed. Try again.",
      "operations.authorization_open_entry": "Open authorization page",
      "operations.authorization_complete_info": "Complete information",
      "operations.authorization_view_requirements": "View verification requirements",
      "operations.authorization_badge_needs_information": "Information required · authorization unavailable",
      "operations.authorization_badge_pending_verification": "Verification pending · authorization unavailable",
      "operations.authorization_missing_default": "Complete the aggregate data entry and pass one privacy-safe aggregate verification first.",
      "operations.board_needs_authorization": "Modules are already integrated from the Skill. Review and authorize each one separately; each authorization applies only to that module.",
      "operations.board_needs_information": "This module cannot yet guarantee immediate activation after authorization. Complete the requested information and connection verification first.",
      "operations.board_still_no_data": "No usable metrics yet. You usually still need: in-app tracking → platform/API authorization → real user traffic.",
      "operations.board_refresh_no_metrics": "Refreshed, but no privacy-verified aggregate metrics are available yet.",
      "operations.dashboard_copy_needs_information": "Required connection information or verification is missing. Authorization opens only after both are complete.",
      "operations.dashboard_copy_needs_auth": "The Skill integration is complete; real aggregate numbers appear after each module is authorized.",
      "operations.dashboard_copy_needs_data": "Authorization path is ready; waiting for real-user traffic or an aggregate snapshot from the operations agent.",
      "operations.activation_step_authorize": "Final authorization by module",
      "operations.source_detail_kicker": "Module activation details",
      "operations.source_detail_close": "Close module details",
      "operations.source_detail_done": "Close",
      "operations.source_detail_pending": "Skill integration is complete; this module awaits your final authorization",
      "operations.source_detail_active": "This module is authorized and its data path is active",
      "operations.source_detail_needs_information": "Required information is missing, so authorization is not available yet",
      "operations.source_detail_pending_verification": "Information is complete; authorization opens after the privacy-safe aggregate output is verified",
      "operations.source_field_integration": "Integration",
      "operations.source_field_readiness": "Pre-authorization check",
      "operations.source_field_authorization": "Authorization",
      "operations.source_field_module": "Matched module",
      "operations.source_field_metrics": "Metrics",
      "operations.source_field_entry": "Data entry",
      "operations.source_field_adapter": "Adapter",
      "operations.source_value_integrated": "Completed through the Skill",
      "operations.source_value_ready": "Information and aggregate output verified; safe to authorize",
      "operations.source_value_needs_information": "Required information is missing",
      "operations.source_value_pending_verification": "Waiting for aggregate output verification",
      "operations.source_value_pending": "Only this module awaits authorization",
      "operations.source_value_authorized": "This module is authorized",
      "operations.source_value_not_provided": "Not provided separately",
      "operations.source_flow_title": "Detailed activation flow",
      "operations.source_flow_skill": "The Skill is saved and matched to “{name}”.",
      "operations.source_flow_integrated": "AppLooper completed module integration and aggregate-data boundaries from the Skill.",
      "operations.source_flow_complete_information": "Complete the required information below and save the Skill before AppLooper verifies the real data path.",
      "operations.source_flow_verify_pending": "The data side must produce one server-attested privacy-safe aggregate test snapshot.",
      "operations.source_flow_authorize_pending": "Authorize this module before it can read the permitted aggregate data.",
      "operations.source_flow_authorize_done": "This module has its own authorization.",
      "operations.source_flow_refresh": "After real users generate data, refresh the board to view metrics.",
      "operations.source_privacy": "Authorization applies only to this module. It reads aggregate, de-identified metrics—not raw events—and retains data for at most {days} days.",
      "operations.authorization_edit_skill_sources": "Add data sources in Skill",
      "operations.guided_start": "Start guided setup",
      "operations.guided_complete_required": "Complete required information",
      "operations.skill_refining_activation": "Refining activation modules and pre-authorization checks from the latest Skill…",
      "operations.guided_kicker": "Operations agent · guided setup",
      "operations.guided_title_analytics": "Complete analytics data sources",
      "operations.guided_title_feedback": "Complete feedback sources",
      "operations.guided_title_traffic": "Complete traffic setup",
      "operations.guided_progress": "Step {current} of {total}",
      "operations.guided_back": "Back",
      "operations.guided_next": "Next",
      "operations.guided_finish": "Finish and save",
      "operations.guided_close": "Close guided setup",
      "operations.guided_pick_one": "Select at least one option",
      "operations.guided_fill_required": "This field is required",
      "operations.guided_saved": "Skill saved. Continue authorization in the activation panel.",
      "operations.guided_source_saved": "Information completed and the module was adapted. Review it and authorize.",
      "operations.guided_analytics_metrics": "Which user behaviors do you want to track? (multi-select)",
      "operations.guided_analytics_source": "Where does the data come from? (multi-select)",
      "operations.guided_analytics_module": "Which page or module should we adapt metrics from?",
      "operations.guided_analytics_module_placeholder": "e.g. Home, Settings, Export flow, Trial page",
      "operations.guided_analytics_endpoint": "What aggregate data endpoint URL is reachable after launch?",
      "operations.guided_analytics_endpoint_assisted": "AI inferred the data entry from the code. Keep the default or edit it if you know the production address.",
      "operations.guided_analytics_endpoint_placeholder": "https://your-dashboard.example/metrics",
      "operations.guided_metric_page_views": "Page views",
      "operations.guided_metric_feature_usage": "Feature usage",
      "operations.guided_metric_retention": "Retention & activity",
      "operations.guided_metric_errors": "Errors & crashes",
      "operations.guided_source_in_app": "In-app tracking",
      "operations.guided_source_nginx": "Nginx / server logs",
      "operations.guided_source_mysql": "MySQL / database",
      "operations.guided_source_api": "External API dashboard",
      "operations.guided_feedback_channel": "Where should user feedback be collected?",
      "operations.guided_feedback_module": "Which page or module hosts the feedback entry?",
      "operations.guided_feedback_module_placeholder": "e.g. Settings → Feedback, Help center",
      "operations.guided_feedback_endpoint": "Feedback URL or email (optional)",
      "operations.guided_channel_in_app": "In-app feedback form",
      "operations.guided_channel_email": "Email / support inbox",
      "operations.guided_channel_api": "API endpoint",
      "operations.guided_channel_widget": "Third-party widget",
      "operations.guided_traffic_platform": "Which platforms will you advertise on?",
      "operations.guided_traffic_method": "What is the primary delivery method?",
      "operations.guided_traffic_target": "What is the landing or download URL?",
      "operations.guided_traffic_target_placeholder": "https://your-app.example/download",
      "operations.guided_traffic_budget": "Budget or schedule (optional)",
      "operations.guided_traffic_budget_placeholder": "e.g. 200/day, weekdays only",
      "operations.guided_platform_wechat": "WeChat",
      "operations.guided_platform_douyin": "Douyin",
      "operations.guided_platform_xhs": "Xiaohongshu",
      "operations.guided_platform_google": "Google",
      "operations.guided_platform_meta": "Meta / Facebook",
      "operations.guided_platform_other": "Other platform",
      "operations.guided_method_feed": "Feed ads",
      "operations.guided_method_search": "Search ads",
      "operations.guided_method_kol": "KOL / content",
      "operations.guided_method_other": "Other method",
      "operations.guided_option_custom": "Custom…",
      "operations.guided_custom_label": "Enter your custom value",
      "operations.guided_custom_placeholder": "Describe your specific setup",
      "operations.guided_apply_recommendation": "Use AI recommendation",
      "operations.guided_ai_assist": "AI-assisted decision",
      "operations.guided_ai_assisting": "AI is checking…",
      "operations.guided_ai_applied": "AI recommendation applied. You can still adjust it.",
      "operations.guided_ai_unavailable": "AI could not determine a reliable answer yet. Choose manually or add more information.",
      "operations.guided_recommended_badge": "AI pick",
      "operations.guided_loading_recommendations": "Generating an AI draft and recommendations from your project…",
      "operations.guided_prefilled_notice": "Prefilled from the AI draft — continue or edit before saving.",
      "operations.guided_custom_required": "Please enter a custom value",
      "operations.activation_feedback_pending": "No feedback sources configured yet — start guided setup",
      "operations.activation_traffic_pending": "No ad platforms registered yet — start guided setup",
      "operations.authorization_badge_skill": "Integrated · authorization pending",
      "operations.activation_platforms": "{count} ad platforms registered",
      "operations.activation_no_platforms": "No ad platforms registered",
      "growth.analytics_section": "Data statistics",
      "growth.analytics_section_title": "Safe tracking & real-user dashboard",
      "growth.traffic_section": "Traffic acquisition",
      "growth.traffic_section_title": "Platforms, method, and cadence",
      "growth.ask_analytics": "Ask operations agent",
      "growth.ask_traffic": "Ask operations agent",
      "growth.ask_analytics_prompt": "Using the data-statistics skill, review in-app safe event tracking and authorized platform data access, then tell me the next adaptation step.",
      "growth.ask_traffic_prompt": "Using the traffic-acquisition skill, explain which platforms and methods to use, and summarize budget, schedule, or trigger conditions.",
      "operations.tab": "Launch",
      "operations.tab_hint": "Versions & release",
      "operations.summary_aria": "Versions, publishing, and real-user data",
      "operations.next_label": "Agent suggestion",
      "operations.next_default_title": "Keep building for now; I will tell you when it is ready to publish",
      "operations.next_default_copy": "Versions, publishing materials, and post-launch suggestions will be prepared here.",
      "operations.missing_title": "{count} release detail(s) still needed",
      "operations.next_version_title": "Most important for the next version",
      "operations.ask_agent": "Let the agent prepare",
      "operations.version": "Current version",
      "operations.version_empty": "No publishable version yet",
      "operations.version_copy": "A version is created when a user-visible feature is complete",
      "operations.repository": "Project repository",
      "operations.repository_checking": "Checking",
      "operations.repository_empty": "No project repository configured",
      "operations.repository_copy": "Reads the current project first; GitHub and custom repositories are supported",
      "operations.real_metrics": "Real users",
      "operations.metrics_empty": "No real-user data connected",
      "operations.metrics_copy": "The agent can connect and explain it after launch without mixing simulated testers with real users",
      "operations.release_label": "Release readiness",
      "operations.release_waiting": "Nothing about publishing needs your attention yet",
      "operations.release_waiting_copy": "The developer agent will tell you what is missing at the right time and ask for one decision at a time.",
      "operations.prepare_release": "Check release readiness",
      "operations.history": "Version and operations history",
      "operations.history_empty": "Versions, releases, and operating suggestions will appear here",
      "operations.release_ready": "This version is ready to prepare for release",
      "operations.release_ready_copy": "I can prepare release notes, publishing assets, and a recovery point before asking where to publish.",
      "operations.release_in_progress": "This version is still being built and tested",
      "operations.release_in_progress_copy": "You do not need to learn publishing now; the agent will notify you when it is ready.",
      "operations.action_release": "Check this app's release readiness, tell me what is missing, and prepare release notes, publishing assets, and a recovery point. Ask only one required decision at a time.",
      "operations.action_deploy": "Follow the current launch skill to check and execute release. Ask for explicit confirmation before credentials, billing, public release, or other high-risk actions.",
      "operations.action_connect": "Use the code repository management Skill to inspect and connect this app's repository. Reuse existing configuration first, ask only one simple question if information is missing, and do not commit, push, or publish automatically.",
      "operations.action_metrics": "Help connect privacy-friendly real-user operations data for this app and clearly separate real users from virtual users. Ask only one required decision at a time.",
      "operations.checklist_label": "Launch checklist",
      "operations.checklist_title": "Connect real-user data step by step",
      "operations.checklist_copy": "Handle one step at a time. Detected launch environments are prefilled after deployment.",
      "operations.checklist_step_version": "Create a publishable version",
      "operations.checklist_step_version_hint": "Register release notes and publishing assets when a feature is ready",
      "operations.checklist_step_version_deployed": "Code deployed to {url}",
      "operations.checklist_step_version_deployed_generic": "Code deployment completed",
      "operations.checklist_step_repository": "Connect the project repository",
      "operations.checklist_step_repository_hint": "Reuse the current project or set GitHub / a custom repository",
      "operations.checklist_step_repository_done": "{provider} · Connected",
      "operations.checklist_action_version": "Check release readiness",
      "operations.checklist_action_repository": "Connect repository",
      "operations.prefill_title": "Detected environment (from deployment)",
      "operations.prefill_server": "Server URL",
      "operations.prefill_analytics": "Analytics entry",
      "operations.simulation_title": "Beta and trial data",
      "operations.simulation_copy": "Beta records and remote trial actions are for product validation only and are not counted in the real-user dashboard below.",
      "operations.action_strategy": "Using the current version, real-user data, and feedback, recommend the single most valuable operating action and help prepare the next version.",
      "operations.metric_summary": "{users} real users · {events} key uses",
      "operations.unread": "{count} new",
      "operations.skills_aria": "Launch and operations methods",
      "operations.launch_skill": "Launch method Skill",
      "operations.launch_skill_default": "Default launch method",
      "operations.growth_skill": "Operations method Skill",
      "operations.growth_skill_default": "Operations method Skill",
      "operations.analytics_skill": "Data statistics Skill",
      "operations.analytics_skill_default": "Data statistics Skill",
      "operations.traffic_skill": "Traffic acquisition Skill",
      "operations.traffic_skill_default": "Traffic acquisition Skill",
      "operations.feedback_skill": "Feedback Skill",
      "operations.feedback_skill_default": "Feedback Skill",
      "operations.traffic_panel_title": "Campaign summary",
      "operations.traffic_summary_empty": "Define platforms, delivery method, schedule, or triggers through conversation.",
      "operations.traffic_status_not_configured": "Not configured",
      "operations.traffic_status_draft": "Draft",
      "operations.traffic_status_scheduled": "Scheduled",
      "operations.traffic_status_running": "Running",
      "operations.traffic_status_paused": "Paused",
      "operations.traffic_status_completed": "Completed",
      "operations.traffic_status_error": "Needs attention",
      "operations.traffic_platforms_empty": "No ad platforms registered yet",
      "operations.traffic_platform_schedule": "Schedule: {schedule}",
      "operations.traffic_platform_triggers": "Triggers: {triggers}",
      "operations.skill_unconfigured": "Using the safe default; edit at any time",
      "operations.skill_configured": "Configured · revision {revision}",
      "operations.skill_auto_generated": "Generated automatically · from project and conversation",
      "operations.skill_manual": "Set manually · revision {revision}",
      "operations.skill_edit": "Edit",
      "operations.deploy": "Deploy manually",
      "project_secrets.button": "Private config",
      "project_secrets.kicker": "Local secure configuration",
      "project_secrets.title": "Add the secret required for launch",
      "project_secrets.close": "Close private configuration",
      "project_secrets.copy": "Secrets stay in this device's local secure storage. They are never written to chat, source code, runtime logs, or version control.",
      "project_secrets.agnes_placeholder": "Paste the Agnes API Key",
      "project_secrets.agnes_missing": "Not configured. This is the only secret you need to provide.",
      "project_secrets.agnes_configured": "Securely configured; no need to enter it again.",
      "project_secrets.generated_title": "Generated by AppLooper",
      "project_secrets.generated_copy": "The production session secret and analytics access token are generated when you save.",
      "project_secrets.save": "Save securely and continue",
      "project_secrets.saved": "Private configuration saved and loaded by the developer process.",
      "project_secrets.load_failed": "Could not read private configuration status.",
      "project_secrets.save_failed": "Could not save private configuration.",
      "project_secrets.required_before_deploy": "Add the Agnes API Key before launch. AppLooper generates the remaining production secrets.",
      "operations.conversation_title": "Chat with the operations agent",
      "operations.conversation_copy": "Ask about data statistics, traffic acquisition, or ask the operations agent to update the matching skill and explain the data.",
      "operations.conversation_placeholder": "Ask about metrics or describe how to deploy and operate…",
      "operations.skill_name": "Skill name",
      "operations.skill_close": "Close Skill settings",
      "operations.skill_mode_aria": "Skill configuration mode",
      "operations.skill_provider": "Platform or service",
      "operations.skill_provider_placeholder": "For example: GitHub Pages, App Store, or a custom platform",
      "operations.skill_data_provider": "Data platform or source",
      "operations.skill_data_provider_placeholder": "For example: store analytics, a public dashboard, or a custom source",
      "operations.skill_target": "Target address or data entry point (optional)",
      "operations.skill_target_help": "Do not enter passwords or access tokens. The agent will explain separately when authorization is needed.",
      "operations.skill_rules": "Skill description",
      "operations.skill_rules_placeholder": "Describe tracking, acquisition, or launch in plain language; the agent follows this. Or use AI Generate.",
      "operations.skill_rules_help": "You read this here, and the agent receives the same text. Advanced items append on save.",
      "operations.skill_mode_simple": "Brief description",
      "operations.skill_mode_advanced": "Detailed items",
      "operations.skill_summary": "Configuration summary",
      "operations.skill_summary_placeholder": "Describe tracking or acquisition in plain language, or use AI Generate for a draft.",
      "operations.skill_advanced_toggle": "Expand detailed configuration items",
      "operations.skill_add_item": "Add item",
      "operations.skill_add_data_source": "Add data source",
      "operations.skill_add_campaign": "Add campaign item",
      "operations.skill_generate": "Generate with AI",
      "operations.skill_generating": "Generating…",
      "operations.skill_generated": "Skill draft generated. Edit and save when ready.",
      "operations.skill_generate_failed": "Could not generate a Skill draft. Fill it manually or retry later.",
      "operations.skill_generate_background": "Generating in the background. You can check back later.",
      "operations.skill_generate_background_continue": "Generation is still running in the background and will auto-fill when ready. You can close this dialog.",
      "operations.skill_generate_already_running": "Already generating in the background…",
      "operations.skill_generate_running_notice": "Generating a Skill draft from the current project context…",
      "operations.skill_missing_title": "AI suggestions (edit the Skill description below)",
      "operations.skill_missing_copy": "Click Polish to merge suggestions into clear steps in the Skill description. Self-hosted servers usually need nginx logs or a custom endpoint, not a third-party SDK.",
      "operations.skill_missing_hint": "AI draft ready — open Edit; use Polish to organize steps",
      "operations.skill_polish": "Polish",
      "operations.skill_polishing": "Polishing…",
      "operations.skill_polished": "Skill description polished — review and save",
      "operations.skill_polish_failed": "Polish failed. Edit manually or try again later",
      "operations.skill_polish_focus_analytics": "Goal: daily homepage PV (prefer nginx logs or self-hosted /api/metrics, no third-party SDK)",
      "operations.skill_draft_ready": "AI draft ready — open Edit to review and save",
      "operations.skill_generating_card": "Generating Skill draft in the background…",
      "operations.skill_item_data_source": "Data source {index}",
      "operations.skill_item_campaign": "Campaign item {index}",
      "operations.skill_source_kind": "Source type",
      "operations.skill_source_kind_internal": "In-app tracking",
      "operations.skill_source_kind_api": "External dashboard / API",
      "operations.skill_source_name": "Name",
      "operations.skill_source_description": "Description",
      "operations.skill_source_endpoint": "API / dashboard entry",
      "operations.skill_source_metrics": "Metrics to track",
      "operations.skill_source_module": "Related module / page",
      "operations.skill_source_notes": "Adapter notes",
      "operations.skill_campaign_platform": "Platform",
      "operations.skill_campaign_method": "Delivery method",
      "operations.skill_campaign_budget": "Budget cap",
      "operations.skill_campaign_schedule": "Schedule",
      "operations.skill_campaign_triggers": "Triggers",
      "operations.skill_campaign_target": "Landing URL",
      "operations.skill_campaign_audience": "Audience / creative",
      "operations.skill_campaign_notes": "Notes",
      "operations.skill_remove_item": "Remove",
      "operations.skill_reset": "Restore default",
      "operations.skill_launch_kicker": "Launch · Skill",
      "operations.skill_launch_title": "Configure launch method",
      "operations.skill_launch_intro": "Tell the developer agent which platform should be used to launch. Existing configuration is reused first.",
      "operations.skill_growth_kicker": "Operations · Data statistics Skill",
      "operations.skill_growth_title": "Configure data statistics",
      "operations.skill_traffic_kicker": "Operations · Traffic acquisition Skill",
      "operations.skill_traffic_title": "Configure traffic acquisition",
      "operations.skill_traffic_intro": "Tell the operations agent about ad platforms, delivery method, budget, schedule, or trigger conditions. Existing configuration is reused first.",
      "operations.skill_feedback_kicker": "User feedback collection",
      "operations.skill_feedback_title": "Edit feedback Skill",
      "operations.skill_feedback_intro": "Describe how user feedback is collected, merged into themes, and summarized; detected workspace entry points are used as hints.",
      "operations.skill_item_feedback_channel": "Collection channel {index}",
      "operations.skill_traffic_provider": "Ad platform",
      "operations.skill_traffic_provider_placeholder": "For example: Meta Ads, Google Ads, TikTok, Xiaohongshu",
      "operations.skill_growth_intro": "Choose real data sources and measurement rules. Numbers without a source and provenance are never shown on the dashboard.",
      "operations.skill_default_launch_name": "My launch method",
      "operations.skill_default_growth_name": "My operations method",
      "operations.skill_saved": "Skill saved.",
      "operations.skill_reset_done": "Default Skill restored.",
      "operations.skill_saving": "Saving…",
      "operations.skill_failed": "The Skill could not be saved. Try again.",
      "operations.skill_url_invalid": "Enter a public address beginning with http:// or https://, or leave it blank.",
      "operations.agent_label": "Operations agent",
      "operations.agent_idle": "Waiting until the app is ready to launch",
      "operations.agent_queued": "Operations task queued",
      "operations.agent_running": "Reading real operations data",
      "operations.agent_waiting_for_configuration": "Waiting for a real data source",
      "operations.agent_completed": "Latest operations task completed",
      "operations.agent_error": "Operations task needs attention",
      "operations.agent_copy": "It organizes releases, versions, and real-user data, and asks you only when a decision is needed.",
      "operations.agent_view_status": "View status",
      "operations.agent_status_title": "Live status",
      "operations.agent_status_close": "Close operations-agent status",
      "operations.agent_status_notice": "This shows the operations agent's task, data sources, and latest refresh result. Data without a source is never shown as a real metric.",
      "operations.agent_no_activity": "No operations task yet",
      "operations.agent_source": "Data source",
      "operations.agent_request": "Refresh request",
      "operations.agent_session": "Agent session",
      "operations.agent_last_refresh": "Latest refresh",
      "operations.agent_last_error": "Failure reason",
      "operations.dashboard_label": "Real-user data",
      "operations.dashboard_title": "Operations dashboard",
      "operations.dashboard_copy": "After launch and data connection, the agent explains changes and anomalies here.",
      "operations.dashboard_waiting": "Waiting for data",
      "operations.dashboard_ready": "Updated from a real source",
      "operations.dashboard_refreshing": "Refreshing",
      "operations.dashboard_error": "Refresh failed",
      "operations.metrics_aria": "Key metrics",
      "operations.metric_users": "Monthly active",
      "operations.metric_active": "Daily active",
      "operations.metric_retention": "Retention",
      "operations.metric_version": "Top version",
      "operations.trend": "Activity trend",
      "operations.trend_empty": "Shown after real users arrive",
      "operations.trend_aria": "Operations trend chart",
      "operations.version_distribution": "Versions",
      "operations.version_distribution_empty": "Shown after a version is released",
      "operations.anomalies": "Anomalies",
      "operations.anomaly_empty": "No anomaly needs attention",
      "operations.anomaly_no_data": "No anomaly data yet",
      "operations.metric_no_data": "No data",
      "operations.metric_dau": "DAU {value}",
      "operations.metric_mau": "MAU {value}",
      "operations.metric_retention_value": "Retention {value}",
      "operations.environment_not_detected": "No public launch environment detected",
      "operations.environment_detected": "Public launch environment detected",
      "operations.environment_awaiting_authorization": "Environment detected; data authorization required",
      "operations.environment_connected": "Public environment and real data connected",
      "operations.environment_stale": "Public environment data needs refresh",
      "operations.environment_error": "Public environment check failed",
      "operations.privacy_boundary": "Aggregate, de-identified data only; snapshots are kept for at most {days} days",
      "operations.source_needs_authorization": "Integrated · authorization pending",
      "operations.source_detected": "Auto-detected",
      "operations.source_configured": "Authorized · active",
      "operations.metric_provenance": "Source: {source}",
      "operations.refresh": "Refresh real data",
      "operations.refresh_queued": "The real-data refresh was queued for the operations agent.",
      "operations.refresh_waiting": "Configure a real data source that supports metrics first.",
      "operations.refresh_failed": "The operations-data refresh could not be requested. Try again.",
      "operations.load_failed": "Launch and operations settings could not be loaded. Try again.",
      "common.cancel": "Cancel",
      "common.save": "Save",
      "repository.kicker": "Development · Code repo",
      "repository.title": "Code repository",
      "repository.dev_title": "Code repository",
      "repository.dev_empty": "GitHub by default; Gitee and others supported",
      "repository.dev_connected": "{provider} · Connected",
      "repository.configure": "Configure",
      "repository.gitee": "Gitee",
      "repository.close": "Close code repository settings",
      "repository.manage": "View",
      "repository.setup": "Set up",
      "repository.detecting": "Reading the current project…",
      "repository.detecting_copy": "If this project already has a repository, you do not need to enter its address again.",
      "repository.connected": "{provider} · Connected",
      "repository.connected_copy": "Read automatically from this project · {branch}",
      "repository.default_branch": "default branch",
      "repository.not_connected": "No code repository configured",
      "repository.not_connected_copy": "Choose GitHub, Gitee, or a custom repository and enter it once.",
      "repository.intro": "AppLooper reuses the existing project configuration first. An address is needed only when none exists or when you choose to replace it.",
      "repository.change": "Change code repository",
      "repository.type": "Repository type",
      "repository.custom": "Custom",
      "repository.custom_name": "Repository service name",
      "repository.custom_name_placeholder": "For example, Unity Version Control",
      "repository.url": "HTTPS / SSH address",
      "repository.url_placeholder": "https://github.com/org/project.git, gitee.com/org/project.git, or an SSH address",
      "repository.url_help": "Do not paste passwords or access tokens. The agent will not commit, push, or publish automatically.",
      "repository.use_existing": "Use current repository",
      "repository.save": "Ask the developer agent to check",
      "repository.saving": "Submitting…",
      "repository.saved": "The code repository request was sent to the developer agent.",
      "repository.github_invalid": "Enter a github.com HTTPS or SSH repository address.",
      "repository.gitee_invalid": "Enter a gitee.com HTTPS or SSH repository address.",
      "repository.custom_name_required": "Enter the repository service name.",
      "repository.url_required": "Enter an HTTPS or SSH repository address.",
      "repository.skill_unavailable": "Code repository management is unavailable. Update the Skill configuration and try again.",
      "repository.failed": "The code repository request could not be submitted. Check it and try again.",
      "repository.push_now": "Push changes",
      "repository.dev_push_ready": "GitHub · Ready to push",
      "repository.push_ready_title": "Ready to push",
      "repository.push_ready_copy": "The developer agent prepared a commit message. Review it, edit if needed, then push.",
      "repository.push_commit_label": "Commit message",
      "repository.push_confirm": "Confirm and push",
      "repository.push_commit_required": "Enter a commit message.",
      "repository.commit_generate": "Generate with AI",
      "repository.commit_generating": "Generating…",
      "repository.commit_generated": "Commit message generated.",
      "repository.commit_generate_failed": "Could not generate a commit message. Enter one manually.",
      "repository.commit_generate_resume": "A page refresh interrupted AI generation. Click AI Generate again.",
      "repository.commit_generate_timeout": "AI generation timed out. A local commit summary was filled in; edit it or retry later.",
      "repository.commit_generate_restart": "Restart the AppLooper Web service to use AI generation. A suggested commit message was filled in when available.",
      "repository.commit_generate_fallback": "The AI endpoint is not loaded yet. A suggested commit message was filled in instead.",
      "repository.push_confirm_prompt": "Push using this commit message:\n\n{message}\n\nSteps: git status → git add the needed files → git commit → push to the remote{branchHint}. Do not force push or change git config.",
      "repository.push_prompt": "Review the Git changes in this project workspace: run git status, git add the needed files, commit (ask me once if the commit message needs confirmation), then push to the connected remote{branchHint}. Do not force push or change git config.",
      "repository.push_branch_hint": " (default branch: {branch})",
      "repository.sync_now": "Sync repository",
      "repository.sync_prompt": "Sync this project workspace locally: git status → git add . → git commit → push to the connected remote{branchHint}. Ask me once if the commit message needs confirmation. Do not force push or change git config.",
      "repository.sync_confirm_prompt": "Sync this project workspace locally: git add . → commit with the message below → push to the remote{branchHint}.\n\n{message}\n\nThen summarize the result for me. Do not force push or change git config.",
      "repository.sync_workflow_prompt": "Sync this project workspace locally{branchHint} using this commit message: {message}\n\nRun these Git commands in order:\n{commands}\n\nThen summarize the result for me. Do not force push or change git config.",
      "repository.push_action": "PUSH",
      "repository.push_disabled_hint": "Enter what changed in this update before pushing. You can use AI Generate.",
      "repository.sync_workflow_title": "Integrated PUSH commands",
      "repository.sync_workflow_copy": "One Git command per line. Use {commit_message} for the commit message. You can stage specific paths or unstage sensitive files.",
      "repository.sync_workflow_save": "Save PUSH commands",
      "repository.sync_workflow_saved": "Integrated PUSH commands saved.",
      "repository.sync_workflow_reset": "Reset default PUSH commands",
      "repository.sync_workflow_reset_done": "Default PUSH commands restored.",
      "repository.sync_workflow_required": "Integrated PUSH commands cannot be empty.",
      "repository.sync_message_pending": "(Confirm the commit message with me first)",
      "repository.shortcut_config": "Shortcuts",
      "repository.shortcuts_toggle": "Configure shortcuts",
      "repository.shortcuts_toggle_close": "Hide shortcuts",
      "repository.shortcuts_title": "Git shortcuts",
      "repository.shortcut_manage": "Manage shortcuts",
      "repository.shortcut_add": "Add",
      "repository.shortcut_label": "Label",
      "repository.shortcut_label_placeholder": "For example: Stage all",
      "repository.shortcut_command": "Command",
      "repository.shortcut_command_placeholder": "For example: git add .",
      "repository.shortcut_prompt": "Run this in the current project workspace: `{command}`. Then summarize the result for me. Do not run other Git operations (such as push) unless I explicitly ask.",
      "repository.shortcut_saved": "Shortcut added.",
      "repository.shortcut_removed": "Shortcut removed.",
      "repository.shortcuts_reset": "Reset defaults",
      "repository.shortcuts_reset_done": "Default shortcuts restored.",
      "repository.shortcut_label_required": "Enter a label.",
      "repository.shortcut_command_required": "Enter a Git command.",
      "repository.shortcut_limit": "You can save at most 12 shortcuts.",
      "repository.shortcut_remove": "Remove",
      "repository.shortcut_run": "Run",
      "session.kicker": "Developer agent",
      "session.title": "Live work log",
      "session.title_agent": "{name} · Live status",
      "session.close": "Close live work log",
      "session.loading": "Reading the current Claude Code / Codex session…",
      "session.notice": "Execution context is shown in timestamp order: reasoning, replies, and tool calls. System prompts and credential-like parameters are still redacted.",
      "session.open": "View status",
      "session.enable_notifications": "Enable alerts",
      "session.empty": "There is no developer session activity to show yet.",
      "session.error": "The developer session cannot be read right now. Try again shortly.",
      "session.live": "Live",
      "session.heartbeat": "Last heartbeat {time}",
      "session.active_tool": "Tool running: {name}",
      "session.session_rotated": "Switched to the new live session",
      "session.not_started": "The developer session has not started",
      "session.unavailable": "The developer session is temporarily unavailable",
      "session.paused": "The developer session is paused",
      "session.stopped": "The developer session has stopped",
      "session.completed": "Updated {time}",
      "session.tool": "Tool: {name}",
      "session.tool_status": "Tool status: {status}",
      "session.status_started": "running",
      "session.status_completed": "completed",
      "session.status_failed": "failed",
      "session.turn": "Turn: {status}",
      "session.assistant": "Developer agent",
      "session.reasoning": "Reasoning",
      "session.user": "Current development task",
      "developer.welcome_title": "Tell the developer agent what you want to build",
      "developer.welcome_copy": "It will report progress and ask for decisions here. You can send changes at any time.",
      "developer.name": "Developer agent",
      "developer.ready": "The developer agent is ready",
      "developer.ready_copy": "Enter a requirement, problem, or change below. Its feedback will appear here.",
      "activity.starting": "The developer agent is starting",
      "activity.working": "The developer agent is working",
      "activity.plan": "The developer agent is organizing requirements and the plan",
      "activity.develop": "The developer agent is addressing {count} issues in round {round}",
      "activity.develop_plain": "The developer agent is updating code for round {round}",
      "activity.review": "The developer agent is reviewing the round {round} build",
      "activity.experience": "Virtual users are testing the round {round} build",
      "activity.deliver": "The developer agent is preparing the candidate for delivery",
      "activity.waiting": "The developer agent is waiting for your confirmation",
      "activity.retrying": "The developer agent is recovering and retrying automatically",
      "activity.recovering": "The developer agent is switching upstream and rebuilding sessions",
      "activity.offline": "The developer agent background process is offline",
      "activity.stopped": "The developer agent has stopped",
      "activity.delivered": "The developer agent completed this delivery",
      "activity.detail": "Round {round} · updated {time}",
      "activity.detail_no_round": "Updated {time}",
      "activity.label": "Development activity",
      "activity.public_summary": "Public work summary",
      "activity.public_note": "Shows task boundaries and public progress only; it does not expose internal reasoning or chain of thought.",
      "activity.current": "Current",
      "activity.next": "Next",
      "activity.waiting_for": "Waiting for",
      "activity.started_at": "Started",
      "activity.queued_messages": "Queued messages",
      "activity.queued_count": "{count}",
      "activity.none": "None",
      "pending.title": "One item needs your confirmation",
      "pending.reply": "Reply to developer agent",
      "pending.waiting": "The developer agent is waiting for your reply",
      "pending.card_aria": "An item from the developer agent needs your confirmation",
      "pending.card_title": "The developer agent needs your confirmation",
      "pending.options_aria": "Reply options for the developer agent",
      "pending.reply_context": "Replying to the current confirmation request",
      "pending.default_title": "The developer agent has an item for you to confirm",
      "composer.target": "Send to the app-management agent",
      "composer.target_copy": "Say your goal or question; use @ to reach the developer/operations agent directly",
      "composer.target_aria": "Current message recipient: app-management agent",
      "composer.attach_title": "Add an attachment for the app-management agent",
      "composer.attach_a11y": "Add images, video, audio, or other files for the app-management agent",
      "composer.label": "Tell the app-management agent",
      "composer.placeholder": "Tell the app-management agent what you want, or use @ to pick an agent…",
      "composer.developer_target": "Send to the developer agent",
      "composer.developer_target_copy": "Requirements, issues, or changes",
      "composer.developer_target_aria": "Current message recipient: developer agent",
      "composer.developer_attach_title": "Add an attachment for the developer agent",
      "composer.developer_placeholder": "Tell the developer agent about a feature to add, something difficult to use, how the result differs from your expectation, or what to change next…",
      "composer.developer_hint": "Messages go directly to the developer agent · Enter to send",
      "composer.send": "Send",
      "common.send": "Send",
      "composer.sending": "Sending",
      "composer.hint": "Coordinated by the app-management agent · @ to reach dev/ops directly · Enter to send",
      "composer.sent": "Sent to the developer agent.",
      "message.you": "You",
      "message.system_update": "Workflow status updated",
      "message.sent_aria": "Message you sent to the developer agent",
      "message.sent_aria_operations": "Message you sent to the operations agent",
      "message.feedback_aria": "Feedback from the developer agent",
      "message.reply_quote_label": "Replying to",
      "message.reply_quote_aria": "Quoted message",
      "message.other_aria": "Message from {sender}",
      "message.unread": "Unread by developer agent",
      "message.processing": "Read by developer agent, replying…",
      "message.processing_active": "The developer agent is composing a reply…",
      "message.operations_unread": "Unread by operations agent",
      "message.operations_processing": "Read by operations agent, replying…",
      "message.operations_processing_active": "The operations agent is composing a reply…",
      "message.operations_replied": "Replied by operations agent",
      "message.waiting_recovery": "Read by developer agent; waiting for automatic recovery before replying…",
      "message.waiting_task": "Read by developer agent; waiting for the current task to finish before replying…",
      "message.waiting_quota": "Read by developer agent; waiting for the Claude Code quota to reset",
      "message.replied": "Replied by developer agent",
      "message.sending": "Sending…",
      "message.failed": "Send failed",
      "message.failed_reason": "Send failed: {reason}",
      "message.retry_send": "Send again",
      "message.waiting_persona": "Please wait. The developer agent is improving the app based on feedback from {name} (virtual user).",
      "message.waiting_current": "Please wait. The developer agent will prioritize your message after the current task.",
      "message.waiting_task_detail": "Please wait. {task} Your message will be prioritized afterward.",
      "message.waiting_retry": "Retrying now; your messages stay queued and will continue after recovery.",
      "message.waiting_paused": "The workflow is paused. Your message will be prioritized after resume.",
      "message.feedback": "Development feedback",
      "message.experience_reply": "Fix reply to virtual user",
      "message.experience_reply_aria": "Fix reply from the developer agent to a virtual user",
      "message.experience_report": "Virtual-user feedback",
      "message.experience_report_aria": "Experience issue reported by {sender}",
      "message.internal_test_report": "Test-agent feedback",
      "message.internal_test_report_aria": "Independent check result from the test agent",
      "message.real_user_insight": "Real-user feedback",
      "message.real_user_insight_aria": "Real-user analytics summarized by the operations agent",
      "message.real_user_reply": "Reply to operations agent",
      "message.real_user_reply_aria": "Developer optimization reply for real-user feedback",
      "message.status_updated": "Status updated",
      "media.original": "Open full image",
      "media.image": "Message image",
      "media.video": "Message video",
      "media.audio": "Message audio",
      "media.file": "File",
      "media.attachment": "Attachment",
      "media.open": "Open",
      "media.loading": "Loading image",
      "media.load_failed": "Image could not be loaded",
      "media.retry": "Reload",
      "media.more": "View {count} more",
      "media.collapse": "Collapse extra screenshots",
      "agents.title": "Agents",
      "agents.close": "Close agents",
      "agents.profile": "Agent profile",
      "agents.close_profile": "Close agent profile",
      "agents.select_app": "Select an app to view its agents",
      "agents.count_zero": "0 agents",
      "agents.count": "{count} agents",
      "agents.project_manager_section": "App-management agent · Default chat",
      "agents.developer_section": "Developer agent · Direct conversation",
      "agents.operations_section": "Operations agent · Direct conversation",
      "agents.owner_intent_section": "Requirement acceptance agent · Tries your goals",
      "agents.internal_test_section": "Test agent · Periodic feature checks",
      "agents.experience_section": "Virtual users for app experience and feedback",
      "agents.experience": "Virtual-user agent",
      "agents.internal_test_name": "Test agent",
      "agents.internal_test_role": "Regularly tries the current version and @mentions the developer when an issue appears",
      "agents.internal_test_object": "Checks whether key features work smoothly",
      "agents.internal_test_profile_kind": "Feature-checking agent",
      "agents.internal_test_responsibility": "Regularly opens the app, completes key actions, and tells the developer what failed and where it happened.",
      "agents.internal_test_authority": "May report issues and confirm whether fixes work.",
      "agents.owner_intent_name": "Requirement acceptance agent",
      "agents.owner_intent_role": "Tries the app against requirements you stated and @mentions you with the result",
      "agents.owner_intent_object": "Checks the goals you explicitly described",
      "agents.owner_intent_profile_kind": "Requirement acceptance agent (owner-intent simulation)",
      "agents.owner_intent_responsibility": "Uses the app against your stated features and feedback, then explains what is satisfied and what still needs improvement.",
      "agents.owner_intent_authority": "May report an acceptance result; you retain final release confirmation.",
      "agents.project_manager_name": "App-management agent",
      "agents.project_manager_role": "Orchestration · guides launch and operations",
      "agents.developer_role": "Developer",
      "agents.member": "Agent",
      "agents.implementation_role": "Implementation and validation",
      "agents.operations_role": "Data and operations",
      "agents.experience_role": "Target-user scenario testing",
      "agents.direct_object": "Your direct contact · {role}",
      "agents.records_only": "View only · {role}{records}",
      "agents.record_suffix": " · {count} experience records",
      "agents.profile_direct": "Your direct contact",
      "agents.profile_readonly": "Experience profile · Editable",
      "agents.profile_fixed": "Research virtual-user profile · Read only",
      "persona.add": "Add virtual user",
      "persona.edit": "Edit profile",
      "persona.delete": "Delete virtual user",
      "persona.save": "Save",
      "persona.create": "Create virtual user",
      "persona.segments": "Covered segments",
      "persona.segments_placeholder": "Comma-separated, e.g. students, early-career",
      "persona.task_script": "Trial steps (one per line)",
      "persona.test_account": "Test account",
      "persona.test_account_placeholder": "e.g. zhaoqiming",
      "persona.auth_notes": "Sign-in notes",
      "persona.auth_notes_placeholder": "Use the test account; do not register with a real phone number",
      "persona.initial_state": "Initial state",
      "persona.saved": "Virtual user saved",
      "persona.created": "Virtual user created",
      "persona.deleted": "Virtual user deleted",
      "persona.delete_confirm": "Delete this virtual user?",
      "persona.save_failed": "Could not save virtual user",
      "agents.records_count": "{count} experience records",
      "agents.persona_ready": "Ready to begin after the first version is complete",
      "agents.persona_testing": "Testing now; open the virtual-user profile when complete to view records",
      "agents.persona_creating": "Virtual-user profile (creating)",
      "agents.persona_creating_copy": "Generating a virtual-user profile for reference",
      "agents.persona_empty": "Virtual users will appear here when their profiles are ready",
      "agents.open_developer_profile": "{name}, your direct contact. Open profile.",
      "agents.open_project_manager_tab": "{name}. Go to the chat tab.",
      "agents.open_developer_tab": "{name}. Go to developer conversation.",
      "agents.open_internal_test_profile": "{name}. Open responsibilities.",
      "agents.open_operations_tab": "{name}. Go to operations conversation.",
      "agents.open_experience_profile": "{name}, view-only experience profile and records.",
      "profile.introduction": "Introduction",
      "profile.name": "Name",
      "profile.identity": "Role",
      "profile.responsibility": "Responsibility",
      "profile.authority": "Authority boundary",
      "profile.environment": "Environment",
      "profile.status": "Status",
      "profile.age": "Age",
      "profile.gender": "Gender",
      "profile.location": "Location",
      "profile.tech_level": "Technical proficiency",
      "profile.device": "Device",
      "profile.motivation": "Motivation",
      "profile.constraints": "Constraints",
      "profile.scenario": "Scenario",
      "profile.habits": "Habits",
      "profile.not_provided": "Not provided",
      "profile.experience_records": "Experience records",
      "profile.no_records": "No experience records yet. They will appear here when complete.",
      "profile.task_script": "Task script",
      "profile.test_account": "Test account",
      "profile.auth_notes": "Sign-in notes",
      "profile.not_generated": "Not generated yet",
      "profile.default_responsibility": "Implement requirements, validate the result, and deliver a candidate version.",
      "profile.default_environment": "Current app workspace",
      "profile.record_title": "Record from {sender}",
      "profile.empty_record": "This record has no additional content.",
      "profile.unnamed_step": "Untitled step",
      "profile.view_status": "View status",
      "upload.remove": "Remove {name}",
      "composer.send_failed": "The message was not sent. Use Send again below that message.",
      "upload.missing_id": "The file was uploaded, but the service did not return an attachment ID. Select it again.",
      "create.kicker": "New workflow",
      "create.title": "Create an app",
      "create.close": "Close app setup",
      "create.audience": "Who is it for?",
      "create.audience_placeholder": "For example: primary school English teachers",
      "create.type": "App type",
      "create.type_placeholder": "For example: lesson-planning web tool",
      "create.needs": "What should it solve?",
      "create.needs_placeholder": "For example: generate editable, leveled exercises and export a printable version",
      "create.coding_agent": "Local coding tool",
      "create.bridge_mode": "Claude Code upstream",
      "create.bridge_native_help": "Official CLI without a local proxy",
      "create.bridge_anyllm_help": "Route through whit3rabbit/anyllm-proxy",
      "create.bridge_help": "Applies only when Claude Code is selected. Codex always stays native.",
      "create.coding_help": "Availability is detected from this computer’s command line.",
      "create.workspace": "Workspace (computer path)",
      "create.workspace_placeholder": "For example: C:\\Users\\YourName\\Documents\\ExistingProject",
      "create.workspace_help": "Continue from the files already in this folder without creating another subfolder.",
      "create.workspace_browse": "Choose folder",
      "create.materials": "Detailed materials (optional)",
      "create.materials_add": "Choose files",
      "create.materials_help": "Select multiple files in any format. They will be passed to the coding tool unchanged.",
      "create.materials_remove": "Remove {name}",
      "create.materials_uploading": "Uploading materials…",
      "create.materials_upload_failed": "Could not upload “{name}”. Remove and select it again, or retry.",
      "create.intent_label": "Request sent to the workflow",
      "create.intent_default": "I want to build a suitable app for my target users that meets their core needs",
      "create.intent": "I want to build a {appType} app for {audience}. It needs to {needs}",
      "create.audience_default": "target users",
      "create.type_default": "suitable",
      "create.needs_default": "meet their core needs",
      "create.submit": "Start creating",
      "create.creating": "Creating…",
      "create.checking_system": "Checking the system environment. Please wait.",
      "create.choose_agent": "Choose an available local coding tool.",
      "create.created": "App workflow created.",
      "create.failed": "Could not create the app. Check the form and try again.",
      "workspace.not_found": "Path does not exist",
      "workspace.not_directory": "This path is not a folder",
      "workspace.invalid": "Enter a valid folder path on this computer",
      "workspace.unreadable": "Cannot read this folder. Check its permissions.",
      "workspace.edit": "Edit",
      "workspace.edit_kicker": "Project folder",
      "workspace.edit_title": "Change workspace",
      "workspace.edit_help": "After saving, the developer agent and operations scans will use the new project folder.",
      "workspace.save": "Save",
      "workspace.saving": "Saving…",
      "workspace.updated": "Workspace updated",
      "workspace.update_failed": "Could not update workspace",
      "workspace.update_blocked": "The workflow is running. Pause it before changing the workspace.",
      "coding_agent.edit": "Advanced args",
      "coding_agent.edit_kicker": "Coding CLI",
      "coding_agent.edit_title": "Coding advanced arguments",
      "coding_agent.edit_intro": "One argument per line. These are appended to the current Coding Agent command AppLooper runs. Leave blank for no extra flags.",
      "coding_agent.edit_title_current": "{agent} advanced arguments",
      "coding_agent.edit_intro_current": "One argument per line. These are appended to the {agent} command AppLooper runs. Leave blank for no extra flags.",
      "coding_agent.claude_label": "Claude Code extra arguments",
      "coding_agent.codex_label": "Codex extra arguments",
      "coding_agent.claude_placeholder": "For example:\n--max-budget-usd 20\n--max-turns 12",
      "coding_agent.codex_placeholder": "For example:\n--profile project",
      "coding_agent.save": "Save",
      "coding_agent.saving": "Saving…",
      "coding_agent.saved": "Coding advanced arguments saved.",
      "coding_agent.update_blocked": "The workflow is running. Stop it before changing coding arguments.",
      "coding_agent.update_failed": "Could not save coding advanced arguments.",
      "coding_agent.error_banner": "Coding failed: {summary}",
      "workspace_browser.kicker": "Remote computer",
      "workspace_browser.title": "Choose workspace folder",
      "workspace_browser.close": "Close folder picker",
      "workspace_browser.up": "Go to parent folder",
      "workspace_browser.loading": "Reading folders from your computer…",
      "workspace_browser.empty": "This folder has no subfolders",
      "workspace_browser.new_folder": "New folder",
      "workspace_browser.new_folder_label": "New folder name",
      "workspace_browser.new_folder_placeholder": "For example: My new app",
      "workspace_browser.create": "Create",
      "workspace_browser.creating": "Creating…",
      "workspace_browser.choose": "Choose this folder",
      "workspace_browser.load_failed": "Cannot read this folder. Check the computer path and its permissions.",
      "workspace_browser.retry": "Try again",
      "workspace_browser.create_failed": "Cannot create the folder. Check the name and permissions.",
      "workspace_browser.name_required": "Enter a folder name.",
      "pairing.kicker": "Remote phone access",
      "pairing.close": "Close phone connection",
      "pairing.title": "Connect a phone",
      "pairing.intro": "No Tailscale app is required. Open this HTTPS address in Safari, add it to your Home Screen, then enter the pairing code.",
      "pairing.url_label": "Phone access address",
      "pairing.copy_url": "Copy address",
      "pairing.url_help": "This is the public HTTPS address provided by this computer.",
      "pairing.generating": "Generating pairing code…",
      "pairing.refreshing": "Refreshing pairing code…",
      "pairing.copy_code": "Copy code",
      "pairing.refresh_code": "Refresh code",
      "pairing.regenerate": "Generate again",
      "pairing.generate_new": "Generate new code",
      "pairing.qr_alt": "Scan with your phone to open the workspace",
      "pairing.qr_caption": "Scan with your phone",
      "pairing.session_strong": "This phone stays signed in for 90 days after pairing. ",
      "pairing.session_copy": "Pair again only after clearing browser data, revoking access, or session expiry.",
      "pairing.revoke": "Revoke all phone sessions",
      "pairing.copied_url": "Phone address copied.",
      "pairing.copied_code": "Pairing code copied.",
      "pairing.expires_in": "Expires in {time}",
      "pairing.expired": "Expired. Generate a new pairing code.",
      "pairing.unavailable": "Unavailable",
      "pairing.revoking": "Revoking…",
      "pairing.revoked": "All phone sessions have been revoked.",
      "pairing.invalid_response": "The service did not return a valid 6-digit pairing code.",
      "pairing.url_unavailable": "The public HTTPS address is not ready yet. Refresh the pairing code shortly.",
      "pairing.generate_failed": "Could not generate a pairing code. Please try again.",
      "pairing.code_aria": "Pairing code {code}",
      "pairing.copy_failed": "Could not copy automatically. Touch and hold to copy manually.",
      "pairing.revoke_confirm": "Revoking access will require every paired phone to enter a new code. Continue?",
      "pairing.revoke_failed": "Could not revoke phone sessions. Please try again.",
      "network.title": "Phone connection check",
      "network.idle": "Run this check on the computer if the phone cannot open the address.",
      "network.check": "Check connection",
      "network.checking": "Checking direct access and the system proxy…",
      "network.healthy": "Connection is healthy. Open the address above on your phone.",
      "network.repair_available": "The system proxy is blocking access. AppLooper can route only *.ts.net directly.",
      "network.unreachable": "Direct access also failed. Check Tailscale, the network, and whether the computer is asleep.",
      "network.unavailable": "The public address is not ready yet.",
      "network.repair": "Fix connection",
      "network.restore": "Restore settings",
      "network.repair_confirm": "This adds *.ts.net to Windows proxy exceptions without disabling or replacing your proxy. The previous value is stored in the private local config and can be restored. Continue?",
      "network.restore_confirm": "Restore the Windows proxy exceptions saved before AppLooper changed them?",
      "network.repaired": "Connection fixed. Reopen or refresh the browser.",
      "network.restored": "The previous proxy exceptions have been restored.",
      "network.failed": "The connection check or repair failed. Try again.",
      "compat.title": "Coding compatibility",
      "compat.legend": "Claude Code upstream mode",
      "compat.idle": "Choose whether Claude Code uses the official API or a local anyllm-proxy. Codex always stays native.",
      "compat.refresh": "Refresh status",
      "compat.save": "Save settings",
      "compat.saved": "Compatibility settings saved.",
      "compat.failed": "Could not load or save compatibility settings.",
      "compat.mode.native": "Native Claude / Codex",
      "compat.mode.auto": "Auto (prefer anyllm-proxy)",
      "compat.mode.anyllm": "anyllm-proxy only",
      "compat.status.native": "Active: native Claude Code / Codex",
      "compat.status.anyllm_proxy": "Active: anyllm-proxy ({label})",
      "compat.status.legacy_litellm": "Active: legacy LiteLLM bridge ({label})",
      "compat.status.anyllm_missing": "anyllm-proxy is selected but no local registration was found. Run Start-AppLooperAnyLLMProxy.ps1.",
      "compat.status.auto_native": "Auto mode: no proxy registered, using native Claude Code",
      "compat.switch_app": "Switch upstream",
      "compat.app_title": "Switch Claude Code upstream",
      "compat.app_intro": "Choose whether this app uses the official Claude Code API or a local anyllm-proxy. Stop and resume the workflow after saving.",
      "compat.app_saved": "App upstream settings saved.",
      "llm.title": "Custom LLM upstream",
      "llm.help": "Saved locally for anyllm-proxy only; never stored in Git or workflow state.",
      "llm.preset": "Preset",
      "llm.custom": "Custom OpenAI-compatible",
      "llm.base_url": "Upstream base URL",
      "llm.api_key": "API key",
      "llm.model": "Model",
      "llm.listen_port": "Local proxy port",
      "llm.proxy_note": "After saving, ensure anyllm-proxy is running on this computer.",
      "llm.key_configured": "Configured key {hint}; leave blank to keep it",
      "llm.key_required": "An API key is required for anyllm-proxy (or must already be saved on this machine).",
      "llm.next_steps": "Settings saved. Run integrations/anyllm-proxy/Start-AppLooperAnyLLMProxy.ps1, then stop and resume the workflow.",
      "status.created": "Created",
      "status.starting": "Starting",
      "status.resume_requested": "Resuming",
      "status.running": "In progress",
      "status.waiting_user": "Waiting for confirmation",
      "status.paused": "Paused",
      "status.paused_error": "Paused after an error",
      "status.paused_safety": "Paused for safety",
      "status.offline": "Process stopped",
      "status.background": "Working in background",
      "status.retrying_error": "Retrying",
      "status.recovering": "Retrying",
      "retry.context_too_large": "Development context is too large",
      "retry.provider_protocol_incompatible": "The local proxy is incompatible with Claude Code multi-turn tool calls",
      "retry.rate_limited": "Development service is busy",
      "retry.coding_agent_quota_exhausted": "Claude Code usage limit reached",
      "retry.command_line_too_long": "Launch parameters are too long",
      "retry.timeout": "Development response timed out",
      "retry.invalid_result_format": "Development result format is invalid",
      "retry.invalid_result_detail": "The development result did not pass the platform format check. Project progress is preserved and AppLooper will retry automatically.",
      "retry.background_step_detail": "The developer agent could not finish this turn. Project progress is preserved and AppLooper will retry automatically.",
      "retry.invalid_experience_summary": "Experience summary format is invalid",
      "retry.background_step_failed": "Background development step failed",
      "retry.countdown": "Retrying · next attempt in {time}",
      "retry.now": "Retrying · next attempt soon",
      "retry.recovering_line": "Retrying · {countdown} · {reason}",
      "retry.recovering_hint": "The last step did not finish; AppLooper will retry automatically and your progress is preserved.",
      "retry.rotated": "switched to a new session",
      "status.delivered": "Delivered",
      "status.stopped": "Stopped",
      "status.unknown": "Unknown status",
      "phase.PLAN": "Planning",
      "phase.DEVELOP": "Development",
      "phase.REVIEW": "Review",
      "phase.EXPERIENCE": "Experience testing",
      "phase.WAIT_USER": "Waiting for confirmation",
      "phase.DELIVER": "Delivery",
      "phase.DELIVERED": "Follow-up",
      "phase.REPLAY": "Regression testing",
      "phase.STOPPED": "Stopped",
      "header.current": "Current: {phase}",
      "header.updated": "Updated {time}",
      "header.auto_refresh": "Status refreshes automatically",
      "workflow.resume": "Resume",
      "workflow.stop": "Stop",
      "workflow.confirm_stop": "Stop this workflow? Saved progress will remain available so you can resume later.",
      "workflow.checking": "Checking…",
      "workflow.stopping": "Stopping…",
      "workflow.resuming": "Resuming…",
      "workflow.resumed": "Workflow resumed.",
      "workflow.resume_accepted": "Resume request accepted; waiting for the background process to take over.",
      "workflow.stop_requested": "Workflow stop requested.",
      "workflow.resume_failed": "Could not resume the workflow. Please try again.",
      "workflow.stop_failed": "Could not stop the workflow. Please try again.",
      "workflow.resume_title": "The background process is not running. Resume from saved progress.",
      "time.today": "Today",
      "time.yesterday": "Yesterday",
      "time.just_now": "Just now",
      "time.minutes_ago": "{count} min ago",
      "time.hours_ago": "{count} hr ago"
    }
  };

  const I18N = window.AppLooperI18n;
  if (!I18N) throw new Error("AppLooper i18n component failed to load");
  I18N.configure(TRANSLATIONS);

  const STATUS_LABEL_KEYS = {
    created: "status.created",
    starting: "status.starting",
    resume_requested: "status.resume_requested",
    running: "status.running",
    waiting_user: "status.waiting_user",
    paused: "status.paused",
    paused_error: "status.paused_error",
    paused_safety: "status.paused_safety",
    retrying_error: "status.retrying_error",
    delivered: "status.delivered",
    delivered_listening: "status.delivered",
    stopped: "status.stopped",
  };

  const PHASE_LABEL_KEYS = {
    PLAN: "phase.PLAN",
    DEVELOP: "phase.DEVELOP",
    REVIEW: "phase.REVIEW",
    EXPERIENCE: "phase.EXPERIENCE",
    WAIT_USER: "phase.WAIT_USER",
    DELIVER: "phase.DELIVER",
    DELIVERED: "phase.DELIVERED",
    REPLAY: "phase.REPLAY",
    STOPPED: "phase.STOPPED",
  };

  const MESSAGE_PAGE_SIZE = 24;
  const HOME_SCREEN_TIP_DISMISSED_KEY = "applooper.home-screen-tip-dismissed.v1";

  const dom = {};
  const state = {
    locale: readStoredLocale(),
    apps: [],
    currentId: readStoredAppId(),
    initialTab: readInitialTabFromUrl(),
    conversationTabRestored: false,
    current: null,
    system: null,
    systemLoading: true,
    systemRequest: null,
    systemRetryTimer: null,
    systemRetryDelay: 3_000,
    systemErrorShown: false,
    pendingFiles: [],
    createMaterials: [],
    createUploadToken: "",
    workspaceFieldTarget: "create",
    workspaceSaving: false,
    workspaceBrowserPath: "",
    workspaceBrowserParent: "",
    workspaceBrowserBusy: false,
    workspaceBrowserCreating: false,
    outgoingMessages: new Map(),
    detailRequest: 0,
    liveSyncRunning: false,
    liveRevisions: new Map(),
    pendingMessageTarget: new URLSearchParams(window.location.search).get("message") || "",
    experienceConversationRequest: 0,
    experienceConversationLoading: false,
    experienceConversationError: false,
    experienceConversationLoadingFor: "",
    experienceConversationLastLoadedAt: new Map(),
    sending: false,
    creating: false,
    experienceSurfaceCreating: false,
    experienceSurfacePreparing: false,
    surfacePreparationStarting: false,
    surfacePreparationAttempted: new Set(),
    surfacePreparationSyncInFlight: false,
    surfacePreparationContract: null,
    surfacePreparationPollTimer: null,
    workflowAction: false,
    renderedAppId: null,
    renderedConversationView: "",
    chatView: usesDirectDeveloperStudyConversation() ? "developer" : "main",
    experienceFilter: "",
    chatScrollPositions: new Map(),
    messageRenderLimits: new Map(),
    chatScrollRevision: 0,
    forceChatBottom: false,
    tabSwipeStart: null,
    experienceTwinOpen: false,
    launchOpen: false,
    growthOpen: false,
    growthToolsOpen: false,
    operations: null,
    operationsLoading: false,
    releaseReviewBusy: false,
    releaseVerifyPending: null,
    releaseVerifyEngagement: { itemId: "", ops: 0, startedAt: 0, dwellTimer: 0 },
    releaseVerifyEngagementBound: false,
    releaseScenarioSession: null,
    eufrSelectedThemeId: "",
    personaEditing: false,
    personaEditId: "",
    personaSaving: false,
    operationsRefreshing: false,
    operationsRequest: 0,
    operationsConversationFingerprint: "",
    operationsConversationStickToBottom: false,
    operationsSkillKind: "deployment",
    operationsSkillBusy: false,
    operationsSkillConfigMode: "simple",
    operationsSkillItems: [],
    operationsSkillUserEdited: false,
    operationsSkillGeneration: { analytics: null, traffic: null, feedback: null },
    operationsSkillGenerationPollTimer: null,
    operationsSkillAutoGenerateAttempted: { analytics: false, feedback: false, traffic: false },
    operationsBoardRefreshing: { feedback: false, analytics: false, traffic: false },
    operationsSourceDetailId: "",
    operationsSourceAuthorizationBusy: false,
    operationsGuidedSetup: {
      kind: "",
      sourceId: "",
      stepIndex: 0,
      answers: {},
      recommendations: {},
      reasons: {},
      busy: false,
      loading: false,
      prefilled: false,
    },
    experienceTwin: null,
    experienceTwinAppId: "",
    experienceTwinLoading: false,
    experienceTwinRequest: 0,
    experienceTwinViewId: "",
    experienceTwinScaleMode: "fit",
    experienceTwinRenderKey: "",
    experienceTwinFreshEntry: "",
    experienceTwinFetchedAt: 0,
    experienceTwinReconnectKey: "",
    experienceTwinReconnecting: false,
    experienceTwinPreviewUrl: "",
    experienceTwinPreviewReadyListener: null,
    experienceTwinPreviewReadyTimer: null,
    experienceTwinDetailFingerprint: "",
    experienceTwinResizeObserver: null,
    trialSandboxFocus: null,
    trialSandboxBusy: false,
    trialFeedbackBusy: false,
    remoteExperience: null,
    remoteExperienceSession: null,
    remoteExperienceError: null,
    remoteExperienceStarting: false,
    remoteExperienceExpiredRecovered: false,
    remoteExperiencePollTimer: null,
    remoteExperienceCatalogRequest: 0,
    remoteExperienceSessionStartRequest: 0,
    remoteExperienceSessionPollRequest: 0,
    remoteExperienceStartKey: "",
    remoteExperienceRfb: null,
    remoteExperienceRfbModule: null,
    remoteExperienceRfbModulePromise: null,
    remoteExperienceRfbRequest: 0,
    remoteExperienceConnected: false,
    remoteExperienceRfbConnectTimer: null,
    remoteExperienceRfbFirstFrameTimer: null,
    remoteExperienceRfbReconnectTimer: null,
    remoteExperienceRfbReconnectAttempts: 0,
    remoteExperienceKeyboardOpen: false,
    remoteExperienceKeyboardComposing: false,
    remoteExperienceKeyboardSuppressInput: "",
    remoteDisplayServiceBusy: false,
    remoteDisplayServiceStatus: null,
    remoteDisplayServiceTimer: null,
    refreshTimer: null,
    listRefreshTimer: null,
    retryCountdownTimer: null,
    installPrompt: null,
    memberIndex: new Map(),
    unavailableCodingAgents: new Set(),
    access: null,
    accessRequest: 0,
    accessReconnectTimer: null,
    workspaceStarted: false,
    accessVerifying: false,
    pairingCode: "",
    pairingExpiresAt: 0,
    pairingTimer: null,
    pairingBusy: false,
    notificationBusy: false,
    notificationStatus: null,
    notificationSubscription: null,
    notificationEnabled: false,
    serviceWorkerPromise: null,
    developerMessageBaselines: new Map(),
    lastMainConversationFingerprint: "",
    lastAppListFingerprint: "",
    tabReadState: readTabReadState(),
    developerSessionOpen: false,
    developerSessionTimer: null,
    developerSessionRequest: 0,
    developerSessionEntries: [],
    developerSessionLiveEntries: [],
    developerSessionRenderedIds: new Set(),
    developerSessionCursor: 0,
    developerSessionId: "",
    developerSessionAgentId: "developer",
    developerSessionAgentName: "",
    developerSessionPollAfter: 2_000,
    repositoryBusy: false,
    repositoryCommitGenerating: false,
    repositoryEditing: false,
    repositoryShortcutsOpen: false,
    repositoryRefreshing: false,
    repositoryDialogOpen: false,
    repositoryDialogGuardTimer: null,
    deferredAppRender: false,
    viewportFrame: 0,
    serviceWorkerReloading: false,
  };

  class ApiError extends Error {
    constructor(message, status = 0, payload = null) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.payload = payload;
    }
  }

  function readStoredLocale() {
    return I18N.getLocale();
  }

  function readTabReadState() {
    try {
      const value = JSON.parse(localStorage.getItem(TAB_READ_STORAGE_KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function saveTabReadState() {
    try {
      localStorage.setItem(TAB_READ_STORAGE_KEY, JSON.stringify(state.tabReadState));
    } catch {
      // Unread state is a device-local convenience; storage failures are non-fatal.
    }
  }

  function t(key, variables = {}) {
    return I18N.text(key, state.locale, variables);
  }

  function localizedField(source, name, fallback = "") {
    const value = I18N.field(source, name, state.locale, fallback);
    if (state.locale !== "en" || !I18N.containsCjk(value)) return value;
    return I18N.containsCjk(fallback) ? "" : fallback;
  }

  function localizedFirstField(source, names, fallback = "") {
    for (const name of names) {
      const value = localizedField(source, name);
      if (value) return value;
    }
    return fallback;
  }

  function isUserAuthoredMessage(message) {
    const direction = firstText(message?.direction).toLowerCase();
    const actor = firstText(message?.actor, message?.role, message?.sender_type, message?.source).toLowerCase();
    return direction === "inbound" || direction === "user" || ["user", "owner", "human"].includes(actor);
  }

  function localizedPersonaField(persona, names, fallback = "") {
    return localizedFirstField(persona, names, fallback);
  }

  function localizedPersonaName(persona, fallback = "") {
    return localizedPersonaField(persona, ["name", "display_name"], fallback);
  }

  function localizedArrayField(source, name, itemFields = ["label", "text", "title"]) {
    const localized = source?.[`${name}_i18n`];
    let values;
    if (localized && typeof localized === "object" && !Array.isArray(localized)) {
      const selected = localized[state.locale] ?? (state.locale === "en" ? localized["en-US"] : localized.zh);
      values = Array.isArray(selected) ? selected : [];
    } else {
      values = Array.isArray(source?.[name]) ? source[name] : [];
    }
    if (state.locale !== "en") return values;
    return values.filter((item) => {
      const copy = typeof item === "string"
        ? I18N.resolvePair(item, state.locale, "")
        : localizedFirstField(item, itemFields, firstText(item?.value, item?.id, item?.key));
      return Boolean(copy) && !I18N.containsCjk(copy);
    });
  }

  function applyStaticTranslations() {
    document.documentElement.lang = state.locale;
    document.title = t("meta.title");
    const mappings = [
      ["data-i18n", "textContent"],
      ["data-i18n-placeholder", "placeholder"],
      ["data-i18n-aria-label", "aria-label"],
      ["data-i18n-title", "title"],
      ["data-i18n-alt", "alt"],
      ["data-i18n-content", "content"],
    ];
    mappings.forEach(([attribute, property]) => {
      document.querySelectorAll(`[${attribute}]`).forEach((node) => {
        const value = t(node.getAttribute(attribute));
        if (property === "textContent") node.textContent = value;
        else node.setAttribute(property, value);
      });
    });
    [
      [".is-version", "icon.version"],
      [".is-launch-skill", "icon.launch"],
      [".is-feedback-skill", "icon.feedback"],
      [".is-analytics-skill", "icon.analytics"],
      [".is-traffic-skill", "icon.traffic"],
      ["#developerChannel .composer-target-avatar", "icon.developer"],
      ["#operationsChannel .composer-target-avatar", "icon.operations"],
    ].forEach(([selector, key]) => {
      document.querySelectorAll(selector).forEach((node) => {
        node.textContent = t(key);
      });
    });
    document.querySelectorAll("[data-language]").forEach((button) => {
      const active = button.dataset.language === state.locale;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  async function syncUiLocale(runId = state.currentId, locale = state.locale) {
    if (!runId) return;
    try {
      await request(`/apps/${encodeURIComponent(runId)}/ui-locale`, {
        method: "POST",
        json: { locale: locale === "en" ? "en" : "zh-CN" },
      });
    } catch {
      // Prompt locale sync is best-effort; agent turns fall back to zh-CN.
    }
  }

  function bindLanguageEvents() {
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.addEventListener("click", async () => {
        const locale = button.dataset.language;
        if (!TRANSLATIONS[locale] || locale === state.locale) return;
        I18N.setLocale(locale);
        await syncUiLocale(state.currentId, locale);
        window.location.reload();
      });
    });
  }

  let bootStarted = false;
  let bootInProgress = false;

  function startBoot() {
    if (bootStarted) return;
    bootStarted = true;
    // If boot.js was the only bundle rejected by a legacy worker, app.js can
    // still cancel the markup-only migration refresh and continue normally.
    document.getElementById("bootRefreshFallback")?.remove();
    const shellVersion = String(window.__APPLOOPER_SHELL_VERSION__ || "");
    if (shellVersion && shellVersion !== SERVICE_WORKER_VERSION) {
      const attempted = new URL(window.location.href).searchParams.get("boot_refresh") === SERVICE_WORKER_VERSION;
      let dialogSessionActive = false;
      try {
        dialogSessionActive = Boolean(sessionStorage.getItem(REPOSITORY_DIALOG_SESSION_KEY));
      } catch {
        dialogSessionActive = false;
      }
      if (!attempted && !dialogSessionActive && typeof window.__APPLOOPER_RECOVER_BOOT__ === "function") {
        void window.__APPLOOPER_RECOVER_BOOT__(SERVICE_WORKER_VERSION);
        return;
      }
      // The downloaded bundle can still run against this compatible shell.
      // After one bounded refresh attempt, continue instead of permanently
      // blocking local and remote clients on a generation mismatch.
    }
    void init().catch(handleBootFailure);
  }

  let prebootResumeBusy = false;

  async function resumePrebootIfNeeded() {
    if (bootInProgress || window.__APPLOOPER_BOOT_COMPLETE__) return;
    const gate = document.getElementById("accessGate");
    const unavailable = document.getElementById("accessUnavailable");
    const unavailableVisible = Boolean(unavailable && !unavailable.hidden);
    if (
      prebootResumeBusy
      || window.__APPLOOPER_BOOT_COMPLETE__
      || !gate
      || gate.hidden
      || (!gate.classList.contains("is-loading") && !unavailableVisible)
    ) return;
    prebootResumeBusy = true;
    try {
      if (!dom.accessGate) collectDom();
      clearAccessReconnectTimer();
      const canEnter = await loadAccessStatus({ scheduleReconnect: unavailableVisible });
      if (canEnter) await startWorkspace();
      else if (unavailableVisible) scheduleAccessReconnect();
    } finally {
      prebootResumeBusy = false;
    }
  }

  // iOS may freeze a Home Screen web app in the middle of its first request.
  // When that page is restored, retry only the small access handshake instead
  // of waiting for a suspended promise or forcing the user to kill the app.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) void resumePrebootIfNeeded();
  });
  window.addEventListener("online", () => void resumePrebootIfNeeded());
  window.addEventListener("applooper-study-protocol-change", () => {
    if (!state.current) return;
    renderMembers();
    renderMessages({ force: true });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void resumePrebootIfNeeded();
  });

  // Defer normally runs before DOMContentLoaded.  The readyState fallback also
  // covers a restored iOS standalone page whose document event already fired.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startBoot, { once: true });
  } else {
    startBoot();
  }

  async function init() {
    window.__APPLOOPER_INIT_STARTED__ = true;
    bootInProgress = true;
    try {
    collectDom();
    setupViewportMetrics();
    applyStaticTranslations();
    bindLanguageEvents();
    bindAccessEvents();
      if (isLocalWorkspaceOrigin()) {
        state.access = { local: true, authenticated: true, trusted_local: true, optimistic: true };
        rememberAccessSession();
        hideAccessGate();
        try {
          await startWorkspace();
        } catch (error) {
          window.__APPLOOPER_LAST_BOOT_ERROR__ = String(error?.stack || error?.message || error);
          showAccessView("unavailable", friendlyError(error, t("access.unavailable_copy")));
          throw error;
        }
        void loadAccessStatus({ scheduleReconnect: true, silent: true }).then((canEnter) => {
          if (!canEnter) void revalidateAccessInBackground({ scheduleReconnect: true });
        });
        return;
      }
      let canEnter = await loadAccessStatus({ scheduleReconnect: true });
      if (!canEnter && (state.access?.local || state.access?.authenticated)) {
        canEnter = true;
      }
    if (canEnter) await startWorkspace();
    } finally {
      bootInProgress = false;
    }
  }

  function handleBootFailure(error) {
    state.workspaceStarted = false;
    state.access = null;
    const message = friendlyError(error, t("access.unavailable_copy"));
    if (dom.accessUnavailableText && dom.accessGate) {
      dom.accessUnavailableText.textContent = hadRecentAccessSession()
        ? t("access.reconnecting_copy")
        : message;
      showAccessView("unavailable");
      scheduleAccessReconnect();
      return;
    }

    // Never leave the static splash screen spinning forever after a partial
    // script download or an unexpected initialization error.
    const checking = document.getElementById("accessChecking");
    const unavailable = document.getElementById("accessUnavailable");
    const unavailableText = document.getElementById("accessUnavailableText");
    const gate = document.getElementById("accessGate");
    if (gate) {
      gate.classList.remove("is-loading");
      gate.dataset.bootTimedOut = "true";
    }
    if (checking) checking.hidden = true;
    if (unavailable) unavailable.hidden = false;
    if (unavailableText) unavailableText.textContent = message;
  }

  async function startWorkspace() {
    if (state.workspaceStarted) return;
    state.workspaceStarted = true;
    try {
      bindEvents();
      setupConnectivity();
      setupParticipantObjectiveTelemetry();
      setupInstallExperience();
      updateIntentPreview();
      renderCodingAgentOptions();
      updateCreateAvailability();
      updateComposer();
      autosizeMessageInput();
    } catch (error) {
      state.workspaceStarted = false;
      throw error;
    }

    const explicitStudyChoice = requiresExplicitStudyWorkflowChoice();
    if (explicitStudyChoice) {
      state.currentId = "";
      state.current = null;
      storeCurrentAppId("");
    }
    const restored = explicitStudyChoice ? false : restoreDevelopmentCache();
    if (restored) {
      try {
        renderCurrentApp();
        restoreConversationTabIfNeeded();
      } catch (error) {
        const cachedId = state.currentId;
        state.current = null;
        clearDevelopmentCache(cachedId);
      }
    }

    const storedId = state.currentId;
    const appListPromise = loadApps({
      initial: !restored,
      silent: true,
      loadDetail: false,
      timeoutMs: APP_LIST_BOOT_TIMEOUT_MS,
    });
    const developmentPromise = storedId
      ? loadDevelopmentApp({ silent: restored, timeoutMs: DEVELOPMENT_BOOT_TIMEOUT_MS })
      : appListPromise.then(() => state.currentId
          ? loadDevelopmentApp({ silent: false, timeoutMs: DEVELOPMENT_BOOT_TIMEOUT_MS })
          : undefined);

    // Access has already succeeded, so never keep an installed PWA behind the
    // full-screen splash while /apps or a large conversation is still loading.
    // The app list and conversation have their own recoverable loading/error UI.
    hideAccessGate();
    void registerServiceWorker();

    await appListPromise;
    await developmentPromise;
    restoreConversationTabIfNeeded();

    if (!state.current && state.currentId && state.currentId !== storedId) {
      await loadDevelopmentApp({ silent: false, timeoutMs: DEVELOPMENT_BOOT_TIMEOUT_MS });
    }

    // Coding-tool detection and push capability are useful, but neither should
    // hold the user's development conversation behind a loading screen.
    window.setTimeout(() => {
      if (state.currentId) void loadCurrentApp({ silent: true });
      void loadSystem({ silent: true });
      void loadNotificationStatus({ silent: true });
    }, 0);
    startRefreshTimers();
    void restoreRepositoryDialogSessionIfNeeded();
  }

  function collectDom() {
    [
      "accessGate",
      "accessChecking",
      "accessForm",
      "accessCodeInput",
      "accessError",
      "accessSubmitButton",
      "accessSuccess",
      "enterWorkspaceButton",
      "accessUnavailable",
      "accessUnavailableText",
      "accessRetryButton",
      "offlineBanner",
      "claudeWarning",
      "workspace",
      "appsPanel",
      "appList",
      "connectionDot",
      "connectionText",
      "installButton",
      "drawerInstallButton",
      "homeScreenTip",
      "homeScreenTipAction",
      "dismissHomeScreenTipButton",
      "openCreateButton",
      "emptyCreateButton",
      "openAppsButton",
      "openMembersButton",
      "membersPanel",
      "notificationSetting",
      "notificationToggle",
      "notificationState",
      "notificationHelp",
      "notificationPromptButton",
      "notificationPromptLabel",
      "notificationComposerHelp",
      "memberCount",
      "memberList",
      "memberListFooter",
      "appTitle",
      "statusBadge",
      "phaseLine",
      "phaseText",
      "engineSeparator",
      "engineText",
      "updatedText",
      "workspaceLine",
      "workspaceText",
      "editWorkspaceButton",
      "editCodingAgentButton",
      "codingAgentErrorLine",
      "codingAgentErrorText",
      "workflowActionButton",
      "openExperienceTwinButton",
      "conversationTabs",
      "mainConversationTab",
      "mainConversationUnread",
      "experienceConversationTab",
      "experienceConversationCount",
      "experienceConversationUnread",
      "experienceTwinTab",
      "experienceTwinUnread",
      "launchTab",
      "launchUnread",
      "downloadSourceExportButton",
      "growthTab",
      "growthUnread",
      "experienceTwinPage",
      "experienceTwinBody",
      "addExperienceSurfaceButton",
      "closeExperienceTwinButton",
      "experienceTwinSummary",
      "experienceTwinShared",
      "experienceTwinViews",
      "experienceTwinControls",
      "experienceTwinSize",
      "experienceTwinFitButton",
      "experienceTwinActualButton",
      "experienceTwinFullscreenButton",
      "experienceTwinFullscreenOverlayButton",
      "experienceTwinLaser",
      "experienceTwinVerifyBubble",
      "experienceTwinVerifyCopy",
      "experienceTwinVerifySurfaceHint",
      "experienceTwinVerifyDone",
      "releaseVerifyVerdictDialog",
      "releaseVerifyVerdictTitle",
      "releaseVerifyVerdictItem",
      "releaseVerifyFailNote",
      "releaseVerifyPassButton",
      "releaseVerifyFailButton",
      "closeReleaseVerifyVerdictButton",
      "experienceTwinKeyboardButton",
      "experienceTwinImeBridge",
      "experienceTwinImeDrag",
      "experienceTwinKeyboardInput",
      "experienceTwinImeSendButton",
      "experienceTwinImeStatus",
      "reloadExperienceTwinButton",
      "openExperienceTwinWindowButton",
      "stopExperienceTwinButton",
      "experienceTwinHistory",
      "experienceTwinHistoryTitle",
      "experienceTwinHistoryCount",
      "experienceTwinHistoryList",
      "experienceTwinFidelity",
      "experienceTwinFidelityTitle",
      "experienceTwinFidelityCopy",
      "experienceTwinLocalAccess",
      "experienceTwinStage",
      "experienceTwinState",
      "experienceTwinFrames",
      "trialSandboxPanel",
      "trialSandboxInput",
      "trialSandboxConfigureButton",
      "trialSandboxStatus",
      "trialFeedbackBox",
      "trialFeedbackInput",
      "trialFeedbackSendButton",
      "validationRecordsButton",
      "launchPage",
      "growthPage",
      "growthToolsToggle",
      "growthToolsPanel",
      "growthToolsCloseButton",
      "developerComposerTarget",
      "growthComposerTarget",
      "launchChecklist",
      "launchChecklistSteps",
      "launchChecklistPrefill",
      "launchChecklistPrefillList",
      "launchChecklistAction",
      "launchAutoToggle",
      "releaseReviewPanel",
      "releaseReviewTitle",
      "releaseReviewCopy",
      "releaseReviewGate",
      "releaseReviewSnapshot",
      "releaseReviewSnapshotTitle",
      "releaseReviewSnapshotCandidate",
      "releaseAcceptanceBrief",
      "releaseAcceptanceBriefPersona",
      "releaseAcceptanceBriefFinding",
      "releaseAcceptanceBriefChange",
      "releaseAcceptanceBriefCheck",
      "releaseAcceptanceBriefScreenshotButton",
      "releaseAcceptanceBriefScreenshot",
      "releaseAcceptanceBriefScreenshotEmpty",
      "releaseAcceptanceBriefGate",
      "releaseAcceptanceBriefStopRule",
      "releaseReviewSnapshotVerified",
      "releaseReviewSnapshotJudgment",
      "releaseReviewSnapshotPaths",
      "releaseReviewSnapshotProvenance",
      "releaseReviewSnapshotScope",
      "releaseReviewEvidenceDetails",
      "releaseReviewSections",
      "ownerProxyReview",
      "ownerProxyTitle",
      "ownerProxyProfile",
      "ownerProxyReceipts",
      "ownerProxyBypassButton",
      "releaseScenarioSession",
      "releaseScenarioTitle",
      "releaseScenarioStatus",
      "releaseScenarioProvenance",
      "releaseScenarioCleanup",
      "releaseScenarioInteractedButton",
      "releaseScenarioPassButton",
      "releaseScenarioReturnButton",
      "releaseReviewAttestationBlock",
      "releaseReviewAttestationHint",
      "releaseReviewAttestationLabel",
      "releaseReviewAttestationExpected",
      "releaseReviewAttestationInput",
      "releaseReviewConfirmButton",
      "releaseFinalVerdictPanel",
      "releaseFinalVerdictTitle",
      "releaseFinalVerdictHint",
      "releaseFinalPassButton",
      "releaseFinalFailButton",
      "releaseFinalConfirmDialog",
      "releaseFinalConfirmTitle",
      "releaseFinalConfirmCopy",
      "releaseFinalConfirmChoice",
      "releaseFinalConfirmCountNum",
      "releaseFinalConfirmCountdown",
      "releaseFinalConfirmButton",
      "releaseFinalThinkButton",
      "releaseReviewGuideButton",
      "releaseReviewDeferButton",
      "releaseReviewCommunityPublishButton",
      "feedbackPanel",
      "operationsFeedbackSkillCard",
      "operationsFeedbackSkillName",
      "operationsFeedbackSkillStatus",
      "operationsFeedbackSkillEditButton",
      "feedbackActivationStatus",
      "feedbackActivationList",
      "feedbackActivationActions",
      "feedbackBoardRefreshButton",
      "feedbackHub",
      "feedbackSummary",
      "feedbackSummaryEmpty",
      "eufrThemeCount",
      "eufrThemeList",
      "eufrEmpty",
      "feedbackCollectionStatus",
      "eufrDrawer",
      "eufrDrawerTitle",
      "eufrDrawerBody",
      "eufrDrawerCloseButton",
      "operationsDeployButton",
      "projectSecretsButton",
      "projectSecretsDialog",
      "projectSecretsForm",
      "projectAgnesApiKeyInput",
      "projectAgnesApiKeyStatus",
      "projectSecretsError",
      "closeProjectSecretsButton",
      "cancelProjectSecretsButton",
      "saveProjectSecretsButton",
      "operationsVersion",
      "operationsVersionCopy",
      "operationsRelease",
      "operationsReleaseTitle",
      "operationsReleaseCopy",
      "operationsReleaseAction",
      "operationsHistory",
      "operationsHistoryCount",
      "operationsHistoryList",
      "operationsLaunchSkillCard",
      "operationsLaunchSkillName",
      "operationsLaunchSkillStatus",
      "operationsLaunchSkillEditButton",
      "operationsAnalyticsSkillCard",
      "operationsAnalyticsSkillName",
      "operationsAnalyticsSkillStatus",
      "operationsAnalyticsSkillEditButton",
      "analyticsActivationActions",
      "analyticsBoardRefreshButton",
      "operationsTrafficSkillCard",
      "operationsTrafficSkillName",
      "operationsTrafficSkillStatus",
      "operationsTrafficSkillEditButton",
      "trafficActivationStatus",
      "trafficActivationList",
      "trafficActivationActions",
      "trafficBoardRefreshButton",
      "operationsTrafficPanel",
      "operationsTrafficSummary",
      "operationsTrafficStatus",
      "operationsTrafficPlatforms",
      "operationsTrafficEmpty",
      "operationsAgentStatusButton",
      "developerRepositoryButton",
      "operationsDashboard",
      "operationsDashboardTitle",
      "operationsDashboardCopy",
      "operationsDashboardStatus",
      "operationsMetricGrid",
      "operationsMetricUsers",
      "operationsMetricActive",
      "operationsMetricRetention",
      "operationsMetricCurrentVersion",
      "operationsTrendPanel",
      "operationsTrendEmpty",
      "operationsTrendChart",
      "operationsVersionPanel",
      "operationsVersionEmpty",
      "operationsVersionList",
      "operationsAnomalyPanel",
      "operationsAnomalyEmpty",
      "operationsAnomalyList",
      "developerChannel",
      "developerChannelAvatar",
      "developerChannelTitle",
      "developerChannelCopy",
      "developerChannelBadge",
      "internalTestAnalysis",
      "internalTestAnalysisSummary",
      "internalTestAnalysisTrails",
      "testMaintainerResults",
      "testMaintainerSummary",
      "experienceFilters",
      "chatStream",
      "welcomeState",
      "pendingStrip",
      "pendingTitle",
      "pendingSummary",
      "replyPendingButton",
      "composer",
      "composerRow",
      "composerAttachButton",
      "developerSessionStatusButton",
      "uploadPreview",
      "attachmentInput",
      "messageInput",
      "sendButton",
      "replyContext",
      "sendHint",
      "drawerBackdrop",
      "iosInstallGuideDialog",
      "closeIosInstallGuideButton",
      "dismissIosInstallGuideButton",
      "confirmIosInstallGuideButton",
      "developerSessionDialog",
      "developerSessionTitle",
      "developerSessionMeta",
      "developerSessionHeartbeat",
      "developerSessionLog",
      "closeDeveloperSessionButton",
      "repositoryDialog",
      "repositoryForm",
      "closeRepositoryButton",
      "cancelRepositoryButton",
      "repositoryCurrent",
      "repositoryCurrentTitle",
      "repositoryCurrentCopy",
      "repositoryCurrentUrl",
      "repositoryChangeButton",
      "repositoryIntro",
      "repositoryShortcutsSection",
      "repositoryShortcutsToggleButton",
      "repositoryShortcutsList",
      "repositoryShortcutLabelInput",
      "repositoryShortcutCommandInput",
      "repositoryShortcutAddButton",
      "repositoryShortcutResetButton",
      "repositoryPushReadySection",
      "repositoryPushReadyCopy",
      "repositoryPushCommitInput",
      "repositoryCommitPanel",
      "repositoryCommitGenerateButton",
      "repositoryCommitHint",
      "repositoryPushFilesPreview",
      "repositorySyncWorkflowInput",
      "repositorySyncWorkflowSaveButton",
      "repositorySyncWorkflowResetButton",
      "repositoryFields",
      "repositoryProvider",
      "repositoryCustomNameField",
      "repositoryCustomName",
      "repositoryUrl",
      "repositoryError",
      "saveRepositoryButton",
      "repositoryPushSubmitWrap",
      "operationsSkillDialog",
      "operationsSkillForm",
      "operationsSkillKicker",
      "operationsSkillDialogTitle",
      "operationsSkillDialogIntro",
      "closeOperationsSkillButton",
      "cancelOperationsSkillButton",
      "resetOperationsSkillButton",
      "saveOperationsSkillButton",
      "operationsSkillNameInput",
      "operationsSkillNameField",
      "operationsSkillDeploymentFields",
      "operationsSkillExtendedFields",
      "operationsSkillSimpleModeButton",
      "operationsSkillAdvancedModeButton",
      "generateOperationsSkillButton",
      "polishOperationsSkillButton",
      "operationsSkillMissingCopy",
      "operationsSkillGenerationNotice",
      "operationsSkillAdvancedPanel",
      "operationsSkillItemsList",
      "operationsSkillAddItemButton",
      "operationsSkillMissingFields",
      "operationsSkillMissingFieldsList",
      "operationsSkillProviderLabel",
      "operationsSkillProviderInput",
      "operationsSkillTargetLabel",
      "operationsSkillTargetInput",
      "operationsSkillInstructionsInput",
      "operationsSkillError",
      "operationsGuidedSetupDialog",
      "operationsGuidedSetupForm",
      "operationsGuidedSetupKicker",
      "operationsGuidedSetupTitle",
      "operationsGuidedSetupProgress",
      "closeOperationsGuidedSetupButton",
      "operationsGuidedSetupQuestion",
      "operationsGuidedSetupReason",
      "operationsGuidedSetupLoading",
      "operationsGuidedSetupOptions",
      "operationsGuidedSetupCustomWrap",
      "operationsGuidedSetupCustomLabel",
      "operationsGuidedSetupCustomInput",
      "operationsGuidedSetupInputWrap",
      "operationsGuidedSetupInput",
      "operationsGuidedSetupError",
      "operationsGuidedSetupBackButton",
      "operationsGuidedSetupApplyButton",
      "operationsGuidedSetupNextButton",
      "operationsSourceDetailDialog",
      "operationsSourceDetailForm",
      "operationsSourceDetailTitle",
      "operationsSourceDetailState",
      "operationsSourceDetailList",
      "operationsSourceFlowSteps",
      "operationsSourcePrivacy",
      "operationsSourceDetailError",
      "closeOperationsSourceDetailButton",
      "cancelOperationsSourceDetailButton",
      "openOperationsSourceAuthorizationButton",
      "authorizeOperationsSourceButton",
      "operationsAgentDialog",
      "operationsAgentDialogTitle",
      "operationsAgentDialogMeta",
      "closeOperationsAgentButton",
      "operationsAgentLog",
      "operationsAgentLogEmpty",
      "createDialog",
      "createForm",
      "closeCreateButton",
      "cancelCreateButton",
      "audienceInput",
      "appTypeInput",
      "needsInput",
      "codingAgentOptions",
      "codexAgentOption",
      "codexAgentInput",
      "codexAgentStatus",
      "claudeAgentOption",
      "claudeAgentInput",
      "claudeAgentStatus",
      "codingAgentError",
      "workspaceInput",
      "workspaceError",
      "workspaceEditDialog",
      "workspaceEditForm",
      "workspaceEditInput",
      "workspaceEditError",
      "closeWorkspaceEditButton",
      "cancelWorkspaceEditButton",
      "saveWorkspaceEditButton",
      "browseWorkspaceEditButton",
      "codingAgentDialog",
      "codingAgentDialogTitle",
      "codingAgentDialogIntro",
      "codingAgentForm",
      "claudeCliArgsField",
      "claudeCliArgsInput",
      "codexCliArgsField",
      "codexCliArgsInput",
      "codingAgentSettingsError",
      "closeCodingAgentButton",
      "cancelCodingAgentButton",
      "saveCodingAgentButton",
      "browseWorkspaceButton",
      "createMaterialsInput",
      "addCreateMaterialsButton",
      "createMaterialsList",
      "createMaterialsError",
      "intentPreview",
      "createSystemWarning",
      "createSubmitButton",
      "workspaceBrowserDialog",
      "closeWorkspaceBrowserButton",
      "workspaceBrowserUpButton",
      "workspaceBrowserCurrentPath",
      "workspaceBrowserRoots",
      "workspaceBrowserLoading",
      "workspaceBrowserError",
      "workspaceBrowserList",
      "workspaceBrowserEmpty",
      "workspaceNewFolder",
      "workspaceNewFolderInput",
      "confirmWorkspaceNewFolderButton",
      "cancelWorkspaceNewFolderButton",
      "workspaceNewFolderError",
      "showWorkspaceNewFolderButton",
      "chooseWorkspaceFolderButton",
      "experienceSurfaceDialog",
      "experienceSurfaceForm",
      "closeExperienceSurfaceButton",
      "cancelExperienceSurfaceButton",
      "experienceSurfaceType",
      "experienceSurfaceName",
      "experienceSurfacePlatform",
      "experienceSurfaceDevice",
      "experienceSurfaceWidth",
      "experienceSurfaceHeight",
      "experienceSurfaceRoute",
      "experienceSurfaceAgent",
      "experienceSurfaceError",
      "submitExperienceSurfaceButton",
      "personaDialog",
      "personaAvatar",
      "personaKind",
      "personaDialogTitle",
      "personaSubtitle",
      "personaDetails",
      "personaEditForm",
      "personaFieldName",
      "personaFieldAge",
      "personaFieldGender",
      "personaFieldLocation",
      "personaFieldRole",
      "personaFieldTechLevel",
      "personaFieldDevice",
      "personaFieldSegments",
      "personaFieldMotivation",
      "personaFieldConstraints",
      "personaFieldScenario",
      "personaFieldHabits",
      "personaFieldTaskScript",
      "personaFieldTestAccount",
      "personaFieldAuthNotes",
      "personaDialogActions",
      "personaEditButton",
      "personaDeleteButton",
      "personaSaveButton",
      "personaCancelEditButton",
      "addPersonaButton",
      "closePersonaButton",
      "pairingDialog",
      "closePairingButton",
      "closePairingFooterButton",
      "pairingUrl",
      "copyPairingUrlButton",
      "pairingCode",
      "pairingCountdown",
      "copyPairingCodeButton",
      "refreshPairingButton",
      "pairingQr",
      "pairingQrImage",
      "pairingError",
      "revokeSessionsButton",
      "networkDiagnostic",
      "networkDiagnosticText",
      "checkNetworkButton",
      "repairNetworkButton",
      "restoreNetworkButton",
      "toastRegion",
    ].forEach((id) => {
      dom[id] = document.getElementById(id);
    });
  }

  function bindAccessEvents() {
    window.__APPLOOPER_ACCESS_RETRY_MANAGED__ = true;
    dom.accessCodeInput.addEventListener("input", () => {
      const digits = dom.accessCodeInput.value.replace(/\D/g, "").slice(0, 6);
      if (dom.accessCodeInput.value !== digits) dom.accessCodeInput.value = digits;
      dom.accessError.hidden = true;
      dom.accessSubmitButton.disabled = state.accessVerifying || digits.length !== 6;
    });
    dom.accessForm.addEventListener("submit", verifyAccessCode);
    dom.enterWorkspaceButton.addEventListener("click", () => {
      dom.enterWorkspaceButton.disabled = true;
      dom.enterWorkspaceButton.textContent = t("access.opening");
      window.location.reload();
    });
    dom.accessRetryButton.addEventListener("click", async () => {
      clearAccessReconnectTimer();
      const canEnter = await loadAccessStatus({ scheduleReconnect: true });
      if (canEnter) await startWorkspace();
    });
  }

  function clearAccessReconnectTimer() {
    window.clearTimeout(state.accessReconnectTimer);
    state.accessReconnectTimer = null;
  }

  function hadRecentAccessSession() {
    try {
      const stored = Number(sessionStorage.getItem(ACCESS_SESSION_OK_KEY) || 0);
      return Number.isFinite(stored) && stored > 0 && Date.now() - stored < 6 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }

  function rememberAccessSession() {
    try {
      sessionStorage.setItem(ACCESS_SESSION_OK_KEY, String(Date.now()));
    } catch {
      // Storage failures must not block workspace entry.
    }
  }

  function isLocalWorkspaceOrigin() {
    const host = window.location.hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  }

  function applyAccessStatusPayload(payload) {
      const info = payload?.access && typeof payload.access === "object" ? payload.access : payload || {};
      const local =
        info.local === true ||
        info.is_local === true ||
        info.trusted_local === true ||
        payload?.local === true ||
        payload?.is_local === true ||
        payload?.trusted_local === true;
      const authenticated =
        local || info.authenticated === true || info.authorized === true || payload?.authenticated === true || payload?.authorized === true;
    state.access = { ...info, local, authenticated, optimistic: false };
    return authenticated;
  }

  async function revalidateAccessInBackground({ scheduleReconnect = false } = {}) {
    try {
      const payload = await fetchAccessStatusWithRetry({});
      if (applyAccessStatusPayload(payload)) {
        rememberAccessSession();
        markConnected();
        return true;
      }
      return false;
    } catch (error) {
      if (window.__APPLOOPER_BOOT_COMPLETE__) {
        markDisconnected(t("connection.interrupted"));
        if (scheduleReconnect) {
          window.setTimeout(() => {
            if (document.visibilityState === "visible") void revalidateAccessInBackground({ scheduleReconnect: true });
          }, ACCESS_RECONNECT_INTERVAL_MS);
        }
        return false;
      }
      if (scheduleReconnect) scheduleAccessReconnect();
      return false;
    }
  }

  function isRetryableAccessError(error) {
    return error instanceof ApiError && [0, 502, 503, 504].includes(error.status);
  }

  async function fetchAccessStatusWithRetry({ onRetry = null } = {}) {
    const delays = [0, 700, 1_500, 3_000, 5_000, 8_000];
    const deadline = Date.now() + ACCESS_BOOT_TIMEOUT_MS;
    let lastError = null;
    for (let attempt = 0; attempt < ACCESS_BOOT_ATTEMPTS; attempt += 1) {
      if (delays[attempt]) {
        if (Date.now() + delays[attempt] >= deadline) break;
        await new Promise((resolve) => window.setTimeout(resolve, delays[attempt]));
      }
      if (attempt > 0 && typeof onRetry === "function") onRetry(attempt + 1, ACCESS_BOOT_ATTEMPTS);
      try {
        const remainingMs = Math.max(250, deadline - Date.now());
        return await request("/access/status", {
          allowUnauthorized: true,
          timeoutMs: Math.min(ACCESS_BOOT_ATTEMPT_TIMEOUT_MS, remainingMs),
        });
      } catch (error) {
        lastError = error;
        if (!isRetryableAccessError(error) || attempt === ACCESS_BOOT_ATTEMPTS - 1 || Date.now() >= deadline) throw error;
      }
    }
    throw lastError || new ApiError(t("common.request_timeout"), 0, { code: "request_timeout" });
  }

  function scheduleAccessReconnect() {
    clearAccessReconnectTimer();
    if (window.__APPLOOPER_BOOT_COMPLETE__) return;
    const gate = dom.accessGate || document.getElementById("accessGate");
    if (!gate || gate.hidden || !dom.accessUnavailable || dom.accessUnavailable.hidden) return;
    state.accessReconnectTimer = window.setTimeout(() => {
      state.accessReconnectTimer = null;
      void resumePrebootIfNeeded();
    }, ACCESS_RECONNECT_INTERVAL_MS);
  }

  async function loadAccessStatus({ scheduleReconnect = false, silent = false } = {}) {
    const requestNumber = ++state.accessRequest;
    clearAccessReconnectTimer();
    if (!silent && !window.__APPLOOPER_BOOT_COMPLETE__) {
      showAccessView("checking");
      if (dom.accessGateTitle) dom.accessGateTitle.textContent = t("access.connecting_title");
    }
    const updateRetryCopy = (attempt, total) => {
      if (requestNumber !== state.accessRequest) return;
      if (dom.accessGateTitle) dom.accessGateTitle.textContent = t("access.reconnecting_title");
      if (dom.accessUnavailableText && attempt > 1) {
        dom.accessUnavailableText.textContent = t("access.reconnecting_copy");
      }
      void attempt;
      void total;
    };
    try {
      const payload = await fetchAccessStatusWithRetry({
        onRetry: (attempt, total) => {
          if (requestNumber !== state.accessRequest) return;
          if (!window.__APPLOOPER_BOOT_COMPLETE__) {
            showAccessView("checking");
            updateRetryCopy(attempt, total);
          }
        },
      });
      if (requestNumber !== state.accessRequest) {
        return Boolean(state.access?.local || state.access?.authenticated);
      }
      if (applyAccessStatusPayload(payload)) {
        rememberAccessSession();
        return true;
      }
      if (!window.__APPLOOPER_BOOT_COMPLETE__) showAccessView("form");
      return false;
    } catch (error) {
      if (requestNumber !== state.accessRequest) {
        return Boolean(state.access?.local || state.access?.authenticated);
      }
      if (error instanceof ApiError && error.status === 401) {
        state.access = { local: false, authenticated: false, optimistic: false };
        if (!window.__APPLOOPER_BOOT_COMPLETE__) showAccessView("form");
        return false;
      }
      if (isLocalWorkspaceOrigin() && hadRecentAccessSession()) {
        state.access = { local: true, authenticated: true, trusted_local: true, optimistic: true };
        rememberAccessSession();
        void revalidateAccessInBackground({ scheduleReconnect: true });
        return true;
      }
      state.access = null;
      if (!window.__APPLOOPER_BOOT_COMPLETE__) {
        dom.accessUnavailableText.textContent = hadRecentAccessSession()
          ? t("access.reconnecting_copy")
          : friendlyError(error, t("access.unavailable_copy"));
      showAccessView("unavailable");
        if (scheduleReconnect) scheduleAccessReconnect();
      }
      return false;
    }
  }

  function showAccessView(view, message = "") {
    dom.accessGate.hidden = false;
    dom.accessGate.classList.toggle("is-loading", view === "checking");
    dom.workspace.hidden = true;
    dom.claudeWarning.hidden = true;
    document.body.classList.add("access-locked");
    dom.accessChecking.hidden = view !== "checking";
    dom.accessForm.hidden = view !== "form";
    dom.accessSuccess.hidden = view !== "success";
    dom.accessUnavailable.hidden = view !== "unavailable";

    if (view === "form") {
      dom.accessError.textContent = message;
      dom.accessError.hidden = !message;
      dom.accessSubmitButton.disabled = state.accessVerifying || dom.accessCodeInput.value.length !== 6;
      window.requestAnimationFrame(() => dom.accessCodeInput.focus({ preventScroll: true }));
    }
  }

  function hideAccessGate() {
    dom.accessGate.hidden = true;
    dom.accessGate.classList.remove("is-loading");
    delete dom.accessGate.dataset.bootTimedOut;
    clearAccessReconnectTimer();
    dom.workspace.hidden = false;
    document.body.classList.remove("access-locked");
    window.__APPLOOPER_BOOT_COMPLETE__ = true;
  }

  async function verifyAccessCode(event) {
    event.preventDefault();
    if (state.accessVerifying) return;
    const code = dom.accessCodeInput.value.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      showAccessView("form", t("access.code_incomplete"));
      return;
    }

    state.accessVerifying = true;
    dom.accessSubmitButton.disabled = true;
    dom.accessSubmitButton.textContent = t("access.connecting_button");
    dom.accessError.hidden = true;
    try {
      const payload = await request("/access/verify", {
        method: "POST",
        json: { code },
        allowUnauthorized: true,
      });
      state.access = {
        ...(payload && typeof payload === "object" ? payload : {}),
        local: false,
        authenticated: true,
      };
      rememberAccessSession();
      showAccessView("success");
    } catch (error) {
      showAccessView("form", accessVerificationError(error));
      dom.accessCodeInput.select();
    } finally {
      state.accessVerifying = false;
      dom.accessSubmitButton.textContent = t("access.connect_button");
      dom.accessSubmitButton.disabled = dom.accessCodeInput.value.length !== 6;
    }
  }

  function accessVerificationError(error) {
    const payload = error instanceof ApiError ? error.payload : null;
    const code = firstText(payload?.code, payload?.error?.code, payload?.error, payload?.reason, payload?.detail).toLowerCase();
    if (error instanceof ApiError && error.status === 429) return t("access.too_many");
    if (code.includes("expired") || (error instanceof ApiError && error.status === 410)) {
      return t("access.expired");
    }
    if (code.includes("invalid") || (error instanceof ApiError && [400, 401, 403].includes(error.status))) {
      return t("access.invalid");
    }
    return friendlyError(error, t("access.failed"));
  }

  function handleUnauthorized() {
    window.clearInterval(state.refreshTimer);
    window.clearInterval(state.listRefreshTimer);
    window.clearInterval(state.retryCountdownTimer);
    state.refreshTimer = null;
    state.listRefreshTimer = null;
    state.retryCountdownTimer = null;
    state.access = { local: false, authenticated: false };
    closeDialog(dom.createDialog);
    closeDialog(dom.personaDialog);
    closeDialog(dom.pairingDialog);
    closeDialog(dom.iosInstallGuideDialog);
    stopDeveloperSessionPolling();
    closeDialog(dom.developerSessionDialog);
    state.repositoryDialogOpen = false;
    stopRepositoryDialogGuard();
    hideRepositoryDialogOverlay();
    closeDialog(dom.operationsSkillDialog);
    closeDialog(dom.operationsSourceDetailDialog);
    closeDialog(dom.operationsAgentDialog);
    closeDialog(dom.experienceSurfaceDialog);
    closeDialog(dom.workspaceBrowserDialog);
    closeDrawers();
    showAccessView("form", t("access.session_expired"));
  }

  function bindEvents() {
    dom.openCreateButton.addEventListener("click", openCreateDialog);
    // The study shell can omit the empty-state create control when account
    // enrollment has already provisioned both paired workflows.
    dom.emptyCreateButton?.addEventListener("click", openCreateDialog);
    dom.closeCreateButton.addEventListener("click", closeCreateDialog);
    dom.cancelCreateButton.addEventListener("click", closeCreateDialog);
    dom.createForm.addEventListener("submit", createApp);
    [dom.audienceInput, dom.appTypeInput, dom.needsInput].forEach((input) => {
      input.addEventListener("input", updateIntentPreview);
    });
    dom.workspaceInput.addEventListener("input", clearWorkspaceError);
    dom.workspaceInput.addEventListener("change", () => validateWorkspaceInput({ silent: true, target: "create" }));
    dom.browseWorkspaceButton.addEventListener("click", () => void openWorkspaceBrowser("create"));
    dom.editWorkspaceButton?.addEventListener("click", openWorkspaceEditDialog);
    dom.editCodingAgentButton?.addEventListener("click", openCodingAgentDialog);
    dom.codingAgentForm?.addEventListener("submit", saveCodingAgentSettings);
    dom.closeCodingAgentButton?.addEventListener("click", closeCodingAgentDialog);
    dom.cancelCodingAgentButton?.addEventListener("click", closeCodingAgentDialog);
    dom.workspaceEditForm?.addEventListener("submit", saveWorkspaceEdit);
    dom.closeWorkspaceEditButton?.addEventListener("click", closeWorkspaceEditDialog);
    dom.cancelWorkspaceEditButton?.addEventListener("click", closeWorkspaceEditDialog);
    dom.browseWorkspaceEditButton?.addEventListener("click", () => void openWorkspaceBrowser("edit"));
    dom.workspaceEditInput?.addEventListener("input", clearWorkspaceError);
    dom.workspaceEditInput?.addEventListener("change", () => validateWorkspaceInput({ silent: true, target: "edit" }));
    dom.closeWorkspaceBrowserButton.addEventListener("click", closeWorkspaceBrowser);
    dom.workspaceBrowserUpButton.addEventListener("click", () => {
      if (state.workspaceBrowserParent) loadWorkspaceDirectory(state.workspaceBrowserParent);
    });
    dom.showWorkspaceNewFolderButton.addEventListener("click", showWorkspaceNewFolder);
    dom.cancelWorkspaceNewFolderButton.addEventListener("click", hideWorkspaceNewFolder);
    dom.confirmWorkspaceNewFolderButton.addEventListener("click", createWorkspaceFolder);
    dom.workspaceNewFolderInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        createWorkspaceFolder();
      }
    });
    dom.chooseWorkspaceFolderButton.addEventListener("click", chooseWorkspaceFolder);
    dom.workspaceBrowserDialog.addEventListener("cancel", (event) => {
      if (state.workspaceBrowserBusy || state.workspaceBrowserCreating) event.preventDefault();
    });
    dom.addCreateMaterialsButton.addEventListener("click", () => dom.createMaterialsInput.click());
    dom.createMaterialsInput.addEventListener("change", addCreateMaterials);
    [dom.codexAgentInput, dom.claudeAgentInput].forEach((input) => {
      input.addEventListener("change", () => {
        clearCodingAgentError();
        updateCreateAvailability();
      });
    });

    dom.messageInput.addEventListener("input", () => {
      autosizeMessageInput();
      updateComposer();
    });
    dom.messageInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        submitMessage();
      }
    });
    dom.messageInput.addEventListener("focus", () => {
      scheduleViewportMetrics();
      window.setTimeout(() => {
        scheduleViewportMetrics();
        dom.composer.scrollIntoView({ block: "end" });
      }, 180);
    });
    dom.sendButton.addEventListener("click", () => submitMessage());
    dom.composerAttachButton?.addEventListener("click", () => {
      if (dom.attachmentInput?.disabled) return;
      dom.attachmentInput?.click();
    });
    dom.attachmentInput.addEventListener("change", addPendingFiles);
    setupComposerFileDrop();
    dom.replyPendingButton.addEventListener("click", focusPendingReply);
    dom.workflowActionButton.addEventListener("click", changeWorkflowState);
    [dom.mainConversationTab, dom.experienceConversationTab].forEach((button) => {
      button.addEventListener("click", () => setChatView(button.dataset.chatView));
    });
    dom.openExperienceTwinButton.addEventListener("click", openExperienceTwin);
    dom.experienceTwinTab.addEventListener("click", openExperienceTwin);
    dom.validationRecordsButton?.addEventListener("click", () => setChatView("experience"));
    dom.trialSandboxConfigureButton?.addEventListener("click", () => void configureTrialSandboxFocus());
    dom.trialSandboxInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        void configureTrialSandboxFocus();
      }
    });
    dom.trialFeedbackSendButton?.addEventListener("click", () => void sendTrialSandboxFeedback());
    dom.trialFeedbackInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        void sendTrialSandboxFeedback();
      }
    });
    dom.addExperienceSurfaceButton?.addEventListener("click", openExperienceSurfaceDialog);
    dom.downloadSourceExportButton?.addEventListener("click", () => void downloadSourceExport());
    dom.launchTab?.addEventListener("click", openLaunch);
    dom.growthTab?.addEventListener("click", openGrowth);
    dom.launchChecklistAction?.addEventListener("click", () => submitLaunchChecklistAction());
    dom.launchAutoToggle?.addEventListener("change", () => void persistLaunchAutoPolicy());
    dom.releaseReviewConfirmButton?.addEventListener("click", () => void confirmReleaseReview());
    dom.releaseFinalPassButton?.addEventListener("click", () => void requestFinalReleaseVerdict("pass"));
    dom.releaseFinalFailButton?.addEventListener("click", () => void requestFinalReleaseVerdict("fail"));
    window.submitFinalReleasePass = submitFinalReleasePass;
    window.submitFinalReleaseFail = submitFinalReleaseFail;
    window.requestFinalReleaseVerdict = requestFinalReleaseVerdict;
    window.confirmFinalReleaseVerdict = confirmFinalReleaseVerdict;
    dom.releaseReviewDeferButton?.addEventListener("click", () => void deferReleaseReview());
    dom.releaseReviewCommunityPublishButton?.addEventListener("click", () => void publishReleaseToCommunity());
    dom.releaseReviewGuideButton?.addEventListener("click", () => openReleaseReviewGuide());
    dom.experienceTwinVerifyDone?.addEventListener("click", () => finishReleaseVerifyDone());
    dom.releaseVerifyPassButton?.addEventListener("click", () => void submitReleaseVerifyVerdict("passed"));
    dom.releaseVerifyFailButton?.addEventListener("click", () => void submitReleaseVerifyVerdict("failed"));
    dom.closeReleaseVerifyVerdictButton?.addEventListener("click", () => closeReleaseVerifyVerdictDialog());
    dom.releaseVerifyVerdictDialog?.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeReleaseVerifyVerdictDialog();
    });
    dom.ownerProxyBypassButton?.addEventListener("click", () => void bypassOwnerProxy());
    dom.releaseScenarioInteractedButton?.addEventListener("click", () => void markReleaseScenarioInteracted());
    dom.releaseScenarioPassButton?.addEventListener("click", () => void submitReleaseScenarioVerdict("pass"));
    dom.releaseScenarioReturnButton?.addEventListener("click", () => void submitReleaseScenarioVerdict("return"));
    dom.eufrDrawerCloseButton?.addEventListener("click", closeEufrDrawer);
    // Operations tab no longer has a dashboard toggle; the dashboard is always shown.
    dom.developerRepositoryButton?.addEventListener("click", () => {
      void openRepositoryDialog();
    });
    dom.repositoryShortcutsToggleButton?.addEventListener("click", toggleRepositoryShortcutsPanel);
    dom.repositoryShortcutAddButton?.addEventListener("click", addRepositoryGitShortcut);
    dom.repositoryShortcutResetButton?.addEventListener("click", resetRepositoryGitShortcuts);
    dom.repositorySyncWorkflowSaveButton?.addEventListener("click", saveRepositorySyncWorkflow);
    dom.repositorySyncWorkflowResetButton?.addEventListener("click", resetRepositorySyncWorkflow);
    dom.repositoryCommitGenerateButton?.addEventListener("click", () => void generateRepositoryCommitMessage());
    dom.closeExperienceTwinButton.addEventListener("click", closeExperienceTwin);
    dom.experienceTwinFitButton.addEventListener("click", () => setExperienceTwinScaleMode("fit"));
    dom.experienceTwinActualButton.addEventListener("click", () => setExperienceTwinScaleMode("actual"));
    dom.experienceTwinFullscreenButton.addEventListener("click", toggleExperienceTwinFullscreen);
    dom.experienceTwinFullscreenOverlayButton.addEventListener("click", toggleExperienceTwinFullscreen);
    bindExperienceTwinLaser();
    document.addEventListener("fullscreenchange", syncExperienceTwinFullscreenUi);
    dom.experienceTwinKeyboardButton.addEventListener("click", toggleRemoteExperienceKeyboard);
    dom.experienceTwinImeBridge.addEventListener("submit", handleRemoteExperienceImeSubmit);
    bindExperienceTwinImeDrag();
    dom.experienceTwinKeyboardInput.addEventListener("focus", handleRemoteExperienceKeyboardFocus);
    dom.experienceTwinKeyboardInput.addEventListener("blur", handleRemoteExperienceKeyboardBlur);
    dom.experienceTwinKeyboardInput.addEventListener("beforeinput", handleRemoteExperienceKeyboardBeforeInput);
    dom.experienceTwinKeyboardInput.addEventListener("compositionstart", () => {
      state.remoteExperienceKeyboardComposing = true;
      state.remoteExperienceKeyboardSuppressInput = "";
    });
    dom.experienceTwinKeyboardInput.addEventListener("compositionend", handleRemoteExperienceKeyboardComposition);
    dom.experienceTwinKeyboardInput.addEventListener("input", handleRemoteExperienceKeyboardInput);
    dom.experienceTwinKeyboardInput.addEventListener("keydown", handleRemoteExperienceKeyboardKeydown);
    dom.experienceTwinHistory.addEventListener("toggle", () => {
      if (state.experienceTwinOpen) renderExperienceTwinHistory(activeExperienceTwinView());
    });
    dom.reloadExperienceTwinButton.addEventListener("click", reloadActiveExperienceTwinFrame);
    dom.openExperienceTwinWindowButton.addEventListener("click", openActiveExperienceTwinWindow);
    dom.stopExperienceTwinButton.addEventListener("click", () => stopRemoteExperienceSession());
    dom.closeExperienceSurfaceButton.addEventListener("click", closeExperienceSurfaceDialog);
    dom.cancelExperienceSurfaceButton.addEventListener("click", closeExperienceSurfaceDialog);
    dom.experienceSurfaceType.addEventListener("change", applyExperienceSurfacePreset);
    dom.experienceSurfaceRoute.addEventListener("input", clearExperienceSurfaceError);
    dom.experienceSurfaceForm.addEventListener("submit", submitExperienceSurface);
    dom.operationsDeployButton.addEventListener("click", () => void submitOperationsDeploy());
    dom.projectSecretsButton?.addEventListener("click", () => void openProjectSecretsDialog());
    dom.closeProjectSecretsButton?.addEventListener("click", closeProjectSecretsDialog);
    dom.cancelProjectSecretsButton?.addEventListener("click", closeProjectSecretsDialog);
    dom.projectSecretsForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      void saveProjectSecrets();
    });
    dom.projectAgnesApiKeyInput?.addEventListener("input", () => {
      if (dom.projectSecretsError) dom.projectSecretsError.hidden = true;
    });
    dom.operationsReleaseAction.addEventListener("click", () => sendOperationsPrompt("release"));
    dom.operationsLaunchSkillEditButton.addEventListener("click", () => openOperationsSkillDialog("deployment"));
    dom.operationsAnalyticsSkillEditButton?.addEventListener("click", () => openOperationsSkillDialog("analytics"));
    dom.operationsTrafficSkillEditButton?.addEventListener("click", () => openOperationsSkillDialog("traffic"));
    dom.operationsFeedbackSkillEditButton?.addEventListener("click", () => openOperationsSkillDialog("feedback"));
    dom.feedbackBoardRefreshButton?.addEventListener("click", () => void refreshOperationsBoard("feedback"));
    dom.analyticsBoardRefreshButton?.addEventListener("click", () => void refreshOperationsBoard("analytics"));
    dom.trafficBoardRefreshButton?.addEventListener("click", () => void refreshOperationsBoard("traffic"));
    dom.operationsAgentStatusButton?.addEventListener("click", openOperationsAgentDialog);
    dom.workspace.addEventListener("touchstart", beginTabSwipe, { passive: true });
    dom.workspace.addEventListener("touchend", finishTabSwipe, { passive: true });
    dom.operationsSkillForm.addEventListener("submit", submitOperationsSkill);
    dom.operationsGuidedSetupForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      void advanceOperationsGuidedSetup();
    });
    dom.closeOperationsGuidedSetupButton?.addEventListener("click", () => closeDialog(dom.operationsGuidedSetupDialog));
    dom.operationsGuidedSetupBackButton?.addEventListener("click", () => stepOperationsGuidedSetup(-1));
    dom.operationsGuidedSetupApplyButton?.addEventListener("click", () => void assistOperationsGuidedSetup());
    dom.operationsGuidedSetupNextButton?.addEventListener("click", () => void advanceOperationsGuidedSetup());
    dom.operationsGuidedSetupInput?.addEventListener("input", syncOperationsGuidedSetupInput);
    dom.operationsGuidedSetupCustomInput?.addEventListener("input", syncOperationsGuidedSetupCustomInput);
    dom.operationsSourceDetailForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      void authorizeSelectedOperationsSource();
    });
    dom.closeOperationsSourceDetailButton?.addEventListener("click", closeOperationsSourceDetail);
    dom.cancelOperationsSourceDetailButton?.addEventListener("click", closeOperationsSourceDetail);
    dom.openOperationsSourceAuthorizationButton?.addEventListener("click", openSelectedOperationsSourceAuthorizationEntry);
    dom.closeOperationsSkillButton.addEventListener("click", closeOperationsSkillDialog);
    dom.cancelOperationsSkillButton.addEventListener("click", closeOperationsSkillDialog);
    dom.resetOperationsSkillButton.addEventListener("click", resetOperationsSkill);
    dom.generateOperationsSkillButton?.addEventListener("click", () => void generateOperationsSkillDraft());
    dom.polishOperationsSkillButton?.addEventListener("click", () => void polishOperationsSkillDraft());
    dom.operationsSkillSimpleModeButton?.addEventListener("click", () => {
      setOperationsSkillConfigMode("simple");
      markOperationsSkillEdited();
    });
    dom.operationsSkillAdvancedModeButton?.addEventListener("click", () => {
      setOperationsSkillConfigMode("advanced");
      markOperationsSkillEdited();
    });
    dom.operationsSkillAddItemButton?.addEventListener("click", () => {
      state.operationsSkillItems.push(defaultOperationsSkillItem(state.operationsSkillKind));
      markOperationsSkillEdited();
      renderOperationsSkillItems();
    });
    [
      dom.operationsSkillNameInput,
      dom.operationsSkillProviderInput,
      dom.operationsSkillTargetInput,
      dom.operationsSkillInstructionsInput,
    ].forEach((input) => {
      input?.addEventListener("input", () => {
        markOperationsSkillEdited();
      });
    });
    dom.closeOperationsAgentButton.addEventListener("click", () => closeDialog(dom.operationsAgentDialog));
    dom.repositoryForm.addEventListener("submit", submitRepositoryRequest);
    dom.closeRepositoryButton.addEventListener("click", closeRepositoryDialog);
    dom.cancelRepositoryButton.addEventListener("click", closeRepositoryDialog);
    dom.repositoryDialog?.addEventListener("click", (event) => {
      if (event.target !== dom.repositoryDialog) return;
      if (repositoryDialogCloseLocked()) return;
      closeRepositoryDialog();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !state.repositoryDialogOpen) return;
      if (repositoryDialogCloseLocked()) {
        event.preventDefault();
        return;
      }
      closeRepositoryDialog();
    });
    dom.repositoryPushCommitInput?.addEventListener("input", () => {
      clearRepositoryError();
      updateRepositoryPushButtonState();
      persistRepositoryDialogSession();
    });
    dom.repositorySyncWorkflowInput?.addEventListener("input", clearRepositoryError);
    dom.repositoryChangeButton.addEventListener("click", () => setRepositoryEditing(true));
    dom.repositoryProvider.addEventListener("change", renderRepositoryFields);
    [dom.repositoryUrl, dom.repositoryCustomName].forEach((input) => {
      input.addEventListener("input", clearRepositoryError);
    });
    dom.closeDeveloperSessionButton.addEventListener("click", closeDeveloperSession);
    dom.developerSessionDialog.addEventListener("close", stopDeveloperSessionPolling);
    // The 对话 tab no longer exposes a status entry in the composer; each agent's
    // status is viewed from the right-hand agent roster instead (renderMemberButton).

    dom.openAppsButton.addEventListener("click", () => openDrawer("apps"));
    dom.openMembersButton.addEventListener("click", () => openDrawer("members"));
    [dom.notificationToggle, dom.notificationPromptButton].forEach((button) => {
      if (button) button.addEventListener("click", toggleNotifications);
    });
    dom.drawerBackdrop.addEventListener("click", closeDrawers);
    document.querySelectorAll("[data-close-drawer]").forEach((button) => {
      button.addEventListener("click", closeDrawers);
    });

    dom.closePersonaButton.addEventListener("click", () => {
      state.personaEditing = false;
      state.personaEditId = "";
      closeDialog(dom.personaDialog);
    });
    dom.personaEditButton?.addEventListener("click", () => enterPersonaEditMode());
    dom.personaCancelEditButton?.addEventListener("click", () => exitPersonaEditMode(true));
    dom.personaSaveButton?.addEventListener("click", () => void savePersonaDraft());
    dom.personaDeleteButton?.addEventListener("click", () => void deletePersonaDraft());
    dom.installButton.addEventListener("click", installApp);
    dom.drawerInstallButton.addEventListener("click", installFromDrawer);
    dom.homeScreenTipAction?.addEventListener("click", installFromDrawer);
    dom.dismissHomeScreenTipButton?.addEventListener("click", () => dismissHomeScreenTip());
    [dom.closeIosInstallGuideButton, dom.dismissIosInstallGuideButton, dom.confirmIosInstallGuideButton].forEach((button) => {
      if (button) button.addEventListener("click", closeIosInstallGuide);
    });
    dom.closePairingButton.addEventListener("click", closePairingDialog);
    dom.closePairingFooterButton.addEventListener("click", closePairingDialog);
    dom.refreshPairingButton.addEventListener("click", () => generatePairingCode({ refresh: true }));
    dom.copyPairingUrlButton.addEventListener("click", () => copyPairingValue(dom.pairingUrl.value, t("pairing.copied_url")));
    dom.copyPairingCodeButton.addEventListener("click", () => copyPairingValue(state.pairingCode, t("pairing.copied_code")));
    dom.revokeSessionsButton.addEventListener("click", revokeAllAccessSessions);
    dom.checkNetworkButton.addEventListener("click", checkNetworkConnection);
    dom.repairNetworkButton.addEventListener("click", () => changeProxyBypass(false));
    dom.restoreNetworkButton.addEventListener("click", () => changeProxyBypass(true));
    dom.pairingDialog.addEventListener("close", stopPairingCountdown);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.body.classList.contains("drawer-open")) {
        closeDrawers();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) closeDrawers();
      scheduleExperienceTwinScale();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (state.experienceTwinOpen) pauseRemoteExperienceTransport();
        return;
      }
      if (!document.hidden && (state.access?.authenticated || state.access?.local)) {
        if (!state.system) retrySystemNow();
        if (!shouldDeferBackgroundRender()) {
        loadCurrentApp({ silent: true });
        }
        loadApps({ silent: true, loadDetail: false });
        loadNotificationStatus({ silent: true });
        resumeRemoteExperienceRfb();
      }
    });
    document.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (!shouldDeferBackgroundRender()) flushDeferredAppRender();
      }, 0);
    });
    window.addEventListener("pagehide", () => {
      if (state.experienceTwinOpen) pauseRemoteExperienceTransport();
    });
    window.addEventListener("pageshow", resumeRemoteExperienceRfb);
  }

  function scheduleViewportMetrics() {
    if (state.viewportFrame) return;
    state.viewportFrame = window.requestAnimationFrame(() => {
      state.viewportFrame = 0;
      const height = Math.max(320, Math.round(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight));
      document.documentElement.style.setProperty("--app-height", `${height}px`);
      const warningHeight = dom.claudeWarning && !dom.claudeWarning.hidden ? Math.ceil(dom.claudeWarning.getBoundingClientRect().height) : 0;
      document.documentElement.style.setProperty("--warning-height", `${warningHeight}px`);
    });
  }

  function setupViewportMetrics() {
    scheduleViewportMetrics();
    window.addEventListener("resize", scheduleViewportMetrics, { passive: true });
    window.addEventListener("orientationchange", scheduleViewportMetrics, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", scheduleViewportMetrics, { passive: true });
      window.visualViewport.addEventListener("scroll", scheduleViewportMetrics, { passive: true });
    }
  }

  function startRefreshTimers() {
    window.clearInterval(state.refreshTimer);
    window.clearInterval(state.listRefreshTimer);
    state.refreshTimer = window.setInterval(() => {
      if (!document.hidden && !state.sending && (state.access?.authenticated || state.access?.local) && state.currentId) {
        if (shouldDeferBackgroundRender()) return;
        if (state.launchOpen || state.growthOpen) {
          void loadOperations({ silent: true });
          syncDevelopmentSnapshot({ silent: true });
        } else if (state.experienceTwinOpen) {
          // Keep the participant's in-progress interaction intact.  The
          // development snapshot can advance in the background without
          // rebuilding the experience page (and, critically, its iframe).
          syncDevelopmentSnapshot({ silent: true });
        } else {
          syncDevelopmentSnapshot({ silent: true });
      }
      }
    }, DEVELOPMENT_REFRESH_MS);
    state.listRefreshTimer = window.setInterval(() => {
      if (!document.hidden && (state.access?.authenticated || state.access?.local)) {
        if (!state.system) loadSystem({ silent: true });
        loadApps({ silent: true, loadDetail: false });
      }
    }, LIST_REFRESH_MS);
    startLiveSync();
  }

  function waitForLiveSync(delayMs) {
    return new Promise((resolve) => window.setTimeout(resolve, delayMs));
  }

  async function startLiveSync() {
    if (state.liveSyncRunning) return;
    state.liveSyncRunning = true;
    while (state.liveSyncRunning) {
      const runId = state.currentId;
      if (
        !runId
        || document.hidden
        || !(state.access?.authenticated || state.access?.local)
      ) {
        await waitForLiveSync(800);
        continue;
      }
      const revision = String(state.liveRevisions.get(runId) || "");
      try {
        const payload = await request(
          `/apps/${encodeURIComponent(runId)}/live?since=${encodeURIComponent(revision)}`,
          { timeoutMs: 25_000 },
        );
        if (runId !== state.currentId) continue;
        const nextRevision = String(payload?.revision || "");
        if (nextRevision) state.liveRevisions.set(runId, nextRevision);
        if (payload?.changed) {
          if (state.experienceTwinOpen || state.launchOpen || state.growthOpen) {
            if (state.experienceTwinOpen || shouldDeferBackgroundRender()) {
              state.deferredAppRender = true;
              await syncDevelopmentSnapshot({ silent: true, timeoutMs: 8_000 });
            } else {
              await loadCurrentApp({ silent: true });
            }
          } else {
            await syncDevelopmentSnapshot({ silent: true, timeoutMs: 8_000 });
          }
          scheduleExperienceConversationSync({ force: true });
        }
      } catch (_error) {
        await waitForLiveSync(1_200);
      }
    }
  }

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");

    const init = {
      method: options.method || "GET",
      headers,
      credentials: "same-origin",
      cache: "no-store",
    };

    const requestedTimeout = Number(options.timeoutMs);
    const timeoutMs = Number.isFinite(requestedTimeout) && requestedTimeout > 0
      ? Math.max(250, Math.floor(requestedTimeout))
      : 0;
    const controller = timeoutMs ? new AbortController() : null;
    let timeoutId = 0;
    let timedOut = false;
    let externalAbortHandler = null;

    if (controller) {
      init.signal = controller.signal;
      if (options.signal) {
        externalAbortHandler = () => controller.abort(options.signal.reason);
        if (options.signal.aborted) externalAbortHandler();
        else options.signal.addEventListener("abort", externalAbortHandler, { once: true });
      }
      timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
    } else if (options.signal) {
      init.signal = options.signal;
    }

    if (Object.prototype.hasOwnProperty.call(options, "json")) {
      headers.set("Content-Type", "application/json");
      init.body = JSON.stringify(options.json);
    } else if (Object.prototype.hasOwnProperty.call(options, "body")) {
      init.body = options.body;
    }

    let response;
    let raw;
    try {
      response = await fetch(`${API_ROOT}${path}`, init);
      raw = await response.text();
    } catch (error) {
      throw new ApiError(
        networkErrorMessage(error, timedOut),
        0,
        { code: timedOut ? "request_timeout" : "network_error" },
      );
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (options.signal && externalAbortHandler) {
        options.signal.removeEventListener("abort", externalAbortHandler);
      }
    }

    let payload = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = raw;
      }
    }

    if (!response.ok) {
      if (response.status === 401 && !options.allowUnauthorized) handleUnauthorized();
      throw new ApiError(readApiError(payload, response.status), response.status, payload);
    }

    markConnected();
    return payload ?? {};
  }

  async function submitMessageRequest(appId, payload) {
    const delays = [0, 650, 1_400];
    let lastError = null;
    for (let attempt = 0; attempt < delays.length; attempt += 1) {
      if (delays[attempt]) {
        await new Promise((resolve) => window.setTimeout(resolve, delays[attempt]));
      }
      try {
        return await request(`/apps/${encodeURIComponent(appId)}/messages`, {
          method: "POST",
          json: payload,
          timeoutMs: MESSAGE_REQUEST_TIMEOUT_MS,
        });
      } catch (error) {
        lastError = error;
        // A mobile/Funnel response can be lost after the server has already
        // accepted the message. Reusing client_request_id makes these retries
        // idempotent, so the user gets one message rather than a false failure.
        if (!(error instanceof ApiError) || error.status !== 0 || attempt === delays.length - 1) {
          throw error;
        }
      }
    }
    throw lastError;
  }

  function scheduleSystemRetry() {
    window.clearTimeout(state.systemRetryTimer);
    const delay = state.systemRetryDelay;
    state.systemRetryDelay = Math.min(delay * 2, 30_000);
    state.systemRetryTimer = window.setTimeout(() => {
      state.systemRetryTimer = null;
      if (!state.access?.authenticated && !state.access?.local) return;
      loadSystem({ silent: true });
    }, delay);
  }

  function retrySystemNow() {
    window.clearTimeout(state.systemRetryTimer);
    state.systemRetryTimer = null;
    return loadSystem({ silent: true });
  }

  function loadSystem({ silent = false } = {}) {
    if (state.systemRequest) return state.systemRequest;
    state.systemLoading = true;
    renderCodingAgentOptions();

    state.systemRequest = (async () => {
      try {
        const payload = await request("/system");
        const hadError = state.systemErrorShown;
        state.system = payload && typeof payload === "object" ? payload : {};
        state.unavailableCodingAgents.clear();
        state.systemErrorShown = false;
        state.systemRetryDelay = 3_000;
        window.clearTimeout(state.systemRetryTimer);
        state.systemRetryTimer = null;
        const workspace = firstText(state.system.workspace, state.system.workspace_root);
        if (workspace && !dom.workspaceInput.value.trim()) {
          dom.workspaceInput.value = workspace;
        }
        if (hadError) showToast("系统检测已恢复。", "success");
        return true;
      } catch (error) {
        state.system = null;
        if (error instanceof ApiError && error.status === 401) return false;
        if (!silent && !state.systemErrorShown) {
          const message = friendlyError(error, "暂时无法读取系统配置。").replace(/[。.]$/, "");
          showToast(`${message}，页面会自动重试。`, "error", 6_000);
        }
        state.systemErrorShown = true;
        scheduleSystemRetry();
        return false;
      } finally {
        state.systemLoading = false;
        state.systemRequest = null;
        renderCodingAgentOptions();
        updatePhoneAccessEntry();
      }
    })();

    return state.systemRequest;
  }

  function codingAgentLabel(id) {
    return id === "claude" ? "Claude Code" : "Codex";
  }

  function codingAgentInfo(id) {
    let info = state.system?.coding_agents?.[id];
    if (!info && id === "claude") info = state.system?.claude;
    if (typeof info === "boolean") return { installed: info, path: null };
    return info && typeof info === "object" ? info : null;
  }

  function isCodingAgentAvailable(id) {
    return codingAgentInfo(id)?.installed === true && !state.unavailableCodingAgents.has(id);
  }

  function selectedCodingAgent() {
    return dom.createForm?.querySelector('input[name="coding_agent"]:checked')?.value || "";
  }

  function codingAgentStatus(id, info) {
    if (state.systemLoading) return t("coding.checking");
    if (state.unavailableCodingAgents.has(id)) return info?.path ? t("coding.cli_unavailable") : t("coding.not_installed");
    if (info?.installed === true) return t("coding.available");
    if (info?.installed === false) return info?.path ? t("coding.cli_unavailable") : t("coding.not_installed");
    return t("coding.unknown");
  }

  function codingEngineLabel(current) {
    const codingAgent = currentCodingAgent(current);
    if (!codingAgent) return "";
    const providerLabel = firstText(
      current?.codingProvider?.status === "connected" ? current?.codingProvider?.label : ""
    );
    if (providerLabel) return providerLabel;
    return codingAgentLabel(codingAgent);
  }

  function renderCodingAgentOptions({ resetSelection = false } = {}) {
    if (!dom.createForm) return;
    const previous = resetSelection ? "" : selectedCodingAgent();

    CODING_AGENT_IDS.forEach((id) => {
      const input = id === "codex" ? dom.codexAgentInput : dom.claudeAgentInput;
      const option = id === "codex" ? dom.codexAgentOption : dom.claudeAgentOption;
      const status = id === "codex" ? dom.codexAgentStatus : dom.claudeAgentStatus;
      const info = codingAgentInfo(id);
      const available = isCodingAgentAvailable(id);
      input.disabled = !available;
      input.checked = false;
      option.classList.toggle("is-unavailable", !available && !state.systemLoading);
      option.setAttribute("aria-disabled", available ? "false" : "true");
      status.textContent = codingAgentStatus(id, info);
    });

    const preferred = previous && isCodingAgentAvailable(previous) ? previous : CODING_AGENT_IDS.find(isCodingAgentAvailable);
    if (preferred) {
      const input = preferred === "codex" ? dom.codexAgentInput : dom.claudeAgentInput;
      input.checked = true;
    }
    updateCreateAvailability();
  }

  function updateCreateAvailability() {
    if (!dom.createSubmitButton) return;
    const available = CODING_AGENT_IDS.filter(isCodingAgentAvailable);
    const selected = selectedCodingAgent();
    const noAvailable = !state.systemLoading && available.length === 0;
    const invalidSelection = !state.systemLoading && (!selected || !isCodingAgentAvailable(selected));
    CODING_AGENT_IDS.forEach((id) => {
      const input = id === "codex" ? dom.codexAgentInput : dom.claudeAgentInput;
      input.disabled = state.creating || !isCodingAgentAvailable(id);
    });
    dom.claudeWarning.hidden = !noAvailable;
    dom.createSystemWarning.hidden = !noAvailable;
    document.body.classList.toggle("has-claude-warning", noAvailable);
    scheduleViewportMetrics();
    dom.createSubmitButton.disabled = state.creating || state.systemLoading || noAvailable || invalidSelection;
    if (dom.browseWorkspaceButton) dom.browseWorkspaceButton.disabled = state.creating;
    if (dom.addCreateMaterialsButton) dom.addCreateMaterialsButton.disabled = state.creating;
    if (noAvailable) {
      dom.createSubmitButton.title = t("coding.install_first");
    } else if (invalidSelection) {
      dom.createSubmitButton.title = t("coding.choose_available");
    } else if (state.systemLoading) {
      dom.createSubmitButton.title = t("coding.checking_environment");
    } else {
      dom.createSubmitButton.removeAttribute("title");
    }
  }

  function readApiError(payload, status) {
    const localizedBackendMessage = I18N.resolvePair(
      payload?.error?.message_i18n || payload?.message_i18n || payload?.detail_i18n,
      state.locale,
      ""
    );
    const backendMessage = localizedBackendMessage || (
      typeof payload === "string"
        ? payload.trim()
        : firstText(payload?.detail, payload?.error?.message, payload?.error, payload?.message, payload?.reason)
    );

    const errorCode = firstText(payload?.code, payload?.error?.code).toLowerCase();
    const codeMessages = state.locale === "zh-CN"
      ? {
          push_subscription_missing: "当前设备的通知订阅尚未保存，请重新开启研发提醒。",
          push_subscription_origin_mismatch: "当前通知属于旧网页地址，请在本页面重新开启研发提醒。",
          push_subscription_limit: "这台设备保存了过多旧通知订阅，请先关闭提醒后重新开启。",
          notification_not_enabled: "当前设备尚未开启研发提醒。",
        }
      : {
          push_subscription_missing: "This device's notification subscription has not been saved. Enable developer alerts again.",
          push_subscription_origin_mismatch: "This notification belongs to an older app address. Enable developer alerts again on this page.",
          push_subscription_limit: "This device has too many old notification subscriptions. Disable alerts, then enable them again.",
          notification_not_enabled: "Developer alerts are not enabled on this device.",
        };
    if (codeMessages[errorCode]) return codeMessages[errorCode];

    if (status === 404 && backendMessage === "接口不存在") {
      return state.locale === "zh-CN"
        ? "后端接口尚未加载，请重启 AppLooper Web 服务并刷新页面后再试。"
        : "The backend route is not loaded. Restart the AppLooper web service, then refresh the page.";
    }

    const common = state.locale === "zh-CN"
      ? {
          400: "提交的内容不完整或格式不正确，请检查后重试。",
          401: "当前设备尚未获得访问权限，请重新打开可信网络连接。",
          403: "当前设备没有执行这项操作的权限。",
          404: "对应的应用或内容不存在，可能已经被移除。",
          409: "应用状态已经变化，请刷新后再试。",
          413: "附件过大，请缩小文件后重新上传。",
          415: "暂不支持这种文件格式。",
          429: "操作太频繁，请稍等片刻再试。",
          500: "工作流服务暂时出错，已保留当前页面内容，请稍后重试。",
          502: "暂时无法连接工作流进程，请稍后重试。",
          503: "工作流服务正在启动或维护，请稍后重试。",
          504: "工作流响应超时，请稍后重试。",
        }
      : {
          400: "The submitted content is incomplete or invalid. Check it and try again.",
          401: "This device is not authorized. Reopen the trusted connection.",
          403: "This device is not allowed to perform this action.",
          404: "The requested app or content does not exist or was removed.",
          409: "The app state changed. Refresh and try again.",
          413: "The attachment is too large. Upload a smaller file.",
          415: "This file type is not supported.",
          429: "Too many requests. Wait a moment and try again.",
          500: "The workflow service encountered an error. Your current page content was preserved.",
          502: "Cannot reach the workflow process right now. Try again shortly.",
          503: "The workflow service is starting or under maintenance. Try again shortly.",
          504: "The workflow response timed out. Try again shortly.",
        };

    if (backendMessage && containsChinese(backendMessage) && state.locale === "zh-CN") return backendMessage;
    if (common[status]) return common[status];
    if (backendMessage && !containsChinese(backendMessage)) return t("common.api_failed", { message: backendMessage });
    return t("common.api_failed_code", { status });
  }

  function networkErrorMessage(error, timedOut = false) {
    if (timedOut) return t("common.request_timeout");
    if (error?.name === "AbortError") return t("common.request_cancelled");
    return t("common.network_error");
  }

  function friendlyError(error, fallback = "操作未能完成，请稍后重试。") {
    const localizedFallback = state.locale !== "zh-CN" && containsChinese(fallback)
      ? t("common.failed")
      : fallback;
    if (error instanceof ApiError && error.message) {
      return state.locale !== "zh-CN" && containsChinese(error.message)
        ? localizedFallback
        : error.message;
    }
    if (error?.message && containsChinese(error.message)) {
      return state.locale === "zh-CN" ? error.message : localizedFallback;
    }
    return localizedFallback;
  }

  function containsChinese(value) {
    return /[\u3400-\u9fff]/.test(String(value || ""));
  }

  async function loadApps({ initial = false, silent = false, loadDetail = true, preferredId = "", timeoutMs = 0 } = {}) {
    if (initial) renderAppListLoading();
    try {
      const payload = await request("/apps", { timeoutMs });
      state.apps = normalizeList(payload);

      if (preferredId && state.apps.some((app) => appId(app) === preferredId)) {
        state.currentId = preferredId;
      }

      if (state.currentId && !state.apps.some((app) => appId(app) === state.currentId)) {
        state.currentId = "";
        state.current = null;
      }

      if (!state.currentId && state.apps.length && !requiresExplicitStudyWorkflowChoice()) {
        state.currentId = appId(state.apps[0]);
      }

      storeCurrentAppId(state.currentId);
      renderAppList();

      if (!state.apps.length || !state.currentId) {
        renderNoAppSelected();
      } else if (loadDetail) {
        await loadCurrentApp({ silent });
      }
    } catch (error) {
      markDisconnected();
      if (initial || !state.apps.length) renderAppListError(error);
      if (!silent) showToast(friendlyError(error, t("apps.list_failed")), "error");
    }
  }

  async function loadCurrentApp({ silent = false } = {}) {
    if (!state.currentId) return;
    if (silent && !state.launchOpen && !state.growthOpen && !state.experienceTwinOpen) {
      return syncDevelopmentSnapshot({ silent: true });
    }
    const requestedId = state.currentId;
    const requestNumber = ++state.detailRequest;
    if (!silent && (!state.current || state.current.id !== requestedId)) renderCurrentLoading();

    try {
      const payload = await request(`/apps/${encodeURIComponent(requestedId)}`);
      if (requestNumber !== state.detailRequest || requestedId !== state.currentId) return;
      const detail = preserveExperienceConversation(
        normalizeDetail(payload, requestedId, state.current),
        state.current?.id === requestedId ? state.current : null
      );
      detectNewDeveloperMessages(detail);
      state.current = {
        ...detail,
        personas: arrayFrom(detail.personas).length ? detail.personas : arrayFrom(state.current?.personas),
        operations: resolveOperationsForAppSnapshot(detail.operations),
      };
      persistDevelopmentCache(state.current);
      syncExperienceTwinCatalogFromDetail(detail);
      if (silent && shouldDeferBackgroundRender()) {
        state.deferredAppRender = true;
        renderHeader();
      } else {
        renderCurrentApp();
      }
      scheduleExperienceConversationSync();
    } catch (error) {
      if (requestNumber !== state.detailRequest || requestedId !== state.currentId) return;
      markDisconnected();
      if (!silent || !state.current) renderCurrentError(error);
      if (!silent) showToast(friendlyError(error, t("apps.detail_failed")), "error");
      if (error instanceof ApiError && error.status === 404) {
        clearDevelopmentCache(requestedId);
        await loadApps({ silent: true, loadDetail: false });
      }
    }
  }

  async function loadDevelopmentApp({ silent = false, timeoutMs = 0 } = {}) {
    if (!state.currentId) return;
    const requestedId = state.currentId;
    const requestNumber = ++state.detailRequest;
    if (!silent && (!state.current || state.current.id !== requestedId)) renderCurrentLoading();

    try {
      const payload = await request(`/apps/${encodeURIComponent(requestedId)}/development`, { timeoutMs });
      if (requestNumber !== state.detailRequest || requestedId !== state.currentId) return;
      applyDevelopmentSnapshot(payload, requestedId, { silent, fullRender: !silent });
    } catch (error) {
      if (requestNumber !== state.detailRequest || requestedId !== state.currentId) return;
      markDisconnected();
      if (!silent || !state.current) renderCurrentError(error);
      if (!silent) showToast(friendlyError(error, t("apps.detail_failed")), "error");
      if (error instanceof ApiError && error.status === 404) {
        clearDevelopmentCache(requestedId);
        await loadApps({ silent: true, loadDetail: false });
      }
    }
  }

  async function syncDevelopmentSnapshot({ silent = true, timeoutMs = 0 } = {}) {
    if (!state.currentId) return;
    const requestedId = state.currentId;
    const requestNumber = ++state.detailRequest;
    try {
      const payload = await request(`/apps/${encodeURIComponent(requestedId)}/development`, { timeoutMs });
      if (requestNumber !== state.detailRequest || requestedId !== state.currentId) return;
      applyDevelopmentSnapshot(payload, requestedId, { silent, fullRender: false });
    } catch (error) {
      if (requestNumber !== state.detailRequest || requestedId !== state.currentId) return;
      markDisconnected();
      if (!silent && !state.current) renderCurrentError(error);
    }
  }

  function applyDevelopmentSnapshot(payload, requestedId, { silent = true, fullRender = false } = {}) {
    const detail = preserveExperienceConversation(
      normalizeDetail(payload, requestedId, state.current),
      state.current?.id === requestedId ? state.current : null
    );
    state.current = {
      ...detail,
      personas: arrayFrom(detail.personas).length ? detail.personas : arrayFrom(state.current?.personas),
      experienceTwin: detail.experienceTwin?.views?.length ? detail.experienceTwin : (state.current?.experienceTwin || detail.experienceTwin),
      operations: resolveOperationsForAppSnapshot(detail.operations),
    };
    detectNewDeveloperMessages(detail);
    persistDevelopmentCache(state.current);
    const fingerprint = mainConversationFingerprint();
    const messagesChanged = fingerprint !== state.lastMainConversationFingerprint;
    state.lastMainConversationFingerprint = fingerprint;
    if (shouldDeferBackgroundRender()) {
      if (fullRender || messagesChanged || !silent) state.deferredAppRender = true;
      renderHeader();
      if (state.repositoryDialogOpen) renderRepositoryDialog();
      return;
    }
    if (fullRender || messagesChanged || !silent) {
      renderCurrentApp({ messageUpdate: messagesChanged && !fullRender ? "patch" : "full" });
    } else {
      renderHeader();
    }
    scheduleExperienceConversationSync();
  }

  function developmentCacheKey(id) {
    return `${DEVELOPMENT_CACHE_PREFIX}${String(id || "").trim()}`;
  }

  function developmentCacheApp(app, id) {
    const source = app && typeof app === "object" ? app : {};
    const keys = [
      "id", "app_id", "run_id", "workflow_id", "name", "title", "app_type", "type",
      "workflow_type", "workflowType", "workflow_app_label",
      "intent", "needs", "summary", "audience", "workspace", "coding_agent", "status",
      "phase", "updated_at", "updatedAt", "pid_alive",
    ];
    const snapshot = {};
    keys.forEach((key) => {
      const value = source[key];
      if (["string", "number", "boolean"].includes(typeof value)) snapshot[key] = value;
    });
    ["name_i18n", "app_type_i18n", "workflow_type_i18n", "workflow_app_label_i18n"].forEach((key) => {
      const value = source[key];
      if (value && typeof value === "object" && !Array.isArray(value)) snapshot[key] = { ...value };
    });
    if (!appId(snapshot)) snapshot.run_id = id;
    return snapshot;
  }

  function persistDevelopmentCache(detail) {
    if (!detail?.id) return;
    const messages = arrayFrom(detail.messages)
      .filter((message) => (
        usesDirectDeveloperStudyConversation() && usesAppLooperStudyTreatment()
          ? (isMainConversationMessage(message) || isExperienceThreadMessage(message))
          : !isExperienceThreadMessage(message)
      ))
      .slice(usesDirectDeveloperStudyConversation() && usesAppLooperStudyTreatment() ? -240 : -60);
    const cachedDetail = {
      id: detail.id,
      app: developmentCacheApp(detail.app, detail.id),
      status: detail.status,
      phase: detail.phase,
      pending: detail.pending,
      personas: arrayFrom(detail.personas).length ? detail.personas : arrayFrom(state.current?.personas),
      messages,
      updatedAt: detail.updatedAt,
      pidAlive: detail.pidAlive,
      developer: detail.developer,
      retry: detail.retry,
      experienceTwin: normalizeExperienceTwin(null),
      operations: {
        repository: normalizeOperations(detail.operations).repository,
      },
      raw: {},
    };
    try {
      localStorage.setItem(developmentCacheKey(detail.id), JSON.stringify({
        cachedAt: Date.now(),
        detail: cachedDetail,
      }));
    } catch {
      // Cache quota or private browsing must never block the live conversation.
    }
  }

  function restoreDevelopmentCache() {
    if (!state.currentId) return false;
    try {
      const cached = JSON.parse(localStorage.getItem(developmentCacheKey(state.currentId)) || "null");
      if (!cached?.detail || Date.now() - Number(cached.cachedAt || 0) > 7 * 24 * 60 * 60 * 1_000) {
        clearDevelopmentCache(state.currentId);
        return false;
      }
      state.current = {
        ...cached.detail,
        operations: {
          ...normalizeOperations(null),
          ...(cached.detail.operations && typeof cached.detail.operations === "object" ? cached.detail.operations : {}),
          repository: normalizeOperations(cached.detail.operations).repository,
        },
      };
      const cachedApp = cached.detail.app;
      if (cachedApp && appId(cachedApp)) {
        const cachedId = appId(cachedApp);
        const others = state.apps.filter((app) => {
          const id = appId(app);
          return id && id !== cachedId;
        });
        // Never collapse a paired A/B list down to the single restored app.
        state.apps = others.length ? [...others, cachedApp] : [cachedApp];
      }
      return true;
    } catch {
      clearDevelopmentCache(state.currentId);
      return false;
    }
  }

  function clearDevelopmentCache(id) {
    try {
      localStorage.removeItem(developmentCacheKey(id));
    } catch {
      // Storage cleanup is best-effort.
    }
  }

  function normalizeList(payload) {
    if (Array.isArray(payload)) return payload.filter(Boolean);
    const list = payload?.apps ?? payload?.items ?? payload?.results ?? [];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }

  function preserveExperienceConversation(detail, previous) {
    if (!detail || !previous || previous.id !== detail.id) return detail;
    const previousExperience = arrayFrom(previous.messages).filter(isExperienceThreadMessage);
    const incomingExperience = arrayFrom(detail.messages).filter(isExperienceThreadMessage);
    if (!previousExperience.length && !incomingExperience.length) return detail;

    const nextMain = arrayFrom(detail.messages).filter((message) => !isExperienceThreadMessage(message));
    const mergedExperience = mergeConversationHistory(previousExperience, incomingExperience);
    return {
      ...detail,
      messages: mergeOutgoingMessages(
        detail.id,
        mergeConversationHistory(nextMain, mergedExperience)
      ),
      personas: arrayFrom(detail.personas).length ? detail.personas : arrayFrom(previous.personas),
      raw: previous.raw?.experience_conversation || mergedExperience.length
        ? {
            ...(detail.raw || {}),
            experience_conversation: {
              ...(previous.raw?.experience_conversation || {}),
              count: mergedExperience.length,
            },
          }
        : detail.raw,
    };
  }

  function normalizeDetail(payload, id, fallback = null) {
    const data = payload && typeof payload === "object" ? payload : {};
    const app =
      data.state && typeof data.state === "object"
        ? data.state
        : data.app && typeof data.app === "object"
          ? data.app
          : data;
    const previous = fallback?.id === id ? fallback : null;
    const messagesSource = data.messages ?? app.messages ?? [];
    const incomingPersonas = data.personas ?? app.personas;
    const personasSource = arrayFrom(incomingPersonas).length
      ? incomingPersonas
      : (previous?.personas ?? []);
    const experienceTwinSource = data.experience_twin ?? app.experience_twin;
    const operationsSource = data.lifecycle ?? data.operations ?? app.lifecycle ?? app.operations;
    const hasOwn = (source, key) => Object.prototype.hasOwnProperty.call(source || {}, key);
    const codingAgentError = hasOwn(data, "error")
      ? data.error
      : hasOwn(app, "error")
        ? app.error
        : previous?.codingAgentError ?? null;
    const lastErrorSource = hasOwn(data, "last_error")
      ? data.last_error
      : hasOwn(app, "last_error")
        ? app.last_error
        : previous?.lastError;
    return {
      id,
      app,
      status: firstText(data.status, app.status, "created"),
      phase: firstText(data.phase, app.phase, ""),
      pending: data.pending ?? app.pending ?? null,
      personas: arrayFrom(personasSource),
      messages: mergeOutgoingMessages(id, arrayFrom(messagesSource?.items ?? messagesSource)),
      updatedAt: firstText(data.updated_at, app.updated_at, data.updatedAt, app.updatedAt),
      pidAlive:
        typeof data.pid_alive === "boolean"
          ? data.pid_alive
          : typeof app.pid_alive === "boolean"
            ? app.pid_alive
            : null,
      resumeRequest: data.resume_request ?? app.resume_request ?? previous?.resumeRequest ?? null,
      developer:
        data.developer_activity
        ?? app.developer_activity
        ?? data.developer
        ?? app.developer
        ?? previous?.developer
        ?? null,
      activityRevision: firstText(
        data.activity_revision,
        app.activity_revision,
        data.developer_activity?.revision,
        app.developer_activity?.revision
      ),
      codingProvider: data.coding_provider ?? app.coding_provider ?? previous?.codingProvider ?? null,
      retry: data.retry ?? app.retry ?? null,
      codingAgentCliArgs: data.cli_args ?? app.cli_args ?? previous?.codingAgentCliArgs ?? { claude: "", codex: "" },
      codingAgentError,
      lastError: firstText(lastErrorSource),
      experienceTwin: experienceTwinSource == null
        ? previous?.experienceTwin || normalizeExperienceTwin(null)
        : normalizeExperienceTwin(experienceTwinSource),
      operations: operationsSource == null
        ? previous?.operations || normalizeOperations(null)
        : normalizeOperations(operationsSource),
      raw: data,
    };
  }

  function normalizeOperations(value) {
    const source = value && typeof value === "object" ? value : {};
    const operationsSource = source.operations && typeof source.operations === "object" ? source.operations : source;
    const repositorySource = source.repository && typeof source.repository === "object" ? source.repository : {};
    const guidanceSource = source.guidance && typeof source.guidance === "object" ? source.guidance : {};
    const releasePlanSource = source.release_plan && typeof source.release_plan === "object" ? source.release_plan : {};
    const metricsSource = operationsSource.metrics && typeof operationsSource.metrics === "object"
      ? operationsSource.metrics
      : operationsSource.snapshot && typeof operationsSource.snapshot === "object"
        ? operationsSource.snapshot
        : {};
    const deploymentTargets = arrayFrom(source.deployment_targets ?? operationsSource.deployment_targets)
      .filter((item) => item && typeof item === "object")
      .map(normalizeOperationsTarget);
    const nestedSources = deploymentTargets.flatMap((target) => arrayFrom(target.analyticsSources));
    const dataSources = dedupeOperationsItems([
      ...arrayFrom(source.data_sources),
      ...arrayFrom(operationsSource.data_sources),
      ...nestedSources,
    ].filter((item) => item && typeof item === "object").map(normalizeOperationsDataSource).filter((item) => !item.autoDetected));
    const metricRecords = {};
    Object.entries(metricsSource).forEach(([key, item]) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        metricRecords[key] = normalizeOperationsMetric(key, item, dataSources);
      }
    });
    const explicitRecommendation = operationsSource.recommendation && typeof operationsSource.recommendation === "object"
      ? operationsSource.recommendation
      : source.recommendation && typeof source.recommendation === "object"
        ? source.recommendation
        : {};
    const missingInformation = arrayFrom(
      guidanceSource.missing_information ?? releasePlanSource.missing_information
    ).map((item) => firstText(item)).filter(Boolean).slice(0, 12);
    const nextVersionAttention = firstText(
      guidanceSource.next_version_attention,
      releasePlanSource.next_version_attention
    );
    const recommendationSource = Object.keys(explicitRecommendation).length
      ? explicitRecommendation
      : missingInformation.length
        ? {
            id: `release-missing:${missingInformation.slice(0, 2).join("|").slice(0, 300)}`,
            title: t("operations.missing_title", { count: missingInformation.length }),
            reason: missingInformation.slice(0, 2).join("；"),
            action_label: "release",
          }
        : nextVersionAttention
          ? {
              id: `next-version:${nextVersionAttention.slice(0, 300)}`,
              title: t("operations.next_version_title"),
              reason: nextVersionAttention,
              action_label: "strategy",
            }
          : {};
    return {
      schemaVersion: finiteNonNegative(source.schema_version ?? operationsSource.schema_version),
      repository: {
        provider: firstText(repositorySource.provider_id, repositorySource.provider, repositorySource.type),
        name: firstText(repositorySource.display_name, repositorySource.name),
        url: firstText(repositorySource.url, repositorySource.web_url),
        branch: firstText(repositorySource.branch),
        status: firstText(repositorySource.connection_status, repositorySource.status),
      },
      repositoryPush: normalizeRepositoryPush(source.repository_push ?? operationsSource.repository_push),
      releases: arrayFrom(source.releases).filter((item) => item && typeof item === "object"),
      deploymentSkill: normalizeOperationsSkill(source.deployment_skill ?? operationsSource.deployment_skill, "deployment"),
      analyticsSkill: normalizeOperationsSkill(
        source.analytics_skill ?? operationsSource.analytics_skill ?? source.operations_skill ?? operationsSource.operations_skill,
        "analytics"
      ),
      operationsSkill: normalizeOperationsSkill(
        source.operations_skill ?? operationsSource.operations_skill ?? source.analytics_skill ?? operationsSource.analytics_skill,
        "analytics"
      ),
      trafficSkill: normalizeOperationsSkill(source.traffic_skill ?? operationsSource.traffic_skill, "traffic"),
      feedbackSkill: normalizeOperationsSkill(source.feedback_skill ?? operationsSource.feedback_skill, "feedback"),
      trafficState: normalizeTrafficState(source.traffic_state ?? operationsSource.traffic_state),
      deploymentTargets,
      dataSources,
      metricRecords,
      derivation: normalizeOperationsDerivation(source.derivation ?? operationsSource.derivation),
      publicEnvironment: normalizeOperationsEnvironment(source.public_environment ?? operationsSource.public_environment),
      privacy: normalizeOperationsPrivacy(source.privacy ?? operationsSource.privacy),
      metrics: {
        activeUsers: availableMetricNumber(metricRecords.daily_active_users),
        monthlyActiveUsers: availableMetricNumber(metricRecords.monthly_active_users),
        newUsers: availableMetricNumber(metricRecords.new_users),
        events: null,
        retention: availableMetricNumber(metricRecords.retention),
        errors: availableMetricNumber(metricRecords.errors),
        crashes: availableMetricNumber(metricRecords.crashes),
        trend: availableMetricList(metricRecords.active_trend),
        versionAdoption: availableMetricList(metricRecords.version_adoption),
        updatedAt: Object.values(metricRecords).map((item) => item.observedAt).filter(Boolean).sort().at(-1) || "",
      },
      operationsAgent: normalizeOperationsAgent(source.operations_agent ?? operationsSource.operations_agent),
      messages: arrayFrom(source.messages ?? operationsSource.messages).filter((item) => item && typeof item === "object"),
      agentRequests: arrayFrom(source.agent_requests ?? operationsSource.agent_requests).filter((item) => item && typeof item === "object"),
      refreshRequests: arrayFrom(source.refresh_requests ?? operationsSource.refresh_requests).filter((item) => item && typeof item === "object"),
      suggestions: arrayFrom(source.suggestions ?? operationsSource.suggestions).filter((item) => item && typeof item === "object"),
      recommendation: {
        id: firstText(recommendationSource.id),
        title: firstText(recommendationSource.title),
        reason: firstText(recommendationSource.reason, recommendationSource.body),
        action: firstText(recommendationSource.action_label),
        createdAt: firstText(recommendationSource.created_at),
      },
      guidance: {
        readiness: firstText(guidanceSource.readiness),
        missingInformation,
        nextVersionAttention,
        nextConfirmation: firstText(guidanceSource.next_confirmation),
      },
      events: arrayFrom(source.events ?? source.history).filter((item) => item && typeof item === "object"),
      releaseReview: normalizeReleaseReview(source.release_review ?? operationsSource.release_review),
      internalTestAnalysis: normalizeInternalTestAnalysis(
        source.internal_test_analysis ?? operationsSource.internal_test_analysis
      ),
      testMaintainerSummary: normalizeTestMaintainerSummary(
        source.test_maintainer_summary ?? operationsSource.test_maintainer_summary
      ),
      ownerProxy: normalizeOwnerProxy(source.owner_proxy ?? operationsSource.owner_proxy),
      communityPublication: normalizeCommunityPublication(
        source.community_publication ?? operationsSource.community_publication
      ),
      eufrThemes: arrayFrom(source.eufr_themes ?? operationsSource.eufr_themes)
        .map(normalizeEufrTheme)
        .filter(Boolean),
      launchAutoPolicy: normalizeLaunchAutoPolicy(source.launch_auto_policy ?? operationsSource.launch_auto_policy),
      feedbackCollection: normalizeFeedbackCollection(source.feedback_collection ?? operationsSource.feedback_collection),
      updatedAt: firstText(source.updated_at, operationsSource.updated_at),
    };
  }

  function mergeOperationsRecords(previous, incoming, idSelector = (item) => firstText(item?.id)) {
    const merged = new Map();
    [...arrayFrom(previous), ...arrayFrom(incoming)].forEach((item) => {
      if (!item || typeof item !== "object") return;
      const id = idSelector(item) || firstText(item.created_at, item.body)?.slice(0, 240);
      if (!id) return;
      merged.set(id, item);
    });
    return [...merged.values()].sort((left, right) => {
      const leftAt = Date.parse(firstText(left.created_at, left.updated_at, left.at)) || 0;
      const rightAt = Date.parse(firstText(right.created_at, right.updated_at, right.at)) || 0;
      return leftAt - rightAt;
    });
  }

  function pickFeedbackCollection(previous, incoming) {
    const prev = normalizeFeedbackCollection(previous);
    const next = normalizeFeedbackCollection(incoming);
    const prevCount = arrayFrom(prev.channels).length;
    const nextCount = arrayFrom(next.channels).length;
    if (nextCount && !prevCount) return next;
    if (prevCount && !nextCount) return prev;
    if (nextCount && prevCount) {
      const nextAt = Date.parse(next.updatedAt || "") || 0;
      const prevAt = Date.parse(prev.updatedAt || "") || 0;
      return nextAt >= prevAt ? next : prev;
    }
    if (next.scanFingerprint) return next;
    if (prev.scanFingerprint) return prev;
    return next;
  }

  function mergeOperationsState(previous, incoming) {
    const next = normalizeOperations(incoming);
    if (!previous) return next;
    const prev = normalizeOperations(previous);
    const prevUrls = [
      ...arrayFrom(prev.publicEnvironment?.publicUrls),
      ...prev.deploymentTargets.map((target) => target.publicUrl).filter(Boolean),
    ];
    const nextUrls = [
      ...arrayFrom(next.publicEnvironment?.publicUrls),
      ...next.deploymentTargets.map((target) => target.publicUrl).filter(Boolean),
    ];
    const preferPreviousEnvironment = prevUrls.length > nextUrls.length;
    const preferPreviousTargets = prev.deploymentTargets.filter((target) => target.publicUrl).length
      > next.deploymentTargets.filter((target) => target.publicUrl).length;
    const preferPreviousReleases = arrayFrom(prev.releases).length > arrayFrom(next.releases).length;
    return {
      ...next,
      publicEnvironment: preferPreviousEnvironment ? prev.publicEnvironment : next.publicEnvironment,
      deploymentTargets: preferPreviousTargets ? prev.deploymentTargets : next.deploymentTargets,
      releases: preferPreviousReleases ? prev.releases : next.releases,
      repository: pickPreferredRepository(prev.repository, next.repository),
      repositoryPush: pickPreferredRepositoryPush(prev.repositoryPush, next.repositoryPush),
      guidance: arrayFrom(next.guidance?.missingInformation).length ? next.guidance : prev.guidance,
      messages: mergeOperationsRecords(prev.messages, next.messages),
      agentRequests: mergeOperationsRecords(
        prev.agentRequests,
        next.agentRequests,
        (item) => firstText(item?.id, item?.clientRequestId, item?.client_request_id)
      ),
      refreshRequests: mergeOperationsRecords(prev.refreshRequests, next.refreshRequests),
      releaseReview: pickReleaseReview(prev.releaseReview, next.releaseReview),
      communityPublication: next.communityPublication?.published
        ? next.communityPublication
        : prev.communityPublication,
      eufrThemes: next.eufrThemes?.length || !prev.eufrThemes?.length ? next.eufrThemes : prev.eufrThemes,
      launchAutoPolicy: next.launchAutoPolicy?.updatedAt
        ? next.launchAutoPolicy
        : (prev.launchAutoPolicy?.updatedAt ? prev.launchAutoPolicy : next.launchAutoPolicy),
      feedbackCollection: pickFeedbackCollection(prev.feedbackCollection, next.feedbackCollection),
    };
  }

  function repositorySnapshotScore(repository) {
    const snapshot = repository && typeof repository === "object" ? repository : {};
    let score = 0;
    if (firstText(snapshot.status).toLowerCase() === "connected") score += 8;
    if (firstText(snapshot.url)) score += 4;
    if (firstText(snapshot.name, snapshot.provider)) score += 2;
    if (firstText(snapshot.branch)) score += 1;
    return score;
  }

  function pickPreferredRepository(previous, incoming) {
    const prev = normalizeOperations({ repository: previous }).repository;
    const next = normalizeOperations({ repository: incoming }).repository;
    return repositorySnapshotScore(next) >= repositorySnapshotScore(prev) ? next : prev;
  }

  function normalizeRepositoryPush(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      ready: Boolean(source.ready),
      status: firstText(source.status),
      summary: firstText(source.summary),
      hasUncommitted: Boolean(source.has_uncommitted ?? source.hasUncommitted),
      hasUnpushed: Boolean(source.has_unpushed ?? source.hasUnpushed),
      changedFiles: finiteNonNegative(source.changed_files ?? source.changedFiles),
      aheadCommits: finiteNonNegative(source.ahead_commits ?? source.aheadCommits),
      commitMessage: firstText(source.commit_message, source.commitMessage),
      filesPreview: arrayFrom(source.files_preview ?? source.filesPreview).map((item) => firstText(item)).filter(Boolean).slice(0, 8),
    };
  }

  function repositoryPushScore(value) {
    const push = normalizeRepositoryPush(value);
    let score = push.ready ? 10 : 0;
    if (push.commitMessage) score += 4;
    if (push.changedFiles) score += Math.min(push.changedFiles, 5);
    if (push.aheadCommits) score += Math.min(push.aheadCommits, 5);
    if (push.summary) score += 1;
    return score;
  }

  function pickPreferredRepositoryPush(previous, incoming) {
    const prev = normalizeRepositoryPush(previous);
    const next = normalizeRepositoryPush(incoming);
    return repositoryPushScore(next) >= repositoryPushScore(prev) ? next : prev;
  }

  function currentRepositoryPush() {
    return state.current?.operations?.repositoryPush || normalizeRepositoryPush(null);
  }

  function currentOperationsSnapshot() {
    return state.current?.operations || state.operations || null;
  }

  function resolveOperationsForAppSnapshot(incoming) {
    if (state.launchOpen || state.growthOpen) return currentOperationsSnapshot() || normalizeOperations(incoming);
    return mergeOperationsState(currentOperationsSnapshot(), incoming);
  }

  function mergeConversationHistory(...collections) {
    const records = new Map();
    let sequence = 0;
    collections.forEach((collection) => {
      arrayFrom(collection).forEach((message) => {
        if (!message || typeof message !== "object") return;
        const directId = developerMessageId(message);
        const fallbackId = [
          messageChannel(message),
          firstText(message?.actor, message?.role),
          messageTime(message),
          messageTitle(message),
          messageText(message),
        ].join("\u0001");
        const key = directId || fallbackId;
        if (!key) return;
        const existing = records.get(key);
        if (existing) {
          existing.message = { ...existing.message, ...message };
          return;
        }
        records.set(key, { message, sequence: sequence++ });
      });
    });
    return [...records.values()]
      .sort((left, right) => {
        const leftTime = Date.parse(messageTime(left.message));
        const rightTime = Date.parse(messageTime(right.message));
        if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
          return leftTime - rightTime;
        }
        return left.sequence - right.sequence;
      })
      .map((record) => record.message);
  }

  function shouldSyncExperienceConversation() {
    return Boolean(
      state.current
      && state.currentId === state.current.id
      && usesDirectDeveloperStudyConversation()
      && usesAppLooperStudyTreatment()
    );
  }

  function scheduleExperienceConversationSync({ force = false } = {}) {
    if (!shouldSyncExperienceConversation()) return;
    const runId = state.currentId;
    const lastLoadedAt = Number(state.experienceConversationLastLoadedAt.get(runId) || 0);
    if (!force && Date.now() - lastLoadedAt < 5_000) return;
    if (state.experienceConversationLoadingFor === runId) return;
    void loadExperienceConversation({ silent: true, force });
  }

  async function loadExperienceConversation({ silent = true, force = false } = {}) {
    if (!state.currentId || !state.current) return;
    const requestedId = state.currentId;
    if (state.experienceConversationLoadingFor === requestedId && !force) return;
    state.experienceConversationLoadingFor = requestedId;
    const requestNumber = ++state.experienceConversationRequest;
    const hadExperience = hasExperienceFeedback();
    state.experienceConversationLoading = !hadExperience;
    state.experienceConversationError = false;
    if (state.chatView === "experience" && !hadExperience) renderMessages();

    try {
      const payload = await request(
        `/apps/${encodeURIComponent(requestedId)}/experience-conversation`,
        { timeoutMs: 30_000 }
      );
      if (requestNumber !== state.experienceConversationRequest || requestedId !== state.currentId) return;
      const archived = arrayFrom(payload?.messages?.items ?? payload?.messages);
      const mergedMessages = mergeConversationHistory(state.current.messages, archived);
      state.current = {
        ...state.current,
        personas: arrayFrom(payload?.personas).length
          ? arrayFrom(payload.personas)
          : arrayFrom(state.current.personas),
        messages: mergeOutgoingMessages(requestedId, mergedMessages),
        raw: {
          ...(state.current.raw || {}),
          experience_conversation: {
            ...(payload || {}),
            count: mergedMessages.filter(isExperienceThreadMessage).length,
          },
        },
      };
      state.experienceConversationLastLoadedAt.set(requestedId, Date.now());
      state.experienceConversationError = false;
      persistDevelopmentCache(state.current);
      const fingerprint = mainConversationFingerprint();
      const messagesChanged = fingerprint !== state.lastMainConversationFingerprint;
      state.lastMainConversationFingerprint = fingerprint;
      if (messagesChanged) renderCurrentApp({ messageUpdate: "patch" });
    } catch (error) {
      if (requestNumber !== state.experienceConversationRequest || requestedId !== state.currentId) return;
      state.experienceConversationError = true;
      if (!silent) showToast(friendlyError(error, t("apps.detail_failed")), "error");
      if (state.chatView === "experience") renderMessages();
    } finally {
      if (requestNumber === state.experienceConversationRequest) {
        state.experienceConversationLoading = false;
        if (state.chatView === "experience") renderMessages();
      }
      if (state.experienceConversationLoadingFor === requestedId) {
        state.experienceConversationLoadingFor = "";
      }
    }
  }

  function operationsSkillDefaultName(kind) {
    const keys = {
      deployment: "operations.launch_skill_default",
      analytics: "operations.analytics_skill_default",
      traffic: "operations.traffic_skill_default",
      feedback: "operations.feedback_skill_default",
      operations: "operations.analytics_skill_default",
    };
    return t(keys[kind] || "operations.analytics_skill_default");
  }

  function normalizeOperationsSkill(value, kind) {
    const source = value && typeof value === "object" ? value : {};
    const generatedSource = source.generated && typeof source.generated === "object" ? source.generated : {};
    const manualSource = source.manual_override && typeof source.manual_override === "object" ? source.manual_override : null;
    const draftSource = source.draft && typeof source.draft === "object" ? source.draft : null;
    const draftGenerationSource = source.draft_generation && typeof source.draft_generation === "object" ? source.draft_generation : {};
    const configMode = firstText(source.config_mode, source.configMode, "simple").toLowerCase() === "advanced" ? "advanced" : "simple";
    return {
      id: firstText(source.id),
      name: firstText(source.name, operationsSkillDefaultName(kind)),
      summary: firstText(source.summary),
      instructions: firstText(source.instructions),
      configMode,
      dataSources: arrayFrom(source.data_sources ?? source.dataSources).map(normalizeSkillDataSource).filter(Boolean),
      campaignItems: arrayFrom(source.campaign_items ?? source.campaignItems).map(normalizeSkillCampaignItem).filter(Boolean),
      missingFields: arrayFrom(source.missing_fields ?? source.missingFields).map(normalizeSkillMissingField).filter(Boolean),
      draft: draftSource ? {
        name: firstText(draftSource.name),
        summary: firstText(draftSource.summary),
        instructions: firstText(draftSource.instructions),
        configMode: firstText(draftSource.config_mode, draftSource.configMode, "simple").toLowerCase() === "advanced" ? "advanced" : "simple",
        dataSources: arrayFrom(draftSource.data_sources ?? draftSource.dataSources).map(normalizeSkillDataSource).filter(Boolean),
        campaignItems: arrayFrom(draftSource.campaign_items ?? draftSource.campaignItems).map(normalizeSkillCampaignItem).filter(Boolean),
        missingFields: arrayFrom(draftSource.missing_fields ?? draftSource.missingFields).map(normalizeSkillMissingField).filter(Boolean),
      } : null,
      draftGeneration: {
        status: ["idle", "running", "completed", "error"].includes(firstText(draftGenerationSource.status).toLowerCase())
          ? firstText(draftGenerationSource.status).toLowerCase()
          : "idle",
        startedAt: firstText(draftGenerationSource.started_at, draftGenerationSource.startedAt),
        completedAt: firstText(draftGenerationSource.completed_at, draftGenerationSource.completedAt),
        error: firstText(draftGenerationSource.error),
      },
      revision: finiteNonNegative(source.revision) ?? 0,
      isDefault: source.is_default !== false,
      management: ["auto", "manual"].includes(firstText(source.management).toLowerCase())
        ? firstText(source.management).toLowerCase()
        : source.is_default !== false ? "auto" : "manual",
      generated: {
        instructions: firstText(generatedSource.instructions),
        fingerprint: firstText(generatedSource.fingerprint),
        updatedAt: firstText(generatedSource.updated_at),
        evidence: arrayFrom(generatedSource.evidence).filter((item) => item && typeof item === "object").map((item) => ({
          path: firstText(item.path),
          kind: firstText(item.kind),
          providerId: firstText(item.provider_id),
          digest: firstText(item.digest),
        })),
      },
      manualOverride: manualSource ? {
        instructions: firstText(manualSource.instructions),
        updatedAt: firstText(manualSource.updated_at),
      } : null,
      updatedAt: firstText(source.updated_at),
    };
  }

  function normalizeSkillMissingField(value) {
    if (!value || typeof value !== "object") return null;
    const field = firstText(value.field);
    const prompt = firstText(value.prompt);
    if (!field || !prompt) return null;
    return { field, label: firstText(value.label, field), prompt };
  }

  function normalizeSkillDataSource(value) {
    if (!value || typeof value !== "object") return null;
    const name = firstText(value.name);
    if (!name) return null;
    const kind = firstText(value.kind, "internal").toLowerCase() === "api_dashboard" ? "api_dashboard" : "internal";
    return {
      id: firstText(value.id),
      kind,
      name,
      description: firstText(value.description),
      endpointUrl: firstText(value.endpoint_url, value.endpointUrl, value.url),
      metrics: firstText(value.metrics),
      moduleHint: firstText(value.module_hint, value.moduleHint),
      adapterNotes: firstText(value.adapter_notes, value.adapterNotes),
    };
  }

  function normalizeSkillCampaignItem(value) {
    if (!value || typeof value !== "object") return null;
    const platform = firstText(value.platform, value.name);
    if (!platform) return null;
    return {
      id: firstText(value.id),
      platform,
      method: firstText(value.method),
      budget: firstText(value.budget),
      schedule: firstText(value.schedule),
      triggers: firstText(value.triggers),
      targetUrl: firstText(value.target_url, value.targetUrl, value.url),
      audience: firstText(value.audience),
      notes: firstText(value.notes),
    };
  }

  function normalizeTrafficState(value) {
    const source = value && typeof value === "object" ? value : {};
    const allowed = new Set(["not_configured", "draft", "scheduled", "running", "paused", "completed", "error"]);
    const status = firstText(source.status, "not_configured").toLowerCase();
    return {
      status: allowed.has(status) ? status : "not_configured",
      summary: firstText(source.summary),
      platforms: arrayFrom(source.platforms).map((item) => {
        if (!item || typeof item !== "object") return null;
        const name = firstText(item.name);
        if (!name) return null;
        return {
          name,
          method: firstText(item.method),
          schedule: firstText(item.schedule),
          triggers: firstText(item.triggers),
          status: firstText(item.status, "draft").toLowerCase(),
        };
      }).filter(Boolean),
      updatedAt: firstText(source.updated_at),
    };
  }

  function normalizeOperationsTarget(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      id: firstText(source.id),
      providerId: firstText(source.provider_id, source.providerId, source.provider),
      displayName: firstText(source.display_name, source.displayName, source.name),
      publicUrl: firstText(source.public_url, source.publicUrl, source.url),
      status: firstText(source.status),
      autoDetected: source.auto_detected === true || source.autoDetected === true,
      analyticsSources: arrayFrom(source.analytics_sources ?? source.analyticsSources).map(normalizeOperationsDataSource),
    };
  }

  function normalizeOperationsDataSource(value) {
    const source = value && typeof value === "object" ? value : {};
    const verificationSource = source.verification && typeof source.verification === "object"
      ? source.verification
      : {};
    return {
      id: firstText(source.id),
      providerId: firstText(source.provider_id, source.providerId, source.provider),
      displayName: firstText(source.display_name, source.displayName, source.name),
      kind: firstText(source.kind),
      publicUrl: firstText(source.public_url, source.publicUrl, source.url),
      sourceRef: firstText(source.source_ref, source.sourceRef),
      integrationReady: source.integration_ready === true || source.integrationReady === true,
      authorizationReady: source.authorization_ready === true || source.authorizationReady === true,
      authorizationStatus: firstText(
        source.authorization_status,
        source.authorizationStatus,
        "needs_information"
      ).toLowerCase(),
      authorizationMissingFields: arrayFrom(
        source.authorization_missing_fields ?? source.authorizationMissingFields
      ).filter((item) => item && typeof item === "object").map((item) => ({
        field: firstText(item.field),
        label: firstText(item.label, item.field),
        prompt: firstText(item.prompt, item.label, item.field),
        kind: firstText(item.kind, "information").toLowerCase() === "verification"
          ? "verification"
          : "information",
      })).filter((item) => item.field),
      verification: {
        status: firstText(verificationSource.status, "pending").toLowerCase(),
        snapshotCount: finiteNonNegative(
          verificationSource.snapshot_count ?? verificationSource.snapshotCount
        ) ?? 0,
        lastVerifiedAt: firstText(
          verificationSource.last_verified_at,
          verificationSource.lastVerifiedAt
        ),
      },
      configured: source.configured === true,
      status: firstText(source.status, source.configured === true ? "configured" : "detected").toLowerCase(),
      autoDetected: source.auto_detected === true || source.autoDetected === true,
      supportedMetrics: arrayFrom(source.supported_metrics ?? source.supportedMetrics).map(firstText).filter(Boolean),
      adapterId: firstText(source.adapter_id, source.adapterId),
      accessMode: firstText(source.access_mode, source.accessMode, "authorized").toLowerCase(),
      privacyMode: firstText(source.privacy_mode, source.privacyMode, "aggregate_only").toLowerCase(),
      rawEventStorage: source.raw_event_storage === true || source.rawEventStorage === true,
      minCohortSize: finiteNonNegative(source.min_cohort_size ?? source.minCohortSize),
      retentionDays: finiteNonNegative(source.retention_days ?? source.retentionDays),
      allowedDimensions: arrayFrom(source.allowed_dimensions ?? source.allowedDimensions).map(firstText).filter(Boolean),
      forbiddenFields: arrayFrom(source.forbidden_fields ?? source.forbiddenFields).map(firstText).filter(Boolean),
    };
  }

  function normalizeOperationsDerivation(value) {
    const source = value && typeof value === "object" ? value : {};
    const evidence = (items) => arrayFrom(items).filter((item) => item && typeof item === "object").map((item) => ({
      id: firstText(item.id),
      path: firstText(item.path),
      kind: firstText(item.kind),
      providerId: firstText(item.provider_id),
      summary: firstText(item.summary),
      at: firstText(item.at),
      digest: firstText(item.digest),
    }));
    return {
      status: firstText(source.status, "default").toLowerCase(),
      fingerprint: firstText(source.fingerprint),
      workspaceEvidence: evidence(source.workspace_evidence),
      conversationEvidence: evidence(source.conversation_evidence),
      detectedProviders: arrayFrom(source.detected_providers).map(firstText).filter(Boolean),
      updatedAt: firstText(source.updated_at),
    };
  }

  function normalizeOperationsEnvironment(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      status: firstText(source.status, "not_detected").toLowerCase(),
      providers: arrayFrom(source.providers).map(firstText).filter(Boolean),
      publicUrls: arrayFrom(source.public_urls).map(firstText).filter(Boolean),
      analyticsProviders: arrayFrom(source.analytics_providers).map(firstText).filter(Boolean),
      dataState: firstText(source.data_state, "not_configured").toLowerCase(),
    };
  }

  function normalizeOperationsPrivacy(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      status: firstText(source.status, "protected").toLowerCase(),
      mode: firstText(source.mode, "aggregate_only").toLowerCase(),
      rawEventStorage: source.raw_event_storage === true,
      minCohortSize: finiteNonNegative(source.min_cohort_size),
      retentionDays: finiteNonNegative(source.retention_days),
      allowedDimensions: arrayFrom(source.allowed_dimensions).map(firstText).filter(Boolean),
      forbiddenFields: arrayFrom(source.forbidden_fields).map(firstText).filter(Boolean),
      crossPlatformDeduplication: source.cross_platform_deduplication === true,
      credentialStorage: firstText(source.credential_storage),
    };
  }

  function dedupeOperationsItems(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = firstText(item.id, `${item.providerId}:${item.publicUrl || item.sourceRef}`);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function normalizeOperationsMetric(key, value, dataSources) {
    const sourceId = firstText(value.source_id);
    const source = dataSources.find((item) => item.id === sourceId);
    const provenance = firstText(value.provenance);
    const status = firstText(value.status).toLowerCase();
    const rawValue = value.value;
    const validValue = typeof rawValue === "number"
      ? Number.isFinite(rawValue) && rawValue >= 0
      : Array.isArray(rawValue) && rawValue.length > 0 && rawValue.every((item) => {
          if (typeof item === "number") return Number.isFinite(item) && item >= 0;
          const number = Number(item?.value);
          return item && typeof item === "object" && Number.isFinite(number) && number >= 0;
        });
    const sourceReady = source?.configured === true && ["configured", "refreshing", "stale"].includes(source.status);
    const available = status === "available" && sourceReady && Boolean(provenance) && validValue;
    return {
      key,
      label: firstText(value.label, key),
      unit: firstText(value.unit),
      status: available ? "available" : status || "unavailable",
      value: available ? rawValue : null,
      sourceId,
      sourceName: firstText(value.source_name, source?.displayName),
      observedAt: firstText(value.observed_at),
      provenance: available ? provenance : "",
    };
  }

  function normalizeOperationsAgent(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      agentId: firstText(source.agent_id, "operations"),
      displayName: firstText(source.display_name),
      provider: firstText(source.provider),
      sessionId: firstText(source.session_id),
      status: firstText(source.status, "idle").toLowerCase(),
      currentRequestId: firstText(source.current_request_id),
      currentAction: firstText(source.current_action),
      updatedAt: firstText(source.updated_at),
      lastRefreshRequestedAt: firstText(source.last_refresh_requested_at),
      lastRefreshCompletedAt: firstText(source.last_refresh_completed_at),
      lastSuggestionAt: firstText(source.last_suggestion_at),
      lastError: firstText(source.last_error),
    };
  }

  function normalizeScenarioEvidence(value, fallback = {}) {
    const source = value && typeof value === "object" ? value : {};
    const setup = source.setup && typeof source.setup === "object" ? source.setup : {};
    const cleanup = source.cleanup && typeof source.cleanup === "object" ? source.cleanup : {};
    const verdict = source.user_verdict && typeof source.user_verdict === "object"
      ? source.user_verdict
      : {};
    const provenance = source.provenance && typeof source.provenance === "object"
      ? source.provenance
      : {};
    const mode = firstText(setup.mode) === "adapter" && setup.explicit_adapter && setup.test_only
      ? "adapter"
      : "ui_replay";
    return {
      version: Number(source.version) || 1,
      scenarioId: firstText(source.scenario_id, fallback.scenarioId),
      candidateVersionId: firstText(
        source.candidate_version_id,
        source.candidate_id,
        fallback.candidateVersionId
      ),
      feedbackClusterId: firstText(source.feedback_cluster_id),
      semanticTargetIds: arrayFrom(source.semantic_target_ids).map((item) => firstText(item)).filter(Boolean).slice(0, 24),
      fixtureHash: firstText(source.fixture_hash),
      setup: {
        mode,
        recipe: firstText(setup.recipe),
        steps: arrayFrom(setup.steps).map((item) => firstText(item)).filter(Boolean).slice(0, 24),
        verified: Boolean(setup.verified),
        preparationKind: firstText(
          setup.preparation_kind,
          setup.producer_evidence ? (mode === "adapter" ? "fixture_prepared" : "ui_replay_preparation") : "fallback_plain_route"
        ),
        producerEvidence: Boolean(setup.producer_evidence),
      },
      cleanup: {
        required: Boolean(cleanup.required),
        status: firstText(cleanup.status, "pending"),
        receipt: firstText(cleanup.receipt),
      },
      deepLink: firstText(source.deep_link, source.guide_route, fallback.guideRoute, "/"),
      guideRoute: firstText(source.guide_route, source.deep_link, fallback.guideRoute, "/"),
      assertions: arrayFrom(source.assertions).slice(0, 24),
      virtualReplay: source.virtual_replay && typeof source.virtual_replay === "object"
        ? source.virtual_replay
        : {},
      userVerdict: {
        verdict: ["pass", "return"].includes(firstText(verdict.verdict, source.verdict))
          ? firstText(verdict.verdict, source.verdict)
          : "pending",
        at: firstText(verdict.at),
        sessionId: firstText(verdict.session_id),
      },
      provenance: {
        kind: firstText(provenance.kind, "workflow_agent"),
        summary: firstText(provenance.summary),
        sourceIds: arrayFrom(provenance.source_ids).map((item) => firstText(item)).filter(Boolean).slice(0, 8),
        at: firstText(provenance.at),
      },
    };
  }

  function normalizeReleaseReviewItem(value) {
    const source = value && typeof value === "object" ? value : {};
    const scenarioId = firstText(source.scenario_id, source.scenarioId);
    const guideRoute = firstText(source.guide_route, source.guideRoute, "/");
    const controlKind = firstText(source.control_kind, source.controlKind, "check").toLowerCase() === "switch"
      ? "switch"
      : "check";
    let ownerVerdict = firstText(source.owner_verdict, source.ownerVerdict, "unverified").toLowerCase();
    if (!["unverified", "passed", "failed"].includes(ownerVerdict)) ownerVerdict = "unverified";
    const checked = Boolean(source.checked) || ownerVerdict === "passed";
    if (checked && ownerVerdict === "unverified" && controlKind === "switch") ownerVerdict = "passed";
    return {
      id: firstText(source.id),
      section: firstText(source.section),
      layer: firstText(source.layer, "task"),
      title: localizedField(source, "title"),
      description: localizedField(source, "description"),
      // Advisory switches never count as required checklist gates.
      required: controlKind === "switch" ? false : source.required !== false,
      blocksRelease: Boolean(source.blocks_release ?? source.blocksRelease),
      checked,
      checkedAt: firstText(source.checked_at, source.checkedAt),
      controlKind,
      ownerVerdict,
      failNote: firstText(source.fail_note, source.failNote),
      verifyHowto: firstText(source.verify_howto, source.verifyHowto, localizedField(source, "description")),
      trialSeed: (() => {
        const seed = source.trial_seed && typeof source.trial_seed === "object"
          ? source.trial_seed
          : (source.trialSeed && typeof source.trialSeed === "object" ? source.trialSeed : {});
        return {
          version: 1,
          ensureLogs: Math.max(0, Math.min(5, Number(seed.ensure_logs ?? seed.ensureLogs ?? 0) || 0)),
          focusId: firstText(seed.focus_id, seed.focusId).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64),
          storageKey: firstText(seed.storage_key, seed.storageKey, "hydration_app_v1").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64) || "hydration_app_v1",
        };
      })(),
      themeId: firstText(source.theme_id, source.themeId),
      guideRoute,
      scenarioId,
      contextProvenance: arrayFrom(source.context_provenance).map((item) => firstText(item)).filter(Boolean).slice(0, 8),
      scenarioEvidence: normalizeScenarioEvidence(source.scenario_evidence, {
        scenarioId,
        candidateVersionId: firstText(source.candidate_version_id),
        guideRoute,
      }),
    };
  }

  function normalizeInternalTestAnalysis(value) {
    const source = value && typeof value === "object" ? value : {};
    const list = (key) => localizedArrayField(source, key)
      .map((item) => firstText(item)).filter(Boolean).slice(0, 24);
    return {
      label: localizedField(source, "label", t("release.maintainer_title")),
      evidenceKind: "simulated",
      cohortCoverage: list("cohort_coverage"),
      issueClusters: list("issue_clusters"),
      affectedPersonas: list("affected_personas"),
      fixesReplays: list("fixes_replays"),
      changeSummary: list("change_summary"),
      rawTrails: list("raw_trails"),
    };
  }

  function normalizeTestMaintainerSummary(value) {
    const source = value && typeof value === "object" ? value : {};
    const list = (key) => localizedArrayField(source, key)
      .map((item) => firstText(item)).filter(Boolean).slice(0, 40);
    const unresolved = source.unresolved && typeof source.unresolved === "object" ? source.unresolved : {};
    return {
      contractId: firstText(source.contract_id),
      results: list("results"),
      flakyFields: list("flaky_fields"),
      quarantineFields: list("quarantine_fields"),
      mutationFields: list("mutation_fields"),
      unresolved: {
        flaky: Boolean(unresolved.flaky || list("flaky_fields").length),
        quarantine: Boolean(unresolved.quarantine || list("quarantine_fields").length),
        mutation: Boolean(unresolved.mutation || list("mutation_fields").length),
      },
    };
  }

  function normalizeOwnerProxy(value) {
    const source = value && typeof value === "object" ? value : {};
    const rawProfile = source.profile && typeof source.profile === "object" ? source.profile : {};
    const profileI18n = source.profile_i18n && typeof source.profile_i18n === "object"
      ? source.profile_i18n
      : {};
    const profile = {};
    new Set([...Object.keys(rawProfile), ...Object.keys(profileI18n)]).forEach((key) => {
      if (profileI18n[key] && typeof profileI18n[key] === "object") {
        const selected = I18N.resolvePair(profileI18n[key], state.locale, "");
        if (selected) profile[key] = selected;
        return;
      }
      const raw = rawProfile[key];
      if (typeof raw !== "string" || state.locale !== "en" || !I18N.containsCjk(raw)) {
        profile[key] = raw;
      }
    });
    const bypass = source.bypass && typeof source.bypass === "object" ? source.bypass : {};
    return {
      label: localizedField(source, "label", t("release.owner_proxy_label")),
      profile,
      feedbackItemCount: Number(source.feedback_item_count) || 0,
      receipts: arrayFrom(source.receipts).map((receipt, index) => ({
        id: firstText(receipt?.id, `owner_proxy_${index + 1}`),
        round: Number(receipt?.round) || index + 1,
        sourceRefs: arrayFrom(receipt?.source_refs).map((item) => firstText(item)).filter(Boolean),
        evidenceRefs: arrayFrom(receipt?.evidence_refs).map((item) => firstText(item)).filter(Boolean),
        outcome: firstText(receipt?.outcome, "unknown"),
        differences: localizedArrayField(receipt, "differences")
          .map((item) => firstText(item)).filter(Boolean),
        unresolvedRisks: localizedArrayField(receipt, "unresolved_risks")
          .map((item) => firstText(item)).filter(Boolean),
      })),
      bypass: {
        bypassed: Boolean(bypass.bypassed),
        at: firstText(bypass.at),
        reason: firstText(bypass.reason),
      },
    };
  }

  function normalizeAcceptanceBrief(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      persona: localizedField(source, "persona"),
      finding: localizedField(source, "finding"),
      screenshotName: firstText(source.screenshot_name, source.screenshotName),
      change: localizedField(source, "change"),
      check: localizedField(source, "check"),
      sourceItemId: firstText(source.source_item_id, source.sourceItemId),
      systemGateSummary: localizedField(source, "system_gate_summary", firstText(source.systemGateSummary)),
      stopRuleNotice: localizedField(source, "stop_rule_notice", firstText(source.stopRuleNotice)),
      openP0Count: Number(source.open_p0_count ?? source.openP0Count ?? 0) || 0,
      taskPathsPassed: Number(source.task_paths_passed ?? source.taskPathsPassed ?? 0) || 0,
      taskPathsTotal: Number(source.task_paths_total ?? source.taskPathsTotal ?? 0) || 0,
      regressionPassed: Boolean(source.regression_passed ?? source.regressionPassed),
    };
  }

  function normalizeReleaseReview(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      id: firstText(source.id),
      studyCondition: firstText(source.study_condition, source.studyCondition),
      approvalBinding: firstText(source.approval_binding, source.approvalBinding, "candidate"),
      candidateVersionId: firstText(source.candidate_version_id, source.candidateVersionId),
      candidateLabel: firstText(source.candidate_label, source.candidateLabel),
      reviewablePrototype: Boolean(source.reviewable_prototype ?? source.reviewablePrototype),
      acceptanceBrief: normalizeAcceptanceBrief(source.acceptance_brief ?? source.acceptanceBrief),
      gate: firstText(source.gate, "draft").toLowerCase(),
      items: arrayFrom(source.items).map(normalizeReleaseReviewItem).filter((item) => item.id),
      attestationAccepted: Boolean(source.attestation_accepted ?? source.attestationAccepted),
      attestationText: firstText(source.attestation_text, source.attestationText),
      attestationAt: firstText(source.attestation_at, source.attestationAt),
      deferReason: firstText(source.defer_reason, source.deferReason),
      deferredAt: firstText(source.deferred_at, source.deferredAt),
      readyAt: firstText(source.ready_at, source.readyAt),
      createdAt: firstText(source.created_at, source.createdAt),
      updatedAt: firstText(source.updated_at, source.updatedAt),
    };
  }

  function releaseReviewProgressScore(value) {
    const review = normalizeReleaseReview(value);
    const gateScore = {
      draft: 0,
      deferred: 10,
      ready: 100,
      released: 200,
    }[review.gate] || 0;
    return gateScore
      + review.items.filter((item) => item.checked).length
      + (review.attestationAccepted ? 25 : 0);
  }

  function pickReleaseReview(previous, incoming) {
    const prev = normalizeReleaseReview(previous);
    const next = normalizeReleaseReview(incoming);
    if (!next.candidateVersionId && !next.items.length) return prev;
    if (
      prev.candidateVersionId
      && next.candidateVersionId
      && prev.candidateVersionId !== next.candidateVersionId
    ) {
      return next;
    }
    return releaseReviewProgressScore(next) >= releaseReviewProgressScore(prev) ? next : prev;
  }

  function normalizeCommunityPublication(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      published: source.published === true,
      releaseId: firstText(source.release_id, source.releaseId),
      candidateVersionId: firstText(source.candidate_version_id, source.candidateVersionId),
      title: firstText(source.title),
      publishedAt: firstText(source.published_at, source.publishedAt),
      updatedAt: firstText(source.updated_at, source.updatedAt),
    };
  }

  function normalizeEufrRawEntry(value) {
    const source = value && typeof value === "object" ? value : {};
    const body = firstText(source.body);
    if (!body) return null;
    return {
      id: firstText(source.id),
      body,
      channel: firstText(source.channel),
      moduleHint: firstText(source.module_hint, source.moduleHint),
      createdAt: firstText(source.created_at, source.createdAt),
    };
  }

  function normalizeEufrTheme(value) {
    const source = value && typeof value === "object" ? value : {};
    const title = firstText(source.title);
    if (!title) return null;
    return {
      id: firstText(source.id),
      title,
      summary: firstText(source.summary),
      status: firstText(source.status, "collected").toLowerCase(),
      priority: firstText(source.priority, "P2").toUpperCase(),
      mergedCount: finiteNonNegative(source.merged_count ?? source.mergedCount) || 1,
      firstSeen: firstText(source.first_seen, source.firstSeen),
      lastSeen: firstText(source.last_seen, source.lastSeen),
      linkedVersionPlanned: firstText(source.linked_version_planned, source.linkedVersionPlanned),
      linkedVersionShipped: firstText(source.linked_version_shipped, source.linkedVersionShipped),
      resolutionSummary: firstText(source.resolution_summary, source.resolutionSummary),
      wontFixReason: firstText(source.wont_fix_reason, source.wontFixReason),
      rawEntries: arrayFrom(source.raw_entries ?? source.rawEntries).map(normalizeEufrRawEntry).filter(Boolean),
      updatedAt: firstText(source.updated_at, source.updatedAt),
    };
  }

  function normalizeLaunchAutoPolicy(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      enabled: Boolean(source.enabled),
      updatedAt: firstText(source.updated_at, source.updatedAt),
    };
  }

  function normalizeFeedbackChannel(value) {
    const source = value && typeof value === "object" ? value : {};
    const kind = firstText(source.kind).toLowerCase();
    if (!kind) return null;
    return {
      id: firstText(source.id),
      kind,
      label: firstText(source.label, kind),
      sourcePath: firstText(source.source_path, source.sourcePath),
      route: firstText(source.route),
      destination: firstText(source.destination),
      detail: firstText(source.detail),
      confidence: firstText(source.confidence, "medium").toLowerCase(),
    };
  }

  function normalizeFeedbackCollection(value) {
    const source = value && typeof value === "object" ? value : {};
    const channels = arrayFrom(source.channels).map(normalizeFeedbackChannel).filter(Boolean);
    const status = firstText(source.status, channels.length ? "detected" : "not_detected").toLowerCase();
    return {
      status: status === "detected" || channels.length ? "detected" : "not_detected",
      summary: firstText(source.summary),
      channels,
      scanFingerprint: firstText(source.scan_fingerprint, source.scanFingerprint),
      updatedAt: firstText(source.updated_at, source.updatedAt),
    };
  }

  function releaseReviewAttestationText(review = null) {
    if (review?.reviewablePrototype) {
      return state.locale === "zh-CN"
        ? "我确认已审查该可评审原型的已知问题，并仅将其提交到本次用户研究环境。"
        : "I confirm that I reviewed the known limitations of this reviewable prototype and will submit it only to this user-study environment.";
    }
    return t("release.attestation");
  }

  function availableMetricNumber(metric) {
    return metric?.status === "available" && Number.isFinite(Number(metric.value)) ? Number(metric.value) : null;
  }

  function availableMetricList(metric) {
    return metric?.status === "available" && Array.isArray(metric.value) ? metric.value : [];
  }

  function finiteNonNegative(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function normalizeExperienceTwinLocalTrial(value) {
    if (!value || typeof value !== "object") return null;
    const status = firstText(value.status, value.state).toLowerCase();
    const kind = firstText(value.kind, value.type).toLowerCase();
    return {
      kind,
      status: status || (value.url || value.download_url ? "ready" : "missing"),
      url: firstText(value.url, value.download_url, value.downloadUrl),
      filename: firstText(value.filename, value.display_name, value.name),
      sizeBytes: finiteNonNegative(value.size_bytes ?? value.size ?? value.bytes) ?? 0,
      requiresSameWifi: value.requires_same_wifi === true || value.requiresSameWifi === true,
      networkScope: firstText(value.network_scope, value.networkScope).toLowerCase(),
      message: firstText(value.message, value.reason_message),
      reason: firstText(value.reason, value.error_code).toLowerCase(),
    };
  }

  function normalizeExperienceTwin(value) {
    const source = value && typeof value === "object" ? value : {};
    const entry = firstText(source.entry, source.url, source.preview_url);
    const rawViews = arrayFrom(source.views ?? source.surfaces);
    const normalizedViews = rawViews.map((view, index) => {
      const item = view && typeof view === "object" ? view : {};
      const viewport = item.viewport && typeof item.viewport === "object" ? item.viewport : item;
      const width = normalizeViewportDimension(viewport.width);
      const height = normalizeViewportDimension(viewport.height);
      const id = firstText(item.id, item.key, item.type, `view-${index + 1}`);
      const label = firstText(item.label, item.name);
      return {
        id,
        label,
        surface: normalizeExperienceTwinSurface(firstText(item.surface, item.kind, item.surface_type), `${id} ${label}`),
        platform: normalizeExperienceTwinPlatform(firstText(item.platform, item.os, item.system), `${id} ${label}`),
        deviceName: normalizeExperienceTwinDeviceName(firstText(item.device_name, item.deviceName, item.device, item.model), label),
        route: firstText(item.route, item.path),
        width,
        height,
        requiredRuntimes: normalizeRemoteRuntimes(item.required_runtimes ?? item.requiredRuntimes ?? item.runtimes),
        missingRuntimes: normalizeRemoteRuntimes(item.missing_runtimes ?? item.missingRuntimes),
        requiresInstallConfirmation: item.requires_install_confirmation === true || item.requiresInstallConfirmation === true,
        runtimeMessage: firstText(item.message),
        runtimeStatus: firstText(item.status, item.runtime_status).toLowerCase(),
        previewMode: firstText(item.preview_mode, item.previewMode).toLowerCase(),
        previewReason: firstText(item.preview_reason, item.previewReason),
        previewMessage: firstText(item.preview_message, item.previewMessage),
        iframeCompatible: item.iframe_compatible === true || item.iframeCompatible === true,
        localTrial: normalizeExperienceTwinLocalTrial(item.local_trial ?? item.localTrial),
        changelog: normalizeExperienceTwinChangelog(item.changelog ?? item.change_history ?? item.changes ?? item.history),
      };
    });

    const views = [];
    normalizedViews.forEach((view) => {
      const identity = experienceTwinViewIdentity(view);
      const existing = views.find((candidate) => experienceTwinViewIdentity(candidate) === identity);
      if (!existing) {
        views.push(view);
        return;
      }
      existing.changelog = uniqueExperienceTwinChanges([...existing.changelog, ...view.changelog]);
      existing.platform ||= view.platform;
      existing.deviceName ||= view.deviceName;
      existing.route ||= view.route;
      existing.previewMode ||= view.previewMode;
      existing.previewReason ||= view.previewReason;
      existing.previewMessage ||= view.previewMessage;
      existing.iframeCompatible ||= view.iframeCompatible;
      existing.localTrial ||= view.localTrial;
    });

    if (entry && !views.length) {
      views.push({
        id: "responsive",
        label: "",
        surface: "responsive",
        platform: "",
        deviceName: "",
        route: "",
        width: 0,
        height: 0,
        previewMode: "remote_browser",
        previewReason: "compatibility_unknown",
        previewMessage: "",
        iframeCompatible: false,
        localTrial: null,
        changelog: [],
      });
    }

    const fallbackSource = source.fallback && typeof source.fallback === "object" ? source.fallback : {};
    return {
      runtime: firstText(source.runtime, "web_preview"),
      entry,
      views,
      sharedSession: source.shared_session === true || source.sharedSession === true,
      fallback: {
        mode: firstText(fallbackSource.mode, "coding_agent"),
        codingAgent: firstText(fallbackSource.coding_agent, fallbackSource.codingAgent),
        message: firstText(fallbackSource.message, typeof source.fallback === "string" ? source.fallback : ""),
      },
    };
  }

  function experienceTwinCatalogFingerprint(value) {
    const twin = value || normalizeExperienceTwin(null);
    return JSON.stringify({
      runtime: firstText(twin.runtime),
      entry: firstText(twin.entry),
      sharedSession: twin.sharedSession === true,
      views: arrayFrom(twin.views).map((view) => ({
        id: firstText(view?.id),
        label: firstText(view?.label),
        surface: firstText(view?.surface),
        platform: firstText(view?.platform),
        deviceName: firstText(view?.deviceName),
        route: firstText(view?.route),
        width: Number(view?.width) || 0,
        height: Number(view?.height) || 0,
        requiredRuntimes: normalizeRemoteRuntimes(view?.requiredRuntimes).map((runtime) => runtime.id),
        missingRuntimes: normalizeRemoteRuntimes(view?.missingRuntimes).map((runtime) => runtime.id),
        requiresInstallConfirmation: view?.requiresInstallConfirmation === true,
        runtimeStatus: firstText(view?.runtimeStatus),
        previewMode: firstText(view?.previewMode),
        previewReason: firstText(view?.previewReason),
        iframeCompatible: view?.iframeCompatible === true,
        localTrial: view?.localTrial ? {
          kind: firstText(view.localTrial.kind),
          status: firstText(view.localTrial.status),
          url: firstText(view.localTrial.url),
          filename: firstText(view.localTrial.filename),
          sizeBytes: Number(view.localTrial.sizeBytes) || 0,
          requiresSameWifi: view.localTrial.requiresSameWifi === true,
          networkScope: firstText(view.localTrial.networkScope),
          reason: firstText(view.localTrial.reason),
        } : null,
        changelog: arrayFrom(view?.changelog).map((change) => firstText(change)).filter(Boolean),
      })),
    });
  }

  function experienceTwinPresentationFingerprint(twin, view) {
    return JSON.stringify({
      view: view ? {
        id: firstText(view.id),
        surface: firstText(view.surface),
        platform: firstText(view.platform),
        deviceName: firstText(view.deviceName),
        route: firstText(view.route),
        width: Number(view.width) || 0,
        height: Number(view.height) || 0,
        requiredRuntimes: normalizeRemoteRuntimes(view.requiredRuntimes).map((runtime) => runtime.id),
      } : null,
    });
  }

  function syncExperienceTwinCatalogFromDetail(detail) {
    if (!detail || state.experienceTwinAppId !== detail.id || !state.experienceTwin) return;
    const nextCatalog = detail.experienceTwin || normalizeExperienceTwin(null);
    const nextFingerprint = experienceTwinCatalogFingerprint(nextCatalog);
    if (!state.experienceTwinDetailFingerprint) {
      state.experienceTwinDetailFingerprint = nextFingerprint;
      return;
    }
    if (nextFingerprint === state.experienceTwinDetailFingerprint) return;

    const previousCatalog = state.experienceTwin;
    const previousView = activeExperienceTwinView();
    const previousSessionId = state.remoteExperienceSession?.id;
    state.experienceTwinDetailFingerprint = nextFingerprint;
    state.experienceTwin = nextCatalog;
    state.remoteExperience = null;

    const activeAvailable = nextCatalog.views.some(
      (view) => normalizedIdentity(view.id) === normalizedIdentity(state.experienceTwinViewId)
    );
    if (!activeAvailable) state.experienceTwinViewId = nextCatalog.views[0]?.id || "";
    const nextView = activeExperienceTwinView();
    const presentationChanged = experienceTwinPresentationFingerprint(previousCatalog, previousView)
      !== experienceTwinPresentationFingerprint(nextCatalog, nextView);
    if (presentationChanged) {
      window.clearTimeout(state.remoteExperiencePollTimer);
      state.remoteExperiencePollTimer = null;
      disconnectRemoteExperienceRfb();
      state.remoteExperienceSession = null;
      state.remoteExperienceError = null;
      state.experienceTwinRenderKey = "";
      if (previousSessionId) void deleteRemoteExperienceSession(detail.id, previousSessionId);
    }

    if (state.experienceTwinOpen) {
      renderExperienceTwin();
      void loadExperienceTwin({ force: true });
    }
  }

  function normalizeRemoteExperience(payload, fallbackTwin = null) {
    const root = payload && typeof payload === "object" ? payload : {};
    const source = root.remote_experience && typeof root.remote_experience === "object"
      ? root.remote_experience
      : root;
    const surfaces = arrayFrom(source.surfaces ?? source.views ?? source.experience_surfaces);
    const catalog = normalizeExperienceTwin({
      entry: firstText(source.entry, source.preview_url, fallbackTwin?.entry),
      views: surfaces.length ? surfaces : arrayFrom(fallbackTwin?.views),
      fallback: source.fallback ?? fallbackTwin?.fallback,
      shared_session: true,
    });
    const nestedSession = source.session && typeof source.session === "object" ? source.session : null;
    const hasSessionFields = Boolean(source.session_id || source.viewer_url || source.novnc_url || source.websocket_url);
    return {
      catalog,
      capabilities: source.capabilities && typeof source.capabilities === "object" ? source.capabilities : {},
      session: normalizeRemoteExperienceSession(nestedSession || (hasSessionFields ? source : null)),
      message: firstText(source.message),
    };
  }

  function normalizeRemoteExperienceSession(value) {
    if (!value || typeof value !== "object") return null;
    const source = value.session && typeof value.session === "object" ? value.session : value;
    const errorSource = source.error && typeof source.error === "object" ? source.error : null;
    const installConfirmed = source.install_confirmed === true || source.installConfirmed === true;
    const normalizedStatus = normalizeRemoteExperienceStatus(firstText(source.status, source.state, source.phase));
    return {
      id: firstText(source.session_id, source.id, source.sessionId),
      status: normalizedStatus === "missing_runtime" && installConfirmed ? "installing" : normalizedStatus,
      surfaceId: firstText(source.surface_id, source.surfaceId, source.view_id, source.viewId),
      viewerUrl: firstText(source.viewer_url, source.novnc_url, source.viewerUrl, source.novncUrl),
      websocketUrl: firstText(source.websocket_url, source.websocketUrl, source.ws_url, source.wsUrl),
      requiresInstallConfirmation:
        source.requires_install_confirmation === true ||
        source.requiresInstallConfirmation === true ||
        source.install_confirmation_required === true,
      installConfirmed,
      missingRuntimes: normalizeRemoteRuntimes(source.missing_runtimes ?? source.missingRuntimes),
      message: firstText(source.message, errorSource?.message, typeof source.error === "string" ? source.error : ""),
      errorCode: firstText(errorSource?.code, source.error_code, source.code),
      pollAfterMs: normalizeRemotePollDelay(source.poll_after_ms ?? source.retry_after_ms ?? source.pollAfterMs),
      credentials: source.credentials && typeof source.credentials === "object" ? source.credentials : null,
      createdAt: firstText(source.created_at, source.createdAt),
      updatedAt: firstText(source.updated_at, source.updatedAt),
    };
  }

  function remoteExperiencePreparationTimedOut(session) {
    if (!session || !["preparing", "connecting"].includes(session.status)) return false;
    const started = Date.parse(firstText(session.createdAt, session.updatedAt));
    return Number.isFinite(started) && Date.now() - started >= 90_000;
  }

  function normalizeRemoteRuntimes(value) {
    return arrayFrom(value)
      .map((runtime) => {
        if (runtime && typeof runtime === "object") {
          return {
            id: firstText(runtime.id, runtime.runtime, runtime.key, runtime.name, runtime.label),
            label: firstText(runtime.label, runtime.name, runtime.runtime, runtime.id),
            status: firstText(runtime.status).toLowerCase(),
            installable: runtime.installable !== false,
          };
        }
        const label = firstText(runtime);
        return label ? { id: label, label, status: "", installable: true } : null;
      })
      .filter(Boolean);
  }

  function normalizeRemoteExperienceStatus(value) {
    const status = normalizedIdentity(value).replace(/[\s-]+/g, "_");
    const aliases = {
      available: "idle",
      created: "preparing",
      queued: "preparing",
      starting: "preparing",
      launching: "preparing",
      booting: "preparing",
      running: "ready",
      connected: "ready",
      active: "ready",
      waiting_for_install: "waiting_install_confirmation",
      requires_install_confirmation: "waiting_install_confirmation",
      missing_emulator: "missing_runtime",
      missing_runtimes: "missing_runtime",
      needs_install: "missing_runtime",
      error: "failed",
      unavailable: "failed",
      disconnected: "expired",
    };
    return aliases[status] || status || "idle";
  }

  function normalizeRemotePollDelay(value) {
    const delay = Number(value);
    if (!Number.isFinite(delay) || delay <= 0) return 1_500;
    return Math.min(10_000, Math.max(500, Math.round(delay)));
  }

  function normalizeViewportDimension(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 0;
    return Math.min(16_384, Math.max(80, Math.round(number)));
  }

  function normalizeExperienceTwinSurface(value, legacyDescriptor = "") {
    const explicit = normalizedIdentity(value).replace(/[\s-]+/g, "_");
    const aliases = {
      desktop_web: "desktop_web",
      desktopweb: "desktop_web",
      pc_web: "desktop_web",
      mobile_web: "mobile_web",
      mobileweb: "mobile_web",
      phone_web: "mobile_web",
      h5: "mobile_web",
      mobile_app: "mobile_app",
      mobileapp: "mobile_app",
      native_app: "mobile_app",
      nativeapp: "mobile_app",
      watch_app: "watch_app",
      watchapp: "watch_app",
      watch: "watch_app",
      wear_os: "watch_app",
      wearos: "watch_app",
      tablet_web: "tablet_web",
      tabletweb: "tablet_web",
      tablet_app: "tablet_app",
      tabletapp: "tablet_app",
      desktop_app: "desktop_app",
      desktopapp: "desktop_app",
      linux_app: "desktop_app",
      linuxapp: "desktop_app",
      windows_app: "desktop_app",
      windowsapp: "desktop_app",
      android_app: "mobile_app",
      androidapp: "mobile_app",
      responsive: "responsive",
      responsive_web: "responsive",
      other: "other",
    };
    if (aliases[explicit]) return aliases[explicit];

    const descriptor = `${value || ""} ${legacyDescriptor || ""}`
      .normalize("NFKC")
      .toLocaleLowerCase("zh-CN");
    const compact = descriptor.replace(/[\s_-]+/g, "");
    if (/(watch|wear|手表)/.test(descriptor)) return "watch_app";
    if (/(tablet|ipad|平板)/.test(descriptor)) {
      return /(web|browser|网页|浏览器)/.test(descriptor) ? "tablet_web" : "tablet_app";
    }
    if (/(desktop\s*[-_]?\s*app|pc\s*[-_]?\s*app|windows\s*app|macos\s*app|电脑应用)/.test(descriptor) || compact.includes("desktopapp")) {
      return "desktop_app";
    }
    if (/(native\s*[-_]?\s*app|mobile\s*[-_]?\s*app|phone\s*[-_]?\s*app|android|ios|harmony|鸿蒙|手机应用)/.test(descriptor) || compact.includes("nativeapp")) {
      return "mobile_app";
    }
    if (/(mobile\s*[-_]?\s*web|phone\s*[-_]?\s*web|\bh5\b|手机网页)/.test(descriptor) || compact.includes("mobileweb")) {
      return "mobile_web";
    }
    if (/(desktop\s*[-_]?\s*web|\bdesktop\b|\bpc\s*[-_]?\s*web\b|电脑网页)/.test(descriptor) || compact.includes("desktopweb")) {
      return "desktop_web";
    }
    if (/(responsive|响应式|自适应)/.test(descriptor)) return "responsive";
    if (/(\bweb\b|网页)/.test(descriptor)) return "desktop_web";
    return "other";
  }

  function normalizeExperienceTwinPlatform(value, legacyDescriptor = "") {
    const provided = firstText(value);
    const usable = /^(?:unspecified|unknown|generic|none|null|n\/?a|待确认|未指定)$/i.test(provided) ? "" : provided;
    if (usable) {
      const bare = usable.normalize("NFKC").trim().toLocaleLowerCase("en-US");
      if (/^harmony\s*os$|^harmonyos$|^hongmeng$|^鸿蒙$/.test(bare)) return "HarmonyOS";
      if (/^wear\s*os$|^wearos$/.test(bare)) return "Wear OS";
      if (/^watch\s*os$|^watchos$/.test(bare)) return "watchOS";
      if (/^android$/.test(bare)) return "Android";
      if (/^ios$/.test(bare)) return "iOS";
      if (/^windows$/.test(bare)) return "Windows";
      if (/^mac\s*os$|^macos$/.test(bare)) return "macOS";
      if (/^linux$/.test(bare)) return "Linux";
      if (/^web$/.test(bare)) return "Web";
      // Versions, browser engines and container types are meaningful test
      // evidence (for example "Android 15 / Chrome"). Keep them verbatim.
      return usable;
    }
    const descriptor = `${legacyDescriptor || ""}`
      .normalize("NFKC")
      .toLocaleLowerCase("en-US");
    if (/harmony\s*os|harmonyos|hongmeng|鸿蒙/.test(descriptor)) return "HarmonyOS";
    if (/wear\s*os|wearos/.test(descriptor)) return "Wear OS";
    if (/watch\s*os|watchos/.test(descriptor)) return "watchOS";
    if (/android/.test(descriptor)) return "Android";
    if (/(^|[^a-z])ios([^a-z]|$)|iphone|ipad/.test(descriptor)) return "iOS";
    if (/windows/.test(descriptor)) return "Windows";
    if (/mac\s*os|macos|macbook/.test(descriptor)) return "macOS";
    if (/linux/.test(descriptor)) return "Linux";
    if (/(?:^|\s)web(?:\s|$)|browser|网页|浏览器/.test(descriptor)) return "Web";
    return "";
  }

  function normalizeExperienceTwinDeviceName(value, legacyLabel = "") {
    const provided = firstText(value);
    if (provided && !/^(?:unspecified|unknown|generic|none|null|n\/?a|(?:mobile|desktop|tablet)\s+browser|generic\s+device|(?:android|ios|phone|mobile|tablet|watch|desktop)\s+device)$/i.test(provided)) {
      return provided;
    }
    const label = firstText(legacyLabel);
    if (!label) return "";
    const match = label.match(/\b(?:iPhone(?:\s+(?:SE|\d{1,2})(?:\s+(?:Pro(?:\s+Max)?|Plus|Mini))?)?|Pixel\s+\d+[A-Za-z]*(?:\s+Pro)?|Galaxy\s+[A-Z]\d+\+?|Apple\s+Watch(?:\s+[A-Za-z0-9]+){0,3}|Huawei\s+Watch(?:\s+[A-Za-z0-9]+){0,3}|Mate\s+\d+(?:\s+Pro)?)\b/i);
    return match ? match[0].trim() : "";
  }

  function normalizeExperienceTwinChangelog(value) {
    const items = Array.isArray(value) ? value : value == null ? [] : [value];
    return uniqueExperienceTwinChanges(items.map((entry) => {
      if (entry && typeof entry === "object") {
        return firstText(entry.summary, entry.title, entry.message, entry.description, entry.change, entry.text);
      }
      return firstText(entry);
    }));
  }

  function uniqueExperienceTwinChanges(changes) {
    const seen = new Set();
    return changes.filter((change) => {
      const identity = normalizedIdentity(change);
      if (!identity || seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
  }

  function experienceTwinViewIdentity(view) {
    const surface = experienceTwinViewKind(view);
    const descriptor = surface === "other" ? normalizedIdentity(firstText(view?.label, view?.id)) : "";
    return [
      surface,
      normalizedIdentity(view?.platform),
      normalizedIdentity(view?.deviceName),
      Number(view?.width) || 0,
      Number(view?.height) || 0,
      descriptor,
    ].join("|");
  }

  function experienceTwinViewKind(view) {
    const surface = normalizeExperienceTwinSurface(firstText(view?.surface), `${firstText(view?.id)} ${firstText(view?.label)}`);
    return surface || "other";
  }

  function experienceTwinViewLabel(view, index = 0) {
    const kind = experienceTwinViewKind(view);
    return kind === "unknown"
      ? t("twin.view.unknown", { index: index + 1 })
      : t(`twin.view.${kind}`);
  }

  function experienceTwinViewMeta(view) {
    const kind = experienceTwinViewKind(view);
    const details = [];
    if (view?.platform) details.push(view.platform);
    if (view?.deviceName) details.push(view.deviceName);

    if (!view?.platform) {
      if (["desktop_web", "mobile_web", "tablet_web", "responsive"].includes(kind)) details.push(t("twin.platform.web"));
      else if (kind === "mobile_app") details.push(t("twin.platform.mobile_unknown"));
      else if (kind === "watch_app") details.push(t("twin.platform.watch_unknown"));
      else if (kind === "tablet_app") details.push(t("twin.platform.tablet_unknown"));
      else if (kind === "desktop_app") details.push(t("twin.platform.desktop_unknown"));
    }
    if (!view?.deviceName) {
      if (kind === "desktop_web") details.push(t("twin.platform.desktop_browser"));
      else if (kind === "mobile_web") details.push(t("twin.platform.mobile_browser"));
      else if (kind === "tablet_web") details.push(t("twin.platform.tablet_browser"));
      else if (["mobile_app", "watch_app", "tablet_app", "desktop_app"].includes(kind)) details.push(t("twin.platform.device_unknown"));
    }

    details.push(
      view?.width && view?.height
        ? t("twin.viewport", { width: view.width, height: view.height })
        : t("twin.responsive")
    );
    return details.join(" · ");
  }

  function appId(app) {
    return firstText(app?.id, app?.app_id, app?.run_id, app?.workflow_id);
  }

  function appTitle(app) {
    const title = localizedFirstField(app, ["name", "title", "app_type", "type"]);
    if (title) return title;
    const intent = localizedFirstField(app, ["intent", "needs", "summary"]);
    if (intent) return intent.length > 34 ? `${intent.slice(0, 34)}…` : intent;
    return appId(app) || t("apps.unnamed");
  }

  function appSummary(app) {
    return localizedFirstField(app, ["audience", "summary", "intent", "needs"], statusLabel(app?.status));
  }

  function renderAppListLoading() {
    dom.appList.replaceChildren();
    const loading = element("div", "loading-list");
    loading.setAttribute("aria-label", t("apps.loading"));
    loading.append(document.createElement("span"), document.createElement("span"), document.createElement("span"));
    dom.appList.append(loading);
  }

  function appListFingerprint(apps = state.apps) {
    const rows = apps
      .map((app) => [appId(app), String(app?.status || ""), appTitle(app), appSummary(app)].join("\u0001"))
      .join("\u0002");
    // The selected application is presentation state too. Without it, a
    // successful detail switch can update the header while the memoized list
    // keeps the previous card highlighted.
    return `${state.currentId}\u0000${rows}`;
  }

  function renderAppList() {
    const fingerprint = appListFingerprint();
    if (fingerprint === state.lastAppListFingerprint && dom.appList.childElementCount) return;
    state.lastAppListFingerprint = fingerprint;
    dom.appList.replaceChildren();
    if (!state.apps.length) {
      const empty = element("div", "side-empty app-empty");
      empty.append(element("strong", "", t("apps.empty_title")), element("span", "", t("apps.empty_copy")));
      dom.appList.append(empty);
      return;
    }

    state.apps.forEach((app) => {
      const id = appId(app);
      const button = element("button", `app-item${id === state.currentId ? " is-active" : ""}`);
      button.type = "button";
      button.setAttribute("role", "listitem");
      button.dataset.appId = id;
      button.setAttribute("aria-current", id === state.currentId ? "true" : "false");

      const dot = element("span", `app-status-dot ${statusTone(app?.status)}`);
      dot.setAttribute("aria-hidden", "true");
      const content = element("span", "app-item-content");
      content.append(element("span", "app-item-title", appTitle(app)), element("span", "app-item-summary", appSummary(app)));
      button.append(dot, content);
      button.addEventListener("click", () => selectApp(id));
      dom.appList.append(button);
    });
  }

  function renderAppListError(error) {
    dom.appList.replaceChildren();
    const box = element("div", "side-empty");
    box.append(element("strong", "", t("apps.load_failed")), element("span", "", friendlyError(error)));
    const retry = element("button", "text-button", t("apps.reload"));
    retry.type = "button";
    retry.addEventListener("click", () => loadApps({ initial: true }));
    box.append(retry);
    dom.appList.append(box);
  }

  function hideProductPages() {
    if (dom.launchPage) dom.launchPage.hidden = true;
    if (dom.growthPage) dom.growthPage.hidden = true;
  }

  async function selectApp(id) {
    if (!id || id === state.currentId) {
      closeDrawers();
      return;
    }
    rememberChatScrollPosition();
    closeDeveloperSession();
    clearPendingFiles();
    state.currentId = id;
    state.current = null;
    document.documentElement.classList.remove("is-study-choosing");
    state.renderedAppId = null;
    state.renderedConversationView = "";
    state.lastMainConversationFingerprint = "";
    state.chatView = usesDirectDeveloperStudyConversation() ? "developer" : "main";
    state.launchOpen = false;
    state.growthOpen = false;
    state.growthToolsOpen = false;
    state.conversationTabRestored = false;
    state.operations = null;
    // Invalidate any in-flight operations fetch. Must also clear the refreshing
    // latch: otherwise the previous request's finally skips the clear (token
    // mismatch) and every later loadOperations() returns immediately, leaving
    // the Publish checklist stuck on "正在加载检查项…".
    state.operationsRequest += 1;
    state.operationsRefreshing = false;
    state.operationsConversationFingerprint = "";
    state.operationsConversationStickToBottom = false;
    state.experienceFilter = "";
    resetExperienceTwin();
    clearExplicitStudyWorkflowChoice();
    storeCurrentAppId(id);
    renderAppList();
    closeDrawers();
    await loadCurrentApp();
    await syncUiLocale(id);
    restoreConversationTabIfNeeded();
  }

  function renderNoAppSelected() {
    stopDeveloperSessionPolling();
    closeDialog(dom.developerSessionDialog);
    state.current = null;
    const studyChoice = false;
    dom.appTitle.textContent = t("apps.select");
    dom.statusBadge.hidden = true;
    dom.phaseLine.hidden = true;
    dom.workspaceLine.hidden = true;
    dom.workflowActionButton.hidden = true;
    dom.openExperienceTwinButton.hidden = true;
    dom.experienceTwinPage.hidden = true;
    hideProductPages();
    dom.conversationTabs.hidden = true;
    dom.developerChannel.hidden = true;
    dom.experienceFilters.hidden = true;
    dom.pendingStrip.hidden = true;
    dom.composer.hidden = true;
    dom.memberCount.textContent = t("agents.count_zero");
    dom.memberList.replaceChildren(element("div", "side-empty", t("agents.select_app")));
    renderMemberListFooter(false);
    document.documentElement.classList.remove("is-study-choosing");
    dom.chatStream.replaceChildren(dom.welcomeState);
    dom.welcomeState.hidden = false;
  }

  function renderCurrentLoading() {
    const summary = state.apps.find((app) => appId(app) === state.currentId);
    dom.appTitle.textContent = summary ? appTitle(summary) : t("apps.loading_one");
    dom.statusBadge.hidden = true;
    dom.phaseLine.hidden = true;
    dom.workspaceLine.hidden = true;
    dom.workflowActionButton.hidden = true;
    dom.openExperienceTwinButton.hidden = true;
    dom.experienceTwinPage.hidden = true;
    hideProductPages();
    dom.conversationTabs.hidden = true;
    dom.developerChannel.hidden = true;
    dom.experienceFilters.hidden = true;
    dom.pendingStrip.hidden = true;
    dom.composer.hidden = true;
    const loading = element("div", "empty-chat");
    const loadingSymbol = element("div", "empty-symbol");
    loadingSymbol.append(element("span", "progress-spinner"));
    loading.append(
      loadingSymbol,
      element("h3", "", t("apps.workflow_loading")),
      element("p", "", t("apps.almost_ready"))
    );
    loading.firstElementChild?.setAttribute("aria-hidden", "true");
    dom.chatStream.replaceChildren(loading);
  }

  function renderCurrentError(error) {
    dom.chatStream.replaceChildren();
    const box = element("div", "error-state");
    box.append(element("div", "empty-symbol", "!"), element("h3", "", t("apps.open_failed")), element("p", "", friendlyError(error)));
    const retry = element("button", "primary-button", t("common.retry"));
    retry.type = "button";
    retry.addEventListener("click", () => loadCurrentApp());
    box.append(retry);
    dom.chatStream.append(box);
    dom.openExperienceTwinButton.hidden = true;
    dom.experienceTwinPage.hidden = true;
    hideProductPages();
    dom.conversationTabs.hidden = true;
    dom.developerChannel.hidden = true;
    dom.experienceFilters.hidden = true;
    dom.pendingStrip.hidden = true;
    dom.composer.hidden = true;
  }

  function renderCurrentApp({ messageUpdate = "full", force = false } = {}) {
    if (!state.current) return;
    if (!force && shouldDeferBackgroundRender()) {
      state.deferredAppRender = true;
      renderHeader();
      if (state.repositoryDialogOpen) renderRepositoryDialog();
      return;
    }
    renderHeader();
    renderConversationNavigation();
    renderPendingStrip();
    dom.conversationTabs.hidden = false;
    dom.openExperienceTwinButton.hidden = true;
    syncExperienceTwinVisibility();
    updateComposer();
    const patched = !state.growthOpen && !state.launchOpen && messageUpdate === "patch" && tryPatchMessageStream();
    if (!patched) {
      if (state.growthOpen) renderOperations();
      else if (!state.launchOpen && !state.experienceTwinOpen) renderMessages();
    }
    renderNotificationSetting();
    if (document.visibilityState === "visible") {
      const activeTab = state.growthOpen
        ? "growth"
        : state.launchOpen
          ? "launch"
        : state.experienceTwinOpen
          ? "trial"
          : state.chatView === "experience"
            ? "internal_test"
            : "development";
      markTabRead(activeTab);
    }
    if (patched) return;
    const renderedId = state.current.id;
    requestAnimationFrame(() => {
      autosizeMessageInput();
      if (state.current?.id !== renderedId) return;
      renderMembers();
      renderAppList();
    });
  }

  function renderHeader() {
    const current = state.current;
    dom.appTitle.textContent = appTitle(current.app);

    const status = current.status || "created";
    const resumePending = isResumePending(status, current.pidAlive, current.updatedAt, current.resumeRequest);
    const reviewBoundary = String(current.phase || "").toUpperCase() === "DELIVERED";
    const managedStudyDevelopment = usesDirectDeveloperStudyConversation();
    const managedBackground = managedStudyDevelopment && current.pidAlive === false && !resumePending && !reviewBoundary;
    const processOffline = !managedStudyDevelopment && current.pidAlive === false && !resumePending;
    if (reviewBoundary) {
      // A delivered candidate is awaiting participant acceptance, rather than
      // suffering an offline worker failure. Never surface paused_error here.
      dom.statusBadge.textContent = t("status.delivered");
    }
    else if (managedBackground) dom.statusBadge.textContent = t("status.background");
    else dom.statusBadge.textContent = processOffline ? t("status.offline") : retryStatusLabel(current);
    const statusBadgeTone = reviewBoundary
      ? "delivered"
      : status === "retrying_error"
        ? "waiting"
        : statusTone(status);
    dom.statusBadge.className = `status-badge ${
      reviewBoundary ? "delivered" : processOffline ? "paused" : managedBackground ? "waiting" : statusBadgeTone
    }`;
    dom.statusBadge.hidden = false;
    startRetryCountdown(current);

    const phase = current.phase;
    const phaseKey = PHASE_LABEL_KEYS[String(phase).toUpperCase()];
    dom.phaseText.textContent = phase ? t("header.current", { phase: phaseKey ? t(phaseKey) : phase }) : statusLabel(status);
    const codingAgent = currentCodingAgent(current);
    const providerLabel = codingEngineLabel(current);
    dom.engineText.textContent = providerLabel;
    dom.engineText.hidden = !providerLabel;
    dom.engineSeparator.hidden = !providerLabel;
    dom.updatedText.textContent = current.updatedAt
      ? t("header.updated", { time: formatRelativeTime(current.updatedAt) })
      : t("header.auto_refresh");
    dom.phaseLine.hidden = false;

    const workspace = currentWorkspace(current);
    const showWorkspace = document.documentElement.dataset.studyShowWorkspace !== "0";
    dom.workspaceText.textContent = workspace;
    dom.workspaceText.title = workspace;
    dom.workspaceLine.title = workspace;
    dom.workspaceLine.hidden = !workspace || !showWorkspace;
    if (dom.editWorkspaceButton) dom.editWorkspaceButton.hidden = !workspace;
    if (dom.editCodingAgentButton) dom.editCodingAgentButton.hidden = !workspace;

    renderCodingAgentError(current);

    const resumable = isResumableStatus(
      status,
      phase,
      current.pidAlive,
      current.updatedAt,
      current.resumeRequest,
    );
    dom.workflowActionButton.dataset.action = resumable ? "resume" : resumePending ? "" : "stop";
    dom.workflowActionButton.textContent = resumePending
      ? t("workflow.resuming")
      : resumable
        ? t("workflow.resume")
        : t("workflow.stop");
    dom.workflowActionButton.title = resumable && current.pidAlive === false ? t("workflow.resume_title") : "";
    dom.workflowActionButton.hidden = usesDirectDeveloperStudyConversation();
    if (reviewBoundary && current.pidAlive === false) dom.workflowActionButton.hidden = true;
    dom.workflowActionButton.disabled = state.workflowAction || resumePending;
  }

  function codingAgentErrorCopy(current) {
    if (String(current?.status || "") === "retrying_error" && current?.retry) {
      return retryStatusDetails(current);
    }
    if (!current?.codingAgentError && !current?.retry && !firstText(current?.lastError)) {
      return "";
    }
    const error = current?.codingAgentError;
    const retryCode = firstText(current?.retry?.reason_code, "background_step_failed");
    const translatedReason = t(`retry.${retryCode}`);
    const summary = state.locale === "zh-CN"
      ? firstText(error?.summary, current?.retry?.reason)
      : translatedReason === `retry.${retryCode}`
        ? t("retry.background_step_failed")
        : translatedReason;
    let detail = firstText(error?.detail, current?.retry?.detail, codingAgentErrorDetail(current?.lastError));
    if (state.locale !== "zh-CN" && detail) {
      detail = /invalid_json_schema|jsonl|structured output|结构化输出|格式|类型错误|期望\s+\w+/i.test(detail)
        ? t("retry.invalid_result_detail")
        : /[\u3400-\u9fff]/.test(detail)
          ? t("retry.background_step_detail")
          : detail;
    }
    if (!summary && !detail) return "";
    if (summary && detail && summary !== detail) {
      return `${summary} · ${detail}`;
    }
    return summary || detail;
  }

  function codingAgentErrorDetail(raw) {
    const text = firstText(raw);
    if (!text) return "";
    return text.length > 240 ? `${text.slice(0, 237)}…` : text;
  }

  function renderCodingAgentError(current) {
    if (!dom.codingAgentErrorLine || !dom.codingAgentErrorText) return;
    const retrying = String(current?.status || "") === "retrying_error" && current?.retry;
    const copy = codingAgentErrorCopy(current);
    const blocked = ["running", "retrying_error", "stopped", "paused", "paused_error", "paused_safety"].includes(
      String(current?.status || "").toLowerCase()
    );
    dom.codingAgentErrorLine.classList.toggle("is-retrying", Boolean(retrying));
    if (!copy || !blocked) {
      dom.codingAgentErrorLine.hidden = true;
      dom.codingAgentErrorText.textContent = "";
      dom.codingAgentErrorLine.removeAttribute("title");
      return;
    }
    dom.codingAgentErrorLine.hidden = false;
    dom.codingAgentErrorText.textContent = copy;
    if (retrying) {
      const technical = firstText(
        current?.codingAgentError?.detail,
        current?.retry?.detail,
        codingAgentErrorDetail(current?.lastError)
      );
      dom.codingAgentErrorLine.title = [
        t("retry.recovering_hint"),
        retryReasonLabel(current.retry),
        technical,
      ].filter(Boolean).join(" · ");
    } else {
      dom.codingAgentErrorLine.title = state.locale === "zh-CN"
        ? firstText(current?.lastError, copy)
        : copy;
    }
  }

  function retryReasonLabel(retry) {
    const code = firstText(retry?.reason_code, "background_step_failed");
    const key = `retry.${code}`;
    const translated = t(key);
    return translated === key ? firstText(retry?.reason, t("retry.background_step_failed")) : translated;
  }

  function retryCountdownText(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1_000));
    const hours = Math.floor(seconds / 3_600);
    const minutes = Math.floor((seconds % 3_600) / 60);
    const remainder = seconds % 60;
    if (hours > 0) {
      return state.locale === "zh-CN"
        ? `${hours}小时${String(minutes).padStart(2, "0")}分`
        : `${hours}h ${String(minutes).padStart(2, "0")}m`;
    }
    return minutes > 0 ? `${minutes}:${String(remainder).padStart(2, "0")}` : `${seconds}s`;
  }

  function retryStatusLabel(current) {
    if (String(current?.status || "") === "retrying_error") {
      if (firstText(current?.retry?.reason_code) === "coding_agent_quota_exhausted") {
        return state.locale === "zh-CN" ? "等待额度恢复" : "Waiting for quota reset";
      }
      if (
        firstText(current?.retry?.reason_code) === "context_too_large" ||
        firstText(current?.retry?.session_rotated) === "true"
      ) {
        return state.locale === "zh-CN" ? "正在压缩研发上下文" : "Compressing development context";
      }
      return t("status.retrying_error");
    }
    return statusLabel(current?.status);
  }

  function retryStatusDetails(current) {
    if (String(current?.status || "") !== "retrying_error" || !current?.retry) return "";
    const reason = retryReasonLabel(current.retry);
    const retryAt = Date.parse(firstText(current.retry.retry_at));
    const countdown = !Number.isFinite(retryAt) || retryAt <= Date.now()
      ? t("retry.now")
      : t("retry.countdown", { time: retryCountdownText(retryAt - Date.now()) });
    return t("retry.recovering_line", { countdown, reason });
  }

  function startRetryCountdown(current) {
    window.clearInterval(state.retryCountdownTimer);
    state.retryCountdownTimer = null;
    if (current?.pidAlive === false || String(current?.status || "") !== "retrying_error" || !current?.retry) {
      dom.statusBadge.removeAttribute("title");
      dom.statusBadge.removeAttribute("aria-label");
      return;
    }
    const refresh = () => {
      if (!state.current || state.current.id !== current.id) return;
      dom.statusBadge.textContent = retryStatusLabel(state.current);
      const details = [
        retryStatusDetails(state.current),
        state.current.retry?.attempt ? `#${state.current.retry.attempt}` : "",
        state.current.retry?.session_rotated ? t("retry.rotated") : "",
      ].filter(Boolean);
      dom.statusBadge.title = details.join(" · ");
      dom.statusBadge.setAttribute(
        "aria-label",
        [t("status.retrying_error"), ...details].filter(Boolean).join(" · ")
      );
    };
    refresh();
    state.retryCountdownTimer = window.setInterval(refresh, 1_000);
  }

  function currentCodingAgent(current) {
    const id = firstText(
      current?.app?.coding_agent,
      current?.raw?.coding_agent,
      current?.raw?.state?.coding_agent,
      current?.raw?.app?.coding_agent
    ).toLowerCase();
    return CODING_AGENT_IDS.includes(id) ? id : "";
  }

  function currentWorkspace(current) {
    return firstText(
      current?.app?.workspace,
      current?.raw?.workspace,
      current?.raw?.state?.workspace,
      current?.raw?.app?.workspace
    );
  }

  function resetExperienceTwin() {
    const previousAppId = state.experienceTwinAppId;
    const previousSessionId = state.remoteExperienceSession?.id;
    window.clearTimeout(state.remoteExperiencePollTimer);
    state.remoteExperiencePollTimer = null;
    window.clearTimeout(state.remoteDisplayServiceTimer);
    state.remoteDisplayServiceTimer = null;
    disconnectRemoteExperienceRfb();
    if (previousAppId && previousSessionId) {
      void deleteRemoteExperienceSession(previousAppId, previousSessionId);
    }
    state.experienceTwinRequest += 1;
    state.remoteExperienceCatalogRequest += 1;
    state.remoteExperienceSessionStartRequest += 1;
    state.remoteExperienceSessionPollRequest += 1;
    state.experienceTwinOpen = false;
    state.launchOpen = false;
    state.growthOpen = false;
    state.experienceTwin = null;
    state.experienceTwinAppId = "";
    state.experienceTwinLoading = false;
    state.experienceTwinViewId = "";
    state.experienceTwinScaleMode = "fit";
    state.experienceTwinRenderKey = "";
    state.experienceTwinFreshEntry = "";
    state.experienceTwinFetchedAt = 0;
    state.experienceTwinReconnectKey = "";
    state.experienceTwinReconnecting = false;
    state.experienceTwinPreviewUrl = "";
    state.experienceTwinDetailFingerprint = "";
    state.remoteExperience = null;
    state.remoteExperienceSession = null;
    state.remoteExperienceError = null;
    state.remoteExperienceStarting = false;
    state.remoteExperienceStartKey = "";
    state.remoteExperienceConnected = false;
    stopSurfacePreparationPoll();
    state.surfacePreparationStarting = false;
    state.surfacePreparationAttempted = new Set();
    state.surfacePreparationSyncInFlight = false;
    state.surfacePreparationContract = null;
    state.remoteDisplayServiceBusy = false;
    state.remoteDisplayServiceStatus = null;
    if (dom.experienceTwinFrames) dom.experienceTwinFrames.replaceChildren();
    void exitExperienceTwinFullscreen();
  }

  function trialJumpErrorCode(result, error) {
    return String(
      result?.jump_error
      || error?.payload?.code
      || error?.payload?.error?.code
      || error?.code
      || ""
    ).toLowerCase();
  }

  function trialJumpMissingTarget(result) {
    const code = trialJumpErrorCode(result);
    return code.includes("target_not_available") || result?.focus?.target_available === false;
  }

  async function ensureTrialPreviewConnected(timeoutMs = REMOTE_TRIAL_SESSION_TIMEOUT_MS) {
    if (state.remoteExperienceConnected) return true;
    if (!state.experienceTwinOpen) openExperienceTwin();
    void startRemoteExperienceWithDisplayCheck();
    const deadline = Date.now() + Math.max(4_000, Number(timeoutMs) || REMOTE_TRIAL_SESSION_TIMEOUT_MS);
    while (Date.now() < deadline) {
      if (state.remoteExperienceConnected) return true;
      await new Promise((resolve) => window.setTimeout(resolve, 400));
    }
    return Boolean(state.remoteExperienceConnected);
  }

  async function requestTrialSandboxConfigure(description) {
    const path = `/apps/${encodeURIComponent(state.currentId)}/trial-sandbox/configure`;
    const payload = { method: "POST", json: { description, locale: state.locale || "zh-CN" } };
    try {
      return await request(path, payload);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 409) throw error;
      return await request(path, payload);
    }
  }

  async function configureTrialSandboxFocus() {
    if (!state.currentId || state.trialSandboxBusy) return;
    const description = String(dom.trialSandboxInput?.value || "").trim();
    if (!description) {
      if (dom.trialSandboxStatus) dom.trialSandboxStatus.textContent = t("twin.sandbox_placeholder");
      return;
    }
    state.trialSandboxBusy = true;
    if (dom.trialSandboxConfigureButton) dom.trialSandboxConfigureButton.disabled = true;
    if (dom.trialSandboxStatus) dom.trialSandboxStatus.textContent = t("twin.sandbox_connecting_jump");
    try {
      await ensureTrialPreviewConnected();
      if (dom.trialSandboxStatus) dom.trialSandboxStatus.textContent = t("twin.sandbox_configuring");
      let result = await requestTrialSandboxConfigure(description);
      if (!result?.jumped && trialJumpErrorCode(result).includes("trial_window_not_ready")) {
        if (dom.trialSandboxStatus) dom.trialSandboxStatus.textContent = t("twin.sandbox_connecting_jump");
        await ensureTrialPreviewConnected();
        result = await requestTrialSandboxConfigure(description);
      }
      const focus = result?.focus || {};
      state.trialSandboxFocus = focus;
      if (trialJumpMissingTarget(result)) {
        const missing = t("twin.sandbox_missing_target");
        if (dom.trialSandboxStatus) dom.trialSandboxStatus.textContent = missing;
        showToast(missing, "error", 7000);
        return;
      }
      applyTrialSandboxJump(focus);
      if (result?.jumped) {
        if (dom.trialSandboxStatus) {
          dom.trialSandboxStatus.textContent = t("twin.sandbox_ready", {
            label: focus.label || focus.description || description,
          });
        }
        showToast(t("twin.sandbox_ready", {
          label: focus.label || focus.description || description,
        }), "success", 5000);
      } else if (trialJumpErrorCode(result).includes("trial_window_not_ready")) {
        const waitMessage = t("twin.sandbox_wait_preview");
        if (dom.trialSandboxStatus) dom.trialSandboxStatus.textContent = waitMessage;
        showToast(waitMessage, "info", 6000);
      } else {
        const failed = t("twin.sandbox_failed");
        if (dom.trialSandboxStatus) dom.trialSandboxStatus.textContent = failed;
        showToast(failed, "error", 6000);
      }
    } catch (error) {
      const code = trialJumpErrorCode(null, error);
      const message = code.includes("target_not_available")
        ? t("twin.sandbox_missing_target")
        : Number(error?.status || 0) === 409
          ? t("twin.sandbox_busy")
          : t("twin.sandbox_failed");
      if (dom.trialSandboxStatus) dom.trialSandboxStatus.textContent = message;
      showToast(message, "error", 7000);
    } finally {
      state.trialSandboxBusy = false;
      if (dom.trialSandboxConfigureButton) dom.trialSandboxConfigureButton.disabled = false;
    }
  }

  function applyTrialSandboxJump(focus) {
    const route = firstText(focus?.route, "/");
    const seed = focus?.trial_seed && typeof focus.trial_seed === "object"
      ? focus.trial_seed
      : (focus?.trialSeed && typeof focus.trialSeed === "object" ? focus.trialSeed : {});
    openPlainReleaseReviewRoute(route, {
      ensureLogs: seed.ensure_count ?? seed.ensure_logs ?? seed.ensureLogs,
      ensureCount: seed.ensure_count ?? seed.ensureCount ?? seed.ensure_logs,
      focusId: seed.focus_id ?? seed.focusId,
      storageKey: seed.storage_key ?? seed.storageKey,
      listKey: seed.list_key ?? seed.listKey,
      records: Array.isArray(seed.records) ? seed.records : [],
      needsPrep: seed.needs_prep ?? seed.needsPrep,
    });
    if (state.remoteExperienceConnected) {
      void reloadActiveExperienceTwinFrame();
    }
  }

  async function sendTrialSandboxFeedback() {
    if (!state.currentId || state.trialFeedbackBusy) return;
    const text = String(dom.trialFeedbackInput?.value || "").trim();
    if (!text) return;
    state.trialFeedbackBusy = true;
    if (dom.trialFeedbackSendButton) dom.trialFeedbackSendButton.disabled = true;
    try {
      await request(`/apps/${encodeURIComponent(state.currentId)}/trial-sandbox/feedback`, {
        method: "POST",
        json: { text, locale: state.locale || "zh-CN" },
      });
      if (dom.trialFeedbackInput) dom.trialFeedbackInput.value = "";
      showToast(t("twin.feedback_sent"), "success", 5000);
    } catch (error) {
      showToast(friendlyError(error, t("twin.feedback_failed")), "error", 6000);
    } finally {
      state.trialFeedbackBusy = false;
      if (dom.trialFeedbackSendButton) dom.trialFeedbackSendButton.disabled = false;
    }
  }

  function openExperienceTwin() {
    if (!state.current) return;
    rememberChatScrollPosition();
    state.launchOpen = false;
    state.growthOpen = false;
    state.experienceTwinOpen = true;
    renderConversationNavigation();
    syncExperienceTwinVisibility();
    ensureExperienceTwinResizeObserver();

    // The blinded study conditions intentionally share one validation workspace.
    // Readiness changes the candidate shown in the stage, never the surrounding
    // participant layout or the availability of the two developer composers.
    if (dom.trialSandboxPanel) dom.trialSandboxPanel.hidden = false;
    if (dom.trialFeedbackBox) dom.trialFeedbackBox.hidden = false;

    const currentId = state.current.id;
    const appChanged = state.experienceTwinAppId !== currentId;
    if (appChanged) {
      window.clearTimeout(state.remoteExperiencePollTimer);
      state.remoteExperiencePollTimer = null;
      disconnectRemoteExperienceRfb();
      state.experienceTwinAppId = currentId;
      state.experienceTwin = state.current.experienceTwin || normalizeExperienceTwin(null);
      state.experienceTwinDetailFingerprint = experienceTwinCatalogFingerprint(state.current.experienceTwin);
      state.experienceTwinViewId = state.experienceTwin.views[0]?.id || "";
      state.experienceTwinRenderKey = "";
      state.experienceTwinFreshEntry = "";
      state.experienceTwinFetchedAt = 0;
      state.remoteExperience = null;
      state.remoteExperienceSession = null;
      state.remoteExperienceError = null;
      state.remoteExperienceStarting = false;
    }
    renderExperienceTwin();
    markTabRead("trial");
    storeCurrentConversationTab();
    if (state.remoteExperienceSession && remoteExperienceNeedsPolling(state.remoteExperienceSession)) {
      scheduleRemoteExperiencePoll();
    } else if (!state.remoteExperience) {
      loadExperienceTwin();
    } else if (!state.remoteExperienceSession) {
      void startRemoteExperienceWithDisplayCheck();
    }
  }

  function closeExperienceTwin() {
    if (!state.experienceTwinOpen) return;
    window.clearTimeout(state.remoteExperiencePollTimer);
    state.remoteExperiencePollTimer = null;
    stopSurfacePreparationPoll();
    disconnectRemoteExperienceRfb();
    void exitExperienceTwinFullscreen();
    state.experienceTwinOpen = false;
    renderCurrentApp();
  }

  function openProductTab(kind) {
    if (!state.current) return;
    rememberChatScrollPosition();
    window.clearTimeout(state.remoteExperiencePollTimer);
    state.remoteExperiencePollTimer = null;
    disconnectRemoteExperienceRfb();
    void exitExperienceTwinFullscreen();
    state.experienceTwinOpen = false;
    state.launchOpen = kind === "launch";
    state.growthOpen = kind === "growth";
    if (kind === "launch") state.operationsRefreshing = true;
    // Operations tab always presents the data dashboard directly (no toggle, no ops chat).
    state.growthToolsOpen = kind === "growth";
    if (kind === "growth") {
      state.renderedConversationView = "";
      state.operationsConversationFingerprint = "";
    }
    renderConversationNavigation();
    syncExperienceTwinVisibility();
    renderOperations();
    markTabRead(kind === "launch" ? "launch" : "growth");
    storeCurrentConversationTab();
    void loadOperations({ silent: true });
  }

  function openLaunch() {
    openProductTab("launch");
  }

  function openGrowth() {
    openProductTab("growth");
  }

  function openOperations() {
    openLaunch();
  }

  async function loadOperations({ silent = false } = {}) {
    if (!state.currentId) return;
    const appId = state.currentId;
    const requestNumber = ++state.operationsRequest;
    state.operationsRefreshing = true;
    renderReleaseReview(currentOperationsSnapshot() || normalizeOperations(null));
    try {
      const payload = await request(`/apps/${encodeURIComponent(appId)}/operations`, { timeoutMs: 45_000 });
      if (requestNumber !== state.operationsRequest || appId !== state.currentId || !state.current) return;
      const normalized = mergeOperationsState(state.current?.operations, payload);
      state.operations = normalized;
      state.current.operations = normalized;
      renderOperations();
      renderTabUnreadCounts();
    } catch (error) {
      if (requestNumber === state.operationsRequest && appId === state.currentId && !state.operations) {
        // Mark the attempt so the checklist does not spin forever after a silent failure.
        state.operations = currentOperationsSnapshot() || normalizeOperations(null);
      }
      if (!silent) showToast(friendlyError(error, t("operations.load_failed")), "error", 5_000);
    } finally {
      if (requestNumber === state.operationsRequest) state.operationsRefreshing = false;
      if (appId === state.currentId) {
        renderReleaseReview(currentOperationsSnapshot() || normalizeOperations(null));
      }
    }
  }

  function syncExperienceTwinVisibility() {
    const open = Boolean(state.current && state.experienceTwinOpen);
    const launchOpen = Boolean(state.current && state.launchOpen);
    const growthOpen = Boolean(state.current && state.growthOpen);
    const mainContent = document.getElementById("mainContent");
    if (mainContent) {
      mainContent.dataset.activePage = open
        ? "validation"
        : launchOpen
          ? "launch"
          : growthOpen
            ? "operations"
            : "developer";
    }
    dom.experienceTwinPage.hidden = !open;
    if (dom.launchPage) dom.launchPage.hidden = !launchOpen;
    if (dom.growthPage) dom.growthPage.hidden = !growthOpen;
    dom.openExperienceTwinButton.classList.toggle("is-active", open);
    dom.openExperienceTwinButton.setAttribute("aria-pressed", String(open));

    if (open) {
      dom.conversationTabs.hidden = false;
      dom.developerChannel.hidden = true;
      dom.experienceFilters.hidden = true;
      dom.chatStream.hidden = true;
      dom.pendingStrip.hidden = true;
      dom.composer.hidden = true;
      if (dom.developerRepositoryButton) dom.developerRepositoryButton.hidden = true;
      if (dom.launchPage) dom.launchPage.hidden = true;
      if (dom.growthPage) dom.growthPage.hidden = true;
      scheduleExperienceTwinScale();
      return;
    }

    if (launchOpen) {
      dom.conversationTabs.hidden = false;
      dom.developerChannel.hidden = true;
      dom.experienceFilters.hidden = true;
      dom.chatStream.hidden = true;
      dom.pendingStrip.hidden = true;
      dom.composer.hidden = true;
      if (dom.developerRepositoryButton) dom.developerRepositoryButton.hidden = true;
      if (dom.growthPage) dom.growthPage.hidden = true;
      syncComposerMode();
      renderOperations();
      return;
    }

    if (growthOpen) {
      dom.conversationTabs.hidden = false;
      dom.developerChannel.hidden = true;
      dom.experienceFilters.hidden = true;
      // Operations tab shows only the dashboard: no ops conversation, no composer.
      dom.chatStream.hidden = true;
      dom.pendingStrip.hidden = true;
      dom.composer.hidden = true;
      if (dom.developerRepositoryButton) dom.developerRepositoryButton.hidden = true;
      if (dom.growthPage) dom.growthPage.hidden = false;
      syncComposerMode();
      renderOperations();
      syncGrowthToolsPanel();
      return;
    }

    syncComposerMode();
    dom.conversationTabs.hidden = false;
    dom.chatStream.hidden = false;
    dom.developerChannel.hidden = state.chatView !== "experience";
    if (state.chatView === "experience") renderExperienceFilters();
    else dom.experienceFilters.hidden = true;
    dom.composer.hidden = !["main", "developer"].includes(state.chatView);
    if (dom.developerRepositoryButton && ["main", "developer"].includes(state.chatView)) renderDeveloperRepositorySummary();
  }

  function syncComposerMode() {
    const growth = Boolean(state.current && state.growthOpen);
    const devMain = Boolean(state.current && !growth && !state.launchOpen && !state.experienceTwinOpen && ["main", "developer"].includes(state.chatView));
    const directDeveloper = devMain && state.chatView === "developer";
    if (dom.developerComposerTarget) dom.developerComposerTarget.hidden = !devMain;
    if (dom.growthComposerTarget) dom.growthComposerTarget.hidden = !growth;
    if (dom.developerRepositoryButton) {
      dom.developerRepositoryButton.hidden = !(devMain && studyShowRepositoryManagement());
    }
    if (dom.composerAttachButton) {
      dom.composerAttachButton.title = growth
        ? t("growth.attach_title")
        : t(directDeveloper ? "composer.developer_attach_title" : "composer.attach_title");
    }
    if (dom.messageInput) {
      dom.messageInput.placeholder = growth
        ? t("growth.conversation_placeholder")
        : t(directDeveloper ? "composer.developer_placeholder" : "composer.placeholder");
      dom.messageInput.maxLength = growth ? 4000 : 12000;
    }
    if (dom.sendButton) {
      dom.sendButton.setAttribute("aria-label", growth ? t("growth.composer_target") : t("composer.send"));
    }
    if (dom.developerComposerTarget) {
      const avatar = dom.developerComposerTarget.querySelector(".composer-target-avatar");
      const target = dom.developerComposerTarget.querySelector(".composer-target-copy strong");
      const copy = dom.developerComposerTarget.querySelector(".composer-target-copy span");
      if (avatar) {
        avatar.textContent = t(directDeveloper ? "icon.developer" : "icon.project_manager");
        avatar.classList.toggle("is-project-manager", !directDeveloper);
      }
      if (target) target.textContent = t(directDeveloper ? "composer.developer_target" : "composer.target");
      if (copy) copy.textContent = t(directDeveloper ? "composer.developer_target_copy" : "composer.target_copy");
      dom.developerComposerTarget.setAttribute("aria-label", t(directDeveloper ? "composer.developer_target_aria" : "composer.target_aria"));
    }
  }

  async function loadExperienceTwin({ force = false } = {}) {
    if (!state.current || (state.experienceTwinLoading && !force)) return;
    const requestedId = state.current.id;
    const requestNumber = ++state.remoteExperienceCatalogRequest;
    state.experienceTwinLoading = true;
    state.remoteExperienceError = null;
    renderExperienceTwin();

    try {
      const payload = await request(`/apps/${encodeURIComponent(requestedId)}/remote-experience`, { timeoutMs: 15_000 });
      if (requestNumber !== state.remoteExperienceCatalogRequest || requestedId !== state.currentId) return;
      const remote = normalizeRemoteExperience(payload, state.current.experienceTwin);
      state.remoteExperience = remote;
      state.experienceTwin = remote.catalog;
      state.experienceTwinAppId = requestedId;
      state.experienceTwinFetchedAt = Date.now();
      if (remote.session) state.remoteExperienceSession = remote.session;
      const available = state.experienceTwin.views.some(
        (view) => normalizedIdentity(view.id) === normalizedIdentity(state.experienceTwinViewId)
      );
      if (!available) state.experienceTwinViewId = state.experienceTwin.views[0]?.id || "";
      state.experienceTwinLoading = false;
      renderExperienceTwin();
      if (experienceTwinWebPreviewUrl(activeExperienceTwinView())) {
        window.clearTimeout(state.remoteExperiencePollTimer);
        state.remoteExperiencePollTimer = null;
      } else if (!state.remoteExperienceSession && state.experienceTwin.views.length) {
        await startRemoteExperienceWithDisplayCheck();
      } else if (remoteExperienceNeedsPolling(state.remoteExperienceSession)) {
        scheduleRemoteExperiencePoll();
      }
    } catch (error) {
      if (requestNumber !== state.remoteExperienceCatalogRequest || requestedId !== state.currentId) return;
      state.experienceTwinLoading = false;
      state.remoteExperienceError = error;
      renderExperienceTwin(error);
    } finally {
      if (requestNumber === state.remoteExperienceCatalogRequest) state.experienceTwinLoading = false;
    }
  }

  async function prepareRemoteDisplayBeforeSession() {
    const appIdValue = state.current?.id;
    const view = activeExperienceTwinView();
    if (!state.experienceTwinOpen || !appIdValue || !view || experienceTwinWebPreviewUrl(view)) return false;
    try {
      const payload = await request(
        `/apps/${encodeURIComponent(appIdValue)}/remote-experience/surfaces/${encodeURIComponent(view.id)}/display-service`,
        { timeoutMs: 15_000 }
      );
      if (appIdValue !== state.currentId || view.id !== activeExperienceTwinView()?.id) return true;
      const phase = firstText(payload?.phase, payload?.status).toLowerCase();
      const errorCode = firstText(
        payload?.error?.code,
        payload?.error_code,
        payload?.reason
      ).toLowerCase();
      if (["ready", "not_required"].includes(phase)) {
        state.remoteDisplayServiceStatus = null;
        return false;
      }
      state.remoteDisplayServiceStatus = payload && typeof payload === "object" ? payload : {};
      if (phase === "unavailable" && errorCode === "preview_runtime_stale") {
        // GET is intentionally side-effect free.  A tenant/runtime replacement
        // invalidates the persisted loopback preview, so polling that status
        // can never make progress by itself.  Use the existing guarded POST
        // path once; the server rebuilds and verifies the managed preview
        // before it starts a new isolated browser surface.
        await startRemoteDisplayService();
        return true;
      }
      renderExperienceTwin();
      if (["installing", "configuring", "starting", "connecting", "unavailable"].includes(phase)) {
        window.clearTimeout(state.remoteDisplayServiceTimer);
        state.remoteDisplayServiceTimer = window.setTimeout(
          pollRemoteDisplayService,
          phase === "unavailable"
            ? Math.max(5_000, Number(payload?.retry_after_ms) || 0)
            : Math.max(500, Math.min(5_000, Number(payload?.retry_after_ms) || 1_000))
        );
      } else if (phase === "can_start") {
        await startRemoteDisplayService();
      }
      return true;
    } catch (error) {
      if (remoteDisplayRequestIsTransient(error)) {
        continueRemoteDisplayStartup(view);
        return true;
      }
      state.remoteDisplayServiceStatus = {
        phase: "error",
        surface_id: view.id,
        message: friendlyError(error, t("twin.remote_start_display_failed")),
      };
      renderExperienceTwin(error);
      return true;
    }
  }

  async function startRemoteExperienceWithDisplayCheck(options = {}) {
    if (await prepareRemoteDisplayBeforeSession()) return;
    await startRemoteExperienceSession(options);
  }

  async function startRemoteExperienceSession({ force = false, confirmInstall = false } = {}) {
    if (!state.current || state.remoteExperienceStarting) return;
    const view = activeExperienceTwinView();
    if (!view) return;
    if (experienceTwinWebPreviewUrl(view)) {
      window.clearTimeout(state.remoteExperiencePollTimer);
      state.remoteExperiencePollTimer = null;
      state.remoteExperienceSession = null;
      renderExperienceTwin();
      return;
    }
    const appIdValue = state.current.id;
    const surfaceIdValue = view.id;
    const startKey = `${appIdValue}|${surfaceIdValue}`;
    if (state.remoteExperienceStarting && state.remoteExperienceStartKey === startKey) return;
    const requestNumber = ++state.remoteExperienceSessionStartRequest;
    const previous = state.remoteExperienceSession;
    if (remoteExperienceShouldJoinInFlight(previous, view, force)) {
      state.remoteExperienceError = null;
      if (previous?.status === "failed") {
        state.remoteExperienceSession = {
          ...previous,
          status: "preparing",
          message: "",
        };
      }
      renderExperienceTwin();
      if (remoteDisplayStartupInProgress() && !previous?.id) {
        continueRemoteDisplayStartup(view);
        return;
      }
      if (previous?.id) {
        scheduleRemoteExperiencePoll();
        return;
      }
      if (remoteDisplayStartupInProgress()) {
        continueRemoteDisplayStartup(view);
        return;
      }
    } else if (!force && previous && previous.surfaceId && normalizedIdentity(previous.surfaceId) === normalizedIdentity(view.id)) {
      if (previous.status === "ready") {
        renderExperienceTwin();
        return;
      }
      if (remoteExperienceNeedsPolling(previous)) {
        scheduleRemoteExperiencePoll();
        return;
      }
    }

    window.clearTimeout(state.remoteExperiencePollTimer);
    state.remoteExperiencePollTimer = null;
    if (force || (previous?.surfaceId && normalizedIdentity(previous.surfaceId) !== normalizedIdentity(view.id))) {
      disconnectRemoteExperienceRfb();
      dom.experienceTwinFrames.replaceChildren();
      if (previous?.id) await deleteRemoteExperienceSession(appIdValue, previous.id);
    }
    state.remoteExperienceStarting = true;
    state.remoteExperienceStartKey = startKey;
    state.remoteExperienceError = null;
    state.remoteExperienceSession = {
      id: "",
      status: confirmInstall ? "installing" : "preparing",
      surfaceId: view.id,
      viewerUrl: "",
      websocketUrl: "",
      requiresInstallConfirmation: false,
      installConfirmed: confirmInstall,
      missingRuntimes: confirmInstall ? remoteExperienceMissingRuntimes(previous, view) : [],
      message: "",
      errorCode: "",
      pollAfterMs: 1_500,
      credentials: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    renderExperienceTwin();

    try {
      const payload = await request(`/apps/${encodeURIComponent(appIdValue)}/remote-experience/sessions`, {
        method: "POST",
        timeoutMs: REMOTE_TRIAL_SESSION_TIMEOUT_MS,
        json: {
          surface_id: view.id,
          viewport: view.width && view.height ? { width: view.width, height: view.height } : null,
          confirm_install: confirmInstall,
          install_missing_runtimes: confirmInstall,
          previous_session_id: previous?.id || null,
          client: "pwa",
        },
      });
      if (
        requestNumber !== state.remoteExperienceSessionStartRequest
        || appIdValue !== state.currentId
        || normalizedIdentity(surfaceIdValue) !== normalizedIdentity(activeExperienceTwinView()?.id)
      ) return;
      const remote = normalizeRemoteExperience(payload, state.experienceTwin);
      if (remote.catalog.views.length) state.experienceTwin = remote.catalog;
      state.remoteExperienceSession = remote.session || normalizeRemoteExperienceSession(payload) || state.remoteExperienceSession;
      state.remoteExperienceError = null;
      renderExperienceTwin();
      if (remoteExperienceNeedsPolling(state.remoteExperienceSession)) scheduleRemoteExperiencePoll();
    } catch (error) {
      if (
        requestNumber !== state.remoteExperienceSessionStartRequest
        || appIdValue !== state.currentId
        || normalizedIdentity(surfaceIdValue) !== normalizedIdentity(activeExperienceTwinView()?.id)
      ) return;
      const payload = error instanceof ApiError && error.payload && typeof error.payload === "object" ? error.payload : null;
      const candidate = normalizeRemoteExperienceSession(payload?.session ?? payload?.remote_experience ?? payload);
      if (candidate && (candidate.requiresInstallConfirmation || candidate.missingRuntimes.length || candidate.status !== "idle")) {
        state.remoteExperienceSession = {
          ...candidate,
          surfaceId: candidate.surfaceId || view.id,
          status: candidate.requiresInstallConfirmation ? "waiting_install_confirmation" : candidate.status,
        };
      } else {
        state.remoteExperienceSession = {
          ...state.remoteExperienceSession,
          status: "failed",
          message: friendlyError(error, t("twin.remote_session_error_copy")),
        };
      }
      state.remoteExperienceError = error;
      renderExperienceTwin(error);
    } finally {
      if (requestNumber === state.remoteExperienceSessionStartRequest) {
        state.remoteExperienceStarting = false;
        state.remoteExperienceStartKey = "";
      }
    }
  }

  async function startRemoteDisplayService() {
    if (!state.current || state.remoteDisplayServiceBusy) return;
    const view = activeExperienceTwinView();
    if (!view || experienceTwinWebPreviewUrl(view)) return;
    const appIdValue = state.current.id;
    const surfaceId = view.id;
    state.remoteDisplayServiceBusy = true;
    state.remoteDisplayServiceStatus = {
      phase: "starting",
      surface_id: surfaceId,
      message: t("twin.remote_starting_display"),
      retry_after_ms: 1_000,
    };
    renderExperienceTwin();
    try {
      const payload = await request(
        `/apps/${encodeURIComponent(appIdValue)}/remote-experience/surfaces/${encodeURIComponent(surfaceId)}/display-service`,
        { method: "POST", timeoutMs: 20_000, json: {} }
      );
      await applyRemoteDisplayServiceStatus(payload, appIdValue, surfaceId);
    } catch (error) {
      if (appIdValue !== state.currentId || surfaceId !== activeExperienceTwinView()?.id) return;
      if (remoteDisplayRequestIsTransient(error)) {
        continueRemoteDisplayStartup(view);
        return;
      }
      state.remoteDisplayServiceStatus = {
        phase: "error",
        surface_id: surfaceId,
        message: friendlyError(error, t("twin.remote_start_display_failed")),
      };
      renderExperienceTwin(error);
    } finally {
      state.remoteDisplayServiceBusy = false;
      renderExperienceTwin();
    }
  }

  async function pollRemoteDisplayService() {
    state.remoteDisplayServiceTimer = null;
    const appIdValue = state.current?.id;
    const view = activeExperienceTwinView();
    if (!state.experienceTwinOpen || !appIdValue || !view || experienceTwinWebPreviewUrl(view)) return;
    try {
      const payload = await request(
        `/apps/${encodeURIComponent(appIdValue)}/remote-experience/surfaces/${encodeURIComponent(view.id)}/display-service`,
        { timeoutMs: 15_000 }
      );
      await applyRemoteDisplayServiceStatus(payload, appIdValue, view.id);
    } catch (error) {
      if (appIdValue !== state.currentId || view.id !== activeExperienceTwinView()?.id) return;
      if (remoteDisplayRequestIsTransient(error)) {
        continueRemoteDisplayStartup(view);
        return;
      }
      state.remoteDisplayServiceStatus = {
        phase: "error",
        surface_id: view.id,
        message: friendlyError(error, t("twin.remote_start_display_failed")),
      };
      renderExperienceTwin(error);
    }
  }

  function remoteDisplayRequestIsTransient(error) {
    if (!(error instanceof ApiError)) return true;
    const code = firstText(error.payload?.code);
    return code === "request_timeout" || error.status === 0 || error.status >= 500;
  }

  function continueRemoteDisplayStartup(view) {
    if (!view?.id) return;
    state.remoteExperienceError = null;
    state.remoteDisplayServiceStatus = {
      phase: "starting",
      surface_id: view.id,
      message: t("twin.remote_starting_display"),
      retry_after_ms: 2_000,
    };
    renderExperienceTwin();
    window.clearTimeout(state.remoteDisplayServiceTimer);
    state.remoteDisplayServiceTimer = window.setTimeout(pollRemoteDisplayService, 2_000);
  }

  async function applyRemoteDisplayServiceStatus(payload, appIdValue, surfaceId) {
    if (appIdValue !== state.currentId || surfaceId !== activeExperienceTwinView()?.id) return;
    const status = payload && typeof payload === "object" ? payload : {};
    state.remoteDisplayServiceStatus = status;
    const phase = firstText(status.phase, status.status).toLowerCase();
    if (["ready", "not_required"].includes(phase)) {
      window.clearTimeout(state.remoteDisplayServiceTimer);
      state.remoteDisplayServiceTimer = null;
      state.remoteDisplayServiceStatus = null;
      const currentSession = state.remoteExperienceSession;
      if (
        state.remoteExperienceStarting
        || (
          currentSession
          && normalizedIdentity(currentSession.surfaceId) === normalizedIdentity(surfaceId)
          && !["expired", "stopped"].includes(currentSession.status)
        )
      ) {
        renderExperienceTwin(null);
        if (currentSession?.status === "failed") {
          await startRemoteExperienceSession({ force: false });
          return;
        }
        if (remoteExperienceNeedsPolling(currentSession)) scheduleRemoteExperiencePoll();
        return;
      }
      await startRemoteExperienceSession({ force: false });
      return;
    }
    const errorCode = firstText(
      status?.error?.code,
      status?.error_code,
      status?.reason
    ).toLowerCase();
    if (phase === "unavailable" && errorCode === "preview_runtime_stale") {
      // This branch covers a runtime roll detected by an already-running
      // status poll.  startRemoteDisplayService() is busy-guarded, so a
      // concurrent recovery POST cannot be duplicated.  Recover before
      // rendering the generic unavailable state, which would otherwise also
      // enqueue the unrelated surface-preparation path.
      await startRemoteDisplayService();
      return;
    }
    renderExperienceTwin();
    if (["installing", "configuring", "starting", "connecting"].includes(phase)) {
      window.clearTimeout(state.remoteDisplayServiceTimer);
      state.remoteDisplayServiceTimer = window.setTimeout(
        pollRemoteDisplayService,
        Math.max(500, Math.min(5_000, Number(status.retry_after_ms) || 1_000))
      );
    } else if (phase === "unavailable") {
      const prepPhase = surfacePreparationPhase();
      if (["queued", "configuring"].includes(prepPhase) || state.surfacePreparationStarting) {
        window.clearTimeout(state.remoteDisplayServiceTimer);
        state.remoteDisplayServiceTimer = window.setTimeout(pollRemoteDisplayService, 2_000);
      } else {
        window.clearTimeout(state.remoteDisplayServiceTimer);
        state.remoteDisplayServiceTimer = window.setTimeout(
          pollRemoteDisplayService,
          Math.max(5_000, Number(status.retry_after_ms) || 5_000)
        );
      }
    } else if (
      phase === "error"
      && ["isolated_surface_start_failed", "preview_target_unavailable"].includes(
        firstText(status?.error?.code, status?.error_code, status?.reason).toLowerCase()
      )
    ) {
      const view = activeExperienceTwinView();
      if (view?.id === surfaceId) {
        void ensureSurfacePreparationStarted(view, { silent: true });
      }
    }
  }

  async function approveRemoteDisplayInstall() {
    if (!state.current || state.remoteDisplayServiceBusy) return;
    const view = activeExperienceTwinView();
    if (!view) return;
    const appIdValue = state.current.id;
    state.remoteDisplayServiceBusy = true;
    try {
      const payload = await request(
        `/apps/${encodeURIComponent(appIdValue)}/remote-experience/surfaces/${encodeURIComponent(view.id)}/display-service`,
        { method: "POST", timeoutMs: 20_000, json: { action: "request_install" } }
      );
      await applyRemoteDisplayServiceStatus(payload, appIdValue, view.id);
      showToast(t("twin.remote_display_install_sent"), "success", 5_000);
    } catch (error) {
      showToast(friendlyError(error, t("twin.remote_start_display_failed")), "error", 7_000);
    } finally {
      state.remoteDisplayServiceBusy = false;
      renderExperienceTwin();
    }
  }

  async function confirmRemoteDisplayInstall() {
    if (!state.current || state.remoteDisplayServiceBusy) return;
    const view = activeExperienceTwinView();
    const confirmationId = firstText(state.remoteDisplayServiceStatus?.confirmation_id);
    if (!view || !confirmationId) return;
    const appIdValue = state.current.id;
    state.remoteDisplayServiceBusy = true;
    try {
      const payload = await request(
        `/apps/${encodeURIComponent(appIdValue)}/remote-experience/surfaces/${encodeURIComponent(view.id)}/display-service`,
        {
          method: "POST",
          timeoutMs: 20_000,
          json: { action: "confirm_install", confirmation_id: confirmationId },
        }
      );
      await applyRemoteDisplayServiceStatus(payload, appIdValue, view.id);
    } catch (error) {
      showToast(friendlyError(error, t("twin.remote_start_display_failed")), "error", 7_000);
    } finally {
      state.remoteDisplayServiceBusy = false;
      renderExperienceTwin();
    }
  }

  function remoteDisplayStartupInProgress() {
    const phase = firstText(
      state.remoteDisplayServiceStatus?.phase,
      state.remoteDisplayServiceStatus?.status
    ).toLowerCase();
    return ["starting", "connecting", "installing", "configuring"].includes(phase);
  }

  function remoteExperienceShouldJoinInFlight(previous, view, force) {
    if (!previous || !view?.id) return false;
    if (normalizedIdentity(previous.surfaceId) !== normalizedIdentity(view.id)) return false;
    if (remoteExperienceNeedsPolling(previous)) return true;
    if (!remoteDisplayStartupInProgress()) return false;
    return force || ["preparing", "connecting", "failed", "idle", ""].includes(previous.status || "");
  }

  function remoteExperienceNeedsPolling(session) {
    if (!session?.id) return false;
    // Ready sessions are revalidated at a low frequency so a route, viewport,
    // device profile, or local adapter generation change cannot leave an old
    // application surface connected indefinitely.
    return ["preparing", "installing", "connecting", "ready", "unavailable"].includes(session.status);
  }

  function scheduleRemoteExperiencePoll() {
    window.clearTimeout(state.remoteExperiencePollTimer);
    state.remoteExperiencePollTimer = null;
    const session = state.remoteExperienceSession;
    if (!remoteExperienceTransportAvailable() || !remoteExperienceNeedsPolling(session)) return;
    const delay = ["ready", "unavailable"].includes(session.status)
      ? Math.max(5_000, session.pollAfterMs || 0)
      : (session.pollAfterMs || 1_500);
    state.remoteExperiencePollTimer = window.setTimeout(pollRemoteExperienceSession, delay);
  }

  async function pollRemoteExperienceSession() {
    state.remoteExperiencePollTimer = null;
    const appIdValue = state.current?.id;
    const sessionId = state.remoteExperienceSession?.id;
    if (!remoteExperienceTransportAvailable() || !appIdValue || !sessionId) return;
    const requestNumber = ++state.remoteExperienceSessionPollRequest;
    try {
      const payload = await request(
        `/apps/${encodeURIComponent(appIdValue)}/remote-experience/sessions/${encodeURIComponent(sessionId)}`,
        { timeoutMs: 15_000 }
      );
      if (requestNumber !== state.remoteExperienceSessionPollRequest || appIdValue !== state.currentId) return;
      state.remoteExperienceSession = normalizeRemoteExperienceSession(payload?.session ?? payload) || state.remoteExperienceSession;
      state.remoteExperienceError = null;
      if (state.remoteExperienceSession?.status === "ready") {
        state.remoteExperienceExpiredRecovered = false;
      }
      renderExperienceTwin();
      scheduleRemoteExperiencePoll();
    } catch (error) {
      if (requestNumber !== state.remoteExperienceSessionPollRequest || appIdValue !== state.currentId) return;
      state.remoteExperienceError = error;
      if (error instanceof ApiError && [404, 410].includes(error.status)) {
        state.remoteExperienceSession = { ...state.remoteExperienceSession, status: "expired" };
        if (!state.remoteExperienceExpiredRecovered) {
          state.remoteExperienceExpiredRecovered = true;
          renderExperienceTwin();
          void startRemoteExperienceSession({ force: true });
          return;
        }
      } else {
        // A brief Funnel/mobile-network interruption must not turn an otherwise
        // healthy remote runtime into a permanent failure.  Keep the server's
        // last known state and revalidate after a bounded delay; only an
        // explicit expired/not-found response is terminal here.
        state.remoteExperienceSession = {
          ...state.remoteExperienceSession,
          pollAfterMs: Math.max(5_000, Number(state.remoteExperienceSession?.pollAfterMs) || 0),
          clientPollError: friendlyError(error, ""),
        };
      }
      renderExperienceTwin(error);
      if (!(error instanceof ApiError && [404, 410].includes(error.status))) {
        scheduleRemoteExperiencePoll();
      }
    }
  }

  async function stopRemoteExperienceSession({ silent = false } = {}) {
    const appIdValue = state.current?.id;
    const sessionId = state.remoteExperienceSession?.id;
    window.clearTimeout(state.remoteExperiencePollTimer);
    state.remoteExperiencePollTimer = null;
    disconnectRemoteExperienceRfb();
    if (appIdValue && sessionId) await deleteRemoteExperienceSession(appIdValue, sessionId);
    state.remoteExperienceSession = state.remoteExperienceSession
      ? { ...state.remoteExperienceSession, status: "stopped", websocketUrl: "", viewerUrl: "" }
      : null;
    dom.experienceTwinFrames.replaceChildren();
    renderExperienceTwin();
    if (!silent) showToast(t("twin.expired_title"), "success");
  }

  async function deleteRemoteExperienceSession(appIdValue, sessionId) {
    try {
      await request(
        `/apps/${encodeURIComponent(appIdValue)}/remote-experience/sessions/${encodeURIComponent(sessionId)}`,
        { method: "DELETE", timeoutMs: 10_000 }
      );
    } catch {
      // Remote sessions also have a server-side TTL; cleanup failure must not block navigation.
    }
  }

  function renderExperienceTwin(error = null) {
    const twin = state.experienceTwin || normalizeExperienceTwin(null);
    const hasSurfaces = Boolean(twin.views.length);
    const session = state.remoteExperienceSession;
    dom.experienceTwinShared.hidden = !session?.id;
    // Keep the control row available in the empty state so the first surface
    // can always be added from the same, predictable location.
    dom.experienceTwinControls.hidden = false;
    dom.experienceTwinHistory.hidden = !hasSurfaces;
    dom.experienceTwinFidelity.hidden = true;
    dom.experienceTwinLocalAccess.hidden = true;
    dom.experienceTwinLocalAccess.replaceChildren();
    setRemoteExperienceKeyboardAvailability(Boolean(
      state.remoteExperienceConnected && state.remoteExperienceRfb && session?.status === "ready"
    ));
    dom.openExperienceTwinWindowButton.hidden = true;
    dom.stopExperienceTwinButton.hidden = !session?.id || ["failed", "expired", "stopped"].includes(session.status);
    updateExperienceTwinFullscreenAvailability(hasSurfaces);
    dom.experienceTwinViews.hidden = !hasSurfaces;
    dom.experienceTwinBody.classList.toggle("is-empty", !hasSurfaces);
    dom.experienceTwinViews.replaceChildren();

    if (!hasSurfaces) {
      dom.experienceTwinFrames.hidden = true;
      dom.experienceTwinState.hidden = false;
      if (state.experienceTwinLoading && !error) {
        renderExperienceTwinState("loading");
      } else {
        renderExperienceTwinState(error ? "error" : "empty", error);
      }
      dom.experienceTwinSummary.textContent = t("twin.subtitle");
      syncExperienceTwinSurfaceSwitch();
      bindSyntheticNoticeDismiss();
      return;
    }

    dom.experienceTwinSummary.textContent = t("twin.available_views", { count: twin.views.length });
    twin.views.forEach((view, index) => {
      const active = normalizedIdentity(view.id) === normalizedIdentity(state.experienceTwinViewId);
      const button = element("button", `experience-twin-view${active ? " is-active" : ""}`);
      button.type = "button";
      button.setAttribute("aria-pressed", String(active));
      const copy = element("span", "experience-twin-view-copy");
      copy.append(element("strong", "", experienceTwinViewLabel(view, index)));
      copy.append(element("small", "", experienceTwinViewMeta(view)));
      button.append(copy);
      button.addEventListener("click", () => selectExperienceTwinView(view.id));
      button.dataset.surfaceKind = experienceTwinViewKind(view);
      dom.experienceTwinViews.append(button);
    });
    syncExperienceTwinSurfaceSwitch();
    syncReleaseVerifySurfaceNudge();
    bindSyntheticNoticeDismiss();

    const activeView = activeExperienceTwinView();
    renderExperienceTwinHistory(activeView);
    renderExperienceTwinLocalAccess(activeView);
    updateExperienceTwinFrameVisibility();
    updateExperienceTwinScaleButtons();
    const webPreviewUrl = experienceTwinWebPreviewUrl(activeView);
    if (webPreviewUrl) {
      renderExperienceTwinWebPreview(activeView, webPreviewUrl);
      return;
    }
    const displayStatus = state.remoteDisplayServiceStatus;
    const displayPhase = firstText(displayStatus?.phase, displayStatus?.status).toLowerCase();
    if (displayStatus && normalizedIdentity(displayStatus.surface_id) === normalizedIdentity(activeView?.id)) {
      const displayKind = ({
        needs_install_confirmation: "display_needs_install",
        awaiting_final_confirmation: "display_confirm_install",
        installing: "installing",
        configuring: "configuring",
        connecting: "connecting",
        unavailable: "unavailable",
        install_error: "display_install_error",
        starting: "display_starting",
        error: "display_error",
      })[displayPhase] || "";
      if (displayKind) {
        disconnectRemoteExperienceRfb();
        dom.experienceTwinFrames.hidden = true;
        dom.experienceTwinState.hidden = false;
        const resolvedDisplayKind = resolveSurfacePreparationKind(displayKind);
        renderExperienceTwinState(resolvedDisplayKind, error);
        maybeAutoStartSurfacePreparation(activeView, displayKind);
        return;
      }
    }
    if (!session) {
      dom.experienceTwinFrames.hidden = true;
      dom.experienceTwinState.hidden = false;
      renderExperienceTwinState(state.experienceTwinLoading || state.remoteExperienceStarting ? "preparing" : "idle", error);
      return;
    }

    const websocketUrl = remoteExperienceWebsocketUrl(session.websocketUrl);
    const rawStatus = session.requiresInstallConfirmation ? "waiting_install_confirmation" : session.status;
    let status = rawStatus === "ready" && !websocketUrl ? "failed" : rawStatus;
    if (remoteExperiencePreparationTimedOut(session)) status = "preparation_timeout";
    status = resolveSurfacePreparationKind(status);
    if (status === "ready") {
      dom.experienceTwinState.hidden = true;
      dom.experienceTwinFrames.hidden = false;
      renderExperienceTwinFidelity(activeView);
      void ensureRemoteExperienceRfb(session, activeView);
      return;
    }

    disconnectRemoteExperienceRfb();
    dom.experienceTwinFrames.hidden = true;
    dom.experienceTwinState.hidden = false;
    const resolvedStatus = status || (state.remoteExperienceStarting ? "preparing" : "idle");
    renderExperienceTwinState(resolvedStatus, error);
    maybeAutoStartSurfacePreparation(activeView, resolvedStatus);
  }

  function surfacePreparationPhase() {
    return firstText(
      state.surfacePreparationContract?.phase,
      state.surfacePreparationContract?.preparation?.phase
    ).toLowerCase();
  }

  function resolveSurfacePreparationKind(kind) {
    const baseKind = firstText(kind).toLowerCase();
    const prepPhase = surfacePreparationPhase();
    if (["queued", "configuring"].includes(prepPhase) || state.surfacePreparationStarting) {
      return "surface_prep";
    }
    if (baseKind === "configuring" && prepPhase === "error") {
      return "unavailable";
    }
    if (baseKind !== "unavailable") return baseKind;
    return baseKind;
  }

  async function syncSurfacePreparationContract(view) {
    const surfaceId = firstText(view?.id);
    if (!state.currentId || !/^[a-z0-9_-]{1,48}$/.test(surfaceId)) return null;
    try {
      const contract = await request(
        `/apps/${encodeURIComponent(state.currentId)}/experience-surfaces/${encodeURIComponent(surfaceId)}/runtime-preparation`
      );
      state.surfacePreparationContract = contract;
      return contract;
    } catch {
      return null;
    }
  }

  function maybeAutoStartSurfacePreparation(view, kind) {
    if (!view?.id || kind !== "unavailable") return;
    const key = surfacePreparationKey(view);
    if (!key || state.surfacePreparationStarting || state.surfacePreparationSyncInFlight) return;
    const prepPhase = surfacePreparationPhase();
    if (["queued", "configuring"].includes(prepPhase)) {
      scheduleSurfacePreparationPoll(view);
      return;
    }
    if (state.surfacePreparationAttempted.has(key)) return;
    void ensureSurfacePreparationStarted(view, { silent: true });
  }

  function renderExperienceTwinHistory(view) {
    if (!view) {
      dom.experienceTwinHistory.hidden = true;
      return;
    }
    dom.experienceTwinHistory.hidden = false;
    const index = Math.max(0, (state.experienceTwin?.views || []).findIndex(
      (candidate) => normalizedIdentity(candidate.id) === normalizedIdentity(view.id)
    ));
    const label = experienceTwinViewLabel(view, index);
    const changes = arrayFrom(view.changelog).map((change) => firstText(change)).filter(Boolean);
    dom.experienceTwinHistoryTitle.textContent = t("twin.history_for", { label });
    dom.experienceTwinHistoryCount.textContent = t("twin.history_count", { count: changes.length });
    dom.experienceTwinHistoryList.replaceChildren();
    if (!dom.experienceTwinHistory.open) return;
    if (!changes.length) {
      dom.experienceTwinHistoryList.append(element("li", "is-empty", t("twin.history_empty")));
      return;
    }
    changes.forEach((change) => dom.experienceTwinHistoryList.append(element("li", "", change)));
  }

  function isExperienceTwinWebSurface(view) {
    return ["desktop_web", "mobile_web", "tablet_web", "responsive"].includes(experienceTwinViewKind(view));
  }

  function isExperienceTwinMobilePackageSurface(view) {
    return ["mobile_app", "tablet_app", "watch_app"].includes(experienceTwinViewKind(view));
  }

  function safeExperienceTwinLocalUrl(value) {
    const raw = firstText(value);
    if (!raw) return "";
    try {
      const url = new URL(raw, window.location.href);
      return ["http:", "https:"].includes(url.protocol) && url.origin === window.location.origin ? url.href : "";
    } catch {
      return "";
    }
  }

  function experienceTwinLocalWebUrl(view) {
    if (!isExperienceTwinWebSurface(view)) return "";
    const declared = view?.localTrial;
    if (declared?.status === "ready") {
      const declaredUrl = safeExperienceTwinLocalUrl(declared.url);
      if (declaredUrl) return declaredUrl;
    }
    const entry = safeExperienceTwinLocalUrl(state.experienceTwin?.entry);
    if (!entry) return "";
    try {
      const base = new URL(entry);
      const baseHref = base.href.endsWith("/") ? base.href : `${base.href}/`;
      const relativeRoute = firstText(view?.route, "/").replace(/^\/+/, "");
      return safeExperienceTwinLocalUrl(new URL(relativeRoute, baseHref).href);
    } catch {
      return "";
    }
  }

  function renderExperienceTwinLocalAccess(view) {
    const container = dom.experienceTwinLocalAccess;
    container.hidden = true;
    container.classList.remove("is-missing");
    container.replaceChildren();
    if (!isLocalWorkspaceOrigin() || !view) return;

    const webSurface = isExperienceTwinWebSurface(view);
    const mobilePackageSurface = isExperienceTwinMobilePackageSurface(view);
    const desktopPackageSurface = experienceTwinViewKind(view) === "desktop_app";
    if (!webSurface && !mobilePackageSurface && !desktopPackageSurface) return;

    const localTrial = view.localTrial;
    const copy = element("div", "experience-twin-local-copy");
    const actions = element("div", "experience-twin-local-actions");

    if (webSurface) {
      const url = experienceTwinLocalWebUrl(view);
      copy.append(
        element("strong", "", t("twin.local_web_title")),
        element("span", "", url ? t("twin.local_web_copy") : t("twin.local_unavailable"))
      );
      if (url) {
        const address = element("code", "experience-twin-local-value", url);
        address.title = url;
        const open = element("a", "secondary-button experience-twin-local-action", t("twin.local_open"));
        open.href = url;
        open.target = "_blank";
        open.rel = "noopener noreferrer";
        const copyButton = element("button", "text-button experience-twin-local-action", t("twin.local_copy_url"));
        copyButton.type = "button";
        copyButton.addEventListener("click", () => copyPairingValue(url, t("twin.local_copied")));
        actions.append(open, copyButton);
        container.append(copy, address, actions);
      } else {
        container.classList.add("is-missing");
        container.append(copy);
      }
      container.hidden = false;
      return;
    }

    const downloadUrl = localTrial?.status === "ready"
      ? safeExperienceTwinLocalUrl(localTrial.url)
      : "";
    const ready = Boolean(downloadUrl);
    copy.append(
      element("strong", "", ready ? t("twin.local_package_title") : t("twin.local_package_missing_title")),
      element("span", "", firstText(
        localTrial?.message,
        ready ? t("twin.local_package_copy") : t("twin.local_package_missing_copy")
      ))
    );
    container.append(copy);

    if (ready) {
      const filename = firstText(localTrial.filename, t("twin.local_download"));
      const metadata = localTrial.sizeBytes ? `${filename} · ${formatBytes(localTrial.sizeBytes)}` : filename;
      const file = element("code", "experience-twin-local-value", metadata);
      const download = element("a", "primary-button experience-twin-local-action", t("twin.local_download"));
      download.href = downloadUrl;
      download.download = localTrial.filename || "";
      actions.append(download);
      container.append(file, actions);
    } else {
      container.classList.add("is-missing");
    }

    if (mobilePackageSurface || localTrial?.requiresSameWifi) {
      const wifi = element("p", "experience-twin-local-network", t("twin.local_same_wifi"));
      wifi.prepend(element("span", "experience-twin-local-network-icon", "Wi-Fi"));
      container.append(wifi);
    }
    container.hidden = false;
  }

  function renderExperienceTwinFidelity(view) {
    dom.experienceTwinFidelity.hidden = !view;
    if (!view) return;
    dom.experienceTwinFidelityTitle.textContent = t("twin.remote_ready_title");
    dom.experienceTwinFidelityCopy.textContent = t("twin.remote_ready_copy");
  }

  function setRemoteExperienceKeyboardAvailability(available) {
    const enabled = Boolean(available);
    dom.experienceTwinImeBridge.hidden = !enabled;
    dom.experienceTwinKeyboardButton.hidden = true;
    dom.experienceTwinKeyboardButton.disabled = !enabled;
    if (!enabled) closeRemoteExperienceKeyboard();
    else restoreExperienceTwinImeBridgePosition();
  }

  const EXPERIENCE_TWIN_IME_POS_KEY = "applooper:experience-twin-ime-pos";

  function experienceTwinImeBridgeStage() {
    return dom.experienceTwinImeBridge?.parentElement || dom.experienceTwinStage || null;
  }

  function clampExperienceTwinImeBridgePosition(left, top) {
    const bridge = dom.experienceTwinImeBridge;
    const stage = experienceTwinImeBridgeStage();
    if (!bridge || !stage) return { left: 0, top: 0 };
    const maxLeft = Math.max(0, stage.clientWidth - bridge.offsetWidth);
    const maxTop = Math.max(0, stage.clientHeight - bridge.offsetHeight);
    return {
      left: Math.min(maxLeft, Math.max(0, Number(left) || 0)),
      top: Math.min(maxTop, Math.max(0, Number(top) || 0)),
    };
  }

  function applyExperienceTwinImeBridgePosition(left, top) {
    const bridge = dom.experienceTwinImeBridge;
    if (!bridge) return;
    const next = clampExperienceTwinImeBridgePosition(left, top);
    bridge.classList.add("is-dragged");
    bridge.style.left = `${next.left}px`;
    bridge.style.top = `${next.top}px`;
    bridge.style.right = "auto";
    bridge.style.bottom = "auto";
    bridge.style.marginInline = "0";
    return next;
  }

  function clearExperienceTwinImeBridgePosition() {
    const bridge = dom.experienceTwinImeBridge;
    if (!bridge) return;
    bridge.classList.remove("is-dragged", "is-dragging");
    bridge.style.left = "";
    bridge.style.top = "";
    bridge.style.right = "";
    bridge.style.bottom = "";
    bridge.style.marginInline = "";
    try {
      sessionStorage.removeItem(EXPERIENCE_TWIN_IME_POS_KEY);
    } catch {
      // Ignore storage failures; default docking still works.
    }
  }

  function persistExperienceTwinImeBridgePosition(left, top) {
    try {
      sessionStorage.setItem(EXPERIENCE_TWIN_IME_POS_KEY, JSON.stringify({ left, top }));
    } catch {
      // Ignore storage failures; drag still works for the current session.
    }
  }

  function restoreExperienceTwinImeBridgePosition() {
    const bridge = dom.experienceTwinImeBridge;
    if (!bridge || bridge.hidden) return;
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(EXPERIENCE_TWIN_IME_POS_KEY) || "null");
    } catch {
      saved = null;
    }
    if (!saved || !Number.isFinite(Number(saved.left)) || !Number.isFinite(Number(saved.top))) return;
    window.requestAnimationFrame(() => {
      if (bridge.hidden) return;
      applyExperienceTwinImeBridgePosition(saved.left, saved.top);
    });
  }

  function bindExperienceTwinImeDrag() {
    const bridge = dom.experienceTwinImeBridge;
    const handle = dom.experienceTwinImeDrag;
    if (!bridge || bridge.dataset.dragBound === "1") return;
    bridge.dataset.dragBound = "1";
    let drag = null;

    const isInteractiveTarget = (node) => {
      if (!(node instanceof Element)) return false;
      return Boolean(node.closest("input, textarea, button, [contenteditable='true']"));
    };

    const endDrag = (event) => {
      if (!drag || (event?.pointerId != null && drag.pointerId !== event.pointerId)) return;
      const left = Number.parseFloat(bridge.style.left);
      const top = Number.parseFloat(bridge.style.top);
      if (Number.isFinite(left) && Number.isFinite(top)) {
        const next = applyExperienceTwinImeBridgePosition(left, top);
        persistExperienceTwinImeBridgePosition(next.left, next.top);
      }
      drag = null;
      bridge.classList.remove("is-dragging");
      try {
        bridge.releasePointerCapture?.(event.pointerId);
      } catch {
        // Pointer may already be released.
      }
    };

    const startDrag = (event) => {
      if (event.button != null && event.button !== 0) return;
      if (isInteractiveTarget(event.target) && event.target !== handle) return;
      const stage = experienceTwinImeBridgeStage();
      if (!stage || bridge.hidden) return;
      const stageRect = stage.getBoundingClientRect();
      const bridgeRect = bridge.getBoundingClientRect();
      const origin = applyExperienceTwinImeBridgePosition(
        bridgeRect.left - stageRect.left,
        bridgeRect.top - stageRect.top
      );
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originLeft: origin.left,
        originTop: origin.top,
        moved: false,
      };
      bridge.classList.add("is-dragging");
      try {
        bridge.setPointerCapture(event.pointerId);
      } catch {
        // Some browsers reject capture on non-primary pointers.
      }
      event.preventDefault();
      event.stopPropagation();
    };

    const moveDrag = (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
      applyExperienceTwinImeBridgePosition(drag.originLeft + dx, drag.originTop + dy);
      event.preventDefault();
      event.stopPropagation();
    };

    bridge.addEventListener("pointerdown", startDrag);
    handle?.addEventListener("pointerdown", startDrag);
    window.addEventListener("pointermove", moveDrag, { capture: true });
    window.addEventListener("pointerup", endDrag, { capture: true });
    window.addEventListener("pointercancel", endDrag, { capture: true });
    bridge.addEventListener("dblclick", (event) => {
      if (isInteractiveTarget(event.target) && event.target !== handle) return;
      event.preventDefault();
      clearExperienceTwinImeBridgePosition();
    });

    window.addEventListener("resize", () => {
      if (!bridge.classList.contains("is-dragged") || bridge.hidden) return;
      const left = Number.parseFloat(bridge.style.left);
      const top = Number.parseFloat(bridge.style.top);
      if (!Number.isFinite(left) || !Number.isFinite(top)) return;
      const next = applyExperienceTwinImeBridgePosition(left, top);
      persistExperienceTwinImeBridgePosition(next.left, next.top);
    });
  }

  function toggleRemoteExperienceKeyboard() {
    if (!state.remoteExperienceConnected || !state.remoteExperienceRfb) return;
    if (document.activeElement === dom.experienceTwinKeyboardInput) {
      closeRemoteExperienceKeyboard();
      return;
    }
    state.remoteExperienceKeyboardOpen = true;
    dom.experienceTwinKeyboardButton.setAttribute("aria-expanded", "true");
    resetRemoteExperienceKeyboardCapture();
    // iOS only opens its native keyboard when focus happens synchronously in
    // the user's click handler.  Do not move this focus into a timer/promise.
    try {
      dom.experienceTwinKeyboardInput.focus({ preventScroll: true });
    } catch {
      dom.experienceTwinKeyboardInput.focus();
    }
  }

  function closeRemoteExperienceKeyboard() {
    state.remoteExperienceKeyboardOpen = false;
    state.remoteExperienceKeyboardComposing = false;
    state.remoteExperienceKeyboardSuppressInput = "";
    dom.experienceTwinKeyboardButton.setAttribute("aria-expanded", "false");
    resetRemoteExperienceKeyboardCapture();
    if (document.activeElement === dom.experienceTwinKeyboardInput) {
      dom.experienceTwinKeyboardInput.blur();
    }
  }

  function resetRemoteExperienceKeyboardCapture() {
    dom.experienceTwinKeyboardInput.value = "";
  }

  function handleRemoteExperienceKeyboardFocus() {
    state.remoteExperienceKeyboardOpen = true;
    dom.experienceTwinKeyboardButton.setAttribute("aria-expanded", "true");
    dom.experienceTwinImeStatus.textContent = "";
  }

  function handleRemoteExperienceKeyboardBlur() {
    state.remoteExperienceKeyboardOpen = false;
    state.remoteExperienceKeyboardComposing = false;
    state.remoteExperienceKeyboardSuppressInput = "";
    dom.experienceTwinKeyboardButton.setAttribute("aria-expanded", "false");
  }

  function handleRemoteExperienceImeSubmit(event) {
    event.preventDefault();
    if (state.remoteExperienceKeyboardComposing) return;
    const text = String(dom.experienceTwinKeyboardInput.value || "");
    if (!text) {
      dom.experienceTwinImeStatus.textContent = t("twin.ime_target_hint");
      return;
    }
    if (!sendRemoteExperienceText(text)) return;
    resetRemoteExperienceKeyboardCapture();
    dom.experienceTwinImeStatus.textContent = t("twin.ime_sent");
    try {
      dom.experienceTwinKeyboardInput.focus({ preventScroll: true });
    } catch {
      dom.experienceTwinKeyboardInput.focus();
    }
  }

  function sendRemoteExperienceKey(keysym, code = "Unidentified") {
    if (!state.remoteExperienceConnected || !state.remoteExperienceRfb) return false;
    state.remoteExperienceRfb.sendKey(keysym, code);
    return true;
  }

  function remoteExperienceKeysym(character) {
    const codePoint = character.codePointAt(0);
    if (!Number.isFinite(codePoint)) return 0;
    if (codePoint >= 0x20 && codePoint <= 0xff) return codePoint;
    return 0x01000000 | codePoint;
  }

  function sendRemoteExperienceText(value) {
    const text = String(value || "");
    if (!text || !state.remoteExperienceConnected || !state.remoteExperienceRfb) return false;
    const runs = text.match(/[^\r\n]+|\r?\n/g) || [];
    for (const run of runs) {
      if (run === "\n" || run === "\r\n") {
        sendRemoteExperienceKey(0xff0d, "Enter");
        continue;
      }
      // The local IME has already committed the complete composition here;
      // now translate its code points into X11 Unicode keysyms one by one.
      for (const character of run) {
        const keysym = remoteExperienceKeysym(character);
        if (keysym) sendRemoteExperienceKey(keysym);
      }
    }
    return true;
  }

  function handleRemoteExperienceKeyboardComposition(event) {
    state.remoteExperienceKeyboardComposing = false;
    state.remoteExperienceKeyboardSuppressInput = "";
  }

  function handleRemoteExperienceKeyboardBeforeInput(event) {
    if (event.isComposing) state.remoteExperienceKeyboardComposing = true;
  }

  function handleRemoteExperienceKeyboardInput(event) {
    if (!event.isComposing) dom.experienceTwinImeStatus.textContent = "";
  }

  function handleRemoteExperienceKeyboardKeydown(event) {
    if (event.isComposing || state.remoteExperienceKeyboardComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeRemoteExperienceKeyboard();
      return;
    }
  }

  function renderExperienceTwinState(kind, error = null) {
    dom.experienceTwinState.replaceChildren();
    if (kind === "validation_preparing") {
      const textOnly = document.documentElement.dataset.studyExecutablePreview === "0";
      const symbol = element("span", "experience-twin-state-symbol", "验");
      symbol.setAttribute("aria-hidden", "true");
      dom.experienceTwinState.append(
        symbol,
        element("strong", "", t("validation.preparing_title")),
        element("span", "", t(textOnly ? "validation.text_only_copy" : "validation.preparing_copy"))
      );
      return;
    }
    const session = state.remoteExperienceSession;
    const displayStatus = state.remoteDisplayServiceStatus;
    const displayErrorCode = firstText(
      displayStatus?.error?.code,
      displayStatus?.error_code,
      displayStatus?.reason
    ).toLowerCase();
    const activeView = activeExperienceTwinView();
    if (kind === "preparing" && ["vnc_target_not_configured", "vnc_target_unreachable"].includes(session?.errorCode)) {
      kind = "waiting_environment";
    }
    if (["loading", "reconnecting", "preparing", "installing", "configuring", "connecting", "display_starting", "surface_prep"].includes(kind)) {
      let titleKey = "twin.remote_preparing_title";
      let copyKey = "twin.remote_preparing_copy";
      if (kind === "loading") {
        titleKey = "twin.loading";
        copyKey = "common.wait";
      } else if (kind === "reconnecting" || kind === "connecting") {
        titleKey = kind === "reconnecting" ? "twin.reconnecting" : "twin.remote_connecting_title";
        copyKey = kind === "reconnecting" ? "twin.reconnecting_copy" : "twin.remote_connecting_copy";
      } else if (kind === "installing") {
        titleKey = "twin.remote_installing_title";
        copyKey = "twin.remote_installing_copy";
      } else if (kind === "configuring" || kind === "surface_prep") {
        titleKey = state.surfacePreparationStarting ? "twin.surface_prep_starting" : "twin.surface_prep_configuring";
        copyKey = "twin.surface_prep_configuring_copy";
      } else if (kind === "display_starting") {
        titleKey = "twin.remote_starting_display";
        copyKey = "twin.remote_preparing_copy";
      }
      const runtimeCopy = displayErrorCode === "preview_runtime_stale"
        ? t(copyKey)
        : firstText(displayStatus?.message, session?.message, t(copyKey));
      const localizedRuntimeCopy = state.locale !== "zh-CN" && /[\u3400-\u9fff]/.test(runtimeCopy)
        ? t(copyKey)
        : runtimeCopy;
      dom.experienceTwinState.append(
        element("span", "progress-spinner"),
        element("strong", "", t(titleKey)),
        element("span", "", localizedRuntimeCopy)
      );
      dom.experienceTwinState.firstElementChild?.setAttribute("aria-hidden", "true");
      if (["installing", "configuring", "display_starting", "surface_prep"].includes(kind)) {
        const progress = Math.max(0, Math.min(100, Number(displayStatus?.progress) || 0));
        if (progress > 0) {
        const meter = element("div", "experience-install-progress");
        const fill = element("span", "experience-install-progress-fill");
        fill.style.width = `${progress}%`;
        meter.append(fill);
        meter.setAttribute("role", "progressbar");
        meter.setAttribute("aria-valuemin", "0");
        meter.setAttribute("aria-valuemax", "100");
        meter.setAttribute("aria-valuenow", String(progress));
        dom.experienceTwinState.append(meter, element("small", "", `${progress}%`));
        }
      }
      return;
    }

    const agent = experienceTwinFallbackAgent();
    const runtimes = remoteExperienceMissingRuntimes(session, activeView);
    const runtimeText = runtimes.map((runtime) => runtime.label || runtime.id).filter(Boolean).join("、") || t("twin.remote_missing_unknown");
    const surface = activeView ? experienceTwinViewLabel(activeView, Math.max(0, (state.experienceTwin?.views || []).indexOf(activeView))) : t("twin.open");
    let title = t("twin.empty_title");
    let defaultCopy = t("twin.empty_copy", { agent });
    if (kind === "idle") {
      title = t("twin.remote_idle_title");
      defaultCopy = t("twin.remote_idle_copy");
    } else if (kind === "missing_runtime") {
      title = t("twin.remote_missing_title");
      defaultCopy = t("twin.remote_missing_copy", { surface, runtimes: runtimeText });
    } else if (kind === "waiting_install_confirmation") {
      title = t("twin.remote_waiting_install_title");
      defaultCopy = t("twin.remote_waiting_install_copy", { runtimes: runtimeText });
    } else if (kind === "waiting_environment") {
      title = t("twin.remote_waiting_bridge_title");
      defaultCopy = t("twin.remote_waiting_bridge_copy");
    } else if (kind === "display_needs_install") {
      title = t("twin.remote_display_install_title");
      defaultCopy = t("twin.remote_start_display_failed");
    } else if (kind === "display_confirm_install") {
      title = t("twin.remote_install_confirm_title");
      defaultCopy = t("twin.remote_install_confirm_copy");
    } else if (kind === "display_install_error") {
      title = t("twin.remote_install_error_title");
      defaultCopy = t("twin.remote_start_display_failed");
    } else if (kind === "display_error") {
      title = t("twin.remote_session_error");
      defaultCopy = t("twin.remote_start_display_failed");
    } else if (kind === "failed" || kind === "error") {
      title = t("twin.remote_session_error");
      defaultCopy = t("twin.remote_session_error_copy");
    } else if (kind === "preparation_timeout") {
      title = t("twin.remote_preparation_timeout_title");
      defaultCopy = t("twin.remote_preparation_timeout_copy");
    } else if (kind === "expired" || kind === "stopped") {
      title = t("twin.expired_title");
      defaultCopy = t("twin.expired_copy");
    } else if (kind === "unavailable") {
      title = t("twin.remote_unavailable_title");
      defaultCopy = t("twin.remote_unavailable_copy", { agent });
    } else if (kind === "surface_prep") {
      title = t("twin.surface_prep_configuring");
      defaultCopy = t("twin.surface_prep_configuring_copy");
    }
    const prepActive = state.surfacePreparationStarting || ["queued", "configuring"].includes(surfacePreparationPhase());
    const customCopy = ["idle", "preparation_timeout", "expired", "stopped"].includes(kind) || (kind === "unavailable" && prepActive)
      ? ""
      : firstText(displayStatus?.message, session?.message, state.remoteExperience?.message, state.experienceTwin?.fallback?.message);
    const localizedCustomCopy = state.locale !== "zh-CN" && /[\u3400-\u9fff]/.test(customCopy)
      ? ""
      : customCopy;
    const symbol = element("span", "experience-twin-state-symbol", ["failed", "error", "expired"].includes(kind) ? "!" : "◇");
    symbol.setAttribute("aria-hidden", "true");
    dom.experienceTwinState.append(symbol, element("strong", "", title), element("span", "", localizedCustomCopy || defaultCopy));
    if (kind === "display_confirm_install") {
      const plan = displayStatus?.plan && typeof displayStatus.plan === "object" ? displayStatus.plan : {};
      const details = element("div", "experience-install-plan");
      details.append(element("strong", "", firstText(plan.label, t("twin.remote_surface_adapter_label"))));
      const items = [...arrayFrom(plan.steps), ...arrayFrom(plan.security)].map((item) => firstText(item)).filter(Boolean);
      if (items.length) {
        const list = element("ul");
        items.forEach((item) => list.append(element("li", "", item)));
        details.append(list);
      }
      dom.experienceTwinState.append(details);
    }
    if (error) {
      const detail = friendlyError(error, "");
      if (detail) dom.experienceTwinState.append(element("small", "experience-twin-error-detail", detail));
    }
    const diagnosticReason = firstText(displayStatus?.diagnostic?.reason);
    const localizedDiagnosticReason = state.locale !== "zh-CN" && /[\u3400-\u9fff]/.test(diagnosticReason)
      ? ""
      : diagnosticReason;
    if (localizedDiagnosticReason && localizedDiagnosticReason !== localizedCustomCopy) {
      dom.experienceTwinState.append(element("small", "experience-twin-error-detail", localizedDiagnosticReason));
    }
    const actions = element("div", "experience-twin-state-actions");
    if (kind === "display_needs_install") {
      const approve = element("button", "primary-button compact", t("twin.remote_display_install_action"));
      approve.type = "button";
      approve.addEventListener("click", approveRemoteDisplayInstall);
      actions.append(approve);
    } else if (kind === "display_confirm_install") {
      const confirm = element("button", "primary-button compact", t("twin.remote_install_final_action"));
      confirm.type = "button";
      confirm.disabled = state.remoteDisplayServiceBusy;
      confirm.addEventListener("click", confirmRemoteDisplayInstall);
      const decline = element("button", "secondary-button compact", t("twin.remote_install_cancel_action"));
      decline.type = "button";
      decline.addEventListener("click", () => setChatView("main"));
      actions.append(confirm, decline);
    } else if (kind === "display_install_error") {
      const retryInstall = element("button", "primary-button compact", t("twin.remote_install_retry_action"));
      retryInstall.type = "button";
      retryInstall.disabled = state.remoteDisplayServiceBusy;
      retryInstall.addEventListener("click", approveRemoteDisplayInstall);
      actions.append(retryInstall);
    } else if (["missing_runtime", "waiting_install_confirmation"].includes(kind)) {
      const install = element("button", "primary-button compact", t("twin.remote_install_action"));
      install.type = "button";
      install.disabled = Boolean(runtimes.length && runtimes.every((runtime) => runtime.installable === false));
      install.addEventListener("click", () => startRemoteExperienceSession({ force: true, confirmInstall: true }));
      const decline = element("button", "secondary-button compact", t("twin.remote_install_decline"));
      decline.type = "button";
      decline.addEventListener("click", () => setChatView("main"));
      actions.append(install, decline);
    } else if (["waiting_environment", "display_error"].includes(kind)) {
      const startDisplay = element("button", "primary-button compact", t("twin.remote_start_display"));
      startDisplay.type = "button";
      startDisplay.id = "remoteDisplayStartButton";
      startDisplay.disabled = state.remoteDisplayServiceBusy;
      startDisplay.addEventListener("click", startRemoteDisplayService);
      actions.append(startDisplay);
    } else if (kind === "unavailable" && activeView?.id) {
      const agentId = surfacePreparationAgentId(activeView);
      const prepPhase = surfacePreparationPhase();
      if (prepPhase === "error") {
        const retry = element("button", "primary-button compact", t("twin.retry"));
        retry.type = "button";
        retry.addEventListener("click", () => {
          const key = surfacePreparationKey(activeView);
          if (key) state.surfacePreparationAttempted.delete(key);
          state.surfacePreparationContract = null;
          void ensureSurfacePreparationStarted(activeView);
        });
        actions.append(retry);
      }
      if (agentId) {
        const viewStatus = element("button", "secondary-button compact", t("twin.surface_prep_view_status"));
        viewStatus.type = "button";
        viewStatus.addEventListener("click", () => openSurfacePreparationSession(activeView));
        actions.append(viewStatus);
      }
    } else if (kind === "surface_prep" && activeView?.id) {
      const agentId = surfacePreparationAgentId(activeView);
      if (agentId) {
        const viewStatus = element("button", "secondary-button compact", t("twin.surface_prep_view_status"));
        viewStatus.type = "button";
        viewStatus.addEventListener("click", () => openSurfacePreparationSession(activeView));
        actions.append(viewStatus);
      }
    } else if (kind === "idle") {
      const start = element("button", "primary-button compact", t("twin.remote_start"));
      start.type = "button";
      start.addEventListener("click", () => startRemoteExperienceSession({ force: true }));
      actions.append(start);
    } else if (kind === "expired" || kind === "stopped") {
      const retry = element("button", "primary-button compact", t("twin.retry"));
      retry.type = "button";
      retry.addEventListener("click", () => startRemoteExperienceSession({ force: true }));
      actions.append(retry);
    } else if (!["empty"].includes(kind)) {
      const retry = element("button", "secondary-button compact", t("twin.retry"));
      retry.type = "button";
      retry.addEventListener("click", () => startRemoteExperienceSession({ force: true }));
      actions.append(retry);
    }
    const develop = element("button", "text-button compact", t("twin.remote_open_develop"));
    develop.type = "button";
    develop.addEventListener("click", () => setChatView("developer"));
    actions.append(develop);
    dom.experienceTwinState.append(actions);
  }

  function surfacePreparationAgentId(view) {
    const surfaceId = firstText(view?.id);
    if (!/^[a-z0-9_-]{1,48}$/.test(surfaceId)) return "";
    return firstText(
      state.surfacePreparationContract?.preparation_agent?.agent_id,
      state.surfacePreparationContract?.preparationAgent?.agentId,
      `sprep-${surfaceId}`
    );
  }

  function surfacePreparationKey(view) {
    const surfaceId = firstText(view?.id);
    return state.currentId && surfaceId ? `${state.currentId}:${surfaceId}` : "";
  }

  function stopSurfacePreparationPoll() {
    window.clearTimeout(state.surfacePreparationPollTimer);
    state.surfacePreparationPollTimer = null;
  }

  function scheduleSurfacePreparationPoll(view) {
    stopSurfacePreparationPoll();
    const surfaceId = firstText(view?.id);
    if (!state.currentId || !/^[a-z0-9_-]{1,48}$/.test(surfaceId)) return;
    state.surfacePreparationPollTimer = window.setTimeout(async () => {
      state.surfacePreparationPollTimer = null;
      if (!state.experienceTwinOpen || surfaceId !== firstText(activeExperienceTwinView()?.id)) return;
    try {
      const contract = await request(
        `/apps/${encodeURIComponent(state.currentId)}/experience-surfaces/${encodeURIComponent(surfaceId)}/runtime-preparation`
      );
        state.surfacePreparationContract = contract;
        const phase = firstText(contract?.phase, contract?.preparation?.phase).toLowerCase();
        renderExperienceTwin();
        if (["queued", "configuring"].includes(phase)) {
          scheduleSurfacePreparationPoll(view);
          return;
        }
        stopSurfacePreparationPoll();
        if (phase === "error") {
          const key = surfacePreparationKey(view);
          if (key) state.surfacePreparationAttempted.delete(key);
        }
        if (phase === "ready" || phase === "completed") {
          await loadExperienceTwin({ force: true });
          return;
        }
        await pollRemoteDisplayService();
      } catch {
        scheduleSurfacePreparationPoll(view);
      }
    }, 2_000);
  }

  async function ensureSurfacePreparationStarted(view, { silent = false } = {}) {
    const surfaceId = firstText(view?.id);
    const key = surfacePreparationKey(view);
    if (!key || !/^[a-z0-9_-]{1,48}$/.test(surfaceId)) return false;
    if (state.surfacePreparationAttempted.has(key) || state.surfacePreparationStarting) return false;

    state.surfacePreparationAttempted.add(key);
    state.surfacePreparationStarting = true;
    try {
      const contract = await request(
        `/apps/${encodeURIComponent(state.currentId)}/experience-surfaces/${encodeURIComponent(surfaceId)}/runtime-preparation`,
        { method: "POST", json: { action: "start" } }
      );
      state.surfacePreparationContract = contract;
      const phase = firstText(contract?.phase, contract?.preparation?.phase).toLowerCase();
      if (["queued", "configuring"].includes(phase)) scheduleSurfacePreparationPoll(view);
      return true;
    } catch (error) {
      const key = surfacePreparationKey(view);
      if (key) state.surfacePreparationAttempted.delete(key);
      if (!silent) {
        showToast(friendlyError(error, t("twin.surface_prep_start_failed")), "error", 6_000);
      }
      return false;
    } finally {
      state.surfacePreparationStarting = false;
      if (state.experienceTwinOpen) renderExperienceTwin();
    }
  }

  function openSurfacePreparationSession(view) {
    const surfaceId = firstText(view?.id);
    const agentId = surfacePreparationAgentId(view);
    if (!agentId) return;
    const label = experienceTwinViewLabel(
      view,
      Math.max(0, (state.experienceTwin?.views || []).findIndex((candidate) => candidate.id === surfaceId))
    );
    openDeveloperSession(agentId, `${label} · ${t("twin.surface_prep_view_status")}`);
  }

  async function prepareExistingExperienceSurface(view) {
    return ensureSurfacePreparationStarted(view);
  }

  function remoteExperienceMissingRuntimes(session, view) {
    const direct = normalizeRemoteRuntimes(session?.missingRuntimes);
    if (direct.length) return enrichRemoteRuntimes(direct);
    const surfaceMissing = normalizeRemoteRuntimes(view?.missingRuntimes);
    return enrichRemoteRuntimes(surfaceMissing.length ? surfaceMissing : normalizeRemoteRuntimes(view?.requiredRuntimes));
  }

  function enrichRemoteRuntimes(runtimes) {
    const capabilities = state.remoteExperience?.capabilities?.runtimes || {};
    return runtimes.map((runtime) => {
      const capability = capabilities[runtime.id] && typeof capabilities[runtime.id] === "object"
        ? capabilities[runtime.id]
        : {};
      const translationKey = `twin.runtime.${runtime.id}`;
      const translated = TRANSLATIONS[state.locale]?.[translationKey] ? t(translationKey) : "";
      return {
        ...runtime,
        label: translated || runtime.label || firstText(capability.provider, runtime.id),
        installable: runtime.installable !== false && capability.installable !== false,
      };
    });
  }

  function experienceTwinFallbackAgent() {
    const configured = firstText(state.experienceTwin?.fallback?.codingAgent, currentCodingAgent(state.current));
    return configured ? codingAgentLabel(configured) : "Claude Code / Codex";
  }

  async function ensureRemoteExperienceRfb(session, view) {
    if (!remoteExperienceTransportAvailable()) return;
    const websocketUrl = remoteExperienceWebsocketUrl(session?.websocketUrl);
    if (!websocketUrl || !view) return;
    const renderKey = `${session.id || "session"}|${view.id}|${websocketUrl}`;
    if (state.remoteExperienceRfb && state.experienceTwinRenderKey === renderKey) {
      applyExperienceTwinScale();
      return;
    }

    disconnectRemoteExperienceRfb({ preserveRecovery: true });
    const requestNumber = ++state.remoteExperienceRfbRequest;
    state.experienceTwinRenderKey = renderKey;
    state.remoteExperienceConnected = false;
    dom.experienceTwinFrames.replaceChildren();
    const target = element("div", "remote-experience-rfb");
    target.tabIndex = 0;
    const index = Math.max(0, (state.experienceTwin?.views || []).indexOf(view));
    target.setAttribute("role", "application");
    target.setAttribute("aria-label", t("twin.remote_viewer_title", { label: experienceTwinViewLabel(view, index) }));
    const loading = element("div", "experience-twin-frame-loading");
    loading.append(element("span", "progress-spinner"), element("span", "", t("twin.frame_loading", { label: experienceTwinViewLabel(view, index) })));
    loading.firstElementChild?.setAttribute("aria-hidden", "true");
    dom.experienceTwinFrames.append(target, loading);

    try {
      const module = await loadNoVncRfbModule();
      if (requestNumber !== state.remoteExperienceRfbRequest || renderKey !== state.experienceTwinRenderKey) return;
      const RFB = module?.default || module?.RFB;
      if (typeof RFB !== "function") throw new Error("noVNC RFB module is unavailable");
      const options = session.credentials ? { credentials: session.credentials } : {};
      const rfb = new RFB(target, websocketUrl, options);
      state.remoteExperienceRfb = rfb;
      rfb.showDotCursor = true;
      rfb.scaleViewport = true;
      rfb.resizeSession = false;
      rfb.focusOnClick = true;
      rfb.viewOnly = false;
      rfb.dragViewport = false;
      const nativeSurface = ["mobile_app", "watch_app", "tablet_app", "desktop_app"].includes(
        String(view?.surface || "").toLowerCase()
      );
      rfb.qualityLevel = nativeSurface ? 7 : 4;
      rfb.compressionLevel = nativeSurface ? 1 : 2;
      const markRemoteExperienceConnected = () => {
        if (state.remoteExperienceRfb !== rfb) return;
        clearRemoteExperienceRfbWatchdogs();
        state.remoteExperienceConnected = true;
        state.remoteExperienceRfbReconnectAttempts = 0;
        noteReleaseVerifySurface();
        setRemoteExperienceKeyboardAvailability(true);
        scheduleRemoteExperiencePoll();
        window.requestAnimationFrame(() => {
          if (state.remoteExperienceRfb !== rfb) return;
          loading.hidden = true;
          dom.experienceTwinStage.classList.add("is-connected");
        });
      };
      state.remoteExperienceRfbConnectTimer = window.setTimeout(() => {
        if (state.remoteExperienceRfb !== rfb || state.remoteExperienceConnected) return;
        scheduleRemoteExperienceRfbReconnect("connect_timeout");
      }, 10_000);
      let rfbFailureReason = "";
      rfb.addEventListener("rfbfailure", (event) => {
        rfbFailureReason = firstText(event?.detail?.details);
      });
      rfb.addEventListener("connect", () => {
        if (state.remoteExperienceRfb !== rfb) return;
        window.clearTimeout(state.remoteExperienceRfbConnectTimer);
        state.remoteExperienceRfbConnectTimer = null;
        updateRemoteExperienceLoading(t("twin.frame_handshake_ready"));
        window.clearTimeout(state.remoteExperienceRfbFirstFrameTimer);
        state.remoteExperienceRfbFirstFrameTimer = window.setTimeout(() => {
          if (state.remoteExperienceRfb !== rfb || state.remoteExperienceConnected) return;
          // A completed RFB handshake means the isolated display is usable.
          // Some browsers finish decoding the initial JPEG while suppressing
          // the patched noVNC firstframe event. Reveal the live canvas instead
          // of tearing down a healthy transport and entering a reconnect loop.
          markRemoteExperienceConnected();
        }, 6_000);
      });
      rfb.addEventListener("firstframe", () => {
        markRemoteExperienceConnected();
      });
      rfb.addEventListener("credentialsrequired", () => {
        if (state.remoteExperienceRfb === rfb && session.credentials) rfb.sendCredentials(session.credentials);
      });
      rfb.addEventListener("securityfailure", (event) => {
        if (state.remoteExperienceRfb !== rfb) return;
        clearRemoteExperienceRfbTimers();
        state.remoteExperienceError = new Error(firstText(event?.detail?.reason, t("twin.remote_session_error_copy")));
        state.remoteExperienceSession = { ...state.remoteExperienceSession, status: "failed" };
        renderExperienceTwin(state.remoteExperienceError);
      });
      rfb.addEventListener("disconnect", () => {
        if (state.remoteExperienceRfb !== rfb) return;
        state.remoteExperienceRfb = null;
        state.remoteExperienceConnected = false;
        setRemoteExperienceKeyboardAvailability(false);
        dom.experienceTwinStage.classList.remove("is-connected");
        scheduleRemoteExperienceRfbReconnect(rfbFailureReason || "transport_closed");
      });
    } catch (error) {
      if (requestNumber !== state.remoteExperienceRfbRequest) return;
      state.remoteExperienceError = error;
      scheduleRemoteExperienceRfbReconnect(
        firstText(error?.message, friendlyError(error, ""), "viewer_load_failed")
      );
    }
  }

  function clearRemoteExperienceRfbWatchdogs() {
    window.clearTimeout(state.remoteExperienceRfbConnectTimer);
    window.clearTimeout(state.remoteExperienceRfbFirstFrameTimer);
    state.remoteExperienceRfbConnectTimer = null;
    state.remoteExperienceRfbFirstFrameTimer = null;
  }

  function clearRemoteExperienceRfbTimers() {
    clearRemoteExperienceRfbWatchdogs();
    window.clearTimeout(state.remoteExperienceRfbReconnectTimer);
    state.remoteExperienceRfbReconnectTimer = null;
  }

  function updateRemoteExperienceLoading(message) {
    const loading = dom.experienceTwinFrames?.querySelector(".experience-twin-frame-loading");
    if (!loading) return;
    loading.hidden = false;
    const copy = loading.lastElementChild;
    if (copy) copy.textContent = message;
  }

  function scheduleRemoteExperienceRfbReconnect(reason = "") {
    clearRemoteExperienceRfbWatchdogs();
    window.clearTimeout(state.remoteExperiencePollTimer);
    state.remoteExperiencePollTimer = null;
    window.clearTimeout(state.remoteExperienceRfbReconnectTimer);
    state.remoteExperienceRfbReconnectTimer = null;
    state.remoteExperienceConnected = false;
    dom.experienceTwinStage?.classList.remove("is-connected");

    if (!state.experienceTwinOpen || document.hidden || navigator.onLine === false) {
      disconnectRemoteExperienceRfb({ preserveRecovery: true });
      return;
    }

    const attempt = state.remoteExperienceRfbReconnectAttempts + 1;
    if (attempt > 3) {
      disconnectRemoteExperienceRfb({ preserveRecovery: true });
      const diagnostic = reason && reason !== "transport_closed" ? ` [${reason}]` : "";
      const message = `${t("twin.frame_reconnect_exhausted")}${diagnostic}`;
      state.remoteExperienceError = new Error(message);
      state.remoteExperienceSession = {
        ...state.remoteExperienceSession,
        status: "failed",
        message,
        clientFailureReason: reason,
      };
      renderExperienceTwin(state.remoteExperienceError);
      return;
    }

    state.remoteExperienceRfbReconnectAttempts = attempt;
    updateRemoteExperienceLoading(t("twin.frame_reconnecting", { attempt }));
    disconnectRemoteExperienceRfb({ preserveRecovery: true });
    const delay = [1_000, 2_000, 5_000][attempt - 1];
    state.remoteExperienceRfbReconnectTimer = window.setTimeout(() => {
      state.remoteExperienceRfbReconnectTimer = null;
      if (!state.experienceTwinOpen || document.hidden || navigator.onLine === false) return;
      const currentSession = state.remoteExperienceSession;
      const currentView = activeExperienceTwinView();
      // A browser-surface runtime may be rebound between session creation and
      // the first WebSocket upgrade.  The rebound intentionally rotates the
      // target-bound token, so retrying the same URL can only produce 403s.
      // Refresh the session first on every transport retry; rendering the
      // returned ready session reconnects with the current target and token.
      if (currentSession?.id) {
        void pollRemoteExperienceSession();
      } else if (currentSession?.status === "ready" && remoteExperienceWebsocketUrl(currentSession.websocketUrl) && currentView) {
        void ensureRemoteExperienceRfb(currentSession, currentView);
      }
    }, delay);
  }

  function loadNoVncRfbModule() {
    if (state.remoteExperienceRfbModule) return Promise.resolve(state.remoteExperienceRfbModule);
    if (!state.remoteExperienceRfbModulePromise) {
      let timeoutId = null;
      // Keep noVNC behind the tenant API asset route.  Resolving this relative
      // to app.js automatically inherits /applooper or /applooper-test at the
      // study gateway, while a direct tenant resolves it to root /api.  The
      // relative imports inside rfb.js then stay under that same module tree.
      const loading = import("./api/remote-experience/novnc/core/rfb.js?v=166")
        .then((module) => {
          state.remoteExperienceRfbModule = module;
          return module;
        });
      const timeout = new Promise((resolve, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error("noVNC viewer module did not load within 12 seconds")),
          12_000
        );
      });
      const guarded = Promise.race([loading, timeout]).finally(() => window.clearTimeout(timeoutId));
      state.remoteExperienceRfbModulePromise = guarded;
      void guarded.catch(() => {
        if (state.remoteExperienceRfbModulePromise === guarded) {
          state.remoteExperienceRfbModulePromise = null;
        }
      });
    }
    return state.remoteExperienceRfbModulePromise;
  }

  function clearExperienceTwinPreviewReadiness() {
    if (state.experienceTwinPreviewReadyListener) {
      window.removeEventListener("message", state.experienceTwinPreviewReadyListener);
      state.experienceTwinPreviewReadyListener = null;
    }
    window.clearTimeout(state.experienceTwinPreviewReadyTimer);
    state.experienceTwinPreviewReadyTimer = null;
  }

  function disconnectRemoteExperienceRfb({ preserveRecovery = false } = {}) {
    clearExperienceTwinPreviewReadiness();
    clearRemoteExperienceRfbTimers();
    if (!preserveRecovery) state.remoteExperienceRfbReconnectAttempts = 0;
    state.remoteExperienceRfbRequest += 1;
    const rfb = state.remoteExperienceRfb;
    state.remoteExperienceRfb = null;
    state.remoteExperienceConnected = false;
    setRemoteExperienceKeyboardAvailability(false);
    state.experienceTwinPreviewUrl = "";
    dom.experienceTwinStage?.classList.remove("is-connected", "is-web-preview");
    if (!rfb) return;
    try {
      rfb.disconnect();
    } catch {
      // The transport may already have closed.
    }
  }

  function remoteExperienceTransportAvailable() {
    return Boolean(state.experienceTwinOpen && !document.hidden && navigator.onLine !== false);
  }

  function pauseRemoteExperienceTransport() {
    window.clearTimeout(state.remoteExperiencePollTimer);
    state.remoteExperiencePollTimer = null;
    disconnectRemoteExperienceRfb({ preserveRecovery: true });
  }

  function resumeRemoteExperienceRfb() {
    if (!remoteExperienceTransportAvailable()) return;
    state.remoteExperienceRfbReconnectAttempts = 0;
    const session = state.remoteExperienceSession;
    const view = activeExperienceTwinView();
    if (session?.status === "ready" && remoteExperienceWebsocketUrl(session.websocketUrl) && view) {
      renderExperienceTwin();
      return;
    }
    if (remoteExperienceNeedsPolling(session)) {
      void pollRemoteExperienceSession();
    }
  }

  function remoteExperienceWebsocketUrl(value) {
    const raw = firstText(value);
    if (!raw) return "";
    try {
      const url = new URL(raw, window.location.href);
      if (url.protocol === "http:") url.protocol = "ws:";
      if (url.protocol === "https:") url.protocol = "wss:";
      return ["ws:", "wss:"].includes(url.protocol) && url.host === window.location.host ? url.href : "";
    } catch {
      return "";
    }
  }

  function safeRemoteViewerUrl(value) {
    const raw = firstText(value);
    if (!raw) return "";
    try {
      const url = new URL(raw, window.location.href);
      return ["http:", "https:"].includes(url.protocol) && url.origin === window.location.origin ? url.href : "";
    } catch {
      return "";
    }
  }

  function experienceTwinWebPreviewUrl(view) {
    if (!view || !["desktop_web", "mobile_web", "tablet_web", "responsive"].includes(experienceTwinViewKind(view))) {
      return "";
    }
    // Only documents verified as self-contained static HTML may use the
    // opaque-origin iframe. Dynamic/login/backend-dependent pages must run in
    // a dedicated isolated Chromium surface over noVNC; using the user's real
    // desktop browser would expose unrelated windows and host input.
    if (view.previewMode !== "sandbox_static" || view.iframeCompatible !== true) return "";
    const entry = firstText(state.experienceTwin?.entry);
    if (!entry) return "";
    try {
      const base = new URL(entry, window.location.href);
      if (!["http:", "https:"].includes(base.protocol)) return "";
      const baseHref = base.href.endsWith("/") ? base.href : `${base.href}/`;
      const focusRoute = firstText(state.trialSandboxFocus?.route);
      const relativeRoute = firstText(focusRoute, view.route, "/").replace(/^\/+/, "");
      return new URL(relativeRoute, baseHref).href;
    } catch {
      return "";
    }
  }

  function renderExperienceTwinWebPreview(view, url, { force = false } = {}) {
    const renderKey = `web|${view.id}|${url}`;
    if (!force && state.experienceTwinRenderKey === renderKey && dom.experienceTwinFrames.querySelector("iframe")) {
      scheduleExperienceTwinScale();
      return;
    }
    disconnectRemoteExperienceRfb();
    state.experienceTwinRenderKey = renderKey;
    state.experienceTwinPreviewUrl = url;
    state.remoteExperienceConnected = false;
    dom.experienceTwinStage.classList.remove("is-connected");
    dom.experienceTwinStage.classList.add("is-web-preview");
    dom.experienceTwinState.hidden = true;
    dom.experienceTwinFrames.hidden = false;
    dom.experienceTwinFrames.replaceChildren();

    const slot = element("div", `experience-twin-frame-slot${view.width && view.height ? "" : " is-responsive"}`);
    const frame = element("iframe", "experience-twin-frame");
    const index = Math.max(0, (state.experienceTwin?.views || []).indexOf(view));
    frame.title = t("twin.iframe_title", { label: experienceTwinViewLabel(view, index) });
    // The signed preview shares the AppLooper URL only as a transport.  Keep it
    // in an opaque origin so a local app cannot read the paired session or call
    // authenticated AppLooper APIs through its parent page.
    frame.setAttribute("sandbox", "allow-scripts allow-forms allow-modals allow-downloads");
    frame.setAttribute("allow", "clipboard-read; clipboard-write; fullscreen");
    frame.referrerPolicy = "same-origin";
    const loading = element("div", "experience-twin-frame-loading");
    loading.append(element("span", "progress-spinner"), element("span", "", t("twin.preview_loading")));
    loading.firstElementChild?.setAttribute("aria-hidden", "true");
    const showPreviewFailure = (messageKey) => {
      if (state.experienceTwinRenderKey !== renderKey || !frame.isConnected) return;
      clearExperienceTwinPreviewReadiness();
      state.remoteExperienceConnected = false;
      dom.experienceTwinStage.classList.remove("is-connected");
      dom.experienceTwinFidelity.hidden = true;
      loading.hidden = false;
      const symbol = element("span", "experience-twin-state-symbol", "!");
      symbol.setAttribute("aria-hidden", "true");
      loading.replaceChildren(symbol, element("span", "", t(messageKey)));
    };
    const readyListener = (event) => {
      if (
        event.source !== frame.contentWindow
        || event.data?.type !== "applooper-preview-ready"
        || state.experienceTwinRenderKey !== renderKey
        || !frame.isConnected
      ) return;
      clearExperienceTwinPreviewReadiness();
      state.remoteExperienceConnected = true;
      noteReleaseVerifySurface();
      dom.experienceTwinStage.classList.add("is-connected", "is-web-preview");
      loading.hidden = true;
      dom.experienceTwinFidelity.hidden = false;
      dom.experienceTwinFidelityTitle.textContent = t("twin.web_ready_title");
      dom.experienceTwinFidelityCopy.textContent = t("twin.web_ready_copy");
      scheduleExperienceTwinScale();
    };
    state.experienceTwinPreviewReadyListener = readyListener;
    window.addEventListener("message", readyListener);
    state.experienceTwinPreviewReadyTimer = window.setTimeout(
      () => showPreviewFailure("twin.preview_timeout"),
      12_000
    );
    frame.addEventListener("load", scheduleExperienceTwinScale);
    frame.addEventListener("error", () => showPreviewFailure("twin.preview_failed"), { once: true });
    slot.append(frame, loading);
    dom.experienceTwinFrames.append(slot);
    frame.src = url;
    dom.experienceTwinFidelity.hidden = true;
    dom.openExperienceTwinWindowButton.hidden = false;
    dom.stopExperienceTwinButton.hidden = true;
    scheduleExperienceTwinScale();
  }

  function syncExperienceTwinSurfaceSwitch() {
    const switcher = document.getElementById("experienceTwinSurfaceSwitch");
    if (!switcher) return;
    const sources = Array.from(dom.experienceTwinViews.querySelectorAll(".experience-twin-view"));
    switcher.replaceChildren();
    switcher.hidden = sources.length < 2;
    sources.forEach((source) => {
      const chip = element("button", `experience-twin-surface-chip${source.classList.contains("is-active") ? " is-active" : ""}`);
      chip.type = "button";
      chip.setAttribute("aria-pressed", source.getAttribute("aria-pressed") || "false");
      chip.textContent = source.querySelector("strong")?.textContent || source.textContent;
      chip.addEventListener("click", () => source.click());
      switcher.append(chip);
    });
  }

  function bindSyntheticNoticeDismiss() {
    const notice = document.getElementById("experienceTwinSyntheticNotice");
    if (notice) notice.hidden = true;
  }

  async function selectExperienceTwinView(id) {
    if (normalizedIdentity(id) === normalizedIdentity(state.experienceTwinViewId)) return;
    const previousAppId = state.current?.id;
    const previousSessionId = state.remoteExperienceSession?.id;
    state.experienceTwinViewId = id;
    state.remoteExperienceSessionStartRequest += 1;
    state.remoteExperienceSessionPollRequest += 1;
    state.remoteExperienceStarting = false;
    state.remoteExperienceStartKey = "";
    state.remoteExperienceError = null;
    state.remoteExperienceExpiredRecovered = false;
    state.remoteExperienceSession = null;
    state.remoteDisplayServiceStatus = null;
    window.clearTimeout(state.remoteDisplayServiceTimer);
    state.remoteDisplayServiceTimer = null;
    disconnectRemoteExperienceRfb();
    dom.experienceTwinHistory.open = false;
    dom.experienceTwinFrames.replaceChildren();
    if (previousAppId && previousSessionId) void deleteRemoteExperienceSession(previousAppId, previousSessionId);
    renderExperienceTwin();
    if (!experienceTwinWebPreviewUrl(activeExperienceTwinView())) {
      await startRemoteExperienceWithDisplayCheck({ force: true });
    }
  }

  function updateExperienceTwinFrameVisibility() {
    const view = activeExperienceTwinView();
    dom.experienceTwinSize.textContent = view?.width && view?.height
      ? t("twin.viewport", { width: view.width, height: view.height })
      : t("twin.responsive");
    dom.experienceTwinActualButton.disabled = !(view?.width && view?.height);
    if (dom.experienceTwinActualButton.disabled && state.experienceTwinScaleMode === "actual") {
      state.experienceTwinScaleMode = "fit";
    }
  }

  function activeExperienceTwinView() {
    const views = state.experienceTwin?.views || [];
    return views.find(
      (view) => normalizedIdentity(view.id) === normalizedIdentity(state.experienceTwinViewId)
    ) || views[0] || null;
  }

  function bindExperienceTwinLaser() {
    const stage = dom.experienceTwinStage;
    const laser = dom.experienceTwinLaser;
    if (!stage || !laser || laser.dataset.bound === "1") return;
    laser.dataset.bound = "1";
    const move = (event) => {
      const rect = stage.getBoundingClientRect();
      laser.hidden = false;
      laser.style.left = `${event.clientX - rect.left}px`;
      laser.style.top = `${event.clientY - rect.top}px`;
    };
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerenter", move);
    stage.addEventListener("pointerleave", () => {
      laser.hidden = true;
    });
  }

  function experienceTwinFullscreenTarget() {
    return dom.experienceTwinStage || null;
  }

  function experienceTwinFullscreenActive() {
    const target = experienceTwinFullscreenTarget();
    const current = document.fullscreenElement;
    return Boolean(
      document.body.classList.contains("experience-twin-fullscreen-fallback")
      || (target && current && (
        current === target || target.contains(current) || current.contains(target)
      ))
    );
  }

  function updateExperienceTwinFullscreenAvailability(enabled) {
    if (!dom.experienceTwinFullscreenButton) return;
    dom.experienceTwinFullscreenButton.hidden = !enabled;
    dom.experienceTwinFullscreenButton.disabled = !enabled;
    if (!enabled) void exitExperienceTwinFullscreen();
    else syncExperienceTwinFullscreenUi();
  }

  function syncExperienceTwinFullscreenUi() {
    const active = experienceTwinFullscreenActive();
    if (dom.experienceTwinFullscreenButton) {
      dom.experienceTwinFullscreenButton.classList.toggle("is-active", active);
      dom.experienceTwinFullscreenButton.setAttribute("aria-pressed", String(active));
      dom.experienceTwinFullscreenButton.title = t(active ? "twin.fullscreen_exit" : "twin.fullscreen_enter");
      dom.experienceTwinFullscreenButton.setAttribute("aria-label", dom.experienceTwinFullscreenButton.title);
    }
    if (dom.experienceTwinFullscreenOverlayButton) {
      dom.experienceTwinFullscreenOverlayButton.title = t("twin.fullscreen_exit");
      dom.experienceTwinFullscreenOverlayButton.setAttribute("aria-label", dom.experienceTwinFullscreenOverlayButton.title);
    }
    scheduleExperienceTwinScale();
  }

  async function toggleExperienceTwinFullscreen() {
    const target = experienceTwinFullscreenTarget();
    if (!target || dom.experienceTwinFullscreenButton?.hidden) return;
    try {
      if (experienceTwinFullscreenActive()) {
        document.body.classList.remove("experience-twin-fullscreen-fallback");
        if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
      } else {
        if (typeof target.requestFullscreen === "function") {
          try {
            await target.requestFullscreen();
          } catch {
            document.body.classList.add("experience-twin-fullscreen-fallback");
          }
        } else {
          document.body.classList.add("experience-twin-fullscreen-fallback");
        }
      }
    } catch {
      document.body.classList.add("experience-twin-fullscreen-fallback");
    } finally {
      syncExperienceTwinFullscreenUi();
      if (!shouldDeferBackgroundRender()) flushDeferredAppRender();
    }
  }

  async function exitExperienceTwinFullscreen() {
    document.body.classList.remove("experience-twin-fullscreen-fallback");
    if (!document.fullscreenElement) {
      syncExperienceTwinFullscreenUi();
      return;
    }
    const target = experienceTwinFullscreenTarget();
    if (target && document.fullscreenElement !== target) {
      syncExperienceTwinFullscreenUi();
      return;
    }
    try {
      await document.exitFullscreen();
    } catch {
      // Ignore exit races when the browser already left fullscreen.
    } finally {
      syncExperienceTwinFullscreenUi();
    }
  }

  function setExperienceTwinScaleMode(mode) {
    state.experienceTwinScaleMode = mode === "actual" ? "actual" : "fit";
    updateExperienceTwinScaleButtons();
    scheduleExperienceTwinScale();
  }

  function updateExperienceTwinScaleButtons() {
    const actual = state.experienceTwinScaleMode === "actual";
    dom.experienceTwinFitButton.classList.toggle("is-active", !actual);
    dom.experienceTwinFitButton.setAttribute("aria-pressed", String(!actual));
    dom.experienceTwinActualButton.classList.toggle("is-active", actual);
    dom.experienceTwinActualButton.setAttribute("aria-pressed", String(actual));
    dom.experienceTwinFrames.classList.toggle("is-fit", !actual);
    dom.experienceTwinFrames.classList.toggle("is-actual", actual);
  }

  function scheduleExperienceTwinScale() {
    if (!state.experienceTwinOpen) return;
    window.requestAnimationFrame(applyExperienceTwinScale);
  }

  function ensureExperienceTwinResizeObserver() {
    if (state.experienceTwinResizeObserver || typeof ResizeObserver !== "function") return;
    state.experienceTwinResizeObserver = new ResizeObserver(scheduleExperienceTwinScale);
    state.experienceTwinResizeObserver.observe(dom.experienceTwinStage);
  }

  function applyExperienceTwinScale() {
    if (!state.experienceTwinOpen) return;
    if (state.remoteExperienceRfb) {
      state.remoteExperienceRfb.scaleViewport = true;
      return;
    }
    const slot = dom.experienceTwinFrames?.querySelector(".experience-twin-frame-slot");
    const view = activeExperienceTwinView();
    if (!slot || !view) return;
    if (!(view.width && view.height)) {
      Object.assign(slot.style, { inset: "10px", width: "auto", height: "auto", transform: "none" });
      return;
    }
    slot.style.inset = "auto";
    slot.style.width = `${view.width}px`;
    slot.style.height = `${view.height}px`;
    const narrowViewer = window.matchMedia("(max-width: 900px)").matches;
    const portraitSurface = Number(view.height) > Number(view.width);
    dom.experienceTwinStage.classList.toggle("is-mobile-fill", narrowViewer && portraitSurface);
    if (state.experienceTwinScaleMode === "actual") {
      Object.assign(slot.style, { top: "10px", left: "10px", transform: "none" });
      return;
    }
    if (narrowViewer && portraitSurface) {
      Object.assign(slot.style, {
        inset: "0",
        width: "100%",
        height: "100%",
        top: "0",
        left: "0",
        transform: "none",
      });
      return;
    }
    const bounds = dom.experienceTwinStage.getBoundingClientRect();
    const scale = Math.max(0.08, Math.min(1.2, (bounds.width - 20) / view.width, (bounds.height - 20) / view.height));
    Object.assign(slot.style, {
      top: "50%",
      left: "50%",
      transform: `translate(-50%, -50%) scale(${scale})`,
    });
  }

  function reloadActiveExperienceTwinFrame() {
    state.remoteExperienceRfbReconnectAttempts = 0;
    const view = activeExperienceTwinView();
    const previewUrl = experienceTwinWebPreviewUrl(view);
    if (previewUrl) renderExperienceTwinWebPreview(view, previewUrl, { force: true });
    else startRemoteExperienceSession({ force: true });
  }

  function openActiveExperienceTwinWindow() {
    const viewerUrl = state.experienceTwinPreviewUrl || safeRemoteViewerUrl(state.remoteExperienceSession?.viewerUrl);
    if (viewerUrl) window.open(viewerUrl, "_blank", "noopener,noreferrer");
  }

  function setChatView(view) {
    const directDeveloperStudy = usesDirectDeveloperStudyConversation();
    const nextView = view === "experience"
      ? "experience"
      : (view === "developer" || directDeveloperStudy ? "developer" : "main");
    if (!state.current) return;
    if (nextView === state.chatView && !state.experienceTwinOpen && !state.launchOpen && !state.growthOpen) {
      state.forceChatBottom = true;
      renderMessages();
      return;
    }
    rememberChatScrollPosition();
    window.clearTimeout(state.remoteExperiencePollTimer);
    state.remoteExperiencePollTimer = null;
    disconnectRemoteExperienceRfb();
    void exitExperienceTwinFullscreen();
    state.experienceTwinOpen = false;
    if (state.growthOpen) state.operationsConversationFingerprint = "";
    state.launchOpen = false;
    state.growthOpen = false;
    state.chatView = nextView;
    state.forceChatBottom = true;
    state.chatScrollPositions.delete(chatScrollKey(nextView));
    state.experienceFilter = "";
    state.renderedConversationView = "";
    renderConversationNavigation();
    renderPendingStrip();
    syncExperienceTwinVisibility();
    if (["main", "developer"].includes(nextView)) updateComposer();
    renderMessages();
    markTabRead(nextView === "experience" ? "internal_test" : "development");
    storeCurrentConversationTab();
    if (nextView === "experience" && !hasExperienceFeedback()) {
      void loadExperienceConversation({ silent: true });
    }
    if (nextView === "experience") {
      sendInternalTestTelemetry("route_view", { route: "/internal-test" });
    }
  }

  function beginTabSwipe(event) {
    if (!isCompactViewport() || event.touches?.length !== 1) return;
    const target = event.target;
    if (target?.closest?.("input, textarea, button, select, a, [contenteditable], .experience-twin-stage")) return;
    state.tabSwipeStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }

  function finishTabSwipe(event) {
    const start = state.tabSwipeStart;
    state.tabSwipeStart = null;
    if (!start || event.changedTouches?.length !== 1) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 58 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    const directDeveloperStudy = usesDirectDeveloperStudyConversation();
    const current = directDeveloperStudy
      ? (state.launchOpen ? 2 : (state.experienceTwinOpen || state.chatView === "experience") ? 1 : 0)
      : state.growthOpen ? 4 : state.launchOpen ? 3 : (state.experienceTwinOpen || state.chatView === "experience") ? 2 : state.chatView === "developer" ? 1 : 0;
    const next = Math.max(0, Math.min(directDeveloperStudy ? 2 : 4, current + (dx < 0 ? 1 : -1)));
    if (next === current) return;
    if (directDeveloperStudy) {
      if (next === 0) setChatView("developer");
      else if (next === 1) openExperienceTwin();
      else openLaunch();
      return;
    }
    if (next === 0) setChatView("main");
    else if (next === 1) setChatView("developer");
    else if (next === 2) openExperienceTwin();
    else if (next === 3) openLaunch();
    else openGrowth();
  }

  function renderConversationNavigation() {
    const directDeveloperStudy = usesDirectDeveloperStudyConversation();
    const twinActive = state.experienceTwinOpen;
    const launchActive = state.launchOpen;
    const growthActive = state.growthOpen;
    const productActive = launchActive || growthActive;
    const mainActive = !twinActive && !productActive && state.chatView === "main";
    const experienceActive = !twinActive && !productActive && state.chatView === "developer";
    const validationActive = !productActive && (twinActive || state.chatView === "experience");
    dom.conversationTabs.setAttribute("aria-label", t(directDeveloperStudy ? "conversation.study_tabs_aria" : "conversation.tabs_aria"));
    dom.mainConversationTab.hidden = directDeveloperStudy;
    dom.mainConversationTab.classList.toggle("is-active", mainActive);
    dom.mainConversationTab.setAttribute("aria-selected", String(mainActive));
    dom.experienceConversationTab.classList.toggle("is-active", experienceActive);
    dom.experienceConversationTab.setAttribute("aria-selected", String(experienceActive));
    dom.experienceTwinTab.classList.toggle("is-active", validationActive);
    dom.experienceTwinTab.setAttribute("aria-selected", String(validationActive));
    dom.launchTab?.classList.toggle("is-active", launchActive);
    dom.launchTab?.setAttribute("aria-selected", String(launchActive));
    dom.growthTab?.classList.toggle("is-active", growthActive);
    dom.growthTab?.setAttribute("aria-selected", String(growthActive));
    dom.experienceConversationCount.textContent = t("conversation.developer_hint");
    renderTabUnreadCounts();

    if (twinActive || productActive) {
      if (dom.internalTestAnalysis) dom.internalTestAnalysis.hidden = true;
      return;
    }

    if (mainActive || experienceActive) {
      dom.developerChannel.hidden = true;
      if (dom.internalTestAnalysis) dom.internalTestAnalysis.hidden = true;
      dom.chatStream.setAttribute("aria-label", t(experienceActive ? "composer.developer_target_aria" : "conversation.main_aria"));
      dom.chatStream.setAttribute("aria-labelledby", experienceActive ? "experienceConversationTab" : "mainConversationTab");
      dom.chatStream.setAttribute("aria-live", "polite");
      dom.experienceFilters.hidden = true;
      return;
    }

    dom.developerChannel.hidden = false;
    renderInternalTestAnalysis();
    applyAgentAvatar(dom.developerChannelAvatar, "internal-test", state.locale === "zh-CN" ? "测" : "T");
    dom.developerChannel.setAttribute("aria-label", t("conversation.experience_aria"));
    const phase = firstText(state.current?.phase).toUpperCase();
    const activity = state.current?.developer;
    if (phase === "EXPERIENCE") {
      dom.developerChannelTitle.textContent = t("conversation.beta_running_title");
      dom.developerChannelCopy.textContent = firstText(activity?.current, t("conversation.beta_running_copy"));
      dom.developerChannelBadge.textContent = t("conversation.in_progress");
    } else if (phase === "REVIEW") {
      dom.developerChannelTitle.textContent = t("conversation.beta_preparing_title");
      dom.developerChannelCopy.textContent = firstText(activity?.current, t("conversation.beta_preparing_copy"));
      dom.developerChannelBadge.textContent = t("conversation.in_progress");
    } else {
      dom.developerChannelTitle.textContent = t("conversation.experience_title");
      dom.developerChannelCopy.textContent = t("conversation.experience_copy");
      dom.developerChannelBadge.textContent = t("conversation.read_only");
    }
    dom.chatStream.setAttribute("aria-label", t("conversation.experience_aria"));
    dom.chatStream.setAttribute("aria-labelledby", "experienceConversationTab");
    dom.chatStream.setAttribute("aria-live", "off");
    renderExperienceFilters();
  }

  function renderInternalTestAnalysis() {
    if (!dom.internalTestAnalysis || !dom.internalTestAnalysisSummary || !dom.internalTestAnalysisTrails) return;
    const analysis = currentOperations().internalTestAnalysis || normalizeInternalTestAnalysis(null);
    const maintainer = currentOperations().testMaintainerSummary || normalizeTestMaintainerSummary(null);
    const groups = [
      [t("internal.changes"), analysis.changeSummary],
      [t("internal.cohort"), analysis.cohortCoverage],
      [t("internal.clusters"), analysis.issueClusters],
      [t("internal.personas"), analysis.affectedPersonas],
      [t("internal.replays"), analysis.fixesReplays],
    ];
    dom.internalTestAnalysisSummary.replaceChildren();
    groups.forEach(([label, values]) => {
      const section = element("section", "");
      section.append(element("strong", "", label));
      section.append(element("span", "", values.length ? values.join("; ") : t("internal.no_evidence")));
      dom.internalTestAnalysisSummary.append(section);
    });
    dom.internalTestAnalysisTrails.replaceChildren();
    const trails = analysis.rawTrails.length ? analysis.rawTrails : [t("internal.no_trails")];
    trails.forEach((trail) => dom.internalTestAnalysisTrails.append(element("li", "", trail)));
    if (dom.testMaintainerSummary) {
      const unresolved = [
        maintainer.unresolved.flaky ? t("release.maintainer_flaky") : "",
        maintainer.unresolved.quarantine ? t("release.maintainer_quarantine") : "",
        maintainer.unresolved.mutation ? t("release.maintainer_mutation") : "",
      ].filter(Boolean);
      dom.testMaintainerSummary.textContent = [
        maintainer.contractId ? `contract: ${maintainer.contractId}` : t("internal.contract_missing"),
        maintainer.results.length ? t("internal.results", { value: maintainer.results.join("; ") }) : t("internal.no_results"),
        unresolved.length ? t("internal.risks", { value: unresolved.join("; ") }) : t("internal.no_risks"),
      ].join(" · ");
    }
    const exposureKey = `${state.currentId}:${maintainer.contractId}:${analysis.issueClusters.length}`;
    if (state.internalTestExposureKey !== exposureKey) {
      state.internalTestExposureKey = exposureKey;
      sendStudyEvent("internal_test_summary_exposed", {
        subjectId: maintainer.contractId || "internal_test",
        outcome: "simulated_separate_from_operations",
      });
      sendStudyEvent("test_maintainer_summary", {
        subjectId: maintainer.contractId || "test_maintainer",
        outcome: Object.values(maintainer.unresolved).some(Boolean) ? "unresolved" : "clear",
        counts: { result_count: maintainer.results.length },
      });
    }
    dom.internalTestAnalysis.hidden = state.chatView !== "experience"
      || state.experienceTwinOpen
      || state.launchOpen
      || state.growthOpen;
  }

  function tabActivityItems(tab) {
    if (!state.current) return [];
    if (tab === "development") {
      return (state.current.messages || [])
        .filter(isDeveloperMainMessage)
        .map((message) => `message:${developerMessageId(message)}`)
        .filter(Boolean);
    }
    if (tab === "internal_test") {
      return experienceConversationMessages()
        .map((message) => `experience:${developerMessageId(message)}`)
        .filter(Boolean);
    }
    if (tab === "trial") {
      const rows = [];
      (state.current.experienceTwin?.views || []).forEach((view) => {
        const changes = arrayFrom(view?.changelog);
        [...changes].reverse().forEach((change) => rows.push(`trial:${view.id}:${String(change).slice(0, 500)}`));
      });
      return rows;
    }
    if (tab === "launch") {
      const operations = state.current.operations || normalizeOperations(null);
      const rows = [];
      arrayFrom(operations.releases).forEach((release, index) => {
        rows.push(`release:${firstText(release.id, release.candidate, release.internal_version, index)}`);
      });
      arrayFrom(operations.agentRequests)
        .filter((item) => firstText(item.kind).toLowerCase() === "deploy")
        .forEach((item, index) => rows.push(`deploy:${firstText(item.id, item.clientRequestId, index)}`));
      rows.push(`launch-guidance:${JSON.stringify({
        readiness: operations.guidance?.readiness,
        missing: arrayFrom(operations.guidance?.missingInformation).slice(0, 6),
      })}`);
      return rows;
    }
    if (tab === "growth") {
      const operations = state.current.operations || normalizeOperations(null);
      const rows = [];
      arrayFrom(operations.events).forEach((event, index) => {
        rows.push(`operation:${firstText(event.id, event.created_at, event.at, index)}:${firstText(event.title, event.type)}`);
      });
      arrayFrom(operations.messages).slice(-20).forEach((message, index) => {
        rows.push(`growth-message:${firstText(message.id, message.created_at, index)}:${firstText(message.body, message.text).slice(0, 200)}`);
      });
      if (operations.recommendation.id || operations.recommendation.title) {
        rows.push(`recommendation:${operations.recommendation.id || operations.recommendation.createdAt}:${operations.recommendation.title}`);
      }
      rows.push(`growth-metrics:${JSON.stringify({
        activeUsers: operations.metrics.activeUsers,
        monthlyActiveUsers: operations.metrics.monthlyActiveUsers,
        retention: operations.metrics.retention,
        updatedAt: operations.metrics.updatedAt,
      })}`);
      return rows;
    }
    if (tab === "operations") {
      return tabActivityItems("launch").concat(tabActivityItems("growth"));
    }
    return [];
  }

  function tabReadBucket() {
    const runId = firstText(state.current?.id, state.currentId);
    if (!runId) return null;
    const existing = state.tabReadState[runId];
    if (existing && typeof existing === "object" && !Array.isArray(existing)) return existing;
    state.tabReadState[runId] = {};
    return state.tabReadState[runId];
  }

  function unreadCountForTab(tab) {
    const items = tabActivityItems(tab);
    const bucket = tabReadBucket();
    if (!bucket) return 0;
    if (!Object.prototype.hasOwnProperty.call(bucket, tab)) {
      bucket[tab] = items.at(-1) || "";
      saveTabReadState();
      return 0;
    }
    const marker = String(bucket[tab] || "");
    if (!marker) return items.length;
    const index = items.lastIndexOf(marker);
    return index >= 0 ? Math.max(0, items.length - index - 1) : Math.min(items.length, 1);
  }

  function markTabRead(tab) {
    const bucket = tabReadBucket();
    if (!bucket) return;
    const items = tabActivityItems(tab);
    bucket[tab] = items.at(-1) || "";
    saveTabReadState();
    renderTabUnreadCounts();
    if (tab === "development") {
      void acknowledgeDevelopmentRead();
    }
    if (typeof navigator.clearAppBadge === "function") {
      const total = ["development", "internal_test", "trial", "launch", "growth"]
        .reduce((sum, name) => sum + unreadCountForTab(name), 0);
      if (!total) navigator.clearAppBadge().catch(() => {});
    }
  }

  async function acknowledgeDevelopmentRead() {
    const runId = firstText(state.current?.id, state.currentId);
    if (!runId) return;
    try {
      await request(`/apps/${encodeURIComponent(runId)}/development/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      // Read acknowledgement is best-effort and must not block the UI.
    }
  }

  function messageQuote(message) {
    const reply = message?.reply_to || message?.replyTo;
    if (!reply || typeof reply !== "object") return null;
    const rawBody = firstText(reply.body, reply.text, reply.quoted_body);
    const originalMarker = /(?:^|\n)\s*(?:用户原话|User(?:'s)? original (?:words|message)|Original user (?:words|message))\s*[：:]\s*/i;
    const marker = originalMarker.exec(rawBody);
    const embeddedUserOriginal = marker ? rawBody.slice(marker.index + marker[0].length).trim() : "";
    const userContent = Boolean(embeddedUserOriginal) || reply.user_content === true;
    const body = userContent
      ? firstText(embeddedUserOriginal, rawBody)
      : localizedFirstField(reply, ["body", "text", "quoted_body"]);
    if (!body) return null;
    return {
      messageId: firstText(reply.message_id, reply.messageId),
      body: body.slice(0, 280),
      title: firstText(reply.title, reply.quoted_title),
      userContent,
    };
  }

  function renderMessageQuote(quote) {
    const block = element("div", "message-quote");
    block.setAttribute("aria-label", t("message.reply_quote_aria"));
    const label = element("div", "message-quote-label", t("message.reply_quote_label"));
    const body = element("div", "message-quote-body", quote.body);
    if (quote.userContent) body.setAttribute("data-user-content", "");
    block.append(label, body);
    return block;
  }

  function renderTabUnreadCounts() {
    if (!state.current) return;
    const directDeveloperStudy = usesDirectDeveloperStudyConversation();
    if (directDeveloperStudy && dom.mainConversationUnread) dom.mainConversationUnread.hidden = true;
    const mappings = [
      ["development", directDeveloperStudy ? dom.experienceConversationUnread : dom.mainConversationUnread],
      ...(!directDeveloperStudy ? [["internal_test", dom.experienceConversationUnread]] : []),
      ["trial", dom.experienceTwinUnread],
      ["launch", dom.launchUnread],
      ["growth", dom.growthUnread],
    ];
    mappings.forEach(([tab, node]) => {
      if (!node) return;
      const count = unreadCountForTab(tab);
      node.textContent = count > 99 ? "99+" : String(count);
      node.hidden = count < 1;
      const unreadKey = tab === "launch" ? "launch.unread" : tab === "growth" ? "growth.unread" : "operations.unread";
      node.setAttribute("aria-label", t(unreadKey, { count }));
    });
  }

  function readAutoLaunchPreference(appId = state.currentId) {
    if (!appId) return false;
    try {
      const stored = JSON.parse(localStorage.getItem(AUTO_LAUNCH_STORAGE_KEY) || "{}");
      return Boolean(stored[String(appId)]);
    } catch {
      return false;
    }
  }

  function persistAutoLaunchPreference() {
    if (!state.currentId || !dom.launchAutoToggle) return;
    try {
      const stored = JSON.parse(localStorage.getItem(AUTO_LAUNCH_STORAGE_KEY) || "{}");
      stored[String(state.currentId)] = dom.launchAutoToggle.checked;
      localStorage.setItem(AUTO_LAUNCH_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Storage failures must not block preference updates.
    }
  }

  function renderDeveloperRepositorySummary() {
    if (!dom.developerRepositoryButton) return;
    const repository = currentRepository();
    const connected = repositoryIsConnected(repository);
    const push = currentRepositoryPush();
    const provider = firstText(repository.name, repository.provider, t("repository.title"));
    dom.developerRepositoryButton.textContent = connected && push.ready
      ? t("repository.dev_push_ready")
      : connected
        ? t("repository.dev_connected", { provider })
        : t("repository.dev_title");
    dom.developerRepositoryButton.title = push.ready
      ? firstText(push.summary, t("repository.push_ready_copy"))
      : connected
        ? t("repository.connected_copy", { branch: repository.branch || t("repository.default_branch") })
        : t("repository.dev_empty");
    dom.developerRepositoryButton.classList.toggle("is-connected", connected && !push.ready);
    dom.developerRepositoryButton.classList.toggle("is-push-ready", connected && push.ready);
  }

  async function submitRepositoryPushConfirm() {
    if (!state.currentId || state.sending) return;
    const message = dom.repositoryPushCommitInput?.value.trim() || "";
    if (!message) {
      dom.repositoryError.textContent = t("repository.push_commit_required");
      dom.repositoryError.hidden = false;
      dom.repositoryPushCommitInput?.focus();
      return;
    }
    clearRepositoryError();
    const prompt = gitSyncPrompt(message);
    closeRepositoryDialog();
    dom.messageInput.value = prompt;
    autosizeMessageInput();
    updateComposer();
    await submitMessage(prompt);
  }

  function repositoryPushCommitFilled() {
    return Boolean(dom.repositoryPushCommitInput?.value.trim());
  }

  function updateRepositoryPushButtonState() {
    if (!dom.saveRepositoryButton) return;
    const connected = repositoryIsConnected() && !state.repositoryEditing;
    if (!connected) return;
    const filled = repositoryPushCommitFilled();
    const disabled = state.repositoryBusy
      || state.repositoryCommitGenerating
      || state.sending
      || !filled;
    dom.saveRepositoryButton.disabled = disabled;
    dom.saveRepositoryButton.classList.toggle("is-ready", filled);
    const hint = !filled && !state.repositoryBusy && !state.sending
      ? t("repository.push_disabled_hint")
      : "";
    dom.saveRepositoryButton.title = "";
    if (dom.repositoryPushSubmitWrap) {
      if (hint) {
        dom.repositoryPushSubmitWrap.dataset.tooltip = hint;
        dom.repositoryPushSubmitWrap.title = hint;
        dom.repositoryPushSubmitWrap.dataset.disabledHint = "true";
      } else {
        dom.repositoryPushSubmitWrap.removeAttribute("title");
        delete dom.repositoryPushSubmitWrap.dataset.tooltip;
        delete dom.repositoryPushSubmitWrap.dataset.disabledHint;
      }
    }
  }

  function repositoryCommitMessageLooksEnglish(message) {
    const text = String(message || "").trim();
    if (!text) return false;
    const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const latin = (text.match(/[A-Za-z]/g) || []).length;
    if (cjk >= 2) return false;
    return latin >= 8;
  }

  function shouldPrefillRepositoryCommitMessage(message) {
    const text = firstText(message);
    if (!text) return false;
    if (currentLanguage() === "zh-CN" && repositoryCommitMessageLooksEnglish(text)) return false;
    return true;
  }

  function renderRepositoryCommitPanel() {
    const connected = repositoryIsConnected() && !state.repositoryEditing;
    const push = currentRepositoryPush();
    if (dom.repositoryCommitPanel) {
      dom.repositoryCommitPanel.hidden = !connected;
    }
    if (dom.repositoryIntro) {
      dom.repositoryIntro.hidden = connected;
    }
    if (dom.repositoryPushReadySection) {
      const showReady = connected && push.ready;
      dom.repositoryPushReadySection.hidden = !showReady;
      if (showReady) {
        if (dom.repositoryPushReadyCopy) {
          dom.repositoryPushReadyCopy.textContent = firstText(
            push.summary,
            t("repository.push_ready_copy")
          );
        }
        if (dom.repositoryPushFilesPreview) {
          dom.repositoryPushFilesPreview.replaceChildren();
          push.filesPreview.forEach((file) => {
            dom.repositoryPushFilesPreview.append(element("li", "", file));
          });
          dom.repositoryPushFilesPreview.hidden = !push.filesPreview.length;
        }
      }
    }
    if (dom.repositoryCommitHint) {
      const hint = connected && push.ready
        ? firstText(push.summary, t("repository.push_ready_copy"))
        : "";
      dom.repositoryCommitHint.textContent = hint;
      dom.repositoryCommitHint.hidden = !hint;
    }
    if (connected && dom.repositoryPushCommitInput && document.activeElement !== dom.repositoryPushCommitInput) {
      const current = dom.repositoryPushCommitInput.value.trim();
      if (push.commitMessage && !current && shouldPrefillRepositoryCommitMessage(push.commitMessage)) {
        dom.repositoryPushCommitInput.value = push.commitMessage;
      }
    }
    if (dom.repositoryCommitGenerateButton) {
      dom.repositoryCommitGenerateButton.textContent = state.repositoryCommitGenerating
        ? t("repository.commit_generating")
        : t("repository.commit_generate");
      const generateSupported = repositoryCommitGenerateSupported();
      dom.repositoryCommitGenerateButton.disabled =
        state.repositoryCommitGenerating
        || state.repositoryBusy
        || state.sending
        || generateSupported === false;
      dom.repositoryCommitGenerateButton.title = generateSupported === false
        ? t("repository.commit_generate_restart")
        : "";
    }
    updateRepositoryPushButtonState();
  }

  function repositoryCommitGenerateSupported() {
    const features = state.system?.api_features;
    if (!features || typeof features !== "object") return null;
    return features.repository_commit_generate === true;
  }

  async function applyRepositoryCommitGenerateFallback({ showNotice = true } = {}) {
    await refreshRepositorySnapshot();
    const push = currentRepositoryPush();
    const fallback = firstText(push?.commitMessage);
    if (!fallback || !dom.repositoryPushCommitInput) return false;
    if (!shouldPrefillRepositoryCommitMessage(fallback)) return false;
    dom.repositoryPushCommitInput.value = fallback;
    if (dom.repositoryCommitHint) {
      dom.repositoryCommitHint.textContent = firstText(push.summary, t("repository.commit_generate_fallback"));
      dom.repositoryCommitHint.hidden = false;
    }
    if (showNotice) showToast(t("repository.commit_generate_fallback"), "success", 4000);
    return true;
  }

  async function generateRepositoryCommitMessage() {
    if (!state.currentId || state.repositoryCommitGenerating || state.repositoryBusy) return;
    if (repositoryCommitGenerateSupported() === false) {
      clearRepositoryError();
      const filled = await applyRepositoryCommitGenerateFallback();
      if (!filled) {
        dom.repositoryError.textContent = t("repository.commit_generate_restart");
        dom.repositoryError.hidden = false;
      }
      renderRepositoryDialog();
      return;
    }
    state.repositoryCommitGenerating = true;
    clearRepositoryError();
    renderRepositoryDialog();
    persistRepositoryDialogSession();
    startRepositoryDialogGuard();
    try {
      const payload = await request(
        `/apps/${encodeURIComponent(state.currentId)}/repository/commit-message/generate`,
        { method: "POST", json: { locale: currentLanguage() }, timeoutMs: REPOSITORY_COMMIT_GENERATE_TIMEOUT_MS },
      );
      const message = firstText(payload?.commit_message);
      if (!message) throw new Error("empty commit message");
      if (dom.repositoryPushCommitInput) dom.repositoryPushCommitInput.value = message;
      if (dom.repositoryCommitHint) {
        dom.repositoryCommitHint.textContent = firstText(payload?.summary, t("repository.commit_generated"));
        dom.repositoryCommitHint.hidden = false;
      }
      showToast(t("repository.commit_generated"), "success", 2500);
    } catch (error) {
      const timedOut = error instanceof ApiError
        && (error.payload?.code === "request_timeout" || error.status === 0);
      if (error instanceof ApiError && error.status === 404) {
        const filled = await applyRepositoryCommitGenerateFallback({ showNotice: false });
        if (filled) {
          dom.repositoryError.textContent = t("repository.commit_generate_restart");
          dom.repositoryError.hidden = false;
          return;
        }
      }
      if (timedOut) {
        const filled = await applyRepositoryCommitGenerateFallback({ showNotice: false });
        if (filled) {
          dom.repositoryError.textContent = t("repository.commit_generate_timeout");
          dom.repositoryError.hidden = false;
          showToast(t("repository.commit_generate_timeout"), "error", 6000);
          return;
        }
      }
      dom.repositoryError.textContent = friendlyError(error, t("repository.commit_generate_failed"));
      dom.repositoryError.hidden = false;
    } finally {
      state.repositoryCommitGenerating = false;
      persistRepositoryDialogSession();
      renderRepositoryDialog();
    }
  }

  function renderRepositoryPushReadyPanel() {
    renderRepositoryCommitPanel();
  }

  function defaultGitSyncWorkflow() {
    return [
      "git status",
      "git add .",
      'git commit -m "{commit_message}"',
      "git push",
    ].join("\n");
  }

  function normalizeGitSyncWorkflow(value) {
    const text = firstText(value);
    if (!text) return defaultGitSyncWorkflow();
    return text.slice(0, 4000);
  }

  function readGitSyncWorkflow(appId = state.currentId) {
    if (!appId) return defaultGitSyncWorkflow();
    try {
      const stored = JSON.parse(localStorage.getItem(GIT_SYNC_WORKFLOW_STORAGE_KEY) || "{}");
      const workflow = firstText(stored[String(appId)]);
      return workflow ? normalizeGitSyncWorkflow(workflow) : defaultGitSyncWorkflow();
    } catch {
      return defaultGitSyncWorkflow();
    }
  }

  function writeGitSyncWorkflow(workflow, appId = state.currentId) {
    if (!appId) return;
    try {
      const stored = JSON.parse(localStorage.getItem(GIT_SYNC_WORKFLOW_STORAGE_KEY) || "{}");
      stored[String(appId)] = normalizeGitSyncWorkflow(workflow);
      localStorage.setItem(GIT_SYNC_WORKFLOW_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Storage failures must not block push usage.
    }
  }

  function buildGitSyncCommands(commitMessage = "") {
    const message = firstText(commitMessage, currentRepositoryPush().commitMessage);
    return readGitSyncWorkflow()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/\{commit_message\}/g, message))
      .join("\n");
  }

  function saveRepositorySyncWorkflow() {
    const workflow = dom.repositorySyncWorkflowInput?.value.trim() || "";
    if (!workflow) {
      dom.repositoryError.textContent = t("repository.sync_workflow_required");
      dom.repositoryError.hidden = false;
      dom.repositorySyncWorkflowInput?.focus();
      return;
    }
    clearRepositoryError();
    writeGitSyncWorkflow(workflow);
    showToast(t("repository.sync_workflow_saved"), "success", 2500);
  }

  function resetRepositorySyncWorkflow() {
    writeGitSyncWorkflow(defaultGitSyncWorkflow());
    if (dom.repositorySyncWorkflowInput) {
      dom.repositorySyncWorkflowInput.value = defaultGitSyncWorkflow();
    }
    showToast(t("repository.sync_workflow_reset_done"), "success", 2500);
  }

  function defaultGitShortcuts() {
    return [];
  }

  function gitSyncPrompt(commitMessage = "") {
    const repository = currentRepository();
    const branch = firstText(repository.branch);
    const branchHint = branch ? t("repository.push_branch_hint", { branch }) : "";
    const message = firstText(commitMessage, currentRepositoryPush().commitMessage);
    const commands = buildGitSyncCommands(message);
    return t("repository.sync_workflow_prompt", {
      message: message || t("repository.sync_message_pending"),
      branchHint,
      commands,
    });
  }

  function normalizeGitShortcut(value, index = 0) {
    const source = value && typeof value === "object" ? value : {};
    const label = firstText(source.label).slice(0, 40);
    const command = firstText(source.command).slice(0, 500);
    if (!label || !command) return null;
    const id = firstText(source.id) || `git-shortcut-${index + 1}`;
    return { id, label, command };
  }

  function readGitShortcuts(appId = state.currentId) {
    if (!appId) return defaultGitShortcuts();
    try {
      const stored = JSON.parse(localStorage.getItem(GIT_SHORTCUTS_STORAGE_KEY) || "{}");
      const items = arrayFrom(stored[String(appId)]).map(normalizeGitShortcut).filter(Boolean);
      return items.length ? items.slice(0, GIT_SHORTCUTS_MAX) : defaultGitShortcuts();
    } catch {
      return defaultGitShortcuts();
    }
  }

  function writeGitShortcuts(shortcuts, appId = state.currentId) {
    if (!appId) return;
    try {
      const stored = JSON.parse(localStorage.getItem(GIT_SHORTCUTS_STORAGE_KEY) || "{}");
      stored[String(appId)] = arrayFrom(shortcuts).map(normalizeGitShortcut).filter(Boolean).slice(0, GIT_SHORTCUTS_MAX);
      localStorage.setItem(GIT_SHORTCUTS_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Storage failures must not block shortcut usage.
    }
  }

  function gitShortcutPrompt(command) {
    return t("repository.shortcut_prompt", { command: firstText(command) });
  }

  async function submitGitShortcutPrompt(command) {
    if (!state.currentId || state.sending || !repositoryIsConnected()) return;
    closeRepositoryDialog();
    dom.messageInput.value = gitShortcutPrompt(command);
    autosizeMessageInput();
    updateComposer();
    await submitMessage(gitShortcutPrompt(command));
  }

  function toggleRepositoryShortcutsPanel() {
    state.repositoryShortcutsOpen = !state.repositoryShortcutsOpen;
    renderRepositoryGitShortcutsManager();
  }

  function renderRepositoryGitShortcutsManager() {
    if (!dom.repositoryShortcutsSection || !dom.repositoryShortcutsList) return;
    const connected = repositoryIsConnected();
    const expanded = Boolean(state.repositoryShortcutsOpen);
    dom.repositoryShortcutsSection.hidden = !connected || state.repositoryEditing || !expanded;
    if (dom.repositoryShortcutsToggleButton) {
      dom.repositoryShortcutsToggleButton.hidden = !connected || state.repositoryEditing;
      dom.repositoryShortcutsToggleButton.textContent = t(expanded
        ? "repository.shortcuts_toggle_close"
        : "repository.shortcuts_toggle");
      dom.repositoryShortcutsToggleButton.setAttribute("aria-expanded", String(expanded));
    }
    if (!connected || state.repositoryEditing || !expanded) return;
    if (dom.repositorySyncWorkflowInput && document.activeElement !== dom.repositorySyncWorkflowInput) {
      dom.repositorySyncWorkflowInput.value = readGitSyncWorkflow();
    }
    dom.repositoryShortcutsList.replaceChildren();
    readGitShortcuts().forEach((shortcut) => {
      const row = element("div", "repository-shortcut-row");
      const copy = element("div", "repository-shortcut-copy");
      copy.append(element("strong", "", shortcut.label), element("code", "", shortcut.command));
      const actions = element("div", "repository-shortcut-actions");
      const run = element("button", "secondary-button repository-shortcut-run", t("repository.shortcut_run"));
      run.type = "button";
      run.disabled = state.sending;
      run.addEventListener("click", () => void submitGitShortcutPrompt(shortcut.command));
      const remove = element("button", "text-button repository-shortcut-remove", t("repository.shortcut_remove"));
      remove.type = "button";
      remove.addEventListener("click", () => {
        writeGitShortcuts(readGitShortcuts().filter((item) => item.id !== shortcut.id));
        renderRepositoryGitShortcutsManager();
        showToast(t("repository.shortcut_removed"), "success", 2500);
      });
      actions.append(run, remove);
      row.append(copy, actions);
      dom.repositoryShortcutsList.append(row);
    });
  }

  function addRepositoryGitShortcut() {
    const label = dom.repositoryShortcutLabelInput?.value.trim() || "";
    const command = dom.repositoryShortcutCommandInput?.value.trim() || "";
    if (!label) {
      dom.repositoryError.textContent = t("repository.shortcut_label_required");
      dom.repositoryError.hidden = false;
      dom.repositoryShortcutLabelInput?.focus();
      return;
    }
    if (!command) {
      dom.repositoryError.textContent = t("repository.shortcut_command_required");
      dom.repositoryError.hidden = false;
      dom.repositoryShortcutCommandInput?.focus();
      return;
    }
    const shortcuts = readGitShortcuts();
    if (shortcuts.length >= GIT_SHORTCUTS_MAX) {
      dom.repositoryError.textContent = t("repository.shortcut_limit");
      dom.repositoryError.hidden = false;
      return;
    }
    clearRepositoryError();
    shortcuts.push({
      id: `git-shortcut-${Date.now()}`,
      label: label.slice(0, 40),
      command: command.slice(0, 500),
    });
    writeGitShortcuts(shortcuts);
    if (dom.repositoryShortcutLabelInput) dom.repositoryShortcutLabelInput.value = "";
    if (dom.repositoryShortcutCommandInput) dom.repositoryShortcutCommandInput.value = "";
    renderRepositoryGitShortcutsManager();
    showToast(t("repository.shortcut_saved"), "success", 2500);
  }

  function resetRepositoryGitShortcuts() {
    resetRepositoryGitShortcutsToSamples();
  }

  function resetRepositoryGitShortcutsToSamples() {
    writeGitShortcuts([
      { id: "git-status", label: "git status", command: "git status" },
      { id: "git-add-all", label: "git add .", command: "git add ." },
      { id: "git-commit", label: "git commit", command: "git commit" },
    ]);
    renderRepositoryGitShortcutsManager();
    showToast(t("repository.shortcuts_reset_done"), "success", 2500);
  }

  function renderOperations() {
    if (!state.current) return;
    syncOperationsSkillGenerationFromOperations(state.current.operations || normalizeOperations(null));
    if (state.growthOpen) maybeAutoGenerateOperationsSkillDrafts(state.current.operations || normalizeOperations(null));
    if (state.launchOpen) renderLaunch();
    if (state.growthOpen) renderGrowth();
  }

  function renderLaunch() {
    if (!state.current || !dom.launchPage) return;
    const operations = state.current.operations || normalizeOperations(null);
    const releases = operations.releases;
    const release = releases.at(-1) || null;
    const status = firstText(state.current.status).toLowerCase();
    const phase = firstText(state.current.phase).toUpperCase();
    const ready = Boolean(release) || ["delivered", "delivered_listening"].includes(status) || phase === "DELIVERED";

    renderOperationsSkills(operations);
    renderLaunchChecklist(operations);
    renderReleaseReview(operations);
    if (dom.launchAutoToggle) {
      const policyEnabled = operations.launchAutoPolicy?.enabled;
      dom.launchAutoToggle.checked = typeof policyEnabled === "boolean"
        ? policyEnabled
        : readAutoLaunchPreference();
    }

    dom.operationsVersion.textContent = release
      ? firstText(release.label, release.display_name, release.internal_version, t("operations.version_empty"))
      : t("operations.version_empty");
    dom.operationsVersionCopy.textContent = release
      ? firstText(release.feature, arrayFrom(release.changes)[0], t("operations.version_copy"))
      : t("operations.version_copy");

    const deployBusy = state.sending;
    dom.operationsDeployButton.disabled = deployBusy;
    dom.operationsDeployButton.textContent = deployBusy
      ? (state.locale === "zh-CN" ? "上线中…" : "Deploying…")
      : t("operations.deploy");

    const missingInformation = operations.guidance?.missingInformation || [];
    dom.operationsReleaseTitle.textContent = t(ready ? "operations.release_ready" : "operations.release_in_progress");
    dom.operationsReleaseCopy.textContent = missingInformation.length
      ? missingInformation.slice(0, 2).join("；")
      : t(ready ? "operations.release_ready_copy" : "operations.release_in_progress_copy");

    const history = [
      ...releases.map((item) => ({
        at: firstText(item.published_at, item.created_at),
        title: firstText(item.label, item.display_name, item.internal_version, t("operations.version")),
        body: firstText(item.feature, arrayFrom(item.changes)[0]),
      })),
      ...operations.events
        .filter((item) => ["release", "deploy", "version"].includes(firstText(item.type).toLowerCase()))
        .map((item) => ({
        at: firstText(item.created_at, item.at, item.updated_at),
        title: firstText(item.title, item.label, item.type),
        body: firstText(item.body, item.summary, item.reason),
      })),
    ].filter((item) => item.title).sort((left, right) => (Date.parse(right.at) || 0) - (Date.parse(left.at) || 0));
    dom.operationsHistoryCount.textContent = String(history.length);
    dom.operationsHistoryList.replaceChildren();
    if (!history.length) {
      dom.operationsHistoryList.append(element("li", "is-empty", t("operations.history_empty")));
    } else {
      history.slice(0, 30).forEach((item) => {
        const row = element("li", "");
        row.append(element("strong", "", item.title));
        if (item.body) row.append(element("span", "", item.body));
        if (item.at) row.append(element("time", "", formatRelativeTime(item.at)));
        dom.operationsHistoryList.append(row);
      });
    }
  }

  function readGrowthToolsOpenPreference(appId = state.currentId) {
    if (!appId) return false;
    try {
      const stored = JSON.parse(localStorage.getItem(GROWTH_TOOLS_STORAGE_KEY) || "{}");
      return Boolean(stored[String(appId)]);
    } catch {
      return false;
    }
  }

  function persistGrowthToolsOpenPreference() {
    if (!state.currentId) return;
    try {
      const stored = JSON.parse(localStorage.getItem(GROWTH_TOOLS_STORAGE_KEY) || "{}");
      stored[String(state.currentId)] = state.growthToolsOpen;
      localStorage.setItem(GROWTH_TOOLS_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Storage failures must not block panel toggles.
    }
  }

  function syncGrowthToolsPanel() {
    if (!dom.growthPage) return;
    // Operations tab always presents the dashboard directly; there is no toggle
    // and the operations conversation is folded into the App-management chat tab.
    const visible = Boolean(state.growthOpen);
    dom.growthPage.hidden = !visible;
    if (dom.chatStream && state.growthOpen) {
      dom.chatStream.hidden = true;
    }
    if (dom.growthToolsToggle) {
      dom.growthToolsToggle.hidden = true;
    }
  }

  function setGrowthToolsOpen(open, { persist = true } = {}) {
    state.growthToolsOpen = Boolean(open);
    if (persist) persistGrowthToolsOpenPreference();
    syncGrowthToolsPanel();
    if (state.growthOpen && state.current?.operations) {
      updateGrowthToolsAttention(state.current.operations);
      if (!state.growthToolsOpen) {
        state.operationsConversationFingerprint = "";
        renderOperationsConversation(state.current.operations);
      }
    }
  }

  function toggleGrowthToolsPanel() {
    setGrowthToolsOpen(!state.growthToolsOpen);
  }

  function updateGrowthToolsAttention(operations) {
    if (!dom.growthToolsToggle || !operations) return;
    const hasMetrics = Object.values(operations.metricRecords).some((item) => item.status === "available");
    const agent = operations.operationsAgent;
    const needsAttention = !hasMetrics
      || agent.status === "error"
      || agent.status === "waiting_for_configuration";
    dom.growthToolsToggle.classList.toggle("has-attention", needsAttention && !state.growthToolsOpen);
  }

  function renderGrowth() {
    if (!state.current || !dom.growthPage) return;
    const operations = state.current.operations || normalizeOperations(null);
    renderOperationsSkills(operations);
    renderFeedbackActivation(operations);
    renderAnalyticsActivation(operations);
    renderTrafficActivation(operations);
    renderFeedbackPanel(operations);
    renderOperationsDashboard(operations);
    renderOperationsTrafficPanel(operations);
    renderOperationsConversation(operations);
    updateGrowthToolsAttention(operations);
    syncGrowthToolsPanel();
  }

  function currentRepository() {
    return state.current?.operations?.repository || normalizeOperations(null).repository;
  }

  function currentOperations() {
    return state.current?.operations || state.operations || normalizeOperations(null);
  }

  function operationsConversationFingerprint(messages) {
    return arrayFrom(messages).slice(-40).map((message) => [
      firstText(message.id),
      firstText(message.created_at, message.at),
      firstText(message.actor, message.role),
      firstText(message.body, message.text),
      String(arrayFrom(message.attachments).length),
    ].join(":")).join("|");
  }

  function normalizeOperationsChatMessage(message) {
    const actor = firstText(message?.actor, message?.role).toLowerCase();
    const self = actor === "user";
    const body = firstText(message?.body, message?.text);
    const reply = message?.reply_to || message?.replyTo;
    return {
      ...message,
      _operations_chat: true,
      actor: self ? "user" : "operations",
      direction: self ? "inbound" : "outbound",
      body,
      text: body,
      at: firstText(message?.at, message?.created_at),
      reply_to: reply && typeof reply === "object" ? reply : undefined,
    };
  }

  function renderOperationsConversation(operations) {
    if (!state.growthOpen || !dom.chatStream || state.growthToolsOpen) return;
    const stream = dom.chatStream;
    const messages = arrayFrom(operations.messages).slice(-40);
    const fingerprint = operationsConversationFingerprint(messages);
    if (fingerprint === state.operationsConversationFingerprint) return;
    state.operationsConversationFingerprint = fingerprint;

    const stickToBottom = state.operationsConversationStickToBottom || chatStreamNearBottom(stream, 80);
    state.operationsConversationStickToBottom = false;
    const previousScrollTop = stream.scrollTop;
    const previousScrollHeight = stream.scrollHeight;

    stream.replaceChildren();
    if (!messages.length) {
      const empty = element("div", "empty-chat");
      empty.append(
        element("div", "empty-symbol", "营"),
        element("h3", "", t("operations.conversation_title")),
        element("p", "", t("growth.conversation_copy"))
      );
      stream.append(empty);
      return;
    }
    messages.forEach((message) => {
      stream.append(renderMessage(normalizeOperationsChatMessage(message)));
    });
    if (stickToBottom) {
      stream.scrollTop = stream.scrollHeight;
      return;
    }
    const heightDelta = stream.scrollHeight - previousScrollHeight;
    stream.scrollTop = Math.max(0, previousScrollTop + heightDelta);
  }

  async function submitOperationsRequest(kind, text = "", { attachmentIds = [] } = {}) {
    if (!state.currentId || state.operationsLoading) return;
    state.operationsLoading = true;
    if (dom.sendButton) dom.sendButton.disabled = true;
    if (dom.composerAttachButton) dom.composerAttachButton.disabled = true;
    if (dom.operationsDeployButton) dom.operationsDeployButton.disabled = true;
    try {
      const payload = {
        kind,
        text,
        client_request_id: createClientRequestId(),
      };
      if (attachmentIds.length) payload.attachment_ids = attachmentIds;
      const response = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/request`, {
        method: "POST",
        json: payload,
      });
      const normalized = mergeOperationsState(state.current?.operations, response);
      state.operations = normalized;
      state.current.operations = normalized;
      if (state.growthOpen && state.growthToolsOpen && kind === "chat") {
        state.operationsConversationStickToBottom = true;
        setGrowthToolsOpen(false);
      }
      renderOperations();
      let toastKey = kind === "deploy"
        ? (state.locale === "zh-CN" ? "上线请求已发送给运营智能体。" : "Deploy request sent to the operations agent.")
        : (state.locale === "zh-CN" ? "消息已发送给运营智能体。" : "Message sent to the operations agent.");
      if (kind === "deploy") {
        toastKey = state.locale === "zh-CN"
          ? "上线请求已发送给研发智能体。"
          : "Deploy request sent to the developer agent.";
      }
      showToast(toastKey, "success", 3500);
    } catch (error) {
      showToast(friendlyError(error, state.locale === "zh-CN" ? "运营请求发送失败。" : "Could not send the operations request."), "error", 6000);
    } finally {
      state.operationsLoading = false;
      if (dom.sendButton) dom.sendButton.disabled = false;
      if (dom.composerAttachButton) dom.composerAttachButton.disabled = false;
      if (dom.operationsDeployButton) dom.operationsDeployButton.disabled = false;
      updateComposer();
    }
  }

  function closeProjectSecretsDialog() {
    if (dom.projectAgnesApiKeyInput) dom.projectAgnesApiKeyInput.value = "";
    closeDialog(dom.projectSecretsDialog);
  }

  function renderProjectSecretStatus(status) {
    const configured = Boolean(status?.configured?.AGNES_API_KEY);
    if (dom.projectSecretsDialog) dom.projectSecretsDialog.dataset.agnesConfigured = configured ? "true" : "false";
    if (dom.projectAgnesApiKeyStatus) {
      dom.projectAgnesApiKeyStatus.textContent = t(configured ? "project_secrets.agnes_configured" : "project_secrets.agnes_missing");
      dom.projectAgnesApiKeyStatus.classList.toggle("is-configured", configured);
    }
    if (dom.projectAgnesApiKeyInput) {
      dom.projectAgnesApiKeyInput.value = "";
      dom.projectAgnesApiKeyInput.required = !configured;
    }
  }

  async function openProjectSecretsDialog() {
    if (!state.currentId || !dom.projectSecretsDialog) return;
    if (dom.projectSecretsError) dom.projectSecretsError.hidden = true;
    renderProjectSecretStatus(null);
    if (typeof dom.projectSecretsDialog.showModal === "function") dom.projectSecretsDialog.showModal();
    else dom.projectSecretsDialog.setAttribute("open", "");
    try {
      const status = await request(`/apps/${encodeURIComponent(state.currentId)}/private-secrets`);
      renderProjectSecretStatus(status);
    } catch (error) {
      if (dom.projectSecretsError) {
        dom.projectSecretsError.textContent = friendlyError(error, t("project_secrets.load_failed"));
        dom.projectSecretsError.hidden = false;
      }
    }
  }

  async function saveProjectSecrets() {
    if (!state.currentId || !dom.projectSecretsDialog || !dom.projectAgnesApiKeyInput) return;
    const value = dom.projectAgnesApiKeyInput.value.trim();
    const alreadyConfigured = dom.projectSecretsDialog.dataset.agnesConfigured === "true";
    if (!value && alreadyConfigured) {
      closeProjectSecretsDialog();
      return;
    }
    if (!value) {
      dom.projectAgnesApiKeyInput.focus();
      return;
    }
    if (dom.projectSecretsError) dom.projectSecretsError.hidden = true;
    if (dom.saveProjectSecretsButton) dom.saveProjectSecretsButton.disabled = true;
    try {
      const status = await request(`/apps/${encodeURIComponent(state.currentId)}/private-secrets`, {
        method: "POST",
        json: { secrets: { AGNES_API_KEY: value } },
        timeoutMs: 90_000,
      });
      renderProjectSecretStatus(status);
      closeProjectSecretsDialog();
      showToast(t("project_secrets.saved"), "success", 5000);
    } catch (error) {
      if (dom.projectSecretsError) {
        dom.projectSecretsError.textContent = friendlyError(error, t("project_secrets.save_failed"));
        dom.projectSecretsError.hidden = false;
      }
    } finally {
      if (dom.saveProjectSecretsButton) dom.saveProjectSecretsButton.disabled = false;
      if (dom.projectAgnesApiKeyInput) dom.projectAgnesApiKeyInput.value = "";
    }
  }

  async function submitOperationsDeploy() {
    if (!state.current || state.sending) return;
    const review = currentOperations().releaseReview;
    if (review?.items?.length && (review.gate !== "ready" || !review.attestationAccepted)) {
      showToast(t("release.deploy_blocked"), "error", 6000);
      renderReleaseReview(currentOperations());
      dom.releaseReviewPanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    try {
      const secretStatus = await request(`/apps/${encodeURIComponent(state.currentId)}/private-secrets`);
      if (!secretStatus?.ready) {
        showToast(t("project_secrets.required_before_deploy"), "error", 6000);
        await openProjectSecretsDialog();
        return;
      }
    } catch (error) {
      showToast(friendlyError(error, t("project_secrets.load_failed")), "error", 6000);
      return;
    }
    await submitOperationsRequest("deploy", t("operations.action_deploy"));
  }

  async function mergeOperationsResponse(response) {
    const normalized = mergeOperationsState(state.current?.operations, response);
    state.operations = normalized;
    if (state.current) state.current.operations = normalized;
    renderOperations();
    return normalized;
  }

  async function persistLaunchAutoPolicy() {
    if (!state.currentId || !dom.launchAutoToggle) return;
    const enabled = dom.launchAutoToggle.checked;
    readAutoLaunchPreference();
    try {
      const stored = JSON.parse(localStorage.getItem(AUTO_LAUNCH_STORAGE_KEY) || "{}");
      stored[String(state.currentId)] = enabled;
      localStorage.setItem(AUTO_LAUNCH_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Storage failures must not block preference updates.
    }
    try {
      const response = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/launch-auto-policy`, {
        method: "POST",
        json: { enabled, locale: state.locale },
      });
      await mergeOperationsResponse(response);
    } catch (error) {
      showToast(friendlyError(error, state.locale === "zh-CN" ? "自动上线策略保存失败。" : "Could not save auto-launch policy."), "error", 5000);
    }
  }

  async function toggleReleaseReviewItem(itemId, checked, options = {}) {
    if (!state.currentId || state.releaseReviewBusy || !itemId) return;
    state.releaseReviewBusy = true;
    // Disable the remaining checkboxes immediately. The change handler is
    // intentionally fire-and-forget, so without this render a participant can
    // click another item while the first request is pending; that second click
    // is then silently ignored by the busy guard.
    renderReleaseReview(currentOperationsSnapshot() || normalizeOperations(null));
    try {
      const payload = {
        item_id: itemId,
        checked,
        locale: state.locale,
      };
      if (options.ownerVerdict) payload.owner_verdict = options.ownerVerdict;
      if (options.failNote) payload.fail_note = options.failNote;
      const response = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/release-review/item`, {
        method: "POST",
        json: payload,
      });
      await mergeOperationsResponse(response);
      sendStudyEvent("owner_self_verify_item_verdict", {
        subjectId: itemId,
        outcome: options.ownerVerdict || (checked ? "passed" : "unverified"),
      });
    } catch (error) {
      showToast(friendlyError(error, state.locale === "zh-CN" ? "审查项更新失败。" : "Could not update review item."), "error", 5000);
    } finally {
      state.releaseReviewBusy = false;
      renderReleaseReview(currentOperationsSnapshot() || normalizeOperations(null));
    }
  }

  function hideReleaseVerifyBubble() {
    stopReleaseVerifyEngagement();
    state.releaseVerifyTriedSurfaces = [];
    const bubble = document.getElementById("experienceTwinVerifyBubble") || dom.experienceTwinVerifyBubble;
    if (bubble) {
      bubble.dataset.releaseVerifyActive = "0";
      bubble.hidden = true;
    }
    const hint = document.getElementById("experienceTwinVerifySurfaceHint") || dom.experienceTwinVerifySurfaceHint;
    if (hint) hint.hidden = true;
    syncReleaseVerifySurfaceNudge();
  }

  function ensureReleaseVerifyBubbleHost() {
    const bubble = document.getElementById("experienceTwinVerifyBubble") || dom.experienceTwinVerifyBubble;
    if (!bubble) return null;
    const stage = document.getElementById("experienceTwinStage");
    const preview = stage?.parentElement;
    if (preview && (bubble.parentElement !== preview || preview.firstElementChild !== bubble)) {
      preview.insertBefore(bubble, preview.firstElementChild);
    }
    dom.experienceTwinVerifyBubble = bubble;
    const copy = document.getElementById("experienceTwinVerifyCopy");
    const done = document.getElementById("experienceTwinVerifyDone");
    if (copy) dom.experienceTwinVerifyCopy = copy;
    if (done) {
      dom.experienceTwinVerifyDone = done;
      if (done.dataset.releaseVerifyBound !== "1") {
        done.dataset.releaseVerifyBound = "1";
        done.addEventListener("click", () => finishReleaseVerifyDone());
      }
    }
    return bubble;
  }

  function encodeOwnerTrialSeed(seed) {
    const records = Array.isArray(seed?.records) ? seed.records.slice(0, 8) : [];
    const payload = {
      version: records.length ? 2 : 1,
      ensure_logs: Math.max(0, Math.min(8, Number(seed?.ensureCount ?? seed?.ensureLogs ?? 0) || 0)),
      ensure_count: Math.max(0, Math.min(8, Number(seed?.ensureCount ?? seed?.ensureLogs ?? 0) || 0)),
      focus_id: firstText(seed?.focusId),
      storage_key: firstText(seed?.storageKey, "hydration_app_v1"),
      list_key: firstText(seed?.listKey),
      records,
      needs_prep: Boolean(seed?.needsPrep || records.length),
    };
    try {
      const json = JSON.stringify(payload);
      const bytes = new TextEncoder().encode(json);
      let binary = "";
      bytes.forEach((value) => { binary += String.fromCharCode(value); });
      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    } catch (_error) {
      return "";
    }
  }

  function showReleaseVerifyBubble(item) {
    const bubble = ensureReleaseVerifyBubbleHost();
    const copy = document.getElementById("experienceTwinVerifyCopy") || dom.experienceTwinVerifyCopy;
    const done = document.getElementById("experienceTwinVerifyDone") || dom.experienceTwinVerifyDone;
    if (!bubble || !copy) return;
    const title = firstText(item?.title, t("release.verify_verdict_title"));
    const howto = firstText(item?.verifyHowto, item?.description);
    copy.textContent = howto
      ? `${t("release.verify_prompt", { title })}\n${howto}`
      : t("release.verify_prompt", { title });
    if (done) {
      done.textContent = t("release.verify_done");
      done.hidden = false;
    }
    const hint = document.getElementById("experienceTwinVerifySurfaceHint") || dom.experienceTwinVerifySurfaceHint;
    if (hint) {
      hint.textContent = t("release.verify_surface_hint");
      hint.hidden = false;
    }
    bubble.dataset.releaseVerifyActive = "1";
    bubble.hidden = false;
    startReleaseVerifyEngagement(item?.id);
    syncReleaseVerifySurfaceNudge();
  }

  function closeReleaseVerifyVerdictDialog() {
    if (dom.releaseVerifyFailNote) dom.releaseVerifyFailNote.value = "";
    if (typeof dom.releaseVerifyVerdictDialog?.close === "function") {
      dom.releaseVerifyVerdictDialog.close();
    } else if (dom.releaseVerifyVerdictDialog) {
      dom.releaseVerifyVerdictDialog.hidden = true;
    }
  }

  function openReleaseVerifyVerdictDialog(item) {
    if (!dom.releaseVerifyVerdictDialog) return;
    if (dom.releaseVerifyVerdictItem) {
      const lines = [firstText(item?.title), firstText(item?.description)].filter(Boolean);
      dom.releaseVerifyVerdictItem.textContent = lines.join("\n");
    }
    if (dom.releaseVerifyFailNote) dom.releaseVerifyFailNote.value = "";
    if (typeof dom.releaseVerifyVerdictDialog.showModal === "function") {
      dom.releaseVerifyVerdictDialog.showModal();
    } else {
      dom.releaseVerifyVerdictDialog.hidden = false;
    }
  }

  function releaseVerifySurfaceKey(view = activeExperienceTwinView()) {
    const kind = experienceTwinViewKind(view);
    return kind === "desktop_web" || kind === "mobile_web" ? kind : "";
  }

  function releaseVerifyRequiredSurfaces() {
    return new Set(
      (state.experienceTwin?.views || [])
        .map((view) => releaseVerifySurfaceKey(view))
        .filter((kind) => kind === "desktop_web" || kind === "mobile_web")
    );
  }

  function releaseVerifyBothSurfacesTried() {
    const required = releaseVerifyRequiredSurfaces();
    if (required.size < 2) return true;
    const tried = new Set(state.releaseVerifyTriedSurfaces || []);
    return [...required].every((kind) => tried.has(kind));
  }

  function noteReleaseVerifySurface(view = activeExperienceTwinView()) {
    if (!state.releaseVerifyPending || !state.releaseVerifyEngagement?.startedAt) return;
    if (!state.remoteExperienceConnected && !experienceTwinWebPreviewUrl(view)) return;
    const key = releaseVerifySurfaceKey(view);
    if (!key) return;
    const tried = new Set(state.releaseVerifyTriedSurfaces || []);
    tried.add(key);
    state.releaseVerifyTriedSurfaces = Array.from(tried);
    syncReleaseVerifyDoneButton();
    syncReleaseVerifySurfaceNudge();
  }

  function syncReleaseVerifySurfaceNudge() {
    const active = Boolean(state.releaseVerifyPending && state.releaseVerifyEngagement?.startedAt);
    const tried = new Set(state.releaseVerifyTriedSurfaces || []);
    const required = releaseVerifyRequiredSurfaces();
    const needNudge = active && required.size >= 2;
    dom.experienceTwinViews?.querySelectorAll(".experience-twin-view").forEach((button) => {
      const kind = button.dataset.surfaceKind || "";
      button.classList.toggle("needs-surface-trial", needNudge && required.has(kind) && !tried.has(kind));
    });
  }

  function releaseVerifyEngagementSatisfied() {
    const engagement = state.releaseVerifyEngagement;
    if (!engagement?.startedAt) return false;
    if (Number(engagement.ops || 0) >= RELEASE_VERIFY_MIN_OPERATIONS) return true;
    return (Date.now() - Number(engagement.startedAt || 0)) >= RELEASE_VERIFY_MIN_DWELL_MS;
  }

  function releaseVerifyReady() {
    return releaseVerifyEngagementSatisfied() && releaseVerifyBothSurfacesTried();
  }

  function releaseVerifyBlockReason() {
    if (!releaseVerifyBothSurfacesTried()) return t("release.verify_need_both_surfaces");
    if (!releaseVerifyEngagementSatisfied()) return t("release.verify_need_trial");
    return "";
  }

  function syncReleaseVerifyDoneButton() {
    const done = document.getElementById("experienceTwinVerifyDone") || dom.experienceTwinVerifyDone;
    if (!done) return;
    const ready = releaseVerifyReady();
    done.disabled = false;
    done.classList.toggle("is-locked", !ready);
    done.setAttribute("aria-disabled", ready ? "false" : "true");
    done.title = ready ? "" : releaseVerifyBlockReason();
  }

  function noteReleaseVerifyOperation() {
    if (!state.releaseVerifyPending || !state.releaseVerifyEngagement?.startedAt) return;
    state.releaseVerifyEngagement.ops = Number(state.releaseVerifyEngagement.ops || 0) + 1;
    syncReleaseVerifyDoneButton();
  }

  function ensureReleaseVerifyEngagementListeners() {
    if (state.releaseVerifyEngagementBound) return;
    const stage = document.getElementById("experienceTwinStage") || dom.experienceTwinStage;
    if (!stage) return;
    const mark = () => noteReleaseVerifyOperation();
    stage.addEventListener("pointerdown", mark, true);
    stage.addEventListener("keydown", mark, true);
    state.releaseVerifyEngagementBound = true;
  }

  function startReleaseVerifyEngagement(itemId) {
    const currentId = firstText(itemId);
    if (
      state.releaseVerifyEngagement?.startedAt
      && firstText(state.releaseVerifyEngagement.itemId) === currentId
    ) {
      syncReleaseVerifyDoneButton();
      syncReleaseVerifySurfaceNudge();
      return;
    }
    state.releaseVerifyTriedSurfaces = [];
    if (state.releaseVerifyEngagement?.dwellTimer) {
      window.clearInterval(state.releaseVerifyEngagement.dwellTimer);
    }
    state.releaseVerifyEngagement = {
      itemId: currentId,
      ops: 0,
      startedAt: Date.now(),
      dwellTimer: window.setInterval(syncReleaseVerifyDoneButton, 1_000),
    };
    ensureReleaseVerifyEngagementListeners();
    if (state.remoteExperienceConnected) noteReleaseVerifySurface();
    syncReleaseVerifyDoneButton();
    syncReleaseVerifySurfaceNudge();
  }

  function stopReleaseVerifyEngagement() {
    if (state.releaseVerifyEngagement?.dwellTimer) {
      window.clearInterval(state.releaseVerifyEngagement.dwellTimer);
    }
    state.releaseVerifyEngagement = { itemId: "", ops: 0, startedAt: 0, dwellTimer: 0 };
  }

  function finishReleaseVerifyDone() {
    const blocked = releaseVerifyBlockReason();
    if (blocked) {
      showToast(blocked, "error", 7_000);
      syncReleaseVerifySurfaceNudge();
      return;
    }
    const pending = state.releaseVerifyPending;
    hideReleaseVerifyBubble();
    openLaunch();
    window.setTimeout(() => {
      const review = currentOperations()?.releaseReview;
      const item = arrayFrom(review?.items).find((row) => row.id === pending?.id) || pending;
      if (item) openReleaseVerifyVerdictDialog(item);
      dom.releaseReviewPanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
  }

  async function submitReleaseVerifyVerdict(verdict) {
    const pending = state.releaseVerifyPending;
    if (!pending?.id || !["passed", "failed"].includes(verdict)) return;
    const failNote = verdict === "failed" ? (dom.releaseVerifyFailNote?.value.trim() || "") : "";
    closeReleaseVerifyVerdictDialog();
    state.releaseVerifyPending = null;
    await toggleReleaseReviewItem(pending.id, verdict === "passed", {
      ownerVerdict: verdict,
      failNote,
    });
  }

  async function startReleaseItemVerify(item) {
    if (!item?.id || item.controlKind === "switch") return;
    state.releaseVerifyPending = {
      id: item.id,
      title: item.title,
      description: firstText(item.verifyHowto, item.description),
      verifyHowto: firstText(item.verifyHowto, item.description),
      trialSeed: item.trialSeed || null,
    };
    sendStudyEvent("owner_self_verify_item_started", {
      subjectId: item.id,
      outcome: "unverified",
    });
    openExperienceTwin();
    // Re-show after the twin page paints; study status polling must not clear it.
    showReleaseVerifyBubble(item);
    window.requestAnimationFrame(() => showReleaseVerifyBubble(item));
    window.setTimeout(() => showReleaseVerifyBubble(item), 80);
    window.setTimeout(() => showReleaseVerifyBubble(item), 320);
    if (item.scenarioId) {
      await openReleaseReviewGuide(item);
      showReleaseVerifyBubble(item);
    } else {
      openPlainReleaseReviewRoute(firstText(item.guideRoute, "/"), item.trialSeed);
      showReleaseVerifyBubble(item);
    }
  }

  async function confirmReleaseReview() {
    if (!state.currentId || state.releaseReviewBusy) return;
    const attestation = dom.releaseReviewAttestationInput?.value.trim() || "";
    state.releaseReviewBusy = true;
    try {
      const response = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/release-review/confirm`, {
        method: "POST",
        json: { attestation, locale: state.locale },
      });
      await mergeOperationsResponse(response);
      showToast(t("release.confirm_done"), "success", 4000);
    } catch (error) {
      showToast(friendlyError(error, state.locale === "zh-CN" ? "发布审查确认失败。" : "Could not confirm release review."), "error", 6000);
    } finally {
      state.releaseReviewBusy = false;
    }
  }

  function finalVerdictLockKey() {
    const review = currentOperations()?.releaseReview || {};
    return `applooper:final-verdict-locked:v2:${state.currentId || ""}:${review.candidateVersionId || ""}`;
  }

  function isFinalVerdictLocked() {
    const key = finalVerdictLockKey();
    if (state.finalVerdictLockedKey === key) return true;
    try {
      return sessionStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  }

  function lockFinalVerdictButtons() {
    const key = finalVerdictLockKey();
    state.finalVerdictLockedKey = key;
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      // Keep the in-memory lock even if storage is unavailable.
    }
    if (dom.releaseFinalPassButton) dom.releaseFinalPassButton.disabled = true;
    if (dom.releaseFinalFailButton) dom.releaseFinalFailButton.disabled = true;
  }

  function finalVerdictConfirmSeconds() {
    return 5;
  }

  function confirmFinalReleaseVerdict(choiceLabel) {
    return new Promise((resolve) => {
      const dialog = dom.releaseFinalConfirmDialog;
      const copy = String(choiceLabel || "").trim();
      if (!dialog) {
        resolve(window.confirm(t("release.final_confirm_copy", { choice: copy })));
        return;
      }
      if (dom.releaseFinalConfirmTitle) {
        dom.releaseFinalConfirmTitle.textContent = t("release.final_confirm_title");
      }
      if (dom.releaseFinalConfirmCopy) {
        dom.releaseFinalConfirmCopy.textContent = t("release.final_confirm_copy");
      }
      if (dom.releaseFinalConfirmChoice) {
        dom.releaseFinalConfirmChoice.textContent = copy;
      }
      let remaining = finalVerdictConfirmSeconds();
      let timer = null;
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        if (timer) window.clearInterval(timer);
        closeDialog(dialog);
        resolve(ok);
      };
      const render = () => {
        if (dom.releaseFinalConfirmCountNum) {
          dom.releaseFinalConfirmCountNum.textContent = String(Math.max(remaining, 0));
        }
        if (dom.releaseFinalConfirmCountdown) {
          dom.releaseFinalConfirmCountdown.textContent = remaining > 0
            ? t("release.final_confirm_countdown", { n: remaining })
            : t("release.final_confirm_ready");
        }
        if (dom.releaseFinalConfirmButton) {
          dom.releaseFinalConfirmButton.disabled = remaining > 0;
          dom.releaseFinalConfirmButton.textContent = t("release.final_confirm_ok");
        }
        if (dom.releaseFinalThinkButton) {
          dom.releaseFinalThinkButton.textContent = t("release.final_confirm_think");
        }
      };
      if (dom.releaseFinalThinkButton) {
        dom.releaseFinalThinkButton.onclick = () => finish(false);
      }
      if (dom.releaseFinalConfirmButton) {
        dom.releaseFinalConfirmButton.onclick = () => {
          if (dom.releaseFinalConfirmButton.disabled) return;
          finish(true);
        };
      }
      dialog.oncancel = (event) => {
        event.preventDefault();
        finish(false);
      };
      showDialog(dialog);
      render();
      timer = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          remaining = 0;
          window.clearInterval(timer);
          timer = null;
        }
        render();
      }, 1000);
    });
  }

  function finalReleaseVerdictBlockCopy() {
    const review = currentOperations()?.releaseReview || normalizeReleaseReview(null);
    const hasItems = Array.isArray(review?.items) && review.items.length > 0;
    if (!hasItems || state.operationsRefreshing) return t("release.items_loading");
    return t("release.final_verdict_hint");
  }

  function finalReleaseVerdictReady(kind) {
    const review = currentOperations()?.releaseReview || normalizeReleaseReview(null);
    const hasItems = Array.isArray(review?.items) && review.items.length > 0;
    if (!hasItems || !releaseReviewAllRequiredVerdicted(review)) return false;
    if (kind === "pass" && (review.gate === "ready" || review.gate === "released")) return false;
    if (kind === "fail" && review.gate === "released") return false;
    return true;
  }

  async function requestFinalReleaseVerdict(kind) {
    if (!state.currentId || state.releaseReviewBusy || isFinalVerdictLocked()) return;
    if (!finalReleaseVerdictReady(kind)) {
      showToast(finalReleaseVerdictBlockCopy(), "info", 4000);
      return;
    }
    const pass = kind === "pass";
    const label = pass ? t("release.final_pass") : t("release.final_fail");
    const confirmed = await confirmFinalReleaseVerdict(label);
    if (!confirmed) return;
    if (!finalReleaseVerdictReady(kind)) {
      showToast(finalReleaseVerdictBlockCopy(), "info", 4000);
      return;
    }
    if (pass) await submitFinalReleasePass();
    else await submitFinalReleaseFail();
  }

  async function submitFinalReleasePass() {
    if (!state.currentId || state.releaseReviewBusy) return;
    const review = currentOperations()?.releaseReview || normalizeReleaseReview(null);
    if (!releaseReviewAllRequiredVerdicted(review) || review.gate === "ready" || review.gate === "released") {
      showToast(finalReleaseVerdictBlockCopy(), "info", 4000);
      return;
    }
    state.releaseReviewBusy = true;
    renderReleaseReview(currentOperationsSnapshot() || normalizeOperations(null));
    try {
      const attestation = dom.releaseReviewAttestationInput?.value.trim() || "";
      const response = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/release-review/confirm`, {
        method: "POST",
        json: { attestation, locale: state.locale },
      });
      await mergeOperationsResponse(response);
      try {
        const ops = currentOperations();
        const ready = ops?.releaseReview?.gate === "ready" && ops?.releaseReview?.attestationAccepted;
        const published = ops?.communityPublication?.published === true;
        if (ready && !published) {
          await publishReleaseToCommunity();
        }
      } catch (_publishError) {
        // Confirm already succeeded; community publish can be retried later.
      }
      lockFinalVerdictButtons();
      showToast(t("release.final_pass_done"), "success", 4500);
      try {
        window.dispatchEvent(new CustomEvent("applooper:owner-final-judgment", {
          detail: { runId: state.currentId, verdict: "passed" },
        }));
        window.dispatchEvent(new CustomEvent("applooper:owner-final-pass", {
          detail: { runId: state.currentId, verdict: "passed" },
        }));
      } catch (_eventError) {
        // Study chrome listens when available; ignore if unavailable.
      }
    } catch (error) {
      showToast(
        friendlyError(
          error,
          state.locale === "zh-CN" ? "最终判定提交失败。" : "Could not submit the final judgment."
        ),
        "error",
        6000
      );
    } finally {
      state.releaseReviewBusy = false;
      renderReleaseReview(currentOperationsSnapshot() || normalizeOperations(null));
    }
  }

  async function submitFinalReleaseFail() {
    if (!state.currentId || state.releaseReviewBusy) return;
    const review = currentOperations()?.releaseReview || normalizeReleaseReview(null);
    if (!releaseReviewAllRequiredVerdicted(review)) {
      showToast(finalReleaseVerdictBlockCopy(), "info", 4000);
      return;
    }
    state.releaseReviewBusy = true;
    renderReleaseReview(currentOperationsSnapshot() || normalizeOperations(null));
    try {
      const response = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/release-review/defer`, {
        method: "POST",
        json: {
          locale: state.locale,
          reason: state.locale === "zh-CN" ? "所有者判定暂不符合发布条件" : "Owner judged not ready for release",
        },
      });
      await mergeOperationsResponse(response);
      lockFinalVerdictButtons();
      showToast(t("release.final_fail_done"), "success", 4500);
      try {
        window.dispatchEvent(new CustomEvent("applooper:owner-final-judgment", {
          detail: { runId: state.currentId, verdict: "failed" },
        }));
        window.dispatchEvent(new CustomEvent("applooper:owner-final-fail", {
          detail: { runId: state.currentId, verdict: "failed" },
        }));
      } catch (_eventError) {
        // Study chrome listens when available; ignore if unavailable.
      }
    } catch (error) {
      showToast(
        friendlyError(
          error,
          state.locale === "zh-CN" ? "最终判定提交失败。" : "Could not submit the final judgment."
        ),
        "error",
        6000
      );
    } finally {
      state.releaseReviewBusy = false;
      renderReleaseReview(currentOperationsSnapshot() || normalizeOperations(null));
    }
  }

  async function deferReleaseReview() {
    if (!state.currentId || state.releaseReviewBusy) return;
    state.releaseReviewBusy = true;
    try {
      const response = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/release-review/defer`, {
        method: "POST",
        json: { locale: state.locale },
      });
      await mergeOperationsResponse(response);
      showToast(t("release.defer_done"), "success", 3500);
    } catch (error) {
      showToast(friendlyError(error, state.locale === "zh-CN" ? "暂缓上线失败。" : "Could not defer release."), "error", 5000);
    } finally {
      state.releaseReviewBusy = false;
    }
  }

  async function publishReleaseToCommunity() {
    if (!state.currentId || state.releaseReviewBusy) return;
    state.releaseReviewBusy = true;
    renderReleaseReview(currentOperationsSnapshot() || normalizeOperations(null));
    try {
      const response = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/community/publish`, {
        method: "POST",
        json: {
          title: firstText(state.current?.app?.title, state.current?.app?.name),
          locale: state.locale,
        },
      });
      await mergeOperationsResponse(response);
      showToast(t("release.community_publish_done"), "success", 5000);
    } catch (error) {
      showToast(
        friendlyError(
          error,
          state.locale === "zh-CN"
            ? "暂时无法发布到研究测试社区，请检查提示后重试。"
            : "Could not publish to the research test community. Review the message and try again."
        ),
        "error",
        6000
      );
    } finally {
      state.releaseReviewBusy = false;
      renderReleaseReview(currentOperationsSnapshot() || normalizeOperations(null));
    }
  }

  function sendInternalTestTelemetry(event, details = {}) {
    if (!state.currentId || !event) return;
    const payload = {
      event,
      scenario_id: firstText(details.scenarioId),
      session_id: firstText(details.sessionId),
      semantic_target_id: firstText(details.semanticTargetId),
      route: firstText(details.route, "/").split("?", 1)[0].split("#", 1)[0],
      result: firstText(details.result, "unknown"),
    };
    void request(`/apps/${encodeURIComponent(state.currentId)}/internal-test/telemetry`, {
      method: "POST",
      json: payload,
    }).catch(() => {});
  }

  function sendStudyEvent(event, details = {}) {
    if (!state.currentId || !event) return;
    void request(`/apps/${encodeURIComponent(state.currentId)}/study/events`, {
      method: "POST",
      json: {
        event,
        subject_id: firstText(details.subjectId),
        candidate_version_id: firstText(details.candidateVersionId),
        outcome: firstText(details.outcome),
        phase: firstText(details.phase),
        counts: details.counts && typeof details.counts === "object" ? details.counts : {},
      },
    }).catch(() => {});
  }

  function participantTelemetryPhase() {
    if (state.releaseReviewBusy) return "scenario_preparation";
    if (state.launchOpen) return "verification_decision";
    if (state.current?.status === "recovering") return "reentry_recovery";
    if (state.current?.pending || state.current?.status === "running") return "waiting_monitoring";
    return "development_reading";
  }

  function setupParticipantObjectiveTelemetry() {
    if (state.participantTelemetryStarted) return;
    state.participantTelemetryStarted = true;
    const idleThresholdMs = 60_000;
    let lastTick = performance.now();
    let lastActivityAt = Date.now();
    let activePhase = participantTelemetryPhase();
    let activeMs = 0;
    let interactionCount = 0;
    let preparationStepCount = 0;
    const noteActivity = (event) => {
      lastActivityAt = Date.now();
      interactionCount += 1;
      if (event?.target?.closest?.(".release-review-panel, .release-scenario-session")) {
        preparationStepCount += 1;
      }
    };
    const flush = () => {
      const nextPhase = participantTelemetryPhase();
      if (activeMs || interactionCount || preparationStepCount) {
        sendStudyEvent("participant_activity", {
          phase: activePhase,
          counts: {
            active_ms: Math.round(activeMs),
            interaction_count: interactionCount,
            preparation_step_count: preparationStepCount,
          },
        });
      }
      activeMs = 0;
      interactionCount = 0;
      preparationStepCount = 0;
      activePhase = nextPhase;
    };
    window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.max(0, Math.min(15_000, now - lastTick));
      lastTick = now;
      const nextPhase = participantTelemetryPhase();
      if (nextPhase !== activePhase) flush();
      if (document.visibilityState === "visible" && Date.now() - lastActivityAt <= idleThresholdMs) {
        activeMs += elapsed;
      }
      if (activeMs >= 15_000) flush();
    }, 5_000);
    ["pointerdown", "keydown", "scroll"].forEach((name) => {
      window.addEventListener(name, noteActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", () => {
      lastTick = performance.now();
      if (document.visibilityState !== "visible") flush();
      else lastActivityAt = Date.now();
    });
    window.addEventListener("pagehide", flush);
  }

  function openPlainReleaseReviewRoute(guideRoute = "/", trialSeed = null) {
    const route = firstText(guideRoute, "/");
    openExperienceTwin();
    const views = state.experienceTwin?.views || [];
    const webView = views.find((view) => experienceTwinWebPreviewUrl({ ...view, route }));
    if (webView) {
      let url = experienceTwinWebPreviewUrl({ ...webView, route });
      const seedToken = encodeOwnerTrialSeed(trialSeed || state.releaseVerifyPending?.trialSeed);
      if (url && seedToken) {
        try {
          const parsed = new URL(url, window.location.href);
          parsed.searchParams.set("applooper_owner_seed", seedToken);
          url = parsed.href;
        } catch (_error) {
          // Keep the plain route if seed encoding/URL composition fails.
        }
      }
      if (url) renderExperienceTwinWebPreview({ ...webView, route }, url, { force: true });
    }
    return route;
  }

  async function openReleaseReviewGuide(itemOrRoute = "/") {
    const item = itemOrRoute && typeof itemOrRoute === "object" ? itemOrRoute : null;
    const evidence = item?.scenarioEvidence || normalizeScenarioEvidence(null, {
      scenarioId: item?.scenarioId,
      candidateVersionId: currentOperations().releaseReview?.candidateVersionId,
      guideRoute: firstText(item?.guideRoute, itemOrRoute, "/"),
    });
    const route = openPlainReleaseReviewRoute(
      firstText(evidence.deepLink, evidence.guideRoute, item?.guideRoute, itemOrRoute, "/"),
      item?.trialSeed || state.releaseVerifyPending?.trialSeed
    );
    sendInternalTestTelemetry("route_view", {
      scenarioId: evidence.scenarioId,
      semanticTargetId: item?.id,
      route,
    });
    if (evidence.setup?.preparationKind === "fallback_plain_route") {
      sendStudyEvent("scenario_fallback", {
        subjectId: evidence.scenarioId,
        candidateVersionId: evidence.candidateVersionId,
        outcome: "plain_route",
      });
    }
    if (!item?.scenarioId || !state.currentId) return;
    state.releaseReviewBusy = true;
    renderReleaseReview(currentOperations());
    try {
      if (state.releaseScenarioSession?.session_id) {
        await request(`/apps/${encodeURIComponent(state.currentId)}/operations/scenarios/cleanup`, {
          method: "POST",
          json: { session_id: state.releaseScenarioSession.session_id },
        }).catch(() => null);
      }
      const session = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/scenarios/start`, {
        method: "POST",
        json: {
          scenario_id: item.scenarioId,
          candidate_version_id: evidence.candidateVersionId,
          fixture_hash: evidence.fixtureHash,
        },
      });
      state.releaseScenarioSession = session;
      renderReleaseScenarioSession();
    } catch (error) {
      // The executable plain route remains available for old contracts and for
      // services that do not yet implement scenario sessions.
      state.releaseScenarioSession = null;
      renderReleaseScenarioSession();
      sendStudyEvent("scenario_fallback", {
        subjectId: evidence.scenarioId,
        candidateVersionId: evidence.candidateVersionId,
        outcome: "preparation_unavailable",
      });
      showToast(friendlyError(error, state.locale === "zh-CN"
        ? "场景准备不可用，已打开普通试用路径。"
        : "Scenario preparation is unavailable; opened the plain preview route."), "info", 5000);
    } finally {
      state.releaseReviewBusy = false;
      renderReleaseReview(currentOperations());
    }
  }

  function renderReleaseScenarioSession() {
    if (!dom.releaseScenarioSession) return;
    // Scenario prep chrome is intentionally hidden; owner verification uses the
    // trial bubble + per-item guide flow instead.
    state.releaseScenarioSession = null;
    dom.releaseScenarioSession.hidden = true;
    dom.releaseScenarioSession.setAttribute("aria-hidden", "true");
  }

  async function markReleaseScenarioInteracted() {
    const sessionId = firstText(state.releaseScenarioSession?.session_id);
    if (!sessionId || !state.currentId) return;
    const session = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/scenarios/interacted`, {
      method: "POST",
      json: { session_id: sessionId },
    });
    state.releaseScenarioSession = session;
    renderReleaseScenarioSession();
  }

  async function submitReleaseScenarioVerdict(verdict) {
    const sessionId = firstText(state.releaseScenarioSession?.session_id);
    if (!sessionId || !state.currentId || !["pass", "return"].includes(verdict)) return;
    state.releaseReviewBusy = true;
    try {
      const session = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/scenarios/verdict`, {
        method: "POST",
        json: { session_id: sessionId, verdict },
      });
      state.releaseScenarioSession = session;
      const cleanup = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/scenarios/cleanup`, {
        method: "POST",
        json: { session_id: sessionId },
      });
      state.releaseScenarioSession = cleanup;
      const operations = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/release-review/ensure`, {
        method: "POST",
        json: { locale: state.locale },
      });
      await mergeOperationsResponse(operations);
      sendInternalTestTelemetry("task_result", {
        scenarioId: session.scenario_id,
        sessionId,
        result: verdict,
      });
    } catch (error) {
      showToast(friendlyError(error, state.locale === "zh-CN"
        ? "无法提交场景结论。"
        : "Could not submit the scenario verdict."), "error", 5000);
    } finally {
      state.releaseReviewBusy = false;
      renderReleaseScenarioSession();
      renderReleaseReview(currentOperations());
    }
  }

  function releaseReviewGateLabel(gate) {
    const key = `release.gate_${firstText(gate, "draft")}`;
    return t(key) === key ? gate : t(key);
  }

  function releaseReviewAllRequiredChecked(review) {
    return arrayFrom(review?.items)
      .filter((item) => item.required && item.controlKind !== "switch")
      .every((item) => (item.ownerVerdict === "passed" || item.checked) && !item.blocksRelease);
  }

  function releaseReviewAllRequiredVerdicted(review) {
    const required = arrayFrom(review?.items)
      .filter((item) => item.required && item.controlKind !== "switch");
    if (!required.length) return false;
    return required.every((item) => item.ownerVerdict === "passed" || item.ownerVerdict === "failed");
  }

  async function bypassOwnerProxy() {
    if (!state.currentId) return;
    try {
      const response = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/owner-proxy/bypass`, {
        method: "POST",
        json: { reason: "owner_ui_action" },
      });
      const operations = currentOperations();
      operations.ownerProxy = normalizeOwnerProxy(response.owner_proxy);
      renderReleaseReview(operations);
      showToast(t("owner_proxy.skipped_notice"), "info", 5000);
    } catch (error) {
      showToast(friendlyError(error, t("owner_proxy.skip_failed")), "error", 5000);
    }
  }

  function renderOwnerProxy(operations, review) {
    if (!dom.ownerProxyReview) return;
    const proxy = operations.ownerProxy || normalizeOwnerProxy(null);
    dom.ownerProxyTitle.textContent = proxy.label;
    if (dom.ownerProxyProfile) {
      const waitingForContext = Boolean(proxy.profile.abstain);
      dom.ownerProxyProfile.replaceChildren(
        element("p", "", t("owner_proxy.profile_basis")),
        element("p", "", t(waitingForContext
          ? "owner_proxy.profile_waiting"
          : "owner_proxy.profile_ready"))
      );
    }
    if (dom.ownerProxyReceipts) {
      dom.ownerProxyReceipts.replaceChildren();
      proxy.receipts.forEach((receipt) => {
        const refs = [...receipt.sourceRefs, ...receipt.evidenceRefs];
        const text = [
          t("owner_proxy.round", { round: receipt.round }),
          t("owner_proxy.refs", { value: refs.length ? refs.join(", ") : t("common.not_provided") }),
          t("owner_proxy.outcome", { value: receipt.outcome }),
          t("owner_proxy.differences", { value: receipt.differences.join("; ") || t("common.no_record") }),
          t("owner_proxy.risks", { value: receipt.unresolvedRisks.join("; ") || t("common.no_record") }),
        ].join(" · ");
        dom.ownerProxyReceipts.append(element("li", "", text));
      });
      if (!proxy.receipts.length) {
        dom.ownerProxyReceipts.append(element("li", "", t("owner_proxy.none")));
      }
    }
    if (dom.ownerProxyBypassButton) {
      dom.ownerProxyBypassButton.disabled = proxy.bypass.bypassed;
      dom.ownerProxyBypassButton.textContent = proxy.bypass.bypassed
        ? t("release.owner_proxy_bypassed")
        : t("release.owner_proxy_bypass");
    }
    const exposureKey = `${state.currentId}:${review.candidateVersionId}`;
    if (state.ownerProxyExposureKey !== exposureKey) {
      state.ownerProxyExposureKey = exposureKey;
      sendStudyEvent("owner_proxy_exposed", {
        subjectId: review.id || "owner_proxy",
        candidateVersionId: review.candidateVersionId,
        outcome: proxy.receipts.length ? "receipts_available" : "no_receipt",
      });
    }
  }

  function renderReleaseReview(operations) {
    if (!dom.releaseReviewPanel || !dom.releaseReviewSections) return;
    const studyActive = document.documentElement.dataset.studyTreatmentReady === "1";
    const studyReleaseReady = document.documentElement.dataset.studyReleaseReady === "1";
    if (studyActive && !studyReleaseReady) {
      dom.releaseReviewPanel.hidden = true;
      if (dom.releaseFinalVerdictPanel) dom.releaseFinalVerdictPanel.hidden = true;
      return;
    }
    const review = operations.releaseReview || normalizeReleaseReview(null);
    const hasItems = review.items.length > 0;
    // Only the in-flight latch shows the spinner. Do not treat a missing
    // operations snapshot as perpetual loading — that used to freeze the panel
    // after a failed/aborted fetch (especially when switching A ↔ B).
    const loading = Boolean(state.operationsRefreshing) && !hasItems;
    const showPanel = hasItems || loading || (state.launchOpen && Boolean(state.operationsRefreshing));
    dom.releaseReviewPanel.hidden = !showPanel;
    renderOwnerProxy(operations, review);
    if (!showPanel) return;

    if (loading && !hasItems) {
      if (dom.releaseReviewTitle) {
        dom.releaseReviewTitle.textContent = t("release.review_title");
      }
      if (dom.releaseReviewGate) {
        dom.releaseReviewGate.dataset.state = "draft";
        dom.releaseReviewGate.textContent = t("release.items_loading");
      }
      const loadingRow = element("p", "release-review-loading");
      const spinner = element("span", "release-review-loading-spinner");
      spinner.setAttribute("aria-hidden", "true");
      loadingRow.append(spinner, document.createTextNode(t("release.items_loading")));
      dom.releaseReviewSections.replaceChildren(loadingRow);
      if (dom.releaseReviewAttestationBlock) dom.releaseReviewAttestationBlock.hidden = true;
      if (dom.releaseReviewConfirmButton) dom.releaseReviewConfirmButton.disabled = true;
      if (dom.releaseReviewDeferButton) dom.releaseReviewDeferButton.disabled = true;
      if (dom.releaseReviewCommunityPublishButton) dom.releaseReviewCommunityPublishButton.hidden = true;
      if (dom.releaseFinalPassButton) dom.releaseFinalPassButton.disabled = true;
      if (dom.releaseFinalFailButton) dom.releaseFinalFailButton.disabled = true;
      return;
    }

    if (!hasItems) return;

    if (dom.releaseReviewTitle && review.candidateLabel) {
      const title = review.reviewablePrototype
        ? (state.locale === "zh-CN" ? "可评审原型验收（仅限用户研究）" : "Reviewable prototype acceptance (user study only)")
        : t("release.review_title");
      dom.releaseReviewTitle.textContent = `${title} · ${review.candidateLabel}`;
    }
    if (dom.releaseReviewGate) {
      dom.releaseReviewGate.dataset.state = review.gate || "draft";
      dom.releaseReviewGate.textContent = releaseReviewGateLabel(review.gate);
    }
    dom.releaseReviewPanel.dataset.candidateVersionId = review.candidateVersionId || "";
    dom.releaseReviewPanel.dataset.approvalBinding = review.approvalBinding || "candidate";
    dom.releaseReviewPanel.dataset.studyCondition = review.studyCondition || "";
    const brief = review.acceptanceBrief || normalizeAcceptanceBrief(null);
    if (dom.releaseAcceptanceBrief) {
      dom.releaseAcceptanceBrief.dataset.sourceItemId = brief.sourceItemId || "";
      dom.releaseAcceptanceBrief.dataset.openP0Count = String(brief.openP0Count || 0);
    }
    if (dom.releaseAcceptanceBriefPersona) {
      dom.releaseAcceptanceBriefPersona.textContent = brief.persona ? `${brief.persona}：` : "";
    }
    if (dom.releaseAcceptanceBriefFinding) dom.releaseAcceptanceBriefFinding.textContent = brief.finding;
    if (dom.releaseAcceptanceBriefChange) dom.releaseAcceptanceBriefChange.textContent = brief.change;
    if (dom.releaseAcceptanceBriefCheck) dom.releaseAcceptanceBriefCheck.textContent = brief.check;
    if (dom.releaseAcceptanceBriefGate) dom.releaseAcceptanceBriefGate.textContent = brief.systemGateSummary;
    if (dom.releaseAcceptanceBriefStopRule) dom.releaseAcceptanceBriefStopRule.textContent = brief.stopRuleNotice;
    const screenshotUrl = brief.screenshotName && state.currentId
      ? `${API_ROOT}/apps/${encodeURIComponent(state.currentId)}/release-evidence/screenshots/${encodeURIComponent(brief.screenshotName)}`
      : "";
    if (dom.releaseAcceptanceBriefScreenshotButton) {
      dom.releaseAcceptanceBriefScreenshotButton.hidden = !screenshotUrl;
      dom.releaseAcceptanceBriefScreenshotButton.dataset.screenshotName = brief.screenshotName || "";
      dom.releaseAcceptanceBriefScreenshotButton.onclick = screenshotUrl
        ? () => window.open(screenshotUrl, "_blank", "noopener")
        : null;
    }
    if (dom.releaseAcceptanceBriefScreenshot) {
      dom.releaseAcceptanceBriefScreenshot.alt = brief.finding || t("release.brief_screenshot");
      if (screenshotUrl) dom.releaseAcceptanceBriefScreenshot.src = screenshotUrl;
      else dom.releaseAcceptanceBriefScreenshot.removeAttribute("src");
    }
    if (dom.releaseAcceptanceBriefScreenshotEmpty) {
      dom.releaseAcceptanceBriefScreenshotEmpty.hidden = Boolean(screenshotUrl);
    }
    if (dom.releaseReviewSnapshot) {
      const requiredItems = review.items.filter((item) => item.required && item.controlKind !== "switch");
      const reviewedItems = requiredItems.filter((item) => item.ownerVerdict === "passed" || item.ownerVerdict === "failed" || item.checked);
      const shortId = review.candidateVersionId ? review.candidateVersionId.slice(0, 12) : "";
      dom.releaseReviewSnapshot.dataset.candidateVersionId = review.candidateVersionId || "";
      if (dom.releaseReviewSnapshotCandidate) {
        dom.releaseReviewSnapshotCandidate.textContent = [review.candidateLabel, shortId].filter(Boolean).join(" · ");
      }
      if (dom.releaseReviewSnapshotVerified) {
        dom.releaseReviewSnapshotVerified.textContent = t("release.snapshot_verified_count", {
          checked: reviewedItems.length,
          total: requiredItems.length,
        });
      }
      if (dom.releaseReviewSnapshotJudgment) {
        dom.releaseReviewSnapshotJudgment.textContent = t("release.snapshot_judgment_copy");
      }
      if (dom.releaseReviewSnapshotProvenance) {
        dom.releaseReviewSnapshotProvenance.textContent = t("release.snapshot_provenance_copy");
      }
      if (dom.releaseReviewSnapshotScope) {
        dom.releaseReviewSnapshotScope.textContent = t(
          review.approvalBinding === "run"
            ? "release.snapshot_scope_run"
            : "release.snapshot_scope_candidate"
        );
      }
      if (dom.releaseReviewSnapshotPaths) {
        dom.releaseReviewSnapshotPaths.replaceChildren();
        const paths = review.items.filter((item) => item.guideRoute && item.guideRoute !== "/").slice(0, 4);
        if (paths.length) {
          paths.forEach((item) => dom.releaseReviewSnapshotPaths.append(element("li", "", item.title)));
        } else {
          dom.releaseReviewSnapshotPaths.append(element("li", "", t("release.snapshot_no_paths")));
        }
      }
    }

    dom.releaseReviewSections.replaceChildren();
    ["version", "feedback"].forEach((section) => {
      const items = review.items.filter((item) => item.section === section);
      if (!items.length) return;
      const block = element("div", "release-review-section");
      block.append(element("span", "release-review-section-title", t(section === "version" ? "release.section_version" : "release.section_feedback")));
      const list = element("ol", "release-review-items");
      items.forEach((item) => {
        const verdict = item.ownerVerdict || (item.checked ? "passed" : "unverified");
        const row = element(
          "li",
          `release-review-item${verdict === "passed" || item.checked ? " is-checked" : ""}${verdict === "failed" ? " is-failed" : ""}${item.blocksRelease ? " is-blocking" : ""}${item.controlKind === "switch" ? " is-switch" : ""}`
        );
        row.dataset.semanticTargetId = item.id || "";
        row.dataset.feedbackSection = item.section || "";
        row.dataset.feedbackPriority = item.required ? "high" : "normal";
        row.dataset.feedbackChecked = (verdict === "passed" || item.checked) ? "1" : "0";
        row.dataset.ownerVerdict = verdict;
        const label = element("label", "");
        const copy = element("div", "");
        if (item.controlKind === "switch") {
          const toggle = element("input", "release-review-switch");
          toggle.type = "checkbox";
          toggle.checked = Boolean(item.checked);
          toggle.disabled = state.releaseReviewBusy || review.gate === "released";
          toggle.addEventListener("change", () => void toggleReleaseReviewItem(item.id, toggle.checked));
          label.append(toggle);
        } else {
          const status = element(
            "span",
            `release-review-verdict is-${verdict}`,
            t(
              verdict === "passed"
                ? "release.verdict_passed"
                : verdict === "failed"
                  ? "release.verdict_failed"
                  : "release.verdict_unverified"
            )
          );
          label.append(status);
        }
        const badge = item.blocksRelease
          ? t("release.blocking_badge")
          : (item.required ? t("release.required_badge") : "");
        const studyReview = usesDirectDeveloperStudyConversation();
        const titleText = badge ? `${participantFacingReviewTitle(item.title)} (${badge})` : participantFacingReviewTitle(item.title);
        copy.append(element("strong", "", titleText));
        if (item.description) copy.append(element("small", "", participantFacingReviewTitle(item.description)));
        if (item.failNote) copy.append(element("small", "release-review-fail-note", item.failNote));
        if (!studyReview && item.contextProvenance.length) {
          copy.append(element("small", "release-review-item-provenance", item.contextProvenance.join(" · ")));
        }
        const hasScenarioPrep = !studyReview
          && Boolean(item.scenarioEvidence?.setup?.preparationKind)
          && item.scenarioEvidence.setup.preparationKind !== "fallback_plain_route";
        if (hasScenarioPrep) {
          const preparation = item.scenarioEvidence.setup;
          const preparationLabel = preparation?.preparationKind === "fixture_prepared"
            ? t("release.preparation_fixture")
            : preparation?.preparationKind === "ui_replay_preparation"
              ? t("release.preparation_replay")
              : t("release.preparation_fallback");
          copy.append(element(
            "small",
            "release-review-item-preparation",
            [
              preparationLabel,
              ...arrayFrom(preparation?.steps),
              item.scenarioEvidence?.provenance?.summary,
              `cleanup: ${firstText(item.scenarioEvidence?.cleanup?.status, "pending")}`,
            ].filter(Boolean).join(" · ")
          ));
        }
        label.append(copy);
        row.append(label);
        if (item.controlKind !== "switch" && review.gate !== "released") {
          const guide = element(
            "button",
            "text-button release-review-item-guide",
            item.guideRoute && item.guideRoute !== "/" ? t("release.item_guide") : t("release.guide_me")
          );
          guide.type = "button";
          guide.disabled = state.releaseReviewBusy;
          guide.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            sendInternalTestTelemetry("semantic_click", {
              scenarioId: item.scenarioId,
              semanticTargetId: item.id,
              route: item.guideRoute || "/",
            });
            void startReleaseItemVerify(item);
          });
          row.append(guide);
        }
        list.append(row);
      });
      block.append(list);
      dom.releaseReviewSections.append(block);
    });
    // Intentionally omit test-maintainer flaky/quarantine/mutation copy from the
    // participant-facing release checklist.

    const allRequiredChecked = releaseReviewAllRequiredChecked(review);
    const allRequiredVerdicted = releaseReviewAllRequiredVerdicted(review);
    const showAttestation = review.gate !== "ready" && Boolean(
      arrayFrom(review.items).find((item) => item.id === "ops_release_attestation")
    );
    const attestationSwitch = arrayFrom(review.items).find((item) => item.id === "ops_release_attestation");
    const attestationFeatureEnabled = Boolean(attestationSwitch);
    const attestationTextRequired = Boolean(attestationSwitch?.checked);
    if (dom.releaseFinalVerdictPanel) {
      dom.releaseFinalVerdictPanel.hidden = review.gate === "released";
    }
    if (dom.releaseFinalVerdictHint) {
      dom.releaseFinalVerdictHint.textContent = t("release.final_verdict_hint");
    }
    const judgedLocked = isFinalVerdictLocked();
    const finalLocked = judgedLocked
      || state.releaseReviewBusy
      || !allRequiredVerdicted
      || review.gate === "ready"
      || review.gate === "released";
    if (dom.releaseFinalPassButton) {
      dom.releaseFinalPassButton.disabled = finalLocked;
      dom.releaseFinalPassButton.textContent = t("release.final_pass");
    }
    if (dom.releaseFinalFailButton) {
      dom.releaseFinalFailButton.disabled = judgedLocked
        || state.releaseReviewBusy
        || !allRequiredVerdicted
        || review.gate === "released";
      dom.releaseFinalFailButton.textContent = t("release.final_fail");
    }
    if (dom.releaseReviewAttestationBlock) dom.releaseReviewAttestationBlock.hidden = !showAttestation;
    if (dom.releaseReviewAttestationHint) {
      dom.releaseReviewAttestationHint.hidden = !showAttestation || !attestationFeatureEnabled || attestationTextRequired;
      dom.releaseReviewAttestationHint.textContent = t("release.attestation_optional_hint");
    }
    if (dom.releaseReviewAttestationLabel) {
      dom.releaseReviewAttestationLabel.hidden = !showAttestation || !attestationFeatureEnabled || !attestationTextRequired;
    }
    if (dom.releaseReviewAttestationExpected) {
      dom.releaseReviewAttestationExpected.hidden = !showAttestation || !attestationFeatureEnabled || !attestationTextRequired;
      dom.releaseReviewAttestationExpected.textContent = releaseReviewAttestationText(review);
    }
    if (dom.releaseReviewAttestationInput) {
      dom.releaseReviewAttestationInput.hidden = !showAttestation || !attestationFeatureEnabled || !attestationTextRequired;
      dom.releaseReviewAttestationInput.disabled = state.releaseReviewBusy || !attestationTextRequired;
    }
    if (dom.releaseReviewConfirmButton) {
      dom.releaseReviewConfirmButton.hidden = true;
      dom.releaseReviewConfirmButton.disabled = true;
    }
    if (dom.releaseReviewDeferButton) {
      dom.releaseReviewDeferButton.hidden = true;
      dom.releaseReviewDeferButton.disabled = true;
    }
    if (dom.releaseReviewGuideButton) {
      dom.releaseReviewGuideButton.hidden = true;
    }
    if (dom.releaseReviewCommunityPublishButton) {
      const communityPublished = operations.communityPublication?.published === true;
      const communityPublishReady = review.gate === "ready" && review.attestationAccepted;
      // Final-pass path auto-publishes; keep the manual button only as a recovery action.
      dom.releaseReviewCommunityPublishButton.hidden = !communityPublishReady || communityPublished;
      dom.releaseReviewCommunityPublishButton.disabled = state.releaseReviewBusy || communityPublished;
      dom.releaseReviewCommunityPublishButton.textContent = t(
        communityPublished
          ? "release.community_published"
          : state.releaseReviewBusy
            ? "release.publishing_community"
            : "release.publish_community"
      );
    }
    if (dom.operationsDeployButton && review.items.length) {
      const deployAllowed = review.gate === "ready" && review.attestationAccepted;
      dom.operationsDeployButton.classList.toggle("is-gated", !deployAllowed);
      dom.operationsDeployButton.title = deployAllowed ? "" : t("release.deploy_blocked");
    }
  }

  function eufrStatusLabel(status) {
    const key = `eufr.status.${firstText(status, "collected").toLowerCase()}`;
    return t(key) === key ? status : t(key);
  }

  function closeEufrDrawer() {
    state.eufrSelectedThemeId = "";
    if (dom.eufrDrawer) dom.eufrDrawer.hidden = true;
  }

  function openEufrDrawer(theme) {
    if (!theme || !dom.eufrDrawer || !dom.eufrDrawerBody || !dom.eufrDrawerTitle) return;
    state.eufrSelectedThemeId = theme.id;
    dom.eufrDrawer.hidden = false;
    dom.eufrDrawerTitle.textContent = theme.title;
    dom.eufrDrawerBody.replaceChildren();
    const meta = element("dl", "");
    const addRow = (label, value) => {
      if (!value) return;
      meta.append(element("dt", "", label), element("dd", "", value));
    };
    addRow("Priority", theme.priority);
    addRow(t("eufr.status.collected"), eufrStatusLabel(theme.status));
    if (theme.summary) addRow(t("operations.dashboard_label"), theme.summary);
    if (theme.resolutionSummary) addRow(t("eufr.resolution"), theme.resolutionSummary);
    if (theme.wontFixReason) addRow(t("eufr.status.wont_fix"), theme.wontFixReason);
    dom.eufrDrawerBody.append(meta);
    if (theme.rawEntries?.length) {
      dom.eufrDrawerBody.append(element("strong", "", t("eufr.raw_entries")));
      const list = element("ol", "eufr-raw-list");
      theme.rawEntries.forEach((entry) => {
        const row = element("li", "");
        row.append(element("span", "", entry.body));
        if (entry.createdAt) row.append(element("time", "", formatRelativeTime(entry.createdAt)));
        list.append(row);
      });
      dom.eufrDrawerBody.append(list);
    }
  }

  function themeSortTime(theme) {
    return Date.parse(firstText(theme.updatedAt, theme.createdAt)) || 0;
  }

  function buildLatestFeedbackSummary(themes) {
    if (!themes.length) return "";
    const sorted = [...themes].sort((left, right) => themeSortTime(right) - themeSortTime(left));
    if (sorted.length === 1) {
      const latest = sorted[0];
      return firstText(latest.summary, latest.title);
    }
    return sorted.slice(0, 3).map((item) => {
      if (item.summary && item.title && item.title !== item.summary) return `${item.title}：${item.summary}`;
      return firstText(item.summary, item.title);
    }).join("；");
  }

  function operationsBoardRefreshButton(kind) {
    if (kind === "feedback") return dom.feedbackBoardRefreshButton;
    if (kind === "traffic") return dom.trafficBoardRefreshButton;
    return dom.analyticsBoardRefreshButton;
  }

  function setBoardRefreshBusy(kind, busy) {
    state.operationsBoardRefreshing[kind] = busy;
    const button = operationsBoardRefreshButton(kind);
    if (!button) return;
    button.disabled = busy;
    button.classList.toggle("is-spinning", busy);
    button.setAttribute("aria-busy", String(busy));
    button.setAttribute("aria-label", t(busy ? "operations.board_refreshing" : `operations.board_refresh_${kind}`));
  }

  function analyticsBoardState(operations) {
    const available = Object.values(operations.metricRecords || {}).filter((item) => item.status === "available");
    if (available.length) return "ready";
    const agentStatus = firstText(operations.operationsAgent?.status).toLowerCase();
    if (["queued", "running"].includes(agentStatus)) return "agent_busy";
    const modules = skillDefinedAuthorizationSources(operations);
    if (modules.some((item) => !item.authorizationReady)) return "needs_information";
    const configured = arrayFrom(operations.dataSources).filter(operationsSourceAuthorized);
    if (configured.length) return "needs_implementation";
    if (modules.length) return "needs_authorization";
    if (analyticsNeedsGuidedSetup(operations)) return "needs_skill";
    return "needs_authorization";
  }

  async function verifyAnalyticsBoardConnection() {
    if (!state.currentId || state.operationsBoardRefreshing.analytics) return;
    setBoardRefreshBusy("analytics", true);
    try {
      await loadOperations({ silent: true });
      const operations = currentOperations();
      const boardState = analyticsBoardState(operations);
      if (boardState === "needs_skill") {
        openOperationsGuidedSetup("analytics");
        return;
      }
      if (boardState === "ready") {
        showToast(t("operations.board_refreshed"), "success", 3000);
        renderOperations();
        return;
      }
      if (boardState === "needs_authorization") {
        renderOperations();
        dom.analyticsActivationActions?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        showToast(t("operations.board_needs_authorization"), "error", 7000);
        return;
      }
      if (boardState === "needs_information") {
        renderOperations();
        dom.analyticsActivationActions?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        showToast(t("operations.board_needs_information"), "error", 7000);
        return;
      }
      if (boardState === "needs_implementation") {
        await queueOperationsRefresh();
        await loadOperations({ silent: true });
        const refreshed = currentOperations();
        if (Object.values(refreshed.metricRecords || {}).some((item) => item.status === "available")) {
          showToast(t("operations.board_refreshed"), "success", 3000);
        } else {
          showToast(t("operations.board_refresh_no_metrics"), "error", 7000);
        }
        renderOperations();
        return;
      }
      if (boardState === "agent_busy") {
        showToast(t("operations.refresh_queued"), "success", 4000);
        return;
      }
      showToast(t("operations.board_still_no_data"), "error", 7000);
    } catch (error) {
      showToast(friendlyError(error, t("operations.refresh_failed")), "error", 5000);
    } finally {
      setBoardRefreshBusy("analytics", false);
    }
  }

  async function refreshOperationsBoard(kind) {
    if (kind === "analytics") {
      return verifyAnalyticsBoardConnection();
    }
    if (!state.currentId || state.operationsBoardRefreshing[kind]) return;
    setBoardRefreshBusy(kind, true);
    try {
      await loadOperations({ silent: true });
      showToast(t("operations.board_refreshed"), "success", 3000);
    } catch (error) {
      showToast(friendlyError(error, t("operations.refresh_failed")), "error", 5000);
    } finally {
      setBoardRefreshBusy(kind, false);
    }
  }

  function renderActivationList(listEl, items) {
    if (!listEl) return;
    listEl.replaceChildren();
    arrayFrom(items).slice(0, 8).forEach((text) => {
      if (!text) return;
      listEl.append(element("li", "", text));
    });
  }

  function renderFeedbackActivation(operations) {
    if (!dom.feedbackActivationStatus) return;
    const skill = operations.feedbackSkill;
    const collection = operations.feedbackCollection || normalizeFeedbackCollection(null);
    const manual = skill?.management === "manual";
    const channels = arrayFrom(collection.channels);
    const needsSetup = feedbackNeedsGuidedSetup(operations);
    const countLine = channels.length
      ? t("operations.activation_channels", { count: channels.length })
      : needsSetup
        ? t("operations.activation_feedback_pending")
        : t("operations.activation_no_channels");
    dom.feedbackActivationStatus.textContent = `${t(manual ? "operations.activation_manual" : "operations.activation_auto")} · ${countLine}`;
    const listItems = channels.map((channel) => {
      const kindKey = `feedback.kind.${firstText(channel.kind)}`;
      const translatedKind = t(kindKey);
      const label = translatedKind === kindKey ? firstText(channel.label, channel.kind) : translatedKind;
      const parts = [label];
      if (channel.route) parts.push(channel.route);
      if (channel.sourcePath) parts.push(channel.sourcePath);
      return parts.filter(Boolean).join(" · ");
    });
    if (!listItems.length) {
      arrayFrom(skill?.dataSources).forEach((item) => {
        listItems.push(firstText(item.name, item.description));
      });
    }
    renderActivationList(dom.feedbackActivationList, listItems);
    if (!dom.feedbackActivationActions) return;
    dom.feedbackActivationActions.replaceChildren();
    if (needsSetup) appendActivationGuidedButton(dom.feedbackActivationActions, "feedback");
  }

  function renderAnalyticsActivation(operations) {
    if (!dom.analyticsActivationActions) return;
    const modules = skillDefinedAuthorizationSources(operations);
    const blocked = modules.filter((source) => !source.authorizationReady);
    const pending = modules.filter(
      (source) => source.authorizationReady && !operationsSourceAuthorized(source)
    );
    dom.analyticsActivationActions.replaceChildren();

    if (analyticsNeedsGuidedSetup(operations) && !modules.length) {
      appendActivationGuidedButton(dom.analyticsActivationActions, "analytics");
      return;
    }

    if (!modules.length) return;
    if (blocked.length) {
      dom.analyticsActivationActions.append(
        element("p", "ops-module-activation-copy", t("operations.board_needs_information"))
      );
    } else if (pending.length) {
      dom.analyticsActivationActions.append(element("p", "ops-module-activation-step-label", t("operations.activation_step_authorize")));
      dom.analyticsActivationActions.append(element("p", "ops-module-activation-copy", t("operations.board_needs_authorization")));
    }
    modules.forEach((source) => {
      appendAuthorizationSourceCard(dom.analyticsActivationActions, source);
    });
  }

  function analyticsSkillUsesBriefDescriptionOnly(operations) {
    const skill = operations.analyticsSkill || operations.operationsSkill;
    if (!skill) return false;
    const hasStructured = arrayFrom(skill.dataSources).length > 0;
    const hasInstructions = Boolean(firstText(skill.instructions, skill.summary));
    return hasInstructions && !hasStructured;
  }

  function skillDefinedAuthorizationSources(operations) {
    const skill = operations.analyticsSkill || operations.operationsSkill;
    const skillItems = arrayFrom(skill?.dataSources).map(normalizeSkillDataSource).filter(Boolean);
    const manualSources = arrayFrom(operations.dataSources).filter((source) => !source.autoDetected);
    if (skillItems.length) {
      const seen = new Set();
      return skillItems.map((item) => {
        const label = firstText(item.name);
        seen.add(label.toLowerCase());
        const matched = manualSources.find((source) => firstText(source.displayName).toLowerCase() === label.toLowerCase());
        return matched ? {
          ...matched,
          fromSkill: true,
          integrationReady: true,
          skillItem: item,
        } : {
          id: firstText(item.id, `skill_${label}`),
          displayName: label,
          providerId: operationsProviderId(label),
          publicUrl: item.endpointUrl,
          autoDetected: false,
          fromSkill: true,
          integrationReady: true,
          authorizationReady: false,
          authorizationStatus: "needs_information",
          authorizationMissingFields: [{
            field: "verified_source",
            label: t("operations.source_field_readiness"),
            prompt: t("operations.authorization_missing_default"),
            kind: "information",
          }],
          verification: { status: "pending", snapshotCount: 0, lastVerifiedAt: "" },
          status: "needs_information",
          configured: false,
          skillItem: item,
        };
      }).concat(manualSources
        .filter((source) => !seen.has(firstText(source.displayName).toLowerCase()))
        .map((source) => ({ ...source, integrationReady: source.integrationReady !== false })));
    }
    return manualSources.map((source) => ({ ...source, integrationReady: source.integrationReady !== false }));
  }

  const OPERATIONS_PROVIDER_GUIDES = {
    vercel_analytics: "https://vercel.com/docs/analytics",
    vercel: "https://vercel.com/docs/analytics",
    netlify_analytics: "https://docs.netlify.com/monitor-sites/analytics/",
    netlify: "https://docs.netlify.com/monitor-sites/analytics/",
    cloudflare_analytics: "https://developers.cloudflare.com/analytics/",
    cloudflare: "https://developers.cloudflare.com/analytics/",
    firebase_analytics: "https://firebase.google.com/docs/analytics",
    firebase: "https://firebase.google.com/docs/analytics",
    google_play_console: "https://support.google.com/googleplay/android-developer/answer/139628",
    android: "https://support.google.com/googleplay/android-developer/answer/139628",
    app_store_connect: "https://developer.apple.com/app-store-connect/analytics/",
    apple: "https://developer.apple.com/app-store-connect/analytics/",
  };

  function operationsProviderGuideUrl(source) {
    const providerId = firstText(source?.providerId, source?.provider_id, source?.adapterId).toLowerCase();
    if (OPERATIONS_PROVIDER_GUIDES[providerId]) return OPERATIONS_PROVIDER_GUIDES[providerId];
    const adapterId = firstText(source?.adapterId, source?.adapter_id).toLowerCase();
    if (OPERATIONS_PROVIDER_GUIDES[adapterId]) return OPERATIONS_PROVIDER_GUIDES[adapterId];
    for (const [key, url] of Object.entries(OPERATIONS_PROVIDER_GUIDES)) {
      if (providerId.includes(key) || adapterId.includes(key)) return url;
    }
    return "";
  }

  function operationsAuthorizationSourceLabel(source) {
    return firstText(source.displayName, source.providerId, source.id);
  }

  function operationsSourceAuthorized(source) {
    return source?.authorizationReady === true
      && (source.configured === true || source.status === "configured");
  }

  function operationsSourceReadinessKey(source) {
    if (source?.authorizationReady === true) return "ready";
    return source?.authorizationStatus === "pending_verification"
      ? "pending_verification"
      : "needs_information";
  }

  function operationsSourceMissingInformation(source) {
    return arrayFrom(source?.authorizationMissingFields)
      .filter((item) => item?.kind !== "verification");
  }

  function operationsSourceMissingSummary(source) {
    const rows = arrayFrom(source?.authorizationMissingFields);
    if (!rows.length) return t("operations.authorization_missing_default");
    return rows.map((item) => firstText(item.prompt, item.label, item.field)).filter(Boolean).join("；");
  }

  function appendAuthorizationSourceCard(container, source) {
    const card = element("article", "ops-authorization-card");
    card.dataset.sourceId = source.id;
    const head = element("div", "ops-authorization-card-head");
    const authorized = operationsSourceAuthorized(source);
    const readiness = operationsSourceReadinessKey(source);
    const badgeKey = authorized
      ? "operations.source_configured"
      : readiness === "needs_information"
        ? "operations.authorization_badge_needs_information"
        : readiness === "pending_verification"
          ? "operations.authorization_badge_pending_verification"
          : "operations.authorization_badge_skill";
    const badge = element(
      "span",
      "ops-authorization-badge",
      t(badgeKey)
    );
    badge.dataset.state = authorized ? "configured" : readiness;
    head.append(
      element("strong", "", operationsAuthorizationSourceLabel(source)),
      badge
    );
    card.append(head);
    const description = firstText(source.skillItem?.description, source.sourceRef, source.skillItem?.metrics);
    if (description) {
      card.append(element("p", "", description));
    }
    if (!source.authorizationReady) {
      card.append(element("p", "ops-authorization-missing", operationsSourceMissingSummary(source)));
    }
    const actions = element("div", "ops-authorization-actions");
    const detailButton = element("button", "ops-authorization-button is-secondary", t("operations.authorization_details"));
    detailButton.type = "button";
    detailButton.addEventListener("click", () => openOperationsSourceDetail(source.id));
    const needsInformation = operationsSourceMissingInformation(source).length > 0;
    const authorizeButton = element(
      "button",
      `ops-authorization-button ${authorized ? "is-authorized" : "is-primary"}`,
      t(
        authorized
          ? "operations.authorization_authorized"
          : !source.authorizationReady
            ? needsInformation
              ? "operations.authorization_complete_info"
              : "operations.authorization_view_requirements"
            : "operations.authorization_authorize"
      )
    );
    authorizeButton.type = "button";
    authorizeButton.disabled = authorized;
    authorizeButton.addEventListener("click", () => {
      if (!source.authorizationReady && needsInformation) {
        openOperationsSourceCompletion(source);
      } else {
        openOperationsSourceDetail(source.id, { focusAuthorization: source.authorizationReady });
      }
    });
    actions.append(detailButton, authorizeButton);
    card.append(actions);
    container.append(card);
  }

  function operationsSourceById(sourceId) {
    return skillDefinedAuthorizationSources(currentOperations())
      .find((source) => source.id === sourceId) || null;
  }

  function openOperationsSourceCompletion(source) {
    if (!source) return;
    if (dom.operationsSourceDetailDialog?.open) {
      closeDialog(dom.operationsSourceDetailDialog);
      state.operationsSourceDetailId = "";
    }
    void openOperationsGuidedSetup("analytics", { sourceId: source.id });
  }

  function operationsSourceAuthorizationEntryUrl(source) {
    return operationsPublicUrl(source?.publicUrl)
      || operationsPublicUrl(source?.skillItem?.endpointUrl)
      || operationsProviderGuideUrl(source);
  }

  function operationsSourceMetricLabels(source, operations) {
    const keys = arrayFrom(source?.supportedMetrics).length
      ? arrayFrom(source.supportedMetrics)
      : firstText(source?.skillItem?.metrics).split(/[,，、\s]+/);
    return keys.map((key) => {
      const normalized = firstText(key).toLowerCase();
      return firstText(operations.metricRecords?.[normalized]?.label, normalized);
    }).filter(Boolean);
  }

  function appendOperationsSourceDetailRow(labelKey, value) {
    if (!dom.operationsSourceDetailList) return;
    dom.operationsSourceDetailList.append(
      element("dt", "", t(labelKey)),
      element("dd", "", firstText(value, t("operations.source_value_not_provided")))
    );
  }

  function renderOperationsSourceDetail({ focusAuthorization = false } = {}) {
    const source = operationsSourceById(state.operationsSourceDetailId);
    if (!source || !dom.operationsSourceDetailDialog) return;
    const operations = currentOperations();
    const authorized = operationsSourceAuthorized(source);
    const readiness = operationsSourceReadinessKey(source);
    const label = operationsAuthorizationSourceLabel(source);
    dom.operationsSourceDetailTitle.textContent = label;
    dom.operationsSourceDetailState.dataset.state = authorized ? "configured" : readiness;
    dom.operationsSourceDetailState.textContent = t(authorized
      ? "operations.source_detail_active"
      : readiness === "needs_information"
        ? "operations.source_detail_needs_information"
        : readiness === "pending_verification"
          ? "operations.source_detail_pending_verification"
          : "operations.source_detail_pending");

    dom.operationsSourceDetailList.replaceChildren();
    appendOperationsSourceDetailRow("operations.source_field_integration", t("operations.source_value_integrated"));
    appendOperationsSourceDetailRow(
      "operations.source_field_readiness",
      t(source.authorizationReady
        ? "operations.source_value_ready"
        : readiness === "pending_verification"
          ? "operations.source_value_pending_verification"
          : "operations.source_value_needs_information")
    );
    appendOperationsSourceDetailRow(
      "operations.source_field_authorization",
      t(
        authorized
          ? "operations.source_value_authorized"
          : source.authorizationReady
            ? "operations.source_value_pending"
            : "operations.source_value_not_provided"
      )
    );
    appendOperationsSourceDetailRow(
      "operations.source_field_module",
      firstText(source.skillItem?.moduleHint, source.sourceRef)
    );
    appendOperationsSourceDetailRow(
      "operations.source_field_metrics",
      operationsSourceMetricLabels(source, operations).join("、")
    );
    appendOperationsSourceDetailRow(
      "operations.source_field_entry",
      firstText(source.publicUrl, source.skillItem?.endpointUrl)
    );
    appendOperationsSourceDetailRow(
      "operations.source_field_adapter",
      firstText(source.skillItem?.adapterNotes, source.adapterId)
    );

    dom.operationsSourceFlowSteps.replaceChildren();
    const flowSteps = [
      t("operations.source_flow_skill", { name: label }),
      t("operations.source_flow_integrated"),
    ];
    if (!source.authorizationReady) {
      flowSteps.push(t(
        readiness === "pending_verification"
          ? "operations.source_flow_verify_pending"
          : "operations.source_flow_complete_information"
      ));
      arrayFrom(source.authorizationMissingFields).forEach((item) => {
        flowSteps.push(firstText(item.prompt, item.label, item.field));
      });
    } else {
      flowSteps.push(t(authorized ? "operations.source_flow_authorize_done" : "operations.source_flow_authorize_pending"));
      flowSteps.push(t("operations.source_flow_refresh"));
    }
    flowSteps.forEach((step) => dom.operationsSourceFlowSteps.append(element("li", "", step)));
    dom.operationsSourcePrivacy.textContent = t("operations.source_privacy", {
      days: source.retentionDays ?? operations.privacy.retentionDays ?? 30,
    });
    dom.operationsSourceDetailError.hidden = true;
    dom.operationsSourceDetailError.textContent = "";

    const entryUrl = operationsSourceAuthorizationEntryUrl(source);
    dom.openOperationsSourceAuthorizationButton.hidden = !entryUrl || authorized || !source.authorizationReady;
    dom.openOperationsSourceAuthorizationButton.textContent = t("operations.authorization_open_entry");
    dom.openOperationsSourceAuthorizationButton.dataset.url = entryUrl;
    dom.openOperationsSourceAuthorizationButton.disabled = state.operationsSourceAuthorizationBusy;
    const needsInformation = operationsSourceMissingInformation(source).length > 0;
    dom.authorizeOperationsSourceButton.hidden = authorized || (!source.authorizationReady && !needsInformation);
    dom.authorizeOperationsSourceButton.disabled = state.operationsSourceAuthorizationBusy;
    dom.authorizeOperationsSourceButton.textContent = t(
      state.operationsSourceAuthorizationBusy
        ? "operations.authorization_busy"
        : !source.authorizationReady
          ? needsInformation
            ? "operations.authorization_complete_info"
            : "operations.authorization_view_requirements"
          : "operations.authorization_authorize"
    );

    if (focusAuthorization && !authorized && source.authorizationReady) {
      window.setTimeout(() => dom.authorizeOperationsSourceButton?.focus(), 0);
    }
  }

  function openOperationsSourceDetail(sourceId, { focusAuthorization = false } = {}) {
    if (!sourceId || !operationsSourceById(sourceId) || !dom.operationsSourceDetailDialog) return;
    state.operationsSourceDetailId = sourceId;
    renderOperationsSourceDetail({ focusAuthorization });
    if (typeof dom.operationsSourceDetailDialog.showModal === "function") {
      if (!dom.operationsSourceDetailDialog.open) dom.operationsSourceDetailDialog.showModal();
    } else {
      dom.operationsSourceDetailDialog.setAttribute("open", "");
    }
  }

  function closeOperationsSourceDetail() {
    if (state.operationsSourceAuthorizationBusy) return;
    closeDialog(dom.operationsSourceDetailDialog);
    state.operationsSourceDetailId = "";
  }

  function openSelectedOperationsSourceAuthorizationEntry() {
    const source = operationsSourceById(state.operationsSourceDetailId);
    const url = operationsSourceAuthorizationEntryUrl(source);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function authorizeSelectedOperationsSource() {
    if (!state.currentId || state.operationsSourceAuthorizationBusy) return;
    const source = operationsSourceById(state.operationsSourceDetailId);
    if (!source || operationsSourceAuthorized(source) || !source.integrationReady) return;
    if (!source.authorizationReady) {
      if (operationsSourceMissingInformation(source).length) {
        openOperationsSourceCompletion(source);
      }
      return;
    }
    state.operationsSourceAuthorizationBusy = true;
    renderOperationsSourceDetail();
    try {
      const response = await request(
        `/apps/${encodeURIComponent(state.currentId)}/operations/source/authorization`,
        {
          method: "POST",
          json: { source_id: source.id, authorized: true },
          timeoutMs: 30_000,
        }
      );
      const normalized = mergeOperationsState(state.current?.operations, response);
      state.operations = normalized;
      state.current.operations = normalized;
      renderOperations();
      renderOperationsSourceDetail();
      showToast(
        t("operations.authorization_success", { name: operationsAuthorizationSourceLabel(source) }),
        "success",
        4_000
      );
    } catch (error) {
      dom.operationsSourceDetailError.textContent = friendlyError(error, t("operations.authorization_failed"));
      dom.operationsSourceDetailError.hidden = false;
    } finally {
      state.operationsSourceAuthorizationBusy = false;
      renderOperationsSourceDetail();
    }
  }

  const GUIDED_SETUP_CUSTOM_ID = "custom";

  function operationsGuidedSetupFlow(kind) {
    if (kind === "feedback") {
      return [
        {
          id: "channel",
          type: "choice",
          allowMultiple: false,
          required: true,
          promptKey: "operations.guided_feedback_channel",
          options: [
            { id: "in_app", labelKey: "operations.guided_channel_in_app" },
            { id: "email", labelKey: "operations.guided_channel_email" },
            { id: "api", labelKey: "operations.guided_channel_api" },
            { id: "widget", labelKey: "operations.guided_channel_widget" },
          ],
        },
        {
          id: "module",
          type: "text",
          required: true,
          promptKey: "operations.guided_feedback_module",
          placeholderKey: "operations.guided_feedback_module_placeholder",
        },
        {
          id: "endpoint",
          type: "text",
          required: false,
          promptKey: "operations.guided_feedback_endpoint",
        },
      ];
    }
    if (kind === "traffic") {
      return [
        {
          id: "platform",
          type: "choice",
          allowMultiple: false,
          required: true,
          promptKey: "operations.guided_traffic_platform",
          options: [
            { id: "wechat", labelKey: "operations.guided_platform_wechat" },
            { id: "douyin", labelKey: "operations.guided_platform_douyin" },
            { id: "xhs", labelKey: "operations.guided_platform_xhs" },
            { id: "google", labelKey: "operations.guided_platform_google" },
            { id: "meta", labelKey: "operations.guided_platform_meta" },
            { id: "other", labelKey: "operations.guided_platform_other", isCustom: true },
          ],
        },
        {
          id: "method",
          type: "choice",
          allowMultiple: false,
          required: true,
          promptKey: "operations.guided_traffic_method",
          options: [
            { id: "feed", labelKey: "operations.guided_method_feed" },
            { id: "search", labelKey: "operations.guided_method_search" },
            { id: "kol", labelKey: "operations.guided_method_kol" },
            { id: "other", labelKey: "operations.guided_method_other", isCustom: true },
          ],
        },
        {
          id: "target",
          type: "url",
          required: true,
          promptKey: "operations.guided_traffic_target",
          placeholderKey: "operations.guided_traffic_target_placeholder",
        },
        {
          id: "budget",
          type: "text",
          required: false,
          promptKey: "operations.guided_traffic_budget",
          placeholderKey: "operations.guided_traffic_budget_placeholder",
        },
      ];
    }
    return [
      {
        id: "metrics",
        type: "choice",
        allowMultiple: true,
        required: true,
        promptKey: "operations.guided_analytics_metrics",
        options: [
          { id: "page_views", labelKey: "operations.guided_metric_page_views" },
          { id: "feature_usage", labelKey: "operations.guided_metric_feature_usage" },
          { id: "retention", labelKey: "operations.guided_metric_retention" },
          { id: "errors", labelKey: "operations.guided_metric_errors" },
        ],
      },
      {
        id: "source",
        type: "choice",
        allowMultiple: true,
        required: true,
        promptKey: "operations.guided_analytics_source",
        options: [
          { id: "in_app", labelKey: "operations.guided_source_in_app" },
          { id: "nginx", labelKey: "operations.guided_source_nginx" },
          { id: "mysql", labelKey: "operations.guided_source_mysql" },
          { id: "api", labelKey: "operations.guided_source_api" },
        ],
      },
      {
        id: "module",
        type: "text",
        required: true,
        promptKey: "operations.guided_analytics_module",
        placeholderKey: "operations.guided_analytics_module_placeholder",
      },
      {
        id: "endpoint",
        type: "url",
        required: state.operationsGuidedSetup.sourceId
          ? operationsSourceById(state.operationsGuidedSetup.sourceId)?.kind === "public_platform"
          : true,
        promptKey: state.operationsGuidedSetup.sourceId
          ? "operations.guided_analytics_endpoint_assisted"
          : "operations.guided_analytics_endpoint",
        placeholderKey: "operations.guided_analytics_endpoint_placeholder",
      },
    ];
  }

  function guidedSetupChoiceOptions(step) {
    if (!step || step.type !== "choice") return [];
    const hasCustom = step.options.some((option) => option.isCustom || option.id === GUIDED_SETUP_CUSTOM_ID);
    return hasCustom ? step.options : [
      ...step.options,
      { id: GUIDED_SETUP_CUSTOM_ID, labelKey: "operations.guided_option_custom", isCustom: true },
    ];
  }

  function guidedSetupCustomFieldKey(stepId) {
    return `${stepId}__custom`;
  }

  function guidedSetupUsesCustomInput(step) {
    if (!step || step.type !== "choice") return false;
    const selected = guidedSetupSelectedValues(step);
    return selected.some((value) => value === GUIDED_SETUP_CUSTOM_ID || value === "other");
  }

  function guidedSetupRecommendedValues(step) {
    const recommended = firstText(state.operationsGuidedSetup.recommendations?.[step.id]);
    if (!recommended) return [];
    if (step.type === "choice" && step.allowMultiple) {
      return recommended.split(/[,，、]/).map((item) => item.trim()).filter(Boolean);
    }
    return recommended ? [recommended] : [];
  }

  function parseGuidedSetupChoiceAnswer(step, rawValue) {
    if (!rawValue) return step?.allowMultiple ? [] : "";
    if (step?.allowMultiple) {
      return String(rawValue).split(/[,，、]/).map((item) => item.trim()).filter(Boolean);
    }
    return firstText(rawValue);
  }

  function deriveGuidedSetupFromSkillDraft(kind, draft, operations) {
    const guided = draft?.guided_setup;
    if (guided && (Object.keys(guided.answers || {}).length || Object.keys(guided.recommendations || {}).length)) {
      return {
        answers: { ...(guided.answers || {}) },
        recommendations: { ...(guided.recommendations || {}) },
        reasons: { ...(guided.reasons || {}) },
      };
    }
    const answers = {};
    const recommendations = {};
    const reasons = {};
    if (kind === "analytics") {
      const sources = arrayFrom(draft?.data_sources);
      const metricTokens = new Set();
      const sourceTokens = new Set();
      let moduleHint = "";
      let endpoint = "";
      sources.forEach((source) => {
        moduleHint = moduleHint || firstText(source.module_hint, source.moduleHint);
        endpoint = endpoint || firstText(source.endpoint_url, source.endpointUrl);
        const metricsText = firstText(source.metrics).toLowerCase();
        if (/page.?view|页面|访问/.test(metricsText)) metricTokens.add("page_views");
        if (/feature|功能|usage/.test(metricsText)) metricTokens.add("feature_usage");
        if (/retention|留存|active|活跃/.test(metricsText)) metricTokens.add("retention");
        if (/error|crash|错误|崩溃/.test(metricsText)) metricTokens.add("errors");
        const kindLabel = firstText(source.kind).toLowerCase();
        const notes = firstText(source.adapter_notes, source.adapterNotes, source.name).toLowerCase();
        if (kindLabel === "api_dashboard" || /api|dashboard|看板/.test(notes)) sourceTokens.add("api");
        else if (/nginx|log|日志/.test(notes)) sourceTokens.add("nginx");
        else if (/mysql|database|数据库/.test(notes)) sourceTokens.add("mysql");
        else sourceTokens.add("in_app");
      });
      if (metricTokens.size) {
        answers.metrics = [...metricTokens].join(",");
        recommendations.metrics = answers.metrics;
        reasons.metrics = firstText(draft?.summary) || t("operations.guided_prefilled_notice");
      }
      if (sourceTokens.size) {
        answers.source = [...sourceTokens].join(",");
        recommendations.source = answers.source;
        reasons.source = firstText(draft?.summary) || t("operations.guided_prefilled_notice");
      }
      if (moduleHint) {
        answers.module = moduleHint;
        recommendations.module = moduleHint;
      }
      if (endpoint) {
        answers.endpoint = endpoint;
        recommendations.endpoint = endpoint;
      }
    } else if (kind === "feedback") {
      const source = arrayFrom(draft?.data_sources)[0];
      if (source) {
        const notes = firstText(source.adapter_notes, source.adapterNotes, source.name, source.description).toLowerCase();
        if (/api/.test(notes) || firstText(source.kind) === "api_dashboard") answers.channel = "api";
        else if (/email|mail|邮箱/.test(notes)) answers.channel = "email";
        else if (/widget|组件/.test(notes)) answers.channel = "widget";
        else answers.channel = "in_app";
        recommendations.channel = answers.channel;
        answers.module = firstText(source.module_hint, source.moduleHint, source.description);
        recommendations.module = answers.module;
        answers.endpoint = firstText(source.endpoint_url, source.endpointUrl);
        recommendations.endpoint = answers.endpoint;
      }
    } else if (kind === "traffic") {
      const item = arrayFrom(draft?.campaign_items)[0];
      if (item) {
        const platform = firstText(item.platform).toLowerCase();
        if (/微信|wechat/.test(platform)) answers.platform = "wechat";
        else if (/抖音|douyin/.test(platform)) answers.platform = "douyin";
        else if (/小红书|xhs/.test(platform)) answers.platform = "xhs";
        else if (/google/.test(platform)) answers.platform = "google";
        else if (/meta|facebook/.test(platform)) answers.platform = "meta";
        else {
          answers.platform = "other";
          answers[guidedSetupCustomFieldKey("platform")] = firstText(item.platform);
        }
        recommendations.platform = answers.platform;
        answers.target = firstText(item.target_url, item.targetUrl);
        recommendations.target = answers.target;
        answers.budget = firstText(item.budget);
        recommendations.budget = answers.budget;
        const method = firstText(item.method).toLowerCase();
        if (/feed|信息流/.test(method)) answers.method = "feed";
        else if (/search|搜索/.test(method)) answers.method = "search";
        else if (/kol|达人|内容/.test(method)) answers.method = "kol";
        else {
          answers.method = "other";
          answers[guidedSetupCustomFieldKey("method")] = firstText(item.method);
        }
        recommendations.method = answers.method;
      }
    }
    const urls = operationsPrefillUrls(operations || {});
    if (kind === "traffic" && !answers.target && urls[0]) {
      answers.target = urls[0];
      recommendations.target = urls[0];
      reasons.target = t("operations.prefill_server");
    }
    return { answers, recommendations, reasons };
  }

  function deriveGuidedSetupFromSource(source, operations) {
    if (!source) return { answers: {}, recommendations: {}, reasons: {} };
    const item = source.skillItem || {};
    const answers = {};
    const reasons = {};
    const metricIds = arrayFrom(source.supportedMetrics).filter(Boolean);
    if (metricIds.length) answers.metrics = metricIds.join(",");
    const notes = [
      firstText(item.adapterNotes),
      firstText(source.adapterId),
      firstText(source.sourceRef),
      firstText(item.name),
    ].join(" ").toLowerCase();
    if (/nginx|server.?log/.test(notes)) answers.source = "nginx";
    else if (/mysql|database/.test(notes)) answers.source = "mysql";
    else if (/api|dashboard/.test(notes)) answers.source = "api";
    else answers.source = "in_app";
    answers.module = firstText(
      item.moduleHint,
      source.sourceRef,
      item.description,
      source.displayName,
    );
    answers.endpoint = firstText(item.endpointUrl, source.publicUrl);
    if (!answers.endpoint) {
      const relativeApi = firstText(source.sourceRef, item.description).match(/\/api\/[a-z0-9_./-]+/i)?.[0];
      const publicRoot = operationsPrefillUrls(operations || {})[0];
      if (relativeApi && publicRoot) {
        try {
          answers.endpoint = new URL(relativeApi, publicRoot).toString();
        } catch (_error) {
          answers.endpoint = "";
        }
      }
    }
    Object.keys(answers).forEach((key) => {
      if (!firstText(answers[key])) delete answers[key];
      else reasons[key] = t("operations.guided_prefilled_notice");
    });
    return {
      answers,
      recommendations: { ...answers },
      reasons,
    };
  }

  function applyGuidedSetupPrefill(kind, draftBundle) {
    const setup = state.operationsGuidedSetup;
    setup.recommendations = { ...(draftBundle.recommendations || {}) };
    setup.reasons = { ...(draftBundle.reasons || {}) };
    setup.answers = {};
    Object.entries(draftBundle.answers || {}).forEach(([stepId, rawValue]) => {
      const step = operationsGuidedSetupFlow(kind).find((item) => item.id === stepId);
      if (!step) {
        setup.answers[stepId] = rawValue;
        return;
      }
      if (step.type === "choice") {
        setup.answers[stepId] = step.allowMultiple
          ? parseGuidedSetupChoiceAnswer(step, rawValue)
          : parseGuidedSetupChoiceAnswer(step, rawValue);
      } else {
        setup.answers[stepId] = firstText(rawValue);
      }
    });
    setup.prefilled = Object.keys(setup.answers).length > 0;
  }

  function applyGuidedSetupRecommendation(step = currentGuidedSetupStep()) {
    if (!step) return;
    const recommended = firstText(state.operationsGuidedSetup.recommendations?.[step.id]);
    if (!recommended) return;
    if (step.type === "choice") {
      state.operationsGuidedSetup.answers[step.id] = step.allowMultiple
        ? parseGuidedSetupChoiceAnswer(step, recommended)
        : firstText(recommended);
    } else {
      state.operationsGuidedSetup.answers[step.id] = recommended;
    }
    if (dom.operationsGuidedSetupError) dom.operationsGuidedSetupError.hidden = true;
    renderOperationsGuidedSetupStep();
  }

  async function assistOperationsGuidedSetup() {
    const setup = state.operationsGuidedSetup;
    const step = currentGuidedSetupStep();
    if (!step || setup.busy || setup.loading) return;
    if (firstText(setup.recommendations?.[step.id])) {
      applyGuidedSetupRecommendation(step);
      showToast(t("operations.guided_ai_applied"), "success", 3500);
      return;
    }

    setup.loading = true;
    if (dom.operationsGuidedSetupError) dom.operationsGuidedSetupError.hidden = true;
    renderOperationsGuidedSetupStep();
    try {
      const kind = setup.kind;
      const draft = await generateOperationsSkillDraftForKind(kind, {
        silent: true,
        returnDraft: true,
      });
      const bundle = deriveGuidedSetupFromSkillDraft(kind, draft, currentOperations());
      setup.recommendations = {
        ...(setup.recommendations || {}),
        ...(bundle.recommendations || {}),
      };
      setup.reasons = {
        ...(setup.reasons || {}),
        ...(bundle.reasons || {}),
      };
      setup.loading = false;
      if (firstText(setup.recommendations?.[step.id])) {
        applyGuidedSetupRecommendation(step);
        showToast(t("operations.guided_ai_applied"), "success", 3500);
      } else {
        renderOperationsGuidedSetupStep();
        showGuidedSetupError(t("operations.guided_ai_unavailable"));
      }
    } catch (error) {
      setup.loading = false;
      renderOperationsGuidedSetupStep();
      showGuidedSetupError(friendlyError(error, t("operations.guided_ai_unavailable")));
    }
  }

  function shouldAutoGenerateOperationsSkillDraft(kind, operations) {
    const skill = operationsSkillByKind(operations, kind);
    if (!skill || skill.management === "manual") return false;
    if (arrayFrom(skill.dataSources).length && kind !== "traffic") return false;
    if (kind === "traffic" && arrayFrom(skill.campaignItems).length) return false;
    const generation = skill.draftGeneration || { status: "idle" };
    const local = state.operationsSkillGeneration[kind];
    if (generation.status === "running" || local?.status === "running") return false;
    if (skill.draft && generation.status === "completed") return false;
    if (state.operationsSkillAutoGenerateAttempted[kind]) return false;
    return true;
  }

  function maybeAutoGenerateOperationsSkillDrafts(operations) {
    if (!state.growthOpen || !operations) return;
    ["analytics", "feedback", "traffic"].forEach((kind) => {
      if (!shouldAutoGenerateOperationsSkillDraft(kind, operations)) return;
      state.operationsSkillAutoGenerateAttempted[kind] = true;
      void generateOperationsSkillDraftForKind(kind, { silent: true });
    });
  }

  async function waitForOperationsSkillDraft(kind, { timeoutMs = OPERATIONS_SKILL_GENERATE_MAX_WAIT_MS } = {}) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      await loadOperations({ silent: true });
      const operations = currentOperations();
      const skill = operationsSkillByKind(operations, kind);
      const generation = skill?.draftGeneration || { status: "idle" };
      if (generation.status === "completed" && skill?.draft) return skill.draft;
      if (generation.status === "error") return null;
      if (generation.status !== "running") return skill?.draft || null;
      await new Promise((resolve) => window.setTimeout(resolve, OPERATIONS_SKILL_GENERATE_POLL_MS));
    }
    return null;
  }

  function mergeOperationsSkillGenerateResponse(kind, response) {
    if (!response?.skill) return currentOperations();
    const normalized = mergeOperationsState(currentOperations(), {
      [operationsSkillPayloadKey(kind)]: response.skill,
    });
    state.operations = normalized;
    state.current.operations = normalized;
    return normalized;
  }

  function markOperationsSkillGenerationRunning(kind, { background = true, userEdited = false } = {}) {
    state.operationsSkillGeneration[kind] = {
      status: "running",
      userEdited,
      draft: null,
      error: "",
      background,
    };
  }

  async function ensureGuidedSetupRecommendations(kind) {
    const operations = currentOperations();
    const skill = operationsSkillByKind(operations, kind);
    let draft = skill?.draft || null;
    const generation = skill?.draftGeneration || { status: "idle" };
    if (!draft && generation.status === "running") {
      state.operationsGuidedSetup.loading = true;
      renderOperationsGuidedSetupStep();
      draft = await waitForOperationsSkillDraft(kind);
      state.operationsGuidedSetup.loading = false;
    } else if (!draft && shouldAutoGenerateOperationsSkillDraft(kind, operations)) {
      state.operationsSkillAutoGenerateAttempted[kind] = true;
      state.operationsGuidedSetup.loading = true;
      renderOperationsGuidedSetupStep();
      draft = await generateOperationsSkillDraftForKind(kind, { silent: true, returnDraft: true });
      state.operationsGuidedSetup.loading = false;
    }
    const generatedBundle = deriveGuidedSetupFromSkillDraft(kind, draft, operations);
    const sourceBundle = state.operationsGuidedSetup.sourceId
      ? deriveGuidedSetupFromSource(
          operationsSourceById(state.operationsGuidedSetup.sourceId),
          operations,
        )
      : { answers: {}, recommendations: {}, reasons: {} };
    const bundle = {
      answers: { ...(generatedBundle.answers || {}), ...(sourceBundle.answers || {}) },
      recommendations: {
        ...(generatedBundle.recommendations || {}),
        ...(sourceBundle.recommendations || {}),
      },
      reasons: { ...(generatedBundle.reasons || {}), ...(sourceBundle.reasons || {}) },
    };
    applyGuidedSetupPrefill(kind, bundle);
    renderOperationsGuidedSetupStep();
    if (state.operationsGuidedSetup.prefilled) {
      showToast(t("operations.guided_prefilled_notice"), "success", 4500);
    }
  }

  function operationsGuidedSetupTitleKey(kind) {
    if (kind === "feedback") return "operations.guided_title_feedback";
    if (kind === "traffic") return "operations.guided_title_traffic";
    return "operations.guided_title_analytics";
  }

  function analyticsNeedsGuidedSetup(operations) {
    if (Object.values(operations.metricRecords || {}).some((item) => item.status === "available")) return false;
    const skill = operations.analyticsSkill || operations.operationsSkill;
    return !arrayFrom(skill?.dataSources).length;
  }

  function feedbackNeedsGuidedSetup(operations) {
    const channels = arrayFrom(operations.feedbackCollection?.channels);
    const skillSources = arrayFrom(operations.feedbackSkill?.dataSources);
    return !channels.length && !skillSources.length;
  }

  function trafficNeedsGuidedSetup(operations) {
    const campaigns = arrayFrom(operations.trafficSkill?.campaignItems);
    const platforms = arrayFrom(operations.trafficState?.platforms);
    return !campaigns.length && !platforms.length;
  }

  function appendActivationGuidedButton(container, kind) {
    if (!container) return;
    const skill = operationsSkillByKind(currentOperations(), kind);
    if (skill?.draftGeneration?.status === "running") {
      container.append(element("p", "ops-module-activation-copy", t("operations.skill_refining_activation")));
      return;
    }
    const button = element("button", "ops-authorization-button is-primary", t("operations.guided_complete_required"));
    button.type = "button";
    button.addEventListener("click", () => void openOperationsGuidedSetup(kind));
    container.append(button);
  }

  async function openOperationsGuidedSetup(kind = "analytics", { sourceId = "" } = {}) {
    if (!state.current) return;
    state.operationsGuidedSetup = {
      kind,
      sourceId,
      stepIndex: 0,
      answers: {},
      recommendations: {},
      reasons: {},
      busy: false,
      loading: false,
      prefilled: false,
    };
    if (dom.operationsGuidedSetupTitle) {
      dom.operationsGuidedSetupTitle.textContent = t(operationsGuidedSetupTitleKey(kind));
    }
    if (dom.operationsGuidedSetupError) {
      dom.operationsGuidedSetupError.hidden = true;
      dom.operationsGuidedSetupError.textContent = "";
    }
    renderOperationsGuidedSetupStep();
    if (typeof dom.operationsGuidedSetupDialog.showModal === "function") dom.operationsGuidedSetupDialog.showModal();
    else dom.operationsGuidedSetupDialog.setAttribute("open", "");
    await ensureGuidedSetupRecommendations(kind);
  }

  function currentGuidedSetupStep() {
    const flow = operationsGuidedSetupFlow(state.operationsGuidedSetup.kind);
    return flow[state.operationsGuidedSetup.stepIndex] || null;
  }

  function guidedSetupSelectedValues(step) {
    const raw = state.operationsGuidedSetup.answers[step.id];
    if (step.allowMultiple) return arrayFrom(raw);
    return firstText(raw) ? [firstText(raw)] : [];
  }

  function toggleGuidedSetupChoice(step, optionId) {
    if (step.allowMultiple) {
      const current = new Set(guidedSetupSelectedValues(step));
      if (current.has(optionId)) current.delete(optionId);
      else current.add(optionId);
      state.operationsGuidedSetup.answers[step.id] = [...current];
    } else {
      state.operationsGuidedSetup.answers[step.id] = optionId;
    }
    renderOperationsGuidedSetupStep();
  }

  function syncOperationsGuidedSetupInput() {
    const step = currentGuidedSetupStep();
    if (!step || step.type === "choice") return;
    state.operationsGuidedSetup.answers[step.id] = dom.operationsGuidedSetupInput.value;
  }

  function syncOperationsGuidedSetupCustomInput() {
    const step = currentGuidedSetupStep();
    if (!step || step.type !== "choice") return;
    state.operationsGuidedSetup.answers[guidedSetupCustomFieldKey(step.id)] = dom.operationsGuidedSetupCustomInput.value;
  }

  function renderOperationsGuidedSetupStep() {
    const flow = operationsGuidedSetupFlow(state.operationsGuidedSetup.kind);
    const step = currentGuidedSetupStep();
    if (!step || !dom.operationsGuidedSetupQuestion) return;
    if (dom.operationsGuidedSetupProgress) {
      dom.operationsGuidedSetupProgress.textContent = t("operations.guided_progress", {
        current: state.operationsGuidedSetup.stepIndex + 1,
        total: flow.length,
      });
    }
    if (dom.operationsGuidedSetupLoading) {
      dom.operationsGuidedSetupLoading.hidden = !state.operationsGuidedSetup.loading;
      dom.operationsGuidedSetupLoading.textContent = state.operationsGuidedSetup.loading
        ? t("operations.guided_loading_recommendations")
        : "";
    }
    dom.operationsGuidedSetupQuestion.textContent = t(step.promptKey);
    const reason = firstText(state.operationsGuidedSetup.reasons?.[step.id]);
    if (dom.operationsGuidedSetupReason) {
      dom.operationsGuidedSetupReason.hidden = !reason || state.operationsGuidedSetup.loading;
      dom.operationsGuidedSetupReason.textContent = reason;
    }
    dom.operationsGuidedSetupOptions.replaceChildren();
    const recommendedValues = new Set(guidedSetupRecommendedValues(step));
    dom.operationsGuidedSetupInputWrap.hidden = step.type === "choice";
    if (step.type === "choice") {
      guidedSetupChoiceOptions(step).forEach((option) => {
        const button = element("button", "guided-setup-option");
        button.type = "button";
        button.append(document.createTextNode(t(option.labelKey)));
        const selected = guidedSetupSelectedValues(step).includes(option.id);
        button.classList.toggle("is-selected", selected);
        if (recommendedValues.has(option.id)) {
          button.classList.add("is-recommended");
          button.append(element("span", "guided-setup-option-badge", t("operations.guided_recommended_badge")));
        }
        button.addEventListener("click", () => toggleGuidedSetupChoice(step, option.id));
        dom.operationsGuidedSetupOptions.append(button);
      });
      const showCustom = guidedSetupUsesCustomInput(step);
      if (dom.operationsGuidedSetupCustomWrap) dom.operationsGuidedSetupCustomWrap.hidden = !showCustom;
      if (dom.operationsGuidedSetupCustomInput) {
        dom.operationsGuidedSetupCustomInput.value = firstText(
          state.operationsGuidedSetup.answers[guidedSetupCustomFieldKey(step.id)]
        );
        dom.operationsGuidedSetupCustomInput.placeholder = t("operations.guided_custom_placeholder");
      }
    } else if (dom.operationsGuidedSetupInput) {
      if (dom.operationsGuidedSetupCustomWrap) dom.operationsGuidedSetupCustomWrap.hidden = true;
      const currentValue = firstText(state.operationsGuidedSetup.answers[step.id]);
      dom.operationsGuidedSetupInput.value = currentValue;
      const recommended = firstText(state.operationsGuidedSetup.recommendations?.[step.id]);
      dom.operationsGuidedSetupInput.placeholder = step.placeholderKey
        ? t(step.placeholderKey)
        : recommended || "";
      dom.operationsGuidedSetupInput.type = step.type === "url" ? "url" : "text";
    }
    if (dom.operationsGuidedSetupApplyButton) {
      dom.operationsGuidedSetupApplyButton.hidden = false;
      dom.operationsGuidedSetupApplyButton.disabled = state.operationsGuidedSetup.busy || state.operationsGuidedSetup.loading;
      dom.operationsGuidedSetupApplyButton.replaceChildren(
        element("span", "", state.operationsGuidedSetup.loading ? "…" : "✦"),
        element("span", "", t(
          state.operationsGuidedSetup.loading
            ? "operations.guided_ai_assisting"
            : "operations.guided_ai_assist"
        )),
      );
    }
    if (dom.operationsGuidedSetupBackButton) {
      dom.operationsGuidedSetupBackButton.disabled = state.operationsGuidedSetup.stepIndex <= 0
        || state.operationsGuidedSetup.busy
        || state.operationsGuidedSetup.loading;
    }
    if (dom.operationsGuidedSetupNextButton) {
      dom.operationsGuidedSetupNextButton.textContent = t(
        state.operationsGuidedSetup.stepIndex >= flow.length - 1 ? "operations.guided_finish" : "operations.guided_next"
      );
      dom.operationsGuidedSetupNextButton.disabled = state.operationsGuidedSetup.busy || state.operationsGuidedSetup.loading;
    }
  }

  function validateGuidedSetupStep(step) {
    if (!step) return false;
    if (step.type === "choice") {
      const selected = guidedSetupSelectedValues(step);
      if (!selected.length) {
        return !step.required ? true : (showGuidedSetupError(t("operations.guided_pick_one")), false);
      }
      if (guidedSetupUsesCustomInput(step)) {
        syncOperationsGuidedSetupCustomInput();
        const customValue = firstText(state.operationsGuidedSetup.answers[guidedSetupCustomFieldKey(step.id)]);
        if (!customValue) {
          showGuidedSetupError(t("operations.guided_custom_required"));
          return false;
        }
      }
      return true;
    }
    syncOperationsGuidedSetupInput();
    const value = firstText(state.operationsGuidedSetup.answers[step.id]);
    if (!value) return step.required ? (showGuidedSetupError(t("operations.guided_fill_required")), false) : true;
    if (step.type === "url" && !operationsPublicUrl(value)) {
      showGuidedSetupError(t("operations.skill_url_invalid"));
      return false;
    }
    return true;
  }

  function showGuidedSetupError(message) {
    if (!dom.operationsGuidedSetupError) return;
    dom.operationsGuidedSetupError.textContent = message;
    dom.operationsGuidedSetupError.hidden = false;
  }

  function stepOperationsGuidedSetup(delta) {
    const flow = operationsGuidedSetupFlow(state.operationsGuidedSetup.kind);
    state.operationsGuidedSetup.stepIndex = Math.max(0, Math.min(flow.length - 1, state.operationsGuidedSetup.stepIndex + delta));
    if (dom.operationsGuidedSetupError) dom.operationsGuidedSetupError.hidden = true;
    renderOperationsGuidedSetupStep();
  }

  async function advanceOperationsGuidedSetup() {
    const flow = operationsGuidedSetupFlow(state.operationsGuidedSetup.kind);
    const step = currentGuidedSetupStep();
    if (!step || !validateGuidedSetupStep(step)) return;
    if (dom.operationsGuidedSetupError) dom.operationsGuidedSetupError.hidden = true;
    if (state.operationsGuidedSetup.stepIndex >= flow.length - 1) {
      await finishOperationsGuidedSetup();
      return;
    }
    stepOperationsGuidedSetup(1);
  }

  function normalizeGuidedAnswerList(value) {
    if (Array.isArray(value)) return value.map((item) => firstText(item)).filter(Boolean);
    const single = firstText(value);
    return single ? [single] : [];
  }

  function guidedMetricLabels(ids, answers = {}) {
    const map = {
      page_views: t("operations.guided_metric_page_views"),
      feature_usage: t("operations.guided_metric_feature_usage"),
      retention: t("operations.guided_metric_retention"),
      errors: t("operations.guided_metric_errors"),
    };
    const custom = firstText(answers[`metrics__custom`]);
    return arrayFrom(ids)
      .map((id) => (id === GUIDED_SETUP_CUSTOM_ID ? custom : map[id] || id))
      .filter(Boolean)
      .join("、");
  }

  function guidedSetupResolvedChoiceLabel(stepId, answers, map) {
    const raw = firstText(answers[stepId]);
    if (!raw) return "";
    if (raw === GUIDED_SETUP_CUSTOM_ID || raw === "other") {
      return firstText(answers[guidedSetupCustomFieldKey(stepId)]) || map.other || map[GUIDED_SETUP_CUSTOM_ID] || raw;
    }
    return map[raw] || raw;
  }

  function buildGuidedAnalyticsItems(answers) {
    const sourceMap = {
      in_app: { name: t("operations.guided_source_in_app"), kind: "internal", adapterNotes: "in-app event tracking" },
      nginx: { name: t("operations.guided_source_nginx"), kind: "internal", adapterNotes: "nginx/server log aggregates" },
      mysql: { name: t("operations.guided_source_mysql"), kind: "internal", adapterNotes: "mysql/database aggregates" },
      api: { name: t("operations.guided_source_api"), kind: "api_dashboard", adapterNotes: "external dashboard API" },
    };
    const moduleHint = firstText(answers.module);
    const metrics = guidedMetricLabels(normalizeGuidedAnswerList(answers.metrics), answers);
    const endpoint = firstText(answers.endpoint);
    const customSource = firstText(answers[guidedSetupCustomFieldKey("source")]);
    return normalizeGuidedAnswerList(answers.source).map((sourceId) => {
      if (sourceId === GUIDED_SETUP_CUSTOM_ID) {
        return {
          id: "",
          kind: "internal",
          name: customSource || t("operations.guided_option_custom"),
          description: moduleHint ? `适配页面/模块：${moduleHint}` : "",
          moduleHint,
          metrics,
          endpointUrl: endpoint,
          adapterNotes: "custom guided setup source",
        };
      }
      const base = sourceMap[sourceId] || sourceMap.in_app;
      return {
        id: "",
        kind: base.kind,
        name: base.name,
        description: moduleHint ? `适配页面/模块：${moduleHint}` : "",
        moduleHint,
        metrics,
        endpointUrl: endpoint,
        adapterNotes: base.adapterNotes,
      };
    });
  }

  function buildGuidedFeedbackItems(answers) {
    const channelMap = {
      in_app: t("operations.guided_channel_in_app"),
      email: t("operations.guided_channel_email"),
      api: t("operations.guided_channel_api"),
      widget: t("operations.guided_channel_widget"),
    };
    const channelId = firstText(answers.channel);
    const channel = channelId === GUIDED_SETUP_CUSTOM_ID
      ? firstText(answers[guidedSetupCustomFieldKey("channel")])
      : channelMap[channelId] || channelId;
    const moduleHint = firstText(answers.module);
    const endpoint = firstText(answers.endpoint);
    return [{
      id: "",
      kind: channelId === "api" ? "api_dashboard" : "internal",
      name: channel,
      description: moduleHint ? `反馈入口：${moduleHint}` : channel,
      moduleHint,
      metrics: "feedback_submissions",
      endpointUrl: channelId === "api" ? endpoint : "",
      adapterNotes: endpoint && channelId === "email" ? `email:${endpoint}` : "",
    }];
  }

  function buildGuidedTrafficItems(answers) {
    const platformMap = {
      wechat: t("operations.guided_platform_wechat"),
      douyin: t("operations.guided_platform_douyin"),
      xhs: t("operations.guided_platform_xhs"),
      google: t("operations.guided_platform_google"),
      meta: t("operations.guided_platform_meta"),
      other: t("operations.guided_platform_other"),
    };
    const methodMap = {
      feed: t("operations.guided_method_feed"),
      search: t("operations.guided_method_search"),
      kol: t("operations.guided_method_kol"),
      other: t("operations.guided_method_other"),
    };
    return [{
      id: "",
      platform: guidedSetupResolvedChoiceLabel("platform", answers, platformMap),
      method: guidedSetupResolvedChoiceLabel("method", answers, methodMap),
      budget: firstText(answers.budget),
      schedule: "",
      triggers: "",
      targetUrl: firstText(answers.target),
      audience: "",
      notes: "",
    }];
  }

  function mergeGuidedAnalyticsSourceItem(sourceId, generatedItems) {
    const operations = currentOperations();
    const source = operationsSourceById(sourceId);
    const existingItems = arrayFrom(operations.analyticsSkill?.dataSources).map((item) => ({ ...item }));
    if (!source || !generatedItems.length) return generatedItems;
    const sourceItem = source.skillItem || {};
    const sourceItemId = firstText(sourceItem.id);
    const sourceName = firstText(sourceItem.name, source.displayName);
    const replacement = {
      ...sourceItem,
      ...generatedItems[0],
      id: firstText(sourceItemId, generatedItems[0].id),
      name: firstText(sourceName, generatedItems[0].name),
      description: firstText(generatedItems[0].description, sourceItem.description),
      moduleHint: firstText(generatedItems[0].moduleHint, sourceItem.moduleHint, source.sourceRef),
      endpointUrl: firstText(generatedItems[0].endpointUrl, sourceItem.endpointUrl, source.publicUrl),
      adapterNotes: firstText(generatedItems[0].adapterNotes, sourceItem.adapterNotes, source.adapterId),
      metrics: firstText(generatedItems[0].metrics, sourceItem.metrics),
    };
    const index = existingItems.findIndex((item) => (
      (sourceItemId && firstText(item.id) === sourceItemId)
      || firstText(item.name).toLowerCase() === sourceName.toLowerCase()
    ));
    if (index >= 0) existingItems[index] = replacement;
    else existingItems.push(replacement);
    return existingItems;
  }

  async function finishOperationsGuidedSetup() {
    if (!state.current || state.operationsGuidedSetup.busy) return;
    const kind = state.operationsGuidedSetup.kind;
    const sourceId = state.operationsGuidedSetup.sourceId;
    const answers = { ...state.operationsGuidedSetup.answers };
    state.operationsGuidedSetup.busy = true;
    renderOperationsGuidedSetupStep();
    try {
      if (kind === "analytics") {
        const generatedItems = buildGuidedAnalyticsItems(answers);
        await persistOperationsSkillConfig("analytics", {
          configMode: "advanced",
          skillItems: sourceId
            ? mergeGuidedAnalyticsSourceItem(sourceId, generatedItems)
            : generatedItems,
          bodyAppend: `引导配置：统计 ${guidedMetricLabels(normalizeGuidedAnswerList(answers.metrics))}；适配模块 ${firstText(answers.module)}。`,
        });
      } else if (kind === "feedback") {
        await persistOperationsSkillConfig("feedback", {
          configMode: "advanced",
          skillItems: buildGuidedFeedbackItems(answers),
          bodyAppend: `引导配置：${firstText(answers.module)} 的用户反馈收集。`,
        });
      } else {
        await persistOperationsSkillConfig("traffic", {
          configMode: "advanced",
          campaignItems: buildGuidedTrafficItems(answers),
          bodyAppend: `引导配置：${firstText(answers.platform)} / ${firstText(answers.method)} 投放。`,
        });
      }
      closeDialog(dom.operationsGuidedSetupDialog);
      showToast(
        t(sourceId ? "operations.guided_source_saved" : "operations.guided_saved"),
        "success",
        5000,
      );
      renderOperations();
      if (sourceId) {
        const updated = operationsSourceById(sourceId)
          || skillDefinedAuthorizationSources(currentOperations()).find(
            (item) => firstText(item.skillItem?.name).toLowerCase()
              === firstText(answers.module).toLowerCase()
          );
        if (updated) openOperationsSourceDetail(updated.id, { focusAuthorization: updated.authorizationReady });
      }
    } catch (error) {
      showGuidedSetupError(friendlyError(error, t("operations.skill_failed")));
    } finally {
      state.operationsGuidedSetup.busy = false;
      renderOperationsGuidedSetupStep();
    }
  }

  function operationsSourceMatchingSkillItem(operations, item) {
    const name = firstText(item?.name).toLowerCase();
    const providerId = operationsProviderId(firstText(item?.name));
    return arrayFrom(operations?.dataSources).find((source) => {
      if (source.autoDetected) return false;
      return firstText(source.displayName).toLowerCase() === name
        || firstText(source.providerId).toLowerCase() === providerId;
    }) || null;
  }

  async function persistOperationsSkillConfig(kind, { configMode = "advanced", skillItems = [], campaignItems = [], bodyAppend = "" } = {}) {
    const operations = currentOperations();
    const isAnalytics = kind === "analytics";
    const isTraffic = kind === "traffic";
    const isFeedback = kind === "feedback";
    const previousSkill = isTraffic
      ? operations.trafficSkill
      : isAnalytics
        ? operations.analyticsSkill
        : operations.feedbackSkill;
    const defaultNameKey = isTraffic
      ? "operations.traffic_skill_default"
      : isFeedback
        ? "operations.feedback_skill_default"
        : "operations.analytics_skill_default";
    const bodyBase = firstText(previousSkill.instructions, previousSkill.summary);
    const body = [bodyBase, firstText(bodyAppend)].filter(Boolean).join("\n\n").trim();
    const dataSources = isAnalytics || isFeedback ? serializeSkillDataSources(skillItems) : [];
    const campaigns = isTraffic ? serializeSkillCampaignItems(campaignItems) : [];
    const instructions = isAnalytics || isTraffic || isFeedback
      ? compileOperationsSkillInstructions(kind, body, isTraffic ? campaignItems : skillItems)
      : body;
    const payload = {
      [operationsSkillPayloadKey(kind)]: serializeOperationsSkill(previousSkill, {
        name: firstText(previousSkill.name, t(defaultNameKey)),
        summary: body.slice(0, 2000),
        instructions,
        configMode,
        dataSources,
        campaignItems: campaigns,
        missingFields: remainingOperationsSkillMissingFields(previousSkill, dataSources),
      }),
    };
    if (isAnalytics && dataSources.length) {
      payload.data_sources = serializeOperationsSources(dataSources.map((item, index) => {
        const existing = operationsSourceMatchingSkillItem(operations, item);
        const authorized = operationsSourceAuthorized(existing);
        return {
          id: existing?.id || "",
          providerId: firstText(existing?.providerId, operationsProviderId(item.name || `source_${index}`)),
          displayName: item.name,
          kind: item.kind === "api_dashboard" ? "public_platform" : "custom",
          publicUrl: item.endpoint_url,
          sourceRef: firstText(item.module_hint, item.adapter_notes),
          integrationReady: true,
          configured: authorized,
          status: authorized ? "configured" : "needs_authorization",
          autoDetected: false,
          adapterId: firstText(existing?.adapterId, item.kind === "api_dashboard" ? "api_dashboard_adapter" : "internal_tracking"),
          accessMode: item.endpoint_url ? "public" : "authorized",
          privacyMode: "aggregate_only",
          rawEventStorage: false,
          minCohortSize: operations.privacy.minCohortSize,
          retentionDays: operations.privacy.retentionDays,
          allowedDimensions: operations.privacy.allowedDimensions,
          forbiddenFields: operations.privacy.forbiddenFields,
          supportedMetrics: existing?.supportedMetrics?.length
            ? existing.supportedMetrics
            : ["daily_active_users", "monthly_active_users", "new_users", "retention", "active_trend", "version_adoption", "errors", "crashes"],
        };
      }));
    } else if (isTraffic && campaigns.length) {
      payload.traffic_state = {
        status: "draft",
        summary: body.slice(0, 2000) || operations.trafficState.summary,
        platforms: campaigns.map((item) => ({
          name: item.platform,
          method: item.method,
          schedule: item.schedule,
          triggers: item.triggers,
          status: "draft",
        })),
        updated_at: new Date().toISOString(),
      };
    }
    const response = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/config`, {
      method: "POST",
      json: payload,
      timeoutMs: 45_000,
    });
    const normalized = mergeOperationsState(state.current?.operations, response);
    state.operations = normalized;
    state.current.operations = normalized;
    return normalized;
  }

  function renderTrafficActivation(operations) {
    if (!dom.trafficActivationStatus) return;
    const skill = operations.trafficSkill;
    const manual = skill?.management === "manual";
    const campaigns = arrayFrom(skill?.campaignItems);
    const platforms = campaigns.length
      ? campaigns
      : arrayFrom(operations.trafficState?.platforms);
    const needsSetup = trafficNeedsGuidedSetup(operations);
    const countLine = platforms.length
      ? t("operations.activation_platforms", { count: platforms.length })
      : needsSetup
        ? t("operations.activation_traffic_pending")
        : t("operations.activation_no_platforms");
    dom.trafficActivationStatus.textContent = `${t(manual ? "operations.activation_manual" : "operations.activation_auto")} · ${countLine}`;
    renderActivationList(dom.trafficActivationList, platforms.map((item) => {
      const name = firstText(item.platform, item.name);
      const method = firstText(item.method);
      return [name, method].filter(Boolean).join(" · ");
    }).filter(Boolean));
    if (!dom.trafficActivationActions) return;
    dom.trafficActivationActions.replaceChildren();
    if (needsSetup) appendActivationGuidedButton(dom.trafficActivationActions, "traffic");
  }

  function renderFeedbackPanel(operations) {
    if (!dom.eufrThemeList) return;
    const collection = operations.feedbackCollection || normalizeFeedbackCollection(null);
    const channels = arrayFrom(collection.channels);
    const detected = collection.status === "detected" && channels.length > 0;
    if (dom.feedbackCollectionStatus) {
      dom.feedbackCollectionStatus.dataset.state = detected ? "detected" : "not_detected";
      dom.feedbackCollectionStatus.textContent = t(detected ? "feedback.collection_detected" : "feedback.collection_not_detected");
    }
    const themes = arrayFrom(operations.eufrThemes);
    if (dom.eufrThemeCount) dom.eufrThemeCount.textContent = String(themes.length);
    const summary = buildLatestFeedbackSummary(themes);
    if (dom.feedbackSummary) {
      dom.feedbackSummary.hidden = !summary;
      dom.feedbackSummary.textContent = summary;
    }
    if (dom.feedbackSummaryEmpty) dom.feedbackSummaryEmpty.hidden = Boolean(summary) || themes.length === 0;
    dom.eufrThemeList.replaceChildren();
    const empty = themes.length === 0;
    if (dom.eufrEmpty) dom.eufrEmpty.hidden = !empty;
    dom.eufrThemeList.hidden = empty;
    themes.forEach((theme) => {
      const row = element("li", "eufr-theme-row");
      const copy = element("div", "");
      copy.append(element("strong", "", theme.title));
      const hint = [theme.summary, theme.priority !== "P2" ? theme.priority : ""].filter(Boolean).join(" · ");
      if (hint) copy.append(element("small", "", hint));
      const meta = element("div", "eufr-theme-meta");
      const chip = element("span", "eufr-status-chip", eufrStatusLabel(theme.status));
      chip.dataset.status = theme.status;
      meta.append(chip);
      if (theme.mergedCount > 1) meta.append(element("small", "", String(theme.mergedCount)));
      meta.append(element("span", "feedback-theme-detail-hint", t("feedback.view_detail")));
      row.append(copy, meta);
      row.addEventListener("click", () => openEufrDrawer(theme));
      dom.eufrThemeList.append(row);
    });
    if (state.eufrSelectedThemeId) {
      const selected = themes.find((item) => item.id === state.eufrSelectedThemeId);
      if (selected) openEufrDrawer(selected);
      else closeEufrDrawer();
    }
  }

  function markOperationsSkillEdited() {
    state.operationsSkillUserEdited = true;
    const key = operationsSkillGenerationKey();
    const local = state.operationsSkillGeneration[key];
    if (local?.status === "running") {
      local.userEdited = true;
    }
    clearOperationsSkillError();
  }

  function operationsSkillByKind(operations, kind) {
    if (kind === "traffic") return operations.trafficSkill;
    if (kind === "feedback") return operations.feedbackSkill;
    return operations.analyticsSkill || operations.operationsSkill;
  }

  function operationsSkillGenerationKinds() {
    return ["analytics", "traffic", "feedback"];
  }

  function isOperationsSkillGenerating(kind, operations = currentOperations(), skill = null) {
    const resolvedSkill = skill || operationsSkillByKind(operations, kind);
    const local = state.operationsSkillGeneration[kind];
    return local?.status === "running" || resolvedSkill?.draftGeneration?.status === "running";
  }

  function anyOperationsSkillGenerating(operations = currentOperations()) {
    return operationsSkillGenerationKinds().some((kind) => isOperationsSkillGenerating(kind, operations));
  }

  function maybeApplyCompletedSkillGeneration(kind, skill) {
    const mappedKind = kind === "traffic" ? "traffic" : kind === "feedback" ? "feedback" : "analytics";
    if (state.operationsSkillKind !== mappedKind) return;
    const local = state.operationsSkillGeneration[kind];
    if (local?.userEdited || state.operationsSkillUserEdited) return;
    const dialogOpen = dom.operationsSkillDialog?.open || dom.operationsSkillDialog?.hasAttribute("open");
    const draft = skill?.draft || local?.draft || null;
    if (dialogOpen && draft) {
      applyOperationsSkillDraft(draft);
      renderOperationsSkillGenerationNotice(skill);
      renderOperationsSkillBusy();
      showToast(t("operations.skill_generated"), "success", 4000);
    } else if (!dialogOpen && draft) {
      showToast(t("operations.skill_generated"), "success", 5000);
    }
    if (state.growthOpen) renderGrowth();
    if (state.launchOpen) renderLaunch();
  }

  function scheduleOperationsSkillGenerationPoll(operations = currentOperations()) {
    if (state.operationsSkillGenerationPollTimer) {
      if (!anyOperationsSkillGenerating(operations)) {
        clearInterval(state.operationsSkillGenerationPollTimer);
        state.operationsSkillGenerationPollTimer = null;
      }
      return;
    }
    if (!anyOperationsSkillGenerating(operations)) return;
    state.operationsSkillGenerationPollTimer = setInterval(() => {
      if (!state.currentId) {
        clearInterval(state.operationsSkillGenerationPollTimer);
        state.operationsSkillGenerationPollTimer = null;
        return;
      }
      void loadOperations({ silent: true });
    }, OPERATIONS_SKILL_GENERATE_POLL_MS);
  }

  function syncOperationsSkillGenerationFromOperations(operations) {
    if (!operations) return;
    operationsSkillGenerationKinds().forEach((kind) => {
      const skill = operationsSkillByKind(operations, kind);
      const generation = skill?.draftGeneration || { status: "idle" };
      const prev = state.operationsSkillGeneration[kind];
      if (generation.status === "running") {
        if (prev?.status !== "running") {
          state.operationsSkillGeneration[kind] = {
            status: "running",
            userEdited: prev?.userEdited || false,
            draft: null,
            error: "",
            background: true,
          };
        } else if (prev) {
          prev.background = true;
        }
        return;
      }
      if (generation.status === "completed") {
        if (prev?.status === "running") {
          state.operationsSkillGeneration[kind] = {
            status: "completed",
            userEdited: prev?.userEdited || false,
            draft: skill?.draft || null,
            error: "",
            background: false,
          };
          maybeApplyCompletedSkillGeneration(kind, skill);
        }
        return;
      }
      if (generation.status === "error") {
        const errorText = firstText(generation.error);
        if (prev?.status === "running" || (prev?.status !== "error" && errorText)) {
          state.operationsSkillGeneration[kind] = {
            status: "error",
            userEdited: prev?.userEdited || false,
            draft: null,
            error: errorText,
            background: false,
          };
        }
      }
    });
    scheduleOperationsSkillGenerationPoll(operations);
    const dialogOpen = dom.operationsSkillDialog?.open || dom.operationsSkillDialog?.hasAttribute("open");
    if (dialogOpen && isExtendedOperationsSkillKind()) {
      const skill = operationsSkillByKind(operations, operationsSkillGenerationKey());
      renderOperationsSkillGenerationNotice(skill);
      renderOperationsSkillBusy();
    }
  }

  function operationsSkillGenerationKey() {
    if (state.operationsSkillKind === "traffic") return "traffic";
    if (state.operationsSkillKind === "feedback") return "feedback";
    return "analytics";
  }

  function operationsSkillPayloadKey(kind = state.operationsSkillKind) {
    if (kind === "traffic") return "traffic_skill";
    if (kind === "feedback") return "feedback_skill";
    if (kind === "deployment") return "deployment_skill";
    return "analytics_skill";
  }

  function operationsSkillStateKey(kind = state.operationsSkillKind) {
    if (kind === "traffic") return "trafficSkill";
    if (kind === "feedback") return "feedbackSkill";
    if (kind === "deployment") return "deploymentSkill";
    return "analyticsSkill";
  }

  function isExtendedOperationsSkillKind() {
    return state.operationsSkillKind === "analytics"
      || state.operationsSkillKind === "traffic"
      || state.operationsSkillKind === "feedback";
  }

  function defaultOperationsSkillItem(kind) {
    if (kind === "traffic") {
      return { id: "", platform: "", method: "", budget: "", schedule: "", triggers: "", targetUrl: "", audience: "", notes: "" };
    }
    return { id: "", kind: "internal", name: "", description: "", endpointUrl: "", metrics: "", moduleHint: "", adapterNotes: "" };
  }

  function operationsSkillBodyText(skill) {
    const instructions = firstText(skill?.instructions);
    const summary = firstText(skill?.summary);
    if (!instructions) return summary;
    if (!summary || instructions.includes(summary)) return instructions;
    return `${summary}\n\n${instructions}`.trim();
  }

  function compileOperationsSkillInstructions(kind, bodyText, items) {
    const parts = [];
    const base = firstText(bodyText);
    if (base) parts.push(base);
    if (kind === "analytics" || kind === "feedback") {
      items.forEach((item, index) => {
        const lines = [
          `[${index + 1}] ${firstText(item.name, t("operations.skill_item_data_source", { index: index + 1 }))} (${item.kind === "api_dashboard" ? "api_dashboard" : "internal"})`,
          firstText(item.description),
          firstText(item.moduleHint),
          firstText(item.metrics),
          firstText(item.adapterNotes),
        ].filter(Boolean);
        const endpoint = operationsPublicUrl(item.endpointUrl);
        if (endpoint) lines.push(`endpoint: ${endpoint}`);
        if (lines.length) parts.push(lines.join("\n"));
      });
    } else if (kind === "traffic") {
      items.forEach((item, index) => {
        const lines = [
          `[${index + 1}] ${firstText(item.platform, t("operations.skill_item_campaign", { index: index + 1 }))}`,
          firstText(item.method),
          firstText(item.audience),
          firstText(item.budget),
          firstText(item.schedule),
          firstText(item.triggers),
          firstText(item.notes),
        ].filter(Boolean);
        const target = operationsPublicUrl(item.targetUrl);
        if (target) lines.push(`target: ${target}`);
        if (lines.length) parts.push(lines.join("\n"));
      });
    }
    return parts.join("\n\n").trim();
  }

  function renderOperationsSkillMissingFields(fields) {
    if (!dom.operationsSkillMissingFields || !dom.operationsSkillMissingFieldsList) return;
    const rows = arrayFrom(fields).filter(Boolean);
    dom.operationsSkillMissingFields.hidden = rows.length === 0;
    if (dom.operationsSkillMissingCopy) {
      dom.operationsSkillMissingCopy.hidden = rows.length === 0;
    }
    dom.operationsSkillMissingFieldsList.replaceChildren();
    rows.forEach((item) => {
      dom.operationsSkillMissingFieldsList.append(element("li", "", firstText(item.prompt, item.label, item.field)));
    });
  }

  function operationsSkillPolishFocus(kind = state.operationsSkillKind) {
    if (kind === "analytics" || kind === "operations") return t("operations.skill_polish_focus_analytics");
    return "";
  }

  function renderOperationsSkillItems() {
    if (!dom.operationsSkillItemsList) return;
    const kind = state.operationsSkillKind;
    const isAnalyticsLike = kind === "analytics" || kind === "feedback";
    dom.operationsSkillItemsList.replaceChildren();
    state.operationsSkillItems.forEach((item, index) => {
      const card = element("article", "operations-skill-item");
      const header = element("div", "operations-skill-item-header");
      header.append(
        element("strong", "", kind === "traffic"
          ? t("operations.skill_item_campaign", { index: index + 1 })
          : isAnalyticsLike
            ? t(kind === "feedback" ? "operations.skill_item_feedback_channel" : "operations.skill_item_data_source", { index: index + 1 })
            : t("operations.skill_item_data_source", { index: index + 1 })),
        element("button", "text-button", t("operations.skill_remove_item"))
      );
      header.querySelector("button").type = "button";
      header.querySelector("button").addEventListener("click", () => {
        state.operationsSkillItems.splice(index, 1);
        markOperationsSkillEdited();
        renderOperationsSkillItems();
      });
      const grid = element("div", "operations-skill-item-grid");
      if (kind === "traffic") {
        grid.append(
          buildOperationsSkillField(t("operations.skill_campaign_platform"), "platform", item.platform),
          buildOperationsSkillField(t("operations.skill_campaign_method"), "method", item.method),
          buildOperationsSkillField(t("operations.skill_campaign_budget"), "budget", item.budget),
          buildOperationsSkillField(t("operations.skill_campaign_schedule"), "schedule", item.schedule),
          buildOperationsSkillField(t("operations.skill_campaign_triggers"), "triggers", item.triggers),
          buildOperationsSkillField(t("operations.skill_campaign_target"), "targetUrl", item.targetUrl),
          buildOperationsSkillField(t("operations.skill_campaign_audience"), "audience", item.audience),
          buildOperationsSkillField(t("operations.skill_campaign_notes"), "notes", item.notes, true)
        );
      } else {
        const kindField = element("label", "");
        kindField.append(element("span", "", t("operations.skill_source_kind")));
        const select = element("select", "");
        select.dataset.field = "kind";
        select.append(
          element("option", "", t("operations.skill_source_kind_internal")),
          element("option", "", t("operations.skill_source_kind_api"))
        );
        select.options[0].value = "internal";
        select.options[1].value = "api_dashboard";
        select.value = item.kind === "api_dashboard" ? "api_dashboard" : "internal";
        select.addEventListener("change", () => {
          item.kind = select.value;
          markOperationsSkillEdited();
        });
        kindField.append(select);
        grid.append(
          kindField,
          buildOperationsSkillField(t("operations.skill_source_name"), "name", item.name),
          buildOperationsSkillField(t("operations.skill_source_description"), "description", item.description, true),
          buildOperationsSkillField(t("operations.skill_source_endpoint"), "endpointUrl", item.endpointUrl),
          buildOperationsSkillField(t("operations.skill_source_metrics"), "metrics", item.metrics),
          buildOperationsSkillField(t("operations.skill_source_module"), "moduleHint", item.moduleHint),
          buildOperationsSkillField(t("operations.skill_source_notes"), "adapterNotes", item.adapterNotes, true)
        );
      }
      grid.querySelectorAll("[data-field]").forEach((input) => {
        input.addEventListener("input", () => {
          item[input.dataset.field] = input.value;
          markOperationsSkillEdited();
        });
      });
      card.append(header, grid);
      dom.operationsSkillItemsList.append(card);
    });
    if (dom.operationsSkillAddItemButton) {
      dom.operationsSkillAddItemButton.textContent = kind === "traffic"
        ? t("operations.skill_add_campaign")
        : t("operations.skill_add_data_source");
    }
  }

  function buildOperationsSkillField(label, field, value, multiline = false) {
    const wrap = element("label", "");
    wrap.append(element("span", "", label));
    const input = multiline ? element("textarea", "") : element("input", "");
    input.dataset.field = field;
    input.value = firstText(value);
    if (!multiline && field.toLowerCase().includes("url")) input.type = "url";
    if (multiline) input.rows = 2;
    wrap.append(input);
    return wrap;
  }

  function preferredOperationsSkillConfigMode(skill) {
    if (skill?.management === "manual" && skill?.configMode === "advanced") {
      return "advanced";
    }
    return "simple";
  }

  function setOperationsSkillConfigMode(mode) {
    state.operationsSkillConfigMode = mode === "advanced" ? "advanced" : "simple";
    dom.operationsSkillSimpleModeButton?.classList.toggle("is-active", state.operationsSkillConfigMode === "simple");
    dom.operationsSkillAdvancedModeButton?.classList.toggle("is-active", state.operationsSkillConfigMode === "advanced");
    if (dom.operationsSkillAdvancedPanel) dom.operationsSkillAdvancedPanel.open = state.operationsSkillConfigMode === "advanced";
  }

  function populateOperationsSkillForm(skill, kind) {
    const isTraffic = kind === "traffic";
    const isAnalytics = kind === "analytics";
    const isFeedback = kind === "feedback";
    const isExtended = isTraffic || isAnalytics || isFeedback;
    dom.operationsSkillDeploymentFields.hidden = isExtended;
    dom.operationsSkillExtendedFields.hidden = !isExtended;
    if (dom.generateOperationsSkillButton) dom.generateOperationsSkillButton.hidden = !isExtended;
    if (dom.polishOperationsSkillButton) dom.polishOperationsSkillButton.hidden = !isExtended;
    state.operationsSkillUserEdited = false;
    state.operationsSkillItems = isAnalytics || isFeedback
      ? arrayFrom(skill.dataSources).map((item) => ({ ...item }))
      : isTraffic
        ? arrayFrom(skill.campaignItems).map((item) => ({ ...item }))
        : [];
    if (isExtended && !state.operationsSkillItems.length) {
      state.operationsSkillItems = [defaultOperationsSkillItem(kind)];
    }
    setOperationsSkillConfigMode(preferredOperationsSkillConfigMode(skill));
    if (dom.operationsSkillInstructionsInput) {
      dom.operationsSkillInstructionsInput.value = operationsSkillBodyText(skill);
    }
    renderOperationsSkillMissingFields(skill.missingFields);
    renderOperationsSkillItems();
    renderOperationsSkillGenerationNotice(skill);
    if (!isExtended) {
      const endpoint = isAnalytics
        ? currentOperations().dataSources.find((item) => item.configured) || currentOperations().dataSources[0]
        : isTraffic
          ? currentOperations().trafficState.platforms[0]
          : currentOperations().deploymentTargets[0];
      dom.operationsSkillProviderInput.value = isTraffic
        ? firstText(endpoint?.name)
        : firstText(endpoint?.displayName, endpoint?.providerId);
      dom.operationsSkillTargetInput.value = isTraffic ? firstText(endpoint?.method) : firstText(endpoint?.publicUrl);
    }
  }

  function defaultOperationsSkillName(kind = state.operationsSkillKind) {
    if (kind === "traffic") return t("operations.traffic_skill_default");
    if (kind === "feedback") return t("operations.feedback_skill_default");
    if (kind === "analytics" || kind === "operations") return t("operations.analytics_skill_default");
    return t("operations.skill_default_launch_name");
  }

  function syncOperationsSkillDialogLayout() {
    const extended = isExtendedOperationsSkillKind();
    if (dom.operationsSkillNameField) dom.operationsSkillNameField.hidden = extended;
    if (dom.operationsSkillDialog) dom.operationsSkillDialog.classList.toggle("is-extended-skill", extended);
    if (dom.operationsSkillInstructionsInput) {
      dom.operationsSkillInstructionsInput.rows = extended ? 14 : 8;
    }
  }

  function applyOperationsSkillDraft(draft) {
    if (!draft || typeof draft !== "object") return;
    if (dom.operationsSkillNameInput && !isExtendedOperationsSkillKind()) {
      dom.operationsSkillNameInput.value = firstText(draft.name, dom.operationsSkillNameInput.value);
    }
    if (dom.operationsSkillInstructionsInput) {
      dom.operationsSkillInstructionsInput.value = operationsSkillBodyText({
        instructions: firstText(draft.instructions),
        summary: firstText(draft.summary),
      });
    }
    state.operationsSkillItems = state.operationsSkillKind === "traffic"
      ? arrayFrom(draft.campaignItems).map((item) => ({ ...item }))
      : arrayFrom(draft.dataSources).map((item) => ({ ...item }));
    if (!state.operationsSkillItems.length) {
      state.operationsSkillItems = [defaultOperationsSkillItem(state.operationsSkillKind)];
    }
    setOperationsSkillConfigMode("simple");
    renderOperationsSkillMissingFields(draft.missingFields);
    renderOperationsSkillItems();
    state.operationsSkillUserEdited = false;
  }

  function renderOperationsSkillGenerationNotice(skill) {
    if (!dom.operationsSkillGenerationNotice || !isExtendedOperationsSkillKind()) return;
    const local = state.operationsSkillGeneration[operationsSkillGenerationKey()];
    const generation = skill?.draftGeneration || { status: "idle" };
    const running = local?.status === "running" || generation.status === "running";
    const errorText = firstText(local?.error, generation.error);
    dom.operationsSkillGenerationNotice.hidden = !running && !errorText;
    dom.operationsSkillGenerationNotice.classList.toggle("is-error", Boolean(errorText));
    dom.operationsSkillGenerationNotice.textContent = errorText
      ? errorText
      : (local?.background || running)
        ? t("operations.skill_generate_background_continue")
        : t("operations.skill_generate_running_notice");
  }

  function clearOperationsSkillError() {
    dom.operationsSkillError.hidden = true;
    dom.operationsSkillError.textContent = "";
  }

  function askOperationsAgent(domain = "analytics") {
    if (!state.current || state.operationsLoading) return;
    const key = domain === "traffic"
      ? "growth.ask_traffic_prompt"
      : domain === "feedback"
        ? "feedback.ask_agent_prompt"
        : "growth.ask_analytics_prompt";
    state.operationsConversationStickToBottom = true;
    if (state.growthToolsOpen) setGrowthToolsOpen(false);
    void submitOperationsRequest("chat", t(key));
  }

  function openOperationsSkillDialog(kind = "deployment") {
    if (!state.current) return;
    state.operationsSkillKind = kind === "traffic"
      ? "traffic"
      : kind === "feedback"
        ? "feedback"
        : kind === "analytics" || kind === "operations"
          ? "analytics"
          : "deployment";
    const operations = currentOperations();
    const isTraffic = state.operationsSkillKind === "traffic";
    const isAnalytics = state.operationsSkillKind === "analytics";
    const isFeedback = state.operationsSkillKind === "feedback";
    const skill = isTraffic
      ? operations.trafficSkill
      : isAnalytics
        ? operations.analyticsSkill
        : isFeedback
          ? operations.feedbackSkill
          : operations.deploymentSkill;
    dom.operationsSkillKicker.textContent = t(
      isTraffic
        ? "operations.skill_traffic_kicker"
        : isFeedback
          ? "operations.skill_feedback_kicker"
          : isAnalytics
            ? "operations.skill_growth_kicker"
            : "operations.skill_launch_kicker"
    );
    dom.operationsSkillDialogTitle.textContent = t(
      isTraffic
        ? "operations.skill_traffic_title"
        : isFeedback
          ? "operations.skill_feedback_title"
          : isAnalytics
            ? "operations.skill_growth_title"
            : "operations.skill_launch_title"
    );
    dom.operationsSkillDialogIntro.textContent = t(
      isTraffic
        ? "operations.skill_traffic_intro"
        : isFeedback
          ? "operations.skill_feedback_intro"
          : isAnalytics
            ? "operations.skill_growth_intro"
            : "operations.skill_launch_intro"
    );
    dom.operationsSkillProviderLabel.textContent = t(
      isTraffic ? "operations.skill_traffic_provider" : isAnalytics ? "operations.skill_data_provider" : "operations.skill_provider"
    );
    dom.operationsSkillProviderInput.placeholder = t(
      isTraffic ? "operations.skill_traffic_provider_placeholder" : isAnalytics ? "operations.skill_data_provider_placeholder" : "operations.skill_provider_placeholder"
    );
    syncOperationsSkillDialogLayout();
    if (!isExtendedOperationsSkillKind() && dom.operationsSkillNameInput) {
      dom.operationsSkillNameInput.value = skill.isDefault
        ? defaultOperationsSkillName(state.operationsSkillKind)
        : skill.name;
    }
    populateOperationsSkillForm(skill, state.operationsSkillKind);
    const draft = skill.draft;
    const localGen = state.operationsSkillGeneration[operationsSkillGenerationKey()];
    if (!state.operationsSkillUserEdited && !localGen?.userEdited && draft && skill.draftGeneration?.status === "completed") {
      applyOperationsSkillDraft(draft);
    } else if (localGen?.status === "completed" && localGen.draft && !localGen.userEdited) {
      applyOperationsSkillDraft(localGen.draft);
    }
    clearOperationsSkillError();
    renderOperationsSkillBusy();
    renderOperationsSkillGenerationNotice(skill);
    if (typeof dom.operationsSkillDialog.showModal === "function") dom.operationsSkillDialog.showModal();
    else dom.operationsSkillDialog.setAttribute("open", "");
  }

  function closeOperationsSkillDialog() {
    const key = operationsSkillGenerationKey();
    const local = state.operationsSkillGeneration[key];
    const skill = operationsSkillByKind(currentOperations(), key);
    const generating = local?.status === "running" || skill?.draftGeneration?.status === "running";
    if (generating) {
      showToast(t("operations.skill_generate_background"), "success", 5000);
    }
    if (!state.operationsSkillBusy || generating) {
    closeDialog(dom.operationsSkillDialog);
    }
  }

  function renderOperationsSkillBusy() {
    const key = operationsSkillGenerationKey();
    const skill = operationsSkillByKind(currentOperations(), key);
    const generating = isOperationsSkillGenerating(key, currentOperations(), skill);
    const busy = state.operationsSkillBusy || generating;
    dom.saveOperationsSkillButton.disabled = busy;
    dom.resetOperationsSkillButton.disabled = busy;
    dom.cancelOperationsSkillButton.disabled = false;
    dom.closeOperationsSkillButton.disabled = false;
    if (dom.generateOperationsSkillButton) {
      dom.generateOperationsSkillButton.disabled = busy;
      dom.generateOperationsSkillButton.textContent = t(generating ? "operations.skill_generating" : "operations.skill_generate");
    }
    if (dom.polishOperationsSkillButton) {
      dom.polishOperationsSkillButton.disabled = busy;
      dom.polishOperationsSkillButton.textContent = t(generating ? "operations.skill_polishing" : "operations.skill_polish");
    }
    dom.saveOperationsSkillButton.textContent = t(state.operationsSkillBusy ? "operations.skill_saving" : "common.save");
  }

  async function generateOperationsSkillDraftForKind(kind, { silent = false, returnDraft = false } = {}) {
    if (!state.current) return null;
    if (!["analytics", "feedback", "traffic"].includes(kind)) return null;

    const operations = currentOperations();
    if (isOperationsSkillGenerating(kind, operations)) {
      scheduleOperationsSkillGenerationPoll(operations);
      if (!silent) showToast(t("operations.skill_generate_already_running"), "success", 4500);
      return returnDraft ? await waitForOperationsSkillDraft(kind) : undefined;
    }

    markOperationsSkillGenerationRunning(kind, { background: true, userEdited: false });
    renderOperations();
    scheduleOperationsSkillGenerationPoll();

    let response = null;
    try {
      response = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/skill/generate`, {
        method: "POST",
        json: { kind, locale: state.locale || "zh-CN" },
        timeoutMs: OPERATIONS_SKILL_GENERATE_REQUEST_TIMEOUT_MS,
      });
    } catch (error) {
      const timedOut = error instanceof ApiError && firstText(error.payload?.code) === "request_timeout";
      if (timedOut) {
        await loadOperations({ silent: true });
        if (isOperationsSkillGenerating(kind, currentOperations())) {
          if (!silent) showToast(t("operations.skill_generate_background_continue"), "success", 6000);
          scheduleOperationsSkillGenerationPoll();
          renderOperations();
          return returnDraft ? await waitForOperationsSkillDraft(kind) : undefined;
        }
      }
      const message = friendlyError(error, t("operations.skill_generate_failed"));
      state.operationsSkillGeneration[kind] = {
        status: "error",
        userEdited: false,
        draft: null,
        error: message,
        background: false,
      };
      renderOperations();
      scheduleOperationsSkillGenerationPoll(currentOperations());
      if (!silent) showToast(message, "error", 6000);
      return null;
    }

    mergeOperationsSkillGenerateResponse(kind, response);
    const draft = response?.draft || response?.skill?.draft || null;
    const status = firstText(response?.status, response?.skill?.draftGeneration?.status).toLowerCase();

    if (status === "completed" && draft) {
      state.operationsSkillGeneration[kind] = {
        status: "completed",
        userEdited: false,
        draft,
        error: "",
        background: false,
      };
      renderOperations();
      scheduleOperationsSkillGenerationPoll(currentOperations());
      if (!silent) showToast(t("operations.skill_generated"), "success", 4000);
      return returnDraft ? draft : undefined;
    }

    markOperationsSkillGenerationRunning(kind, { background: true, userEdited: false });
    renderOperations();
    scheduleOperationsSkillGenerationPoll(currentOperations());
    if (!silent) {
      showToast(
        response?.deduplicated
          ? t("operations.skill_generate_already_running")
          : t("operations.skill_generate_background_continue"),
        "success",
        response?.deduplicated ? 4500 : 6000,
      );
    }
    return returnDraft ? await waitForOperationsSkillDraft(kind) : undefined;
  }

  async function polishOperationsSkillDraft() {
    if (!state.current || !isExtendedOperationsSkillKind()) return;
    const key = operationsSkillGenerationKey();
    if (isOperationsSkillGenerating(key, currentOperations())) {
      showToast(t("operations.skill_generate_already_running"), "success", 4500);
      scheduleOperationsSkillGenerationPoll();
      return;
    }
    markOperationsSkillGenerationRunning(key, { background: true, userEdited: false });
    renderOperationsSkillBusy();
    renderOperationsSkillGenerationNotice({ draftGeneration: { status: "running" } });
    const dialogOpen = dom.operationsSkillDialog?.open || dom.operationsSkillDialog?.hasAttribute("open");
    try {
      const response = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/skill/polish`, {
        method: "POST",
        json: {
          kind: key,
          locale: state.locale || "zh-CN",
          focus: operationsSkillPolishFocus(key),
        },
        timeoutMs: OPERATIONS_SKILL_GENERATE_REQUEST_TIMEOUT_MS,
      });
      mergeOperationsSkillGenerateResponse(key, response);
      scheduleOperationsSkillGenerationPoll(currentOperations());
      if (firstText(response?.status).toLowerCase() === "completed") {
        const draft = response?.draft || response?.skill?.draft;
        if (draft && !state.operationsSkillUserEdited) applyOperationsSkillDraft(draft);
        showToast(t("operations.skill_polished"), "success", 5000);
      } else {
        showToast(t("operations.skill_generate_background_continue"), "success", 6000);
        const draft = await waitForOperationsSkillDraft(key);
        if (draft && !state.operationsSkillUserEdited && dialogOpen) applyOperationsSkillDraft(draft);
        if (draft) showToast(t("operations.skill_polished"), "success", 5000);
      }
    } catch (error) {
      const timedOut = error instanceof ApiError && firstText(error.payload?.code) === "request_timeout";
      if (timedOut) {
        await loadOperations({ silent: true });
        if (isOperationsSkillGenerating(key, currentOperations())) {
          showToast(t("operations.skill_generate_background_continue"), "success", 6000);
          const draft = await waitForOperationsSkillDraft(key);
          if (draft && !state.operationsSkillUserEdited && dialogOpen) applyOperationsSkillDraft(draft);
          if (draft) showToast(t("operations.skill_polished"), "success", 5000);
          renderOperationsSkillBusy();
          renderOperationsSkillGenerationNotice(operationsSkillByKind(currentOperations(), key));
          return;
        }
      }
      const message = friendlyError(error, t("operations.skill_polish_failed"));
      state.operationsSkillGeneration[key] = { status: "error", userEdited: false, draft: null, error: message, background: false };
      showToast(message, "error", 6000);
    }
    renderOperationsSkillBusy();
    renderOperationsSkillGenerationNotice(operationsSkillByKind(currentOperations(), key));
  }

  async function generateOperationsSkillDraft() {
    if (!state.current || !isExtendedOperationsSkillKind()) return;
    const key = operationsSkillGenerationKey();
    state.operationsSkillUserEdited = false;
    renderOperationsSkillBusy();
    renderOperationsSkillGenerationNotice({ draftGeneration: { status: "running" } });
    const dialogOpen = dom.operationsSkillDialog.open || dom.operationsSkillDialog.hasAttribute("open");
    const draft = await generateOperationsSkillDraftForKind(key, { silent: true, returnDraft: false });
    const skill = operationsSkillByKind(currentOperations(), key);
    if (draft && !state.operationsSkillUserEdited && dialogOpen) {
      applyOperationsSkillDraft(draft);
      showToast(t("operations.skill_generated"), "success", 4000);
    } else if (draft && !dialogOpen) {
      showToast(t("operations.skill_generated"), "success", 5000);
    } else if (isOperationsSkillGenerating(key, currentOperations(), skill)) {
      if (dialogOpen) {
        renderOperationsSkillGenerationNotice(skill);
      } else {
        showToast(t("operations.skill_generate_background_continue"), "success", 6000);
      }
    } else if (state.operationsSkillGeneration[key]?.error) {
      const message = state.operationsSkillGeneration[key].error;
      if (dialogOpen) {
        dom.operationsSkillError.textContent = message;
        dom.operationsSkillError.hidden = false;
      } else {
        showToast(message, "error", 6000);
      }
    }
    renderOperationsSkillGenerationNotice(skill);
    renderOperationsSkillBusy();
  }

  function operationsProviderId(value) {
    return firstText(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64) || "custom";
  }

  function operationsPublicUrl(value) {
    const text = firstText(value);
    if (!text) return "";
    try {
      const url = new URL(text);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (_error) {
      return "";
    }
  }

  function serializeDeploymentTargets(items) {
    return items.map((item) => ({
      id: item.id,
      provider_id: item.providerId,
      display_name: item.displayName,
      public_url: item.publicUrl,
      status: item.status || "draft",
      auto_detected: item.autoDetected === true,
      analytics_sources: serializeOperationsSources(arrayFrom(item.analyticsSources).map(normalizeOperationsDataSource)),
    }));
  }

  function serializeOperationsSources(items) {
    return items.map((item) => ({
      id: item.id,
      provider_id: item.providerId,
      display_name: item.displayName,
      kind: item.kind || "public_platform",
      public_url: item.publicUrl,
      source_ref: item.sourceRef,
      integration_ready: item.integrationReady === true,
      configured: item.configured === true,
      status: item.status || (item.configured ? "configured" : "needs_authorization"),
      auto_detected: item.autoDetected === true,
      supported_metrics: item.supportedMetrics,
      adapter_id: item.adapterId,
      access_mode: item.accessMode || "authorized",
      privacy_mode: item.privacyMode || "aggregate_only",
      raw_event_storage: item.rawEventStorage === true,
      min_cohort_size: item.minCohortSize,
      retention_days: item.retentionDays,
      allowed_dimensions: item.allowedDimensions,
      forbidden_fields: item.forbiddenFields,
    }));
  }

  function serializeOperationsSkill(skill, payload) {
    return {
      id: firstText(skill.id, "custom_skill"),
      name: payload.name,
      summary: payload.summary,
      instructions: payload.instructions,
      config_mode: payload.configMode,
      data_sources: payload.dataSources,
      campaign_items: payload.campaignItems,
      missing_fields: payload.missingFields,
      management: "manual",
      draft: null,
      draft_generation: { status: "idle", started_at: "", completed_at: "", error: "" },
      generated: {
        instructions: skill.generated.instructions,
        fingerprint: skill.generated.fingerprint,
        updated_at: skill.generated.updatedAt,
        evidence: skill.generated.evidence.map((item) => ({
          path: item.path,
          kind: item.kind,
          provider_id: item.providerId,
          digest: item.digest,
        })),
      },
      manual_override: { instructions: payload.instructions },
    };
  }

  function serializeSkillDataSources(items) {
    return items.map((item, index) => ({
      id: firstText(item.id, `skill_source_${index}`),
      kind: item.kind === "api_dashboard" ? "api_dashboard" : "internal",
      name: firstText(item.name),
      description: firstText(item.description),
      endpoint_url: operationsPublicUrl(item.endpointUrl) || firstText(item.endpointUrl),
      metrics: firstText(item.metrics),
      module_hint: firstText(item.moduleHint),
      adapter_notes: firstText(item.adapterNotes),
    })).filter((item) => item.name);
  }

  function serializeSkillCampaignItems(items) {
    return items.map((item, index) => ({
      id: firstText(item.id, `skill_campaign_${index}`),
      platform: firstText(item.platform),
      method: firstText(item.method),
      budget: firstText(item.budget),
      schedule: firstText(item.schedule),
      triggers: firstText(item.triggers),
      target_url: operationsPublicUrl(item.targetUrl) || firstText(item.targetUrl),
      audience: firstText(item.audience),
      notes: firstText(item.notes),
    })).filter((item) => item.platform);
  }

  function remainingOperationsSkillMissingFields(skill, dataSources) {
    const rows = arrayFrom(skill?.missingFields);
    const sources = arrayFrom(dataSources);
    const hasEndpoint = sources.some((item) => Boolean(operationsPublicUrl(item.endpoint_url ?? item.endpointUrl)));
    const hasModule = sources.some((item) => Boolean(firstText(item.module_hint, item.moduleHint)));
    const hasMetrics = sources.some((item) => Boolean(firstText(item.metrics)));
    return rows.filter((item) => {
      const field = firstText(item.field).toLowerCase();
      if (/(url|endpoint|domain|host|gateway)/.test(field)) return !hasEndpoint;
      if (/(module|path|file|route)/.test(field)) return !hasModule;
      if (/(metric|event|measure)/.test(field)) return !hasMetrics;
      return true;
    });
  }

  async function submitOperationsSkill(event) {
    event.preventDefault();
    if (!state.current || state.operationsSkillBusy) return;
    clearOperationsSkillError();
    const operations = currentOperations();
    const kind = state.operationsSkillKind;
    const isAnalytics = kind === "analytics";
    const isTraffic = kind === "traffic";
    const isFeedback = kind === "feedback";
    const previousSkill = isTraffic
      ? operations.trafficSkill
      : isAnalytics
        ? operations.analyticsSkill
        : isFeedback
          ? operations.feedbackSkill
          : operations.deploymentSkill;
    const skillName = isAnalytics || isTraffic || isFeedback
      ? defaultOperationsSkillName(kind)
      : firstText(dom.operationsSkillNameInput.value, defaultOperationsSkillName(kind));
    const body = firstText(dom.operationsSkillInstructionsInput?.value, previousSkill.instructions);
    const configMode = state.operationsSkillConfigMode;
    const dataSources = isAnalytics || isFeedback ? serializeSkillDataSources(state.operationsSkillItems) : [];
    const campaignItems = isTraffic ? serializeSkillCampaignItems(state.operationsSkillItems) : [];
    const instructions = isAnalytics || isTraffic || isFeedback
      ? compileOperationsSkillInstructions(kind, body, state.operationsSkillItems)
      : body;
    const summary = body.slice(0, 2000);
    const skillKey = operationsSkillPayloadKey(kind);
    const payload = {
      [skillKey]: serializeOperationsSkill(previousSkill, {
        name: skillName,
        summary,
        instructions,
        configMode,
        dataSources,
        campaignItems,
        missingFields: remainingOperationsSkillMissingFields(previousSkill, dataSources),
      }),
    };
    if (!isAnalytics && !isTraffic && !isFeedback) {
    const targetText = firstText(dom.operationsSkillTargetInput.value);
    const publicUrl = operationsPublicUrl(targetText);
    if (targetText && !publicUrl) {
      dom.operationsSkillError.textContent = t("operations.skill_url_invalid");
      dom.operationsSkillError.hidden = false;
      return;
    }
    const providerName = firstText(dom.operationsSkillProviderInput.value, "Custom");
    const providerId = operationsProviderId(providerName);
      const targets = operations.deploymentTargets.filter((item) => item.autoDetected || item.providerId !== providerId);
      targets.unshift({ id: "", providerId, displayName: providerName, publicUrl, status: "draft", autoDetected: false, analyticsSources: [] });
      payload.deployment_targets = serializeDeploymentTargets(targets);
    } else if (isAnalytics) {
      const derivedSources = dataSources.map((item, index) => {
        const existing = operationsSourceMatchingSkillItem(operations, item);
        const authorized = operationsSourceAuthorized(existing);
        return {
          id: existing?.id || "",
          providerId: firstText(existing?.providerId, operationsProviderId(item.name || `source_${index}`)),
          displayName: item.name,
          kind: item.kind === "api_dashboard" ? "public_platform" : "custom",
          publicUrl: item.endpoint_url,
          sourceRef: firstText(item.module_hint, item.adapter_notes),
          integrationReady: true,
          configured: authorized,
          status: authorized ? "configured" : "needs_authorization",
          autoDetected: false,
          adapterId: firstText(existing?.adapterId, item.kind === "api_dashboard" ? "api_dashboard_adapter" : "internal_tracking"),
          accessMode: item.endpoint_url ? "public" : "authorized",
          privacyMode: "aggregate_only",
          rawEventStorage: false,
          minCohortSize: operations.privacy.minCohortSize,
          retentionDays: operations.privacy.retentionDays,
          allowedDimensions: operations.privacy.allowedDimensions,
          forbiddenFields: operations.privacy.forbiddenFields,
          supportedMetrics: existing?.supportedMetrics?.length
            ? existing.supportedMetrics
            : ["daily_active_users", "monthly_active_users", "new_users", "retention", "active_trend", "version_adoption", "errors", "crashes"],
        };
      });
      if (derivedSources.length) {
        payload.data_sources = serializeOperationsSources(derivedSources);
      }
    } else if (isTraffic) {
      payload.traffic_state = {
        status: campaignItems.length ? "draft" : "not_configured",
        summary: summary || operations.trafficState.summary,
        platforms: campaignItems.map((item) => ({
          name: item.platform,
          method: item.method,
          schedule: item.schedule,
          triggers: item.triggers,
          status: "draft",
        })),
        updated_at: new Date().toISOString(),
      };
    }
    state.operationsSkillBusy = true;
    renderOperationsSkillBusy();
    try {
      const response = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/config`, { method: "POST", json: payload, timeoutMs: 45_000 });
      const normalized = mergeOperationsState(state.current?.operations, response);
      state.operations = normalized;
      state.current.operations = normalized;
      closeDialog(dom.operationsSkillDialog);
      state.operationsSkillGeneration[operationsSkillGenerationKey()] = null;
      renderOperations();
      showToast(t("operations.skill_saved"), "success", 4_000);
      if (["analytics", "feedback", "traffic"].includes(kind)) {
        markOperationsSkillGenerationRunning(kind, { background: true, userEdited: false });
        renderOperations();
        try {
          const refinement = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/skill/polish`, {
            method: "POST",
            json: {
              kind,
              locale: state.locale || "zh-CN",
              apply_on_complete: true,
              focus: state.locale === "en"
                ? "The Skill was just updated. Refine every activation module, infer all information already present in the Skill or workspace, and keep only genuinely user-owned decisions as missing fields. Fully specified modules must be adapted and left ready for module-scoped authorization."
                : "Skill 刚刚更新。请重新细化每个生效模块：Skill、代码和部署上下文已明确的信息直接完成结构化适配；只把无法推断、必须由用户本人决定的信息保留为待补充项；信息完整的模块进入逐模块待授权状态。",
            },
            timeoutMs: OPERATIONS_SKILL_GENERATE_REQUEST_TIMEOUT_MS,
          });
          mergeOperationsSkillGenerateResponse(kind, refinement);
          scheduleOperationsSkillGenerationPoll(currentOperations());
          renderOperations();
        } catch (error) {
          const timedOut = error instanceof ApiError && firstText(error.payload?.code) === "request_timeout";
          if (!timedOut) {
            state.operationsSkillGeneration[kind] = {
              status: "error",
              userEdited: false,
              draft: null,
              error: friendlyError(error, t("operations.skill_polish_failed")),
              background: false,
            };
            showToast(state.operationsSkillGeneration[kind].error, "error", 6000);
          }
          scheduleOperationsSkillGenerationPoll(currentOperations());
          renderOperations();
        }
      }
    } catch (error) {
      dom.operationsSkillError.textContent = friendlyError(error, t("operations.skill_failed"));
      dom.operationsSkillError.hidden = false;
    } finally {
      state.operationsSkillBusy = false;
      renderOperationsSkillBusy();
    }
  }

  async function resetOperationsSkill() {
    if (!state.current || state.operationsSkillBusy) return;
    state.operationsSkillBusy = true;
    renderOperationsSkillBusy();
    try {
      const key = operationsSkillPayloadKey();
      const response = await request(`/apps/${encodeURIComponent(state.currentId)}/operations/config`, { method: "POST", json: { [key]: null }, timeoutMs: 45_000 });
      const normalized = mergeOperationsState(state.current?.operations, response);
      state.operations = normalized;
      state.current.operations = normalized;
      closeDialog(dom.operationsSkillDialog);
      renderOperations();
      showToast(t("operations.skill_reset_done"), "success", 4_000);
    } catch (error) {
      dom.operationsSkillError.textContent = friendlyError(error, t("operations.skill_failed"));
      dom.operationsSkillError.hidden = false;
    } finally {
      state.operationsSkillBusy = false;
      renderOperationsSkillBusy();
    }
  }

  async function queueOperationsRefresh() {
    if (!state.current) return;
    const sources = currentOperations().dataSources.filter((item) => item.configured && item.supportedMetrics.length);
    if (!sources.length) {
      showToast(t("operations.refresh_waiting"), "error", 5_000);
      return;
    }
    try {
      await request(`/apps/${encodeURIComponent(state.currentId)}/operations/refresh`, {
        method: "POST",
        json: { client_request_id: globalThis.crypto?.randomUUID?.() || `web-${Date.now()}` },
        timeoutMs: 12_000,
      });
      showToast(t("operations.refresh_queued"), "success", 4_000);
      await loadOperations({ silent: true });
    } catch (error) {
      showToast(friendlyError(error, t("operations.refresh_failed")), "error", 5_000);
    }
  }

  function openOperationsAgentDialog() {
    const operations = currentOperations();
    const agent = operations.operationsAgent;
    dom.operationsAgentDialogMeta.textContent = operationsAgentLabel(agent.status);
    dom.operationsAgentLog.replaceChildren();
    const rows = [];
    if (agent.currentAction) rows.push([agent.updatedAt, t("operations.agent_label"), agent.currentAction]);
    if (agent.sessionId || agent.provider) rows.push([agent.updatedAt, t("operations.agent_session"), [agent.provider, agent.sessionId].filter(Boolean).join(" · ")]);
    rows.push([operations.updatedAt, t("operations.dashboard_label"), `${operationsEnvironmentLabel(operations.publicEnvironment.status)} · ${operationsPrivacyCopy(operations)}`]);
    operations.dataSources.forEach((source) => rows.push([
      operations.updatedAt,
      t("operations.agent_source"),
      `${source.displayName || source.providerId} · ${operationsSourceLabel(source)} · ${operationsPrivacyCopy({ privacy: {
        minCohortSize: source.minCohortSize ?? operations.privacy.minCohortSize,
        retentionDays: source.retentionDays ?? operations.privacy.retentionDays,
      } })}`,
    ]));
    operations.refreshRequests.slice(-5).reverse().forEach((requestItem) => rows.push([
      firstText(requestItem.updated_at, requestItem.created_at),
      t("operations.agent_request"),
      firstText(requestItem.status, requestItem.error),
    ]));
    if (agent.lastRefreshCompletedAt) rows.push([agent.lastRefreshCompletedAt, t("operations.agent_last_refresh"), operationsAgentLabel("completed")]);
    if (agent.lastError) rows.push([agent.updatedAt, t("operations.agent_last_error"), agent.lastError]);
    if (!rows.length) {
      dom.operationsAgentLog.append(element("div", "developer-session-empty", t("operations.agent_no_activity")));
    } else {
      rows.forEach(([at, label, textValue]) => {
        const row = element("article", "developer-session-line");
        const header = element("div", "developer-session-line-header");
        header.append(element("strong", "", label));
        if (at) header.append(element("time", "", formatRelativeTime(at)));
        row.append(header, element("pre", "developer-session-line-copy", textValue));
        dom.operationsAgentLog.append(row);
      });
    }
    if (typeof dom.operationsAgentDialog.showModal === "function") dom.operationsAgentDialog.showModal();
    else dom.operationsAgentDialog.setAttribute("open", "");
  }

  function repositoryIsConnected(repository = currentRepository()) {
    return firstText(repository?.status).toLowerCase() === "connected" && Boolean(firstText(repository?.name, repository?.provider, repository?.url));
  }

  function repositoryProviderFromModel(repository = currentRepository()) {
    const provider = normalizedIdentity(repository.provider);
    const name = firstText(repository.name).toLowerCase();
    if (provider === "github") return "github";
    if (provider === "gitee" || name.includes("gitee")) return "gitee";
    if (provider === "gitlab" || name.includes("gitlab")) return "custom";
    return "custom";
  }

  function repositoryDialogIsVisible() {
    return Boolean(dom.repositoryDialog && !dom.repositoryDialog.hidden);
  }

  function persistRepositoryDialogSession() {
    if (!state.repositoryDialogOpen || !state.currentId) return;
    try {
      sessionStorage.setItem(REPOSITORY_DIALOG_SESSION_KEY, JSON.stringify({
        appId: state.currentId,
        generating: state.repositoryCommitGenerating,
        commitDraft: dom.repositoryPushCommitInput?.value || "",
        at: Date.now(),
      }));
    } catch {
      // Storage failures must not block the repository dialog.
    }
  }

  function clearRepositoryDialogSession() {
    try {
      sessionStorage.removeItem(REPOSITORY_DIALOG_SESSION_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  async function restoreRepositoryDialogSessionIfNeeded() {
    if (!state.currentId || !state.current) return;
    let saved;
    try {
      const raw = sessionStorage.getItem(REPOSITORY_DIALOG_SESSION_KEY);
      if (!raw) return;
      saved = JSON.parse(raw);
    } catch {
      clearRepositoryDialogSession();
      return;
    }
    if (!saved || saved.appId !== state.currentId) return;
    if (Date.now() - Number(saved.at || 0) > 20 * 60 * 1000) {
      clearRepositoryDialogSession();
      return;
    }
    await openRepositoryDialog({ restored: true });
    if (saved.commitDraft && dom.repositoryPushCommitInput) {
      dom.repositoryPushCommitInput.value = saved.commitDraft;
      updateRepositoryPushButtonState();
    }
    if (saved.generating) {
      dom.repositoryError.textContent = t("repository.commit_generate_resume");
      dom.repositoryError.hidden = false;
    }
  }

  function showRepositoryDialogOverlay() {
    if (!dom.repositoryDialog) return;
    dom.repositoryDialog.hidden = false;
    dom.repositoryDialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("repository-dialog-open");
    persistRepositoryDialogSession();
  }

  function hideRepositoryDialogOverlay() {
    if (!dom.repositoryDialog) return;
    dom.repositoryDialog.hidden = true;
    dom.repositoryDialog.setAttribute("aria-hidden", "true");
    document.body.classList.remove("repository-dialog-open");
    clearRepositoryDialogSession();
  }

  function repositoryDialogCloseLocked() {
    return Boolean(state.repositoryCommitGenerating || state.repositoryBusy);
  }

  function shouldDeferBackgroundRender() {
    const active = document.activeElement;
    const editing = Boolean(active && (
      active.matches?.("input, textarea, select, [contenteditable='true']")
      || active.tagName === "IFRAME"
    ));
    return Boolean(
      state.repositoryDialogOpen
      || repositoryDialogIsVisible()
      || editing
      || experienceTwinFullscreenActive()
    );
  }

  function startRepositoryDialogGuard() {
    if (state.repositoryDialogGuardTimer) return;
    state.repositoryDialogGuardTimer = window.setInterval(() => {
      if (!state.repositoryDialogOpen) {
        stopRepositoryDialogGuard();
        return;
      }
      if (dom.repositoryDialog?.hidden) showRepositoryDialogOverlay();
      persistRepositoryDialogSession();
    }, 200);
  }

  function stopRepositoryDialogGuard() {
    if (!state.repositoryDialogGuardTimer) return;
    window.clearInterval(state.repositoryDialogGuardTimer);
    state.repositoryDialogGuardTimer = null;
  }

  function finishRepositoryDialogSession() {
    state.repositoryDialogOpen = false;
    stopRepositoryDialogGuard();
    hideRepositoryDialogOverlay();
    flushDeferredAppRender();
  }

  function flushDeferredAppRender() {
    if (!state.deferredAppRender) return;
    state.deferredAppRender = false;
    renderCurrentApp();
  }

  async function refreshRepositorySnapshot() {
    if (!state.currentId || state.repositoryRefreshing) return;
    state.repositoryRefreshing = true;
    try {
      const payload = await request(`/apps/${encodeURIComponent(state.currentId)}`);
      const detail = normalizeDetail(payload, state.currentId, state.current);
      if (!state.current || state.current.id !== state.currentId) return;
      state.current = {
        ...state.current,
        operations: mergeOperationsState(state.current.operations, detail.operations),
      };
      renderDeveloperRepositorySummary();
    } catch {
      // Keep the last known repository snapshot if refresh fails.
    } finally {
      state.repositoryRefreshing = false;
    }
  }

  async function openRepositoryDialog({ focusShortcuts = false, restored = false } = {}) {
    if (!studyShowRepositoryManagement()) return;
    if (!state.current || state.repositoryBusy) return;
    if (!restored) {
      await refreshRepositorySnapshot();
      if (!state.current || state.repositoryBusy) return;
    }
    state.repositoryShortcutsOpen = Boolean(focusShortcuts);
    const repository = currentRepository();
    const connected = repositoryIsConnected(repository);
    state.repositoryEditing = !connected;
    clearRepositoryError();
    dom.repositoryProvider.value = connected ? repositoryProviderFromModel(repository) : "github";
    dom.repositoryCustomName.value = connected && dom.repositoryProvider.value === "custom"
      ? firstText(repository.name, repository.provider)
      : "";
    dom.repositoryUrl.value = connected ? firstText(repository.url) : "";
    renderRepositoryDialog();
    state.repositoryDialogOpen = true;
    showRepositoryDialogOverlay();
    startRepositoryDialogGuard();
    if (repositoryIsConnected() && !state.repositoryEditing && dom.repositoryPushCommitInput) {
      requestAnimationFrame(() => dom.repositoryPushCommitInput.focus());
    } else if (focusShortcuts && connected && dom.repositoryShortcutsSection) {
      requestAnimationFrame(() => dom.repositoryShortcutsSection.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    } else if (!connected) {
      requestAnimationFrame(() => dom.repositoryUrl.focus());
    }
  }

  function closeRepositoryDialog() {
    if (repositoryDialogCloseLocked()) return;
    state.repositoryShortcutsOpen = false;
    finishRepositoryDialogSession();
  }

  function setRepositoryEditing(editing) {
    if (state.repositoryBusy) return;
    state.repositoryEditing = Boolean(editing);
    clearRepositoryError();
    renderRepositoryDialog();
    if (state.repositoryEditing) requestAnimationFrame(() => dom.repositoryUrl.focus());
  }

  function renderRepositoryDialog() {
    const repository = currentRepository();
    const connected = repositoryIsConnected(repository);
    const provider = firstText(repository.name, repository.provider, t("repository.title"));
    dom.repositoryCurrent.classList.toggle("is-connected", connected);
    dom.repositoryCurrentTitle.textContent = connected
      ? t("repository.connected", { provider })
      : t("repository.not_connected");
    dom.repositoryCurrentCopy.textContent = connected
      ? t("repository.connected_copy", { branch: repository.branch || t("repository.default_branch") })
      : t("repository.not_connected_copy");
    dom.repositoryCurrentUrl.textContent = connected ? firstText(repository.url) : "";
    dom.repositoryCurrentUrl.hidden = !connected || !repository.url;
    dom.repositoryChangeButton.hidden = !connected || state.repositoryEditing;
    dom.repositoryFields.hidden = !state.repositoryEditing;
    renderRepositoryFields();
    dom.saveRepositoryButton.textContent = state.repositoryBusy
      ? t("repository.saving")
      : t(connected && !state.repositoryEditing ? "repository.push_action" : "repository.save");
    dom.cancelRepositoryButton.disabled = repositoryDialogCloseLocked();
    dom.closeRepositoryButton.disabled = repositoryDialogCloseLocked();
    dom.repositoryChangeButton.disabled = state.repositoryBusy;
    renderRepositoryPushReadyPanel();
    renderRepositoryGitShortcutsManager();
    if (connected && !state.repositoryEditing) {
      updateRepositoryPushButtonState();
    } else {
      dom.saveRepositoryButton.disabled = state.repositoryBusy || state.repositoryCommitGenerating;
      dom.saveRepositoryButton.classList.remove("is-ready");
      dom.saveRepositoryButton.title = "";
      if (dom.repositoryPushSubmitWrap) {
        dom.repositoryPushSubmitWrap.removeAttribute("title");
        delete dom.repositoryPushSubmitWrap.dataset.tooltip;
        delete dom.repositoryPushSubmitWrap.dataset.disabledHint;
      }
    }
  }

  function renderRepositoryFields() {
    const custom = dom.repositoryProvider.value === "custom";
    dom.repositoryCustomNameField.hidden = !custom || !state.repositoryEditing;
  }

  function clearRepositoryError() {
    dom.repositoryError.textContent = "";
    dom.repositoryError.hidden = true;
  }

  function repositoryClientValidation(provider, customName, url) {
    if (!url) return t("repository.url_required");
    if (provider === "custom" && !customName) return t("repository.custom_name_required");
    if (provider === "github") {
      const githubHttps = /^https:\/\/github\.com\/[^\s/?#]+\/[^\s?#]+$/i;
      const githubScp = /^git@github\.com:[^\s/:?#]+\/[^\s?#]+$/i;
      const githubSsh = /^ssh:\/\/git@github\.com\/[^\s/?#]+\/[^\s?#]+$/i;
      if (![githubHttps, githubScp, githubSsh].some((pattern) => pattern.test(url))) {
        return t("repository.github_invalid");
      }
    }
    if (provider === "gitee") {
      const giteeHttps = /^https:\/\/gitee\.com\/[^\s/?#]+\/[^\s?#]+$/i;
      const giteeScp = /^git@gitee\.com:[^\s/:?#]+\/[^\s?#]+$/i;
      const giteeSsh = /^ssh:\/\/git@gitee\.com\/[^\s/?#]+\/[^\s?#]+$/i;
      if (![giteeHttps, giteeScp, giteeSsh].some((pattern) => pattern.test(url))) {
        return t("repository.gitee_invalid");
      }
    }
    return "";
  }

  function repositorySubmitPayload(providerValue, customName, url) {
    if (providerValue === "github") {
      return { provider: "github", url, custom_provider_name: "" };
    }
    if (providerValue === "gitee") {
      return { provider: "custom", url, custom_provider_name: t("repository.gitee") };
    }
    return { provider: "custom", url, custom_provider_name: customName };
  }

  async function submitRepositoryRequest(event) {
    event.preventDefault();
    if (!state.currentId || state.repositoryBusy) return;
    const connected = repositoryIsConnected();
    if (connected && !state.repositoryEditing) {
      await submitRepositoryPushConfirm();
      return;
    }
    const providerValue = dom.repositoryProvider.value;
    const customName = dom.repositoryCustomName.value.trim();
    const url = dom.repositoryUrl.value.trim();
    const validation = repositoryClientValidation(providerValue, customName, url);
      if (validation) {
        dom.repositoryError.textContent = validation;
        dom.repositoryError.hidden = false;
        return;
    }

    state.repositoryBusy = true;
    clearRepositoryError();
    renderRepositoryDialog();
    try {
      const payload = {
        use_existing: false,
        client_request_id: createClientRequestId(),
        ...repositorySubmitPayload(providerValue, customName, url),
      };
      const response = await request(`/apps/${encodeURIComponent(state.currentId)}/repository/request`, {
        method: "POST",
        json: payload,
      });
      if (response?.message) mergeOptimisticMessage(response.message);
      finishRepositoryDialogSession();
      showToast(t("repository.saved"), "success", 4_000);
      renderDeveloperRepositorySummary();
      await loadCurrentApp({ silent: true });
    } catch (error) {
      const code = firstText(error?.payload?.code, error?.payload?.error?.code).toLowerCase();
      dom.repositoryError.textContent = code === "repository_skill_unavailable"
        ? t("repository.skill_unavailable")
        : friendlyError(error, t("repository.failed"));
      dom.repositoryError.hidden = false;
    } finally {
      state.repositoryBusy = false;
      renderRepositoryDialog();
    }
  }

  function sendDeveloperPrompt(text) {
    if (!state.current || state.sending) return;
    const prompt = String(text || "").trim();
    if (!prompt) return;
    state.launchOpen = false;
    state.growthOpen = false;
    state.experienceTwinOpen = false;
    state.chatView = usesDirectDeveloperStudyConversation() ? "developer" : "main";
    state.renderedConversationView = "";
    renderCurrentApp();
    dom.messageInput.value = prompt;
    autosizeMessageInput();
    updateComposer();
    submitMessage();
  }

  function sendOperationsChatPrompt(text) {
    if (!state.current || state.sending || state.operationsLoading) return;
    const prompt = String(text || "").trim();
    if (!prompt) return;
    openProductTab("growth");
    setGrowthToolsOpen(false);
    dom.messageInput.value = prompt;
    autosizeMessageInput();
    updateComposer();
    void submitMessage();
  }

  function sendOperationsPrompt(kind) {
    if (!state.current || state.sending) return;
    const key = {
      release: "operations.action_release",
      deploy: "operations.action_deploy",
      connect: "operations.action_connect",
      metrics: "operations.action_metrics",
      strategy: "operations.action_strategy",
    }[kind] || "operations.action_strategy";
    sendDeveloperPrompt(t(key));
  }

  function renderExperienceFilters() {
    dom.experienceFilters.replaceChildren();
    dom.experienceFilters.setAttribute("aria-label", t("conversation.filter_aria"));
    const messages = experienceConversationMessages();
    const availableIds = new Set(messages.map(messagePersonaId).filter(Boolean).map(normalizedIdentity));
    const personas = (state.current?.personas || []).filter((persona) => {
      const id = normalizedIdentity(firstText(persona?.id, persona?.persona_id, persona?.personaId));
      return !availableIds.size || availableIds.has(id);
    });
    const options = [{ id: "", label: t("conversation.all"), count: messages.length }];
    personas.forEach((persona) => {
      const id = firstText(persona?.id, persona?.persona_id, persona?.personaId);
      if (!id) return;
      const count = messages.filter((message) => normalizedIdentity(messagePersonaId(message)) === normalizedIdentity(id)).length;
      options.push({ id, label: localizedPersonaName(persona, id), count });
    });

    options.forEach((option) => {
      const button = element("button", "experience-filter", option.label);
      button.type = "button";
      const active = normalizedIdentity(option.id) === normalizedIdentity(state.experienceFilter);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      if (option.count) button.append(element("span", "experience-filter-count", String(option.count)));
      button.addEventListener("click", () => {
        if (normalizedIdentity(option.id) === normalizedIdentity(state.experienceFilter)) return;
        rememberChatScrollPosition();
        state.experienceFilter = option.id;
        state.renderedConversationView = "";
        renderExperienceFilters();
        renderMessages();
      });
      dom.experienceFilters.append(button);
    });
    dom.experienceFilters.hidden = false;
  }

  function messageChannel(message) {
    return firstText(message?.channel, message?.thread, message?.conversation, "main").trim();
  }

  function isExperienceThreadMessage(message) {
    return /^experience:/i.test(messageChannel(message));
  }

  function isMainConversationMessage(message) {
    return messageChannel(message).toLowerCase() === "main";
  }

  function isDeveloperMainMessage(message) {
    if (!isMainConversationMessage(message)) return false;
    const direction = firstText(message?.direction).toLowerCase();
    if (direction && direction !== "outbound") return false;
    const actor = messageActor(message);
    return actor === "developer" || actor === "orchestrator";
  }

  function developerMessageId(message) {
    const direct = firstText(message?.event_id, message?.id, message?.message_id);
    if (direct) return direct;
    return [messageTime(message), firstText(message?.title, message?.subject), messageText(message)]
      .join("|")
      .slice(0, 500);
  }

  function participantMentionMessage(message) {
    if (isSelfMessage(message)) return false;
    const mentions = [...arrayFrom(message?.mentions), ...arrayFrom(message?.pm_mentions)]
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .map((value) => firstText(value).trim().toLowerCase());
    if (mentions.some((value) => ["user", "participant", "owner", "you"].includes(value))) {
      return true;
    }
    const text = `${messageTitle(message)} ${messageText(message)}`;
    return /@你\b|@\s*you\b/i.test(text);
  }

  function latestParticipantMention(messages = mainConversationMessages()) {
    return [...messages].reverse().find(participantMentionMessage) || null;
  }

  function mentionDismissStorageKey(messageId) {
    return `applooper-mention-dismissed:${firstText(state.currentId)}:${messageId}`;
  }

  function isMentionNoticeDismissed(messageId) {
    if (!messageId) return true;
    try {
      return sessionStorage.getItem(mentionDismissStorageKey(messageId)) === "1";
    } catch (_error) {
      return false;
    }
  }

  function dismissMentionNotice(messageId) {
    if (!messageId) return;
    try {
      sessionStorage.setItem(mentionDismissStorageKey(messageId), "1");
    } catch (_error) {
      // Ignore private-mode storage failures; the toast still closes for this render.
    }
    document.getElementById("mentionNoticeHost")?.replaceChildren();
  }

  function ensureMentionNoticeHost() {
    let host = document.getElementById("mentionNoticeHost");
    if (host) return host;
    host = element("div", "mention-notice-host");
    host.id = "mentionNoticeHost";
    (document.getElementById("mainContent") || document.body).append(host);
    return host;
  }

  function participantMentionNotice(message) {
    if (!message) return null;
    const messageId = developerMessageId(message);
    if (!messageId || isMentionNoticeDismissed(messageId)) return null;
    const actor = messageActor(message);
    const actorLabel = messageSender(message, actor, false);
    const notice = element("div", "mention-notice");
    notice.dataset.mentionMessageId = messageId;
    notice.setAttribute("role", "status");
    const body = element("button", "mention-notice-body");
    body.type = "button";
    body.append(
      element("span", "mention-notice-dot", "@"),
      element(
        "span",
        "mention-notice-copy",
        state.locale === "zh-CN"
          ? `${actorLabel || "智能体"} @了你，点击查看这条消息`
          : `${actorLabel || "An agent"} mentioned you. Tap to view the message`
      )
    );
    body.addEventListener("click", () => {
      dismissMentionNotice(messageId);
      jumpToConversationMessage(messageId);
    });
    const close = element("button", "mention-notice-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", state.locale === "zh-CN" ? "关闭" : "Dismiss");
    close.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      dismissMentionNotice(messageId);
    });
    notice.append(body, close);
    return notice;
  }

  function renderParticipantMentionNotice(message) {
    const host = ensureMentionNoticeHost();
    const notice = participantMentionNotice(message);
    host.replaceChildren(notice || "");
  }

  function flashMentionedMessage(row) {
    if (!row) return;
    row.classList.remove("is-mentioned-target");
    // Force a style flush so re-clicking the toast restarts the soft flash.
    void row.offsetWidth;
    row.classList.add("is-mentioned-target");
    window.setTimeout(() => row.classList.remove("is-mentioned-target"), 3_000);
  }

  function jumpToConversationMessage(messageId) {
    if (!messageId) return;
    const allMessages = mainConversationMessages();
    const index = allMessages.findIndex((message) => developerMessageId(message) === messageId);
    if (index < 0) return;
    const studyDirect = usesDirectDeveloperStudyConversation();
    const targetView = studyDirect ? "developer" : "main";
    // Leave trial/publish panels and open the R&D conversation tab first.
    if (
      state.experienceTwinOpen
      || state.launchOpen
      || state.growthOpen
      || state.chatView !== targetView
    ) {
      setChatView(targetView);
    } else {
      state.chatView = targetView;
    }
    state.messageRenderLimits.set(chatScrollKey(), Math.max(MESSAGE_PAGE_SIZE, allMessages.length));
    renderMessages({ force: true });
    const focusRow = () => {
      const escaped = window.CSS?.escape ? window.CSS.escape(messageId) : messageId.replace(/["\\]/g, "\\$&");
      const row = dom.chatStream?.querySelector(`[data-message-id="${escaped}"]`);
      if (!row) return false;
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      flashMentionedMessage(row);
      return true;
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (focusRow()) return;
        window.setTimeout(() => {
          focusRow();
        }, 120);
      });
    });
  }

  window.AppLooperStudyHooks = Object.assign({}, window.AppLooperStudyHooks, {
    jumpToMentionMessage: jumpToConversationMessage,
    selectApp,
    reloadApps: () => loadApps({ silent: true, loadDetail: false }),
    openAppsDrawer: () => openDrawer("apps"),
  });

  function detectNewDeveloperMessages(detail) {
    const runId = firstText(detail?.id);
    if (!runId) return;
    const messages = (detail?.messages || []).filter(isDeveloperMainMessage);
    const known = state.developerMessageBaselines.get(runId);
    if (!known) {
      state.developerMessageBaselines.set(runId, new Set(messages.map(developerMessageId).filter(Boolean)));
      return;
    }

    messages.forEach((message) => {
      const id = developerMessageId(message);
      if (id) known.add(id);
    });
  }

  function isOwnerTrialJumpMessage(message) {
    const blob = [messageTitle(message), messageText(message), messageDisplayText(message)].join("\n");
    return blob.includes("【所有者试用跳转】") || /\[Owner trial jump\]/i.test(blob);
  }

  function mainConversationMessages() {
    const messages = state.current?.messages || [];
    if (usesDirectDeveloperStudyConversation() && usesAppLooperStudyTreatment()) {
      // The study intentionally exposes a single R&D conversation. Surface
      // virtual-user/internal-test reports in that stream instead of hiding
      // them behind the removed legacy conversation tab.
      return messages.filter(
        (message) =>
          (isMainConversationMessage(message) || isExperienceThreadMessage(message))
          && !isStatusOnlyConversationMessage(message)
          && !isOwnerTrialJumpMessage(message)
          && !(studyHideProjectManagerAgent() && messageActor(message) === "project_manager")
      );
    }
    return messages.filter(
      (message) =>
        isMainConversationMessage(message)
        && !isStatusOnlyConversationMessage(message)
        && !isOwnerTrialJumpMessage(message)
        && !(studyHideProjectManagerAgent() && messageActor(message) === "project_manager")
    );
  }

  function mainConversationFingerprint(messages = mainConversationMessages()) {
    return messages
      .map((message) => [
        developerMessageId(message),
        firstText(message?.user_message_state, message?.developer_message_state, message?.receipt_status),
        firstText(message?.at, message?.created_at, message?.updated_at),
        messageTitle(message).length,
        messageText(message).length,
        arrayFrom(message?.attachments).length,
      ].join("\u0001"))
      .join("\u0002");
  }

  function experienceConversationMessages() {
    const messages = (state.current?.messages || []).filter(
      (message) => isExperienceThreadMessage(message) && !isStatusOnlyConversationMessage(message)
    );
    if (!state.experienceFilter) return messages;
    const filterId = normalizedIdentity(state.experienceFilter);
    return messages.filter((message) => normalizedIdentity(messagePersonaId(message)) === filterId);
  }

  function isStatusOnlyConversationMessage(message) {
    const attachments = messageAttachments(message);
    const intentPayload = message?.pm_intent_payload;
    const hasIntentCard = Boolean(
      firstText(message?.pm_intent, message?.pm_bubble)
      || (intentPayload && typeof intentPayload === "object" && Object.keys(intentPayload).length)
    );
    if (attachments.length || hasIntentCard) return false;

    const visibleParts = [messageTitle(message), messageDisplayText(message)]
      .map((value) => firstText(value).replace(/[.!。！]+$/g, "").replace(/\s+/g, " ").trim().toLowerCase())
      .filter(Boolean);
    if (!visibleParts.length) return true;
    const statusOnlyCopy = new Set([
      "status updated",
      "workflow status updated",
      "状态已更新",
      "工作流状态已更新",
    ]);
    return visibleParts.every((value) => statusOnlyCopy.has(value));
  }

  function chatScrollKey(view = state.chatView, filter = state.experienceFilter) {
    const appId = firstText(state.current?.id, state.currentId);
    return `${appId}:${view}:${normalizedIdentity(filter)}`;
  }

  function chatStreamNearBottom(stream, threshold = 120) {
    if (!stream) return false;
    return stream.scrollHeight - stream.scrollTop - stream.clientHeight < threshold;
  }

  function elementOffsetTopWithin(container, element) {
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    return elementRect.top - containerRect.top + container.scrollTop;
  }

  function stabilizeChatScrollForLayoutShift(stream, anchorElement, previousHeight = 0) {
    if (!stream || !anchorElement?.isConnected || stream.hidden) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!anchorElement.isConnected) return;
        const nextHeight = anchorElement.offsetHeight;
        const heightDelta = nextHeight - Math.max(0, previousHeight);
        if (heightDelta <= 1) return;

        if (chatStreamNearBottom(stream)) {
          stream.scrollTop = Math.max(0, stream.scrollHeight - stream.clientHeight);
          return;
        }

        const anchorTop = elementOffsetTopWithin(stream, anchorElement);
        const viewportTop = stream.scrollTop;
        const anchorBottomBefore = anchorTop + Math.max(0, previousHeight);

        if (anchorBottomBefore <= viewportTop + 1) {
          stream.scrollTop = viewportTop + heightDelta;
        } else if (anchorTop < viewportTop) {
          stream.scrollTop = viewportTop + Math.min(heightDelta, viewportTop - anchorTop);
        }
      });
    });
  }

  function rememberChatScrollPosition() {
    const stream = dom.chatStream;
    if (!stream || !state.current || stream.hidden) return;
    const maximum = Math.max(0, stream.scrollHeight - stream.clientHeight);
    const top = Math.max(0, Math.min(Number(stream.scrollTop) || 0, maximum));
    state.chatScrollPositions.set(chatScrollKey(), {
      top,
      atBottom: maximum - top < 120,
    });
  }

  function restoreChatScrollPosition({ key, changedView, wasNearBottom, previousTop }) {
    const stream = dom.chatStream;
    const revision = ++state.chatScrollRevision;
    const saved = changedView ? state.chatScrollPositions.get(key) : null;
    const shouldPinLatest = Boolean(state.forceChatBottom || (changedView && (saved?.atBottom ?? wasNearBottom)));

    // iOS Safari can retain an out-of-range scrollTop when a long conversation
    // is replaced by a shorter one. Reset before layout, then calibrate again
    // after all grid rows (including the composer) have settled.
    if (changedView) stream.scrollTop = 0;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (revision !== state.chatScrollRevision || !state.current || chatScrollKey() !== key) return;
        const maximum = Math.max(0, stream.scrollHeight - stream.clientHeight);
        let target = maximum;
        if (state.forceChatBottom) {
          state.forceChatBottom = false;
        } else if (saved && !saved.atBottom) target = Math.min(saved.top, maximum);
        else if (!changedView && !wasNearBottom) target = Math.min(previousTop, maximum);
        stream.scrollTop = Math.max(0, target);
        if (shouldPinLatest) {
          // Attachments can change the row height well after the first paint,
          // especially through a phone connection. Keep a newly opened view
          // anchored to its latest message only while the reader stays near
          // the bottom; never yank the viewport when they are reading history.
          const pinToLatest = () => {
            if (revision !== state.chatScrollRevision || chatScrollKey() !== key) return;
            if (!chatStreamNearBottom(stream)) return;
            stream.scrollTop = Math.max(0, stream.scrollHeight - stream.clientHeight);
          };
          [180, 600, 1_500, 3_500, 7_000].forEach((delay) => window.setTimeout(pinToLatest, delay));
        }
      });
    });
  }

  function messageDisplayText(message) {
    if (
      (state.chatView === "experience" || (
        usesDirectDeveloperStudyConversation() && usesAppLooperStudyTreatment()
      ))
      && isExperienceAgentMessage(message)
    ) {
      return experienceMessageDisplayText(message);
    }
    return messageText(message);
  }

  function messageTitle(message) {
    if (isUserAuthoredMessage(message)) {
      return firstText(message?.title, message?.subject);
    }
    return localizedFirstField(message, ["title", "subject"]);
  }

  function messageRowFingerprint(message) {
    return [
      userMessageState(message),
      messageTitle(message),
      messageDisplayText(message),
      String(message?.reply_attempt_in_progress),
      String(message?.reply_failure),
      arrayFrom(message?.attachments).map((item) => firstText(item?.id, item?.url)).join(","),
    ].join("\u0001");
  }

  function visibleRenderableMessages() {
    const allMessages = state.chatView === "experience" ? experienceConversationMessages() : mainConversationMessages();
    const limitKey = chatScrollKey();
    const renderLimit = Math.max(
      MESSAGE_PAGE_SIZE,
      Number(state.messageRenderLimits.get(limitKey)) || MESSAGE_PAGE_SIZE
    );
    const hiddenCount = Math.max(0, allMessages.length - renderLimit);
    const messages = hiddenCount ? allMessages.slice(-renderLimit) : allMessages;
    return { allMessages, messages, hiddenCount, renderLimit, limitKey };
  }

  function decorateMessageRow(row, message) {
    row.dataset.messageId = developerMessageId(message);
    row.dataset.messageFingerprint = messageRowFingerprint(message);
    return row;
  }

  function updateMessageRowInPlace(row, message) {
    const title = messageTitle(message);
    const text = messageDisplayText(message);
    const bubble = row.querySelector(".message-bubble");
    if (bubble) {
      const titleEl = bubble.querySelector(".message-title");
      if (title && title !== text) {
        if (titleEl) titleEl.textContent = title;
        else bubble.prepend(element("div", "message-title", title));
      } else if (titleEl) {
        titleEl.remove();
      }
      const textEl = bubble.querySelector(".message-text");
      if (textEl) textEl.textContent = text;
      else if (text) bubble.append(element("div", "message-text", text));
      const userAuthored = row.classList.contains("is-self");
      bubble.querySelectorAll(".message-title, .message-text").forEach((node) => {
        if (userAuthored) node.setAttribute("data-user-content", "");
        else node.removeAttribute("data-user-content");
      });
    }

    const main = row.querySelector(".message-main");
    if (!main) return;
    main.querySelector(".message-queue-note")?.remove();

    if (!row.classList.contains("is-self")) return;

    const messageState = userMessageState(message);
    const copy = messageDeliveryStatusCopy(message, messageState);
    let status = main.querySelector(".message-delivery-status");
    if (!status) {
      status = element("div", `message-delivery-status is-${messageState}`, copy);
      main.append(status);
    } else {
      status.className = `message-delivery-status is-${messageState}`;
      status.replaceChildren();
      status.append(copy);
    }
    if (messageState === "replied") {
      const check = element("span", "message-delivery-check", "✓");
      check.setAttribute("aria-hidden", "true");
      status.append(check);
    }
    if (messageState === "failed") {
      const clientRequestId = clientRequestIdForMessage(message);
      const retry = element("button", "session-status-button", t("message.retry_send"));
      retry.type = "button";
      retry.disabled = !clientRequestId;
      retry.addEventListener("click", () => retryOutgoingMessage(clientRequestId));
      status.append(retry);
    }

    const note = shouldShowMessageQueueNote(message, messageState)
      ? messageQueueNoteCopy(message, messageState)
      : "";
    if (note) main.append(element("div", "message-queue-note", note));
  }

  function appendMessageWithDay(stream, message, lastDayRef) {
    const day = dayKey(messageTime(message));
    if (day && day !== lastDayRef.value) {
      stream.append(element("div", "chat-day", formatDay(messageTime(message))));
      lastDayRef.value = day;
    }
    stream.append(decorateMessageRow(renderMessage(message), message));
  }

  function tryPatchMessageStream() {
    const stream = dom.chatStream;
    if (!stream || !state.current || stream.hidden) return false;

    const conversationKey = `${state.chatView}:${normalizedIdentity(state.experienceFilter)}`;
    if (state.renderedAppId !== state.current.id || state.renderedConversationView !== conversationKey) {
      return false;
    }

    const { allMessages, messages, hiddenCount } = visibleRenderableMessages();
    const mentionId = developerMessageId(latestParticipantMention(allMessages) || {});
    if (firstText(stream.dataset.latestParticipantMention) !== mentionId) return false;
    const hasPending = ["main", "developer"].includes(state.chatView) && Boolean(state.current.pending);
    const hasEmpty = !messages.length && !hasPending;
    if (hasEmpty) return false;
    if (hiddenCount > 0 !== Boolean(stream.querySelector(".chat-history-loader"))) return false;
    if (Boolean(stream.querySelector(".pending-message")) !== hasPending) return false;
    if (stream.querySelector(".empty-chat")) return false;

    const existingRows = [...stream.querySelectorAll(".message-row[data-message-id]")];
    const existingIds = existingRows.map((row) => row.dataset.messageId);
    const nextIds = messages.map((message) => developerMessageId(message));
    const sameLength = existingIds.length === nextIds.length;
    const appendOnly = nextIds.length > existingIds.length
      && existingIds.every((id, index) => id === nextIds[index]);
    if (!sameLength && !appendOnly) return false;
    if (sameLength && existingIds.some((id, index) => id !== nextIds[index])) return false;

    const rowById = new Map(existingRows.map((row) => [row.dataset.messageId, row]));

    for (let index = 0; index < existingIds.length; index += 1) {
      const message = messages[index];
      const id = developerMessageId(message);
      const row = rowById.get(id);
      if (!row) return false;
      const fingerprint = messageRowFingerprint(message);
      if (row.dataset.messageFingerprint !== fingerprint) {
        updateMessageRowInPlace(row, message);
        row.dataset.messageFingerprint = fingerprint;
      }
      stream.appendChild(row);
    }

    let lastDay = "";
    const lastExisting = messages[Math.max(0, existingIds.length - 1)];
    if (lastExisting) lastDay = dayKey(messageTime(lastExisting)) || "";
    const lastDayRef = { value: lastDay };

    for (let index = existingIds.length; index < messages.length; index += 1) {
      appendMessageWithDay(stream, messages[index], lastDayRef);
    }

    stream.querySelector(".empty-chat")?.remove();
    state.lastMainConversationFingerprint = mainConversationFingerprint(allMessages);
    return true;
  }

  function renderMessages({ prependedFrom = null, force = false } = {}) {
    if (!force && shouldDeferBackgroundRender()) {
      state.deferredAppRender = true;
      return;
    }
    const stream = dom.chatStream;
    const previousTop = Math.max(0, Number(stream.scrollTop) || 0);
    const wasNearBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 120;
    const changedApp = state.renderedAppId !== state.current.id;
    const conversationKey = `${state.chatView}:${normalizedIdentity(state.experienceFilter)}`;
    const changedView = state.renderedConversationView !== conversationKey;
    if (changedApp && ["main", "developer"].includes(state.chatView)) state.forceChatBottom = true;
    const scrollKey = chatScrollKey();
    if (!prependedFrom && tryPatchMessageStream()) {
      return;
    }
    stream.replaceChildren();

    const { allMessages, messages, hiddenCount, renderLimit, limitKey } = visibleRenderableMessages();
    const latestMention = latestParticipantMention(allMessages);
    const latestMentionId = developerMessageId(latestMention || {});
    stream.dataset.latestParticipantMention = latestMentionId;
    renderParticipantMentionNotice(latestMention);
    if (hiddenCount) {
      const revealCount = Math.min(MESSAGE_PAGE_SIZE, hiddenCount);
      const earlier = element("button", "chat-history-loader", t("conversation.show_earlier", { count: revealCount }));
      earlier.type = "button";
      earlier.addEventListener("click", () => {
        const before = {
          height: stream.scrollHeight,
          top: Math.max(0, Number(stream.scrollTop) || 0),
        };
        state.messageRenderLimits.set(limitKey, renderLimit + MESSAGE_PAGE_SIZE);
        renderMessages({ prependedFrom: before });
      });
      stream.append(earlier);
    }
    let lastDay = "";
    messages.forEach((message) => {
      const day = dayKey(messageTime(message));
      if (day && day !== lastDay) {
        stream.append(element("div", "chat-day", formatDay(messageTime(message))));
        lastDay = day;
      }
      stream.append(renderMessage(message));
    });

    if (["main", "developer"].includes(state.chatView) && state.current.pending) stream.append(renderPendingCard(state.current.pending));

    if (!messages.length && !(["main", "developer"].includes(state.chatView) && state.current.pending)) {
      const empty = element("div", "empty-chat");
      if (state.chatView === "experience") {
        const loadingHistory = state.experienceConversationLoading;
        const preparing = loadingHistory || isPersonaGenerationInProgress();
        const symbol = element("div", "empty-symbol");
        if (preparing) symbol.append(element("span", "progress-spinner"));
        else symbol.textContent = state.locale === "zh-CN" ? "验" : "E";
        empty.append(
          symbol,
          element("h3", "", loadingHistory
            ? (state.locale === "zh-CN" ? "正在恢复体验交流记录" : "Restoring internal-test history")
            : t(preparing ? "conversation.preparing_title" : "conversation.empty_title")),
          element("p", "", loadingHistory
            ? (state.locale === "zh-CN" ? "正在从这台电脑的工作流记录加载已有交流。" : "Loading existing conversations from this computer.")
            : t(preparing ? "conversation.preparing_copy" : "conversation.empty_copy"))
        );
        if (state.experienceConversationError) {
          const retry = element("button", "secondary-button", state.locale === "zh-CN" ? "重新加载历史记录" : "Retry loading history");
          retry.type = "button";
          retry.addEventListener("click", () => void loadExperienceConversation({ silent: false }));
          empty.append(retry);
        }
      } else {
        empty.append(
          element("div", "empty-symbol", "研"),
          element("h3", "", t("developer.ready")),
          element("p", "", t("developer.ready_copy"))
        );
      }
      stream.append(empty);
    }

    state.renderedAppId = state.current.id;
    state.renderedConversationView = conversationKey;
    state.lastMainConversationFingerprint = mainConversationFingerprint(allMessages);
    if (state.pendingMessageTarget) {
      const target = state.pendingMessageTarget;
      state.pendingMessageTarget = "";
      window.setTimeout(() => jumpToConversationMessage(target), 0);
    }
    if (prependedFrom) {
      const revision = ++state.chatScrollRevision;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (revision !== state.chatScrollRevision) return;
          const addedHeight = Math.max(0, stream.scrollHeight - prependedFrom.height);
          stream.scrollTop = Math.max(0, prependedFrom.top + addedHeight);
        });
      });
    } else {
      restoreChatScrollPosition({
        key: scrollKey,
        changedView: changedApp || changedView,
        wasNearBottom,
        previousTop,
      });
    }
  }

  function isPersonaGenerationInProgress() {
    const personas = state.current?.personas || [];
    if (personas.length) return false;
    const phase = firstText(state.current?.phase).toUpperCase();
    if (["EXPERIENCE", "REPLAY", "REVIEW", "DELIVER"].includes(phase)) return false;
    const status = firstText(state.current?.status).toLowerCase();
    return personas.length === 0 && ["starting", "running"].includes(status);
  }

  function developerActivityTaskCopy(activity = state.current?.developer || {}) {
    return localizedFirstField(activity, ["current", "next"]);
  }

  function developerQueueWaitingCopy(activity = state.current?.developer || {}) {
    const task = developerActivityTaskCopy(activity);
    if (task) return t("message.waiting_task_detail", { task });
    const personaName = activePublicFeedbackPersonaName();
    if (personaName) return t("message.waiting_persona", { name: personaName });
    return t("message.waiting_current");
  }

  function hasExperienceFeedback() {
    return (state.current?.messages || []).some(isExperienceThreadMessage);
  }

  function personaThreadId(message) {
    const channel = firstText(message?.channel, message?.thread, message?.conversation).trim();
    const match = /^experience:(.+)$/i.exec(channel);
    return match ? match[1].trim() : "";
  }

  function messagePersonaId(message) {
    return firstText(message?.persona_id, message?.personaId, personaThreadId(message));
  }

  function isRealUserIterationMessage(message) {
    const channel = firstText(message?.channel).toLowerCase();
    const kind = firstText(message?.kind, message?.type).toLowerCase();
    return channel === "experience:real-users" || kind === "real_user_insight" || kind === "real_user_reply";
  }

  function isOperationsRealUserInsight(message) {
    return isRealUserIterationMessage(message) && messageActor(message) === "operations";
  }

  function isExperienceAgentMessage(message) {
    const actor = messageActor(message);
    const kind = firstText(message?.kind, message?.type).toLowerCase();
    if (isRealUserIterationMessage(message)) return false;
    return EXPERIENCE_ACTORS.has(actor) || kind === "experience_feedback";
  }

  function isInternalTestAgentMessage(message) {
    if (!isExperienceAgentMessage(message)) return false;
    const identity = normalizedIdentity(firstText(
      localizedFirstField(message, ["sender_name", "persona_name", "name"]),
      message?.agent_role,
      message?.agent_kind
    ));
    return identity.includes("测试智能体")
      || identity.includes("内测智能体")
      || identity.includes("testagent")
      || identity.includes("internaltest");
  }

  function normalizedIdentity(value) {
    return String(value || "")
      .normalize("NFKC")
      .trim()
      .toLocaleLowerCase("zh-CN")
      .replace(/\s+/g, "");
  }

  function personaMessagesFor(member) {
    const memberId = normalizedIdentity(firstText(member?.id, member?.persona_id, member?.personaId));
    const memberName = normalizedIdentity(firstText(member?.name, member?.display_name));
    const sameNameCount = (state.current?.personas || []).filter(
      (persona) => normalizedIdentity(firstText(persona?.name, persona?.display_name)) === memberName
    ).length;
    return (state.current?.messages || [])
      .filter((message) => {
        if (!isExperienceThreadMessage(message)) return false;
        const personaId = normalizedIdentity(messagePersonaId(message));
        if (personaId) return Boolean(memberId && personaId === memberId);
        if (sameNameCount !== 1) return false;
        const messageName = normalizedIdentity(firstText(message?.persona_name, message?.personaName, message?.name));
        return Boolean(memberName && messageName === memberName);
      })
      .sort((left, right) => {
        const leftTime = Date.parse(messageTime(left)) || 0;
        const rightTime = Date.parse(messageTime(right)) || 0;
        return rightTime - leftTime;
      });
  }

  function experiencePersonaNameForMessage(message) {
    const messageId = normalizedIdentity(messagePersonaId(message));
    const persona = (state.current?.personas || []).find((candidate) => {
      const candidateId = normalizedIdentity(firstText(candidate?.id, candidate?.persona_id, candidate?.personaId));
      return Boolean(messageId && candidateId === messageId);
    });
    return firstText(
      localizedPersonaName(persona),
      localizedFirstField(message, ["persona_name", "personaName"]),
      messagePersonaId(message)
    );
  }

  function isOperationsChatMessage(message) {
    return Boolean(message?._operations_chat);
  }

  function operationsConversationMessages() {
    return arrayFrom(currentOperations().messages);
  }

  function isOperationsAgentReplyMessage(message) {
    const actor = firstText(message?.actor, message?.role).toLowerCase();
    return actor === "operations" || actor === "agent";
  }

  function hasSubsequentOperationsReply(message) {
    const messages = operationsConversationMessages();
    const messageId = developerMessageId(message);
    const messageIndex = messages.findIndex((candidate) => developerMessageId(candidate) === messageId);
    if (messageIndex < 0) return false;
    const messageTimeValue = parseDate(messageTime(message));
    for (let index = messageIndex + 1; index < messages.length; index += 1) {
      const candidate = messages[index];
      if (!isOperationsAgentReplyMessage(candidate)) continue;
      if (messageTimeValue) {
        const candidateTime = parseDate(messageTime(candidate));
        if (candidateTime && candidateTime <= messageTimeValue) continue;
      }
      return true;
    }
    return false;
  }

  function operationsUserMessageState(message) {
    const clientState = firstText(message?._client_send_state).toLowerCase();
    if (["sending", "failed"].includes(clientState)) return clientState;
    const explicit = firstText(message?.user_message_state).toLowerCase();
    if (["unread", "processing", "replied"].includes(explicit)) {
      if (explicit === "unread" && hasSubsequentOperationsReply(message)) return "replied";
      return explicit;
    }
    if (hasSubsequentOperationsReply(message)) return "replied";
    const requestId = firstText(message?.request_id);
    if (requestId) {
      const request = arrayFrom(currentOperations().agentRequests).find((item) => firstText(item?.id) === requestId);
      const status = firstText(request?.status).toLowerCase();
      if (status === "running") return "processing";
      if (status === "queued") return "unread";
    }
    const agent = currentOperations().operationsAgent;
    if (requestId && firstText(agent?.currentRequestId) === requestId) {
      const agentStatus = firstText(agent?.status).toLowerCase();
      if (agentStatus === "running") return "processing";
      if (agentStatus === "queued") return "unread";
    }
    return "unread";
  }

  function userMessageState(message) {
    if (isOperationsChatMessage(message)) return operationsUserMessageState(message);
    const clientState = firstText(message?._client_send_state).toLowerCase();
    if (["sending", "failed"].includes(clientState)) return clientState;
    const explicit = firstText(
      message?.user_message_state,
      message?.developer_message_state
    ).toLowerCase();
    if (["unread", "processing", "replied"].includes(explicit)) {
      if (explicit === "unread" && hasSubsequentDeveloperReply(message)) return "replied";
      return explicit;
    }
    const receipt = firstText(message?.receipt_status).toLowerCase();
    if (message?.agent_processed === true || receipt === "processed") return "replied";
    if (message?.agent_read === true || receipt === "read") return "processing";
    if (hasSubsequentDeveloperReply(message)) return "replied";
    return "unread";
  }

  function hasSubsequentDeveloperReply(message) {
    const messages = mainConversationMessages();
    const messageId = developerMessageId(message);
    const messageIndex = messages.findIndex((candidate) => developerMessageId(candidate) === messageId);
    if (messageIndex < 0) return false;
    const messageTimeValue = parseDate(messageTime(message));
    for (let index = messageIndex + 1; index < messages.length; index += 1) {
      const candidate = messages[index];
      const actor = messageActor(candidate);
      const kind = firstText(candidate?.kind, candidate?.type).toLowerCase();
      if (kind === "system" || kind === "event") continue;
      if (!["developer", "orchestrator"].includes(actor)) continue;
      if (messageTimeValue) {
        const candidateTime = parseDate(messageTime(candidate));
        if (candidateTime && candidateTime <= messageTimeValue) continue;
      }
      return true;
    }
    return false;
  }

  function latestQueuedUserMessageId() {
    const messages = mainConversationMessages().filter((candidate) => {
      const actor = messageActor(candidate);
      return isSelfMessage(candidate, actor) && ["unread", "processing"].includes(userMessageState(candidate));
    });
    return developerMessageId(messages.at(-1));
  }

  function latestUnreadUserMessageId() {
    const messages = mainConversationMessages().filter((candidate) => {
      const actor = messageActor(candidate);
      return isSelfMessage(candidate, actor) && userMessageState(candidate) === "unread";
    });
    return developerMessageId(messages.at(-1));
  }

  function activePublicFeedbackPersonaName() {
    const activity = state.current?.developer || {};
    const explicit = localizedFirstField(
      activity,
      ["active_feedback_persona_name", "feedback_persona_name", "persona_name"]
    );
    if (explicit) return explicit;
    const current = firstText(activity.current);
    if (!current) return "";
    const personas = arrayFrom(state.current?.personas);
    const matching = personas.find((persona) => {
      const name = localizedPersonaName(persona);
      return name && current.includes(name);
    });
    return localizedPersonaName(matching);
  }

  function unreadMessageWaitingCopy() {
    const activity = state.current?.developer || {};
    const kind = firstText(activity.kind).toLowerCase();
    const status = firstText(activity.status, state.current?.status).toLowerCase();
    if (kind === "recovering") {
      return localizedFirstField(activity, ["current", "next"], t("activity.recovering"));
    }
    if (kind === "retrying" || activity.queue_blocked || status === "retrying_error") {
      return t("message.waiting_retry");
    }
    if (kind === "waiting" || status === "paused" || status === "paused_safety" || activity.pid_alive === false) {
      return localizedFirstField(activity, ["current", "next"], t("message.waiting_paused"));
    }
    return developerQueueWaitingCopy(activity);
  }

  function messageDeliveryStatusKey(message, messageState) {
    if (!isOperationsChatMessage(message)) return `message.${messageState}`;
    if (messageState === "unread") return "message.operations_unread";
    if (messageState === "processing") return "message.operations_processing";
    if (messageState === "replied") return "message.operations_replied";
    return `message.${messageState}`;
  }

  function messageDeliveryStatusCopy(message, messageState) {
    if (messageState === "failed") {
      const failureReason = localizedFirstField(message, ["_client_send_error"]);
      return failureReason
        ? t("message.failed_reason", { reason: failureReason })
        : t("message.failed");
    }
    if (messageState !== "processing") return t(messageDeliveryStatusKey(message, messageState));
    const activity = state.current?.developer || {};
    const kind = firstText(activity.kind).toLowerCase();
    const status = firstText(activity.status, state.current?.status).toLowerCase();
    const retry = state.current?.retry;
    if (
      firstText(retry?.reason_code, state.current?.retry_reason_code).toLowerCase() === "coding_agent_quota_exhausted"
    ) {
      return t("message.waiting_quota");
    }
    if (kind === "retrying" || status === "retrying_error" || activity.queue_blocked) {
      return t("message.waiting_retry");
    }
    if (message?.reply_attempt_in_progress === true) {
      return t(isOperationsChatMessage(message) ? "message.operations_processing_active" : "message.processing_active");
    }
    if (isOperationsChatMessage(message)) {
      return t("message.operations_processing");
    }
    if (kind === "waiting" || status === "paused" || status === "paused_safety" || activity.pid_alive === false) {
      return t("message.waiting_paused");
    }
    const task = developerActivityTaskCopy(activity);
    if (task) return t("message.waiting_task");
    return t("message.processing");
  }

  function shouldShowMessageQueueNote(message, messageState) {
    if (isOperationsChatMessage(message)) return false;
    if (!["unread", "processing"].includes(messageState)) return false;
    if (message?.reply_attempt_in_progress === true) return false;
    if (developerMessageId(message) !== latestQueuedUserMessageId()) return false;
    if (hasSubsequentDeveloperReply(message)) return false;
    const activity = state.current?.developer || {};
    const task = developerActivityTaskCopy(activity);
    if (messageState === "processing" && !task) return false;
    return Boolean(messageQueueNoteCopy(message, messageState));
  }

  function messageQueueNoteCopy(message, messageState) {
    const queuedId = latestQueuedUserMessageId();
    if (!queuedId || developerMessageId(message) !== queuedId) return "";
    return unreadMessageWaitingCopy();
  }

  function renderMessage(message) {
    const kind = firstText(message?.kind, message?.type).toLowerCase();
    const actor = messageActor(message);
    const text = messageText(message);
    const title = messageTitle(message);
    const attachments = messageAttachments(message);

    if ((kind === "system" || kind === "event") && !attachments.length) {
      const systemMessage = element("div", "system-message", text || title || t("message.system_update"));
      if (isUserAuthoredMessage(message)) systemMessage.setAttribute("data-user-content", "");
      return systemMessage;
    }

    const self = isSelfMessage(message, actor);
    const developerFeedback = !self && (actor === "developer" || actor === "orchestrator");
    const experienceView = state.chatView === "experience";
    const mergedStudyExperience = usesDirectDeveloperStudyConversation() && usesAppLooperStudyTreatment();
    const realUserInsight = experienceView && isOperationsRealUserInsight(message);
    const realUserDevReply = experienceView && developerFeedback && isRealUserIterationMessage(message);
    const experienceReport = (experienceView || mergedStudyExperience) && !developerFeedback && isExperienceAgentMessage(message);
    const internalTestReport = experienceReport && isInternalTestAgentMessage(message);
    const row = element(
      "article",
      `message-row${self ? " is-self" : ""}${developerFeedback ? " is-developer-feedback" : ""}${experienceReport ? " is-experience-report" : ""}${realUserInsight ? " is-real-user-insight" : ""}`
    );
    const sender = messageSender(message, actor, self);
    row.setAttribute(
      "aria-label",
      self
        ? t(isOperationsChatMessage(message) ? "message.sent_aria_operations" : "message.sent_aria")
        : developerFeedback && experienceView && realUserDevReply
          ? t("message.real_user_reply_aria")
        : developerFeedback && experienceView
          ? t("message.experience_reply_aria")
          : developerFeedback
          ? t("message.feedback_aria")
          : realUserInsight
            ? t("message.real_user_insight_aria")
          : experienceReport
            ? t(internalTestReport ? "message.internal_test_report_aria" : "message.experience_report_aria", { sender })
          : t("message.other_aria", { sender })
    );
    decorateMessageRow(row, message);

    const avatar = element("div", `message-avatar ${avatarTone(actor, self)}`, initialFor(sender));
    applyAgentAvatar(avatar, agentAvatarKeyForMessage(message, actor, self), initialFor(sender));
    if (experienceReport) {
      avatar.classList.add("is-clickable");
      avatar.setAttribute("role", "button");
      avatar.tabIndex = 0;
      const profileLabel = t(internalTestReport ? "agents.open_internal_test_profile" : "agents.open_experience_profile", { name: sender });
      avatar.title = profileLabel;
      avatar.setAttribute("aria-label", profileLabel);
      avatar.addEventListener("click", () => openAgentFromMessage(message));
      avatar.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openAgentFromMessage(message);
        }
      });
    } else {
      avatar.setAttribute("aria-hidden", "true");
    }
    if (self) avatar.setAttribute("data-user-content", "");
    const main = element("div", "message-main");
    const meta = element("div", "message-meta");
    const senderNode = element("strong", "", sender);
    if (self) senderNode.setAttribute("data-user-content", "");
    meta.append(senderNode);
    if (experienceReport && isLatestExperienceAgentMessage(message)) {
      const agentId = messagePersonaId(message);
      const statusButton = element("button", "session-status-button", t("session.open"));
      statusButton.type = "button";
      statusButton.addEventListener("click", () => openDeveloperSession(agentId, sender));
      meta.append(statusButton);
    }
    let deliveryStatus = null;
    let waitingCopy = null;
    if (self) {
      const messageState = userMessageState(message);
      const failureReason = localizedFirstField(message, ["_client_send_error"]);
      deliveryStatus = element(
        "div",
        `message-delivery-status is-${messageState}`,
        messageState === "failed" && failureReason
          ? t("message.failed_reason", { reason: failureReason })
          : messageDeliveryStatusCopy(message, messageState)
      );
      if (messageState === "replied") {
        const check = element("span", "message-delivery-check", "✓");
        check.setAttribute("aria-hidden", "true");
        deliveryStatus.append(check);
      }
      if (messageState === "failed") {
        const clientRequestId = clientRequestIdForMessage(message);
        const retry = element("button", "session-status-button", t("message.retry_send"));
        retry.type = "button";
        retry.disabled = !clientRequestId;
        retry.addEventListener("click", () => retryOutgoingMessage(clientRequestId));
        deliveryStatus.append(retry);
      }
      if (shouldShowMessageQueueNote(message, messageState)) {
        const copy = messageQueueNoteCopy(message, messageState);
        if (copy) waitingCopy = element("div", "message-queue-note", copy);
      }
    }
    if (developerFeedback) {
      const personaName = experienceView && !realUserDevReply ? experiencePersonaNameForMessage(message) : "";
      if (realUserDevReply || personaName) {
        const route = realUserDevReply
          ? t("message.real_user_reply")
          : t("conversation.fix_reply_to", { name: personaName });
        meta.append(element("span", "message-route is-feedback", route));
      }
    } else if (realUserInsight) {
      meta.append(element("span", "message-route is-real-user", t("message.real_user_insight")));
    } else if (experienceReport) {
      meta.append(element("span", "message-route is-experience", t(internalTestReport ? "message.internal_test_report" : "message.experience_report")));
    }
    const when = messageTime(message);
    if (when) {
      const date = parseDate(when);
      const timestamp = element("time", "", self ? formatMessageTime(when) : formatMessageDateTime(when));
      if (date) timestamp.dateTime = date.toISOString();
      meta.append(timestamp);
    }

    const bubble = element("div", "message-bubble");
    const quote = !self ? messageQuote(message) : null;
    if (quote) bubble.append(renderMessageQuote(quote));
    const displayText = messageDisplayText(message);
    if (title && title !== displayText) {
      const titleNode = element("div", "message-title", title);
      if (self) titleNode.setAttribute("data-user-content", "");
      bubble.append(titleNode);
    }
    if (displayText) {
      const textNode = element("div", "message-text", displayText);
      if (self) textNode.setAttribute("data-user-content", "");
      bubble.append(textNode);
    }
    if (attachments.length) bubble.append(renderAttachments(attachments));
    main.append(meta, bubble);
    const intentCard = renderIntentCard(message);
    if (intentCard) main.append(intentCard);
    if (deliveryStatus) main.append(deliveryStatus);
    if (waitingCopy) main.append(waitingCopy);
    row.append(avatar, main);
    return row;
  }

  const MENTION_ALIASES = [
    ["developer", ["研发智能体", "研发", "developer", "dev"]],
    ["operations", ["运营智能体", "运营", "operations", "ops"]],
    ["project_manager", ["应用管理智能体", "项目管理智能体", "应用管理", "项目管理", "project manager", "pm"]],
  ];

  // Route a message directly to the developer/operations/PM agent when it starts
  // with an @mention; otherwise the App-management agent handles it by default.
  function detectMentionTarget(text) {
    const match = /^\s*@\s*([^\s，,：:@]+)/.exec(String(text || ""));
    if (!match) return "";
    const token = match[1].trim().toLowerCase();
    if (!token) return "";
    for (const [agent, aliases] of MENTION_ALIASES) {
      for (const alias of aliases) {
        const aliasLower = alias.toLowerCase();
        if (token === aliasLower || token.startsWith(aliasLower) || aliasLower.startsWith(token)) {
          return agent;
        }
      }
    }
    return "";
  }

  function intentActionHandler(kind) {
    switch (kind) {
      case "open_trial":
        return () => openExperienceTwin();
      case "open_launch":
        return () => openLaunch();
      case "open_operations_feedback":
      case "open_operations_analytics":
      case "open_operations_traffic":
        return () => openGrowth();
      case "open_repository":
        return () => {
          if (!studyShowRepositoryManagement()) return;
          void openRepositoryDialog();
        };
      case "open_target_users":
        return () => openDrawer("members");
      default:
        return null;
    }
  }

  function renderIntentCard(message) {
    const intent = firstText(message?.intent);
    const payload = message?.intent_payload;
    if (!intent || intent === "none" || !payload || typeof payload !== "object") return null;
    const card = element("div", "intent-card");
    if (payload.recommendation) {
      const go = payload.recommendation === "go";
      card.append(
        element("div", `intent-reco is-${go ? "go" : "hold"}`, go ? t("intent.launch_go") : t("intent.launch_hold"))
      );
    }
    const checklist = localizedArrayField(payload, "checklist", ["label", "text", "title"]);
    if (checklist.length) {
      const list = element("div", "intent-checklist");
      list.append(element("div", "intent-checklist-title", t("intent.checklist_title")));
      checklist.forEach((row) => {
        const id = firstText(row?.id);
        const label = localizedFirstField(row, ["label", "text", "title"]);
        if (!id || !label) return;
        const line = element("label", "intent-checklist-item");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(row?.checked);
        checkbox.addEventListener("change", () => {
          void toggleReleaseReviewItem(id, checkbox.checked);
        });
        line.append(checkbox, element("span", "", label));
        list.append(line);
      });
      card.append(list);
    }
    const actions = localizedArrayField(payload, "actions", ["label", "text", "title"]);
    if (actions.length) {
      const actionRow = element("div", "intent-actions");
      actions.forEach((action) => {
        const handler = intentActionHandler(firstText(action?.kind));
        if (!handler) return;
        const button = element(
          "button",
          "secondary-button intent-action",
          localizedFirstField(action, ["label", "text", "title"], t("intent.open"))
        );
        button.type = "button";
        button.addEventListener("click", () => {
          closeDrawers();
          handler();
        });
        actionRow.append(button);
      });
      if (actionRow.childElementCount) card.append(actionRow);
    }
    return card.childElementCount ? card : null;
  }

  function isLatestExperienceAgentMessage(message) {
    const personaId = normalizedIdentity(messagePersonaId(message));
    if (!personaId) return false;
    const messages = (state.current?.messages || []).filter(
      (candidate) => isExperienceAgentMessage(candidate)
        && normalizedIdentity(messagePersonaId(candidate)) === personaId
    );
    const latest = messages.at(-1);
    return Boolean(latest && developerMessageId(latest) === developerMessageId(message));
  }

  function openDeveloperSession(agentId = "developer", agentName = "") {
    if (!state.current || !dom.developerSessionDialog) return;
    state.developerSessionAgentId = firstText(agentId, "developer");
    state.developerSessionAgentName = firstText(agentName, state.developerSessionAgentId === "developer" ? t("developer.name") : t("agents.experience"));
    state.developerSessionOpen = true;
    state.developerSessionEntries = [];
    state.developerSessionLiveEntries = [];
    state.developerSessionRenderedIds.clear();
    state.developerSessionCursor = 0;
    state.developerSessionId = "";
    dom.developerSessionTitle.textContent = t("session.title_agent", { name: state.developerSessionAgentName });
    dom.developerSessionMeta.textContent = t("session.loading");
    if (dom.developerSessionHeartbeat) {
      dom.developerSessionHeartbeat.textContent = "";
      dom.developerSessionHeartbeat.hidden = true;
    }
    dom.developerSessionLog.setAttribute("aria-busy", "true");
    dom.developerSessionLog.setAttribute("aria-live", "off");
    const loading = element("div", "developer-session-empty");
    loading.append(
      element("span", "progress-spinner"),
      element("span", "", t("session.loading"))
    );
    dom.developerSessionLog.replaceChildren(loading);
    if (typeof dom.developerSessionDialog.showModal === "function") dom.developerSessionDialog.showModal();
    else dom.developerSessionDialog.setAttribute("open", "");
    loadDeveloperSession({ immediate: true });
  }

  window.AppLooperStudyHooks = Object.assign({}, window.AppLooperStudyHooks, {
    openAgentStatus: openDeveloperSession,
    loadNoVncRfb: loadNoVncRfbModule,
  });

  function closeDeveloperSession() {
    stopDeveloperSessionPolling();
    closeDialog(dom.developerSessionDialog);
  }

  function stopDeveloperSessionPolling() {
    state.developerSessionOpen = false;
    window.clearTimeout(state.developerSessionTimer);
    state.developerSessionTimer = null;
    state.developerSessionRequest += 1;
  }

  function mapDeveloperSessionRecord(entry, index, prefix = "") {
    return {
      id: firstText(entry?.id, entry?.event_id, `${prefix}${entry?.timestamp || entry?.at || ""}:${index}`),
      timestamp: firstText(entry?.timestamp, entry?.at, entry?.created_at),
      kind: firstText(entry?.kind, entry?.type, "status"),
      text: firstText(entry?.text, entry?.message, entry?.body, entry?.summary),
      name: firstText(entry?.name, entry?.tool),
      status: firstText(entry?.status),
      type: firstText(entry?.type),
      operationId: firstText(entry?.operation_id, entry?.operationId),
    };
  }

  async function loadDeveloperSession({ immediate = false } = {}) {
    if (!state.developerSessionOpen || !state.current) return;
    const runId = state.current.id;
    const requestNumber = ++state.developerSessionRequest;
    let nextDelay = state.developerSessionPollAfter || 2_000;
    try {
      const params = new URLSearchParams({ cursor: String(state.developerSessionCursor || 0) });
      params.set("agent_id", state.developerSessionAgentId || "developer");
      if (!state.developerSessionId && !state.developerSessionCursor) params.set("tail", "1");
      if (state.developerSessionId) params.set("session_id", state.developerSessionId);
      const payload = await request(`/apps/${encodeURIComponent(runId)}/agent-session?${params}`);
      if (!state.developerSessionOpen || requestNumber !== state.developerSessionRequest || runId !== state.currentId) return;
      const rows = arrayFrom(payload?.records ?? payload?.entries ?? payload?.events)
        .map((entry, index) => mapDeveloperSessionRecord(entry, index))
        .filter((entry) => entry.text || entry.name || entry.status);
      const liveRows = arrayFrom(payload?.live_records)
        .map((entry, index) => mapDeveloperSessionRecord(entry, index, "live:"))
        .filter((entry) => entry.text || entry.name || entry.status);
      const nextSessionId = firstText(payload?.session_id);
      const shouldReset = payload?.reset === true || (state.developerSessionId && nextSessionId && nextSessionId !== state.developerSessionId);
      const previous = shouldReset ? [] : state.developerSessionEntries;
      const seen = new Set(previous.map((entry) => entry.id));
      const addedRows = rows.filter((entry) => {
        if (seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      });
      const combined = previous.concat(addedRows);
      const trimmed = combined.length > 500;
      state.developerSessionEntries = trimmed ? combined.slice(-500) : combined;
      state.developerSessionLiveEntries = liveRows;
      state.developerSessionCursor = Number.isSafeInteger(Number(payload?.cursor)) ? Number(payload.cursor) : state.developerSessionCursor;
      state.developerSessionId = nextSessionId || state.developerSessionId;
      const retainedIds = new Set(state.developerSessionEntries.map((entry) => entry.id));
      renderDeveloperSession(payload, {
        reset: shouldReset || trimmed,
        newEntries: addedRows.filter((entry) => retainedIds.has(entry.id)),
      });
      nextDelay = payload?.has_more ? 50 : state.developerSessionPollAfter;
    } catch (error) {
      if (!state.developerSessionOpen || requestNumber !== state.developerSessionRequest) return;
      dom.developerSessionLog.setAttribute("aria-busy", "false");
      dom.developerSessionMeta.textContent = t("session.error");
      if (immediate || !state.developerSessionEntries.length) {
        dom.developerSessionLog.replaceChildren(element("div", "developer-session-empty", t("session.error")));
      }
    } finally {
      if (state.developerSessionOpen && requestNumber === state.developerSessionRequest) {
        window.clearTimeout(state.developerSessionTimer);
        const pollAfter = nextDelay < 100
          ? 50
          : Math.max(750, Math.min(10_000, Number(nextDelay || 2_000)));
        state.developerSessionTimer = window.setTimeout(() => loadDeveloperSession(), pollAfter);
      }
    }
  }


  function renderDeveloperSessionLiveSection(log, liveEntries, liveRunning = false) {
    let section = log.querySelector(".developer-session-live");
    if (!liveEntries.length) {
      section?.remove();
      return;
    }
    if (!section) {
      section = element("div", "developer-session-live");
      log.append(section);
    }
    section.replaceChildren();
    if (liveRunning) {
      const heading = element("div", "developer-session-live-heading", t("session.live"));
      section.append(heading);
    }
    liveEntries.forEach((entry) => section.append(developerSessionRow(entry)));
  }

  function renderDeveloperSession(payload, { reset = false, newEntries = [] } = {}) {
    const log = dom.developerSessionLog;
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    const provider = firstText(payload?.provider);
    const status = firstText(payload?.status).toLowerCase();
    const running = payload?.live_running === true
      || payload?.worker_alive === true
      || payload?.running === true
      || ["active", "running"].includes(status);
    const updatedAt = firstText(payload?.transcript_updated_at, payload?.updated_at, payload?.last_at);
    const heartbeatAt = firstText(payload?.heartbeat_at, payload?.live_updated_at, updatedAt);
    state.developerSessionPollAfter = Number(payload?.poll_after_ms) || 2_000;
    let statusCopy = "";
    if (["not_started", "starting"].includes(status)) {
      statusCopy = t("session.not_started");
    } else if (payload?.available === false || ["unavailable", "not_found", "missing"].includes(status)) {
      statusCopy = t("session.unavailable");
    } else if (["paused", "waiting", "wait_user", "waiting_user", "blocked"].includes(status)) {
      statusCopy = t("session.paused");
    } else if (["stopped", "terminated", "cancelled", "canceled"].includes(status)) {
      statusCopy = t("session.stopped");
    } else if (running) {
      statusCopy = t("session.live");
    } else if (updatedAt) {
      statusCopy = t("session.completed", { time: formatRelativeTime(updatedAt) });
    } else {
      statusCopy = t("session.not_started");
    }
    dom.developerSessionMeta.textContent = [
      provider ? codingAgentLabel(provider) : "",
      statusCopy,
    ].filter(Boolean).join(" · ") || statusCopy;
    if (dom.developerSessionHeartbeat) {
      const heartbeatCopy = heartbeatAt
        ? t("session.heartbeat", { time: formatRelativeTime(heartbeatAt) })
        : "";
      const activeToolCopy = firstText(payload?.active_tool)
        ? t("session.active_tool", { name: firstText(payload.active_tool) })
        : "";
      dom.developerSessionHeartbeat.textContent = [activeToolCopy, heartbeatCopy].filter(Boolean).join(" · ");
      dom.developerSessionHeartbeat.hidden = !dom.developerSessionHeartbeat.textContent;
    }
    if (payload?.session_rotated === true) {
      dom.developerSessionMeta.textContent = [
        dom.developerSessionMeta.textContent,
        t("session.session_rotated"),
      ].filter(Boolean).join(" · ");
    }
    log.setAttribute("aria-busy", "false");
    log.setAttribute("aria-live", "off");
    const retainedIds = new Set(state.developerSessionEntries.map((entry) => entry.id));
    const renderedOutOfDate = [...state.developerSessionRenderedIds].some((id) => !retainedIds.has(id));
    const hasPlaceholder = Boolean(log.querySelector(".developer-session-empty"));
    const rebuild = reset || renderedOutOfDate || hasPlaceholder;
    if (rebuild) {
      log.replaceChildren();
      state.developerSessionRenderedIds.clear();
    }
    if (!state.developerSessionEntries.length && !state.developerSessionLiveEntries.length) {
      if (!log.querySelector(".developer-session-empty")) {
        log.replaceChildren(element("div", "developer-session-empty", t("session.empty")));
      }
      return;
    }
    log.querySelector(".developer-session-empty")?.remove();
    const rowsToRender = rebuild ? state.developerSessionEntries : newEntries;
    rowsToRender.forEach((entry) => {
      if (state.developerSessionRenderedIds.has(entry.id)) return;
      log.append(developerSessionRow(entry));
      state.developerSessionRenderedIds.add(entry.id);
    });
    renderDeveloperSessionLiveSection(log, state.developerSessionLiveEntries, payload?.live_running === true);
    if (nearBottom) log.scrollTop = log.scrollHeight;
  }

  function developerSessionRow(entry) {
    if (entry.kind === "reasoning") {
      const row = element("div", "developer-session-line is-reasoning");
      const timestamp = element("time", "", formatSessionTimestamp(entry.timestamp));
      timestamp.dateTime = entry.timestamp || "";
      row.append(
        timestamp,
        element("strong", "", t("session.reasoning")),
        element("pre", "developer-session-reasoning", firstText(entry.text))
      );
      return row;
    }
    if (entry.kind === "raw") {
      const row = element("div", "developer-session-line is-raw");
      const timestamp = element("time", "", formatSessionTimestamp(entry.timestamp));
      timestamp.dateTime = entry.timestamp || "";
      row.append(
        timestamp,
        element("strong", "", firstText(entry.type, entry.kind, "event")),
        element("pre", "developer-session-raw", firstText(entry.text))
      );
      return row;
    }
    const row = element("div", `developer-session-line is-${String(entry.kind || "status").replace(/[^a-z0-9_-]/gi, "-")}`);
    const timestamp = element("time", "", formatSessionTimestamp(entry.timestamp));
    timestamp.dateTime = entry.timestamp || "";
    const translatedStatus = ["started", "completed", "failed"].includes(entry.status)
      ? t(`session.status_${entry.status}`)
      : entry.status;
    const label = entry.kind === "tool"
      ? entry.name
        ? t("session.tool", { name: entry.name })
        : t("session.tool_status", { status: translatedStatus || entry.status })
      : entry.kind === "session"
        ? t("session.turn", { status: translatedStatus || entry.status })
      : entry.kind === "user"
        ? t("session.user")
        : entry.kind === "assistant"
          ? t("session.assistant")
          : firstText(entry.name, entry.status);
    if (label) row.append(element("strong", "", label));
    if (entry.text && (entry.kind !== "tool" || entry.text !== entry.name)) row.append(element("pre", "", entry.text));
    row.prepend(timestamp);
    return row;
  }

  function formatSessionTimestamp(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "--:--:--";
    return new Intl.DateTimeFormat(state.locale, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  }

  function renderAttachments(attachments) {
    const container = element("div", "message-attachments");
    const prepared = attachments.map((attachment) => {
      const info = attachmentInfo(attachment);
      return { info, url: safeUrl(info.url) };
    });
    const visualCount = prepared.filter(({ info, url }) => url && ["image", "video"].includes(info.kind)).length;
    if (visualCount > 1) container.classList.add("is-gallery");

    const collapsedVisuals = [];
    let visualIndex = 0;
    prepared.forEach(({ info, url }) => {
      if (info.kind === "image" && url) {
        const wrap = element("figure", "attachment-media is-image");
        wrap.setAttribute("data-user-content", "");
        const link = element("a", "attachment-link");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener";
        link.title = info.caption || t("media.original");
        const image = document.createElement("img");
        image.alt = info.caption || info.name || t("media.image");
        image.loading = "eager";
        prepareAttachmentImage(link, image, url);
        wrap.append(link);
        if (info.caption) {
          const caption = element("figcaption", "attachment-caption");
          caption.textContent = info.caption;
          wrap.append(caption);
        }
        visualIndex += 1;
        if (visualCount > 4 && visualIndex > 4) {
          wrap.hidden = true;
          collapsedVisuals.push(wrap);
        }
        container.append(wrap);
        return;
      }

      if (info.kind === "video" && url) {
        const wrap = element("div", "attachment-media is-video");
        wrap.setAttribute("data-user-content", "");
        const video = document.createElement("video");
        video.src = url;
        video.controls = true;
        video.preload = "metadata";
        video.setAttribute("aria-label", info.name || t("media.video"));
        video.addEventListener("loadedmetadata", () => {
          const previousHeight = wrap.offsetHeight;
          stabilizeChatScrollForLayoutShift(dom.chatStream, wrap, previousHeight);
        }, { once: true });
        wrap.append(video);
        visualIndex += 1;
        if (visualCount > 4 && visualIndex > 4) {
          wrap.hidden = true;
          collapsedVisuals.push(wrap);
        }
        container.append(wrap);
        return;
      }

      if (info.kind === "audio" && url) {
        const wrap = element("div", "attachment-media is-audio");
        wrap.setAttribute("data-user-content", "");
        const audio = document.createElement("audio");
        audio.src = url;
        audio.controls = true;
        audio.preload = "metadata";
        audio.setAttribute("aria-label", info.name || t("media.audio"));
        wrap.append(audio);
        container.append(wrap);
        return;
      }

      const file = element(url ? "a" : "div", "file-attachment");
      file.setAttribute("data-user-content", "");
      if (url) {
        file.href = url;
        file.target = "_blank";
        file.rel = "noopener";
        file.download = info.name || "";
      }
      const extension = fileExtension(info.name) || t("media.file");
      const copy = element("span", "file-copy");
      copy.append(
        element("strong", "", info.name || t("media.attachment")),
        element("small", "", info.size ? formatBytes(info.size) : info.mime || t("media.open"))
      );
      file.append(element("span", "file-icon", extension.slice(0, 4)), copy);
      container.append(file);
    });

    if (collapsedVisuals.length) {
      const button = element("button", "media-expand-button", t("media.more", { count: collapsedVisuals.length }));
      button.type = "button";
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", () => {
        const expanding = button.getAttribute("aria-expanded") !== "true";
        const previousHeights = collapsedVisuals.map((item) => item.offsetHeight);
        collapsedVisuals.forEach((item) => {
          item.hidden = !expanding;
        });
        button.setAttribute("aria-expanded", String(expanding));
        button.textContent = expanding ? t("media.collapse") : t("media.more", { count: collapsedVisuals.length });
        if (expanding) {
          collapsedVisuals.forEach((item, index) => {
            stabilizeChatScrollForLayoutShift(dom.chatStream, item, previousHeights[index] || 0);
          });
        }
      });
      container.append(button);
    }
    return container;
  }

  function prepareAttachmentImage(wrap, image, url) {
    const loading = element("span", "media-loading");
    loading.append(element("span", "progress-spinner"), element("span", "", t("media.loading")));
    wrap.classList.add("is-loading");
    wrap.append(image, loading);
    const media = wrap.closest(".attachment-media") || wrap;

    const markLoaded = (node) => {
      node.classList.remove("is-loading", "has-error");
      node.classList.add("is-loaded");
    };
    const showLoaded = () => {
      markLoaded(wrap);
      if (media !== wrap) markLoaded(media);
      image.style.opacity = "1";
      loading.remove();
    };
    const showError = () => {
      wrap.classList.remove("is-loading");
      wrap.classList.add("has-error");
      image.hidden = true;
      const error = element("span", "media-error");
      error.append(element("span", "", t("media.load_failed")));
      const retry = element("button", "media-retry-button", t("media.retry"));
      retry.type = "button";
      retry.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        error.remove();
        image.hidden = false;
        prepareAttachmentImageRetry(wrap, image, loading, url, showLoaded, showError);
      });
      error.append(retry);
      wrap.append(error);
    };

    image.addEventListener("load", showLoaded, { once: true });
    image.addEventListener(
      "error",
      () => prepareAttachmentImageRetry(wrap, image, loading, url, showLoaded, showError),
      { once: true }
    );
    image.src = url;
    if (image.complete && image.naturalWidth > 0) showLoaded();
  }

  async function prepareAttachmentImageRetry(wrap, image, loading, url, showLoaded, showError) {
    wrap.classList.add("is-loading");
    if (!loading.isConnected) wrap.append(loading);
    try {
      const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const objectUrl = URL.createObjectURL(await response.blob());
      image.addEventListener(
        "load",
        () => {
          URL.revokeObjectURL(objectUrl);
          showLoaded();
        },
        { once: true }
      );
      image.addEventListener(
        "error",
        () => {
          URL.revokeObjectURL(objectUrl);
          showError();
        },
        { once: true }
      );
      image.src = objectUrl;
    } catch (_error) {
      showError();
    }
  }

  function renderPendingCard(pending) {
    const card = element("section", "pending-message");
    card.setAttribute("aria-label", t("pending.card_aria"));
    const heading = element("div", "pending-message-header");
    heading.append(element("span", "", t("pending.card_title")));
    card.append(heading);

    const title = pendingTitle(pending);
    const body = pendingBody(pending);
    card.append(element("h3", "", title));
    if (body && body !== title) card.append(element("p", "", body));

    const options = pendingOptions(pending);
    if (options.length) {
      const group = element("div", "pending-options");
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", t("pending.options_aria"));
      options.forEach((option) => {
        const button = element("button", "pending-option", option.label);
        button.type = "button";
        button.disabled = state.sending;
        button.addEventListener("click", () => submitMessage(option.value));
        group.append(button);
      });
      card.append(group);
    }
    return card;
  }

  function renderPendingStrip() {
    const pending = state.current?.pending;
    if (!["main", "developer"].includes(state.chatView) || !pending) {
      dom.pendingStrip.hidden = true;
      dom.replyContext.hidden = true;
      return;
    }
    dom.pendingTitle.textContent = pendingTitle(pending);
    dom.pendingSummary.textContent = pendingBody(pending) || t("pending.waiting");
    dom.pendingStrip.hidden = false;
    dom.replyContext.textContent = t("pending.reply_context");
    dom.replyContext.hidden = false;
  }

  function pendingTitle(pending) {
    return localizedFirstField(pending, ["title", "question", "summary"], t("pending.default_title"));
  }

  function pendingBody(pending) {
    return localizedFirstField(pending, ["body", "description", "message", "question"]);
  }

  function pendingId(pending) {
    return firstText(pending?.id, pending?.pending_id, pending?.question_id);
  }

  function pendingOptions(pending) {
    const direct = localizedArrayField(pending, "options");
    const questionPairs = pending?.questions_i18n;
    const localizedQuestions = questionPairs && typeof questionPairs === "object" && !Array.isArray(questionPairs)
      ? questionPairs[state.locale] ?? (state.locale === "en" ? questionPairs["en-US"] : questionPairs.zh)
      : null;
    const questions = Array.isArray(localizedQuestions)
      ? localizedQuestions
      : arrayFrom(pending?.questions ?? pending?.context?.questions ?? pending?.context?.triage?.questions);
    const nested = questions.flatMap((question) => localizedArrayField(question, "options"));
    return [...direct, ...nested]
      .map((option) => {
        if (typeof option === "string") return { label: option, value: option };
        const label = localizedFirstField(option, ["label", "text", "title"]);
        const value = firstText(option?.value, option?.id, option?.key, label);
        return { label, value };
      })
      .filter((option) => option.label && option.value)
      .filter((option, index, list) => list.findIndex((candidate) => candidate.value === option.value) === index)
      .slice(0, 6);
  }

  function focusPendingReply() {
    dom.messageInput.focus();
    dom.messageInput.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function messageActor(message) {
    return firstText(message?.actor, message?.role, message?.sender_type, message?.source, "developer").toLowerCase();
  }

  function messageSender(message, actor, self) {
    if (self) return firstText(message?.sender_name, message?.name, t("message.you"));
    if (actor === "project_manager") return t("agents.project_manager_name");
    if (actor === "operations") return t("operations.agent_label");
    if (actor === "owner_intent" || actor === "owner-intent" || actor === "owner_proxy") {
      return t("agents.owner_intent_name");
    }
    if (actor === "developer" || actor === "orchestrator") {
      return t("developer.name");
    }
    if ((actor === "experience" || actor === "persona") && isInternalTestAgentMessage(message)) {
      return t("agents.internal_test_name");
    }
    if (actor === "experience" || actor === "persona") {
      return firstText(
        experiencePersonaNameForMessage(message),
        localizedFirstField(message, ["sender_name", "persona_name", "name"]),
        messagePersonaId(message)
      );
    }
    return localizedFirstField(message, ["sender_name", "name", "persona_name"], t("agents.member"));
  }

  function personaForMessage(message) {
    const personaId = normalizedIdentity(messagePersonaId(message));
    const senderName = normalizedIdentity(firstText(message?.persona_name, message?.personaName, message?.sender_name));
    return (state.current?.personas || []).find((persona) => {
      const candidateId = normalizedIdentity(firstText(persona?.id, persona?.persona_id, persona?.personaId));
      if (personaId && candidateId === personaId) return true;
      if (!personaId && senderName) {
        return normalizedIdentity(firstText(persona?.name, persona?.display_name)) === senderName;
      }
      return false;
    }) || null;
  }

  function personaProfileKey(persona) {
    const personas = state.current?.personas || [];
    const index = personas.indexOf(persona);
    if (index >= 0) return `persona-${index}`;
    const personaId = normalizedIdentity(firstText(persona?.id, persona?.persona_id, persona?.personaId));
    if (!personaId) return "";
    const matchedIndex = personas.findIndex((candidate) => (
      normalizedIdentity(firstText(candidate?.id, candidate?.persona_id, candidate?.personaId)) === personaId
    ));
    return matchedIndex >= 0 ? `persona-${matchedIndex}` : "";
  }

  function openPersonaFromMessage(message) {
    const persona = personaForMessage(message);
    if (!persona) return;
    const key = personaProfileKey(persona);
    if (key && state.memberIndex.has(key)) {
      openMemberProfile(key);
      return;
    }
    openMemberProfile({ ...persona, _kind: "persona" });
  }

  function openAgentFromMessage(message) {
    if (isInternalTestAgentMessage(message)) {
      openMemberProfile("internal_test");
      return;
    }
    openPersonaFromMessage(message);
  }

  function personaIntroText(member) {
    if (!member || member._kind === "developer") return "";
    const name = localizedPersonaName(member, t("agents.experience"));
    const ageRaw = localizedPersonaField(member, ["age"]);
    const age = /^\d+(?:\.\d+)?$/.test(ageRaw)
      ? (state.locale === "en" ? `${ageRaw} years old` : `${ageRaw}岁`)
      : ageRaw;
    const identity = [
      age,
      localizedPersonaField(member, ["gender"]),
      localizedPersonaField(member, ["location", "region"]),
      localizedPersonaField(member, ["role", "identity"]),
    ]
      .filter(Boolean)
      .join(state.locale === "en" ? ", " : "，");
    const lines = [state.locale === "en"
      ? `I am ${name}${identity ? `, ${identity}` : ""}.`
      : `我是${name}${identity ? `，${identity}` : ""}。`];
    const device = localizedPersonaField(member, ["device", "devices"]);
    const habits = localizedPersonaField(member, ["habits", "preferences", "hobbies"]);
    const tech = localizedPersonaField(member, ["tech_level", "technical_level", "technology_level"]);
    const usual = [
      device ? (state.locale === "en" ? `use ${device}` : `使用${device}`) : "",
      tech ? (state.locale === "en" ? `have ${tech} technical proficiency` : `技术熟练度是${tech}`) : "",
      habits ? (state.locale === "en" ? `usually ${habits}` : `平时${habits}`) : "",
    ].filter(Boolean);
    if (usual.length) lines.push(state.locale === "en"
      ? `I ${usual.join("; ")}.`
      : `我通常${usual.join("；")}。`);
    const motivation = localizedPersonaField(member, ["motivation"]);
    const scenario = localizedPersonaField(member, ["scenario"]);
    const constraints = localizedPersonaField(member, ["constraints"]);
    const context = [
      motivation ? (state.locale === "en" ? `I want ${motivation}` : `我想${motivation}`) : "",
      scenario ? (state.locale === "en" ? `my main scenario is ${scenario}` : `主要场景是${scenario}`) : "",
      constraints ? (state.locale === "en" ? `my constraints are ${constraints}` : `我受到的限制是${constraints}`) : "",
    ].filter(Boolean);
    if (context.length) lines.push(state.locale === "en"
      ? `For this trial, ${context.join("; ")}.`
      : `这次体验时，${context.join("；")}。`);
    return lines.join("\n");
  }

  function stripExperiencePersonaIntro(text) {
    if (!text) return text;
    const marker = text.match(/(?:这是我刚完成的一轮真实体验|这次是定期回访复测)。/);
    if (!marker || marker.index === undefined) return text;
    const introStart = text.indexOf("我是");
    if (introStart < 0 || introStart >= marker.index) return text;
    const preamble = text.slice(0, introStart).trimEnd();
    const rest = text.slice(marker.index).trimStart();
    return [preamble, rest].filter(Boolean).join("\n\n");
  }

  function experienceMessageDisplayText(message) {
    return stripExperiencePersonaIntro(messageText(message));
  }

  function isHumanAuthoredPublicMessage(message) {
    const actor = firstText(message?.actor, message?.role, message?.sender_type, message?.source).toLowerCase();
    return ["user", "owner", "human"].includes(actor);
  }

  function rewritePublicAgentCopy(text) {
    let value = String(text || "");
    value = value.replace(/初版交付大约需要半个小时/g, "初版交付时间为 10 到 60 分钟不等");
    value = value.replace(/The first version usually takes about half an hour/g, "The first version takes 10 to 60 minutes");
    value = value.replace(/usually takes about half an hour/g, "takes 10 to 60 minutes");
    value = value.replace(/takes about half an hour/g, "takes 10 to 60 minutes");
    if (value.includes("我实际试了这些") || value.includes("没做成：") || value.includes("没做成:") || value.includes("What I tried:")) {
      const onComputer = value.includes("电脑") || value.includes("浏览器");
      const onPhone = value.includes("手机");
      value = value.replace(/我实际试了这些：?/g, "").replace(/我发现的问题：?/g, "");
      value = value.replace(/What I tried:/g, "").replace(/What I found:/g, "");
      value = value.replace(/没做成[:：]\s*/g, "当我");
      value = value.replace(/当我([^\n。]+)(?!的时候)/g, "当我$1的时候，发现这一步做不下去。");
      value = value.replace(/I could not:\s*/g, "When I tried to ");
      value = value.replace(/\n{3,}/g, "\n\n").trim();
      if (!value.includes("我在电脑上") && !value.includes("我用手机") && !value.includes("I'm on")) {
        if (onPhone) value = "我用手机，按平时习惯打开了这个应用。\n" + value;
        else if (onComputer) value = "我在电脑上，按平时习惯打开了这个应用。\n" + value;
      }
    }
    return value;
  }

  function messageText(message) {
    const content = message?.content;
    const userAuthored = isUserAuthoredMessage(message);
    const resolved = userAuthored
      ? (typeof content === "string"
          ? content
          : firstText(message?.text, message?.body, message?.summary, content?.text, content?.body))
      : firstText(
          localizedFirstField(message, ["text", "body", "summary"]),
          typeof content === "string"
            ? I18N.resolvePair(content, state.locale, "")
            : localizedFirstField(content, ["text", "body"])
        );
    const text = String(
      (isHumanAuthoredPublicMessage(message) ? resolved : rewritePublicAgentCopy(resolved)) || ""
    );
    if (state.locale !== "zh-CN" || userAuthored) return text;
    return text.replace(
      /将在约\s*(\d+)\s*秒后自动重试；无需手动\s*resume。/g,
      "将在约 $1 秒后开始自动重试。这里显示的是重试等待时间，不是预计完成时间；无需手动 resume。"
    );
  }

  function messageAttachments(message) {
    const attachments = arrayFrom(message?.attachments ?? message?.files ?? message?.attachment_ids);
    if (message?.image_url) attachments.push({ url: message.image_url, type: "image" });
    return attachments;
  }

  function messageTime(message) {
    return firstText(message?.at, message?.created_at, message?.sent_at, message?.timestamp, message?.time);
  }

  function isSelfMessage(message, actor) {
    const direction = firstText(message?.direction).toLowerCase();
    return direction === "inbound" || direction === "user" || ["user", "owner", "human"].includes(actor);
  }

  function avatarTone(actor, self) {
    if (self) return "user";
    if (actor.includes("project_manager")) return "project-manager";
    if (actor.includes("owner_intent") || actor.includes("owner-intent") || actor.includes("owner_proxy")) return "owner-intent";
    if (actor.includes("operations") || actor.includes("developer") || actor.includes("orchestrator")) return "developer";
    return "experience";
  }

  function personaAvatarKey(persona, fallbackIdentity = "") {
    const personas = state.current?.personas || [];
    const index = personas.indexOf(persona);
    if (index >= 0) return index % 2 === 0 ? "virtual-user-office" : "virtual-user-student";
    const identity = normalizedIdentity(firstText(
      persona?.id,
      persona?.persona_id,
      persona?.personaId,
      persona?.name,
      persona?.display_name,
      fallbackIdentity
    ));
    let score = 0;
    for (const character of identity) score = (score + character.codePointAt(0)) % 2;
    return score === 0 ? "virtual-user-office" : "virtual-user-student";
  }

  function agentAvatarKeyForMessage(message, actor, self) {
    if (self) return "";
    if (isInternalTestAgentMessage(message)) return "internal-test";
    if (actor.includes("developer") || actor.includes("orchestrator")) return "developer";
    if (actor.includes("owner_intent") || actor.includes("owner-intent")) return "owner-intent";
    if (EXPERIENCE_ACTORS.has(actor)) {
      return personaAvatarKey(personaForMessage(message), firstText(
        messagePersonaId(message),
        message?.persona_name,
        message?.sender_name
      ));
    }
    return "";
  }

  function memberAvatarKey(member) {
    const kind = firstText(member?._kind).toLowerCase();
    if (kind === "developer") return "developer";
    if (kind === "internal_test") return "internal-test";
    if (kind === "owner_intent") return "owner-intent";
    if (kind === "persona") return personaAvatarKey(member);
    return "";
  }

  function applyAgentAvatar(target, key, fallback = "") {
    const source = AGENT_AVATAR_SOURCES[key];
    target.classList.toggle("has-agent-image", Boolean(source));
    [...target.classList]
      .filter((name) => name.startsWith("agent-avatar-") && name !== `agent-avatar-${key}`)
      .forEach((name) => target.classList.remove(name));
    if (!source) {
      target.replaceChildren();
      target.textContent = fallback;
      return target;
    }
    target.classList.add(`agent-avatar-${key}`);
    const image = document.createElement("img");
    image.alt = "";
    image.draggable = false;
    image.decoding = "async";
    image.src = new URL(source, document.getElementById("appBundle")?.src || document.baseURI).href;
    image.addEventListener("error", () => {
      target.classList.remove("has-agent-image", `agent-avatar-${key}`);
      target.replaceChildren();
      target.textContent = fallback;
    }, { once: true });
    target.replaceChildren(image);
    return target;
  }

  function attachmentInfo(attachment) {
    if (typeof attachment === "string") {
      const looksLikeUrl = /^(https?:|blob:|\/)/i.test(attachment);
      return {
        name: looksLikeUrl ? fileNameFromUrl(attachment) || t("media.attachment") : attachment,
        url: looksLikeUrl ? attachment : "",
        mime: "",
        size: 0,
        kind: mediaKind("", attachment),
      };
    }
    const name = firstText(attachment?.filename, attachment?.name, attachment?.file_name, attachment?.id, t("media.attachment"));
    const mime = firstText(attachment?.content_type, attachment?.mime_type, attachment?.mime, attachment?.type);
    return {
      name,
      url: firstText(attachment?.url, attachment?.download_url, attachment?.src, attachment?.href),
      mime,
      size: Number(attachment?.size || attachment?.bytes || 0),
      kind: mediaKind(mime, name),
      caption: firstText(attachment?.caption, attachment?.alt, attachment?.label),
    };
  }

  function mediaKind(mime, name) {
    const normalized = String(mime || "").toLowerCase();
    const extension = fileExtension(name).toLowerCase();
    if (normalized.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "avif"].includes(extension)) return "image";
    if (normalized.startsWith("video/") || ["mp4", "webm", "mov", "m4v"].includes(extension)) return "video";
    if (normalized.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension)) return "audio";
    return "file";
  }

  function renderMemberAddButton() {
    const addButton = element("button", "member-add-button");
    addButton.type = "button";
    addButton.textContent = t("persona.add");
    addButton.addEventListener("click", () => openNewPersonaEditor());
    return addButton;
  }

  function renderMemberListFooter(showAddButton) {
    if (!dom.memberListFooter) return;
    dom.memberListFooter.replaceChildren();
    if (!showAddButton) {
      dom.memberListFooter.hidden = true;
      return;
    }
    dom.memberListFooter.hidden = false;
    dom.memberListFooter.append(renderMemberAddButton());
  }

  function renderMembers() {
    const personas = (
      usesDirectDeveloperStudyConversation() && !usesAppLooperStudyTreatment()
    ) ? [] : (state.current?.personas || []);
    const studyParticipantMode = usesDirectDeveloperStudyConversation();
    const studyMultiAgent = !studyParticipantMode || usesAppLooperStudyTreatment();
    state.memberIndex.clear();
    dom.memberList.replaceChildren();

    const developer = buildDeveloperMember();
    state.memberIndex.set("developer", developer);
    if (studyParticipantMode && studyMultiAgent) {
      const internalTest = buildInternalTestMember();
      const ownerIntent = buildOwnerIntentMember();
      state.memberIndex.set("internal_test", internalTest);
      state.memberIndex.set("owner_intent", ownerIntent);
      dom.memberList.append(
        element("div", "member-section-label is-primary", t("agents.developer_section")),
        renderMemberButton(developer, "developer"),
        element("div", "member-section-label is-primary", t("agents.internal_test_section")),
        renderMemberButton(internalTest, "internal_test"),
        element("div", "member-section-label is-primary", t("agents.owner_intent_section")),
        renderMemberButton(ownerIntent, "owner_intent")
      );
    } else if (studyParticipantMode) {
      dom.memberList.append(
        element("div", "member-section-label is-primary", t("agents.developer_section")),
        renderMemberButton(developer, "developer")
      );
    } else {
      const projectManager = buildProjectManagerMember();
      const operations = buildOperationsMember();
      state.memberIndex.set("project_manager", projectManager);
      state.memberIndex.set("operations", operations);
      dom.memberList.append(
        element("div", "member-section-label is-primary", t("agents.project_manager_section")),
        renderMemberButton(projectManager, "project_manager"),
        element("div", "member-section-label is-primary", t("agents.developer_section")),
        renderMemberButton(developer, "developer"),
        element("div", "member-section-label is-primary", t("agents.operations_section")),
        renderMemberButton(operations, "operations")
      );
    }

    let showAddButton = false;
    const hideExperienceAgents = studyParticipantMode && !studyMultiAgent;

    if (!hideExperienceAgents && personas.length) {
      dom.memberList.append(element("div", "member-section-label", t("agents.experience_section")));
      personas.forEach((persona, index) => {
        const key = `persona-${index}`;
        state.memberIndex.set(key, { ...persona, _kind: "persona" });
        dom.memberList.append(renderMemberButton({ ...persona, _kind: "persona" }, key));
      });
      if (!studyParticipantMode && !isPersonaGenerationInProgress()) {
        showAddButton = true;
      }
      if (!hasExperienceFeedback()) {
        const phase = firstText(state.current?.phase).toUpperCase();
        const copy = ["EXPERIENCE", "REPLAY"].includes(phase)
          ? t("agents.persona_testing")
          : t("agents.persona_ready");
        dom.memberList.append(element("div", "member-readiness", copy));
      }
    } else if (!hideExperienceAgents && isPersonaGenerationInProgress()) {
      dom.memberList.append(element("div", "member-section-label", t("agents.experience_section")));
      const placeholder = element("div", "member-item member-placeholder");
      const avatar = element("span", "member-avatar");
      const spinner = element("span", "progress-spinner");
      spinner.setAttribute("aria-hidden", "true");
      avatar.append(spinner);
      const copy = element("span", "member-copy");
      copy.append(element("strong", "", t("agents.persona_creating")), element("span", "", t("agents.persona_creating_copy")));
      placeholder.append(avatar, copy);
      dom.memberList.append(placeholder);
    } else if (!hideExperienceAgents && state.current) {
      dom.memberList.append(element("div", "member-section-label", t("agents.experience_section")));
      dom.memberList.append(element("div", "side-empty", t("agents.persona_empty")));
      showAddButton = !studyParticipantMode;
    } else if (!hideExperienceAgents) {
      dom.memberList.append(element("div", "side-empty", t("agents.persona_empty")));
    }

    renderMemberListFooter(showAddButton);

    dom.memberCount.textContent = t("agents.count", {
      count: personas.length + (studyParticipantMode ? (studyMultiAgent ? 3 : 1) : 3),
    });
  }

  function buildProjectManagerMember() {
    return {
      _kind: "project_manager",
      name: t("agents.project_manager_name"),
      role: t("agents.project_manager_role"),
      avatarGlyph: t("icon.project_manager"),
    };
  }

  function buildOperationsMember() {
    return {
      _kind: "operations",
      name: t("operations.agent_label"),
      role: t("agents.operations_role"),
      avatarGlyph: t("icon.operations"),
    };
  }

  function buildDeveloperMember() {
    const raw = state.current?.developer;
    const developer = raw && typeof raw === "object" ? raw : {};
    return {
      ...developer,
      _kind: "developer",
      name: t("developer.name"),
      role: firstText(developer.role, t("agents.developer_role")),
    };
  }

  function buildOwnerIntentMember() {
    return {
      id: "owner_intent",
      _kind: "owner_intent",
      name: t("agents.owner_intent_name"),
      role: t("agents.owner_intent_role"),
      responsibility: t("agents.owner_intent_responsibility"),
      authority: t("agents.owner_intent_authority"),
      avatarGlyph: state.locale === "en" ? "OI" : "意",
    };
  }

  function buildInternalTestMember() {
    return {
      id: "development-test-agent",
      _kind: "internal_test",
      name: t("agents.internal_test_name"),
      role: t("agents.internal_test_role"),
      responsibility: t("agents.internal_test_responsibility"),
      authority: t("agents.internal_test_authority"),
    };
  }

  function renderMemberButton(member, key) {
    const kind = member?._kind;
    const isProjectManager = kind === "project_manager";
    const isDeveloper = kind === "developer";
    const isOperations = kind === "operations";
    const isOwnerIntent = kind === "owner_intent";
    const isInternalTest = kind === "internal_test";
    const isPersona = kind === "persona";
    const isFixedStudyPersona = isPersona && (
      Boolean(member?.study_profile_version) || usesDirectDeveloperStudyConversation()
    );
    const fallbackName = isProjectManager ? t("agents.project_manager_name") : isDeveloper ? t("developer.name") : isOperations ? t("operations.agent_label") : isOwnerIntent ? t("agents.owner_intent_name") : isInternalTest ? t("agents.internal_test_name") : t("agents.experience");
    const fallbackRole = isProjectManager ? t("agents.project_manager_role") : isDeveloper ? t("agents.implementation_role") : isOperations ? t("agents.operations_role") : isOwnerIntent ? t("agents.owner_intent_role") : isInternalTest ? t("agents.internal_test_role") : t("agents.experience_role");
    const name = isPersona
      ? localizedPersonaName(member, fallbackName)
      : firstText(member?.name, member?.display_name, fallbackName);
    const role = isPersona
      ? localizedPersonaField(member, ["role", "identity", "scenario"], fallbackRole)
      : firstText(member?.role, member?.identity, member?.scenario, fallbackRole);
    const recordCount = isPersona ? personaMessagesFor(member).length : 0;
    const supportingText = isOwnerIntent
      ? t("agents.owner_intent_object")
      : isInternalTest
      ? t("agents.internal_test_object")
      : isProjectManager || isDeveloper || isOperations
      ? t("agents.direct_object", { role })
      : t("agents.records_only", {
          role,
          records: recordCount ? t("agents.record_suffix", { count: recordCount }) : "",
        });
    const button = element("button", "member-item");
    button.type = "button";
    button.setAttribute(
      "aria-label",
      isProjectManager
        ? t("agents.open_project_manager_tab", { name })
        : isDeveloper
        ? t("agents.open_developer_tab", { name })
        : isOperations
          ? t("agents.open_operations_tab", { name })
        : isInternalTest
          ? t("agents.open_internal_test_profile", { name })
        : t("agents.open_experience_profile", { name })
    );
    const avatarClass = isProjectManager ? " project-manager" : isDeveloper ? " developer" : isOperations ? " operations" : isOwnerIntent ? " owner-intent" : isInternalTest ? " internal-test" : "";
    const avatar = element("span", `member-avatar${avatarClass}`, member?.avatarGlyph || initialFor(name));
    applyAgentAvatar(avatar, memberAvatarKey(member), member?.avatarGlyph || initialFor(name));
    avatar.setAttribute("aria-hidden", "true");
    const copy = element("span", "member-copy");
    copy.append(element("strong", "", name), element("span", "", supportingText));
    button.append(avatar, copy);
    const agentId = isProjectManager
      ? "project_manager"
      : isDeveloper
      ? "developer"
      : isInternalTest
      ? firstText(member?.id, "development-test-agent")
      : isOwnerIntent
      ? firstText(member?.id, "owner_intent")
      : firstText(member?.id, member?.persona_id, member?.personaId);
    if (isProjectManager || isDeveloper || isOperations || isInternalTest || isOwnerIntent || agentId) {
      const statusButton = element(
        "button",
        "member-status-button",
        isOperations ? t("operations.agent_view_status") : t("profile.view_status")
      );
      statusButton.type = "button";
      statusButton.addEventListener("click", (event) => {
        event.stopPropagation();
        if (isOperations) openOperationsAgentDialog();
        else openDeveloperSession(agentId, name);
      });
      button.append(statusButton);
    }
    if (isPersona && agentId && !isFixedStudyPersona) {
      const deleteButton = element("button", "member-delete-button", "×");
      deleteButton.type = "button";
      deleteButton.setAttribute("aria-label", t("persona.delete"));
      deleteButton.title = t("persona.delete");
      deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        void deletePersonaById(agentId, { name });
      });
      button.append(deleteButton);
    }
    button.addEventListener("click", () => {
      closeDrawers();
      if (isProjectManager) setChatView("main");
      else if (isDeveloper) setChatView("developer");
      else if (isOperations) openGrowth();
      else if (isInternalTest) openMemberProfile(key);
      else openMemberProfile(key);
    });
    return button;
  }

  function personaField(field) {
    return dom[`personaField${field}`] || null;
  }

  function splitPersonaSegments(value) {
    return String(value || "")
      .split(/[,，、;；\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function joinPersonaSegments(segments) {
    return arrayFrom(segments).map((item) => String(item || "").trim()).filter(Boolean).join(", ");
  }

  function localizedPersonaArray(persona, name, alias, itemFields) {
    if (!persona || typeof persona !== "object") return [];
    const hasPrimary = Array.isArray(persona[name]) || (persona[`${name}_i18n`] && typeof persona[`${name}_i18n`] === "object");
    return localizedArrayField(persona, hasPrimary || !alias ? name : alias, itemFields);
  }

  function personaTaskScriptLines(persona) {
    return localizedPersonaArray(persona, "task_script", "tasks", ["action", "title", "task", "description"])
      .map((step) => (typeof step === "string"
        ? step
        : localizedFirstField(step, ["action", "title", "task", "description"])))
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  function fillPersonaForm(persona = {}) {
    const segments = localizedPersonaArray(persona, "covered_segments", "", ["label", "name", "text"])
      .map((segment) => typeof segment === "string" ? segment : localizedFirstField(segment, ["label", "name", "text"]))
      .filter(Boolean);
    const fields = {
      Name: localizedPersonaName(persona),
      Age: localizedPersonaField(persona, ["age"]),
      Gender: localizedPersonaField(persona, ["gender"]),
      Location: localizedPersonaField(persona, ["location", "region"]),
      Role: localizedPersonaField(persona, ["role", "identity"]),
      TechLevel: localizedPersonaField(persona, ["tech_level", "technical_level", "technology_level"]),
      Device: localizedPersonaField(persona, ["device", "devices"]),
      Segments: joinPersonaSegments(segments),
      Motivation: localizedPersonaField(persona, ["motivation"]),
      Constraints: localizedPersonaField(persona, ["constraints"]),
      Scenario: localizedPersonaField(persona, ["scenario"]),
      Habits: localizedPersonaField(persona, ["habits", "preferences", "hobbies"]),
      TaskScript: personaTaskScriptLines(persona).join("\n"),
      TestAccount: firstText(persona.initial_state?.test_account),
      AuthNotes: localizedFirstField(persona.initial_state, ["auth_notes"]),
    };
    Object.entries(fields).forEach(([key, value]) => {
      const input = personaField(key);
      if (input) input.value = value;
    });
  }

  function readPersonaForm() {
    const taskLines = String(personaField("TaskScript")?.value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const testAccount = firstText(personaField("TestAccount")?.value);
    const authNotes = firstText(personaField("AuthNotes")?.value);
    const payload = {
      name: firstText(personaField("Name")?.value),
      age: firstText(personaField("Age")?.value),
      gender: firstText(personaField("Gender")?.value),
      location: firstText(personaField("Location")?.value),
      role: firstText(personaField("Role")?.value),
      tech_level: firstText(personaField("TechLevel")?.value),
      device: firstText(personaField("Device")?.value),
      covered_segments: splitPersonaSegments(personaField("Segments")?.value),
      motivation: firstText(personaField("Motivation")?.value),
      constraints: firstText(personaField("Constraints")?.value),
      scenario: firstText(personaField("Scenario")?.value),
      habits: firstText(personaField("Habits")?.value),
      task_script: taskLines.map((action) => ({ action })),
    };
    if (testAccount) {
      payload.initial_state = {
        auth_mode: "test_account",
        test_account: testAccount,
        avoid_real_phone: true,
        source: "manual",
      };
      if (authNotes) payload.initial_state.auth_notes = authNotes;
    }
    return payload;
  }

  function setPersonaDialogMode(editing) {
    state.personaEditing = Boolean(editing);
    dom.personaDetails.hidden = state.personaEditing;
    dom.personaEditForm.hidden = !state.personaEditing;
    dom.personaEditButton.hidden = state.personaEditing || !state.personaEditId;
    dom.personaDeleteButton.hidden = state.personaEditing || !state.personaEditId;
    dom.personaSaveButton.hidden = !state.personaEditing;
    dom.personaCancelEditButton.hidden = !state.personaEditing;
    dom.personaSaveButton.textContent = state.personaEditId ? t("persona.save") : t("persona.create");
    dom.personaSaveButton.disabled = state.personaSaving;
  }

  function exitPersonaEditMode(restoreView = false) {
    if (restoreView && state.personaEditId) {
      const persona = (state.current?.personas || []).find((item) => firstText(item?.id) === state.personaEditId);
      if (persona) fillPersonaForm(persona);
    }
    setPersonaDialogMode(false);
  }

  function enterPersonaEditMode() {
    if (!state.personaEditId && !state.personaEditing) return;
    setPersonaDialogMode(true);
  }

  function applyPersonaMutationResponse(payload) {
    if (!payload || typeof payload !== "object" || !state.current) return;
    if (Array.isArray(payload.personas)) {
      state.current.personas = payload.personas;
      persistDevelopmentCache(state.current);
    }
    renderMembers();
    renderExperienceFilters();
    renderCurrentApp({ messageUpdate: "none", force: true });
  }

  async function createPersonaRecord(payload) {
    if (!state.currentId) throw new Error("missing app");
    return request(`/apps/${encodeURIComponent(state.currentId)}/personas`, {
      method: "POST",
      json: payload,
      timeoutMs: 12_000,
    });
  }

  async function updatePersonaRecord(personaId, payload) {
    if (!state.currentId) throw new Error("missing app");
    return request(`/apps/${encodeURIComponent(state.currentId)}/personas/${encodeURIComponent(personaId)}`, {
      method: "POST",
      json: payload,
      timeoutMs: 12_000,
    });
  }

  async function deletePersonaRecord(personaId) {
    if (!state.currentId) throw new Error("missing app");
    return request(`/apps/${encodeURIComponent(state.currentId)}/personas/${encodeURIComponent(personaId)}`, {
      method: "DELETE",
      timeoutMs: 12_000,
    });
  }

  async function savePersonaDraft() {
    if (state.personaSaving || !dom.personaEditForm?.reportValidity()) return;
    const payload = readPersonaForm();
    const wasUpdate = Boolean(state.personaEditId);
    state.personaSaving = true;
    dom.personaSaveButton.disabled = true;
    try {
      const response = wasUpdate
        ? await updatePersonaRecord(state.personaEditId, payload)
        : await createPersonaRecord(payload);
      applyPersonaMutationResponse(response);
      const savedId = firstText(wasUpdate ? state.personaEditId : response.changed?.[0], response.personas?.at(-1)?.id);
      showToast(wasUpdate ? t("persona.saved") : t("persona.created"));
      state.personaEditId = savedId;
      exitPersonaEditMode(false);
      if (savedId) {
        const persona = (state.current?.personas || []).find((item) => firstText(item?.id) === savedId);
        if (persona) openMemberProfile({ ...persona, _kind: "persona" });
      } else {
        closeDialog(dom.personaDialog);
      }
    } catch (error) {
      showToast(friendlyError(error, t("persona.save_failed")), "error");
    } finally {
      state.personaSaving = false;
      dom.personaSaveButton.disabled = false;
      setPersonaDialogMode(state.personaEditing);
    }
  }

  async function deletePersonaById(personaId, { name = "" } = {}) {
    if (!personaId || state.personaSaving) return false;
    const label = firstText(name, personaId);
    if (!window.confirm(t("persona.delete_confirm"))) return false;
    state.personaSaving = true;
    try {
      const response = await deletePersonaRecord(personaId);
      applyPersonaMutationResponse(response);
      showToast(t("persona.deleted"));
      if (state.personaEditId === personaId) {
        state.personaEditId = "";
        state.personaEditing = false;
        closeDialog(dom.personaDialog);
      }
      return true;
    } catch (error) {
      showToast(friendlyError(error, t("persona.save_failed")), "error");
      return false;
    } finally {
      state.personaSaving = false;
    }
  }

  async function deletePersonaDraft() {
    if (!state.personaEditId || state.personaSaving) return;
    await deletePersonaById(state.personaEditId, { name: dom.personaDialogTitle?.textContent || "" });
  }

  function openNewPersonaEditor() {
    closeDrawers();
    state.personaEditId = "";
    state.personaEditing = true;
    applyAgentAvatar(dom.personaAvatar, "virtual-user-office", initialFor(t("agents.experience")));
    dom.personaAvatar.classList.remove("developer", "owner-intent", "internal-test");
    dom.personaKind.textContent = t("agents.profile_readonly");
    dom.personaDialogTitle.textContent = t("persona.create");
    dom.personaSubtitle.textContent = t("agents.experience_role");
    dom.personaDetails.replaceChildren();
    fillPersonaForm({});
    setPersonaDialogMode(true);
    showDialog(dom.personaDialog);
  }

  function openMemberProfile(key) {
    const member = typeof key === "object" && key
      ? key
      : state.memberIndex.get(key);
    if (!member) return;
    const isDeveloper = member._kind === "developer";
    const isOwnerIntent = member._kind === "owner_intent";
    const isInternalTest = member._kind === "internal_test";
    const isPersona = member._kind === "persona";
    const isFixedStudyPersona = isPersona && (
      Boolean(member.study_profile_version) || usesDirectDeveloperStudyConversation()
    );
    const personaId = isPersona ? firstText(member.id, member.persona_id, member.personaId) : "";
    state.personaEditId = personaId;
    state.personaEditing = false;
    const name = isPersona
      ? localizedPersonaName(member, t("agents.experience"))
      : firstText(member.name, member.display_name, isInternalTest ? t("agents.internal_test_name") : t("developer.name"));
    const role = isPersona
      ? localizedPersonaField(member, ["role", "identity"], t("agents.experience"))
      : firstText(member.role, member.identity, isOwnerIntent ? t("agents.owner_intent_role") : isInternalTest ? t("agents.internal_test_role") : t("agents.developer_role"));
    const location = isPersona ? localizedPersonaField(member, ["location", "region"]) : firstText(member.location, member.region);
    const experienceRecords = isDeveloper ? [] : personaMessagesFor(member);

    applyAgentAvatar(dom.personaAvatar, memberAvatarKey(member), initialFor(name));
    dom.personaAvatar.classList.toggle("developer", isDeveloper);
    dom.personaAvatar.classList.toggle("owner-intent", isOwnerIntent);
    dom.personaAvatar.classList.toggle("internal-test", isInternalTest);
    dom.personaKind.textContent = isDeveloper
      ? t("agents.profile_direct")
      : isOwnerIntent
        ? t("agents.owner_intent_profile_kind")
        : isInternalTest
          ? t("agents.internal_test_profile_kind")
        : isFixedStudyPersona
          ? t("agents.profile_fixed")
          : t("agents.experience");
    dom.personaDialogTitle.textContent = name;
    dom.personaSubtitle.textContent = [role, location, isDeveloper ? "" : t("agents.records_count", { count: experienceRecords.length })]
      .filter(Boolean)
      .join(" · ");
    dom.personaDetails.replaceChildren();

    if (isDeveloper) {
      appendDetail(t("profile.name"), name);
      appendDetail(t("profile.identity"), role);
      appendDetail(t("profile.responsibility"), firstText(member.responsibility, member.description, t("profile.default_responsibility")), true);
      appendDetail(t("profile.environment"), firstText(member.device, member.environment, t("profile.default_environment")));
      appendDetail(t("profile.status"), statusLabel(state.current?.status));
    } else if (isOwnerIntent) {
      appendDetail(t("profile.name"), name);
      appendDetail(t("profile.identity"), role, true);
      appendDetail(t("profile.responsibility"), firstText(member.responsibility, t("agents.owner_intent_responsibility")), true);
      appendDetail(t("profile.authority"), firstText(member.authority, t("agents.owner_intent_authority")), true);
    } else if (isInternalTest) {
      appendDetail(t("profile.name"), name);
      appendDetail(t("profile.identity"), role, true);
      appendDetail(t("profile.responsibility"), firstText(member.responsibility, t("agents.internal_test_responsibility")), true);
      appendDetail(t("profile.authority"), firstText(member.authority, t("agents.internal_test_authority")), true);
    } else {
      const intro = personaIntroText(member);
      if (intro) {
        const introSection = element("section", "detail-field is-wide persona-intro");
        introSection.append(element("h3", "", t("profile.introduction")), element("p", "persona-intro-copy", intro));
        dom.personaDetails.append(introSection);
      }
      appendDetail(t("profile.name"), name);
      appendDetail(t("profile.age"), localizedPersonaField(member, ["age"]));
      appendDetail(t("profile.gender"), localizedPersonaField(member, ["gender"]));
      appendDetail(t("profile.location"), localizedPersonaField(member, ["location", "region"]));
      appendDetail(t("profile.identity"), localizedPersonaField(member, ["role", "identity"]));
      appendExperienceHistory(experienceRecords);
      appendDetail(t("profile.tech_level"), localizedPersonaField(member, ["tech_level", "technical_level", "technology_level"]));
      appendDetail(t("profile.device"), localizedPersonaField(member, ["device", "devices"]), true);
      appendDetail(t("profile.motivation"), localizedPersonaField(member, ["motivation"]), true);
      appendDetail(t("profile.constraints"), localizedPersonaField(member, ["constraints"]), true);
      appendDetail(t("profile.scenario"), localizedPersonaField(member, ["scenario"]), true);
      appendDetail(t("profile.habits"), localizedPersonaField(member, ["habits", "preferences", "hobbies"]), true);
      if (member.initial_state?.test_account) {
        appendDetail(t("profile.test_account"), valueText(member.initial_state.test_account), false, true);
        appendDetail(t("profile.auth_notes"), localizedFirstField(member.initial_state, ["auth_notes"]), true);
      }
      appendTaskScript(member);
    }

    const agentId = isDeveloper
      ? "developer"
      : isInternalTest
      ? firstText(member.id, "development-test-agent")
      : isOwnerIntent
      ? firstText(member.id, "owner_intent")
      : firstText(member.id, member.persona_id, member.personaId);
    if (agentId) {
      const statusAction = element("button", "secondary-button persona-status-button", t("profile.view_status"));
      statusAction.type = "button";
      statusAction.addEventListener("click", () => {
        closeDialog(dom.personaDialog);
        openDeveloperSession(agentId, name);
      });
      dom.personaDetails.append(statusAction);
    }

    if (isPersona && !isFixedStudyPersona) {
      fillPersonaForm(member);
      dom.personaDialogActions.hidden = false;
      setPersonaDialogMode(false);
    } else {
      dom.personaDialogActions.hidden = true;
      dom.personaEditForm.hidden = true;
      dom.personaDetails.hidden = false;
    }

    showDialog(dom.personaDialog);
    closeDrawers();
  }

  function appendDetail(label, value, wide = false, userContent = false) {
    const field = element("dl", `detail-field${wide ? " is-wide" : ""}`);
    const body = element("dd", "", value || t("profile.not_provided"));
    if (userContent) body.setAttribute("data-user-content", "");
    field.append(element("dt", "", label), body);
    dom.personaDetails.append(field);
    return field;
  }

  function appendExperienceHistory(records) {
    const section = element("section", "detail-field is-wide experience-history");
    section.setAttribute("aria-label", t("profile.experience_records"));
    const heading = element("div", "experience-history-heading");
    heading.append(element("h3", "", t("profile.experience_records")), element("span", "", t("agents.records_count", { count: records.length })));
    section.append(heading);

    if (!records.length) {
      section.append(element("p", "experience-history-empty", t("profile.no_records")));
      dom.personaDetails.append(section);
      return;
    }

    const list = element("div", "experience-record-list");
    records.forEach((message, index) => {
      const actor = messageActor(message);
      const self = isSelfMessage(message, actor);
      const sender = messageSender(message, actor, self);
      const title = messageTitle(message) || t("profile.record_title", { sender });
      const when = messageTime(message);
      const details = element("details", "experience-record");
      details.open = index === 0;
      const summary = document.createElement("summary");
      const summaryCopy = element("span", "experience-record-summary");
      const titleNode = element("strong", "", title);
      if (isUserAuthoredMessage(message)) titleNode.setAttribute("data-user-content", "");
      summaryCopy.append(
        titleNode,
        element("small", "", [sender, when ? `${formatDay(when)} ${formatMessageTime(when)}` : ""].filter(Boolean).join(" · "))
      );
      summary.append(summaryCopy);
      details.append(summary);

      const body = element("div", "experience-record-body");
      const text = messageText(message);
      if (text) {
        const textNode = element("div", "experience-record-text", text);
        if (isUserAuthoredMessage(message)) textNode.setAttribute("data-user-content", "");
        body.append(textNode);
      }
      const attachments = messageAttachments(message);
      if (attachments.length) body.append(renderAttachments(attachments));
      if (!text && !attachments.length) body.append(element("div", "experience-record-text", t("profile.empty_record")));
      details.append(body);
      list.append(details);
    });
    section.append(list);
    dom.personaDetails.append(section);
  }

  function appendTaskScript(persona) {
    const steps = personaTaskScriptLines(persona);
    const field = element("dl", "detail-field is-wide");
    field.append(element("dt", "", t("profile.task_script")));
    const body = document.createElement("dd");
    if (!steps.length) {
      body.textContent = t("profile.not_generated");
    } else {
      const list = element("ol", "task-script");
      steps.forEach((step, index) => {
        const item = document.createElement("li");
        item.append(element("span", "", String(index + 1)), document.createTextNode(step || t("profile.unnamed_step")));
        list.append(item);
      });
      body.append(list);
    }
    field.append(body);
    dom.personaDetails.append(field);
  }

  function queuePendingFiles(fileList) {
    const files = Array.from(fileList || []).filter((file) => file instanceof File && file.size > 0);
    if (!files.length) return false;
    files.forEach((file) => {
      state.pendingFiles.push({
        key: uniqueKey(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "ready",
        attachmentId: "",
      });
    });
    renderUploadPreview();
    updateComposer();
    return true;
  }

  function addPendingFiles(event) {
    queuePendingFiles(event.target.files);
    event.target.value = "";
  }

  function setupComposerFileDrop() {
    const composer = dom.composer;
    if (!composer) return;
    let dragDepth = 0;
    const canAcceptDrop = () => !composer.hidden && !dom.attachmentInput?.disabled;

    composer.addEventListener("dragenter", (event) => {
      if (!canAcceptDrop() || !Array.from(event.dataTransfer?.types || []).includes("Files")) return;
      event.preventDefault();
      dragDepth += 1;
      composer.classList.add("is-dragover");
      composer.dataset.dropHint = t("composer.drop_files");
    });
    composer.addEventListener("dragover", (event) => {
      if (!canAcceptDrop() || !Array.from(event.dataTransfer?.types || []).includes("Files")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });
    composer.addEventListener("dragleave", () => {
      if (!composer.classList.contains("is-dragover")) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) {
        composer.classList.remove("is-dragover");
        delete composer.dataset.dropHint;
      }
    });
    composer.addEventListener("drop", (event) => {
      event.preventDefault();
      dragDepth = 0;
      composer.classList.remove("is-dragover");
      delete composer.dataset.dropHint;
      if (!canAcceptDrop()) return;
      if (queuePendingFiles(event.dataTransfer?.files)) dom.messageInput?.focus();
    });
  }

  function renderUploadPreview() {
    dom.uploadPreview.replaceChildren();
    dom.uploadPreview.hidden = state.pendingFiles.length === 0;

    state.pendingFiles.forEach((pendingFile) => {
      const item = element("div", "upload-item");
      item.setAttribute("data-user-content", "");
      const kind = mediaKind(pendingFile.file.type, pendingFile.file.name);
      if (kind === "image") {
        const image = document.createElement("img");
        image.src = pendingFile.previewUrl;
        image.alt = pendingFile.file.name;
        item.append(image);
      } else if (kind === "video") {
        const video = document.createElement("video");
        video.src = pendingFile.previewUrl;
        video.muted = true;
        video.preload = "metadata";
        video.setAttribute("aria-label", pendingFile.file.name);
        item.append(video);
      } else {
        const file = element("div", "upload-file");
        file.append(element("strong", "", pendingFile.file.name), element("span", "", formatBytes(pendingFile.file.size)));
        item.append(file);
      }

      const remove = element("button", "remove-upload", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", t("upload.remove", { name: pendingFile.file.name }));
      remove.disabled = pendingFile.status === "uploading";
      remove.addEventListener("click", () => removePendingFile(pendingFile.key));
      item.append(remove);

      if (pendingFile.status === "uploading") {
        const progress = element("div", "upload-progress");
        progress.append(document.createElement("span"));
        item.append(progress);
      }

      dom.uploadPreview.append(item);
    });
  }

  function removePendingFile(key) {
    const index = state.pendingFiles.findIndex((item) => item.key === key);
    if (index < 0) return;
    const [removed] = state.pendingFiles.splice(index, 1);
    URL.revokeObjectURL(removed.previewUrl);
    renderUploadPreview();
    updateComposer();
  }

  function clearPendingFiles() {
    state.pendingFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    state.pendingFiles = [];
    if (dom.uploadPreview) renderUploadPreview();
  }

  function createClientRequestId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return `web-${globalThis.crypto.randomUUID()}`;
    }
    return `web-${Date.now().toString(36)}-${uniqueKey()}`;
  }

  function messageRequestFingerprint(appId, text, attachmentIds, pendingId) {
    return JSON.stringify([
      String(appId || ""),
      String(text || ""),
      ...attachmentIds.map((value) => String(value || "")),
      String(pendingId || ""),
    ]);
  }

  async function uploadPendingFiles(appId = state.currentId) {
    const attachmentIds = [];
    const files = state.pendingFiles.splice(0);
    for (const pendingFile of files) {
      pendingFile.status = "uploading";
      renderUploadPreview();
      pendingFile.attachmentId = await uploadFile(pendingFile.file, appId);
      pendingFile.status = "uploaded";
      attachmentIds.push(pendingFile.attachmentId);
      URL.revokeObjectURL(pendingFile.previewUrl);
    }
    renderUploadPreview();
    updateComposer();
    return attachmentIds;
  }

  async function submitMessage(directText = null) {
    if (!state.currentId) return false;
    if (state.growthOpen && typeof directText !== "string") {
      const text = dom.messageInput.value.trim();
      if (!text && !state.pendingFiles.length) return false;
      dom.messageInput.value = "";
      autosizeMessageInput();
      state.operationsConversationStickToBottom = true;
      try {
        const attachmentIds = state.pendingFiles.length ? await uploadPendingFiles() : [];
        if (!text && !attachmentIds.length) return false;
        await submitOperationsRequest("chat", text, { attachmentIds });
      } catch (error) {
        showToast(friendlyError(error, state.locale === "zh-CN" ? "附件上传失败。" : "Could not upload attachments."), "error", 6000);
        updateComposer();
      }
      return true;
    }
    const isDirectReply = typeof directText === "string";
    const text = isDirectReply ? directText.trim() : dom.messageInput.value.trim();
    const files = isDirectReply ? [] : state.pendingFiles.splice(0);
    if (!text && !files.length) return false;
    const appId = state.currentId;
    const currentPendingId = pendingId(state.current?.pending);
    const clientRequestId = createClientRequestId();
    const localId = `optimistic-${clientRequestId}`;
    const localMessage = {
      id: localId,
      message_id: localId,
      client_request_id: clientRequestId,
      _client_request_id: clientRequestId,
      _client_app_id: appId,
      _client_send_state: "sending",
      direction: "inbound",
      channel: "main",
      actor: "user",
      body: text,
      at: new Date().toISOString(),
      attachments: files.map((item) => ({
        filename: item.file.name,
        content_type: item.file.type,
        size: item.file.size,
        url: item.previewUrl,
      })),
    };
    state.outgoingMessages.set(clientRequestId, {
      appId,
      clientRequestId,
      pendingId: currentPendingId,
      text,
      mentionTarget: state.chatView === "developer" ? "developer" : "",
      files,
      message: localMessage,
      inFlight: false,
      previewsReleased: false,
    });

    if (!isDirectReply) {
      dom.messageInput.value = "";
      autosizeMessageInput();
      renderUploadPreview();
      updateComposer();
    }
    mergeOptimisticMessage(localMessage);
    renderMessages();
    requestAnimationFrame(() => {
      dom.chatStream.scrollTop = dom.chatStream.scrollHeight;
    });
    void deliverOutgoingMessage(clientRequestId);
    return true;
  }

  function clientRequestIdForMessage(message) {
    return firstText(message?.client_request_id, message?._client_request_id);
  }

  function releaseOutgoingPreviews(record) {
    if (!record || record.previewsReleased) return;
    record.previewsReleased = true;
    record.files.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
  }

  function mergeOutgoingMessages(appId, serverMessages) {
    const messages = [...serverMessages];
    state.outgoingMessages.forEach((record, clientRequestId) => {
      if (record.appId !== appId) return;
      const localId = firstText(record.message?.message_id, record.message?.id);
      const match = messages.find((candidate) => {
        const candidateId = firstText(candidate?.message_id, candidate?.id);
        return Boolean(
          (localId && candidateId === localId)
          || clientRequestIdForMessage(candidate) === clientRequestId
        );
      });
      if (match) {
        if (!record.inFlight) {
          releaseOutgoingPreviews(record);
          state.outgoingMessages.delete(clientRequestId);
        }
        return;
      }
      messages.push(record.message);
    });
    return messages;
  }

  function mergeOptimisticMessage(message) {
    if (!state.current || !message) return;
    const clientAppId = firstText(message?._client_app_id);
    if (clientAppId && clientAppId !== state.currentId) return;
    const messageId = firstText(message?.message_id, message?.id);
    const clientRequestId = clientRequestIdForMessage(message);
    const messages = state.current.messages || (state.current.messages = []);
    const index = messages.findIndex((candidate) => {
      const candidateId = firstText(candidate?.message_id, candidate?.id);
      return Boolean(
        (messageId && candidateId === messageId)
        || (clientRequestId && clientRequestIdForMessage(candidate) === clientRequestId)
      );
    });
    if (index >= 0) messages[index] = { ...messages[index], ...message };
    else messages.push(message);
  }

  async function deliverOutgoingMessage(clientRequestId) {
    const record = state.outgoingMessages.get(clientRequestId);
    if (!record || record.inFlight) return false;
    record.inFlight = true;
    record.message._client_send_state = "sending";
    delete record.message._client_send_error;
    mergeOptimisticMessage(record.message);
    renderMessages();

    try {
      const attachmentIds = [];
      for (const pendingFile of record.files) {
        if (!pendingFile.attachmentId) {
          pendingFile.status = "uploading";
          pendingFile.attachmentId = await uploadFile(pendingFile.file, record.appId);
          pendingFile.status = "uploaded";
        }
        attachmentIds.push(pendingFile.attachmentId);
      }
      const payload = {
        text: record.text,
        attachment_ids: attachmentIds,
        channel: "main",
        client_request_id: clientRequestId,
      };
      const mentionTarget = detectMentionTarget(record.text) || record.mentionTarget;
      if (mentionTarget) payload.mention_target = mentionTarget;
      if (record.pendingId) payload.pending_id = record.pendingId;
      const response = await submitMessageRequest(record.appId, payload);
      const uploadedAttachments = record.files.map((item) => ({
        id: item.attachmentId,
        filename: item.file.name,
        content_type: item.file.type,
        size: item.file.size,
        url: `/api/apps/${encodeURIComponent(record.appId)}/attachments/${encodeURIComponent(item.attachmentId)}`,
      }));
      const responseMessage = response?.message && typeof response.message === "object"
        ? response.message
        : {};
      const queuedId = firstText(responseMessage?.message_id, responseMessage?.id, response?.message_id, record.message.message_id);
      record.message = {
        ...record.message,
        ...responseMessage,
        id: queuedId,
        message_id: queuedId,
        client_request_id: clientRequestId,
        _client_request_id: clientRequestId,
        _client_app_id: record.appId,
        direction: "inbound",
        channel: "main",
        actor: "user",
        body: firstText(responseMessage?.body, responseMessage?.text, record.text),
        at: firstText(responseMessage?.at, responseMessage?.created_at, response?.created_at, record.message.at),
        attachments: responseMessage?.attachments ?? uploadedAttachments,
      };
      delete record.message._client_send_state;
      delete record.message._client_send_error;
      releaseOutgoingPreviews(record);
      record.files = [];
      mergeOptimisticMessage(record.message);
      renderMessages();
      showToast(t("composer.sent"), "success", 2_500);
      if (state.currentId === record.appId) void loadCurrentApp({ silent: true });
      return true;
    } catch (error) {
      record.files.forEach((item) => {
        if (item.status === "uploading") item.status = "ready";
      });
      record.message._client_send_state = "failed";
      record.message._client_send_error = friendlyError(error, t("composer.send_failed"));
      mergeOptimisticMessage(record.message);
      renderMessages();
      showToast(record.message._client_send_error, "error", 6_000);
      return false;
    } finally {
      record.inFlight = false;
    }
  }

  function operationsSkillCardStatus(skill, kind) {
    const localKey = kind === "traffic" ? "traffic" : kind === "feedback" ? "feedback" : kind === "analytics" ? "analytics" : null;
    const localGen = localKey ? state.operationsSkillGeneration[localKey] : null;
    const generation = skill?.draftGeneration || { status: "idle" };
    const generating = localGen?.status === "running" || generation.status === "running";
    if (generating) {
      return { text: t("operations.skill_generating_card"), state: "generating" };
    }
    if (skill.draft && generation.status === "completed" && skill.management !== "manual") {
      return { text: t("operations.skill_draft_ready"), state: "draft" };
    }
    const missingCount = arrayFrom(skill.missingFields).length;
    if (missingCount > 0 && (skill.draft || generation.status === "completed")) {
      return { text: t("operations.skill_missing_hint"), state: "needs_input" };
    }
    const manual = skill.management === "manual";
    return {
      text: t(manual ? "operations.skill_manual" : "operations.skill_auto_generated", { revision: skill.revision || 1 }),
      state: manual ? "configured" : "auto",
    };
  }

  function renderOperationsSkills(operations) {
    const launch = operations.deploymentSkill;
    const analytics = operations.analyticsSkill || operations.operationsSkill;
    const traffic = operations.trafficSkill;
    const feedback = operations.feedbackSkill;
    [
      [dom.operationsLaunchSkillCard, dom.operationsLaunchSkillName, dom.operationsLaunchSkillStatus, launch, "launch"],
      [dom.operationsAnalyticsSkillCard, dom.operationsAnalyticsSkillName, dom.operationsAnalyticsSkillStatus, analytics, "analytics"],
      [dom.operationsTrafficSkillCard, dom.operationsTrafficSkillName, dom.operationsTrafficSkillStatus, traffic, "traffic"],
      [dom.operationsFeedbackSkillCard, dom.operationsFeedbackSkillName, dom.operationsFeedbackSkillStatus, feedback, "feedback"],
    ].forEach(([card, name, status, skill, kind]) => {
      if (!card || !name || !status || !skill) return;
      const manual = skill.management === "manual";
      const labelKeys = {
        launch: "operations.launch_skill",
        analytics: "operations.analytics_skill",
        traffic: "operations.traffic_skill",
        feedback: "operations.feedback_skill",
      };
      const eyebrow = card.querySelector(":scope > div > span:first-of-type");
      if (eyebrow) eyebrow.hidden = !manual;
      name.textContent = manual ? skill.name : t(labelKeys[kind] || "operations.analytics_skill");
      const cardStatus = operationsSkillCardStatus(skill, kind);
      status.textContent = cardStatus.text;
      status.dataset.state = cardStatus.state;
      card.classList.toggle("is-configured", manual || cardStatus.state === "draft");
      card.classList.toggle("is-auto", !manual && cardStatus.state === "auto");
      card.classList.toggle("is-generating", cardStatus.state === "generating");
      card.classList.toggle("needs-input", cardStatus.state === "needs_input");
    });
  }

  function renderOperationsTrafficPanel(operations) {
    if (!dom.operationsTrafficPanel) return;
    const traffic = operations.trafficState || normalizeTrafficState(null);
    const status = firstText(traffic.status, "not_configured").toLowerCase();
    if (dom.operationsTrafficStatus) {
      dom.operationsTrafficStatus.dataset.state = status;
      dom.operationsTrafficStatus.textContent = t(`operations.traffic_status_${status}`);
    }
    if (dom.operationsTrafficSummary) {
      dom.operationsTrafficSummary.textContent = firstText(traffic.summary) || t("operations.traffic_summary_empty");
    }
    const platforms = arrayFrom(traffic.platforms);
    if (dom.operationsTrafficPlatforms) {
      dom.operationsTrafficPlatforms.replaceChildren();
      platforms.forEach((platform) => {
        const row = element("li", "operations-traffic-platform");
        row.append(element("strong", "", firstText(platform.name)));
        if (platform.method) row.append(element("span", "", platform.method));
        if (platform.schedule) row.append(element("span", "", t("operations.traffic_platform_schedule", { schedule: platform.schedule })));
        if (platform.triggers) row.append(element("span", "", t("operations.traffic_platform_triggers", { triggers: platform.triggers })));
        dom.operationsTrafficPlatforms.append(row);
      });
      dom.operationsTrafficPlatforms.hidden = platforms.length === 0;
    }
    if (dom.operationsTrafficEmpty) dom.operationsTrafficEmpty.hidden = platforms.length > 0;
  }

  function operationsAgentLabel(status) {
    const key = ["queued", "running", "waiting_for_configuration", "completed", "error"].includes(status) ? status : "idle";
    return t(`operations.agent_${key}`);
  }

  function metricDisplay(value, unit = "") {
    if (value === null || value === undefined) return t("operations.metric_no_data");
    if (unit === "ratio" || unit === "percent" || (Number(value) >= 0 && Number(value) <= 1 && unit.includes("rate"))) {
      const percent = unit === "percent" && Number(value) > 1 ? Number(value) : Number(value) * 100;
      return `${Math.round(percent * 10) / 10}%`;
    }
    return new Intl.NumberFormat(currentLanguage()).format(Number(value));
  }

  function currentLanguage() {
    return state.locale === "en" ? "en" : "zh-CN";
  }

  function operationsEnvironmentLabel(status) {
    const key = ["detected", "awaiting_authorization", "connected", "stale", "error"].includes(status)
      ? status
      : "not_detected";
    return t(`operations.environment_${key}`);
  }

  function operationsPrivacyCopy(operations) {
    return t("operations.privacy_boundary", {
      days: operations.privacy.retentionDays ?? 30,
    });
  }

  function operationsSourceLabel(source) {
    if (source.configured && source.status === "configured") return t("operations.source_configured");
    if (source.status === "needs_authorization") return t("operations.source_needs_authorization");
    return t("operations.source_detected");
  }

  function operationsSeriesRows(value) {
    return arrayFrom(value).map((item, index) => {
      if (typeof item === "number") return { label: String(index + 1), value: item };
      if (!item || typeof item !== "object") return null;
      const number = Number(item.value ?? item.count ?? item.users ?? item.share);
      if (!Number.isFinite(number) || number < 0) return null;
      return { label: firstText(item.label, item.date, item.version, item.name, String(index + 1)), value: number };
    }).filter(Boolean);
  }

  function operationsPrefillUrls(operations) {
    const urls = [
      ...arrayFrom(operations.publicEnvironment?.publicUrls),
      ...operations.deploymentTargets.map((target) => target.publicUrl).filter(Boolean),
    ].map(firstText).filter(Boolean);
    return urls.filter((url, index) => urls.indexOf(url) === index);
  }

  function buildLaunchOnboarding(operations) {
    const releases = arrayFrom(operations.releases);
    const release = releases.at(-1) || null;
    const phase = firstText(state.current?.phase).toUpperCase();
    const status = firstText(state.current?.status).toLowerCase();
    const deployedUrls = operationsPrefillUrls(operations);
    const deployed = deployedUrls.length > 0
      || !["not_detected", ""].includes(firstText(operations.publicEnvironment?.status).toLowerCase());
    const versionDone = releases.length > 0
      || ["DELIVER", "DELIVERED"].includes(phase)
      || ["delivered", "delivered_listening"].includes(status);
    const versionHint = versionDone
      ? firstText(release?.label, release?.display_name, release?.internal_version, t("launch.checklist_step_version_hint"))
      : deployed
        ? (deployedUrls[0]
            ? t("operations.checklist_step_version_deployed", { url: deployedUrls[0] })
            : t("operations.checklist_step_version_deployed_generic"))
        : t("launch.checklist_step_version_hint");
    const steps = [
      { id: "version", titleKey: "launch.checklist_step_version", hint: versionHint, done: versionDone },
    ];
    const currentStep = steps[0];
    steps.forEach((step) => {
      step.state = step.done ? "done" : "current";
    });
    return {
      steps,
      currentStepId: currentStep.id,
      complete: versionDone,
      prefill: {
        urls: deployedUrls,
        analytics: [],
        targets: operations.deploymentTargets.filter((target) => target.publicUrl || target.autoDetected),
      },
    };
  }

  function renderLaunchChecklist(operations) {
    const onboarding = buildLaunchOnboarding(operations);
    if (!dom.launchChecklist || !dom.launchChecklistSteps) return;
    dom.launchChecklist.classList.toggle("is-complete", onboarding.complete);
    dom.launchChecklistSteps.replaceChildren();
    onboarding.steps.forEach((step, index) => {
      const row = element("li", "operations-checklist-step");
      row.dataset.state = step.state;
      row.dataset.stepId = step.id;
      const marker = element("span", "operations-checklist-marker", step.done ? "✓" : String(index + 1));
      const copy = element("div", "");
      copy.append(element("strong", "", t(step.titleKey)), element("small", "", step.hint));
      row.append(marker, copy);
      dom.launchChecklistSteps.append(row);
    });

    const prefillItems = [];
    onboarding.prefill.urls.forEach((url) => prefillItems.push(`${t("operations.prefill_server")}: ${url}`));
    onboarding.prefill.targets.forEach((target) => {
      const label = firstText(target.displayName, target.providerId);
      if (label && target.publicUrl) prefillItems.push(`${label}: ${target.publicUrl}`);
    });
    const showPrefill = prefillItems.length > 0 && onboarding.currentStepId === "version";
    if (dom.launchChecklistPrefill) dom.launchChecklistPrefill.hidden = !showPrefill;
    if (dom.launchChecklistPrefillList) {
      dom.launchChecklistPrefillList.replaceChildren();
      prefillItems.slice(0, 8).forEach((item) => {
        dom.launchChecklistPrefillList.append(element("li", "", item));
      });
    }

    if (dom.launchChecklistAction) {
      const current = currentOperations();
      const busy = state.operationsLoading || current.agentRequests.some((item) => ["queued", "running"].includes(firstText(item.status).toLowerCase()));
      dom.launchChecklistAction.hidden = onboarding.complete;
      dom.launchChecklistAction.disabled = busy || onboarding.complete;
      dom.launchChecklistAction.dataset.stepId = onboarding.currentStepId;
      const actionKey = `launch.checklist_action_${onboarding.currentStepId}`;
      const fallbackKey = `operations.checklist_action_${onboarding.currentStepId}`;
      dom.launchChecklistAction.textContent = t(actionKey) === actionKey ? t(fallbackKey) : t(actionKey);
    }
  }

  async function submitLaunchChecklistAction() {
    if (!state.current) return;
    const onboarding = buildLaunchOnboarding(currentOperations());
    const stepId = firstText(dom.launchChecklistAction?.dataset.stepId, onboarding.currentStepId);
    let text = t(`operations.checklist_action_${stepId}`);
    if (stepId === "version") text = t("operations.action_release");
    sendDeveloperPrompt(text);
  }

  function renderOperationsDashboard(operations) {
    const metrics = operations.metrics;
    const available = Object.values(operations.metricRecords).filter((item) => item.status === "available");
    const configured = operations.dataSources.some((item) => item.configured);
    const agent = operations.operationsAgent;
    const dashboardState = agent.status === "error" ? "error"
      : ["queued", "running"].includes(agent.status) ? "refreshing"
        : available.length ? "ready" : "waiting";
    dom.operationsDashboardStatus.dataset.state = dashboardState;
    dom.operationsDashboardStatus.textContent = t(`operations.dashboard_${dashboardState}`);
    const environmentCopy = operationsEnvironmentLabel(operations.publicEnvironment.status);
    const privacyCopy = operationsPrivacyCopy(operations);
    const analyticsState = analyticsBoardState(operations);
    dom.operationsDashboardCopy.textContent = available.length
      ? `${environmentCopy} · ${t("operations.metric_provenance", { source: available.map((item) => item.sourceName).filter(Boolean).join(", ") })} · ${privacyCopy}`
      : analyticsState === "needs_information"
        ? t("operations.dashboard_copy_needs_information")
        : analyticsState === "needs_authorization"
          ? t("operations.dashboard_copy_needs_auth")
          : analyticsState === "needs_implementation"
            ? t("operations.dashboard_copy_needs_data")
            : `${environmentCopy} · ${privacyCopy}`;
    dom.operationsMetricUsers.textContent = metricDisplay(metrics.monthlyActiveUsers);
    dom.operationsMetricActive.textContent = metricDisplay(metrics.activeUsers);
    dom.operationsMetricRetention.textContent = metricDisplay(metrics.retention, operations.metricRecords.retention?.unit || "ratio");

    const versions = operationsSeriesRows(metrics.versionAdoption);
    dom.operationsMetricCurrentVersion.textContent = versions.sort((left, right) => right.value - left.value)[0]?.label || t("operations.metric_no_data");
    renderOperationsSeries(dom.operationsTrendChart, dom.operationsTrendEmpty, operationsSeriesRows(metrics.trend), "trend");
    renderOperationsSeries(dom.operationsVersionList, dom.operationsVersionEmpty, versions, "version");

    const anomalies = [
      [operations.metricRecords.errors, metrics.errors],
      [operations.metricRecords.crashes, metrics.crashes],
    ].filter(([, value]) => Number(value) > 0);
    const hasAnomalyEvidence = [operations.metricRecords.errors, operations.metricRecords.crashes]
      .some((metric) => metric?.status === "available");
    dom.operationsAnomalyList.replaceChildren();
    anomalies.forEach(([metric, value]) => {
      const row = element("li", "");
      row.append(element("strong", "", metric.label), element("span", "", metricDisplay(value)));
      dom.operationsAnomalyList.append(row);
    });
    dom.operationsAnomalyEmpty.textContent = t(hasAnomalyEvidence ? "operations.anomaly_empty" : "operations.anomaly_no_data");
    dom.operationsAnomalyEmpty.hidden = anomalies.length > 0;
    dom.operationsAnomalyList.hidden = anomalies.length === 0;
    dom.operationsDashboard.classList.toggle("is-unconfigured", !configured);
  }

  function renderOperationsSeries(container, empty, rows, kind) {
    container.replaceChildren();
    if (!rows.length) {
      empty.hidden = false;
      container.hidden = true;
      return;
    }
    const max = Math.max(...rows.map((item) => item.value), 1);
    rows.slice(-12).forEach((item) => {
      const row = element(kind === "version" ? "li" : "div", `operations-${kind}-row`);
      row.append(element("span", "", item.label));
      const bar = element("i", "operations-data-bar");
      bar.style.setProperty("--value", `${Math.max(3, Math.round((item.value / max) * 100))}%`);
      row.append(bar, element("strong", "", metricDisplay(item.value)));
      container.append(row);
    });
    empty.hidden = true;
    container.hidden = false;
  }

  function retryOutgoingMessage(clientRequestId) {
    const record = state.outgoingMessages.get(clientRequestId);
    if (!record || record.inFlight) return;
    record.message._client_send_state = "sending";
    delete record.message._client_send_error;
    mergeOptimisticMessage(record.message);
    renderMessages();
    void deliverOutgoingMessage(clientRequestId);
  }

  async function uploadFile(file, appId = state.currentId) {
    const response = await request(`/apps/${encodeURIComponent(appId)}/uploads`, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-Filename": encodeURIComponent(file.name),
      },
      body: file,
      timeoutMs: UPLOAD_REQUEST_TIMEOUT_MS,
    });

    const attachmentId = firstText(
      response?.attachment_id,
      response?.id,
      response?.attachment?.id,
      response?.file?.id,
      Array.isArray(response?.attachment_ids) ? response.attachment_ids[0] : ""
    );
    if (!attachmentId) throw new ApiError(t("upload.missing_id"), 500, response);
    return attachmentId;
  }

  function updateComposer() {
    if (!dom.sendButton) return;
    const hasContent = Boolean(dom.messageInput.value.trim() || state.pendingFiles.length);
    dom.sendButton.disabled = !hasContent || !state.currentId || state.operationsLoading;
    dom.sendButton.setAttribute("aria-label", state.growthOpen ? t("growth.composer_target") : t("composer.send"));
    dom.messageInput.disabled = state.operationsLoading;
    dom.attachmentInput.disabled = state.operationsLoading;
    if (dom.composerAttachButton) dom.composerAttachButton.disabled = state.operationsLoading;
    dom.sendHint.textContent = state.growthOpen
      ? t("growth.composer_hint")
      : t(state.chatView === "developer" ? "composer.developer_hint" : "composer.hint");
  }

  function autosizeMessageInput() {
    dom.messageInput.style.height = "auto";
    const border = Math.max(0, dom.messageInput.offsetHeight - dom.messageInput.clientHeight);
    const minHeight = parseFloat(getComputedStyle(dom.messageInput).minHeight) || 90;
    dom.messageInput.style.height = `${Math.min(Math.max(dom.messageInput.scrollHeight + border, minHeight), 132)}px`;
  }

  function openCreateDialog() {
    closeDrawers();
    state.createUploadToken = newWorkspaceUploadToken();
    renderCodingAgentOptions();
    renderCreateMaterials();
    if (!state.systemLoading && !CODING_AGENT_IDS.some(isCodingAgentAvailable)) {
      showToast("未检测到可用的本地 Coding 软件，请安装 Codex 或 Claude Code 后刷新页面。", "error", 6_000);
    }
    showDialog(dom.createDialog);
    requestAnimationFrame(() => dom.audienceInput.focus());
  }

  function openExperienceSurfaceDialog() {
    if (!state.current || state.experienceSurfaceCreating) return;
    dom.experienceSurfaceForm.reset();
    dom.experienceSurfaceType.value = "desktop_web";
    dom.experienceSurfaceRoute.value = "/";
    dom.experienceSurfaceError.hidden = true;
    dom.experienceSurfaceError.textContent = "";
    const codingAgent = experienceSurfaceCodingAgent();
    dom.experienceSurfaceAgent.textContent = codingAgent ? codingAgentLabel(codingAgent) : "Claude Code / Codex";
    applyExperienceSurfacePreset();
    showDialog(dom.experienceSurfaceDialog);
    requestAnimationFrame(() => dom.experienceSurfaceType.focus());
  }

  function experienceSurfaceCodingAgent() {
    const candidate = firstText(
      currentCodingAgent(state.current),
      state.experienceTwin?.fallback?.codingAgent,
      state.current?.experienceTwin?.fallback?.codingAgent
    ).toLowerCase();
    return CODING_AGENT_IDS.includes(candidate) ? candidate : "";
  }

  function closeExperienceSurfaceDialog() {
    if (state.experienceSurfaceCreating) return;
    closeDialog(dom.experienceSurfaceDialog);
  }

  function applyExperienceSurfacePreset() {
    const preset = EXPERIENCE_SURFACE_PRESETS[dom.experienceSurfaceType.value] || EXPERIENCE_SURFACE_PRESETS.custom;
    const selectedLabel = dom.experienceSurfaceType.selectedOptions?.[0]?.textContent?.trim() || "";
    dom.experienceSurfaceName.value = selectedLabel;
    dom.experienceSurfacePlatform.value = preset.platform;
    dom.experienceSurfaceDevice.value = preset.deviceName;
    dom.experienceSurfaceWidth.value = String(preset.width);
    dom.experienceSurfaceHeight.value = String(preset.height);
    if (!dom.experienceSurfaceRoute.value.trim()) dom.experienceSurfaceRoute.value = "/";
    clearExperienceSurfaceError();
  }

  function clearExperienceSurfaceError() {
    dom.experienceSurfaceRoute.setCustomValidity("");
    dom.experienceSurfaceError.textContent = "";
    dom.experienceSurfaceError.hidden = true;
  }

  function validatedExperienceSurfaceRoute() {
    const route = dom.experienceSurfaceRoute.value.trim();
    if (!route.startsWith("/") || route.startsWith("//") || route.includes("\\") || /[\u0000-\u001f\u007f\s]/.test(route)) {
      dom.experienceSurfaceRoute.setCustomValidity(t("surface_add.route_invalid"));
      dom.experienceSurfaceRoute.reportValidity();
      return "";
    }
    dom.experienceSurfaceRoute.setCustomValidity("");
    return route;
  }

  async function submitExperienceSurface(event) {
    event.preventDefault();
    if (state.experienceSurfaceCreating || !state.currentId || !state.current) return;
    clearExperienceSurfaceError();
    const route = validatedExperienceSurfaceRoute();
    if (!route || !dom.experienceSurfaceForm.reportValidity()) return;

    const preset = EXPERIENCE_SURFACE_PRESETS[dom.experienceSurfaceType.value] || EXPERIENCE_SURFACE_PRESETS.custom;
    const codingAgent = experienceSurfaceCodingAgent();
    const payload = {
      surface: preset.surface,
      label: dom.experienceSurfaceName.value.trim(),
      platform: dom.experienceSurfacePlatform.value.trim(),
      device_name: dom.experienceSurfaceDevice.value.trim(),
      width: Number(dom.experienceSurfaceWidth.value),
      height: Number(dom.experienceSurfaceHeight.value),
      route,
      runtime_provider: preset.runtimeProvider,
      ...(codingAgent ? { coding_agent: codingAgent } : {}),
    };

    state.experienceSurfaceCreating = true;
    dom.submitExperienceSurfaceButton.disabled = true;
    dom.cancelExperienceSurfaceButton.disabled = true;
    dom.closeExperienceSurfaceButton.disabled = true;
    dom.submitExperienceSurfaceButton.textContent = t("surface_add.submitting");
    try {
      const response = await request(
        `/apps/${encodeURIComponent(state.currentId)}/experience-surfaces`,
        { method: "POST", json: payload }
      );
      state.surfacePreparationContract = response?.runtime || null;
      closeDialog(dom.experienceSurfaceDialog);
      showToast(t("surface_add.waiting"), "success", 5_000);
      await loadCurrentApp({ silent: true });
      await loadExperienceTwin({ force: true });
      const createdView = state.experienceTwin?.views?.find((item) => item.id === response?.surface?.id) || state.experienceTwin?.views?.at(-1);
      if (createdView) {
        state.experienceTwinViewId = createdView.id;
        await ensureSurfacePreparationStarted(createdView);
      }
    } catch (error) {
      dom.experienceSurfaceError.textContent = friendlyError(error, t("surface_add.failed"));
      dom.experienceSurfaceError.hidden = false;
    } finally {
      state.experienceSurfaceCreating = false;
      dom.submitExperienceSurfaceButton.disabled = false;
      dom.cancelExperienceSurfaceButton.disabled = false;
      dom.closeExperienceSurfaceButton.disabled = false;
      dom.submitExperienceSurfaceButton.textContent = t("surface_add.submit");
    }
  }

  function closeCreateDialog() {
    if (state.creating) return;
    closeDialog(dom.createDialog);
  }

  function addCreateMaterials(event) {
    Array.from(event.target.files || []).forEach((file) => {
      state.createMaterials.push({
        key: uniqueKey(),
        file,
        status: "ready",
        uploadId: "",
        error: "",
      });
    });
    event.target.value = "";
    renderCreateMaterials();
  }

  function renderCreateMaterials() {
    dom.createMaterialsList.replaceChildren();
    dom.createMaterialsList.hidden = state.createMaterials.length === 0;
    dom.createMaterialsError.hidden = !state.createMaterials.some((item) => item.error);
    dom.createMaterialsError.textContent = state.createMaterials.find((item) => item.error)?.error || "";
    state.createMaterials.forEach((material) => {
      const row = element("div", "create-material-row");
      const copy = element("div", "create-material-copy");
      copy.append(
        element("strong", "", material.file.name),
        element("small", "", `${formatBytes(material.file.size)}${material.status === "uploading" ? ` · ${t("create.materials_uploading")}` : ""}`),
      );
      const remove = element("button", "create-material-remove", "×");
      remove.type = "button";
      remove.disabled = material.status === "uploading" || state.creating;
      remove.setAttribute("aria-label", t("create.materials_remove", { name: material.file.name }));
      remove.addEventListener("click", () => {
        state.createMaterials = state.createMaterials.filter((item) => item.key !== material.key);
        renderCreateMaterials();
      });
      row.append(element("span", "create-material-icon", "↥"), copy, remove);
      row.classList.toggle("is-uploading", material.status === "uploading");
      row.classList.toggle("has-error", Boolean(material.error));
      dom.createMaterialsList.append(row);
    });
  }

  function clearCreateMaterials() {
    state.createMaterials = [];
    if (dom.createMaterialsInput) dom.createMaterialsInput.value = "";
    if (dom.createMaterialsList) renderCreateMaterials();
  }

  function newWorkspaceUploadToken() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const bytes = new Uint8Array(24);
    globalThis.crypto?.getRandomValues?.(bytes);
    const random = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    return random || `${Date.now().toString(36)}-${uniqueKey()}-${Math.random().toString(36).slice(2)}`;
  }

  async function uploadCreateMaterial(material) {
    if (material.uploadId) return material.uploadId;
    if (!state.createUploadToken) state.createUploadToken = newWorkspaceUploadToken();
    material.status = "uploading";
    material.error = "";
    renderCreateMaterials();
    try {
      const response = await request("/workspaces/uploads", {
        method: "POST",
        headers: {
          "Content-Type": material.file.type || "application/octet-stream",
          "X-Filename": encodeURIComponent(material.file.name),
          "X-Upload-Token": state.createUploadToken,
        },
        body: material.file,
        timeoutMs: UPLOAD_REQUEST_TIMEOUT_MS,
      });
      material.uploadId = firstText(
        response?.file_id,
        response?.upload_id,
        response?.id,
        response?.file?.id,
        response?.attachment?.id,
      );
      if (!material.uploadId) throw new ApiError(t("upload.missing_id"), 500, response);
      material.status = "uploaded";
      renderCreateMaterials();
      return material.uploadId;
    } catch (error) {
      material.status = "failed";
      material.error = t("create.materials_upload_failed", { name: material.file.name });
      renderCreateMaterials();
      throw error;
    }
  }

  function workspaceField(target = state.workspaceFieldTarget || "create") {
    if (target === "edit") {
      return { input: dom.workspaceEditInput, error: dom.workspaceEditError };
    }
    return { input: dom.workspaceInput, error: dom.workspaceError };
  }

  function openWorkspaceEditDialog() {
    if (!state.currentId || state.workspaceSaving) return;
    state.workspaceFieldTarget = "edit";
    clearWorkspaceError("edit");
    dom.workspaceEditInput.value = currentWorkspace(state.current);
    showDialog(dom.workspaceEditDialog);
    requestAnimationFrame(() => dom.workspaceEditInput.focus());
  }

  function closeWorkspaceEditDialog() {
    if (state.workspaceSaving) return;
    closeDialog(dom.workspaceEditDialog);
    state.workspaceFieldTarget = "create";
    clearWorkspaceError("edit");
  }

  function clearCodingAgentSettingsError() {
    if (!dom.codingAgentSettingsError) return;
    dom.codingAgentSettingsError.hidden = true;
    dom.codingAgentSettingsError.textContent = "";
  }

  function setCodingAgentSettingsError(message) {
    if (!dom.codingAgentSettingsError) return;
    dom.codingAgentSettingsError.hidden = !message;
    dom.codingAgentSettingsError.textContent = message || "";
  }

  function openCodingAgentDialog() {
    if (!state.currentId || state.codingAgentSaving) return;
    clearCodingAgentSettingsError();
    const cliArgs = state.current?.codingAgentCliArgs || { claude: "", codex: "" };
    const activeAgent = currentCodingAgent(state.current) || "claude";
    const activeAgentLabel = codingAgentLabel(activeAgent);
    const activeInput = activeAgent === "codex" ? dom.codexCliArgsInput : dom.claudeCliArgsInput;
    dom.claudeCliArgsInput.value = firstText(cliArgs.claude);
    dom.codexCliArgsInput.value = firstText(cliArgs.codex);
    dom.claudeCliArgsField.hidden = activeAgent !== "claude";
    dom.codexCliArgsField.hidden = activeAgent !== "codex";
    dom.codingAgentDialogTitle.textContent = t("coding_agent.edit_title_current", { agent: activeAgentLabel });
    dom.codingAgentDialogIntro.textContent = t("coding_agent.edit_intro_current", { agent: activeAgentLabel });
    showDialog(dom.codingAgentDialog);
    requestAnimationFrame(() => activeInput.focus());
  }

  function closeCodingAgentDialog() {
    if (state.codingAgentSaving) return;
    closeDialog(dom.codingAgentDialog);
    clearCodingAgentSettingsError();
  }

  async function saveCodingAgentSettings(event) {
    event.preventDefault();
    if (!state.currentId || state.codingAgentSaving) return;
    clearCodingAgentSettingsError();
    state.codingAgentSaving = true;
    dom.saveCodingAgentButton.disabled = true;
    dom.saveCodingAgentButton.textContent = t("coding_agent.saving");
    try {
      await request(`/apps/${encodeURIComponent(state.currentId)}/coding-agent`, {
        method: "POST",
        json: {
          cli_args: {
            claude: dom.claudeCliArgsInput.value,
            codex: dom.codexCliArgsInput.value,
          },
        },
        timeoutMs: 20_000,
      });
      closeCodingAgentDialog();
      showToast(t("coding_agent.saved"), "success", 4000);
      await Promise.all([
        loadCurrentApp({ silent: false }),
        loadApps({ silent: true, loadDetail: false }),
      ]);
    } catch (error) {
      if (error instanceof ApiError) {
        const code = firstText(error.payload?.error?.code, error.payload?.detail?.code, error.payload?.code).toLowerCase();
        if (code === "coding_agent_settings_blocked") {
          setCodingAgentSettingsError(t("coding_agent.update_blocked"));
          showToast(t("coding_agent.update_blocked"), "error", 6000);
          return;
        }
        const message = firstText(
          error.payload?.error?.message,
          error.payload?.detail?.message,
          error.payload?.message
        );
        if (message) {
          setCodingAgentSettingsError(message);
          showToast(message, "error", 6000);
          return;
        }
      }
      showToast(friendlyError(error, t("coding_agent.update_failed")), "error", 6000);
    } finally {
      state.codingAgentSaving = false;
      dom.saveCodingAgentButton.disabled = false;
      dom.saveCodingAgentButton.textContent = t("coding_agent.save");
    }
  }

  async function saveWorkspaceEdit(event) {
    event.preventDefault();
    if (!state.currentId || state.workspaceSaving) return;
    state.workspaceFieldTarget = "edit";
    clearWorkspaceError("edit");
    if (!dom.workspaceEditForm.reportValidity()) return;
    if (!(await validateWorkspaceInput({ target: "edit" }))) {
      showToast(dom.workspaceEditError.textContent || t("workspace.not_found"), "error", 6000);
      return;
    }
    const nextWorkspace = dom.workspaceEditInput.value.trim();
    const currentPath = currentWorkspace(state.current);
    if (nextWorkspace === currentPath) {
      closeWorkspaceEditDialog();
      return;
    }
    state.workspaceSaving = true;
    dom.saveWorkspaceEditButton.disabled = true;
    dom.saveWorkspaceEditButton.textContent = t("workspace.saving");
    try {
      const response = await request(`/apps/${encodeURIComponent(state.currentId)}/workspace`, {
        method: "POST",
        json: { workspace: nextWorkspace },
        timeoutMs: 20_000,
      });
      closeWorkspaceEditDialog();
      showToast(t("workspace.updated"), "success", 4000);
      await Promise.all([
        loadCurrentApp({ silent: false }),
        loadApps({ silent: true, loadDetail: false }),
        state.operations ? loadOperations({ silent: true }) : Promise.resolve(),
      ]);
    } catch (error) {
      if (error instanceof ApiError) {
        const code = firstText(error.payload?.error?.code, error.payload?.detail?.code, error.payload?.code).toLowerCase();
        if (code === "workspace_update_blocked") {
          setWorkspaceError(t("workspace.update_blocked"), { focus: true, target: "edit" });
          showToast(t("workspace.update_blocked"), "error", 6000);
          return;
        }
      }
      if (!applyWorkspaceError(error, { focus: true, target: "edit" })) {
        showToast(friendlyError(error, t("workspace.update_failed")), "error", 6000);
      }
    } finally {
      state.workspaceSaving = false;
      dom.saveWorkspaceEditButton.disabled = false;
      dom.saveWorkspaceEditButton.textContent = t("workspace.save");
    }
  }

  async function openWorkspaceBrowser(target = state.workspaceFieldTarget || "create") {
    if (state.creating || (target === "edit" && state.workspaceSaving)) return;
    state.workspaceFieldTarget = target;
    hideWorkspaceNewFolder();
    dom.workspaceBrowserError.hidden = true;
    dom.workspaceBrowserError.textContent = "";
    showDialog(dom.workspaceBrowserDialog);
    const requestedPath = workspaceField(target).input?.value.trim() || "";
    const loaded = await loadWorkspaceDirectory(requestedPath);
    // A manually typed path may be missing or outside the remotely browsable roots.
    // Keep its explicit field error, but still give the user a usable folder picker.
    const mayFallback = [
      "workspace_not_found",
      "workspace_outside_allowed_roots",
      "invalid_workspace",
      "workspace_not_directory",
    ].includes(state.workspaceBrowserLastErrorCode);
    if (!loaded && mayFallback && requestedPath && dom.workspaceBrowserDialog.open) {
      await loadWorkspaceDirectory("");
    }
  }

  function closeWorkspaceBrowser() {
    if (state.workspaceBrowserBusy || state.workspaceBrowserCreating) return;
    closeDialog(dom.workspaceBrowserDialog);
  }

  function workspaceBrowsePath(payload, fallback = "") {
    return firstText(payload?.current_path, payload?.path, payload?.directory, payload?.workspace, fallback);
  }

  function workspaceEntries(payload) {
    return arrayFrom(payload?.entries ?? payload?.directories ?? payload?.children ?? payload?.items)
      .map((entry) => {
        if (typeof entry === "string") return { name: entry.split(/[\\/]/).filter(Boolean).pop() || entry, path: entry, type: "directory" };
        if (!entry || typeof entry !== "object") return null;
        const type = firstText(entry.type, entry.kind, entry.entry_type).toLowerCase();
        const isDirectory = entry.is_directory === true || entry.directory === true || ["directory", "dir", "folder"].includes(type);
        if (!isDirectory) return null;
        const path = firstText(entry.path, entry.absolute_path, entry.full_path);
        if (!path) return null;
        return { name: firstText(entry.name, entry.label, path.split(/[\\/]/).filter(Boolean).pop(), path), path, type: "directory" };
      })
      .filter(Boolean)
      .sort((left, right) => left.name.localeCompare(right.name, state.locale));
  }

  function workspaceRoots(payload) {
    return arrayFrom(payload?.roots ?? payload?.drives ?? payload?.locations).map((root) => {
      if (typeof root === "string") return { name: root, path: root };
      const path = firstText(root?.path, root?.value, root?.root);
      return path ? { name: firstText(root?.name, root?.label, path), path } : null;
    }).filter(Boolean);
  }

  async function loadWorkspaceDirectory(path = "") {
    if (state.workspaceBrowserBusy) return false;
    state.workspaceBrowserBusy = true;
    state.workspaceBrowserLastErrorCode = "";
    dom.workspaceBrowserLoading.hidden = false;
    dom.workspaceBrowserError.hidden = true;
    dom.workspaceBrowserEmpty.hidden = true;
    dom.workspaceBrowserList.replaceChildren();
    dom.chooseWorkspaceFolderButton.disabled = true;
    dom.showWorkspaceNewFolderButton.disabled = true;
    dom.workspaceBrowserUpButton.disabled = true;
    try {
      const query = path ? `?path=${encodeURIComponent(path)}` : "";
      const payload = await request(`/workspaces/browse${query}`, { timeoutMs: 30_000 });
      state.workspaceBrowserPath = workspaceBrowsePath(payload, path);
      state.workspaceBrowserParent = firstText(payload?.parent_path, payload?.parent, payload?.parent_directory);
      dom.workspaceBrowserCurrentPath.textContent = state.workspaceBrowserPath;
      dom.workspaceBrowserCurrentPath.title = state.workspaceBrowserPath;
      dom.workspaceBrowserUpButton.disabled = !state.workspaceBrowserParent;

      const roots = workspaceRoots(payload);
      dom.workspaceBrowserRoots.replaceChildren();
      roots.forEach((root) => {
        const button = element("button", "workspace-root-button", root.name);
        button.type = "button";
        button.addEventListener("click", () => loadWorkspaceDirectory(root.path));
        dom.workspaceBrowserRoots.append(button);
      });
      dom.workspaceBrowserRoots.hidden = roots.length === 0;

      const entries = workspaceEntries(payload);
      entries.forEach((entry) => {
        const button = element("button", "workspace-directory-row");
        button.type = "button";
        button.setAttribute("role", "listitem");
        button.append(element("span", "workspace-directory-icon", "▰"), element("span", "workspace-directory-name", entry.name), element("span", "workspace-directory-arrow", "›"));
        button.addEventListener("click", () => loadWorkspaceDirectory(entry.path));
        dom.workspaceBrowserList.append(button);
      });
      dom.workspaceBrowserEmpty.hidden = entries.length > 0;
      dom.chooseWorkspaceFolderButton.disabled = !state.workspaceBrowserPath;
      dom.showWorkspaceNewFolderButton.disabled = !state.workspaceBrowserPath;
      return true;
    } catch (error) {
      state.workspaceBrowserLastErrorCode = firstText(error?.payload?.code, error?.payload?.error?.code).toLowerCase();
      const isWorkspaceError = applyWorkspaceError(error, { focus: false });
      const message = isWorkspaceError ? dom.workspaceError.textContent : friendlyError(error, t("workspace_browser.load_failed"));
      const retryButton = element("button", "secondary-button workspace-browser-retry", t("workspace_browser.retry"));
      retryButton.type = "button";
      retryButton.addEventListener("click", () => loadWorkspaceDirectory(path));
      dom.workspaceBrowserError.replaceChildren(element("span", "workspace-browser-error-text", message), retryButton);
      dom.workspaceBrowserError.hidden = false;
      return false;
    } finally {
      state.workspaceBrowserBusy = false;
      dom.workspaceBrowserLoading.hidden = true;
    }
  }

  function chooseWorkspaceFolder() {
    if (!state.workspaceBrowserPath) return;
    const field = workspaceField();
    if (field.input) field.input.value = state.workspaceBrowserPath;
    clearWorkspaceError(state.workspaceFieldTarget);
    closeDialog(dom.workspaceBrowserDialog);
  }

  function showWorkspaceNewFolder() {
    if (!state.workspaceBrowserPath) return;
    dom.workspaceNewFolder.hidden = false;
    dom.showWorkspaceNewFolderButton.hidden = true;
    dom.workspaceNewFolderError.hidden = true;
    dom.workspaceNewFolderError.textContent = "";
    dom.workspaceNewFolderInput.value = "";
    requestAnimationFrame(() => dom.workspaceNewFolderInput.focus());
  }

  function hideWorkspaceNewFolder() {
    if (state.workspaceBrowserCreating) return;
    dom.workspaceNewFolder.hidden = true;
    dom.showWorkspaceNewFolderButton.hidden = false;
    dom.workspaceNewFolderError.hidden = true;
    dom.workspaceNewFolderError.textContent = "";
  }

  async function createWorkspaceFolder() {
    if (state.workspaceBrowserCreating || !state.workspaceBrowserPath) return;
    const name = dom.workspaceNewFolderInput.value.trim();
    if (!name) {
      dom.workspaceNewFolderError.textContent = t("workspace_browser.name_required");
      dom.workspaceNewFolderError.hidden = false;
      dom.workspaceNewFolderInput.focus();
      return;
    }
    state.workspaceBrowserCreating = true;
    dom.confirmWorkspaceNewFolderButton.disabled = true;
    dom.cancelWorkspaceNewFolderButton.disabled = true;
    dom.confirmWorkspaceNewFolderButton.textContent = t("workspace_browser.creating");
    let created = false;
    try {
      const response = await request("/workspaces/folders", {
        method: "POST",
        json: { parent_path: state.workspaceBrowserPath, name },
        timeoutMs: 30_000,
      });
      const createdPath = workspaceBrowsePath(response);
      await loadWorkspaceDirectory(createdPath || state.workspaceBrowserPath);
      created = true;
    } catch (error) {
      dom.workspaceNewFolderError.textContent = friendlyError(error, t("workspace_browser.create_failed"));
      dom.workspaceNewFolderError.hidden = false;
    } finally {
      state.workspaceBrowserCreating = false;
      dom.confirmWorkspaceNewFolderButton.disabled = false;
      dom.cancelWorkspaceNewFolderButton.disabled = false;
      dom.confirmWorkspaceNewFolderButton.textContent = t("workspace_browser.create");
      if (created) hideWorkspaceNewFolder();
    }
  }

  async function validateWorkspaceInput({ silent = false, target = state.workspaceFieldTarget || "create" } = {}) {
    const { input } = workspaceField(target);
    const path = input?.value.trim() || "";
    if (!path) return false;
    try {
      const payload = await request(`/workspaces/validate?path=${encodeURIComponent(path)}`, { timeoutMs: 15_000 });
      if (payload?.path && input) input.value = payload.path;
      clearWorkspaceError(target);
      return true;
    } catch (error) {
      if (!applyWorkspaceError(error, { focus: !silent, target }) && !silent) {
        setWorkspaceError(friendlyError(error, t("workspace_browser.load_failed")), { focus: !silent, target });
      }
      return false;
    }
  }

  function updateIntentPreview() {
    if (!dom.intentPreview) return;
    const audience = dom.audienceInput.value.trim() || t("create.audience_default");
    const appType = dom.appTypeInput.value.trim() || t("create.type_default");
    const needs = dom.needsInput.value.trim() || t("create.needs_default");
    dom.intentPreview.textContent = t("create.intent", { audience, appType, needs });
  }


  async function downloadSourceExport() {
    if (!state.currentId) {
      showToast(t("export.need_app"), "error");
      return;
    }
    const button = dom.downloadSourceExportButton;
    if (button) {
      button.disabled = true;
      button.textContent = t("export.downloading");
    }
    try {
      const response = await fetch(`${API_ROOT}/apps/${encodeURIComponent(state.currentId)}/source-export`, {
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error(t("export.failed"));
      }
      const blob = await response.blob();
      const header = response.headers.get("Content-Disposition") || "";
      const match = header.match(/filename="([^"]+)"/i);
      const filename = match?.[1] || `${state.currentId}-app.zip`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast(t("export.done"), "success");
    } catch (error) {
      showToast(friendlyError(error, t("export.failed")), "error", 6_000);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = t("export.download");
      }
    }
  }

  async function createApp(event) {
    event.preventDefault();
    if (state.creating) return;
    if (state.systemLoading) {
      showToast(t("create.checking_system"), "error");
      return;
    }
    const availableAgents = CODING_AGENT_IDS.filter(isCodingAgentAvailable);
    if (!availableAgents.length) {
      updateCreateAvailability();
      setCodingAgentError("Codex 和 Claude Code 均未安装或命令行不可用，请安装后刷新页面。");
      showToast("未检测到可用的本地 Coding 软件，请安装 Codex 或 Claude Code 后刷新页面。", "error", 6_000);
      return;
    }
    const codingAgent = selectedCodingAgent();
    if (!codingAgent || !isCodingAgentAvailable(codingAgent)) {
      const message = codingAgent
        ? `${codingAgentLabel(codingAgent)} 未安装或命令行不可用，请选择可用的软件。`
        : t("create.choose_agent");
      setCodingAgentError(message);
      updateCreateAvailability();
      showToast(message, "error", 6_000);
      return;
    }
    if (!dom.createForm.reportValidity()) return;
    clearWorkspaceError();
    clearCodingAgentError();

    state.creating = true;
    updateCreateAvailability();
    renderCreateMaterials();
    dom.createSubmitButton.textContent = t("create.creating");
    try {
      if (!(await validateWorkspaceInput())) {
        showToast(dom.workspaceError.textContent || t("workspace.not_found"), "error", 6_000);
        return;
      }
      const detailedFileIds = [];
      for (const material of state.createMaterials) {
        detailedFileIds.push(await uploadCreateMaterial(material));
      }
      const payload = {
        audience: dom.audienceInput.value.trim(),
        app_type: dom.appTypeInput.value.trim(),
        needs: dom.needsInput.value.trim(),
        workspace: dom.workspaceInput.value.trim(),
        coding_agent: codingAgent,
        locale: state.locale,
        detailed_file_ids: detailedFileIds,
      };
      const response = await request("/apps", { method: "POST", json: payload });
      const created =
        response?.state && typeof response.state === "object"
          ? response.state
          : response?.app && typeof response.app === "object"
            ? response.app
            : response;
      const createdId = appId(created);
      closeDialog(dom.createDialog);
      dom.createForm.reset();
      clearCreateMaterials();
      clearWorkspaceError();
      clearCodingAgentError();
      dom.workspaceInput.value = firstText(state.system?.workspace, state.system?.workspace_root);
      renderCodingAgentOptions({ resetSelection: true });
      updateIntentPreview();
      showToast(t("create.created"), "success");
      await loadApps({ initial: true, preferredId: createdId });
    } catch (error) {
      applyWorkspaceError(error);
      const codingAgentMessage = applyCodingAgentError(error, codingAgent);
      showToast(codingAgentMessage || friendlyError(error, t("create.failed")), "error", 6_000);
    } finally {
      state.creating = false;
      dom.createSubmitButton.textContent = t("create.submit");
      renderCreateMaterials();
      updateCreateAvailability();
    }
  }

  function applyCodingAgentError(error, requestedAgent = "") {
    if (!(error instanceof ApiError)) return "";
    const code = firstText(
      error.payload?.error?.code,
      error.payload?.detail?.code,
      error.payload?.code,
      error.payload?.error_code
    ).toLowerCase();
    if (code !== "coding_agent_missing") return "";

    const failedAgent = firstText(
      error.payload?.error?.coding_agent,
      error.payload?.detail?.coding_agent,
      error.payload?.coding_agent,
      requestedAgent,
      selectedCodingAgent()
    ).toLowerCase();
    if (CODING_AGENT_IDS.includes(failedAgent)) state.unavailableCodingAgents.add(failedAgent);
    renderCodingAgentOptions();

    const replacement = selectedCodingAgent();
    const failedLabel = CODING_AGENT_IDS.includes(failedAgent) ? codingAgentLabel(failedAgent) : "所选 Coding 软件";
    const message = replacement
      ? `${failedLabel} 未安装或命令行不可用，已改选 ${codingAgentLabel(replacement)}，请重试。`
      : `${failedLabel} 未安装或命令行不可用，请安装 Codex 或 Claude Code 后刷新页面。`;
    setCodingAgentError(message);
    return message;
  }

  function setCodingAgentError(message) {
    dom.codingAgentError.textContent = message;
    dom.codingAgentError.hidden = false;
    dom.codingAgentOptions.setAttribute("aria-invalid", "true");
  }

  function clearCodingAgentError() {
    dom.codingAgentError.textContent = "";
    dom.codingAgentError.hidden = true;
    dom.codingAgentOptions.removeAttribute("aria-invalid");
  }

  function applyWorkspaceError(error, { focus = true, target = state.workspaceFieldTarget || "create" } = {}) {
    if (!(error instanceof ApiError)) return false;
    const code = firstText(error.payload?.error?.code, error.payload?.detail?.code, error.payload?.code).toLowerCase();
    const backendMessage = firstText(error.payload?.error?.message, error.payload?.detail?.message, error.payload?.message, error.message);
    let message = "";
    if (code === "workspace_not_found" || /路径不存在|目录不存在/.test(backendMessage)) {
      message = t("workspace.not_found");
    } else if (
      code.includes("not_directory") ||
      code.includes("not_a_directory") ||
      code.includes("not_dir") ||
      code.includes("is_file") ||
      /不是目录|并非目录|非目录|必须是目录|应为目录|需要是目录/.test(backendMessage)
    ) {
      message = t("workspace.not_directory");
    } else if (code.includes("invalid_workspace") || /路径格式|绝对路径/.test(backendMessage)) {
      message = t("workspace.invalid");
    } else if (code.includes("workspace") && /权限|读取|访问|不可用/.test(backendMessage)) {
      message = t("workspace.unreadable");
    }
    if (!message) return false;
    setWorkspaceError(message, { focus, target });
    return true;
  }

  function setWorkspaceError(message, { focus = true, target = state.workspaceFieldTarget || "create" } = {}) {
    const { input, error } = workspaceField(target);
    if (!input || !error) return;
    input.setCustomValidity(message);
    input.classList.add("has-error");
    input.setAttribute("aria-invalid", "true");
    error.textContent = message;
    error.hidden = false;
    if (focus) {
      input.focus();
      input.reportValidity();
    }
  }

  function clearWorkspaceError(target = state.workspaceFieldTarget || "create") {
    const { input, error } = workspaceField(target);
    if (!input || !error) return;
    input.setCustomValidity("");
    input.classList.remove("has-error");
    input.removeAttribute("aria-invalid");
    error.textContent = "";
    error.hidden = true;
  }

  function inspectResumeConfirmation(clientRequestId, generation = 0) {
    const current = state.current;
    const request = current?.resumeRequest;
    if (!request || typeof request !== "object") return { accepted: false, resumed: false };
    if (firstText(request.client_request_id) !== clientRequestId) {
      return { accepted: false, resumed: false };
    }
    if (generation && Number(request.generation || 0) !== Number(generation)) {
      return { accepted: false, resumed: false };
    }
    const requestStatus = firstText(request.status).toLowerCase();
    if (["failed", "cancelled"].includes(requestStatus)) {
      return { accepted: true, resumed: false, failed: true };
    }
    return {
      accepted: ["accepted", "launching", "running", "paused"].includes(requestStatus),
      resumed: requestStatus === "running" && current?.pidAlive === true,
      failed: false,
    };
  }

  async function confirmResumeRequest(
    clientRequestId,
    generation = 0,
    timeoutMs = RESUME_CONFIRM_TIMEOUT_MS,
  ) {
    const deadline = Date.now() + timeoutMs;
    let observed = inspectResumeConfirmation(clientRequestId, generation);
    while (!observed.resumed && !observed.failed && Date.now() < deadline) {
      try {
        const requestedId = state.currentId;
        const payload = await request(
          `/apps/${encodeURIComponent(requestedId)}/development`,
          { timeoutMs: Math.min(4_000, Math.max(500, deadline - Date.now())) },
        );
        if (requestedId === state.currentId) {
          applyDevelopmentSnapshot(payload, requestedId, { silent: true, fullRender: false });
        }
      } catch {
        // Confirmation polling is read-only. A lost GET never triggers another
        // Resume POST; the durable request id is checked on the next poll.
      }
      observed = inspectResumeConfirmation(clientRequestId, generation);
      if (!observed.resumed && !observed.failed && Date.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 750));
      }
    }
    return observed;
  }

  async function changeWorkflowState() {
    if (state.workflowAction || !state.currentId) return;
    const action = dom.workflowActionButton.dataset.action;
    if (!action) return;
    if (action === "stop" && !window.confirm(t("workflow.confirm_stop"))) return;

    state.workflowAction = true;
    dom.workflowActionButton.disabled = true;
    const original = dom.workflowActionButton.textContent;
    dom.workflowActionButton.textContent = action === "resume" ? t("workflow.resuming") : t("workflow.stopping");
    try {
      if (action === "resume") {
        const clientRequestId = createClientRequestId();
        let response = null;
        let requestError = null;
        try {
          response = await request(`/apps/${encodeURIComponent(state.currentId)}/resume`, {
            method: "POST",
            json: { client_request_id: clientRequestId },
            timeoutMs: RESUME_REQUEST_TIMEOUT_MS,
          });
        } catch (error) {
          requestError = error;
          if (!(error instanceof ApiError) || error.status !== 0) throw error;
        }
        const acknowledgedId = firstText(response?.client_request_id, clientRequestId);
        const generation = Number(response?.generation || 0);
        if (response) showToast(t("workflow.resume_accepted"), "success");
        const confirmation = await confirmResumeRequest(acknowledgedId, generation);
        if (confirmation.failed) throw new Error(t("workflow.resume_failed"));
        if (confirmation.resumed) {
          showToast(t("workflow.resumed"), "success");
        } else if (!response && confirmation.accepted) {
          showToast(t("workflow.resume_accepted"), "success");
        } else if (!response) {
          throw requestError || new Error(t("workflow.resume_failed"));
        }
      } else {
        await request(`/apps/${encodeURIComponent(state.currentId)}/stop`, {
          method: "POST",
          timeoutMs: RESUME_REQUEST_TIMEOUT_MS,
        });
        showToast(t("workflow.stop_requested"), "success");
      }
      await Promise.all([loadCurrentApp({ silent: true }), loadApps({ silent: true, loadDetail: false })]);
    } catch (error) {
      showToast(
        friendlyError(error, action === "resume" ? t("workflow.resume_failed") : t("workflow.stop_failed")),
        "error",
      );
    } finally {
      state.workflowAction = false;
      dom.workflowActionButton.disabled = false;
      dom.workflowActionButton.textContent = original;
      if (state.current) renderHeader();
    }
  }

  function openDrawer(which) {
    closeDrawers();
    document.body.classList.add("drawer-open", which === "apps" ? "apps-open" : "members-open");
    dom.drawerBackdrop.hidden = false;
    const panel = which === "apps" ? dom.appsPanel : dom.membersPanel;
    panel.setAttribute("aria-modal", "true");
    requestAnimationFrame(() => panel.querySelector("button")?.focus());
  }

  function closeDrawers() {
    document.body.classList.remove("drawer-open", "apps-open", "members-open");
    if (dom.drawerBackdrop) dom.drawerBackdrop.hidden = true;
    dom.appsPanel?.removeAttribute("aria-modal");
    dom.membersPanel?.removeAttribute("aria-modal");
  }

  function showDialog(dialog) {
    if (!dialog) return;
    if (dialog === dom.repositoryDialog) {
      showRepositoryDialogOverlay();
      return;
    }
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (dialog === dom.repositoryDialog) {
      hideRepositoryDialogOverlay();
      return;
    }
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  function setupConnectivity() {
    const update = () => {
      dom.offlineBanner.hidden = navigator.onLine;
      if (!navigator.onLine) markDisconnected(t("connection.device_offline"));
    };
    window.addEventListener("online", () => {
      update();
      if (!state.system) retrySystemNow();
      loadApps({ silent: true });
      resumeRemoteExperienceRfb();
    });
    window.addEventListener("offline", () => {
      update();
      if (state.experienceTwinOpen) pauseRemoteExperienceTransport();
    });
    update();
  }

  function markConnected() {
    dom.connectionDot.className = "connection-dot online";
    dom.connectionText.textContent = t("connection.connected");
    if (navigator.onLine) dom.offlineBanner.hidden = true;
  }

  function markDisconnected(text = t("connection.interrupted")) {
    dom.connectionDot.className = "connection-dot offline";
    dom.connectionText.textContent = text;
  }

  function setupInstallExperience() {
    const displayModeQuery = window.matchMedia("(display-mode: standalone)");
    const standalone = isStandaloneWebApp();
    updateHomeScreenTip();
    if (standalone) return;

    if (isMobileDevice()) {
      dom.installButton.dataset.action = "install";
      dom.installButton.textContent = t("install.home");
      dom.installButton.hidden = false;
    }

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.installPrompt = event;
      if (updatePhoneAccessEntry()) return;
      dom.installButton.dataset.action = "install";
      dom.installButton.textContent = t("install.device");
      dom.installButton.hidden = false;
    });

    window.addEventListener("appinstalled", () => {
      state.installPrompt = null;
      if (!updatePhoneAccessEntry()) dom.installButton.hidden = true;
      dismissHomeScreenTip();
      showToast(t("install.installed"), "success");
    });

    const handleDisplayModeChange = () => updateHomeScreenTip();
    if (typeof displayModeQuery.addEventListener === "function") {
      displayModeQuery.addEventListener("change", handleDisplayModeChange);
    } else if (typeof displayModeQuery.addListener === "function") {
      displayModeQuery.addListener(handleDisplayModeChange);
    }
  }

  function homeScreenTipWasDismissed() {
    try {
      return window.localStorage.getItem(HOME_SCREEN_TIP_DISMISSED_KEY) === "1";
    } catch (_error) {
      return false;
    }
  }

  function updateHomeScreenTip() {
    if (!dom.homeScreenTip) return;
    dom.homeScreenTip.hidden = !(
      isMobileDevice()
      && !isStandaloneWebApp()
      && !homeScreenTipWasDismissed()
    );
  }

  function dismissHomeScreenTip({ remember = true } = {}) {
    if (dom.homeScreenTip) dom.homeScreenTip.hidden = true;
    if (!remember) return;
    try {
      window.localStorage.setItem(HOME_SCREEN_TIP_DISMISSED_KEY, "1");
    } catch (_error) {
      // Storage can be unavailable in private browsing; hiding for this view is enough.
    }
  }

  async function installApp() {
    if (dom.installButton.dataset.action === "phone") {
      openPairingDialog();
      return;
    }

    if (state.installPrompt) {
      state.installPrompt.prompt();
      const choice = await state.installPrompt.userChoice;
      if (choice?.outcome === "accepted") {
        dom.installButton.hidden = true;
        dismissHomeScreenTip();
      }
      state.installPrompt = null;
      return;
    }

    if (isIosDevice()) {
      openIosInstallGuide();
      return;
    }

    showToast(t("install.browser_hint"), "success", 7_000);
  }

  async function installFromDrawer() {
    closeDrawers();
    if (isStandaloneWebApp()) {
      showToast(t("install.installed"), "success");
      return;
    }
    if (state.installPrompt) {
      state.installPrompt.prompt();
      const choice = await state.installPrompt.userChoice;
      if (choice?.outcome === "accepted") {
        dom.installButton.hidden = true;
        dismissHomeScreenTip();
      }
      state.installPrompt = null;
      return;
    }
    if (isIosDevice()) {
      openIosInstallGuide();
      return;
    }
    showToast(t("install.browser_hint"), "success", 7_000);
  }

  function openIosInstallGuide() {
    closeDrawers();
    showDialog(dom.iosInstallGuideDialog);
    window.requestAnimationFrame(() => dom.confirmIosInstallGuideButton?.focus({ preventScroll: true }));
  }

  function closeIosInstallGuide() {
    closeDialog(dom.iosInstallGuideDialog);
  }

  function openPairingDialog() {
    dom.pairingError.hidden = true;
    dom.pairingUrl.value = remoteAccessUrl();
    dom.copyPairingUrlButton.disabled = !dom.pairingUrl.value;
    showDialog(dom.pairingDialog);
    checkNetworkConnection({ silent: true });
    const stillValid = state.pairingCode && state.pairingExpiresAt > Date.now() + 1_000;
    if (stillValid) {
      renderPairingCode();
      startPairingCountdown();
      loadPairingQr();
      return;
    }
    generatePairingCode();
  }

  async function checkNetworkConnection({ silent = false } = {}) {
    if (!dom.checkNetworkButton || !state.access?.local) return;
    dom.checkNetworkButton.disabled = true;
    if (!silent) dom.networkDiagnosticText.textContent = t("network.checking");
    try {
      const result = await request("/network/diagnostics");
      renderNetworkDiagnostics(result);
    } catch (error) {
      dom.networkDiagnosticText.textContent = friendlyError(error, t("network.failed"));
      dom.repairNetworkButton.hidden = true;
    } finally {
      dom.checkNetworkButton.disabled = false;
    }
  }

  function renderNetworkDiagnostics(result) {
    const status = String(result?.status || "unavailable");
    const key = ["healthy", "repair_available", "unreachable", "unavailable"].includes(status)
      ? `network.${status}`
      : "network.failed";
    dom.networkDiagnosticText.textContent = t(key);
    dom.repairNetworkButton.hidden = result?.repair_available !== true;
    dom.restoreNetworkButton.hidden = result?.restore_available !== true;
  }

  async function changeProxyBypass(restore) {
    const confirmed = window.confirm(t(restore ? "network.restore_confirm" : "network.repair_confirm"));
    if (!confirmed) return;
    const button = restore ? dom.restoreNetworkButton : dom.repairNetworkButton;
    button.disabled = true;
    try {
      const endpoint = restore ? "/network/proxy-bypass/restore" : "/network/proxy-bypass";
      const result = await request(endpoint, { method: "POST", json: { confirmed: true } });
      renderNetworkDiagnostics(result);
      showToast(t(restore ? "network.restored" : "network.repaired"), "success", 6_000);
    } catch (error) {
      showToast(friendlyError(error, t("network.failed")), "error", 7_000);
    } finally {
      button.disabled = false;
    }
  }

  function closePairingDialog() {
    stopPairingCountdown();
    closeDialog(dom.pairingDialog);
  }

  async function generatePairingCode({ refresh = false } = {}) {
    if (state.pairingBusy) return;
    state.pairingBusy = true;
    stopPairingCountdown();
    dom.pairingError.hidden = true;
    dom.pairingCode.classList.remove("is-expired");
    dom.pairingCode.textContent = "··· ···";
    dom.pairingCode.removeAttribute("aria-label");
    dom.pairingCountdown.textContent = refresh ? t("pairing.refreshing") : t("pairing.generating");
    dom.copyPairingCodeButton.disabled = true;
    dom.refreshPairingButton.disabled = true;
    dom.pairingQr.hidden = true;
    dom.pairingQrImage.removeAttribute("src");

    try {
      const payload = await request("/access/pairing", {
        method: "POST",
        json: { refresh },
      });
      const info = payload?.pairing && typeof payload.pairing === "object" ? payload.pairing : payload || {};
      const code = firstText(info.code, info.pairing_code).replace(/\D/g, "").slice(0, 6);
      if (code.length !== 6) throw new ApiError(t("pairing.invalid_response"), 500, payload);

      state.pairingCode = code;
      state.pairingExpiresAt = pairingExpiry(info);
      dom.pairingUrl.value = firstText(
        info.public_url,
        info.https_url,
        info.url,
        payload?.public_url,
        remoteAccessUrl()
      );
      dom.copyPairingUrlButton.disabled = !dom.pairingUrl.value;
      renderPairingCode();
      startPairingCountdown();
      if (info.qr_available !== false && payload?.qr_available !== false) loadPairingQr(firstText(info.qr_url, payload?.qr_url));

      if (!dom.pairingUrl.value) {
        dom.pairingError.textContent = t("pairing.url_unavailable");
        dom.pairingError.hidden = false;
      }
    } catch (error) {
      state.pairingCode = "";
      state.pairingExpiresAt = 0;
      dom.pairingCode.textContent = "—— ——";
      dom.pairingCountdown.textContent = t("pairing.unavailable");
      dom.pairingError.textContent = friendlyError(error, t("pairing.generate_failed"));
      dom.pairingError.hidden = false;
    } finally {
      state.pairingBusy = false;
      dom.refreshPairingButton.disabled = false;
      dom.refreshPairingButton.textContent = state.pairingCode ? t("pairing.refresh_code") : t("pairing.regenerate");
    }
  }

  function pairingExpiry(info) {
    const raw = info?.expires_at;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw > 10_000_000_000 ? raw : raw * 1_000;
    if (typeof raw === "string") {
      const parsed = Date.parse(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
    const seconds = Number(info?.expires_in ?? info?.ttl_seconds ?? 300);
    return Date.now() + (Number.isFinite(seconds) && seconds > 0 ? seconds : 300) * 1_000;
  }

  function renderPairingCode() {
    const code = state.pairingCode;
    dom.pairingCode.textContent = code ? `${code.slice(0, 3)} ${code.slice(3)}` : "—— ——";
    if (code) dom.pairingCode.setAttribute("aria-label", t("pairing.code_aria", { code: code.split("").join(" ") }));
    dom.copyPairingCodeButton.disabled = !code || state.pairingExpiresAt <= Date.now();
    dom.pairingCode.classList.toggle("is-expired", Boolean(code) && state.pairingExpiresAt <= Date.now());
  }

  function startPairingCountdown() {
    stopPairingCountdown();
    updatePairingCountdown();
    state.pairingTimer = window.setInterval(updatePairingCountdown, 1_000);
  }

  function stopPairingCountdown() {
    window.clearInterval(state.pairingTimer);
    state.pairingTimer = null;
  }

  function updatePairingCountdown() {
    const remaining = Math.max(0, Math.ceil((state.pairingExpiresAt - Date.now()) / 1_000));
    if (!remaining) {
      stopPairingCountdown();
      dom.pairingCountdown.textContent = t("pairing.expired");
      dom.refreshPairingButton.textContent = t("pairing.generate_new");
      dom.copyPairingCodeButton.disabled = true;
      dom.pairingCode.classList.add("is-expired");
      dom.pairingQr.hidden = true;
      return;
    }
    const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
    const seconds = String(remaining % 60).padStart(2, "0");
    dom.pairingCountdown.textContent = t("pairing.expires_in", { time: `${minutes}:${seconds}` });
  }

  function loadPairingQr(rawUrl = "") {
    dom.pairingQr.hidden = true;
    let src = `${API_ROOT}/access/qr?ts=${Date.now()}`;
    if (rawUrl) {
      try {
        const candidate = new URL(rawUrl, window.location.href);
        if (candidate.origin === window.location.origin) src = candidate.href;
      } catch {
        // Fall back to the local QR endpoint.
      }
    }
    dom.pairingQrImage.onload = () => {
      if (dom.pairingDialog.open && state.pairingExpiresAt > Date.now()) dom.pairingQr.hidden = false;
    };
    dom.pairingQrImage.onerror = () => {
      dom.pairingQr.hidden = true;
    };
    dom.pairingQrImage.src = src;
  }

  function remoteAccessUrl() {
    const remote = state.system?.remote_access;
    const accessRemote = state.access?.remote_access;
    return firstText(
      remote?.public_url,
      remote?.https_url,
      remote?.url,
      remote,
      state.system?.public_url,
      accessRemote?.public_url,
      accessRemote?.https_url,
      accessRemote?.url,
      accessRemote,
      state.access?.pairing?.url
    );
  }

  async function copyPairingValue(value, successMessage) {
    const text = String(value || "").trim();
    if (!text) return;
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.className = "sr-only";
      document.body.append(helper);
      helper.select();
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
      helper.remove();
    }
    showToast(copied ? successMessage : t("pairing.copy_failed"), copied ? "success" : "error", 5_000);
  }

  async function revokeAllAccessSessions() {
    const confirmed = window.confirm(t("pairing.revoke_confirm"));
    if (!confirmed) return;
    const original = dom.revokeSessionsButton.textContent;
    dom.revokeSessionsButton.disabled = true;
    dom.revokeSessionsButton.textContent = t("pairing.revoking");
    try {
      await request("/access/revoke", { method: "POST", json: {} });
      state.pairingCode = "";
      state.pairingExpiresAt = 0;
      stopPairingCountdown();
      closePairingDialog();
      showToast(t("pairing.revoked"), "success", 5_000);
    } catch (error) {
      dom.pairingError.textContent = friendlyError(error, t("pairing.revoke_failed"));
      dom.pairingError.hidden = false;
    } finally {
      dom.revokeSessionsButton.disabled = false;
      dom.revokeSessionsButton.textContent = original;
    }
  }

  function isIosDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isMobileDevice() {
    return /Android|iPad|iPhone|iPod|Mobile/i.test(navigator.userAgent);
  }

  function isCompactViewport() {
    return isMobileDevice() || window.matchMedia("(max-width: 720px)").matches;
  }

  function updatePhoneAccessEntry() {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (!standalone && !isMobileDevice() && state.access?.local) {
      dom.installButton.dataset.action = "phone";
      dom.installButton.textContent = t("install.phone");
      dom.installButton.hidden = false;
      return true;
    }
    return false;
  }

  function supportsWebPush() {
    return (
      window.isSecureContext &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }

  function isStandaloneWebApp() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  async function notificationRequest(path, options = {}) {
    try {
      return await request(path, { ...options, timeoutMs: NOTIFICATION_REQUEST_TIMEOUT_MS });
    } catch (error) {
      if (firstText(error?.payload?.code) === "request_timeout") {
        throw new ApiError(t("notification.request_timeout"), 0, error.payload);
      }
      throw error;
    }
  }

  function withNotificationTimeout(promise, timeoutMs = NOTIFICATION_REQUEST_TIMEOUT_MS) {
    let timeoutId = 0;
    const timeout = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new ApiError(
          t("notification.request_timeout"),
          0,
          { code: "request_timeout" },
        ));
      }, timeoutMs);
    });
    return Promise.race([Promise.resolve(promise), timeout])
      .finally(() => window.clearTimeout(timeoutId));
  }

  function notificationCapability() {
    if (isIosDevice() && !isStandaloneWebApp()) return "ios_install_required";
    if (!supportsWebPush()) return isIosDevice() ? "ios_version_unsupported" : "unsupported";
    if (window.Notification?.permission === "denied") return "denied";
    if (!state.notificationStatus) return "checking";
    if (!state.notificationStatus.available) return "unavailable";
    if (!state.notificationStatus.can_subscribe) return "paired_required";
    return "ready";
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return Promise.resolve(null);
    if (state.serviceWorkerPromise) return state.serviceWorkerPromise;
    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Never replace an active participant page. The activated worker serves
      // subsequent requests and the shell is updated on the next navigation.
      state.serviceWorkerReloading = false;
    });
    state.serviceWorkerPromise = navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((registration) => {
        registration.update().catch(() => {});
        return registration;
      })
      .catch(() => {
        state.serviceWorkerPromise = null;
        return null;
      });
    return state.serviceWorkerPromise;
  }

  function handleServiceWorkerMessage(event) {
    const payload = event?.data && typeof event.data === "object" ? event.data : {};
    if (!["developer_message", "agent_mention"].includes(payload.type)) return;
    void syncDevelopmentSnapshot({ silent: true });
  }

  async function loadNotificationStatus({ silent = false } = {}) {
    if (!dom.notificationToggle) return;
    if (state.notificationBusy) return;
    const previous = {
      status: state.notificationStatus,
      subscription: state.notificationSubscription,
      enabled: state.notificationEnabled,
    };
    if (!silent) {
      state.notificationStatus = null;
      renderNotificationSetting();
    }
    try {
      const [payload, registration] = await Promise.all([
        notificationRequest("/notifications/status"),
        supportsWebPush() ? withNotificationTimeout(registerServiceWorker()) : Promise.resolve(null),
      ]);
      const subscription = registration?.pushManager
        ? await withNotificationTimeout(registration.pushManager.getSubscription())
        : null;
      state.notificationStatus = payload && typeof payload === "object" ? payload : {};
      state.notificationSubscription = subscription;
      // Web Push is origin-scoped. Require the current PWA's local
      // subscription and its same-origin server record so a legacy :8443
      // registration cannot make the current :443 app look enabled.
      state.notificationEnabled = Boolean(state.notificationStatus.enabled && subscription);
    } catch (error) {
      const errorMessage = friendlyError(error, t("notification.unavailable"));
      state.notificationStatus = previous.status
        ? { ...previous.status, error: errorMessage }
        : { available: false, can_subscribe: false, error: errorMessage };
      state.notificationSubscription = previous.subscription;
      state.notificationEnabled = Boolean(previous.enabled && previous.subscription);
    }
    renderNotificationSetting();
  }

  function notificationHelpText() {
    const capability = notificationCapability();
    if (capability === "ios_install_required") return t("notification.ios_install");
    if (state.notificationStatus?.error) return state.notificationStatus.error;
    if (capability === "ios_version_unsupported") return t("notification.ios_version");
    if (capability === "unsupported") return t("notification.unsupported");
    if (capability === "denied") return t("notification.denied");
    if (capability === "unavailable") return t("notification.unavailable");
    if (capability === "paired_required") return t("notification.paired_required");
    if (state.notificationStatus?.last_delivery?.outcome === "failed") {
      return t("notification.delivery_failed");
    }
    if (state.notificationStatus?.last_delivery?.outcome === "accepted") {
      return t(
        state.notificationStatus.last_delivery.provider === "apple"
          ? "notification.apple_accepted"
          : "notification.browser_accepted"
      );
    }
    return "";
  }

  function renderNotificationSetting() {
    if (!dom.notificationToggle) return;
    const enabled = Boolean(state.notificationEnabled);
    const help = notificationHelpText();
    const capability = notificationCapability();
    if (dom.notificationHelp) {
      dom.notificationHelp.textContent = help;
      dom.notificationHelp.hidden = !help;
    }

    const stateLabel = state.notificationBusy
      ? t(enabled ? "notification.disabling" : "notification.enabling")
      : !state.notificationStatus
        ? t("notification.checking")
        : t(enabled ? "notification.on" : "notification.off");
    const unavailable = Boolean(
      !enabled &&
      state.notificationStatus &&
      !["ready", "checking", "unavailable"].includes(capability)
    );
    const disabled = state.notificationBusy || !state.notificationStatus || unavailable;

    if (dom.notificationToggle) {
      dom.notificationToggle.setAttribute("aria-checked", enabled ? "true" : "false");
      dom.notificationToggle.classList.toggle("is-on", enabled);
      dom.notificationToggle.disabled = disabled;
    }
    if (dom.notificationState) dom.notificationState.textContent = stateLabel;

    if (dom.notificationPromptButton) {
      const showPrompt = Boolean(state.current && isCompactViewport());
      const promptLabel = state.notificationBusy
        ? t(enabled ? "notification.disabling" : "notification.enabling")
        : enabled
          ? t("notification.composer_disable_action")
          : capability === "ios_install_required"
            ? t("notification.install_action")
            : t("notification.composer_action");
      dom.notificationPromptButton.hidden = !showPrompt;
      dom.notificationPromptButton.disabled = state.notificationBusy || capability === "checking";
      dom.notificationPromptButton.classList.toggle("is-on", enabled);
      dom.notificationPromptButton.setAttribute("aria-pressed", enabled ? "true" : "false");
      dom.notificationPromptButton.setAttribute("aria-label", enabled
        ? t("notification.composer_disable_action")
        : capability === "ios_install_required"
          ? `${t("notification.install_action")} · ${t("notification.setup_once")}`
          : help || t("notification.composer_action"));
      if (dom.notificationPromptLabel) {
        dom.notificationPromptLabel.textContent = promptLabel;
      }
    }
    if (dom.notificationComposerHelp) {
      const showInlineHelp = Boolean(
        state.current && isCompactViewport() && !enabled && ["ios_install_required", "ios_version_unsupported", "denied"].includes(capability)
      );
      dom.notificationComposerHelp.textContent = showInlineHelp
        ? capability === "ios_install_required"
          ? t("notification.setup_once")
          : help
        : "";
      dom.notificationComposerHelp.hidden = !showInlineHelp;
    }

  }

  function urlBase64ToUint8Array(value) {
    const normalized = String(value || "").trim();
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    const base64 = (normalized + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(base64);
    return Uint8Array.from(raw, (character) => character.charCodeAt(0));
  }

  async function sendNotificationTestInBackground() {
    try {
      const tested = await notificationRequest("/notifications/test", {
        method: "POST",
        json: { locale: state.locale },
      });
      state.notificationStatus = tested && typeof tested === "object"
        ? tested
        : state.notificationStatus;
      const accepted = tested?.test_delivery?.outcome === "accepted";
      const acceptedKey = tested?.last_delivery?.provider === "apple"
        ? "notification.test_apple_accepted"
        : "notification.test_browser_accepted";
      showToast(
        t(accepted ? acceptedKey : "notification.test_failed"),
        accepted ? "success" : "error",
        7_000
      );
    } catch (error) {
      showToast(friendlyError(error, t("notification.test_failed")), "error", 7_000);
    } finally {
      renderNotificationSetting();
    }
  }

  async function toggleNotifications() {
    if (state.notificationBusy) return;
    const disabling = state.notificationEnabled;
    if (!disabling && isIosDevice() && !isStandaloneWebApp()) {
      openIosInstallGuide();
      renderNotificationSetting();
      return;
    }
    if (!disabling && !supportsWebPush()) {
      showToast(t(isIosDevice() ? "notification.ios_version" : "notification.unsupported"), "error", 7_000);
      renderNotificationSetting();
      return;
    }
    if (!disabling && window.Notification?.permission === "denied") {
      showToast(t("notification.denied"), "error", 7_000);
      renderNotificationSetting();
      return;
    }
    if (
      !disabling
      && state.notificationStatus?.available !== false
      && state.notificationStatus
      && !state.notificationStatus.can_subscribe
    ) {
      showToast(t("notification.paired_required"), "error", 7_000);
      renderNotificationSetting();
      return;
    }

    const previous = {
      status: state.notificationStatus,
      subscription: state.notificationSubscription,
      enabled: state.notificationEnabled,
    };
    state.notificationBusy = true;
    renderNotificationSetting();
    let createdSubscription = null;
    try {
      if (disabling) {
        await disableNotifications();
        return;
      }
      // iOS requires this call to begin synchronously inside the click handler.
      const permissionPromise = window.Notification.permission === "default"
        ? window.Notification.requestPermission()
        : Promise.resolve(window.Notification.permission);
      const permission = await withNotificationTimeout(
        permissionPromise,
        NOTIFICATION_PERMISSION_TIMEOUT_MS,
      );
      if (permission !== "granted") {
        state.notificationStatus = { ...(state.notificationStatus || {}), available: true };
        showToast(t("notification.permission_not_granted"), "error", 7_000);
        return;
      }
      const status = await notificationRequest("/notifications/status");
      if (!status?.available || !status?.can_subscribe || !status?.vapid_public_key) {
        state.notificationStatus = status || { available: false, can_subscribe: false };
        throw new ApiError(t("notification.unavailable"), 503, status);
      }
      const registration = await withNotificationTimeout(registerServiceWorker());
      if (!registration?.pushManager) throw new ApiError(t("notification.unsupported"), 0);
      let subscription = await withNotificationTimeout(registration.pushManager.getSubscription());
      if (!subscription) {
        subscription = await withNotificationTimeout(registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(status.vapid_public_key),
        }));
        createdSubscription = subscription;
      }
      const result = await notificationRequest("/notifications/subscribe", {
        method: "POST",
        json: { subscription: subscription.toJSON(), locale: state.locale },
      });
      state.notificationStatus = result && typeof result === "object" ? result : status;
      state.notificationSubscription = subscription;
      state.notificationEnabled = true;
      showToast(t("notification.enabled"), "success", 4_000);
      window.setTimeout(() => void sendNotificationTestInBackground(), 0);
    } catch (error) {
      if (createdSubscription) {
        await withNotificationTimeout(createdSubscription.unsubscribe()).catch(() => false);
      }
      state.notificationStatus = previous.status;
      state.notificationSubscription = previous.subscription;
      state.notificationEnabled = previous.enabled;
      showToast(
        friendlyError(error, t(disabling ? "notification.disable_failed" : "notification.enable_failed")),
        "error",
        6_000
      );
      window.setTimeout(() => loadNotificationStatus({ silent: true }), 0);
    } finally {
      state.notificationBusy = false;
      renderNotificationSetting();
    }
  }

  async function disableNotifications() {
    const registration = await withNotificationTimeout(registerServiceWorker());
    const subscription = state.notificationSubscription ||
      (registration?.pushManager
        ? await withNotificationTimeout(registration.pushManager.getSubscription())
        : null);
    await notificationRequest("/notifications/unsubscribe", {
      method: "POST",
      json: subscription ? { endpoint: subscription.endpoint } : {},
    });
    if (subscription) await withNotificationTimeout(subscription.unsubscribe());
    state.notificationSubscription = null;
    state.notificationEnabled = false;
    state.notificationStatus = { ...(state.notificationStatus || {}), enabled: false, error: "" };
    showToast(t("notification.disabled"), "success", 5_000);
  }

  function activeToastRegion() {
    const openDialogs = [...document.querySelectorAll("dialog[open]")];
    const host = openDialogs[openDialogs.length - 1]
      || (!dom.repositoryDialog?.hidden ? dom.repositoryDialog : null);
    if (!host) return dom.toastRegion;
    let region = [...host.children].find((child) => child.classList?.contains("modal-toast-region"));
    if (!region) {
      region = element("div", "modal-toast-region");
      region.setAttribute("aria-live", "polite");
      region.setAttribute("aria-atomic", "true");
      host.append(region);
    }
    return region;
  }

  function showToast(message, type = "success", duration = 4_000) {
    const toast = element(
      "div",
      `toast${type === "error" ? " error" : ""}`,
      message
    );
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    const region = activeToastRegion();
    region.append(toast);
    window.setTimeout(() => {
      toast.remove();
      if (region !== dom.toastRegion && !region.childElementCount) region.remove();
    }, duration);
  }

  function statusLabel(status) {
    const key = String(status || "").toLowerCase();
    return STATUS_LABEL_KEYS[key] ? t(STATUS_LABEL_KEYS[key]) : String(status || t("status.unknown"));
  }

  function statusTone(status) {
    const value = String(status || "").toLowerCase();
    if (value.includes("retry")) return "waiting";
    if (value.includes("error") || value.includes("safety") || value.includes("fail")) return "error";
    if (value.includes("wait")) return "waiting";
    if (value.includes("pause") || value.includes("stop")) return "paused";
    if (value.includes("deliver")) return "delivered";
    if (value.includes("run") || value.includes("start") || value.includes("review") || value.includes("develop")) return "running";
    return "created";
  }

  function isResumePending(status, pidAlive = null, updatedAt = "", resumeRequest = null) {
    const value = String(status || "").toLowerCase();
    const requestStatus = String(resumeRequest?.status || "").toLowerCase();
    const observedAt = Date.parse(firstText(resumeRequest?.updated_at, updatedAt)) || 0;
    const fresh = !observedAt || Date.now() - observedAt < RESUME_PENDING_STALE_MS;
    if (["accepted", "launching"].includes(requestStatus)) return fresh;
    if (pidAlive !== false) return false;
    return ["starting", "resume_requested"].includes(value) && fresh;
  }

  function isResumableStatus(
    status,
    phase,
    pidAlive = null,
    updatedAt = "",
    resumeRequest = null,
  ) {
    const value = `${status || ""} ${phase || ""}`.toLowerCase();
    if (isResumePending(status, pidAlive, updatedAt, resumeRequest)) return false;
    // DELIVERED is an intentional human-review boundary, not a crashed worker.
    // In strict paired studies the autonomous budget cannot be extended by a
    // browser Resume request; showing Resume here only recreates the same hold.
    if (value.includes("delivered")) return false;
    if (value.includes("stop") || value.includes("pause")) return true;
    return pidAlive === false;
  }

  function firstText(...values) {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return "";
  }

  function arrayFrom(value) {
    if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined);
    if (value === null || value === undefined || value === "") return [];
    return [value];
  }

  function valueText(value) {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join("、");
    if (typeof value === "object") {
      return firstText(value.action, value.title, value.text, value.description, value.name) ||
        Object.entries(value)
          .map(([key, item]) => `${key}：${valueText(item)}`)
          .filter((item) => !item.endsWith("："))
          .join("；");
    }
    return String(value);
  }

  function element(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== "") node.textContent = text;
    return node;
  }

  function initialFor(name) {
    const clean = String(name || "").trim();
    return clean ? Array.from(clean)[0].toUpperCase() : "·";
  }

  function safeUrl(raw) {
    if (!raw) return "";
    try {
      const url = new URL(String(raw), window.location.href);
      if (!["http:", "https:", "blob:"].includes(url.protocol)) return "";
      return url.href;
    } catch {
      return "";
    }
  }

  function fileExtension(name) {
    const clean = String(name || "").split(/[?#]/)[0];
    const match = clean.match(/\.([a-z0-9]{1,10})$/i);
    return match ? match[1] : "";
  }

  function fileNameFromUrl(raw) {
    try {
      const url = new URL(raw, window.location.href);
      return decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
    } catch {
      return "";
    }
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (!value) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const amount = value / 1024 ** index;
    return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
  }

  function parseDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dayKey(value) {
    const date = parseDate(value);
    if (!date) return "";
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  function formatDay(value) {
    const date = parseDate(value);
    if (!date) return "";
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (dayKey(date) === dayKey(today)) return t("time.today");
    if (dayKey(date) === dayKey(yesterday)) return t("time.yesterday");
    return new Intl.DateTimeFormat(state.locale, { month: "long", day: "numeric" }).format(date);
  }

  function formatMessageTime(value) {
    const date = parseDate(value);
    if (!date) return "";
    return new Intl.DateTimeFormat(state.locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  }

  function formatMessageDateTime(value) {
    const day = formatDay(value);
    const time = formatMessageTime(value);
    return [day, time].filter(Boolean).join(" ");
  }

  function formatRelativeTime(value) {
    const date = parseDate(value);
    if (!date) return t("time.just_now");
    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (Math.abs(seconds) < 60) return t("time.just_now");
    const minutes = Math.round(seconds / 60);
    if (Math.abs(minutes) < 60) return t("time.minutes_ago", { count: Math.abs(minutes) });
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return t("time.hours_ago", { count: Math.abs(hours) });
    return new Intl.DateTimeFormat(state.locale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function uniqueKey() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function readStoredAppId() {
    try {
      const direct = new URLSearchParams(window.location.search).get("app") || "";
      if (/^wf-\d{8}-\d{6}-[0-9a-f]{8}$/.test(direct)) return direct;
    } catch {
      // Fall back to the last app stored on this device.
    }
    try {
      return localStorage.getItem("workflow-current-app") || "";
    } catch {
      return "";
    }
  }

  function normalizeConversationTab(tab) {
    if (tab === "operations") return "launch";
    if (usesDirectDeveloperStudyConversation() && tab === "development") return "developer";
    return tab;
  }

  function readInitialTabFromUrl() {
    try {
      const value = new URLSearchParams(window.location.search).get("tab") || "";
      const normalized = normalizeConversationTab(value);
      return ["development", "developer", "internal_test", "trial", "launch", "growth"].includes(normalized) ? normalized : "";
    } catch {
      return "";
    }
  }

  function readStoredConversationTab(appId = state.currentId) {
    if (!appId) return "";
    try {
      const stored = JSON.parse(localStorage.getItem(CONVERSATION_TAB_STORAGE_KEY) || "{}");
      const tab = normalizeConversationTab(stored[String(appId)] || "");
      return ["development", "developer", "internal_test", "trial", "launch", "growth"].includes(tab) ? tab : "";
    } catch {
      return "";
    }
  }

  function storeConversationTab(tab, appId = state.currentId) {
    if (!appId || !tab) return;
    try {
      const stored = JSON.parse(localStorage.getItem(CONVERSATION_TAB_STORAGE_KEY) || "{}");
      if (stored[String(appId)] === tab) return;
      stored[String(appId)] = tab;
      localStorage.setItem(CONVERSATION_TAB_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Storage failures must not block tab navigation.
    }
  }

  function currentConversationTabName() {
    if (state.growthOpen) return "growth";
    if (state.launchOpen) return "launch";
    if (state.experienceTwinOpen) return "trial";
    if (state.chatView === "experience") return "internal_test";
    return state.chatView === "developer" ? "developer" : "development";
  }

  function storeCurrentConversationTab() {
    storeConversationTab(currentConversationTabName());
  }

  function clearConversationTabUrlParams() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("tab");
      url.searchParams.delete("event");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // Deep-link cleanup is optional.
    }
  }

  function applyConversationTab(tab) {
    if (!state.current || !tab) return;
    if (currentConversationTabName() === tab) return;
    if (tab === "internal_test") setChatView("experience");
    else if (tab === "developer") setChatView("developer");
    else if (tab === "trial") openExperienceTwin();
    else if (tab === "launch") openLaunch();
    else if (tab === "growth") openGrowth();
    else setChatView("main");
  }

  function restoreConversationTabIfNeeded() {
    if (!state.current || state.conversationTabRestored) return;
    const tab = state.initialTab || readStoredConversationTab(state.currentId);
    state.initialTab = "";
    state.conversationTabRestored = true;
    if (!tab) return;
    applyConversationTab(tab);
    clearConversationTabUrlParams();
  }

  function storeCurrentAppId(id) {
    try {
      if (id) localStorage.setItem("workflow-current-app", id);
      else localStorage.removeItem("workflow-current-app");
    } catch {
      // A disabled storage area should not block normal app usage.
    }
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("app")) {
        url.searchParams.delete("app");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
    } catch {
      // Deep-link cleanup is optional and must never block app selection.
    }
  }
})();
