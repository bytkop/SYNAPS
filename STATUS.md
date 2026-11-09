# Status

**SYNAPS 0.5.0 source update, partially implemented and not build-verified.**

- Implemented in source: real multi-model prompt runs through the configured local provider, per-model result/error persistence, variable resolution, prompt history, model metadata inspection, local project recents/Save As, project export filtering, activity/diagnostics, and graph validation helpers.
- Experimental: provider streaming, LM Studio Native, SQLite, and managed llama-server paths; no live provider or Tauri runtime was available to verify them.
- Planned/unavailable: parallel experiments, full graph runtime, document/audio/RAG, secret vault, code sandbox, training/LoRA, signed installer.
- Tests added: Node unit tests and Playwright UI tests plus existing Rust tests. Node unit tests ran: 5 passed. `npm test`, production build, Rust tests, and Windows packaging were not run because npm/Node and Rust are absent from the sandbox.
