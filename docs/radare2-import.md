# Importing radare2 JSON

Hailyea can convert a radare2 function list (`aflj`) and binary metadata (`ij`) into its versioned snapshot format. The importer does not launch radare2 or execute the analyzed binary.

## Export each build

Run these commands separately for each binary build:

```sh
r2 -q -c 'aaa; aflj' ./app > app-functions.json
r2 -q -c 'ij' ./app > app-info.json
HASH=$(sha256sum ./app | cut -d ' ' -f1)
```

Create a snapshot:

```sh
node src/cli.mjs import-radare2 app-functions.json app-info.json \
  --snapshot-id build-a \
  --sha256 "$HASH" \
  --output build-a.snapshot.json
```

Repeat with the second build's exports, using a different `--snapshot-id`, then compare:

```sh
node src/cli.mjs import-radare2 app-b-functions.json app-b-info.json \
  --snapshot-id build-b \
  --sha256 "$HASH_B" \
  --output build-b.snapshot.json

node src/cli.mjs compare build-a.snapshot.json build-b.snapshot.json --format markdown
```

The importer reads `core.file` and `bin` metadata from `ij` where available. You can override inferred values with `--artifact-name`, `--binary-format`, and `--architecture`. Add `--tool-version` and `--configuration-id` to record provenance; the default configuration ID is `aaa+aflj`. The hash is optional but recommended.

## Matching limits

The importer maps the function address (`addr` in Radare2 6.2.4 output, or `offset` in older exports), `name`, and `size`; it does not infer a calling convention from `calltype`, and it does not generate fingerprints. Each source address becomes an address and a unique ID within that snapshot. **Addresses are not treated as stable identities across builds.** When a function name is unique in both snapshots, Delta may match it by symbol; moved or renamed functions without another stable key may instead appear as additions/removals or uncertain matches.

The checked-in `examples/radare2-aflj.json` is a compact excerpt of public function-list output used to test import behavior, not a pair of full production snapshots. `examples/radare2-ij.json` is illustrative metadata for the test fixture, not a paired export from that binary. The checked-in excerpt uses the legacy `offset` field; current Radare2 6.2.4 `aflj` output uses `addr`. The importer accepts both. The examples also demonstrate `name`, `size`, and `calltype` fields; see the [radare2 JSON scripting example](https://github.com/NDXDeveloper/reverse-engineering-gcc-gpp-training/blob/main/09-ida-radare2-binja/04-scripting-r2pipe.md) and the [public function-list output example](https://github.com/rizinorg/cutter/issues/3345).

## End-to-end cross-build smoke test

GitHub Actions runs `scripts/radare2-cross-build-smoke.mjs` with Radare2 6.2.4 from a checksum-pinned official release package. The test compiles the checked-in C fixture twice with different build variants, exports actual `aflj` function arrays and `ij` metadata from both ELF binaries, imports both exports through the CLI, and compares the snapshots.

The smoke test checks that a known moved function is matched by symbol rather than address, a known changed function size is reported as changed, an unchanged function remains matched, and a newly introduced symbol is reported as added. JSON exports, snapshots, and the comparison report are uploaded as a short-lived CI artifact for inspection.

This validates the importer and comparison pipeline against real Radare2 output from controlled compiled test binaries. **It does not replace validation using representative before/after builds of the target production artifact.** That still requires both real exports and review of the resulting matches. Do not interpret absence of a finding as evidence that it was fixed.
