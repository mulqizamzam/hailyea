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

The importer maps each `aflj` `offset` to an address and a unique ID within that snapshot. **It does not treat addresses as stable identities across builds** and does not generate function fingerprints. When a function name is unique in both snapshots, Delta may match it by symbol; moved or renamed functions without another stable key may instead appear as additions/removals or uncertain matches.

The checked-in `examples/radare2-aflj.json` is a compact function-list excerpt used to exercise import behavior, not a pair of full production snapshots. It demonstrates the JSON fields commonly emitted by `aflj` (`offset`, `name`, `size`, and `calltype`); see the [radare2 JSON scripting example](https://github.com/NDXDeveloper/reverse-engineering-gcc-gpp-training/blob/main/09-ida-radare2-binja/04-scripting-r2pipe.md) and the [public function-list output example](https://github.com/rizinorg/cutter/issues/3345).

A real cross-version validation still requires exports from both builds of the same artifact and a review of the resulting matches. Do not interpret absence of a finding as evidence that it was fixed.
