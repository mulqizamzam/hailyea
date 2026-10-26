import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compareRadare2Binaries } from "../src/delta/radare2-pipeline.mjs";
import { compareSnapshots } from "../src/delta/compare.mjs";

const artifact = { name: "sample.bin", format: "ELF", architecture: "x86_64" };
const snapshot = (snapshotId, functions, findings = []) => ({
  schemaVersion: "1.0", snapshotId, artifact, functions, findings,
});

test("function deltas include movement, size change, and risk assessment evidence", () => {
  const before = snapshot("before", [{ id: "old", address: "0x1000", name: "parse", size: 12, fingerprint: "old" }]);
  const after = snapshot("after", [{ id: "new", address: "0x9000", name: "parse", size: 20, fingerprint: "new" }]);
  const result = compareSnapshots(before, after);
  const delta = result.functions[0];
  assert.equal(delta.movement.moved, true);
  assert.equal(delta.sizeDelta, 8);
  assert.equal(delta.assessment.riskLevel, "high");
  assert.ok(delta.assessment.evidence.some(item => item.type === "field-change" && item.field === "fingerprint"));
  assert.match(delta.assessment.caveat, /not a vulnerability verdict/i);
});

test("finding reconciliation preserves evidence and requires false-positive review", () => {
  const before = snapshot("before", [], [{ id: "f-old", ruleId: "R-1", title: "Unsafe call", severity: "high", evidence: ["call at 0x1000"] }]);
  const after = snapshot("after", [], [{ id: "f-new", ruleId: "R-1", title: "Unsafe call", severity: "high", evidence: ["call at 0x2000"] }]);
  const finding = compareSnapshots(before, after).findings[0];
  assert.equal(finding.status, "still_detected");
  assert.equal(finding.severity, "high");
  assert.equal(finding.falsePositiveReview, "needs_analyst_review");
  assert.deepEqual(finding.beforeEvidence, ["call at 0x1000"]);
  assert.deepEqual(finding.afterEvidence, ["call at 0x2000"]);
});

test("Radare2 binary pipeline exports, imports, compares, and writes reproducible artifacts", async () => {
  const root = join(tmpdir(), `hailyea-pipeline-${process.pid}-${Date.now()}`);
  const outputDir = join(root, "out");
  await mkdir(root, { recursive: true });
  const beforePath = join(root, "before.bin"), afterPath = join(root, "after.bin");
  await writeFile(beforePath, "baseline binary bytes");
  await writeFile(afterPath, "candidate binary bytes");
  const mockR2 = join(root, "mock-r2.mjs");
  await writeFile(mockR2, `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes("-v")) { console.log("radare2 6.2.4"); process.exit(0); }
const command = args[args.indexOf("-c") + 1];
const binary = args.at(-1);
if (command.includes("aflj")) {
  const after = binary.includes("after.bin");
  console.log(JSON.stringify([{ addr: after ? 0x2000 : 0x1000, name: "sym.main", size: after ? 20 : 12 }]));
} else if (command === "ij") {
  console.log(JSON.stringify({ core: { file: binary }, bin: { arch: "x86", bits: 64, bintype: "ELF" } }));
} else { console.error("unexpected command " + command); process.exit(2); }
`);
  await chmod(mockR2, 0o755);
  const result = await compareRadare2Binaries(beforePath, afterPath, {
    r2Bin: mockR2, outputDir, beforeId: "build-1", afterId: "build-2",
  });
  assert.equal(result.manifest.radare2Version, "radare2 6.2.4");
  assert.equal(result.delta.functions[0].status, "changed");
  assert.equal(result.delta.functions[0].sizeDelta, 8);
  for (const file of ["before.aflj.json", "before.ij.json", "before.snapshot.json", "after.aflj.json", "after.ij.json", "after.snapshot.json", "delta.json", "report.md", "pipeline-summary.json"]) {
    const contents = await readFile(join(outputDir, file), "utf8");
    assert.ok(contents.length > 0, `${file} should be written`);
  }
  assert.match(await readFile(join(outputDir, "report.md"), "utf8"), /Change category/);
});
