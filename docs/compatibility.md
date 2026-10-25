# DSH compatibility notes

## Target

The package targets DeepSeek Harness `0.2.1-rc.2`. This is a target declaration, not proof of compatibility.

## Runtime contract

The DSH release documentation distinguishes installable profile bundles from Skills exposed by a provider registry. A package metadata field such as `dsh.plugin.json` or `dsh.plugin.skills` does not, by itself, prove that the runtime loads the package. A bundle-capable install flow may use `dsh plugin --profile web add <source>`, but validate exact syntax with `dsh plugin --help` on the installed build.

## Required verification

- Install DSH `0.2.1-rc.2` in a disposable environment.
- Confirm the Skill appears in the runtime's Skill catalog.
- Invoke one workflow and verify the expected model-visible behavior.
- Test removal and reinstallation from local, GitHub, and registry sources.

No runtime smoke test is claimed by this repository snapshot.
