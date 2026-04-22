# Revise/Reject Handling Proposal
Timestamp: 2026-04-20 10:59:43 +08:00

## Summary
- 8 candidates with a better sibling identified.
- 3 candidates needing prompt rewrite and regen.
- 5 tile candidates should exit prompt-only auto-gen and go to hand-paint or a seam-constrained/reference-conditioned workflow.
- Total actionable items: 16.

## Per-candidate findings

### icon_echo_box_v00 (REJECT — "不像 box")
Current: v00 reads like a framed plaque/card with a face, not a wooden crate.
Siblings scanned: all 8 variants.
Best sibling: v05. It has the clearest square crate silhouette and visible wood slats, so it reads as a box first.
Advisory rewritten prompt:
```json
{"id":"icon_echo_box","category":"icon","resolution":"ui_small","prompt":"Game ability HUD icon, unmistakable front-facing wooden crate symbol, square box silhouette with visible top plank, bottom plank, side posts, a tiny lid seam, two tiny black beady eyes, and a small smile on the front board. Must read as a box/crate even at 1x. Toy-diorama miniature feel, glossy clean shading, pastel highlights, warm cheerful colors. 24x24 sprite, transparent background, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom HUD icon aesthetic.","negative":"book, plaque, framed card, treasure chest, round emblem, floating gem, blur, anti-aliasing, smooth shading, gradient, 3d render, realistic, photo, text, watermark, modern UI, flat design, dark grimdark, hyperrealism"}
```
Reasoning: human note is specific; v05 is usable now, but the prompt should explicitly ban plaque/card reads.

### pause_button_v03 (REJECT — "看不出暂停的感觉")
Current: v03 is a round medallion with a central blue gem and side dashes; pause read is gone.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v07 is the closest, but still reads like a decorative medallion, not an unmistakable pause button.
Proposed rewritten prompt:
```json
{"id":"pause_button","category":"button","resolution":"ui_med","prompt":"Touch pause button, round parchment-and-gold button with an unmistakable pause emblem: two thick vertical bars side-by-side centered on the button, readable instantly at 1x. Soft cyan rim glow, glossy clean shading, pastel highlights, warm cheerful colors. 48x48 sprite, transparent background, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom HUD aesthetic.","negative":"single bar, orb, gem, clock face, compass, plus sign, crosshair, play triangle, blur, anti-aliasing, smooth shading, gradient, 3d render, realistic, photo, text inside, watermark, modern UI, flat design, dark grimdark, neon, hyperrealism"}
```
Reasoning: this is a structural prompt miss, not a ranking miss.

### system_pause_icon_v00 (REJECT)
Current: v00 is a rectangular plaque with bars inside; too panel-like.
Siblings scanned: all 8 variants.
Best sibling: v01. It is the cleanest gold-disc icon with a clear two-bar pause read.

### key_boss_v01 (REJECT)
Current: v01 reads like a thin rod with a blank oval medallion, not an ornate boss key.
Siblings scanned: all 8 variants.
Best sibling: v02. It has the strongest crown-like bow and regal purple-gold read.

### echo_box_idle_v07 (REJECT)
Current: v07 reads like a pale spirit doll/ghost; the crate body is lost.
Siblings scanned: all 8 variants.
Best sibling: v01. It is the only sibling that still reads as a tiny wooden box creature with little green legs.

### outdoor_wall_standard_v00 (REJECT)
Current: v00 has the right palette family but still reads as noisy wall texture with ivy hotspots.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v03 is least bad, but every sibling still has seam-risk columns, hotspots, or unstable cadence.
Reasoning: not worth another prompt-only try; send tiles out of this pipeline.

### outdoor_wall_cracked_v04 (REJECT)
Current: v04 is a generic wall with random marks; the “hairline cracked” brief is not resolved.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v01 is least bad, but the siblings either hide the cracks entirely or create the wrong focal-crack behavior.
Reasoning: prompt-only tile fix is not worth another cycle.

### outdoor_ground_flowers_v01 (REJECT)
Current: v01 is confetti-dense and much higher-energy than the brief.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v07 is sparsest, but still too busy and too floral for a support tile.
Reasoning: prompt-only tile fix is not worth another cycle.

### vfx_arrow_trail_v01 (REJECT)
Current: v01 reads like repeating cream stripe texture, not an arrow motion trail.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v03 is closest, but it still reads as an abstract wipe, not a single projectile trail.
Proposed rewritten prompt:
```json
{"id":"vfx_arrow_trail","category":"trail","resolution":"standard","prompt":"Arrow projectile motion trail, single horizontal cream-and-gold streak on transparent background, bright leading core with a tapered tail and 3-5 tiny sparkle pixels drifting behind it. Clear left-to-right motion, feathered pixel fade only at the tail, no repeating bands, no radial burst, no full-frame texture. Whimsical friendly motion effect, glossy clean shading, pastel highlights, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom aesthetic.","negative":"repeating stripes, wallpaper pattern, radial burst, butterfly shape, wing shape, blur, anti-aliasing, smooth shading, gradient, 3d render, realistic, photo, text, watermark, dark grimdark, scary, blood, hyperrealism"}
```
Reasoning: another sibling swap will not solve the composition failure.

### potion_mana_v04 (REVISE)
Current: v04 has the right bottle idea, but the extra mini-bottle clutter hurts icon clarity.
Siblings scanned: all 8 variants.
Best sibling: v07. It is a clean single round flask with a stronger mana read.

### bar_health_fill_v00 (REVISE)
Current: v00 is serviceable, but the highlight/body breakup is noisier than it should be.
Siblings scanned: all 8 variants.
Best sibling: v07. It has the cleanest long highlight stripe and the most controlled fill pattern.

### scroll_fire_v01 (REVISE)
Current: v01 is cramped and under-reads as a scroll.
Siblings scanned: all 8 variants.
Best sibling: v00. It gives the clearest rolled parchment plus centered flame emblem.

### touch_attack_button_v02 (REVISE)
Current: v02 reads as a flame/gem button, not crossed swords.
Siblings scanned: all 8 variants.
Best sibling: v04. It is the clearest round parchment-and-gold button with crossed swords in the center.

### touch_echo_button_v03 (REVISE)
Current: v03 is too square/panel-like, and the center emblem still does not cleanly read as an echo box.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v00 gets “crate” but loses “round button”; v04 gets “round button” but loses “crate emblem.”
Proposed rewritten prompt:
```json
{"id":"touch_echo_button","category":"button","resolution":"ui_med","prompt":"Touch echo box selector button, round parchment-and-gold button with a tiny front-facing wooden crate icon centered inside. The crate icon must show a square box silhouette, top and bottom planks, side posts, and two tiny black eyes; the button body stays round and separate from the crate emblem. Warm gold glow, glossy clean shading, pastel highlights. 48x48 sprite, transparent background, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom HUD aesthetic.","negative":"full crate as button body, square button, starburst emblem, abstract symbol, treasure chest, blur, anti-aliasing, smooth shading, gradient, 3d render, realistic, photo, text inside, watermark, modern UI, flat design, dark grimdark, neon, hyperrealism"}
```

### outdoor_path_cobble_v00 (REVISE)
Current: v00 is closer to “cobble,” but still feels scene-like/noisy and not trustably wrap-safe.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v05 is least bad, but none clearly clear the tile-support bar.
Reasoning: same tile verdict as above.

### outdoor_wall_broken_v00 (REVISE)
Current: v00 has the right damaged-wall intent, but the damage clusters still turn into holes/bands.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v03 is least bad, but it still has distribution/seam problems.
Reasoning: same tile verdict as above.

## Tile verdict
Based on the prior audit in `audit/codex_tile_audit2_report.md` and this sibling scan across `outdoor_wall_standard`, `outdoor_wall_cracked`, `outdoor_ground_flowers`, `outdoor_path_cobble`, and `outdoor_wall_broken`, final recommendation: abandon prompt-only auto-gen for tiles.

The pattern is unchanged: some siblings are less ugly than the chosen top-1, but none look reliable as seamless low-energy support tiles. If you still want one machine pass, it should only happen after fixing the tile-reference contamination and switching to seam-constrained/reference-conditioned generation. Otherwise these should go to hand-paint.

## Actionable output

REPLACE (8 items) — swap top-1 to sibling:
- icon_echo_box_v00 → v05
- system_pause_icon_v00 → v01
- key_boss_v01 → v02
- echo_box_idle_v07 → v01
- potion_mana_v04 → v07
- bar_health_fill_v00 → v07
- scroll_fire_v01 → v00
- touch_attack_button_v02 → v04

REWRITE_AND_REGEN (3 items) — modify prompt + regen:
- pause_button_v03
- touch_echo_button_v03
- vfx_arrow_trail_v01

GIVE_UP (5 items) — tile/trail surrenders:
- outdoor_wall_standard_v00
- outdoor_wall_cracked_v04
- outdoor_ground_flowers_v01
- outdoor_path_cobble_v00
- outdoor_wall_broken_v00

Inspected inputs: `prompts/*.jsonl`, `generated/**`, `screened/work/**`, `screened/round0-results.json`, `audit/codex_tile_audit2_report.md`, and `../../review-decisions.jsonl`. Verification was by manual visual scan of all 8 siblings for each of the 16 targets, plus the prior tile audit.
tokens used
315,214
I kept this read-only because your request both specified `audit/codex_revise_report.md` and said not to modify files. Report content follows.

# Revise/Reject Handling Proposal
Timestamp: 2026-04-20 10:59:43 +08:00

## Summary
- 8 candidates with a better sibling identified.
- 3 candidates needing prompt rewrite and regen.
- 5 tile candidates should exit prompt-only auto-gen and go to hand-paint or a seam-constrained/reference-conditioned workflow.
- Total actionable items: 16.

## Per-candidate findings

### icon_echo_box_v00 (REJECT — "不像 box")
Current: v00 reads like a framed plaque/card with a face, not a wooden crate.
Siblings scanned: all 8 variants.
Best sibling: v05. It has the clearest square crate silhouette and visible wood slats, so it reads as a box first.
Advisory rewritten prompt:
```json
{"id":"icon_echo_box","category":"icon","resolution":"ui_small","prompt":"Game ability HUD icon, unmistakable front-facing wooden crate symbol, square box silhouette with visible top plank, bottom plank, side posts, a tiny lid seam, two tiny black beady eyes, and a small smile on the front board. Must read as a box/crate even at 1x. Toy-diorama miniature feel, glossy clean shading, pastel highlights, warm cheerful colors. 24x24 sprite, transparent background, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom HUD icon aesthetic.","negative":"book, plaque, framed card, treasure chest, round emblem, floating gem, blur, anti-aliasing, smooth shading, gradient, 3d render, realistic, photo, text, watermark, modern UI, flat design, dark grimdark, hyperrealism"}
```
Reasoning: human note is specific; v05 is usable now, but the prompt should explicitly ban plaque/card reads.

### pause_button_v03 (REJECT — "看不出暂停的感觉")
Current: v03 is a round medallion with a central blue gem and side dashes; pause read is gone.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v07 is the closest, but still reads like a decorative medallion, not an unmistakable pause button.
Proposed rewritten prompt:
```json
{"id":"pause_button","category":"button","resolution":"ui_med","prompt":"Touch pause button, round parchment-and-gold button with an unmistakable pause emblem: two thick vertical bars side-by-side centered on the button, readable instantly at 1x. Soft cyan rim glow, glossy clean shading, pastel highlights, warm cheerful colors. 48x48 sprite, transparent background, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom HUD aesthetic.","negative":"single bar, orb, gem, clock face, compass, plus sign, crosshair, play triangle, blur, anti-aliasing, smooth shading, gradient, 3d render, realistic, photo, text inside, watermark, modern UI, flat design, dark grimdark, neon, hyperrealism"}
```
Reasoning: this is a structural prompt miss, not a ranking miss.

### system_pause_icon_v00 (REJECT)
Current: v00 is a rectangular plaque with bars inside; too panel-like.
Siblings scanned: all 8 variants.
Best sibling: v01. It is the cleanest gold-disc icon with a clear two-bar pause read.

### key_boss_v01 (REJECT)
Current: v01 reads like a thin rod with a blank oval medallion, not an ornate boss key.
Siblings scanned: all 8 variants.
Best sibling: v02. It has the strongest crown-like bow and regal purple-gold read.

### echo_box_idle_v07 (REJECT)
Current: v07 reads like a pale spirit doll/ghost; the crate body is lost.
Siblings scanned: all 8 variants.
Best sibling: v01. It is the only sibling that still reads as a tiny wooden box creature with little green legs.

### outdoor_wall_standard_v00 (REJECT)
Current: v00 has the right palette family but still reads as noisy wall texture with ivy hotspots.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v03 is least bad, but every sibling still has seam-risk columns, hotspots, or unstable cadence.
Reasoning: not worth another prompt-only try; send tiles out of this pipeline.

### outdoor_wall_cracked_v04 (REJECT)
Current: v04 is a generic wall with random marks; the “hairline cracked” brief is not resolved.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v01 is least bad, but the siblings either hide the cracks entirely or create the wrong focal-crack behavior.
Reasoning: prompt-only tile fix is not worth another cycle.

### outdoor_ground_flowers_v01 (REJECT)
Current: v01 is confetti-dense and much higher-energy than the brief.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v07 is sparsest, but still too busy and too floral for a support tile.
Reasoning: prompt-only tile fix is not worth another cycle.

### vfx_arrow_trail_v01 (REJECT)
Current: v01 reads like repeating cream stripe texture, not an arrow motion trail.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v03 is closest, but it still reads as an abstract wipe, not a single projectile trail.
Proposed rewritten prompt:
```json
{"id":"vfx_arrow_trail","category":"trail","resolution":"standard","prompt":"Arrow projectile motion trail, single horizontal cream-and-gold streak on transparent background, bright leading core with a tapered tail and 3-5 tiny sparkle pixels drifting behind it. Clear left-to-right motion, feathered pixel fade only at the tail, no repeating bands, no radial burst, no full-frame texture. Whimsical friendly motion effect, glossy clean shading, pastel highlights, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom aesthetic.","negative":"repeating stripes, wallpaper pattern, radial burst, butterfly shape, wing shape, blur, anti-aliasing, smooth shading, gradient, 3d render, realistic, photo, text, watermark, dark grimdark, scary, blood, hyperrealism"}
```
Reasoning: another sibling swap will not solve the composition failure.

### potion_mana_v04 (REVISE)
Current: v04 has the right bottle idea, but the extra mini-bottle clutter hurts icon clarity.
Siblings scanned: all 8 variants.
Best sibling: v07. It is a clean single round flask with a stronger mana read.

### bar_health_fill_v00 (REVISE)
Current: v00 is serviceable, but the highlight/body breakup is noisier than it should be.
Siblings scanned: all 8 variants.
Best sibling: v07. It has the cleanest long highlight stripe and the most controlled fill pattern.

### scroll_fire_v01 (REVISE)
Current: v01 is cramped and under-reads as a scroll.
Siblings scanned: all 8 variants.
Best sibling: v00. It gives the clearest rolled parchment plus centered flame emblem.

### touch_attack_button_v02 (REVISE)
Current: v02 reads as a flame/gem button, not crossed swords.
Siblings scanned: all 8 variants.
Best sibling: v04. It is the clearest round parchment-and-gold button with crossed swords in the center.

### touch_echo_button_v03 (REVISE)
Current: v03 is too square/panel-like, and the center emblem still does not cleanly read as an echo box.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v00 gets “crate” but loses “round button”; v04 gets “round button” but loses “crate emblem.”
Proposed rewritten prompt:
```json
{"id":"touch_echo_button","category":"button","resolution":"ui_med","prompt":"Touch echo box selector button, round parchment-and-gold button with a tiny front-facing wooden crate icon centered inside. The crate icon must show a square box silhouette, top and bottom planks, side posts, and two tiny black eyes; the button body stays round and separate from the crate emblem. Warm gold glow, glossy clean shading, pastel highlights. 48x48 sprite, transparent background, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom HUD aesthetic.","negative":"full crate as button body, square button, starburst emblem, abstract symbol, treasure chest, blur, anti-aliasing, smooth shading, gradient, 3d render, realistic, photo, text inside, watermark, modern UI, flat design, dark grimdark, neon, hyperrealism"}
```

### outdoor_path_cobble_v00 (REVISE)
Current: v00 is closer to “cobble,” but still feels scene-like/noisy and not trustably wrap-safe.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v05 is least bad, but none clearly clear the tile-support bar.
Reasoning: same tile verdict as above.

### outdoor_wall_broken_v00 (REVISE)
Current: v00 has the right damaged-wall intent, but the damage clusters still turn into holes/bands.
Siblings scanned: all 8 variants.
Best sibling: no usable sibling. v03 is least bad, but it still has distribution/seam problems.
Reasoning: same tile verdict as above.

## Tile verdict
Based on the prior audit in `audit/codex_tile_audit2_report.md` and this sibling scan across `outdoor_wall_standard`, `outdoor_wall_cracked`, `outdoor_ground_flowers`, `outdoor_path_cobble`, and `outdoor_wall_broken`, final recommendation: abandon prompt-only auto-gen for tiles.

The pattern is unchanged: some siblings are less ugly than the chosen top-1, but none look reliable as seamless low-energy support tiles. If you still want one machine pass, it should only happen after fixing the tile-reference contamination and switching to seam-constrained/reference-conditioned generation. Otherwise these should go to hand-paint.

## Actionable output

REPLACE (8 items) — swap top-1 to sibling:
- icon_echo_box_v00 → v05
- system_pause_icon_v00 → v01
- key_boss_v01 → v02
- echo_box_idle_v07 → v01
- potion_mana_v04 → v07
- bar_health_fill_v00 → v07
- scroll_fire_v01 → v00
- touch_attack_button_v02 → v04

REWRITE_AND_REGEN (3 items) — modify prompt + regen:
- pause_button_v03
- touch_echo_button_v03
- vfx_arrow_trail_v01

GIVE_UP (5 items) — tile/trail surrenders:
- outdoor_wall_standard_v00
- outdoor_wall_cracked_v04
- outdoor_ground_flowers_v01
- outdoor_path_cobble_v00
- outdoor_wall_broken_v00

Inspected inputs: `prompts/*.jsonl`, `generated/**`, `screened/work/**`, `screened/round0-results.json`, `audit/codex_tile_audit2_report.md`, and `../../review-decisions.jsonl`. Verification was by manual visual scan of all 8 siblings for each of the 16 targets, plus the prior tile audit.
