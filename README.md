# AppLooper

AppLooper is a **localhost** web agent that builds and iterates applications in a folder on your own machine. You choose a workspace (a new folder or an existing project). The sidebar lets you add as many apps as you want. Each app uses the AppLooper multi-agent workflow: developer, virtual user, test, and owner-intent.

This package is for self-hosted use on `127.0.0.1` only.

## 中文简介

AppLooper 是运行在本机的网页智能体：你指定一个本地工作区（从零开始或已有软件），在左侧栏添加应用，智能体在该文件夹里开发、试用和迭代。发布页可以下载当前应用的源码包。密钥只写在 `config.yaml`，不要提交到 Git。

## Prerequisites / 环境要求

- Python 3.11 or newer
- A local coding CLI used by the developer agent:
  - [Claude Code](https://docs.anthropic.com/en/docs/claude-code), or
  - Codex CLI
- An API key for at least one LLM provider (Agnes AI, Anthropic Claude, or OpenRouter)

## Setup / 安装

```bash
git clone https://github.com/ZihongHe/applooper.git
cd applooper
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate
pip install -r requirements.txt
```

Copy the example config if you do not already have `config.yaml`:

```bash
# Windows PowerShell
Copy-Item config.example.yaml config.yaml
# macOS / Linux
cp config.example.yaml config.yaml
```

The repository also ships an empty `config.yaml`. Fill in **your own** keys. Never commit a filled file.

## Fill config.yaml / 填写密钥

Edit `config.yaml`:

```yaml
host: 127.0.0.1
port: 8765
projects_dir: ./workspaces   # or an absolute local folder

llm:
  provider: ""          # agnes | claude | openrouter
  agnes_api_key: ""
  agnes_base_url: "https://api.agnes-ai.cn/v1"
  anthropic_api_key: ""
  openrouter_api_key: ""
  model: ""
```

| Provider | Fields to fill | Notes |
| --- | --- | --- |
| Agnes AI | `provider: agnes`, `agnes_api_key`, optional `model` | Uses `agnes_base_url` |
| Claude (Anthropic) | `provider: claude`, `anthropic_api_key`, optional `model` | Official Anthropic API |
| OpenRouter | `provider: openrouter`, `openrouter_api_key`, optional `model` | Routed through OpenRouter |

Leave unused key fields empty. `run.py` exports keys to environment variables (`AGNES_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, and `ANTHROPIC_BASE_URL` when needed). It never prints secret values.

`projects_dir` is the parent folder for workspaces. Use `./workspaces` or an absolute path such as `C:\Users\you\Documents\my-apps`.

You can also pass `--projects-dir` when starting, which overrides the config value.

## Start / 启动

```bash
python run.py
```

Open the printed URL, usually `http://127.0.0.1:8765/`.

Optional flags are forwarded to the web service, for example:

```bash
python run.py --projects-dir "D:\apps"
python run.py --port 8765
```

## Choose or create a workspace / 选择工作区

1. Click **新建 / New** in the left sidebar.
2. Enter audience, app type, and description.
3. Choose Claude Code or Codex (whichever is installed on this machine).
4. Set **Workspace** to an existing project folder, or browse and create a new folder.
5. Submit. AppLooper works inside that folder and does not create an extra nested project unless you ask it to.

You can add unlimited apps. Each app has its own workspace path.

## Add apps / 添加应用

The left sidebar lists every app on this machine. Use **新建** as many times as you need. There is no app cap.

## Download the package / 下载应用包

Open an app, go to the **发布 / Publish** tab, and click **下载应用包**. This calls `/api/apps/{id}/source-export` and downloads a zip of the current app source with secret values removed.

## Secrets / 密钥安全

- Put keys only in `config.yaml`.
- Do not commit a filled `config.yaml`, `.env`, or `private.local.json`.
- `.gitignore` already ignores `config.yaml`, `.env`, `workspaces/`, and `*.key`.
- Before you commit, confirm `git status` does not list a filled config.
- `config.example.yaml` is the safe template to share.

## License / 许可

Personal and non-commercial use (including public-interest, educational, and non-profit use) is unrestricted.

Commercial use requires a written license from the author. Email **zihong_he@outlook.com** to apply, and describe your intended business use.

See `LICENSE` for the full terms.
