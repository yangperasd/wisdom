# Tiles - Hand-Paint / Asset-Swap Required

Per Codex's analysis across 3 auto-gen cycles (tile-rubric + prompt rework + env-ref fix), these 5 tiles cannot be produced reliably by the ComfyUI + SDXL + Pixel Art XL pipeline. The ceiling for auto-gen is ~5.0-5.5 composite score; the human rejection reasons remain unresolved (seam visibility, focal-stamp polka-dots, macro-density mismatch, wrap-safe composition).

## Tiles requiring manual action (5)

| ID | Manifest entry? | Best auto-gen composite | Human decision | Why abandoning |
|---|---|---|---|---|
| `outdoor_wall_standard` | worldEntities | 4.57 | reject | All 8 siblings have seam-risk columns, hotspots, or unstable cadence |
| `outdoor_wall_cracked` | worldEntities | 4.40-5.33 (v04) | reject | Siblings either hide cracks entirely or create wrong focal-crack behavior |
| `outdoor_wall_broken` | worldEntities | 4.68-4.98 | revise | Damage clusters still turn into repeating holes/bands when tiled |
| `outdoor_path_cobble` | worldEntities | 4.57-4.75 | revise | Scene-like/noisy, not trustably wrap-safe |
| `outdoor_ground_flowers` | worldEntities | 4.45-4.75 | reject | All siblings confetti-dense; too high-energy for support tile |

## Recommended paths (in priority order)

1. **Use existing Denzi tiles under `assets/art/environment/dungeon/denzi/`** — these are the source of `denzi-tech-env-ref.png` and are known-good for Zelda-style usage. Re-wire manifest `worldEntities.outdoor_*` to point to specific Denzi files.
2. **Hand-paint 32×32 seamless tiles** — fastest production-quality solution. Reference the Denzi palette extracted to `reference-sheets/palette-extract.png`.
3. **Img2img from known-good tile crops** (Codex method B step 2) — complex setup, no success guarantee, skipped for now.

## Acceptable alternates auto-gen DID produce (2)

| ID | Composite | Status |
|---|---|---|
| `outdoor_ground_ruins` | 5.63 | APPROVED (in review-decisions.jsonl) — file placed at `assets/art/generated/tile/outdoor_ground_ruins.png` |
| `outdoor_ground_green` | 5.27 | APPROVED — file placed at `assets/art/generated/tile/outdoor_ground_green.png` |

## How this list was produced

- 3 cycles: rubric fix, prompt rewrite, reference-path fix (Codex B step 1)
- Best tile scores: 5.63 > 5.33 > 5.27 (all below PASS threshold 6.0)
- Average improvement across all cycles: +0.60 per tile — real but not transformative
- See `codex_tile_audit2_report.md` for diagnostic detail
- See `codex_revise_report.md` for GIVE_UP verdict
