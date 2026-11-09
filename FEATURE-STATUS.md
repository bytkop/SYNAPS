# SYNAPS 0.5.0 feature status

Status reflects source inspection and tests that ran in the attached-project sandbox. It does not imply a successful Tauri build or live provider connection.

## Implemented in source

- Interface localization in English, Russian, and Simplified Chinese. Auto-detects the system/browser locale, supports a persistent manual override, updates document language and date formatting, and keeps user-authored prompt/model content intact. Translation resources are bundled locally; no online translation service is used.

- Desktop shell, local-first React UI, provider settings, local-only Rust HTTP boundary, Ollama/OpenAI-compatible/LM Studio Native/llama.cpp request paths.
- Provider model discovery; model inspector surfaces provider fields and explicitly labels absent metadata **Not reported by provider**.
- Experiment Lab: prompt, system instructions, optional context, variables, selected models, inference settings, real streaming requests, per-model response/error, elapsed duration, usage only when reported, local persistence, export, copy, individual rerun, and synchronized response scroll.
- Prompt Workbench: editable system/user/context templates, reusable variables, resolved prompt preview, local prompt snapshots and restore.
- Local project save, Save As, recent browser-local projects, project metadata timestamp, import/export, and Tauri SQLite versions. Export strips secret-shaped setting keys.
- Activity records for model discovery, provider errors, graph/experiment runs, prompt snapshots, and project saves/loads.
- Graph validation helper rejects missing endpoints, incompatible ports, duplicate ids, and cycles. Existing graph runner supports only its explicit handler subset.
- Manifest-based Skills with author, inputs, outputs, required capabilities, prompt instructions, and workflow templates. Imported manifests are inspectable declarative data; arbitrary code does not execute. Custom nodes remain inert manifests.
- Existing trace, Ollama/OpenAI-compatible streaming, cancellation source path, and managed llama-server controls.

## Experimental / not live-verified

- Rust provider calls and streaming paths are in source, but no Rust compiler, Tauri runtime, or provider service was available in this sandbox.
- LM Studio Native request/event compatibility is not verified against a current installation.
- SQLite project versions are implemented in Rust but not compiled or exercised here.
- Existing multi-template graph engine and llama-server lifecycle remain unverified on Windows.

## Planned

- Parallel experiment scheduling, richer response diffing and multiple test cases per experiment.
- Full graph execution contracts, node-level retry/cancellation, richer validation states, and supported multi-model graph execution.
- OS credential vault and comprehensive accessibility/native UI tests.
- Live provider integration matrix, performance profiling, locked reproducible dependencies, signed release installer.

## Unavailable in 0.5.0

- Document/PDF/audio ingestion, RAG retrieval, LoRA/training, GPU/memory telemetry, arbitrary skill/custom code execution, automatic model capability claims, and cloud endpoints.
- Every node in the large legacy node catalog does not have an executor. Unsupported operations stop with an explicit error; no model output is fabricated.
- The browser preview cannot connect to local model endpoints.

## Verification gaps

Seven Node unit tests passed. Twenty-one Playwright UI scenarios passed against an esbuild browser bundle, including startup without a provider, mocked discovery/inference success and failure, repeated cases, Save As/secret filtering, prompt variables, Skills import without code execution, and full catalog visibility. Vite production build, Rust tests, Tauri compilation, live provider integration, and Windows installer could not run because npm, Cargo, Rust, and the Windows toolchain are unavailable here.
