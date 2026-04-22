#!/usr/bin/env bash
# run-post-gen-pipeline.sh
#
# Runs the deterministic post-generation pipeline end-to-end:
#   1. post-process.mjs  (downscale, bg removal, palette remap)
#   2. technical-gate.mjs (Round 0 filter)
#   3. auto-select-top.mjs (pick best per prompt)
#   4. prepare-screening.mjs --from-auto-selected (build comparison images + scene composites)
#   5. build-screening-tasks.mjs (emit agent-tasks.json that Claude Code dispatches)
#
# After this script completes, the orchestrating Claude Code session reads
# agent-tasks.json and spawns agents in parallel batches, then runs aggregate.mjs
# and build-review-gallery.mjs.

set -e
cd "$(dirname "$0")/../.."

echo "================================================================"
echo "  Post-generation pipeline"
echo "================================================================"

echo ""
echo "[1/5] post-process: downscale + bg removal + palette remap..."
node tools/asset-gen/post-process.mjs 2>&1 | tail -5

echo ""
echo "[2/5] technical-gate Round 0..."
node tools/asset-gen/technical-gate.mjs 2>&1 | tail -3

echo ""
echo "[3/5] auto-select-top (top-1 per prompt)..."
node tools/asset-gen/auto-select-top.mjs --top 1 2>&1 | tail -10

echo ""
echo "[4/5] prepare-screening from auto-selected..."
node tools/asset-gen/prepare-screening.mjs --from-auto-selected 2>&1 | tail -5

echo ""
echo "[5/5] build agent-tasks.json..."
node tools/asset-gen/build-screening-tasks.mjs 2>&1 | tail -5

echo ""
echo "================================================================"
echo "  Pipeline complete. Next: Claude Code dispatches agent tasks."
echo "  Tasks file: tools/asset-gen/screened/agent-tasks.json"
echo "================================================================"
