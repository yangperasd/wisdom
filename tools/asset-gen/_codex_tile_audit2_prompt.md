# Codex Audit #2 — Tile Rework Verification

You are the same independent adversarial auditor who previously:
1. Audited the full pipeline (see `audit/codex_audit_report.md` if it exists — you wrote it).
2. Proposed 7 replacement tile prompts (see `audit/codex_tile_prompt_proposal.md` — you wrote it).

Your replacement prompts were applied. 56 new tile candidates were generated, post-processed, and run through the tile-specific R1/R2/R3 rubric. Now verify whether your own rework actually helped, and diagnose what's left.

## Working directory

`E:\cv5\wisdom\tools\asset-gen`

## Task 1 — Independent before/after comparison

The old tile scores before your rework (composite, before/after):

| tile | old composite | old R3min |
|---|---|---|
| outdoor_wall_standard_v00 | 3.93 | 3 |
| outdoor_wall_broken_v00 | 3.93 | 3 |
| outdoor_path_cobble_v00 | 4.10 | 2 |
| outdoor_ground_green_v00 | 4.92 | 2 |
| outdoor_ground_ruins_v00 | 4.87 | 3 |
| outdoor_wall_cracked_v03 | 4.87 | 3 |
| outdoor_ground_flowers_v00 | (not recorded) | — |

Read `screened/final-ranked.json`, extract the 7 current tile candidates' `synthesis.finalScore`, `overallPassed`, R1 avg, R2 avg, R3 min. Compute actual deltas from the old table above (where recorded). Is there a statistically meaningful improvement or is the rework a wash?

## Task 2 — Verify the peer-reference contamination suspicion

You previously suggested "the current consistency-breaker peer comparison appears partially contaminated by mismatched icon references" when evaluating tiles.

Investigate by:
1. Read `prepare-screening.mjs` to find how `c.vsPeers` and `c.vsPeersWarm` paths are constructed. For a category like `tile`, what reference sheet does it use?
2. Read `pickReferenceImage(category)` in `gen-batch.mjs` (or wherever it's defined) — what image does category `tile` map to?
3. Look at `reference-sheets/` directory. What tile-specific reference sheet exists, if any? Is it actually a sheet of tiles or is it a sheet of icons/sprites?
4. For one tile candidate (e.g. `outdoor_wall_standard_v01`), open its prepared `vs-peers.png` and `vs-peers-warm.png` files in `screened/prepared-images/` or wherever prepare-screening outputs them. Is the "peer" side of the comparison actually tile-like, or is it sprite/icon images?

REPORT:
- Actual peer reference used for tiles
- Whether it's tile-appropriate or contaminated
- If contaminated, name the specific defect and where the bug is in the code

## Task 3 — Sample the new tile R3 adversarial verdicts

For the 2 new tile candidates that improved most (wall_standard and wall_broken) AND the 2 that regressed (ground_ruins and wall_cracked), read their 3 adversarial R3 verdict files from `screened/raw-verdicts/`.

For each, extract:
- The specific defects named (seam? focal hotspot? palette?)
- Whether the agent references the tile-specific rubric (geometry check, macro pattern, 3x3 mental tiling)
- Whether the agent falsely applies sprite rubric (silhouette, sticker test, outline)

Summarize: what is STILL going wrong in the new tiles that the prompt didn't fix? What's going RIGHT for the 2 improvers?

## Task 4 — Recommendation

Based on tasks 1-3, give ONE of these verdicts and defend it:

**A) Tiles are fixable with one more prompt iteration.** Your evidence must name specifically what to change in which of the 7 prompts, referencing the R3 defects that the current prompts failed to address. Don't propose vague changes; name specific negative tokens or positive directives.

**B) Tiles are fixable but need a different generation approach.** E.g. switch to a different model / LoRA, increase batch count to cherry-pick, use img2img from a known-good seed, etc. Defend why prompt alone is insufficient.

**C) Tiles are not worth more automated generation effort.** Recommend hand-painting the 7 tiles or using existing Denzi tile assets from `E:\cv5\wisdom\assets\art\` (you may need to search for what exists). Defend why the ceiling is low for this pipeline.

**D) The rubric/agents are wrong, not the tiles.** If you believe the R2/R3 agents are still category-mismatched or contaminated (and Task 2 found evidence), recommend what rubric changes would properly evaluate tiles. Don't just say "loosen the threshold" — name the actual agent logic flaw.

Your recommendation goes to a human who has to decide whether to keep investing time in this pipeline for tiles or pivot. Be concrete.

## Output format

Write to: `E:\cv5\wisdom\tools\asset-gen\audit\codex_tile_audit2_report.md`

Structure:
```
# Codex Tile Audit #2 — Rework Verification
Timestamp: <now>

## Task 1: Before/After Comparison
Table with actual deltas, statistical judgment.

## Task 2: Peer Reference Contamination Investigation
Findings from code + files + prepared images.

## Task 3: What Still Goes Wrong (new R3 samples)
Per candidate findings. Cross-candidate patterns.

## Task 4: Recommendation
[A / B / C / D] — with concrete evidence-backed defense.
```

Under 1500 words. Do not modify files. Do not run the pipeline. Only read and analyze.
