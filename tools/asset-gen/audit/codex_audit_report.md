# Codex Independent Audit Report
Timestamp: 2026-04-17T13:14:58+08:00

## A. Numeric verification (10 claims)
- Claim 1: VERIFIED - `prompts/items.jsonl=31`, `prompts/echoes.jsonl=9`, `prompts/effects.jsonl=15`, `prompts/ui.jsonl=20`, `prompts/tiles.jsonl=7`; total `82`.
- Claim 2: VERIFIED, but only from on-disk helper scripts, not VCS history - `audit/_add_new_prompts.py` enumerates `24` added prompt IDs, `_r0_summary.mjs` uses the same `24`-ID list, all `24/24` IDs are present in current prompt files, so current split is `24 new + 58 other = 82`. `git status -- tools/asset-gen` shows `tools/asset-gen/` is untracked, so "this session" is not independently auditable from git.
- Claim 3: VERIFIED for current disk state - `generated/*/*.png` contains `655` PNGs. `screened/round0-results.json` still references `656` files; the only file referenced there but missing from `generated/` is `weapon/sword_ice_v06.png`.
- Claim 4: VERIFIED - `screened/round0-results.json` has `656` `results[]` entries; `500` have `"passed": true`.
- Claim 5: VERIFIED - `screened/auto-selected.json` has `82` entries in `selected`; they cover `82` unique `promptId`s, so it is exactly one top pick per prompt.
- Claim 6: VERIFIED - `screened/raw-verdicts/` has `765` JSON files: `255` `aesthetic_*`, `255` `ui_*`, `255` `adversarial_*`.
- Claim 7: VERIFIED on count, dubious on explanation - `screened/agent-verdicts/` has `82` bundle files. But there are also `3` extra complete raw-only candidate sets in `screened/raw-verdicts/` with no bundle: `icon_echo_flower_v00`, `panel_dialog_v07`, `panel_inventory_v05` (`9` raw files each, `27` total). That does not match the story "3 stale bundles with incomplete R2/R3."
- Claim 8: VERIFIED - `screened/final-ranked.json` summary is exactly `total=82`, `incomplete=0`, `passed=2`, `failed=80`, `avgScore=5.57`. The only passes are `echo_flower_idle_v02` (`6.87`) and `echo_flower_active_v05` (`6.33`).
- Claim 9: VERIFIED - `build-screening-tasks.mjs` exists. It contains `const isTile = (c) => c.category === 'tile';` at line `38`, and tile-specific branches at lines `41`, `70`, `95`, `122`, `149`, `176`, `201`, `226`, `252`.
- Claim 10: VERIFIED - `aggregate.mjs` lines `32`, `39-46`, and `65-66` create `incomplete`, compute `hasR1/hasR2/hasR3`, push incomplete bundles there, and exclude them from main `results`.

## B. Raw verdict sanity (5 random files)
- `screened/raw-verdicts/sword_fire_v00__adversarial_b_consistency_breaker.json`: score `5`, verdict `marginal`; reasoning is substantive and image-specific (fire sword palette, outlines, highlights, peer mismatch). Valid.
- `screened/raw-verdicts/panel_dialog_v01__aesthetic_c_color_harmony.json`: score `8`, verdict `pass`; reasoning discusses amber borders, parchment interior, teal gem accent, warm browns. Valid.
- `screened/raw-verdicts/coin_gold_v04__ui_a_readability.json`: score `7`, verdict `marginal`; reasoning is about scene placement, contrast, and confusion risk with nearby UI. Valid.
- `screened/raw-verdicts/food_apple_v00__ui_b_mood_coherence.json`: score `7`, verdict `marginal`; reasoning distinguishes the cheerful apple from the dark dungeon scene. Valid.
- `screened/raw-verdicts/key_boss_v01__aesthetic_b_cute_clarity.json`: score `4`, verdict `fail`; reasoning is specific about 1x collapse, light-bg washout, and angular "dungeon prop" feel. Valid.

No stubbed entries found in this sample: all 5 have non-empty substantive reasoning, integer `1-10` scores, and valid `pass|marginal|fail` verdicts.

## C. Aggregator logic check
Using `screened/agent-verdicts/echo_flower_idle_v02.json` and the formula in `merge-raw-verdicts.mjs:101-128`:

Claimed: `R1_avg*0.35 + R2_avg*0.35 + R3_min*0.30`

Computed: `((8+8+8)/3)*0.35 + ((8+8+6)/3)*0.35 + min(5,5,8)*0.30 = 8.00*0.35 + 7.33*0.35 + 5*0.30 = 6.87`

Match: yes. `synthesis.finalScore` is `6.87`.

`synthesis.overallPassed=true` also matches the implemented pass rule in `merge-raw-verdicts.mjs:35-52,128`: Round 1 majority pass, Round 2 majority pass, Round 3 no high-confidence veto fail.

## D. Tile rubric application
Observation: rubric applied correctly.

Evidence: `screened/raw-verdicts/outdoor_wall_standard_v00__aesthetic_b_cute_clarity.json` says `"GEOMETRY CHECK: (1) Col 0 vs col 31"` and flags a `"regular polka-dot grid of bright green-yellow focal points"`. `screened/raw-verdicts/outdoor_wall_standard_v00__adversarial_a_artifact_hunter.json` says `"3x3 mental tiling... reveals a visible seam grid"` and `"TILE SEAM FAIL."`

That is tile-specific reasoning about seams, edge matching, and macro repetition, not sprite-only language like sticker test or silhouette penalties.

## E. Red flags
- `screened/raw-verdicts/` contains `27` raw verdicts for `3` candidates with no bundle and no current auto-selected entry: `icon_echo_flower_v00`, `panel_dialog_v07`, `panel_inventory_v05`.
- Those `3` raw-only candidates each have a full `9/9` raw set, so Claude's explanation for claim 7 ("incomplete R2/R3") is not supported by disk.
- Prompt provenance is weak: the `24 new` count is script-backed (`audit/_add_new_prompts.py`), but `git` cannot confirm session history because `tools/asset-gen/` is untracked.
- I found no current auto-selected candidate missing a bundle (`0`), no bundled candidate missing any expected raw agent file (`0`), no category mismatches (`0`), and no agent/file-name mismatches (`0`).
- I found no exact duplicate reasoning texts across all `765` raw verdict files. Score clustering exists, though: `ui_b_mood_coherence` gave score `7` to `41/85` candidates.

## F. Visual check of outdoor_wall_standard_v00
Observation: `generated/tile/outdoor_wall_standard_v00.png` is `32x32`. Visually it is a tan/brown stone tile with several dark crack/void patches and one conspicuous green-yellow organic cluster near the middle-right. That cluster is large enough to become a repeating focal stamp when tiled.

Score judgment: warranted. The actual bundle in `screened/agent-verdicts/outdoor_wall_standard_v00.json` has `R3min=3`, `finalScore=3.93`, `overallPassed=false`; based on the visible focal motif and busy/noisy stone field, the low adversarial score does not look too harsh.

## Overall verdict
[PROBLEMATIC] Most headline counts were real, but Claude's narrative is not fully trustworthy: claim 2 is only helper-script-backed, not VCS-backed, and claim 7's explanation about incomplete bundles is contradicted by `27` complete raw verdict files for `3` unbundled candidates. The tile rubric and incomplete-bundle filtering code are real, and the final-ranked summary matches disk exactly.
