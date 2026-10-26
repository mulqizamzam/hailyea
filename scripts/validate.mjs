#!/usr/bin/env node
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
const root = process.cwd(), problems = [];
const readJson = async path => JSON.parse(await readFile(resolve(root, path), "utf8"));
const assert = (condition, message) => { if (!condition) problems.push(message); };
try {
  const pkg = await readJson("package.json"), manifest = await readJson("dsh.plugin.json");
  assert(pkg.name === "dsh-hailyea", "package name must be dsh-hailyea");
  assert(pkg.author === "mulqizamzam", "package author must be mulqizamzam");
  assert(pkg.engines?.dsh === "0.2.1-rc.2", "package must declare requested DSH target");
  assert(pkg.engines?.node === "^22.19.0 || >=24.0.0", "package must declare the DSH-supported Node.js floor");
  assert(pkg.dsh?.bundle?.patch === "./cordis.patch.yml", "package must declare the runtime-recognized DSH bundle patch");
  assert(pkg.peerDependencies?.["@deepseek-ai/dsh-base"] === "0.2.1-rc.2", "package must declare the matching optional DSH base peer");
  assert(manifest.name === pkg.name && manifest.version === pkg.version, "manifest identity/version mismatch");
  assert(manifest.author === pkg.author, "manifest author mismatch");
  assert(manifest.bundle?.patch === pkg.dsh.bundle.patch, "descriptive manifest bundle path mismatch");
  assert(!pkg.dependencies && !pkg.devDependencies, "unreviewed dependencies are not allowed");
  assert(pkg.bin?.["dsh-hailyea-delta"] === "./src/cli.mjs", "Delta CLI bin must be declared");
  const entries = await readdir(resolve(root, "skills"), { withFileTypes: true });
  assert(entries.length > 0, "skills/ must contain at least one Skill");
  for (const entry of entries) {
    const path = resolve(root, "skills", entry.name, "SKILL.md");
    try {
      assert((await stat(path)).isFile(), "SKILL.md must be a regular file");
      const body = await readFile(path, "utf8");
      const match = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n\r?\n([\s\S]+)$/);
      assert(Boolean(match), "Skill needs frontmatter and a non-empty body");
      if (match) {
        assert(/^name:\s*[a-z0-9]+(?:-[a-z0-9]+)*\s*$/m.test(match[1]), "Skill name must be kebab-case");
        assert(/^description:\s*\S.+$/m.test(match[1]), "Skill description is required");
      }
    } catch { problems.push("missing or unreadable " + relative(root, path).split(sep).join("/")); }
  }
  for (const path of ["README.md","LICENSE","NOTICE.md","CHANGELOG.md","docs/compatibility.md","cordis.patch.yml","docs/architecture.md","docs/hailyea-delta.md","docs/radare2-import.md","src/cli.mjs","src/delta/compare.mjs","src/delta/import-radare2.mjs","schemas/analysis-snapshot-v1.schema.json","examples/baseline.json","examples/candidate.json","examples/radare2-aflj.json","examples/radare2-ij.json"]) {
    try { await stat(resolve(root, path)); } catch { problems.push("required file missing: " + path); }
  }
  const readme = await readFile(resolve(root, "README.md"), "utf8");
  assert(readme.includes(pkg.author), "README must disclose maintainer");
  assert(readme.includes("runtime smoke test"), "README must distinguish runtime smoke tests from local checks");
  assert(!readme.includes("NationalSecurityAgency/ghidra"), "README must not contain reference repository URL");
} catch (error) { problems.push("validation setup failed: " + error.message); }
if (problems.length) { console.error("Validation failed:\n- " + problems.join("\n- ")); process.exitCode = 1; }
else console.log("Validation passed: metadata, target, Skills, Delta CLI, schema, fixtures, and documentation.");
