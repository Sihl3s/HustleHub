/**
 * Syntax-checks the API. Node has no compile step, so the pipeline "build"
 * is a parse of every source file (Node.js, 2025).
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const roots = ['src', 'scripts'].map((name) => path.join(__dirname, '..', name));
const files = roots.flatMap((dir) => walk(dir));
let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} files.`);
