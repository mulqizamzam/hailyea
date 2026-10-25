# Release checklist

## Before versioning

- [ ] Confirm scope and exact target runtime.
- [ ] Read contribution instructions and inspect version-control status.
- [ ] Confirm tests, linting, type checks, build, and static analysis results.
- [ ] Review the final diff and remove generated/local-only artifacts.
- [ ] Scan staged files for secrets, credentials, private data, and debug output.
- [ ] Confirm dependency license and attribution obligations.
- [ ] Verify package allowlist, metadata, lockfile, engine constraints, and license.
- [ ] Update changelog and docs from actual behavior.
- [ ] Produce and inspect a clean package.

## Publishing

- [ ] Confirm the tag/version does not already exist.
- [ ] Confirm publication target, credentials, access, and package identity.
- [ ] Require explicit authorization for external actions not already approved.
- [ ] Publish the exact reviewed artifact; retain its hash and source commit.
- [ ] Verify the release page and install in a clean environment.
- [ ] Record release URL, version, hash, CI results, and skipped checks.

A completed checklist without supporting evidence is still unverified.
