# Next session

## Implemented in source 0.4.0
- Graph UI and topological scheduling for a supported deterministic subset; all eight template graphs exist, with incomplete paths labeled.
- Stream endpoint and cancellation flag for Ollama, OpenAI-compatible and LM Studio Native initial path.
- Provider list models endpoints for Ollama, LM Studio Native, OpenAI-compatible and llama.cpp server.
- Explicit managed llama-server process start/health/stop/status/log commands with loopback-only binding and no shell.
- SQLite project version save/list/restore.
- Theme controls, context/prompt settings, image POV upload, local experiment log, skill and custom node manifests (inert).

## Verified
- 10 UI tests pass in the artifact runner.
- Rust compiler is unavailable in this environment, so no Rust compile/unit tests or Windows build were run.

## Critical next actions
1. On Windows, install prerequisites and run `BUILD-WINDOWS.ps1`.
2. Fix actual compile issues, run `cargo fmt`, `cargo test --manifest-path src-tauri/Cargo.toml`, `npm test`, and build the NSIS installer.
3. Commit generated `Cargo.lock` and `package-lock.json`, then test provider commands with mocked Ollama/LM Studio/llama.cpp responses and cancellation.
4. Validate Native API request/event formats against the current Bionic LM Studio version and supported llama-server health behavior.
5. Keep incomplete nodes/templates visibly marked. Do not claim full spec compliance or distribute an untested `.exe`.
