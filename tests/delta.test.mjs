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
test("matched function deltas report address movement and size delta separately", () => {
  const result = compareSnapshots(snap("before", [fn("old", "0x1000", { stableId: "fn:1", size: 10 })]), snap("after", [fn("new", "0x2000", { stableId: "fn:1", size: 16 })]));
  assert.equal(result.functions[0].movement.moved, true);
  assert.deepEqual(result.functions[0].movement, { moved: true, before: "0x1000", after: "0x2000" });
  assert.equal(result.functions[0].sizeDelta, 6);
  assert.equal(result.functions[0].status, "changed", "the size delta should drive changed status while movement is reported separately");
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

test("missing findings are never called resolved and retain evidence review metadata", () => {
  const result = compareSnapshots(snap("before", [fn("old", "0x1000", { fingerprint: "same" })], [{ id: "f1", ruleId: "rule-x", functionId: "old", title: "Review", severity: "high", evidence: ["call to unsafe API"] }]), snap("after", [fn("new", "0x2000", { fingerprint: "same" })]));
  assert.equal(result.findings[0].status, "not_reobserved_review");
  assert.match(result.findings[0].rationale, /not proof of resolution/i);
  assert.equal(result.findings[0].severity, "high");
  assert.deepEqual(result.findings[0].beforeEvidence, ["call to unsafe API"]);
  assert.deepEqual(result.findings[0].afterEvidence, []);
  assert.equal(result.findings[0].falsePositiveReview, "needs_analyst_review");
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
test("Radare2 pipeline imports both builds and emits a Delta report in one command", () => {
  const result = spawnSync(process.execPath, [
    "src/cli.mjs", "radare2-compare",
    "examples/radare2-aflj.json", "examples/radare2-ij.json",
    "examples/radare2-aflj.json", "examples/radare2-ij.json",
    "--before-id", "pipeline-before", "--after-id", "pipeline-after",
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const delta = JSON.parse(result.stdout);
  assert.equal(delta.before.snapshotId, "pipeline-before");
  assert.equal(delta.after.snapshotId, "pipeline-after");
  assert.ok(delta.functions.every(item => item.movement && Object.hasOwn(item, "sizeDelta")));
});

test("tool metadata differences are warned about", () => {
  const a = { ...snap("a", [fn("x", "0x1", { fingerprint: "same" })]), tool: { name: "A", version: "1" } };
  const b = { ...snap("b", [fn("y", "0x2", { fingerprint: "same" })]), tool: { name: "A", version: "2" } };
  assert.ok(compareSnapshots(a, b).warnings.some(x => /differ/.test(x)));
});

test("movement is unknown when either snapshot lacks an address", () => {
  const result = compareSnapshots(
    snap("before", [fn("old", undefined, { stableId: "fn:address-unknown", fingerprint: "same" })]),
    snap("after", [fn("new", "0x2000", { stableId: "fn:address-unknown", fingerprint: "same" })])
  );
  assert.equal(result.functions[0].movement.moved, null);
  assert.equal(result.functions[0].assessment.moved, false);
  assert.notEqual(result.functions[0].assessment.category, "address-movement");
});

test("finding reconciliation does not cross matched function identities", () => {
  const before = snap("before", [
    fn("old-a", "0x1000", { stableId: "fn:a", fingerprint: "a" }),
    fn("old-b", "0x2000", { stableId: "fn:b", fingerprint: "b" })
  ], [{ id: "finding-old", ruleId: "dangerous-call", functionId: "old-a", severity: "high", evidence: ["old evidence"] }]);
  const after = snap("after", [
    fn("new-a", "0x1100", { stableId: "fn:a", fingerprint: "a" }),
    fn("new-b", "0x2200", { stableId: "fn:b", fingerprint: "b" })
  ], [{ id: "finding-new", ruleId: "dangerous-call", functionId: "new-b", severity: "low", evidence: ["new evidence"] }]);
  const result = compareSnapshots(before, after);
  assert.equal(result.findings[0].status, "not_reobserved_review");
  assert.equal(result.findings[1].status, "newly_observed");
});

test("function-scoped finding is not reconciled to a finding with missing function identity", () => {
  const before = snap("before", [fn("old", "0x1000", { stableId: "fn:a" })], [
    { id: "finding-old", ruleId: "rule-x", functionId: "old", severity: "high" }
  ]);
  const after = snap("after", [fn("new", "0x2000", { stableId: "fn:a" })], [
    { id: "finding-new", ruleId: "rule-x", severity: "low" }
  ]);
  const result = compareSnapshots(before, after);
  assert.deepEqual(result.findings.map(item => item.status), ["not_reobserved_review", "newly_observed"]);
});

test("reconciled finding preserves the more severe baseline severity", () => {
  const before = snap("before", [fn("old", "0x1000", { stableId: "fn:a" })], [
    { id: "finding-old", ruleId: "rule-x", functionId: "old", severity: "critical" }
  ]);
  const after = snap("after", [fn("new", "0x2000", { stableId: "fn:a" })], [
    { id: "finding-new", ruleId: "rule-x", functionId: "new", severity: "low" }
  ]);
  const finding = compareSnapshots(before, after).findings[0];
  assert.equal(finding.status, "still_detected");
  assert.equal(finding.severity, "critical");
  assert.equal(finding.beforeSeverity, "critical");
  assert.equal(finding.afterSeverity, "low");
});

test("different artifact architectures and formats produce comparability warnings", () => {
  const before = { ...snap("before", []), artifact: { ...artifact, format: "ELF", architecture: "x86_64" } };
  const after = { ...snap("after", []), artifact: { ...artifact, format: "PE", architecture: "arm64" } };
  const warnings = compareSnapshots(before, after).warnings.join("\n");
  assert.match(warnings, /formats differ/i);
  assert.match(warnings, /architectures differ/i);
});

