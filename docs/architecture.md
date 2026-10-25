# Architecture decision

## Product boundary

dsh-hailyea is a Skills-first workflow package for development and release engineering. Its public workflows are plan, implement, debug, test, automate, and document. It uses host-provided tools and does not include a remote service, MCP endpoint, telemetry collector, or credential store.

## Runtime integration

The inspected DSH 0.2.1-rc.2 documentation separates local skill discovery from installable profile bundles (dsh.bundle.patch) and provider plugins. A custom manifest cannot establish runtime compatibility by itself. This release includes explicit Skills and validates package shape but defers a Cordis runtime entry point until the exact plugin import contract and a real profile smoke test can be run.

## Deferred work

- Validate exact plugin schema and installation flows on DSH 0.2.1-rc.2.
- Decide whether delivery should remain a project-local Skill pack or become a Cordis bundle/plugin based on the intended surface.
- Test registry installs and runtime behavior in the actual target environment.
