#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(
  process.env.HAILYEA_RADARE2_E2E_OUTPUT ?? join(tmpdir(), "hailyea-radare2-e2e"),
);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Command failed (${result.status}): ${command} ${args.join(" ")}\n` +
      `stdout:\n${result.stdout ?? ""}\nstderr:\n${result.stderr ?? ""}`,
    );
  }
  return (result.stdout ?? "").trim();
}

async function writeJson(path, value) {
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function parseR2Json(output, expectedType, command) {
  try {
    return JSON.parse(output);
  } catch (error) {
    const preview = output.slice(0, 500);
    throw new Error(
      `radare2 ${command} did not emit valid JSON (${expectedType}): ${error.message}\n` +
      `Output preview: ${JSON.stringify(preview)}`,
    );
  }
}

function exportWithRadare2(binary, command, expectedType) {
  const output = run("r2", ["-q", "-e", "log.level=0", "-c", command, binary]);
  return parseR2Json(output, expectedType, command);
}

function functionBySuffix(snapshot, expectedName) {
  return snapshot.functions.find(fn =>
    typeof fn.name === "string" &&
    (fn.name === expectedName || fn.name.endsWith(`.${expectedName}`)),
  );
}

async function compileBuild(sourcePath, outputPath, buildAfter) {
  run(process.env.CC || "cc", [
    "-std=c11",
    "-g",
    "-O0",
    "-fno-inline",
    "-fno-pie",
    "-no-pie",
    `-DBUILD_AFTER=${buildAfter ? 1 : 0}`,
    sourcePath,
    "-o",
    outputPath,
  ]);
  return outputPath;
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const binDir = join(outputRoot, "bin");
  const exportDir = join(outputRoot, "exports");
  const snapshotDir = join(outputRoot, "snapshots");
  await Promise.all([mkdir(binDir, { recursive: true }), mkdir(exportDir, { recursive: true }), mkdir(snapshotDir, { recursive: true })]);

  const sourcePath = join(root, "scripts", "radare2-cross-build.c");
  const source = await readFile(sourcePath, "utf8");
  assert.match(source, /BUILD_AFTER/, "cross-build fixture must support both variants");

  const toolVersion = run("r2", ["-v"]).split("\n")[0];
  const baselineBinary = await compileBuild(sourcePath, join(binDir, "baseline"), false);
  const candidateBinary = await compileBuild(sourcePath, join(binDir, "candidate"), true);

  const builds = [
    { id: "baseline", binary: baselineBinary, snapshotId: "radare2-e2e-baseline" },
    { id: "candidate", binary: candidateBinary, snapshotId: "radare2-e2e-candidate" },
  ];

  for (const build of builds) {
    const aflj = exportWithRadare2(build.binary, "aaa; aflj", "function array");
    const ij = exportWithRadare2(build.binary, "ij", "binary metadata object");
    assert.ok(Array.isArray(aflj), `${build.id}: aflj must return an array`);
    assert.ok(ij && typeof ij === "object" && !Array.isArray(ij), `${build.id}: ij must return an object`);
    console.log(`${build.id}: aflj rows=${aflj.length}; first-row-keys=${Object.keys(aflj[0] ?? {}).join(",")}; offset=${JSON.stringify(aflj[0]?.offset)}; addr=${JSON.stringify(aflj[0]?.addr)}`);

    build.afljPath = join(exportDir, `${build.id}.aflj.json`);
    build.ijPath = join(exportDir, `${build.id}.ij.json`);
    build.snapshotPath = join(snapshotDir, `${build.id}.snapshot.json`);
    await writeJson(build.afljPath, aflj);
    await writeJson(build.ijPath, ij);

    const hash = createHash("sha256").update(await readFile(build.binary)).digest("hex");
    run(process.execPath, [
      join(root, "src", "cli.mjs"),
      "import-radare2",
      build.afljPath,
      build.ijPath,
      "--snapshot-id", build.snapshotId,
      "--artifact-name", "hailyea-radare2-e2e-sample",
      "--sha256", hash,
      "--binary-format", "ELF",
      "--architecture", "x86_64",
      "--tool-version", toolVersion,
      "--configuration-id", "aaa+aflj",
      "--output", build.snapshotPath,
    ]);
    build.snapshot = await readJson(build.snapshotPath);
  }

  const beforeStable = functionBySuffix(builds[0].snapshot, "stable_helper");
  const afterStable = functionBySuffix(builds[1].snapshot, "stable_helper");
  const beforeUnchanged = functionBySuffix(builds[0].snapshot, "unchanged_helper");
  const afterUnchanged = functionBySuffix(builds[1].snapshot, "unchanged_helper");
  const beforeAdded = functionBySuffix(builds[0].snapshot, "added_helper");
  const afterAdded = functionBySuffix(builds[1].snapshot, "added_helper");

  assert.ok(beforeStable && afterStable, "stable_helper must be exported from both builds");
  assert.ok(beforeUnchanged && afterUnchanged, "unchanged_helper must be exported from both builds");
  assert.equal(beforeAdded, undefined, "added_helper must not exist in the baseline build");
  assert.ok(afterAdded, "added_helper must be exported from the candidate build");
  assert.notEqual(
    beforeStable.address,
    afterStable.address,
    "fixture setup should move stable_helper when added_helper is compiled before it",
  );
  assert.notEqual(
    beforeStable.size,
    afterStable.size,
    "fixture setup should change stable_helper's function size",
  );

  const deltaPath = join(outputRoot, "delta.json");
  run(process.execPath, [
    join(root, "src", "cli.mjs"),
    "compare",
    builds[0].snapshotPath,
    builds[1].snapshotPath,
    "--format", "json",
    "--output", deltaPath,
  ]);
  const delta = await readJson(deltaPath);

  const stableDelta = delta.functions.find(item =>
    item.beforeId === beforeStable.id && item.afterId === afterStable.id,
  );
  assert.ok(stableDelta, "stable_helper must be paired across snapshots");
  assert.equal(stableDelta.match.method, "symbol", "moved function must match by symbol, not raw address");
  assert.equal(stableDelta.status, "changed", "stable_helper's size change must be surfaced");

  const unchangedDelta = delta.functions.find(item =>
    item.beforeId === beforeUnchanged.id && item.afterId === afterUnchanged.id,
  );
  assert.ok(unchangedDelta, "unchanged_helper must be paired across snapshots");
  assert.equal(unchangedDelta.match.method, "symbol");
  assert.equal(unchangedDelta.status, "unchanged");

  const addedDelta = delta.functions.find(item => item.afterId === afterAdded.id);
  assert.ok(addedDelta, "added_helper must appear in the Delta report");
  assert.equal(addedDelta.status, "added");
  assert.equal(delta.summary.functions.removed, 0, "known unchanged symbols should not be reported as removals");

  await writeJson(join(outputRoot, "summary.json"), {
    radare2Version: toolVersion,
    artifact: "hailyea-radare2-e2e-sample",
    baseline: {
      sha256: builds[0].snapshot.artifact.sha256,
      functions: builds[0].snapshot.functions.length,
    },
    candidate: {
      sha256: builds[1].snapshot.artifact.sha256,
      functions: builds[1].snapshot.functions.length,
    },
    assertions: {
      movedStableSymbolMatchedBySymbol: stableDelta.status === "changed" && stableDelta.match.method === "symbol",
      unchangedSymbolRetained: unchangedDelta.status === "unchanged",
      knownNewSymbolReportedAdded: addedDelta.status === "added",
    },
    deltaSummary: delta.summary,
  });

  console.log(`Radare2 version: ${toolVersion}`);
  console.log(`Baseline functions: ${builds[0].snapshot.functions.length}`);
  console.log(`Candidate functions: ${builds[1].snapshot.functions.length}`);
  console.log(`stable_helper: moved ${beforeStable.address} -> ${afterStable.address}; status=${stableDelta.status}; match=${stableDelta.match.method}`);
  console.log(`unchanged_helper: status=${unchangedDelta.status}; match=${unchangedDelta.match.method}`);
  console.log(`added_helper: status=${addedDelta.status}`);
  console.log(`JSON exports and snapshots written to ${outputRoot}`);
}

main().catch(error => {
  console.error(`radare2-cross-build-smoke: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
