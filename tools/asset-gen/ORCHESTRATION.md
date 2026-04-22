# Asset Generation Pipeline — Orchestration Guide

## Architecture (V2)

The pipeline is split between **scripts** (deterministic, runnable on command)
and **the orchestrating Claude Code session** (which drives screening using its
native Agent tool — no external API key, no separate "API caller" scripts).

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   ComfyUI    │ ──▶ │  Node scripts │ ──▶ │  Claude Code │ ──▶  approved/
│  (image gen) │     │ (prep/filter) │     │  (screening)  │       rejected/
└──────────────┘     └──────────────┘     └──────────────┘       revise/
```

### Scripts (deterministic)

| Script | Role |
|--------|------|
| `extract-palette.mjs`     | One-time setup: build merged Echoes + Denzi palette and reference sheets |
| `gen-batch.mjs`           | Submit prompts to ComfyUI HTTP API; download candidates |
| `post-process.mjs`        | Background removal, nearest-neighbor downscale, palette remap |
| `technical-gate.mjs`      | Round 0: pure-Sharp checks (dims, alpha, color count, palette distance) |
| `prepare-screening.mjs`   | Build per-candidate comparison images (zoom, vs-peers, etc.); write `screening-queue.json` |
| `build-review-gallery.mjs`| After screening: build self-contained HTML for human review |
| `integrate-approved.mjs`  | Move approved sprites into `assets/art/`, optionally update manifest |

### Claude Code session (the orchestrator)

`agents/*.mjs` files are **prompt templates** — they export a `buildPrompt({...})`
function. The orchestrating Claude Code session:

1. Reads `screening-queue.json` (produced by `prepare-screening.mjs`).
2. For each candidate:
   - For each of the 9 agents in `agents/`, calls `buildPrompt(...)` with the
     candidate's prepared image paths.
   - Spawns 9 subagents **in parallel** via the native Agent tool.
   - Each subagent reads the images and returns a JSON verdict.
3. Aggregates verdicts per candidate, writes to `screened/agent-verdicts/{label}.json`.
4. Writes `screened/final-ranked.json` summarizing all candidates.

This means screening is interactive: when the user wants to screen a batch,
they ask Claude Code to do it. No API key is required because the orchestrator
*is* a Claude session.

## End-to-end command sequence

```bash
# One-time setup
node tools/asset-gen/extract-palette.mjs

# Per batch
node tools/asset-gen/gen-batch.mjs --category items
node tools/asset-gen/post-process.mjs --category items
node tools/asset-gen/technical-gate.mjs
node tools/asset-gen/prepare-screening.mjs --category items
# >>> at this point, ask Claude Code:
#     "Screen the candidates in tools/asset-gen/screened/screening-queue.json
#      using the prompt templates in tools/asset-gen/agents/."
node tools/asset-gen/build-review-gallery.mjs
# >>> open review-gallery.html, click Approve/Reject/Revise, export decisions
node tools/asset-gen/integrate-approved.mjs --apply --update-manifest
```

## Aggregation rules

| Round | Pass criterion | Notes |
|-------|----------------|-------|
| 0 (Technical) | All checks pass | Hard filter: dimensions, alpha ratio, color count, palette distance |
| 1 (Aesthetic) | Majority vote: ≥2 of 3 agents pass AND avg score ≥ `pass_threshold` (config) | 3 fails → instant cut |
| 2 (UI Context) | Majority vote (same as Round 1) | Skipped if no Playwright scene composites available |
| 3 (Adversarial) | NO veto from any agent (high-confidence "fail" with `confidence ≥ 0.8`) | One-vote-rejection |

Final score = `aestheticAvg * 0.35 + uiContextAvg * 0.35 + adversarialMin * 0.30`.

## Skipping Round 2 in early stages

Round 2 needs a real game scene with the candidate sprite composited in.
That requires:
- The Cocos preview server running (`npm run preview`)
- A Playwright helper that loads a scene, composites the candidate, screenshots

Until that helper is wired, run screening with **only Rounds 1 + 3**. The
6 active agents are still strong enough to catch off-style assets — the
Denzi helmet demo was unanimously rejected by 6/6 agents at avg score 3.3.

## File map

```
tools/asset-gen/
├── ORCHESTRATION.md                 # this file
├── config.json                      # pipeline-wide settings
├── extract-palette.mjs              # palette + reference sheet generator
├── gen-batch.mjs                    # ComfyUI driver
├── post-process.mjs                 # downscale + palette remap
├── technical-gate.mjs               # Round 0 filter
├── prepare-screening.mjs            # build per-candidate work images
├── build-review-gallery.mjs         # human review HTML
├── integrate-approved.mjs           # ship approved sprites into assets/art
├── agents/                          # prompt templates (no API calls)
│   ├── shared.mjs                   # verdict schema + JSON extractor
│   ├── aesthetic-a-style-fidelity.mjs
│   ├── aesthetic-b-silhouette-clarity.mjs
│   ├── aesthetic-c-color-harmony.mjs
│   ├── ui-a-readability.mjs
│   ├── ui-b-theme-coherence.mjs
│   ├── ui-c-scale-proportion.mjs
│   ├── adversarial-a-artifact-hunter.mjs
│   ├── adversarial-b-consistency-breaker.mjs
│   └── adversarial-c-tone-mismatch.mjs
├── prompts/                         # ComfyUI prompt templates per category
├── comfyui-workflows/               # ComfyUI API workflow JSONs
├── reference-sheets/                # Echoes palette + Denzi technique sheets
├── generated/                       # raw ComfyUI output (per category subdir)
├── screened/
│   ├── round0-results.json          # technical-gate output
│   ├── screening-queue.json         # prepare-screening output
│   ├── agent-verdicts/              # one JSON per candidate (verdict bundle)
│   ├── final-ranked.json            # screening summary
│   └── work/{label}/                # per-candidate prepared images
├── approved/                        # human-approved sprites (intermediate)
└── rejected/                        # rejected sprites (with round annotation)
```
