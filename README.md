# dsh-hailyea

**Independent developer workflow Skills for DeepSeek Harness (DSH).** Plan changes, implement them in a real workspace, debug failures, design meaningful tests, automate repeatable work, and write documentation grounded in evidence.

- **Maintainer:** `mulqizamzam`
- **Version:** `0.1.0`
- **Target runtime:** DeepSeek Harness `0.2.1-rc.2` (compatibility target; runtime smoke test still required)
- **Architecture:** Skills-first; no remote service, API key, telemetry, or external runtime is required by this package.

This project is independently authored. Its feature scope is informed by general software-engineering use cases; it does not include source code, branding, or documentation copied from other projects. It is not affiliated with or endorsed by DeepSeek.

## What it helps with

| Workflow | Result |
|---|---|
| Plan and scope a change | Acceptance criteria, risks, implementation sequence, and a stop condition |
| Implement code | Small, coherent edits consistent with the existing project conventions |
| Debug a failure | Reproduction, competing hypotheses, discriminating checks, and a verified fix or clear blocker |
| Test and review | Risk-based test plan, executed-check evidence, regressions, and release blockers |
| Automate a task | Bounded script/workflow with safe defaults, clear inputs/outputs, and failure handling |
| Document and release | Accurate onboarding, config references, troubleshooting, and reproducible release steps |

These are workflow instructions, not extra permissions. DSH/host tools determine what filesystem, shell, network, and other actions are available. The Skills must not claim that a command ran unless tool output proves it.

## Compatibility notes

The package declares `engines.dsh: 0.2.1-rc.2`. That expresses the intended target, not proof of full runtime compatibility. DSH is evolving quickly; confirm installed CLI syntax against the exact release. The release of DSH currently documented in the package notes uses `dsh plugin --profile web add <source>` for bundle-style plugins and exposes local skills through a provider registry; installation form depends on whether you want a plugin bundle or project-local Skills. See [docs/compatibility.md](docs/compatibility.md).

## Prerequisites

- DeepSeek Harness `0.2.1-rc.2` for target-runtime testing.
- Node.js 22 or newer for package checks and tests.
- `npm` for the optional NPM distribution path.
- `git` for GitHub installation and local updates.

No environment variables or secrets are required by the Skills themselves. Configure credentials only in the relevant DSH model/integration settings, never in this repository.

## Install

Choose a source that suits your workflow. Verify the supported CLI syntax by running `dsh plugin --help` on your installed version before executing the command; DSH command forms have changed between releases.

### NPM Registry

After the package is published to npm, install the package in the target profile using the syntax supported by your DSH build. Current bundle-style DSH installs commonly use:

```sh
dsh plugin --profile web add dsh-hailyea
```

If your version requires an explicit scope, use the exact published package name. **The npm package has not been published as part of this source preparation.**

### GitHub Repository

For a bundle-capable build, install from the public repository:

```sh
dsh plugin --profile web add "github:mulqizamzam/hailyea#main"
```

Pin a release tag or full commit SHA for reproducible installs. Inspect the repository and any install/build scripts before granting build permissions. This repository contains the source project; native runtime installation still needs verification on the exact DSH build.

### Local Directory

Clone or extract the project, then use the local source syntax supported by your release:

```sh
git clone https://github.com/mulqizamzam/hailyea.git
cd hailyea
npm install
dsh plugin --profile web add link:.
```

If your installed version accepts a relative path instead, follow `dsh plugin --help`; do not assume the `link:` form is universal. Local project Skills can also be exposed from `.dsh/skills` or `.agents/skills` where the installed DSH runtime supports those roots; see [compatibility notes](docs/compatibility.md).

### Remove

Use the installed release's plugin manager/removal syntax rather than manually deleting profile files. Run `dsh plugin --help`, identify the exact profile and package, remove the entry using the documented command, and verify with `dsh web --dump-config` or the relevant plugin UI. For project-local use, remove only this project's Skill directory/config entry; do not delete user-wide skill folders.

### Update

- **npm:** run the supported plugin add/update flow for the pinned package version, then confirm the resolved installed version.
- **GitHub:** update the pinned tag/ref or use the runtime's update action; restart the `web` profile when required by the bundle installation path.
- **Local:** pull changes or replace the extracted directory, run the checks below, and refresh/restart only as the runtime requires.

Do not update a production profile to an unreviewed branch automatically.

## Configuration

No configuration file or environment variable is required for the Skills. The runtime selector in `package.json` documents the DSH target version. Adapt the profile name (`web` in examples) to the profile you actually use. Any external integration should be configured in DSH's own settings, with least privilege and credentials kept outside the repository.

## Usage examples

Ask the harness to:

- “Plan a minimal change to add retry handling to this HTTP client. Define acceptance criteria and identify risky edge cases before editing.”
- “Reproduce this failing test, rank likely causes, and change only what the evidence supports.”
- “Build a test matrix for these parser requirements and run the checks available in this workspace. Separate executed tests from proposed tests.”
- “Create a safe, repeatable release checklist for this Node package and flag steps that cannot be verified here.”
- “Review this README against the implementation and correct unsupported usage claims.”

## Validate locally

From the project root:

```sh
npm install
npm run check
npm pack --dry-run
```

`npm run check` validates the package metadata and Skill structure, then runs the Node test suite. `npm pack --dry-run` previews the npm file allowlist but is not an actual registry publication. The DSH runtime smoke test requires an installed `dsh` binary and a real DSH profile; it must be run separately.

## Troubleshooting

**The plugin is not discovered.** Confirm `dsh plugin --help` and your release's plugin format, validate the source name/ref, and inspect `dsh web --dump-config` or the plugin UI. A package metadata declaration alone does not guarantee that every release imports Skills from `./skills`.

**GitHub installation asks for build approval.** Inspect the package scripts and dependency tree first. Only approve build scripts you trust. Prefer a reviewed tag/commit rather than `main` for durable setups.

**A Skill is not invoked.** Confirm the DSH skill provider is available, the directory contains a readable `SKILL.md`, and the name is kebab-case. Restart or refresh only if the current runtime requires it.

**A test or install fails.** Capture the exact command, runtime version, exit status, and relevant non-secret output. Reproduce before editing; don't suppress a failing test merely to get a green build.

## Security and privacy

No telemetry is intentionally implemented. The plugin does not need credentials or transmit repository content to a project-owned server. Workspace content is handled by the DSH host and whichever tools the user explicitly invokes. Inspect code and package contents before install; keep secrets, tokens, production data, and private customer information out of issue reports and fixtures.

## License and notices

MIT. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).

## Release state

The source is published to GitHub for review. NPM publication, remote release tagging, and DSH runtime smoke tests have not been completed or claimed.
