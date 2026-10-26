# DSH compatibility notes

## Audited target

This package targets the immutable DSH release `0.2.1-rc.2` (`dsh-v0.2.1-rc.2`). DSH installs profile bundles through `dsh plugin`; a descriptive `dsh.plugin.json` alone is not a runtime entry point. The runtime-recognized manifest is `package.json` → `dsh.bundle.patch`.

Hailyea now declares that bundle entry and contributes a filesystem Skill-provider row whose `customSkillDirs` points at the installed package's `skills/` directory. It does not replace the default provider row: the separate `hailyea-skill-filesystem` row preserves default project and user Skill roots while adding Hailyea's directory.

The bundle declares `engines.dsh: 0.2.1-rc.2` and an optional matching `@deepseek-ai/dsh-base` peer. The peer is optional because the runtime supplies its base bundle; it is a compatibility signal, not a request to install a second runtime.

## Runtime smoke test

CI installs the exact DSH CLI release into an isolated prefix, adds this checkout to an isolated profile, and checks `dsh --profile hailyea-audit --dump-config` for the Hailyea bundle and Skill provider row. This verifies package installation and configuration composition without requiring model credentials.

A config dump is not an end-to-end model invocation. Skill discovery in a live session, loading a Skill body through the model-facing `skill` tool, and removal/reinstallation from registry/GitHub sources remain separate manual checks unless CI runs those flows against a configured DSH environment.

## Local manual verification

Use Node.js `22.19+` and a disposable DSH home/profile:

```sh
export DSH_HOME="$(mktemp -d)"
npx --yes @deepseek-ai/dsh@0.2.1-rc.2 plugin --profile hailyea-audit add "link:$PWD"
npx --yes @deepseek-ai/dsh@0.2.1-rc.2 --profile hailyea-audit --dump-config
npx --yes @deepseek-ai/dsh@0.2.1-rc.2 plugin --profile hailyea-audit remove dsh-hailyea
```

Confirm the dump includes `# == dsh-hailyea` and `hailyea-skill-filesystem`. Do not treat successful installation alone as proof that a Skill was selected or invoked by a model.
