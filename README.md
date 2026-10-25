# dsh-hailyea

**Evidence-based analysis tooling and independent developer workflow Skills for DeepSeek Harness (DSH).** Hailyea Delta compares exported analysis snapshots across builds, preserves uncertainty when function identity is ambiguous, and tracks whether prior findings are still observed or need review.

- **Maintainer:** `mulqizamzam`
- **Version:** `0.1.0`
- **Target runtime:** DSH `0.2.1-rc.2` (compatibility target; runtime smoke test still required)
- **Architecture:** Local CLI plus Skills; no remote service, API key, or telemetry required.

This is an independently authored project and is not affiliated with or endorsed by DeepSeek.

## Hailyea Delta MVP

Hailyea Delta compares two JSON analysis snapshots supplied by an upstream reverse-engineering or static-analysis tool. It does not disassemble or execute binaries.

```sh
node src/cli.mjs compare examples/baseline.json examples/candidate.json
node src/cli.mjs compare examples/baseline.json examples/candidate.json --format markdown
node src/cli.mjs compare before.json after.json --format json --output delta.json
```

Function matching prefers a unique stable identity, then a unique fingerprint, then a unique namespace/name pair. Address-only matches remain uncertain. Findings absent from the candidate snapshot are marked for review, never automatically marked resolved. See [the Delta specification](docs/hailyea-delta.md).

## Workflow Skills

The included Skill pack also supports planning, implementation, debugging, test design, automation, and documentation/release work. These are workflow instructions, not additional permissions. Host tools determine what filesystem, shell, network, and other actions are available.

## Compatibility

The package declares `engines.dsh: 0.2.1-rc.2` as a target, not proof of runtime compatibility. Confirm the installed DSH command syntax and Skill provider contract for the exact release. See [compatibility notes](docs/compatibility.md). Native DSH integration has not been smoke-tested.

## Install and validate

Requirements: Node.js 22+ and npm for local checks.

```sh
git clone https://github.com/mulqizamzam/hailyea.git
cd hailyea
npm install
npm run check
node src/cli.mjs compare examples/baseline.json examples/candidate.json --format markdown
npm pack --dry-run
```

For bundle-capable DSH releases, a GitHub install may use `dsh plugin --profile web add "github:mulqizamzam/hailyea#main"`; verify the exact syntax with `dsh plugin --help` first. The npm package has not been published. The GitHub repository is public, but runtime compatibility must be verified on the target DSH build.

## Security and limitations

- Treat snapshots as data; Hailyea does not execute supplied binaries.
- Function matching is heuristic; ambiguous identity is surfaced rather than silently assigned.
- A missing finding does not prove a vulnerability or behavior is fixed.
- Keep secrets and private customer data out of fixtures and issue reports.

MIT licensed. See [LICENSE](LICENSE), [NOTICE.md](NOTICE.md), [architecture](docs/architecture.md), and [validation report](docs/validation-report.md).
