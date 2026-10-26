# Architecture decision

## Product boundary

dsh-hailyea combines a deterministic local analysis-snapshot comparison CLI with a Skills-first developer workflow pack. Hailyea Delta consumes JSON exported by an upstream analysis tool; an optional radare2 adapter normalizes `aflj` and `ij` output into the versioned snapshot contract. It does not implement a disassembler, execute binaries, or require a remote service.

## Delta pipeline

1. Validate and normalize snapshot contracts.
2. Match functions by unique stable identity, fingerprint, and symbol; address-only matches are explicitly low confidence.
3. Compare selected function metadata and surface additions, removals, changes, and ambiguous identities.
4. Reconcile findings by rule/title and matched function context.
5. Emit deterministic JSON or Markdown with warnings and limitations.

The implementation favors uncertainty over false identity. Missing findings are marked for review, never automatically resolved.

## Runtime integration

The DSH `0.2.1-rc.2` bundle is covered by CI. The exact installed runtime's filesystem provider is tested for discovering and loading the Hailyea Engineering Skill. A live model-driven session is not part of this keyless smoke test.

## Deferred work

- Validate real exported snapshots from supported analysis tools.
- Measure matching precision on representative datasets.
- Test the exact DSH plugin/Skill provider contract.
- Consider richer behavior correlation only after the core comparison is validated.
