import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { importRadare2Snapshot } from "./import-radare2.mjs";
import { compareSnapshots } from "./compare.mjs";
import { renderMarkdown } from "./report-markdown.mjs";

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: DEFAULT_TIMEOUT_MS,
    killSignal: "SIGKILL",
    maxBuffer: MAX_OUTPUT_BYTES,
    windowsHide: true
  });
  if (result.error) {
    if (result.error.code === "ETIMEDOUT") {
      throw new Error(`Command timed out after ${DEFAULT_TIMEOUT_MS} ms: ${command}`);
    }
    if (result.error.code === "ENOBUFS") {
      throw new Error(`Command output exceeded ${MAX_OUTPUT_BYTES} bytes: ${command}`);
    }
    throw new Error(`Unable to run command ${command}: ${result.error.message}`);
  }
  if (result.signal) throw new Error(`Command was terminated by signal ${result.signal}: ${command}`);
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").slice(0, 4000);
    throw new Error(`Command failed (${command}, exit ${result.status}): ${detail}`);
  }
  return (result.stdout ?? "").trim();
}
function parseJson(output, label) {
  try { return JSON.parse(output); }
  catch (error) { throw new Error(`Radare2 ${label} output was not valid JSON: ${error.message}`); }
}
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
async function writeJson(path, value) {
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}
function exportJson(r2, binary, command, label) {
  return parseJson(run(r2, ["-q", "-e", "log.level=0", "-c", command, binary]), label);
}

/** Export, import, and compare two binaries using the installed Radare2 CLI. */
export async function compareRadare2Binaries(beforePath, afterPath, options = {}) {
  const beforeBinary = resolve(beforePath), afterBinary = resolve(afterPath);
  const r2 = options.r2Bin ?? process.env.R2_BIN ?? "r2";
  const outputDir = resolve(options.outputDir ?? "hailyea-radare2-output");
  const beforeId = options.beforeId ?? "before";
  const afterId = options.afterId ?? "after";
  if (beforeBinary === afterBinary) throw new Error("Before and after inputs resolve to the same path; compare two distinct artifact paths.");
  await mkdir(outputDir, { recursive: true });
  const toolVersion = run(r2, ["-v"]).split("\n")[0];
  const builds = [
    { side: "before", id: beforeId, binary: beforeBinary },
    { side: "after", id: afterId, binary: afterBinary }
  ];
  const snapshots = [];
  for (const build of builds) {
    const initialBytes = await readFile(build.binary);
    const digest = sha256(initialBytes);
    const aflj = exportJson(r2, build.binary, "aaa; aflj", "aflj");
    const ij = exportJson(r2, build.binary, "ij", "ij");
    if (!Array.isArray(aflj)) throw new Error(`Radare2 aflj output for ${build.side} must be a JSON array`);
    if (!ij || typeof ij !== "object" || Array.isArray(ij)) throw new Error(`Radare2 ij output for ${build.side} must be a JSON object`);
    // Hash again after the tool has read the file to detect concurrent replacement or mutation.
    const finalDigest = sha256(await readFile(build.binary));
    if (finalDigest !== digest) {
      throw new Error(`Input artifact changed during analysis (${build.side}); discard this result and rerun against an immutable copy.`);
    }
    const snapshot = importRadare2Snapshot(aflj, ij, {
      snapshotId: build.id,
      artifactName: basename(build.binary),
      sha256: digest,
      toolVersion,
      configurationId: "aaa+aflj"
    });
    await writeJson(resolve(outputDir, `${build.side}.aflj.json`), aflj);
    await writeJson(resolve(outputDir, `${build.side}.ij.json`), ij);
    await writeJson(resolve(outputDir, `${build.side}.snapshot.json`), snapshot);
    snapshots.push(snapshot);
  }
  const delta = compareSnapshots(snapshots[0], snapshots[1]);
  await writeJson(resolve(outputDir, "delta.json"), delta);
  await writeFile(resolve(outputDir, "report.md"), renderMarkdown(delta), "utf8");
  const manifest = {
    pipelineVersion: "1.1",
    radare2Version: toolVersion,
    safeguards: {
      commandTimeoutMs: DEFAULT_TIMEOUT_MS,
      maxCommandOutputBytes: MAX_OUTPUT_BYTES,
      inputHashesRecheckedAfterAnalysis: true
    },
    outputs: ["before.aflj.json", "before.ij.json", "before.snapshot.json", "after.aflj.json", "after.ij.json", "after.snapshot.json", "delta.json", "report.md"],
    summary: delta.summary,
    warnings: delta.warnings,
    limitations: [
      "The report compares exported analysis metadata; it does not prove exploitability, absence of vulnerabilities, or behavioral equivalence.",
      "Timeout and output limits reduce resource-exhaustion risk but are not a process sandbox; analyze untrusted binaries in an OS-level isolated environment."
    ]
  };
  await writeJson(resolve(outputDir, "pipeline-summary.json"), manifest);
  return { outputDir, manifest, delta };
}
