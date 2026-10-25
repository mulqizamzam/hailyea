# Verification matrix

Planning aid only; this is not evidence that checks have run.

| Change type | Minimum useful verification | Common missed risk |
|---|---|---|
| Bug fix | Regression reproducer plus focused tests | Symptom tested without root condition |
| Public API/config | Call-site search, compatibility test, migration note | Older callers silently break |
| Parser/validation | Valid, invalid, empty, boundary fixtures | Unicode, duplicate keys, oversized input |
| Filesystem/path | Temporary directory, traversal and symlink tests | Relative paths and platform differences |
| Async/concurrency | Cancellation, timeout, duplicate operation, cleanup | Resource remains active after caller exits |
| Integration | Mocked boundary plus real smoke test when available | Mock diverges from real auth/version |
| Automation/deploy | Dry-run, least-privilege review, rollback | Partial failure leaves production inconsistent |
| Release/package | Clean install, allowlist, hashes, version/license audit | Files omitted or secrets included |
| Documentation | Check every command/flag/path against implementation | Stale syntax or unsupported guarantee |

For each check record command, purpose, result, evidence, runtime scope, and what it does not prove.
