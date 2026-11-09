# SYNAPS 0.5.0 feature status

Status reflects source inspection and tests that ran in the attached-project sandbox. It does not imply a successful Tauri build or live provider connection.

## Implemented in source

- Desktop shell, local-first React UI, provider settings, local-only Rust HTTP boundary, Ollama/OpenAI-compatible/LM Studio Native/llama.cpp request paths.
- Provider model discovery; model inspector surfaces provider fields and explicitly labels absent metadata **Not reported by provider**.
- Experiment Lab: prompt, system instructions, optional context, variables, selected models, inference settings, real streaming requests, per-model response/error, elapsed duration, usage only when reported, local persistence, export, copy, individual rerun, and synchronized response scroll.
- Prompt Workbench: editable system/user/context templates, reusable variables, resolved prompt preview, local prompt snapshots and restore.
- Local project save, Save As, recent browser-local projects, project metadata timestamp, import/export, and Tauri SQLite versions. Export strips secret-shaped setting keys.
- Activity records for model discovery, provider errors, graph/experiment runs, prompt snapshots, and project saves/loads.
- Graph validation helper rejects missing endpoints, incompatible ports, duplicate ids, and cycles. Existing graph runner supports only its explicit handler subset.
- Manifest-based skill/custom node data, without arbitrary code execution.
- Existing trace, Ollama/OpenAI-compatible streaming, cancellation source path, and managed llama-server controls.

## Experimental / not live-verified

- Rust provider calls and streaming paths are in source, but no Rust compiler, Tauri runtime, or provider service was available in this sandbox.
- LM Studio Native request/event compatibility is not verified against a current installation.
- SQLite project versions are implemented in Rust but not compiled or exercised here.
- Existing multi-template graph engine and llama-server lifecycle remain unverified on Windows.

## Planned

- Parallel experiment scheduling, richer response diffing and multiple test cases per experiment.
- Full graph execution contracts, node-level retry/cancellation, richer validation states, and supported multi-model graph execution.
- OS credential vault, import-time skill review UI, and comprehensive accessibility/native UI tests.
- Live provider integration matrix, performance profiling, locked reproducible dependencies, signed release installer.

## Unavailable in 0.5.0

- Document/PDF/audio ingestion, RAG retrieval, LoRA/training, GPU/memory telemetry, arbitrary skill/custom code execution, automatic model capability claims, and cloud endpoints.
- Every node in the large legacy node catalog does not have an executor. Unsupported operations stop with an explicit error; no model output is fabricated.
- The browser preview cannot connect to local model endpoints.

## Verification gaps

Node unit tests cover provider validation, prompt variables, experiment creation, graph validation, and project JSON secret filtering. Playwright tests are included for UI and mocked Tauri IPC workflows. Rust tests cover endpoint validation and stream parsing. None of the browser/Rust suites or production builds could be executed in this sandbox because Node/npm and Rust tooling are absent. No live endpoint integration test or Windows installer was run.
