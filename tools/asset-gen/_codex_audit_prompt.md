# Independent Adversarial Audit of Asset Generation Pipeline

You are an independent adversarial auditor. A different AI (Claude) built a ComfyUI-based asset generation pipeline for a Cocos Creator game project and has made claims about its output. Your job: verify everything on disk, find discrepancies, call out hallucinations. Cite file paths and exact numbers for every claim you make. Hallucinating counts or inventing numbers will get your audit thrown out.

## Working directory

`E:\cv5\wisdom\tools\asset-gen` — everything below is relative to this path.

## Claims Claude made (you must verify each)

1. **82 prompts total** across 5 jsonl files: `prompts/items.jsonl` (31), `prompts/echoes.jsonl` (9), `prompts/effects.jsonl` (15), `prompts/ui.jsonl` (20), `prompts/tiles.jsonl` (7).
2. **24 new prompts added this session**, the rest pre-existing.
3. **Total generated PNG files under `generated/*/`** — claim is close to 656 (one corrupt pre-existing weapon `sword_ice_v06.png` was just deleted, so now 655).
4. **500 passed Round 0** in `screened/round0-results.json` (results[] with `.passed` field).
5. **82 candidates auto-selected** in `screened/auto-selected.json` (one top per prompt).
6. **765 raw verdict files** in `screened/raw-verdicts/` (255 per round × 3 rounds: R1 aesthetic, R2 UI context, R3 adversarial).
7. **82 aggregated bundles** in `screened/agent-verdicts/` (down from 85 after removing 3 stale bundles with incomplete R2/R3).
8. **`screened/final-ranked.json` summary** should show: total=82, incomplete=0, passed=2, failed=80, avgScore ~5.57. The 2 passes claimed are `echo_flower_idle_v02` (fs=6.87) and `echo_flower_active_v05` (fs=6.33).
9. **Tile rubric change was applied**: `build-screening-tasks.mjs` now branches on `c.category === 'tile'` and returns tile-specific agent prompts (seamless edge check, macro-density check, no silhouette penalty). Check the file exists and contains the `isTile(c)` helper.
10. **aggregate.mjs now filters incomplete bundles**: should have `hasR1/hasR2/hasR3` checks that push to an `incomplete` array instead of main results. Check for this defensive filtering code.

## Your tasks

### A. Numeric verification (every claim above)

For each of the 10 claims above, compute the actual number from disk and report VERIFIED or REFUTED with actual vs claimed numbers. Use Node.js / jq / wc as appropriate. Do NOT trust Claude's numbers — derive them yourself.

### B. Sanity check 5 random raw-verdict files

Pick 5 files from `screened/raw-verdicts/`. Read each. For each verify:
- `reasoning` field is non-empty substantive text (not "..." or "TODO" or empty)
- `score` is an integer 1-10
- `verdict` is one of pass/marginal/fail
- Reasoning is actually about the referenced image (not boilerplate)
Any stubbed / empty / copy-pasted reasoning is a RED FLAG.

### C. Sanity check aggregator logic on a known case

Read `screened/agent-verdicts/echo_flower_idle_v02.json`. Manually compute composite = R1_avg*0.35 + R2_avg*0.35 + R3_min*0.30. Does `synthesis.finalScore` match? Does `synthesis.overallPassed` match a reasonable pass rule?

### D. Verify tile rubric is actually being applied

For a tile candidate, the R1/R2/R3 verdict files should contain reasoning that references tile-specific concerns (seamless edges, tileability, macro density) rather than sprite concerns (silhouette, sticker test, 1px outline).

Pick one tile candidate from auto-selected.json's tile entries (e.g. `outdoor_wall_standard_v00`). Read one of its raw-verdict files from `screened/raw-verdicts/` (e.g. `outdoor_wall_standard_v00__aesthetic_b_cute_clarity.json`). Does the reasoning demonstrate the agent was given tile-specific instructions (talks about edges/tileability/macro pattern) or is it still applying sprite rubric (silhouette/sticker)?

### E. Find red flags Claude might have missed

- Any candidate_name in auto-selected.json without a matching bundle in agent-verdicts?
- Any bundle in agent-verdicts without a matching raw-verdicts trio?
- Any obvious wrong-category assignments (e.g. a weapon bundled as armor)?
- Any score suspiciously identical across many candidates (possible stubbed agent)?
- Any agent_id mismatches between expected and actual?

### F. Actually look at one PNG

Read the PNG file `generated/tile/outdoor_wall_standard_v00.png` (32x32 or similar). Its R3min was claimed to be 3 (mediocre) after new tile rubric. Describe what you see. Does the low score seem warranted, or is the image obviously good/bad?

## Output format

Write your audit to: `E:\cv5\wisdom\tools\asset-gen\audit\codex_audit_report.md`

Structure:
```
# Codex Independent Audit Report
Timestamp: <now>

## A. Numeric verification (10 claims)
- Claim 1: VERIFIED/REFUTED — actual numbers
- Claim 2: ...
...

## B. Raw verdict sanity (5 random files)
...

## C. Aggregator logic check
Claimed: ... Computed: ... Match: yes/no

## D. Tile rubric application
Observation: rubric applied correctly / still applying sprite rubric
Evidence: direct quotes from verdict reasoning

## E. Red flags
- (list) or "none"

## F. Visual check of outdoor_wall_standard_v00
Observation: ...
Score judgment: warranted / too harsh / too lenient

## Overall verdict
[TRUSTWORTHY / PROBLEMATIC] — 1-3 sentences
```

Under 1200 words. Do not modify any files. Do not run the pipeline. Only read files, parse JSON, view images.
