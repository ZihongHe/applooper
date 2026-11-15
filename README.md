# AppLooper

AppLooper helps you build and revise applications from a local browser. Give it a target audience, an application type, and a description. The development agent implements changes, virtual users try the application, the test agent checks it, and the owner-intent agent retests changes requested by the owner. You can try each runnable version and send feedback from the browser.

This repository provides the local application builder. The [AppLooper preprint](https://arxiv.org/abs/2608.14093) describes the research system and its evaluation.

## 1. Prepare Python and a coding CLI

- Install [Git](https://git-scm.com/downloads) and Python 3.11 or newer. Use a recent browser with JavaScript enabled.
- Install [Claude Code](https://code.claude.com/docs/en/quickstart) or [Codex CLI](https://github.com/openai/codex#quickstart). Verify that `claude --version` or `codex --version` works in the terminal you will use to start AppLooper.
- Sign in to the coding CLI, or configure credentials supported by that CLI. AppLooper starts the CLI under your local user account and uses its authentication. Keep `llm.model` blank to use the CLI's default model.

## 2. Set up and start AppLooper

**Windows PowerShell**

```powershell
git clone https://github.com/ZihongHe/applooper.git
cd applooper
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (!(Test-Path config.yaml)) { Copy-Item config.example.yaml config.yaml }
.\.venv\Scripts\python.exe run.py
```

**macOS or Linux**

```bash
git clone https://github.com/ZihongHe/applooper.git
cd applooper
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
test -f config.yaml || cp config.example.yaml config.yaml
.venv/bin/python run.py
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/) or the local URL printed by the server. Leave the terminal running. Press **Ctrl+C** there to stop AppLooper.

To change the port or workspace location, edit `port` or `projects_dir` in `config.yaml`. The defaults are `8765` and `./workspaces`. Runtime state is saved to `./state` by default. AppLooper resolves relative paths from the repository folder. `run.py` also accepts `--port` and `--projects-dir`.

### Optional model configuration

`config.yaml` is required. If your CLI is already authenticated, its `llm` fields can stay empty. `run.py` can also pass credentials to the CLI from this file.

| Configuration | Settings in `llm` |
| --- | --- |
| Claude Code with an Anthropic API key | `provider: claude` and `anthropic_api_key` |
| Claude Code with Agnes AI | `provider: agnes` and `agnes_api_key`. Set `agnes_base_url` if your endpoint differs from the example. |
| Claude Code with a compatible gateway | `provider: custom`, `api_key`, and `base_url`. The gateway must support Claude Code's API requests. |
| Codex CLI | Configure the provider and authentication in Codex using its own settings. |

Review the example before editing `config.yaml`. If a credential or endpoint variable is already set in the launching shell, `run.py` leaves its value in place.

## 3. Build, try, and export an application

1. Choose **New**. Fill in **Who is it for?**, **Application type**, and **Description**. For a first run, try a task planner that lets a student add tasks and mark them complete.
2. Select your installed coding CLI. Keep the suggested **Workspace folder** to have AppLooper allocate an app folder under the configured workspace root. Enter an absolute path to work in a specific local folder. Click **Create**.
3. Open **Develop** to follow the build and send feature requests or changes. When the application is runnable, open **Trial** to use it and share feedback. Return to **Trial** after revisions to check the result.
4. When ready, choose **Publish** → **Download package** to export the application as a source ZIP. Review that ZIP before sharing it or deploying it yourself.

If the coding CLI is unavailable in **New**, verify that it is on `PATH`, then restart AppLooper from the same terminal. If a build reports an authentication error, open that CLI directly to check its login or provider configuration.

Keep the server bound to `127.0.0.1` for this setup. Use a workspace you own and are comfortable allowing the coding agent to modify. Keep credentials, private data, `state/`, and `workspaces/` out of version control. If `config.yaml` is tracked in your checkout, check `git diff -- config.yaml` before staging changes.

## License

See the [AppLooper Personal License](LICENSE) for personal, research, educational, and other non-commercial use. Commercial use requires a written license. Contact [Zihong He](mailto:zihong_he@outlook.com) with the intended use.