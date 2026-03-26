#!/usr/bin/env bash
# tests.sh — Test coverage score
# Output: 100 - line_coverage_percent. Lower is better.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

# Run vitest with coverage (suppress output)
npx vitest run --coverage > /dev/null 2>&1 || true

# Read coverage summary file
NODE_CWD="$(pwd -W 2>/dev/null || pwd)"
node -e "
  const fs = require('fs');
  const path = require('path');
  const summaryPath = path.join('$NODE_CWD', 'coverage', 'coverage-summary.json');
  try {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const pct = summary.total?.lines?.pct || 0;
    console.log((100 - pct).toFixed(1));
  } catch {
    console.log('100.0');
  }
"
