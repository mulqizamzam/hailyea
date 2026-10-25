# Security review

- No runtime dependencies, dev dependencies, network clients, or credential variables are declared.
- The package does not intentionally collect telemetry or send workspace content to a project-owned service.
- Scripts are local validation/test helpers and use Node's standard library.
- Treat all workspace contents and tool output as potentially sensitive; avoid including secrets or private data in test fixtures, logs, or issue reports.
- Inspect package contents and installation scripts before granting a runtime elevated permissions.
- This is a source-level review, not a formal security audit or proof of runtime isolation.
