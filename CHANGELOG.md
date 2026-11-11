# Changelog

## 0.5.0 - Engineering Workbench update

- Added a persistent local Chat Center with streaming requests through the configured local provider, selectable discovered model, editable system prompt, stop action, and per-device conversation history.
- Added seven explicit Effort profiles, Adaptive prompt-complexity selection, provider-shaped token-budget mapping, and an opt-in `reasoning_effort` parameter for OpenAI-compatible endpoints. Capability detection is not available, so the extra parameter stays off by default.
- Added a first-entry LLM Lab warning with local project-save backup, a bounded configuration/metadata panel, and an LLM Activity view that reports observed events without presenting hidden reasoning as telemetry.
- Replaced the placeholder app monogram with original SYNAPS node-link SVG branding across the rail, wordmark, favicon and Windows ICO/PNG. Added restrained interaction/entry/stream-state animations with reduced-motion support.
- Added persistent graph zoom with wheel/buttons/reset, shift multi-select and group drag, copy/paste, grouped-node labels and batch deletion; added live interface scale/density/contrast/motion controls.
- Added unit coverage for provider-specific Effort options and adaptive profile selection. The supplied Anthropic logo image was treated as a reference only; no existing mark is copied.
- Added the password gate with salted PBKDF2 digests and recovery code, local model profiles with loopback validation, searchable/exportable chat controls, sampled-frame video analysis, and an operator-focused Guide page.
- Remaining release blockers: browser/WebView QA, Vite/Rust/Tauri compilation, live provider tests, Windows packaging, cloud API credential vault, and real model-download backend.

- Fixed Windows dependency-install workflow to use the public npm registry with retries and extended timeout.
- Added local English, Russian, and Simplified Chinese interface localization with system-language detection, a persistent manual override, and locale-aware date formatting. No online translation service is used; authored prompts and model responses are left unchanged.

- Added a real Experiment Lab that streams the same resolved prompt to selected discovered models and persists actual responses, provider errors, duration, and provider-reported usage.
- Added prompt variables, resolved-request preview, local prompt snapshots, model metadata inspection, local activity and provider diagnostics.
- Added recent local projects, Save As, project metadata, prompt/experiment inclusion, and secret-shaped setting filtering on project export.
- Added reusable validation helpers and tests for provider URLs, prompt variables, experiment creation, graph validation, and project save/reload shape.
- Added importable, inspectable declarative Skill manifests with author, inputs, outputs, required capabilities, prompt instructions, and workflow templates.
- Fixed experiment-local prompt variable editing and suppressed empty result wrappers on provider failure.
- Preserved the full legacy node catalog and improved active execution/context inspector state.
- Fixed the Experiment Lab parse blocker by restructuring the runner and updating regression tests.
- Updated feature documentation to separate implemented, experimental, planned, and unavailable work.
- Added a real Ollama derived-model flow: create a new local model tag from a base with system instructions and validated sampling/context/stop options; the original tag is never overwritten. This persists runtime configuration, not trained/modified weights.
- This revision: 14 Node unit tests passed; JSX parsing and esbuild browser bundling passed. Playwright UI tests could not launch because no browser binary is installed. Official Vite build, Rust/Tauri tests, live provider integration, video WebView behavior, and Windows installer remain unverified.

## 0.4.0 - Foundation expansion

- Added the Tauri provider/backend foundation, graph editor, local persistence, streaming path, and initial local experiment log.

## 0.2.0 - Foundation expansion

- Added configurable context and explicit system instructions.
- Added local inference settings and localhost provider discovery/requests for Ollama and OpenAI-compatible APIs.
- Added custom theme palette/font choices and local skill manifest creation/export.
- Added strict loopback-only backend URL validation.

## 0.1.0 - Initial foundation

- Graph-first UI and Tauri desktop scaffold.
- Local project JSON import/export and execution trace.
