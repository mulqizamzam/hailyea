#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const runtimeRoot = process.env.DSH_RUNTIME_ROOT;
const skillRoot = process.env.HAILYEA_SKILL_DIR;
if (!runtimeRoot || !skillRoot) {
  throw new Error("DSH_RUNTIME_ROOT and HAILYEA_SKILL_DIR are required");
}

// Resolve the filesystem provider from the exact DSH installation used by CI,
// not from Hailyea's checkout or a floating development dependency.
const runtimeRequire = createRequire(resolve(runtimeRoot, "runtime-smoke.cjs"));
const providerEntry = runtimeRequire.resolve("@deepseek-ai/dsh-skill-filesystem");
const { FileSystemSkillProvider } = await import(pathToFileURL(providerEntry).href);
assert.equal(typeof FileSystemSkillProvider, "function", "DSH filesystem provider export is unavailable");

const warnings = [];
const ctx = {
  get() { return undefined; },
  logger: { warn(message) { warnings.push(String(message)); } },
};
const controller = new AbortController();
const providerName = "hailyea-runtime-smoke";
const provider = new FileSystemSkillProvider(
  ctx,
  { invalidate() {}, signal: controller.signal },
  {
    providerName,
    includeDefaultRoots: false,
    customSkillDirs: [resolve(skillRoot)],
    watch: false,
  },
);
const options = { cwd: process.cwd(), signal: controller.signal };

try {
  const observed = await provider.list(options);
  assert.ok(Array.isArray(observed), "Skill discovery returned an incomplete observation");
  const candidate = observed.find(item => item.name === "dsh-hailyea-engineering");
  assert.ok(candidate, "DSH filesystem provider did not discover dsh-hailyea-engineering");

  const definition = await provider.get(candidate, options);
  assert.ok(definition, "DSH filesystem provider failed to load the discovered Skill");
  assert.equal(definition.name, "dsh-hailyea-engineering");
  assert.equal(definition.provider, providerName);
  assert.match(definition.content, /Engineering Workflow/);
  assert.match(definition.content, /Stop conditions/);
  assert.equal(warnings.length, 0, `Unexpected Skill warnings: ${warnings.join("; ")}`);

  console.log("DSH runtime Skill smoke test passed: discovered and loaded dsh-hailyea-engineering.");
} finally {
  await provider.dispose();
  controller.abort();
}
