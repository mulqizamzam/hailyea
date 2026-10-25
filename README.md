# dsh-hailyea

**Evidence-based analysis tooling and independent developer workflow Skills for DeepSeek Harness (DSH).** Hailyea Delta compares exported analysis snapshots across builds, preserves uncertainty when function identity is ambiguous, and tracks whether prior findings are still observed or need review.

- **Maintainer:** `mulqizamzam`
- **Version:** `0.1.0`
- **Target runtime:** DSH `0.2.1-rc.2` (compatibility target; runtime smoke test still required)
- **Architecture:** Local CLI plus DSH profile bundle exposing Skills through the filesystem provider; no remote service, API key, or telemetry required.

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

The package declares a runtime-recognized `dsh.bundle.patch` entry point and targets `engines.dsh: 0.2.1-rc.2`. CI installs that exact DSH release into an isolated profile and checks bundle composition and the filesystem Skill-provider row. This config-dump smoke test does not prove a model has discovered or invoked a Skill. See [compatibility notes](docs/compatibility.md).

## Install and validate

Requirements: Node.js 22.19.x or 24+ and npm for local checks; the DSH runtime test uses `@deepseek-ai/dsh@0.2.1-rc.2`.

```sh
git clone https://github.com/mulqizamzam/hailyea.git
cd hailyea
npm install
npm run check
node src/cli.mjs compare examples/baseline.json examples/candidate.json --format markdown
npm pack --dry-run
```

Install into a disposable DSH profile with `dsh plugin --profile web add "github:mulqizamzam/hailyea#main"` (confirm syntax with `dsh plugin --help` if your launcher differs). The npm package has not been published. Runtime bundle composition is covered by CI; live model-driven Skill invocation remains a separate verification.

## Security and limitations

- Treat snapshots as data; Hailyea does not execute supplied binaries.
- Function matching is heuristic; ambiguous identity is surfaced rather than silently assigned.
- A missing finding does not prove a vulnerability or behavior is fixed.
- Keep secrets and private customer data out of fixtures and issue reports.

MIT licensed. See [LICENSE](LICENSE), [NOTICE.md](NOTICE.md), [architecture](docs/architecture.md), and [validation report](docs/validation-report.md).
