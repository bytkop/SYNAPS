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
- Seven Effort profiles used by graph, Experiment Lab, and Chat Center. Adaptive uses local prompt-length/keyword heuristics; optional `reasoning_effort` stays disabled by default.
- LLM Lab can create a distinct Ollama model tag from the current base using `/api/create`, with validated system instructions, stop sequences and supported generation settings. This saves a genuine Ollama configuration variant and never overwrites the base weights; it is not fine-tuning/LoRA training. Live Ollama create behavior is not yet integration-tested.
- Chat Center history search, pinning, rename, delete, Markdown export, edit-from-turn, and retry prompt loading. Chat history is device-local and not encrypted.
- Reusable model-generation profiles with local persistence, JSON import/export, and loopback endpoint validation.
- Video Analysis extracts up to eight resized still frames locally and sends those frames to an image-capable local endpoint; it does not analyze audio or continuous motion.
- Optional app password gate with salted PBKDF2-SHA256 password/recovery digests and a one-time recovery code. This is a UI gate, not OS-backed storage or data encryption.
- Guide/Knowledge page covering setup, local inference, Effort, model profiles, video sampling, and known limitations.

## Experimental / not live-verified

- Rust provider calls and streaming paths are in source, but no Rust compiler, Tauri runtime, or provider service was available in this sandbox.
- LM Studio Native request/event compatibility is not verified against a current installation.
- SQLite project versions are implemented in Rust but not compiled or exercised here.
- Existing multi-template graph engine and llama-server lifecycle remain unverified on Windows.
- Browser video decode/seek behavior varies by Windows WebView codecs and still needs live desktop QA.

## Planned

- Parallel experiment scheduling, richer response diffing and multiple test cases per experiment.
- Full graph execution contracts, node-level retry/cancellation, richer validation states, and supported multi-model graph execution.
- OS credential vault and comprehensive accessibility/native UI tests.
- Model catalogue/download manager with resumable downloads and installation-path validation.
- Cloud API providers, their credential vault, and user-approved in-app Assistant actions.
- Live provider integration matrix, performance profiling, locked reproducible dependencies, signed release installer.

## Unavailable in this source update

- Document/PDF/audio ingestion, RAG retrieval, LoRA/training, GPU/memory telemetry, arbitrary skill/custom code execution, automatic model capability claims, cloud endpoints, provider API keys, and OS-backed secret storage.
- A remote model catalog, resumable/pauseable download backend, weight-level fine-tuning/LoRA trainer, low-level model file editing, and app-data encryption.
- Every node in the large legacy node catalog does not have an executor. Unsupported operations stop with an explicit error; no model output is fabricated.
- The browser preview cannot connect to local model endpoints.

## Verification gaps

Fourteen Node unit tests pass, including Effort mappings, PBKDF2 password/recovery, CSV/data node behavior, Ollama pull tag validation, and derived-model request validation. JSX parsing and esbuild browser bundling pass. Browser interaction, video decode, Vite production build, Rust tests, Tauri compilation, live provider integration, and Windows installer are not verified: the sandbox has no browser binary, network-based package installation, or Windows toolchain.
