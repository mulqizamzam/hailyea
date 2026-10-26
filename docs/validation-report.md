# Validation report

## Scope

Hailyea Delta is a local JSON snapshot comparison CLI targeting DSH `0.2.1-rc.2`. The DSH package installation, bundle composition, and filesystem Skill provider are checked in GitHub Actions.

## Automated checks

The CI workflow runs package validation, Node's built-in test runner, and `npm pack --dry-run`. Tests cover identity matching, moved addresses, changed fingerprints, duplicate/ambiguous identities, finding reconciliation, schema rejection, and JSON/Markdown CLI output.

The optional radare2 importer converts `aflj` and `ij` JSON into a Hailyea snapshot. Import tests use a compact function-list excerpt and metadata fixture to verify schema mapping and CLI behavior. The raw function-list shape is grounded in public `aflj` output examples; these fixtures are not two complete production snapshots.

The `radare2-cross-build-smoke` CI job adds end-to-end coverage with Radare2 6.2.4 from a checksum-pinned official package. It compiles two variants of a controlled C sample, exports both real ELF binaries through `aflj` and `ij`, imports them through the CLI, and checks expected symbol matching, changed size, unchanged symbol, and new function behavior. JSON exports, snapshots, and the Delta report are retained as a CI artifact for seven days.

The DSH runtime smoke test installs `@deepseek-ai/dsh@0.2.1-rc.2` into a temporary prefix, installs Hailyea into a disposable profile, checks the composed bundle config, then uses the filesystem provider from that runtime to discover and load the Hailyea Engineering Skill body. It does not start an agent turn or verify that a model invokes the `skill` tool.

## Outstanding validation

- Matching quality has not yet been measured against representative real exports from two builds of the target production artifact. The CI sample validates the export/import/compare path against a controlled test program, not the target binary.
- The model-facing Skill catalog and `skill` tool have not been exercised in a live session with model credentials.
- npm publication and release tagging have not been performed.

A missing finding is not proof that a vulnerability or behavior has been fixed.
