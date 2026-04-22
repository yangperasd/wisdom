# Codex Task — Handle 16 Reject/Revise Candidates

Human review produced 9 rejects and 7 revises. Each had a top-1 candidate chosen by auto-select-top, but for every prompt there are 8 candidates generated (v00–v07). The top-1 was the best per R0 + screening agent scores — but the agents were proven over-strict relative to the human, so a lower-ranked sibling may actually be more aligned with human taste.

Your job:
1. For each rejected/revised candidate, look at all 8 sibling candidates (v00–v07) that exist on disk. Identify if any sibling better matches the prompt's stated intent + the human's rejection reason. Pick the best replacement, or declare "no usable sibling — prompt must be rewritten".
2. For the 2 rejects with explicit notes (`icon_echo_box` "不像 box", `pause_button` "看不出暂停的感觉"), propose a rewritten gen prompt that directly addresses the specific defect.
3. For any tile-category reject (outdoor_wall_standard, outdoor_wall_cracked, outdoor_ground_flowers), also declare whether you believe a prompt-level fix is worth one more try or if tiles should go to hand-paint per your previous recommendation in `audit/codex_tile_audit2_report.md`.

## Working directory

`E:\cv5\wisdom\tools\asset-gen`

## The 16 candidates

### Rejects (9)
1. `icon_echo_box_v00` (icon) — note: "不像 box" (doesn't look like a box)
2. `pause_button_v03` (button) — note: "看不出暂停的感觉" (doesn't feel like pause)
3. `system_pause_icon_v00` (icon) — no note
4. `key_boss_v01` (key) — no note
5. `echo_box_idle_v07` (summon) — no note
6. `outdoor_wall_standard_v00` (tile) — no note
7. `outdoor_wall_cracked_v04` (tile) — no note
8. `outdoor_ground_flowers_v01` (tile) — no note
9. `vfx_arrow_trail_v01` (trail) — no note

### Revises (7)
1. `potion_mana_v04` (consumable)
2. `bar_health_fill_v00` (bar)
3. `scroll_fire_v01` (consumable)
4. `touch_attack_button_v02` (button)
5. `touch_echo_button_v03` (button)
6. `outdoor_path_cobble_v00` (tile)
7. `outdoor_wall_broken_v00` (tile)

## Inputs per candidate

For each of the 16:
- The original prompt from `prompts/{category-file}.jsonl` (find by `id` matching the candidate name without `_v\d+$`)
- All 8 sibling PNGs at `generated/{category-folder}/{promptId}_v0[0-7].png`
- (Optional context) the R0 results in `screened/round0-results.json` to see which siblings passed/failed R0

## Your process per candidate

1. Read the prompt text.
2. Visually inspect all 8 v-siblings.
3. Pick the **best sibling** that best matches the prompt intent AND avoids the human's rejection reason (if noted).
4. If no sibling is clearly better than the current top-1: declare "needs prompt rewrite" and explain the structural defect.
5. If prompt rewrite needed AND you can propose a concrete better prompt: write it out.

## Output

Write to: `E:\cv5\wisdom\tools\asset-gen\audit\codex_revise_report.md`

Structure:
```
# Revise/Reject Handling Proposal
Timestamp: <now>

## Summary
- N candidates with better sibling identified: ...
- N candidates needing prompt rewrite: ...
- N tile candidates: recommendation
- Total actionable items: ...

## Per-candidate findings

### icon_echo_box_v00 (REJECT — "不像 box")
Current: v00 shows ...
Siblings scanned: v01..v07
Best sibling: vXX — describe why it's better (or "no sibling fixes the issue")
If no good sibling, proposed rewritten prompt:
```jsonl
{"id":"icon_echo_box", ...}
```
Reasoning: ...

### pause_button_v03 (REJECT — "看不出暂停的感觉")
...

### ... (all 16)

## Tile verdict
Based on your prior audit (`codex_tile_audit2_report.md`) and these 3 rejected tiles + 2 revise tiles, final recommendation: ONE MORE prompt rewrite cycle (defended), OR abandon auto-gen for tiles (defended).

## Actionable output

List of EXACTLY these actions the pipeline should take:

REPLACE (N items) — swap top-1 to sibling:
- icon_echo_box_v00 → v02
- ...

REWRITE_AND_REGEN (N items) — modify prompt + regen:
- ...

GIVE_UP (N items) — tile/trail surrenders:
- ...
```

Budget: 2000 words max. Do not modify any files. Do not run the pipeline.
