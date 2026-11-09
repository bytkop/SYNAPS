# SYNAPS 0.5.0 | Engineering Workbench for Local AI

SYNAPS is a desktop engineering workspace for experimenting with local language models, prompts, workflows, and model behavior. It is a source project, not a compiled Windows installer.

## What works in this source

- Tauri 2 + React/Vite desktop shell and graph editor, with a deliberately limited set of real local processing handlers.
- Local provider discovery and streaming requests for Ollama, LM Studio Native API, OpenAI-compatible local endpoints, and llama.cpp server mode. Provider requests are restricted to loopback by the Rust backend.
- Model inventory inspector displays raw provider metadata and uses **Not reported by provider** for unknown fields.
- Experiment Lab sends the same resolved system/user prompt to selected discovered models, records each actual response or provider error, duration, and reported token usage, and saves results locally. No benchmark scores are invented.
- Prompt Workbench supports reusable `{{variables}}`, resolved-request preview, and local prompt snapshots.
- Project JSON export strips secret-shaped setting keys. Recent projects and experiment/prompt records are saved locally; Tauri SQLite versions remain available.
- Activity and diagnostics record observed discovery, run, and project events. Skill manifests include author, inputs, outputs, required capabilities, prompt instructions, and workflow templates; imported manifests can be inspected, and code is never auto-executed.

## Interface languages

- Auto mode follows the system/browser language and selects Simplified Chinese for `zh-*`, Russian for `ru-*`, and English for `en-*`; unsupported languages fall back to English.
- The language selector is always available in the top bar. A manual choice is saved on this device and overrides automatic detection.
- English, Russian, and Simplified Chinese are bundled locally. This is UI localization, not an online machine-translation service: no text is sent out for translation, and user prompts, model responses, provider errors, project names, and imported content are not translated.
- Dates and times use the selected interface locale.

## Known boundaries

This release is still partial. The graph is not a general-purpose workflow engine; unsupported nodes stop with an explicit error. Graph execution is single-run and sequential. Experiment requests run sequentially, not in parallel. The application does not have a secret vault, document/audio pipelines, training/LoRA, sandboxed skill execution, or a verified Windows installer. LM Studio Native API compatibility and real provider streaming have not been tested against a live installation in this environment. Model metadata is limited to fields the provider actually returns.

The browser preview cannot call local providers. Use the Tauri desktop app to discover or run models. Provider errors are stored with experiment results rather than replaced by mock output.

## Build on Windows

Prerequisites: Node.js 22+ and npm, Rust stable with the MSVC target, Visual Studio 2022 C++ Build Tools, WebView2 Runtime, and NSIS.

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\BUILD-WINDOWS.ps1
```

Alternative verification/build commands:

```powershell
npm install
npm run test:unit
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri -- build
```

The supplied sandbox had Node and a browser but no npm command, Vite install, Rust compiler, Windows toolchain, or network access. Source JSX was bundled with local esbuild and all 21 Playwright UI scenarios plus 7 unit tests passed; the official Vite production build, Cargo tests, Tauri IPC compile, live providers, and Windows installer were not run. Lockfiles and installer output are not included.

## Privacy and safety

Provider endpoints are restricted to localhost/loopback in the Rust backend. Project export filters setting keys that look like API keys, secrets, tokens, passwords, or authorization data. No credentials are collected by this source. The filter is defense-in-depth, not a secrets vault. Skills and custom-node manifests are data only; no imported code runs. No telemetry is implemented.
