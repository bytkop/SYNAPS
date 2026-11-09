# Changelog

## 0.5.0 - Engineering Workbench update

- Added a real Experiment Lab that streams the same resolved prompt to selected discovered models and persists actual responses, provider errors, duration, and provider-reported usage.
- Added prompt variables, resolved-request preview, local prompt snapshots, model metadata inspection, local activity and provider diagnostics.
- Added recent local projects, Save As, project metadata, prompt/experiment inclusion, and secret-shaped setting filtering on project export.
- Added reusable validation helpers and tests for provider URLs, prompt variables, experiment creation, graph validation, and project save/reload shape.
- Updated feature documentation to separate implemented, experimental, planned, and unavailable work.
- Build, Rust tests, live provider integration, and Windows installer remain unverified in the supplied environment.

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
