# Tile Generation Prompt Rework Task

You are an expert in SDXL / Pixel Art XL LoRA prompt engineering for Cocos Creator games styled like *The Legend of Zelda: Echoes of Wisdom*. A ComfyUI pipeline generated 7 seamless outdoor tile textures (grass, paths, walls). All 7 failed the tile-specific adversarial screening (`composite` scores 3.93–4.92), with very consistent R3 complaints: seam mismatch at edges, focal-point macro features that become visible polka-dots when tiled, muddy/realistic palette instead of bright Hyrule outdoor mood.

Your job: read the current 7 tile gen prompts, read 3 worst failing candidate PNGs, read the adversarial R3 verdicts that explain WHY they failed, and produce 7 improved gen prompts that specifically address those defects.

## Working directory

`E:\cv5\wisdom\tools\asset-gen`

## Inputs to read

### 1. Current tile gen prompts
`prompts/tiles.jsonl` — 7 lines, one JSON per line, each with `{id, category, resolution, prompt, negative}`.

### 2. The 3 worst failing candidate images (visually inspect them)
- `generated/tile/outdoor_wall_standard_v00.png` (composite 3.93)
- `generated/tile/outdoor_wall_broken_v00.png` (composite 3.93)
- `generated/tile/outdoor_path_cobble_v00.png` (composite 4.10)

For each: describe what you see and what's wrong (focal hotspot? muddy color? visible seam? too dense? too random?).

### 3. Adversarial R3 verdict reasoning for the worst 3

For each of the 3 worst candidates, read these 3 R3 verdict files:
```
screened/raw-verdicts/{candidate}__adversarial_a_artifact_hunter.json
screened/raw-verdicts/{candidate}__adversarial_b_consistency_breaker.json
screened/raw-verdicts/{candidate}__adversarial_c_tone_mismatch.json
```

Extract the specific defects they name (seam break coordinates, focal cluster description, palette issue).

### 4. Also sample 2 tiles that scored somewhat better to see what's working (contrastive)
- `generated/tile/outdoor_ground_green_v00.png` (composite 4.92, R3min=2)
- `generated/tile/outdoor_ground_ruins_v00.png` (composite 4.87, R3min=3)

Read their R3 adversarial verdicts too (same filename pattern). What (if anything) is relatively better?

### 5. Context about the pipeline

- Base model: SDXL 1.0 + Pixel Art XL LoRA (weight 1.0)
- Generation resolution: 1024×1024, then nearest-neighbor downscale 8× to 32×32
- Config: `config.json` / `generation.presets.standard_quality` (cfg_scale 7.5, 28 steps, dpmpp_2m_sde, karras)
- The prompt must produce a SEAMLESS tiling texture: column 0 must match column 31, row 0 must match row 31, when tiled 3×3 there must be NO obvious focal stamp repeating as a visible polka-dot.
- Art direction: bright saturated Hyrule outdoor mood (sunny greens, warm browns, cheerful tans) — NOT muddy AAA-realistic, NOT grim dungeon.
- Scale: each tile is 32×32. Foreground sprite/player will be ~32×32 too — so the tile should be LOWER visual energy than sprites (background supportive).

### 6. A known pattern for SDXL seamless tile prompts

Community-proven tricks for forcing tileability:
- Explicit phrases: "seamless repeating texture", "edges wrap perfectly", "tileable", "no borders", "no seams", "no central focal point", "evenly distributed", "balanced density across the frame".
- Negative prompt: "border, frame, single object, focal subject, centered composition, vignette, isolated, sprite".
- Avoid "hero" composition language ("focal", "centerpiece", "stunning centerpiece"). Avoid any "single large" object.

## Your output

Write to: `E:\cv5\wisdom\tools\asset-gen\audit\codex_tile_prompt_proposal.md`

Structure:
```
# Tile Prompt Rework Proposal

## Failure analysis (per candidate)
### outdoor_wall_standard_v00 (3.93)
Visual: ...
R3 defects named: ...
Root cause in current prompt: ...

### outdoor_wall_broken_v00 (3.93)
...

### outdoor_path_cobble_v00 (4.10)
...

### outdoor_ground_green_v00 (4.92) — relatively better
What's working: ...

### outdoor_ground_ruins_v00 (4.87) — relatively better
What's working: ...

## Common failure patterns across all 7
1. ...
2. ...
3. ...

## Proposed new prompts

Produce 7 replacement JSONL lines below, one per tile id. Preserve `id` and `category: "tile"` and `resolution: "standard"`. Rewrite `prompt` and `negative`. Each prompt should:
- Explicitly call out seamless/tileable/edge-wrap
- Explicitly ban centered focal subject and visible repeats
- Specify evenly-distributed low-contrast macro features
- Specify target color mood per surface type (green/stone/path etc.)
- Keep Echoes-of-Wisdom flavor intact
- Use SDXL + Pixel Art XL LoRA conventions

Output the 7 replacement lines as a proper JSONL code block I can paste directly into prompts/tiles.jsonl.

## Testing recommendations
Short paragraph on how to tell if the new prompts are working after regeneration.
```

Under 1500 words. Do not modify any files, just write your proposal to the target markdown file. Do not run the pipeline.
