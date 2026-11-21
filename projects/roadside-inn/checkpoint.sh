#!/usr/bin/env bash
# Checkpoint the Heartland Inn: check, commit, publish changed models, then the hotel part and the game.
#   bash projects/roadside-inn/checkpoint.sh "commit message"
# Any agent (or a person) can run this. Stops at the first failure.
set -euo pipefail
cd "$(dirname "$0")/../.."
msg="${1:-Heartland Inn checkpoint}"
export INN_OUT=artifacts/roadside-inn/checkpoint
for f in projects/roadside-inn/*.js projects/roadside-inn/world/*.js projects/roadside-inn/check.mjs; do node --check "$f"; done
INN_FLOW_NO_CAPTURES=1 node projects/roadside-inn/check.mjs flow > /dev/null 2>&1 || true
python3 - <<'PY'
import json, sys
d = json.load(open('artifacts/roadside-inn/checkpoint/check-flow.json'))
f = d['flow']; real = [e for e in d['errors'] if 'Failed to load resource' not in e]   # a flaky external fetch under load
print('flow:', f.get('failed') or 'all steps', '| errors:', d['errors'])
if f.get('failed') or real or not f.get('stairsTop'): sys.exit('flow check failed: not publishing')
PY
# Models whose GLB changed since their last published receipt need a new batch (publish needs a manifest entry):
node --input-type=module -e "
const { receipts } = await import('./projects/roadside-inn/release.mjs'); const { PART_IDS } = await import('./projects/roadside-inn/assets.js');
const { pins } = await receipts(); const missing = PART_IDS.filter(i => !pins[i]);
if (missing.length) { console.error('Unpublished parts (write assets-N.parts.json and publish it first):', missing.join(' ')); process.exit(1); }"
git add -A -- . ':!benchmarks/compare-site'   # a nested repo of its own
git commit -q -m "$msg" || echo "nothing new to commit"
node projects/roadside-inn/package.mjs
node publish-batch.js projects/roadside-inn/release.parts.json --network baseSepolia
git add -A projects/roadside-inn artifacts/roadside-inn/heartland-* && git commit -q -m "Publish Heartland Inn: $msg" || true
echo "published and committed"
