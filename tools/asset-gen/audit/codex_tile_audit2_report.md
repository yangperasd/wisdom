# Codex Tile Audit #2 - Rework Verification
Timestamp: 2026-04-17 16:45:13 +08:00

## Task 1: Before/After Comparison

| tile | current candidate | finalScore | overallPassed | R1 avg | R2 avg | R3 min | delta composite | delta R3min |
|---|---|---:|---|---:|---:|---:|---:|---:|
| outdoor_wall_standard | outdoor_wall_standard_v01 | 4.57 | no | 6.00 | 5.33 | 2 | +0.64 | -1 |
| outdoor_wall_broken | outdoor_wall_broken_v00 | 4.98 | no | 6.67 | 5.00 | 3 | +1.05 | 0 |
| outdoor_path_cobble | outdoor_path_cobble_v01 | 4.57 | no | 5.67 | 5.67 | 2 | +0.47 | 0 |
| outdoor_ground_green | outdoor_ground_green_v01 | 5.15 | no | 7.33 | 5.67 | 2 | +0.23 | 0 |
| outdoor_ground_ruins | outdoor_ground_ruins_v00 | 4.63 | no | 5.67 | 5.00 | 3 | -0.24 | 0 |
| outdoor_wall_cracked | outdoor_wall_cracked_v00 | 4.40 | no | 5.33 | 4.67 | 3 | -0.47 | 0 |
| outdoor_ground_flowers | outdoor_ground_flowers_v00 | 4.75 | no | 7.33 | 3.67 | 3 | n/a | n/a |

Judgment: the rework is mostly a wash. Across the 6 tiles with recorded baselines, mean composite change is only `+0.28`; 4 improved and 2 regressed, but a two-sided sign test is not meaningful (`p=0.6875`). More importantly, pass count did not move at all: all 7 current tiles still have `overallPassed=false`. R3 floor improved on none of the recorded tiles and got worse on `outdoor_wall_standard`.

## Task 2: Peer Reference Contamination Investigation

Findings:

- `prepare-screening.mjs` builds `c.vsPeers` and `c.vsPeersWarm` from `pickReferenceSheet(category)`. `tile` is not in that map, so it falls through to `items`, i.e. `reference-sheets/denzi-tech-items-ref.png`.
- `gen-batch.mjs` has the same bug in `pickReferenceImage(category)`. `tile` is missing there too, so tile generation is also conditioned on `denzi-tech-items-ref.png`.
- `reference-sheets/` contains no dedicated tile sheet such as `denzi-tech-tile-ref.png`. The closest tile-appropriate sheet is `denzi-tech-env-ref.png`, built from `assets/art/environment/dungeon/denzi` floor/wall/water tiles. The sheet actually being used, `denzi-tech-items-ref.png`, comes from `assets/art/items/...` and is helmets/shields/item sprites.
- I verified this against the prepared artifact, not just the code: the left panel of `screened/work/outdoor_wall_standard_v01/vs-peers.png` and `vs-peers-warm.png` is an exact pixel match to `denzi-tech-items-ref.png` once composited onto the same background. The peer side is sprite/icon imagery, not tiles.

Report:

- Actual peer reference used for tiles: `reference-sheets/denzi-tech-items-ref.png`
- Tile-appropriate or contaminated: contaminated
- Specific defect: missing `tile` mapping in both `prepare-screening.mjs` and `gen-batch.mjs`, causing tiles to fall back to the item/equipment sheet. That contaminates R3/B peer comparison and also feeds the wrong reference image into tile generation.

## Task 3: What Still Goes Wrong (new R3 samples)

`outdoor_wall_standard_v01`

- Real defects named: horizontal seam risk, row/edge mismatch, gradient bleed, blurry painted look, sub-pixel speckle, color bleed.
- Tile rubric usage: yes. `adversarial_a` explicitly does column/row checks and a 3x3 mental tiling test.
- Sprite-rubric leakage: indirect. `adversarial_b` correctly notices the peers are equipment icons, but still scores against icon traits like silhouette-driven shading, icon density, and metallic palette.
- What improved: tone is closer to the intended warm outdoor wall. The old focal-hotspot problem is no longer the main complaint.

`outdoor_wall_broken_v00`

- Real defects named: probable vertical seam, mortar-band mismatch, sub-pixel noise, melting brick edges, color bleed, random rose-dot accents.
- Tile rubric usage: yes. `adversarial_a` again uses geometry and 3x3 mental tiling.
- Sprite-rubric leakage: same contamination in `adversarial_b`; it compares a wall tile to armor/helmet icons.
- What improved: this is the clearest gain. The agent now reads it as a broken stone wall with acceptable warm palette and no giant cavity/rubble-pile failure mode.

`outdoor_ground_ruins_v00`

- Real defects named: col0/31 mismatch, row0/31 mismatch, non-tileable composition, yellow-dot noise scatter.
- Tile rubric usage: yes, strongly. `adversarial_a` calls it "composed as a scene" rather than a tile.
- Sprite-rubric leakage: `adversarial_b` is fully contaminated by icon peers. `adversarial_c` also explicitly notes the peer mismatch.
- What regressed: prompt change did not stop the model from making a scenic composition with canopy/ruin staging instead of a wrap-safe support texture.

`outdoor_wall_cracked_v00`

- Real defects named: bottom-edge seam band, uneven crack density top vs bottom, stray chromatic noise pixels, muted saturation, ambiguous pink accents.
- Tile rubric usage: yes. `adversarial_a` does the correct seam analysis.
- Sprite-rubric leakage: `adversarial_b` again judges against armor icons rather than tile peers.
- What regressed: the "hairline cracks woven evenly" directive did not hold. The output still concentrates crack energy near one edge, which is exactly the wrong failure mode for a repeating tile.

Cross-candidate pattern:

- What went right: the rework helped tone/motif more than structure. The best improvers are warmer, less dominated by giant focal features, and closer to "outdoor wall" semantics.
- What still goes wrong: seam geometry, non-wrap-safe macro composition, and diffusion-style speckle/gradient bleed remain. The prompt helped the subject; it did not make the model obey tileability.
- Sprite rubric status: direct "sticker test" language was not prominent in sampled R3s, but the consistency-breaker is still functionally applying sprite/icon standards because the peer sheet is armor/items.

## Task 4: Recommendation

**B) Tiles are fixable but need a different generation approach.**

Evidence-backed defense:

- Prompt-only rework did not materially move the needle: mean delta `+0.28`, zero pass flips, and R3 minima did not improve.
- The remaining failures are not just wording misses. `adversarial_a` is using the right tile rubric and still finds genuine seam defects on all 4 sampled tiles.
- Prompt-only iteration is further undercut by a pipeline bug: tiles are generated and judged against `denzi-tech-items-ref.png`, not tile peers. In this setup, another prompt pass is not a fair test.

Concrete recommendation:

1. Fix the tile reference path first. Add an explicit `tile -> env` mapping in both `pickReferenceSheet()` and `pickReferenceImage()`, or better, build a real `denzi-tech-tiles-ref.png` from known-good floor/wall tiles.
2. Stop relying on pure prompt text for tileability. Use img2img or reference-conditioned generation from a seam-safe base tile or an extracted Denzi tile crop. The model is not reliably honoring "edges wrap perfectly" on its own.
3. Increase tile batch size and auto-reject on edge equality before screening. Tile evaluation should fail candidates before R1/R2 if row0/31 or col0/31 mismatch.

Bottom line: do not spend the next cycle on prompt tuning alone. Fix the reference bug and switch tile generation to a seam-constrained approach; otherwise more prompt edits are likely to produce another wash.
