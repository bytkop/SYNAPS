# Next session

## SYNAPS 0.5.0 source status
- Local streaming Chat Center with per-device history, searchable/pinnable/renamable/exportable conversations, editable system prompt and stop action; model profiles; PBKDF2 UI lock/recovery; local still-frame video analysis; seven Effort profiles; safe JSON/CSV graph nodes; Ollama pull and derived-model configuration creation. Derived model variants preserve base weights; weight training/LoRA remains unimplemented.
- First-entry LLM Lab warning and backup action; LLM Activity reports observed metrics only.
- Real local-provider multi-model Experiment Lab with prompt variables, repeated test cases, streamed results/errors, duration, provider-reported token usage, persistence, copy/export, and individual rerun.
- Prompt Workbench with local history and resolved-request preview.
- Model inventory inspector, local project recents/Save As, project export filtering, activity/diagnostics, focused graph node library, and graph validation.
- Fourteen Node unit tests pass, JSX parsing and esbuild browser bundle pass. Playwright interaction, official Vite build, Rust/Tauri, live provider integrations, video WebView behavior, and Windows installer remain unverified because no browser binary or Windows toolchain is available here.

## Critical next actions
1. Review `RELEASE-CHECKLIST.md` before making public capability claims.
2. On Windows, install prerequisites and run `BUILD-WINDOWS.ps1`.
3. Run Node unit tests, the official Vite build, Playwright browser interactions, `cargo test`, and package the NSIS installer; verify Chat Center streaming/cancellation against a mock and live loopback provider.
4. Commit generated `Cargo.lock` and `package-lock.json` after verifying dependency compatibility.
5. Test provider discovery and streaming against mock Ollama, current LM Studio Native/OpenAI-compatible mode, and llama.cpp. Add cancellation/error integration coverage.
6. Build out multi-case diffing and the full graph runtime only after the current source builds and live provider workflows pass.
