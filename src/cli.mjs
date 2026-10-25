#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { compareSnapshots } from "./delta/compare.mjs";
import { renderMarkdown } from "./delta/report-markdown.mjs";
function usage() { return "Usage: dsh-hailyea-delta compare <before.json> <after.json> [--format json|markdown] [--output report.ext]"; }
async function main(argv) {
  const [command, beforePath, afterPath, ...args] = argv;
  if (!command || command === "--help" || command === "-h") { console.log(usage()); return; }
  if (command !== "compare" || !beforePath || !afterPath) throw new Error(usage());
  let format = "json", output;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--format") format = args[++i];
    else if (args[i] === "--output") output = args[++i];
    else throw new Error(`Unknown option: ${args[i]}\n${usage()}`);
  }
  if (!["json","markdown"].includes(format)) throw new Error("Format must be json or markdown");
  const before = JSON.parse(await readFile(beforePath, "utf8"));
  const after = JSON.parse(await readFile(afterPath, "utf8"));
  const result = compareSnapshots(before, after);
  const rendered = format === "markdown" ? renderMarkdown(result) : JSON.stringify(result, null, 2) + "\n";
  if (output) await writeFile(output, rendered, "utf8"); else process.stdout.write(rendered);
}
main(process.argv.slice(2)).catch(error => { console.error(`dsh-hailyea-delta: ${error.message}`); process.exitCode = 1; });
