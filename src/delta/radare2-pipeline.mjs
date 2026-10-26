import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { importRadare2Snapshot } from "./import-radare2.mjs";
import { compareSnapshots } from "./compare.mjs";
import { renderMarkdown } from "./report-markdown.mjs";

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Command failed (${command} ${args.join(" ")}): ${result.stderr || result.stdout}`);
  return (result.stdout ?? "").trim();
}
function parseJson(output, label) {
  try { return JSON.parse(output); }
  catch (error) { throw new Error(`Radare2 ${label} output was not valid JSON: ${error.message}`); }
}
function exportJson(r2, binary, command, label) {
  return parseJson(run(r2, ["-q", "-e", "log.level=0", "-c", command, binary]), label);
}
async function writeJson(path, value) {
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

/** Export, import, and compare two binaries using the installed Radare2 CLI. */
export async function compareRadare2Binaries(beforePath, afterPath, options = {}) {
  const beforeBinary = resolve(beforePath), afterBinary = resolve(afterPath);
  const r2 = options.r2Bin ?? process.env.R2_BIN ?? "r2";
  const outputDir = resolve(options.outputDir ?? "hailyea-radare2-output");
  const beforeId = options.beforeId ?? "before";
  const afterId = options.afterId ?? "after";
  await mkdir(outputDir, { recursive: true });
  const toolVersion = run(r2, ["-v"]).split("\n")[0];
  const builds = [
    { side: "before", id: beforeId, binary: beforeBinary },
    { side: "after", id: afterId, binary: afterBinary }
  ];
  const snapshots = [];
  for (const build of builds) {
    const binaryBytes = await readFile(build.binary);
    const aflj = exportJson(r2, build.binary, "aaa; aflj", "aflj");
    const ij = exportJson(r2, build.binary, "ij", "ij");
    if (!Array.isArray(aflj)) throw new Error(`Radare2 aflj output for ${build.side} must be a JSON array`);
    if (!ij || typeof ij !== "object" || Array.isArray(ij)) throw new Error(`Radare2 ij output for ${build.side} must be a JSON object`);
    const digest = createHash("sha256").update(binaryBytes).digest("hex");
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
    pipelineVersion: "1.0",
    radare2Version: toolVersion,
    outputs: ["before.aflj.json", "before.ij.json", "before.snapshot.json", "after.aflj.json", "after.ij.json", "after.snapshot.json", "delta.json", "report.md"],
    summary: delta.summary,
    warnings: delta.warnings,
    limitations: ["The report compares exported analysis metadata; it does not prove exploitability, absence of vulnerabilities, or behavioral equivalence."]
  };
  await writeJson(resolve(outputDir, "pipeline-summary.json"), manifest);
  return { outputDir, manifest, delta };
}
