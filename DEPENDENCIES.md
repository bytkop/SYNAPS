# Direct dependency pins

Checked against current stable release information on 2026-11-08. Direct npm packages are exact-pinned in `package.json`; direct Rust versions are exact-pinned in `src-tauri/Cargo.toml`.

- React / React DOM 19.3.1
- Vite 8.3.6 with `@vitejs/plugin-react` 6.2.1
- Tauri JS API 2.12.3, CLI 2.12.2; Rust Tauri 2.12.3 / tauri-build 2.7.2
- Lucide React 1.70.0
- Playwright 1.65.0
- reqwest 0.13.5, using the renamed `rustls` TLS feature, `json` and `stream`
- rusqlite 0.41.1, bundled SQLite; tokio 1.54.1; serde 1.0.229; serde_json 1.0.154

Release references:

- [Vite releases](https://github.com/vitejs/vite/releases)
- [React releases](https://github.com/facebook/react/releases)
- [Tauri release notes](https://v2.tauri.app/release/)
- [LM Studio REST API docs](https://lmstudio.ai/docs/developer/rest)
- [LM Studio streaming event docs](https://lmstudio.ai/docs/developer/rest/streaming-events)
- [reqwest 0.13 feature list](https://docs.rs/crate/reqwest/latest/features)
- [rusqlite release registry](https://crates.io/crates/rusqlite)

No `package-lock.json` / `Cargo.lock` is included because the sandbox cannot run npm or cargo. Generate and commit both from a Windows build environment before release. This version selection is not a successful-build guarantee.
