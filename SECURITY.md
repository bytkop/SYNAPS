# Security notes

This foundation makes no provider or inference requests and contains no credential field. Project data is stored in the app webview's local storage unless exported. Imported projects are validated as JSON data and never executed. No model files, API keys, private paths, or user documents are included.

Before adding providers, preserve localhost-only defaults, require explicit approval for remote endpoints, redact secrets from logs, and add integration tests. Before custom scripts/tools, use a restricted sandbox with explicit permissions. This foundation is not a security-reviewed production release.
