import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

test("package has expected identity, DSH target, and CLI", async () => {
  const pkg = await readJson("../package.json");
  assert.equal(pkg.name, "dsh-hailyea");
  assert.equal(pkg.author, "mulqizamzam");
  assert.equal(pkg.engines.dsh, "0.2.1-rc.2");
  assert.ok(pkg.scripts.check);
  assert.equal(pkg.bin["dsh-hailyea-delta"], "./src/cli.mjs");
  assert.ok(pkg.files.includes("src/"));
});
test("plugin metadata matches package identity and target", async () => {
  const pkg = await readJson("../package.json"), manifest = await readJson("../dsh.plugin.json");
  assert.equal(manifest.name, pkg.name);
  assert.equal(manifest.author, pkg.author);
  assert.equal(manifest.engines.dsh, pkg.engines.dsh);
});
test("Skill has valid frontmatter and substantive body", async () => {
  const content = await readFile(new URL("../skills/dsh-hailyea-engineering/SKILL.md", import.meta.url), "utf8");
  assert.match(content, /^---\nname: dsh-hailyea-engineering\ndescription: .+\n---\n\n# /);
  assert.ok(content.length > 2500);
  assert.match(content, /Stop conditions/);
  assert.match(content, /Do not claim a test/);
});
test("runtime target and installation caveat are documented", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const compatibility = await readFile(new URL("../docs/compatibility.md", import.meta.url), "utf8");
  assert.match(readme, /0\.2\.1-rc\.2/);
  assert.match(readme, /npm package has not been published/);
  assert.match(compatibility, /Do not infer compatibility from this package's engines\.dsh declaration alone/);
});
test("project declares no external runtime dependencies", async () => {
  const pkg = await readJson("../package.json");
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
  assert.equal(pkg.dsh.bundle, undefined);
});
