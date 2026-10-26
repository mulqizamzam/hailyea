import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { importRadare2Snapshot } from "../src/delta/import-radare2.mjs";
import { validateSnapshot, SnapshotValidationError } from "../src/delta/schema.mjs";

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const sha256 = "a".repeat(64);

test("imports an aflj function array into a versioned Hailyea snapshot", async () => {
  const rawFunctions = await readJson("../examples/radare2-aflj.json");
  const binaryInfo = await readJson("../examples/radare2-ij.json");
  const snapshot = importRadare2Snapshot(rawFunctions, binaryInfo, {
    snapshotId: "sample-build",
    sha256,
    toolVersion: "test-version",
  });

  assert.equal(snapshot.snapshotId, "sample-build");
  assert.equal(snapshot.artifact.name, "sample_arm64");
  assert.equal(snapshot.artifact.format, "mach0");
  assert.equal(snapshot.artifact.architecture, "arm64");
  assert.equal(snapshot.artifact.sha256, sha256);
  assert.equal(snapshot.tool.name, "radare2");
  assert.equal(snapshot.tool.version, "test-version");
  assert.equal(snapshot.functions[0].id, "radare2:0x100003f6c");
  assert.equal(snapshot.functions[0].address, "0x100003f6c");
  assert.equal(snapshot.functions[0].name, "entry0");
  assert.equal(snapshot.functions[0].size, 32);
  assert.equal(snapshot.functions[0].callingConvention, "arm64");
  assert.equal(snapshot.functions[1].name, "sym.imp.printf");
  assert.equal(snapshot.functions.length, 2);
  assert.equal(snapshot.functions.some(fn => fn.stableId), false);
  assert.equal(validateSnapshot(snapshot).snapshotId, "sample-build");
});

test("supports address strings and explicit artifact metadata", () => {
  const snapshot = importRadare2Snapshot(
    [{ offset: "0x401000", name: "main", size: 10 }],
    { bin: {} },
    { snapshotId: "manual", artifactName: "app.bin", architecture: "x86_64", format: "ELF" },
  );
  assert.equal(snapshot.artifact.name, "app.bin");
  assert.equal(snapshot.artifact.architecture, "x86_64");
  assert.equal(snapshot.artifact.format, "ELF");
  assert.equal(snapshot.functions[0].address, "0x401000");
});

test("rejects malformed exports and unsafe numeric addresses", () => {
  const info = { core: { file: "app.bin" }, bin: { arch: "x86", bits: 64 } };
  assert.throws(() => importRadare2Snapshot({}, info, { snapshotId: "bad" }), /JSON array emitted by aflj/);
  assert.throws(() => importRadare2Snapshot([{ name: "main" }], info, { snapshotId: "bad" }), /offset/);
  assert.throws(() => importRadare2Snapshot([{ offset: Number.MAX_SAFE_INTEGER + 1 }], info, { snapshotId: "bad" }), /safe integer/);
  assert.throws(() => importRadare2Snapshot([{ offset: 10 }], info, { snapshotId: "bad", sha256: "not-a-hash" }), /64 hexadecimal/);
  assert.throws(() => importRadare2Snapshot([{ offset: 10 }], {}, {}), /snapshotId is required/);
});

test("CLI imports radare2 JSON and emits a schema-compatible snapshot", async () => {
  const result = spawnSync(process.execPath, [
    "src/cli.mjs", "import-radare2",
    "examples/radare2-aflj.json", "examples/radare2-ij.json",
    "--snapshot-id", "cli-build",
    "--sha256", sha256,
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const snapshot = JSON.parse(result.stdout);
  assert.equal(snapshot.snapshotId, "cli-build");
  assert.equal(snapshot.functions.length, 2);
  assert.equal(snapshot.artifact.sha256, sha256);
});
