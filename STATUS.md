# Status

**SYNAPS 0.5.0 source update: chat, profiles, password gate, and frame-sampled video added; release still needs platform QA.**

- Added a local, streaming Chat Center backed by the configured loopback provider, editable chat system prompt, selectable discovered model, stop request, image attachment, and device-local conversation history.
- LLM Lab can now create a separately named Ollama model variant from a selected base using real `/api/create`, persisting its system prompt and validated sampling/context/stop settings. It preserves the base model and weights; this is not weight-level reprogramming or training.
- Added seven Effort profiles with adaptive selection and request-option mapping; reasoning_effort is opt-in because compatible endpoints do not guarantee support.
- Added an LLM Lab first-entry warning with a project-save backup action, a bounded settings/metadata panel, and an LLM Activity view limited to observed data.
- Added PBKDF2 password/recovery digests, loopback-validated model profiles, chat search/pin/rename/delete/export/edit and capped image attachments, sampled-frame video analysis, a practical Guide, safe JSON/CSV/merge/filter/split graph handlers, and loopback-only Ollama pulls with a provider-event Download Center. The lock does not encrypt local data.
- Added bundled English/Russian/Simplified Chinese catalogs, automatic system-language detection, persistent manual override, translated node labels, and locale-aware dates. User prompts and provider output are excluded from UI translation; no translation network or dependency is used.
- Fixed the reported Windows Actions install failure path: CI and PowerShell now explicitly use registry.npmjs.org with retries and a 5-minute timeout instead of npm-mirror.gitverse.ru.

- Fixed the Vite parse blocker by rewriting the Experiment Lab runner into a clearly closed multiline function, and fixed the Lab variable editor so values are added to the active experiment. Failed provider calls now persist an empty response plus the actual error, never a synthetic output.
- Preserved the full legacy node catalog and added a regression test that verifies unsupported nodes remain visible and honestly labeled.
- Implemented full declarative Skill metadata and inspectable JSON import; imported scripts are ignored.
- Verification for this revision: 14 Node unit tests pass, including password/recovery checks; esbuild JSX parsing and browser bundling pass.
- Still unverified: browser interaction and video decoding, official Vite production build, Cargo/Rust tests, Tauri IPC compile, live provider streaming/cancellation/Ollama pulls, and the Windows installer. The sandbox has no browser binary, package installation access, or Windows toolchain.
- Publication blockers: remote model catalog and pause/resume downloads, OS credential vault/cloud API providers, document/audio pipelines, weight-level tuning/LoRA, GPU telemetry, data-at-rest encryption, Rust/Tauri build, and Windows QA. Ollama create/stream integration is source-only until tested on a live local server.
