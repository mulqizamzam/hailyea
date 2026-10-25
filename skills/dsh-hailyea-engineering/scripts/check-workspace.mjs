#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
const checks = [
  ['working tree', 'git', ['status', '--short']],
  ['runtime', 'node', ['--version']],
  ['package metadata', 'npm', ['pkg', 'get', 'name', 'version', 'engines']]
];
let failed = false;
for (const [label, command, args] of checks) {
  const result = spawnSync(command, args, { encoding: 'utf8', shell: false });
  const ok = result.status === 0;
  console.log('\n[' + (ok ? 'ok' : 'fail') + '] ' + label + ': ' + command + ' ' + args.join(' '));
  if (result.stdout?.trim()) console.log(result.stdout.trim());
  if (result.stderr?.trim()) console.error(result.stderr.trim());
  if (!ok) failed = true;
}
process.exitCode = failed ? 1 : 0;
