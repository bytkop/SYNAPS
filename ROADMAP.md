# Roadmap after 0.5.0

1. Verify 0.5.0 on Windows: generate lockfiles, run unit/UI/Rust tests, compile Tauri, and smoke-test the NSIS installer.
2. Add mock-server integration tests for Ollama NDJSON, LM Studio Native/SSE, OpenAI-compatible SSE, cancellation, errors, and usage metrics; validate current LM Studio and llama.cpp behavior.
3. Expand Experiment Lab with structured datasets, better response diffing, and controlled request scheduling while preserving actual provider outputs and errors.
4. Replace the remaining legacy graph executor with a typed registry/schema and fully validated scheduler; only ship node types with tested handlers.
5. Add capability negotiation and model-specific parameter support without guessing unknown provider metadata.
6. Improve project lifecycle, schema migrations, autosave, and OS-backed secret storage.
7. Add document extraction/RAG and audio only with real local provider integrations and observable behavior.
8. Consider skill/custom-node execution only after sandboxing, explicit permissions, package validation, and security review.
9. Complete hardware/performance, accessibility, installer smoke, and signing work.
