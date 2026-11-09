# Status

**SYNAPS 0.5.0 source update, browser-tested; native build remains unverified.**

- Added bundled English/Russian/Simplified Chinese catalogs, automatic system-language detection, persistent manual override, translated node labels, and locale-aware dates. User prompts and provider output are excluded from UI translation; no translation network or dependency is used.
- Fixed the reported Windows Actions install failure path: CI and PowerShell now explicitly use registry.npmjs.org with retries and a 5-minute timeout instead of npm-mirror.gitverse.ru.

- Fixed the Vite parse blocker by rewriting the Experiment Lab runner into a clearly closed multiline function, and fixed the Lab variable editor so values are added to the active experiment. Failed provider calls now persist an empty response plus the actual error, never a synthetic output.
- Preserved the full legacy node catalog and added a regression test that verifies unsupported nodes remain visible and honestly labeled.
- Implemented full declarative Skill metadata and inspectable JSON import; imported scripts are ignored.
- Verification: 7 Node unit tests and 21 Playwright UI scenarios passed using a local esbuild browser bundle. This reproduces the UI scenarios but is not the official Vite production build.
- Still unverified: Vite production build, Cargo/Rust tests, Tauri IPC compile, real provider streaming, and Windows installer. npm/Cargo and the Windows toolchain were unavailable in this environment.
