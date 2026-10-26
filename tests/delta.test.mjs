import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { compareSnapshots } from "../src/delta/compare.mjs";
import { validateSnapshot, SnapshotValidationError } from "../src/delta/schema.mjs";
const artifact = { name: "sample", format: "ELF", architecture: "x86_64" };
const snap = (snapshotId, functions, findings = []) => ({ schemaVersion: "1.0", snapshotId, artifact, functions, findings });
const fn = (id, address, extra = {}) => ({ id, address, ...extra });

test("fingerprint match survives address movement", () => {
  const result = compareSnapshots(snap("before", [fn("old", "0x1000", { name: "run", fingerprint: "norm:abc" })]), snap("after", [fn("new", "0x9000", { name: "run_renamed", fingerprint: "norm:abc" })]));
  assert.equal(result.functions[0].status, "changed");
  assert.equal(result.functions[0].match.method, "fingerprint");
});
test("stable identity with changed fingerprint is changed", () => {
  const result = compareSnapshots(snap("before", [fn("old", "0x1000", { stableId: "engine:42", fingerprint: "a" })]), snap("after", [fn("new", "0x2000", { stableId: "engine:42", fingerprint: "b" })]));
  assert.equal(result.functions[0].status, "changed");
  assert.equal(result.functions[0].match.confidence, "high");
});
test("unique symbol is a medium-confidence match", () => {
  const result = compareSnapshots(snap("before", [fn("old", "0x1000", { name: "parse", namespace: "app", fingerprint: "old" })]), snap("after", [fn("new", "0x2000", { name: "parse", namespace: "app", fingerprint: "new" })]));
  assert.equal(result.functions[0].match.method, "symbol");
  assert.equal(result.functions[0].match.confidence, "medium");
});
test("ambiguous duplicate fingerprints are surfaced as uncertain", () => {
  const result = compareSnapshots(snap("before", [fn("a", "0x1", { fingerprint: "same" }), fn("b", "0x2", { fingerprint: "same" })]), snap("after", [fn("c", "0x3", { fingerprint: "same" }), fn("d", "0x4", { fingerprint: "same" })]));
  assert.ok(result.ambiguousMatches.length > 0);
  assert.ok(result.functions.some(x => x.status === "uncertain"));
});
test("duplicate stable identities are surfaced as ambiguous", () => {
  const before = snap("before", [
    fn("before-a", "0x1000", { stableId: "engine:duplicate" }),
    fn("before-b", "0x2000", { stableId: "engine:duplicate" })
  ]);
  const after = snap("after", [
    fn("after-a", "0x9000", { stableId: "engine:duplicate" }),
    fn("after-b", "0xA000", { stableId: "engine:duplicate" })
  ]);
  const result = compareSnapshots(before, after);
  assert.ok(result.ambiguousMatches.some(item =>
    item.method === "stableId" &&
    item.beforeIds.length === 2 &&
    item.afterIds.length === 2
  ));
  assert.equal(result.functions.filter(item => item.status === "uncertain").length, 1);
});

test("missing findings are never called resolved", () => {
  const result = compareSnapshots(snap("before", [fn("old", "0x1000", { fingerprint: "same" })], [{ id: "f1", ruleId: "rule-x", functionId: "old", title: "Review" }]), snap("after", [fn("new", "0x2000", { fingerprint: "same" })]));
  assert.equal(result.findings[0].status, "not_reobserved_review");
  assert.match(result.findings[0].rationale, /not proof of resolution/i);
});
test("validation rejects dangling finding references", () => {
  assert.throws(() => validateSnapshot(snap("x", [], [{ id: "f", functionId: "missing" }])), SnapshotValidationError);
});
test("CLI emits JSON and Markdown from sample snapshots", () => {
  const json = spawnSync(process.execPath, ["src/cli.mjs", "compare", "examples/baseline.json", "examples/candidate.json"], { encoding: "utf8" });
  assert.equal(json.status, 0, json.stderr);
  assert.equal(JSON.parse(json.stdout).comparisonVersion, "1.0");
  const md = spawnSync(process.execPath, ["src/cli.mjs", "compare", "examples/baseline.json", "examples/candidate.json", "--format", "markdown"], { encoding: "utf8" });
  assert.equal(md.status, 0, md.stderr);
  assert.match(md.stdout, /Finding reconciliation/);
});
test("tool metadata differences are warned about", () => {
  const a = { ...snap("a", [fn("x", "0x1", { fingerprint: "same" })]), tool: { name: "A", version: "1" } };
  const b = { ...snap("b", [fn("y", "0x2", { fingerprint: "same" })]), tool: { name: "A", version: "2" } };
  assert.ok(compareSnapshots(a, b).warnings.some(x => /differ/.test(x)));
});
