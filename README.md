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
