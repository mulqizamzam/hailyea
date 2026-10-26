# dsh-hailyea

Hailyea provides two things:

- **Hailyea Delta:** compares JSON analysis snapshots from two builds.
- **Workflow Skills:** help with planning, coding, debugging, tests, and documentation.

Maintainer: `mulqizamzam`  
Target runtime: DeepSeek Harness (DSH) `0.2.1-rc.2`.

## Install

Replace `web` with your DSH profile name if needed.

### NPM Registry

```sh
dsh plugin --profile web add dsh-hailyea
```

The npm package has not been published yet. Use GitHub or Local Directory until it is published.

### GitHub Repository

```sh
dsh plugin --profile web add "github:mulqizamzam/hailyea#main"
```

### Local Directory

```sh
git clone https://github.com/mulqizamzam/hailyea.git
cd hailyea
dsh plugin --profile web add "link:$PWD"
```

## Use Hailyea Delta

Compare two snapshots:

```sh
node src/cli.mjs compare examples/baseline.json examples/candidate.json
```

Import two Radare2 export pairs and compare in one command:

```sh
node src/cli.mjs radare2-compare before.aflj.json before.ij.json after.aflj.json after.ij.json --before-id build-1 --after-id build-2 --format markdown --output delta.md
```

Matched functions report address movement and size deltas separately. Movement is `unknown` if either address is missing. Finding reconciliation only pairs function-scoped findings when both snapshots map to the same matched function, and preserves the more severe known severity while showing before/after severity. Format and architecture mismatches generate comparability warnings. See [accuracy and runtime hardening](docs/hailyea-delta.md#accuracy-and-runtime-hardening-comparison-v11).

Run the complete Radare2 binary-to-report pipeline (requires `r2` on `PATH`):

```sh
node src/cli.mjs radare2-binary-compare ./before.bin ./after.bin --before-id build-1 --after-id build-2 --output-dir ./delta-output
```

This exports `aflj` and `ij` from both binaries, computes SHA-256 hashes, imports snapshots, compares them, and writes raw exports, snapshots, `delta.json`, `report.md`, and `pipeline-summary.json`. Radare2 commands have a 120-second timeout and 32 MiB output cap; each input is re-hashed after export and the run fails if a file changes during analysis. These are defense-in-depth controls, not a sandbox: use an OS-level isolated environment for untrusted binaries.

Use Markdown output:

```sh
node src/cli.mjs compare examples/baseline.json examples/candidate.json --format markdown
```

Delta compares exported data; it does not disassemble or execute binaries. Findings missing from the newer snapshot are marked for review, not automatically resolved.

## Development

Requires Node.js 22.19.x or 24+.

```sh
npm run check
npm pack --dry-run
```

CI's runtime smoke test checks installation and bundle configuration. It does not prove that a model has invoked a Skill in a live session.

## License

MIT
