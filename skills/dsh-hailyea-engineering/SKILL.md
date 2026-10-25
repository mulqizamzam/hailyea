---
name: dsh-hailyea-engineering
description: Use when planning, implementing, debugging, testing, automating, reviewing, or documenting software changes in a workspace, and when release claims need evidence.
---

# Engineering Workflow

Use this skill to produce small, testable software changes with clear evidence and bounded risk. It does not grant filesystem, shell, network, or deployment permissions; use only tools exposed by the current DSH session.

## Operating sequence

1. **Frame the job.** Restate the outcome and constraints. Identify affected paths, interfaces, compatibility constraints, and acceptance criteria. Ask only for missing information that blocks safe progress; otherwise state assumptions.
2. **Discover before editing.** Inspect repository instructions, package metadata, existing patterns, nearby code, tests, and version-control status. Search for the owning implementation and callers before changing an interface. Preserve unrelated changes.
3. **Plan at the right size.** Break work into reversible steps. Prefer the smallest design that meets acceptance criteria. Name expected behavior, failure cases, and tests before implementing.
4. **Implement narrowly.** Follow local conventions and public contracts. Avoid speculative dependencies, broad refactors, hidden global state, hard-coded credentials, and unrelated formatting changes.
5. **Verify.** Run relevant tests first, then broader checks if available. Use Python for deterministic parsing, transforms, hashes, and fixture validation when available and useful. Do not claim a test, command, search, or build ran unless current tool output confirms it.
6. **Review the result.** Inspect the diff, error paths, compatibility impact, generated files, and security implications. Confirm documentation matches implemented behavior.
7. **Report precisely.** Separate completed changes, checks executed, proposed checks, failures, and blockers. Include relevant paths and exact commands. State what evidence would change an uncertain conclusion.
8. **Stop safely.** Pause before destructive operations, production deployment, credential exposure, broad permission changes, or external publication unless specifically authorized and unambiguous.

## Change planning

- Define acceptance criteria as observable behavior.
- Identify callers, configuration surfaces, data formats, and backwards-compatibility obligations.
- Prefer a narrow patch over a broad rewrite unless evidence supports more.
- List relevant tests and risks; label assumptions.
- For migrations, specify rollout, rollback, and mixed-version behavior.

## Implementation standards

- Match existing language, formatting, error handling, and architectural boundaries.
- Validate inputs at trust boundaries and avoid shell interpolation of untrusted strings.
- Add tests that reproduce a bug or pin the intended contract. Cover boundaries, error cases, and regressions, not only the happy path.
- For concurrency and lifecycle behavior, define ownership, cancellation, cleanup, and commit point.
- Keep logs free of secrets, tokens, personal data, and full source dumps.

## Debugging protocol

1. Capture exact observed and expected behavior.
2. Build the smallest reproducible case from a failing test, trace, or controlled input.
3. List plausible causes and the observation that would discriminate among them.
4. Run high-information checks first: failing frame/line, input boundary, dependency/version, environment, and recent changes.
5. Change one relevant factor at a time where practical.
6. Re-run the reproducer and regression suite. If the failure cannot be reproduced, report that rather than claiming a fix.

## Test and review protocol

- Map each acceptance criterion to a test, inspection, or reason it cannot be verified.
- Prefer deterministic isolated tests and fixtures without secrets or real personal/customer data.
- When tests are unavailable, give a manual verification recipe and label it unexecuted.
- Check negative paths such as malformed input, missing configuration, empty results, permission errors, timeouts, cancellation, and partial failure.
- Do not delete, skip, loosen, or rewrite a failing test merely to get a green build.
- Distinguish unit, integration, end-to-end, static inspection, and runtime smoke tests.

## Automation and release

- Make inputs and outputs explicit; validate required arguments and fail with actionable errors.
- Use dry-run or preview modes for destructive operations where feasible.
- Require explicit approval for production deployment, destructive data changes, permission broadening, or external publication unless already authorized.
- Keep credentials in supported secret/config stores. Never commit them or include them in examples and logs.
- Make repeated execution safe when possible; document idempotency and rollback.
- Pin external dependencies and release refs when reproducibility matters.
- Inspect the final diff, package allowlist, version, changelog, license/notices, generated files, and secrets before release.
- Confirm remote state after publication; never call a local package published or an untested version compatible.

## Host capability policy

Use read/list/search/grep for discovery first. Use write/patch and mutating shell only when authorized. Use Python for deterministic verification where available. If a capability is missing, state the limitation. Host tools provide capabilities; this Skill grants no new access.

## Stop conditions

Stop when the target is ambiguous, important tests fail, secrets appear in release scope, authorization is insufficient, obligations are unclear, or compatibility cannot responsibly be claimed. Offer a narrow next step addressing the blocker.
