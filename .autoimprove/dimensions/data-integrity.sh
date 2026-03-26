#!/usr/bin/env bash
# data-integrity.sh — Data integrity score (pure-node implementation)
# Lower is better.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

node -e "
const fs = require('fs');
const path = require('path');

function walkSync(dir, ext) {
  let results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git') {
        results = results.concat(walkSync(full, ext));
      } else if (e.isFile() && ext.some(x => e.name.endsWith(x)) && !e.name.includes('.test.')) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

const files = walkSync('src', ['.ts', '.tsx']);
let issues = 0;

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');

  // 1. 'as unknown as' double-casts
  const doubleCasts = (content.match(/as unknown as/g) || []).length;
  issues += doubleCasts;

  // 2. 'as any' casts (weighted 2x)
  const asAny = (content.match(/as any/g) || []).length;
  issues += asAny * 2;

  // 3. .from() calls without matching error checks
  const fromCount = (content.match(/\.from\(/g) || []).length;
  const errorCount = (content.match(/\.error|error\}|error:|error,|Error\(|console\.error|if\s*\(.*error/g) || []).length;
  if (fromCount > errorCount) {
    issues += fromCount - errorCount;
  }

  // 4. .data! non-null assertions
  const bangData = (content.match(/\.data!/g) || []).length;
  issues += bangData;
}

console.log(issues);
"
