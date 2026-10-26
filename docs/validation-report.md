# Validation report

## Scope

Hailyea Delta is a local JSON snapshot comparison CLI targeting DSH `0.2.1-rc.2`. The DSH package installation, bundle composition, and filesystem Skill provider are checked in GitHub Actions.

## Automated checks

The CI workflow runs package validation, Node's built-in test runner, and `npm pack --dry-run`. Tests cover identity matching, moved addresses, changed fingerprints, duplicate/ambiguous identities, finding reconciliation, schema rejection, and JSON/Markdown CLI output.

The optional radare2 importer converts `aflj` and `ij` JSON into a Hailyea snapshot. Import tests use a compact function-list excerpt and metadata fixture to verify schema mapping and CLI behavior. The raw function-list shape is grounded in public `aflj` output examples; these fixtures are not two complete production snapshots.

The DSH runtime smoke test installs `@deepseek-ai/dsh@0.2.1-rc.2` into a temporary prefix, installs Hailyea into a disposable profile, checks the composed bundle config, then uses the filesystem provider from that runtime to discover and load the Hailyea Engineering Skill body. It does not start an agent turn or verify that a model invokes the `skill` tool.

## Outstanding validation

- Matching quality has not been measured against two real exports of the same binary/artifact from different builds.
- The model-facing Skill catalog and `skill` tool have not been exercised in a live session with model credentials.
- npm publication and release tagging have not been performed.

A missing finding is not proof that behavior or a vulnerability has been fixed.
