# Validation report

## Scope

Hailyea Delta MVP adds a local JSON snapshot comparison CLI to dsh-hailyea 0.1.0, targeting DSH 0.2.1-rc.2.

## Local validation

The local feature branch was tested with Node's built-in test runner and package validation before publishing this branch. The tests cover function matching, moved addresses, changed fingerprints, ambiguous matches, finding reconciliation, schema rejection, and JSON/Markdown CLI output. The package preview and installed CLI smoke test were also run locally.

## GitHub publication

This feature branch is being uploaded through the GitHub API because direct git transport is unavailable in the current environment. The remote branch must be checked for complete file parity and CI results before treating it as validated.

## Outstanding

- Real analysis exports have not yet been used to measure match quality.
- DSH 0.2.1-rc.2 runtime smoke test has not been run.
- npm publication and release tagging have not been performed.

A missing finding is not proof that behavior or a vulnerability has been fixed. A metadata declaration does not prove that DSH loads this package as a native plugin.
