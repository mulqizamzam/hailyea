#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { compareSnapshots } from "./delta/compare.mjs";
import { importRadare2Snapshot } from "./delta/import-radare2.mjs";
import { renderMarkdown } from "./delta/report-markdown.mjs";

function usage() {
  return [
    "Usage:",
    "  dsh-hailyea-delta compare <before.json> <after.json> [--format json|markdown] [--output report.ext]",
    "  dsh-hailyea-delta import-radare2 <aflj.json> <ij.json> --snapshot-id <id> [--artifact-name <name>] [--sha256 <64-hex>] [--tool-version <version>] [--configuration-id <id>] [--output snapshot.json]",
  ].join("\n");
}

function parseFlags(args, allowed) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const key = allowed[args[i]];
    if (!key) throw new Error(`Unknown option: ${args[i]}\n${usage()}`);
    const value = args[++i];
    if (!value || value.startsWith("--")) throw new Error(`Option ${args[i - 1]} requires a value`);
    options[key] = value;
  }
  return options;
}

async function jsonFile(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(value, output) {
  const rendered = JSON.stringify(value, null, 2) + "\n";
  if (output) await writeFile(output, rendered, "utf8");
  else process.stdout.write(rendered);
}

async function compareCommand(args) {
  const [beforePath, afterPath, ...flags] = args;
  if (!beforePath || !afterPath) throw new Error(usage());
  const options = parseFlags(flags, { "--format": "format", "--output": "output" });
  const format = options.format ?? "json";
  if (!["json", "markdown"].includes(format)) throw new Error("Format must be json or markdown");
  const result = compareSnapshots(await jsonFile(beforePath), await jsonFile(afterPath));
  const rendered = format === "markdown" ? renderMarkdown(result) : JSON.stringify(result, null, 2) + "\n";
  if (options.output) await writeFile(options.output, rendered, "utf8");
  else process.stdout.write(rendered);
}

async function importRadare2Command(args) {
  const [functionsPath, infoPath, ...flags] = args;
  if (!functionsPath || !infoPath) throw new Error(usage());
  const options = parseFlags(flags, {
    "--snapshot-id": "snapshotId",
    "--artifact-name": "artifactName",
    "--sha256": "sha256",
    "--binary-format": "format",
    "--architecture": "architecture",
    "--tool-version": "toolVersion",
    "--configuration-id": "configurationId",
    "--output": "output",
  });
  const snapshot = importRadare2Snapshot(
    await jsonFile(functionsPath),
    await jsonFile(infoPath),
    options,
  );
  await writeJson(snapshot, options.output);
}

async function main(argv) {
  const [command, ...args] = argv;
  if (!command || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }
  if (command === "compare") return compareCommand(args);
  if (command === "import-radare2") return importRadare2Command(args);
  throw new Error(usage());
}

main(process.argv.slice(2)).catch(error => {
  console.error(`dsh-hailyea-delta: ${error.message}`);
  process.exitCode = 1;
});
