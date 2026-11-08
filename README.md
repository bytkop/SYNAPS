## Contributors

- [bytkop](https://github.com/bytkop) — Creator & Lead Developer
- [USERNAME](https://github.com/StariyVovchik) — Contributor

# SYNAPS | Architecture Studio

**Understand. Construct. Control.**

This ZIP contains a Windows desktop **source project**, not a compiled `.exe`. It is an expanding foundation build, not the finished workstation in the source specification. Read `FEATURE-STATUS.md` for the section-by-section audit and be strict about the features marked partial.

## Build on Windows

Prerequisites on Windows 10/11:

- Node.js 22+ and npm
- Rust stable (Tauri 2.12 requires a recent stable toolchain; install current stable with MSVC target)
- Visual Studio 2022 C++ Build Tools, Desktop development with C++
- WebView2 Runtime
- NSIS

Extract the archive. In PowerShell, run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\BUILD-WINDOWS.ps1
```

The installer should be placed under:

```text
src-tauri\target\release\bundle\nsis\SYNAPS_0.4.0_x64-setup.exe
```

Alternative commands:

```powershell
npm install
npm test
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri -- build
```

The project pins direct UI/desktop dependencies, but has no generated `package-lock.json` or `Cargo.lock`: the sandbox has no package manager/network or Rust compiler. The first Windows build must resolve and lock transitive dependencies. If that build fails, fix it and commit both lockfiles before relying on the installer.

## Included in this foundation

- Tauri/Rust shell and graph-first React workspace.
- Typed-port graph and topological scheduling for a subset of deterministic nodes; unsupported nodes stop with an explicit error.
- Eight starter graph templates, with Vision/Research/Multi-Model/Reviewer limitations called out in the UI and `FEATURE-STATUS.md`.
- Prompt/context editing, visible request preview, model sampling/context settings.
- Ollama and OpenAI-compatible streaming, provider-reported usage where available, and cancellation in desktop mode.
- LM Studio Native API `/api/v1/models` and `/api/v1/chat` SSE initial integration; llama.cpp existing-server mode; managed llama-server launch with fixed executable name, local-only bind, GGUF check, health-check, status/stop/log tail.
- SQLite project versions in Tauri mode; browser localStorage fallback and portable JSON import/export.
- Image upload and a client-visible image payload view for Ollama/OpenAI-compatible mode.
- Theme palettes, custom accent/font options, user skill manifests and non-executable custom-node metadata manifests.
- Local experiment log, user rating/notes and JSON export.

## Important not-yet-done items

No production-grade graph runtime with handlers for every listed node; no full 8-template execution guarantee; no LM Studio native endpoint verification on the user's installed Bionic release; no live provider integration test; no PDF/document/audio flow; no custom code/skill sandbox; no native UI test; no LoRA/training workflow; no signed installer. See `FEATURE-STATUS.md` for details.

## Privacy / safety boundaries

The Rust provider client only permits loopback hosts (`localhost`, `127.0.0.1`, `::1`). Managed llama.cpp starts only an explicitly selected `llama-server[.exe]`, passes fixed arguments without a shell, binds `127.0.0.1`, accepts an existing `.gguf` path, and waits for `/health`. It does not download executables or weights. Skill/custom-node manifests are data only: no imported script is executed. Image files are locally stored in the project/browser storage when selected. No telemetry or API-key collection is implemented.

## CI and project files

- `BUILD-WINDOWS.ps1`: local Windows NSIS build helper
- `.github/workflows/windows-build.yml`: UI tests, Rust tests and Windows package upload
- `src-tauri/`: Rust provider, SQLite and managed llama-server commands
- `src/App.jsx`: workspace, templates and settings UI
- `FEATURE-STATUS.md`: complete original-prompt audit
- `STATUS.md`, `ROADMAP.md`, `NEXT_SESSION.md`: state and next work

## Verification status

Ten React UI/browser tests passed in ClickUp's artifact test runtime. Those tests do not compile Rust, invoke Tauri IPC, contact Ollama/LM Studio/llama.cpp, test SQLite, or build a Windows installer. Rust tests are included but unrun. No `.exe` is included in this archive.
