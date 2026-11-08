# Roadmap

1. Build on Windows immediately; generate and commit npm/Cargo lockfiles; fix compile/test/build failures before distributing.
2. Add mocked-server Rust integration tests for Ollama NDJSON, LM Studio Native API/SSE, OpenAI-compatible SSE, cancellation, errors and metrics; verify against current LM Studio by Bionic and llama.cpp.
3. Replace preview-edge execution with a typed registry/schema and a fully validated DAG scheduler. Complete all safe built-in node handlers and make eight templates pass integration tests.
4. Add user-visible capability negotiation, structured output, parameter support matrix and model-specific settings.
5. Complete SQLite project lifecycle (multiple projects, autosave, version retention/restore tests), secret isolation and schema migrations.
6. Add real document extraction/RAG and audio support; expand Model POV only for transformations actually observable.
7. Implement sandboxed custom node/skill execution with explicit permissions, security review and package validation. Until then keep user code inert.
8. Add Experiment Lab multi-run workflows; adapter/LoRA integrations for supported engines; keep fine-tuning a separate hardware/data workflow.
9. Complete hardware/performance testing, accessibility, Windows installer smoke tests and signing.
