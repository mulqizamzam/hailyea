# dsh-hailyea

Hailyea provides:
- **Hailyea Delta** — compares JSON analysis snapshots from two builds.
- **Workflow Skills** — help with planning, implementation, debugging, testing, and documentation.

Target runtime: DeepSeek Harness (DSH) `0.2.1-rc.2`. This is an independent project, not affiliated with or endorsed by DeepSeek.

## Install

Choose one method below. Replace `web` with your DSH profile name if needed. Restart the profile after installing a bundle.

### NPM Registry

```sh
dsh plugin --profile web add dsh-hailyea
```

**Note:** The package is not published to npm yet. This method will work after publication. Until then, use GitHub or Local Directory.

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

Output Markdown instead of JSON:

```sh
node src/cli.mjs compare examples/baseline.json examples/candidate.json --format markdown
```

Delta compares exported snapshots; it does not disassemble or execute binaries. Findings missing from the newer snapshot are marked for review, not automatically resolved.

## Development

Requires Node.js 22.19.x or 24+.

```sh
npm run check
npm pack --dry-run
```

CI's runtime smoke test checks installation and DSH bundle configuration, not a live model invocation.

## License

MIT
