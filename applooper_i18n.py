"""Shared, data-first internationalization helpers for AppLooper.

APIs persist both language variants. Callers select a variant at render time
instead of translating already-rendered Chinese text.
"""

from __future__ import annotations

import re
from typing import Any, Mapping


ZH = "zh-CN"
EN = "en"
SUPPORTED_LOCALES = (ZH, EN)
_CJK_RE = re.compile(r"[\u3400-\u9fff]")


def normalize_locale(value: Any) -> str:
    text = str(value or ZH).strip().casefold()
    return EN if text.startswith("en") else ZH


def pair(zh: Any, en: Any) -> dict[str, str]:
    """Return the canonical two-field value used in persisted/UI payloads."""

    return {ZH: str(zh or "").strip(), EN: str(en or "").strip()}


def is_pair(value: Any) -> bool:
    return isinstance(value, Mapping) and ZH in value and EN in value


def resolve(value: Any, locale: Any, default: str = "") -> str:
    """Resolve a localized pair without translating or leaking Chinese into EN."""

    selected = normalize_locale(locale)
    if isinstance(value, Mapping):
        direct = value.get(selected)
        if direct is None and selected == EN:
            direct = value.get("en-US")
        if (direct is None or not str(direct).strip()) and selected == EN:
            return str(default or "").strip()
        if direct is None:
            direct = value.get(ZH)
        return str(direct or default).strip()
    legacy = str(value or default).strip()
    if selected == EN and contains_cjk(legacy):
        return str(default or "").strip()
    return legacy


def attach(target: dict[str, Any], field: str, value: Mapping[str, Any], locale: Any) -> None:
    """Attach both variants and the selected legacy scalar to an API object."""

    canonical = pair(value.get(ZH, ""), value.get(EN, ""))
    target[f"{field}_i18n"] = canonical
    target[field] = resolve(canonical, locale)


def contains_cjk(value: Any) -> bool:
    return bool(_CJK_RE.search(str(value or "")))


def english_is_clean(value: Any) -> bool:
    """Whether a selected English UI value contains no Han characters."""

    return not contains_cjk(resolve(value, EN))


CATALOG: dict[str, dict[str, str]] = {
    "workflow.default.processing": pair(
        "研发智能体正在处理当前任务。",
        "The developer agent is working on the current task.",
    ),
    "workflow.phase.plan.current": pair(
        "正在根据最新上下文更新研发计划",
        "Updating the development plan from the latest context",
    ),
    "workflow.phase.plan.next": pair(
        "计划确认完整后开始下一项研发任务",
        "Start the next development task after the plan is complete",
    ),
    "workflow.phase.develop.current": pair(
        "正在准备下一项研发任务",
        "Preparing the next development task",
    ),
    "workflow.phase.develop.next": pair(
        "完成开发与验证后进入独立验收",
        "Enter independent evaluation after implementation and verification",
    ),
    "workflow.phase.review.current": pair(
        "正在准备独立验收当前候选版本",
        "Preparing an independent evaluation of the current candidate",
    ),
    "workflow.phase.review.next": pair(
        "验收通过后开始真实体验测试",
        "Start real-UI experience testing after the evaluation passes",
    ),
    "workflow.phase.experience.current": pair(
        "正在准备由体验者实际使用当前版本",
        "Preparing the current candidate for real use by experience agents",
    ),
    "workflow.phase.experience.next": pair(
        "体验完成后进入修复或交付阶段",
        "Move to fixes or delivery after the experience pass",
    ),
    "workflow.phase.deliver.current": pair(
        "当前版本已通过体验测试，正在准备交付",
        "The current candidate passed experience testing and is being prepared for delivery",
    ),
    "workflow.phase.deliver.next": pair(
        "完成交付后继续接收你的反馈",
        "Continue receiving your feedback after delivery",
    ),
    "workflow.phase.delivered.current": pair(
        "候选版本已完成交付",
        "The candidate has been delivered",
    ),
    "workflow.phase.delivered.next": pair(
        "继续接收你的反馈，并按计划进行回访复测",
        "Continue receiving feedback and run scheduled follow-up checks",
    ),
    "workflow.phase.replay.current": pair(
        "正在回访复测已交付版本",
        "Running a follow-up check on the delivered candidate",
    ),
    "workflow.phase.replay.next": pair(
        "复测完成后继续观察或处理发现的问题",
        "Continue monitoring or address findings after the follow-up check",
    ),
    "workflow.phase.wait.current": pair(
        "研发工作正在等待你的产品范围选择",
        "The workflow is waiting for your product-scope choice",
    ),
    "workflow.phase.wait.next": pair(
        "收到选择后继续当前研发流程",
        "Continue the workflow after receiving your choice",
    ),
    "workflow.phase.stopped.current": pair(
        "研发工作流已停止",
        "The development workflow is stopped",
    ),
    "workflow.phase.stopped.next": pair(
        "恢复工作流后继续处理当前任务",
        "Resume the workflow to continue the current task",
    ),
    "workflow.safety.current": pair(
        "工作流已进入安全保护，现有上下文已保存",
        "The workflow entered safety protection; the current context has been saved",
    ),
    "workflow.safety.next": pair(
        "请检查明确的恢复原因后继续",
        "Review the specific recovery reason before continuing",
    ),
    "workflow.recovery.current": pair(
        "自动处理已暂停，候选版本与上下文均已保存",
        "Automatic processing is paused; the candidate and context are preserved",
    ),
    "workflow.recovery.next": pair(
        "使用恢复操作创建新的执行会话并继续当前阶段",
        "Use Resume to create a fresh execution session and continue this stage",
    ),
    "study.stage.initializing": pair(
        "系统正在为你初始化流程类型 A 与流程类型 B。",
        "The system is initializing Workflow Type A and Workflow Type B.",
    ),
    "study.stage.initialization_failed": pair(
        "账号已创建，但工作流初始化暂未完成；系统正在重试。",
        "The account was created, but workflow initialization is still retrying.",
    ),
    "study.stage.own_acceptance": pair(
        "两种流程类型均已可验收。请依次试用、通过或退回，并完成发布。",
        "Both workflow types are ready for acceptance. Try each, approve or return it, and publish.",
    ),
    "study.stage.own_pair_comparison": pair(
        "两个应用均已发布，请分别试用并完成 A/B 对照问卷。",
        "Both apps are published. Try each and complete the A/B comparison survey.",
    ),
    "study.stage.waiting_for_peers": pair(
        "自己的流程已完成；正在等待两位符合条件的同伴项目。",
        "Your workflows are complete; waiting for two eligible peer projects.",
    ),
    "study.stage.peer_review": pair(
        "请依次体验两个同伴项目的四个匿名应用，并完成每组比较。",
        "Try four anonymized apps across two peer projects and complete each comparison.",
    ),
    "study.stage.final_questionnaire": pair(
        "四个同伴应用均已体验并完成比较，请提交最终问卷。",
        "All four peer apps have been experienced and compared. Submit the final questionnaire.",
    ),
    "study.stage.completed": pair(
        "研究流程已完成。请导出你构建的用户应用，并按页面提示领取报酬。",
        "The study is complete. Export your apps and follow the page instructions for compensation.",
    ),
    "study.progress.no_reply": pair(
        "查看进展详情",
        "View progress details",
    ),
    "study.progress.confirmation": pair("需要您确认", "Confirmation needed"),
    "study.progress.continuing": pair(
        "研发流程正在继续",
        "The development workflow is continuing",
    ),
}


def message(key: str, **params: Any) -> dict[str, str]:
    """Return a formatted catalog pair; missing keys fail loudly in tests/dev."""

    if key not in CATALOG:
        raise KeyError(f"unknown AppLooper i18n key: {key}")
    raw = CATALOG[key]
    return pair(raw[ZH].format(**params), raw[EN].format(**params))
