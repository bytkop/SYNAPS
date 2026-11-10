# Status

**SYNAPS 0.5.0 source update: local chat and Effort added; native build remains unverified.**

- Added a local, streaming Chat Center backed by the configured loopback provider, editable chat system prompt, selectable discovered model, stop request, and device-local conversation history.
- Added seven Effort profiles with adaptive selection and request-option mapping; reasoning_effort is opt-in because compatible endpoints do not guarantee support.
- Added an LLM Lab first-entry warning with a project-save backup action, a bounded settings/metadata panel, and an LLM Activity view limited to observed data.
- Added bundled English/Russian/Simplified Chinese catalogs, automatic system-language detection, persistent manual override, translated node labels, and locale-aware dates. User prompts and provider output are excluded from UI translation; no translation network or dependency is used.
- Fixed the reported Windows Actions install failure path: CI and PowerShell now explicitly use registry.npmjs.org with retries and a 5-minute timeout instead of npm-mirror.gitverse.ru.

- Fixed the Vite parse blocker by rewriting the Experiment Lab runner into a clearly closed multiline function, and fixed the Lab variable editor so values are added to the active experiment. Failed provider calls now persist an empty response plus the actual error, never a synthetic output.
- Preserved the full legacy node catalog and added a regression test that verifies unsupported nodes remain visible and honestly labeled.
- Implemented full declarative Skill metadata and inspectable JSON import; imported scripts are ignored.
- Verification for this revision: 9 Node unit tests pass; esbuild JSX parsing and browser bundling pass. Playwright interaction checks could not run because no browser binary is installed in the sandbox.
- Still unverified: official Vite production build, Playwright/browser interaction, Cargo/Rust tests, Tauri IPC compile, live provider streaming and cancellation, and the Windows installer. The sandbox has no browser binary, npm installation access, or Windows toolchain.
