# Next session

## SYNAPS 0.5.0 source status
- Local streaming Chat Center with per-device history, editable system prompt, selected model, stop action, and seven Effort profiles used by chat, graph inference, and experiments.
- First-entry LLM Lab warning and backup action; LLM Activity reports observed metrics only.
- Real local-provider multi-model Experiment Lab with prompt variables, repeated test cases, streamed results/errors, duration, provider-reported token usage, persistence, copy/export, and individual rerun.
- Prompt Workbench with local history and resolved-request preview.
- Model inventory inspector, local project recents/Save As, project export filtering, activity/diagnostics, focused graph node library, and graph validation.
- Five Node unit tests pass. Playwright and Rust suites, production build, live provider integrations, and Windows installer remain unverified because the sandbox lacks npm, Rust, Windows build tools, and network access.

## Critical next actions
1. On Windows, install prerequisites and run `BUILD-WINDOWS.ps1`.
2. Run Node unit tests, the official Vite build, Playwright browser interactions, `cargo test`, and package the NSIS installer; verify Chat Center streaming/cancellation against a mock and live loopback provider.
3. Commit generated `Cargo.lock` and `package-lock.json` after verifying dependency compatibility.
4. Test provider discovery and streaming against mock Ollama, current LM Studio Native/OpenAI-compatible mode, and llama.cpp. Add cancellation/error integration coverage.
5. Build out multi-case diffing and the full graph runtime only after the current source builds and live provider workflows pass.
