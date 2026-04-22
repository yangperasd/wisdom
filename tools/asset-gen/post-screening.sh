#!/bin/bash
# Post-screening pipeline: merge raw verdicts, aggregate, build review gallery.
# Run after dispatch-screening.mjs has populated raw-verdicts/.
set -e
cd "$(dirname "$0")/.."  # -> tools/asset-gen
ROOT="$(cd .. && pwd)"
echo "=== Step 1: merge-raw-verdicts.mjs ==="
node asset-gen/merge-raw-verdicts.mjs
echo ""
echo "=== Step 2: aggregate.mjs ==="
node asset-gen/aggregate.mjs
echo ""
echo "=== Step 3: build-review-gallery.mjs ==="
node asset-gen/build-review-gallery.mjs
echo ""
echo "=== DONE. Open: $ROOT/tools/asset-gen/review-gallery.html ==="
