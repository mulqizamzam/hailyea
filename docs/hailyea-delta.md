# Hailyea Delta MVP

Hailyea Delta compares two JSON analysis snapshots exported by an upstream reverse-engineering or static-analysis tool. It does not execute binaries, disassemble files, or claim to prove a vulnerability was fixed.

## Run

```sh
node src/cli.mjs compare examples/baseline.json examples/candidate.json
node src/cli.mjs compare examples/baseline.json examples/candidate.json --format markdown
node src/cli.mjs compare before.json after.json --format json --output delta.json
```

## Importing a real tool export

For an initial adapter, see [Importing radare2 JSON](radare2-import.md). The importer normalizes a tool's function list and binary metadata; it does not itself analyze binaries.

## Snapshot contract

Each input declares `schemaVersion: "1.0"`, a unique `snapshotId`, artifact metadata, a `functions` array, and an optional `findings` array. Function IDs need only be unique within a snapshot. Prefer an upstream stable identity or normalized fingerprint. See `schemas/analysis-snapshot-v1.schema.json` and the example snapshots.

A function can provide `stableId`, `fingerprint`, `name`, `namespace`, `address`, `size`, and `callingConvention`. Findings can provide `id`, `ruleId`, `functionId`, `title`, `severity`, and evidence strings. Optional `tool` metadata identifies the analysis tool, version, and configuration.

## Matching semantics

1. Unique stable IDs match with high confidence.
2. Unique canonical fingerprints match with high confidence.
3. Unique namespace/name pairs match with medium confidence.
4. Address-only matches are low-confidence and marked uncertain.
5. Duplicate candidate identities are surfaced as ambiguity rather than silently assigned.

The MVP deliberately favors false uncertainty over a false confident match. Fingerprints are only as reliable as the upstream tool's normalization.

## Finding reconciliation

- `still_detected`: a corresponding rule/title appears in the candidate snapshot.
- `newly_observed`: a candidate finding has no prior counterpart.
- `not_reobserved_review`: a prior finding is absent and requires analyst review.
- `ambiguous_review`: multiple candidate findings could correspond to the prior finding.

**A finding missing from the newer snapshot is not automatically marked resolved.** The tool cannot infer that the behavior is fixed unless the supplied evidence and a separate, validated rule establish that conclusion.

## Limitations

This is a deterministic comparison layer over exported data, not a disassembler or decompiler. It does not establish code equivalence, exploitability, authorship, or security impact. Analysis tool/version/configuration mismatches produce warnings. The DSH `0.2.1-rc.2` bundle and filesystem-provider smoke tests are covered by CI. A live model-driven Skill invocation remains unverified.
