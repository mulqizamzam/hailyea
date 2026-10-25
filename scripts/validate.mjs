#!/usr/bin/env node
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
const root = process.cwd();
const problems = [];
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
function assert(condition, message) { if (!condition) problems.push(message); }
try {
  const pkg = await readJson('package.json');
  const manifest = await readJson('dsh.plugin.json');
  assert(pkg.name === 'dsh-hailyea', 'package name must be dsh-hailyea');
  assert(pkg.author === 'mulqizamzam', 'package author must be mulqizamzam');
  assert(pkg.engines?.dsh === '0.2.1-rc.2', 'package must declare requested DSH target');
  assert(manifest.name === pkg.name && manifest.version === pkg.version, 'manifest identity/version mismatch');
  assert(manifest.author === pkg.author, 'manifest author mismatch');
  assert(!pkg.dependencies && !pkg.devDependencies, 'unreviewed dependencies are not allowed');
  const skillsDir = resolve(root, 'skills');
  const entries = await readdir(skillsDir, { withFileTypes: true });
  assert(entries.length > 0, 'skills/ must contain at least one Skill');
  for (const entry of entries) {
    const skillFile = resolve(skillsDir, entry.name, 'SKILL.md');
    try {
      const s = await stat(skillFile);
      assert(s.isFile(), 'SKILL.md must be a regular file');
      const body = await readFile(skillFile, 'utf8');
      const match = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n\r?\n([\s\S]+)$/);
      assert(Boolean(match), 'Skill needs frontmatter and a non-empty body');
      if (match) {
        assert(/^name:\s*[a-z0-9]+(?:-[a-z0-9]+)*\s*$/m.test(match[1]), 'Skill name must be kebab-case');
        assert(/^description:\s*\S.+$/m.test(match[1]), 'Skill description is required');
      }
    } catch { problems.push('missing or unreadable ' + relative(root, skillFile).split(sep).join('/')); }
  }
  for (const path of ['README.md','LICENSE','NOTICE.md','CHANGELOG.md','docs/compatibility.md','docs/architecture.md']) {
    try { await stat(resolve(root,path)); } catch { problems.push('required file missing: ' + path); }
  }
  const readme = await readFile(resolve(root,'README.md'),'utf8');
  assert(readme.includes(pkg.author), 'README must disclose maintainer');
  assert(!readme.includes('NationalSecurityAgency/ghidra'), 'README must not contain reference repository URL');
} catch (error) { problems.push('validation setup failed: ' + error.message); }
if (problems.length) { console.error('Validation failed:\n- ' + problems.join('\n- ')); process.exitCode = 1; }
else console.log('Validation passed: metadata, target, Skill shape, and documentation.');
