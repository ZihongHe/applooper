#!/usr/bin/env python3
"""Start the local AppLooper web agent from config.yaml."""

from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError as exc:
    raise SystemExit(
        "PyYAML is required. Install dependencies with: pip install -r requirements.txt"
    ) from exc

import workflow_web


ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "config.yaml"

PROVIDER_ENV = {
    "agnes": ("AGNES_API_KEY", "agnes_api_key", "AGNES_BASE_URL", "agnes_base_url"),
    "claude": ("ANTHROPIC_API_KEY", "anthropic_api_key", "", ""),
    "openrouter": ("OPENROUTER_API_KEY", "openrouter_api_key", "ANTHROPIC_BASE_URL", ""),
}


def load_config(path: Path) -> dict:
    """Read the local YAML config. Missing files fail with a setup hint."""

    if not path.is_file():
        example = ROOT / "config.example.yaml"
        raise SystemExit(
            f"Missing {path.name}. Copy {example.name} to {path.name} and fill in your keys."
        )
    with path.open(encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    if not isinstance(data, dict):
        raise SystemExit(f"{path.name} must contain a YAML object.")
    return data


def apply_llm_env(llm: dict) -> None:
    """Export provider keys to the process environment without printing them."""

    if not isinstance(llm, dict):
        return
    provider = str(llm.get("provider") or "").strip().casefold()
    mapping = {
        "AGNES_API_KEY": str(llm.get("agnes_api_key") or "").strip(),
        "ANTHROPIC_API_KEY": str(llm.get("anthropic_api_key") or "").strip(),
        "OPENROUTER_API_KEY": str(llm.get("openrouter_api_key") or "").strip(),
    }
    for name, value in mapping.items():
        if value and name not in os.environ:
            os.environ[name] = value

    agnes_base = str(llm.get("agnes_base_url") or "").strip()
    if provider == "agnes" and agnes_base and "ANTHROPIC_BASE_URL" not in os.environ:
        os.environ["ANTHROPIC_BASE_URL"] = agnes_base
        if "AGNES_BASE_URL" not in os.environ:
            os.environ["AGNES_BASE_URL"] = agnes_base
    if provider == "openrouter" and "ANTHROPIC_BASE_URL" not in os.environ:
        os.environ["ANTHROPIC_BASE_URL"] = "https://openrouter.ai/api/v1"

    model = str(llm.get("model") or "").strip()
    if model and "WF_MODEL" not in os.environ:
        os.environ["WF_MODEL"] = model


def resolve_projects_dir(raw: str) -> Path:
    """Resolve the workspace parent directory from config or CLI."""

    value = Path(str(raw or "./workspaces")).expanduser()
    if not value.is_absolute():
        value = (ROOT / value).resolve()
    else:
        value = value.resolve()
    value.mkdir(parents=True, exist_ok=True)
    return value


def build_argv(config: dict, extra: list[str]) -> list[str]:
    """Build workflow_web.main arguments from config, then append user flags."""

    host = str(config.get("host") or "127.0.0.1").strip() or "127.0.0.1"
    port = str(config.get("port") or 8765)
    projects_dir = resolve_projects_dir(str(config.get("projects_dir") or "./workspaces"))
    argv = [
        "--host",
        host,
        "--port",
        str(port),
        "--projects-dir",
        str(projects_dir),
        "--web-dir",
        str(ROOT / "web"),
        "--agent-script",
        str(ROOT / "workflow_agent.py"),
    ]
    argv.extend(extra)
    return argv


def main(argv: list[str] | None = None) -> int:
    """Load config.yaml, export keys, and start the localhost web agent."""

    args = list(sys.argv[1:] if argv is None else argv)
    config = load_config(CONFIG_PATH)
    apply_llm_env(config.get("llm") or {})
    return workflow_web.main(build_argv(config, args))


if __name__ == "__main__":
    raise SystemExit(main())
