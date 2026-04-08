# Asset Intake Status 2026-04-08

## Summary

The asset scouting pass has moved from broad collection into structured intake prep.

Current state:

- expanded search and local download pass completed
- keep pool completed
- package-level manifest completed
- subset-level intake plan completed
- first `ingest_ready` extraction completed

This document is the current handoff point for future asset work.

## Main Output Paths

- Expanded scouting report:
  - `E:/cv5/wisdom/docs/asset-scout-expanded-2026-04-07.md`
- Keep pool root:
  - `E:/cv5/wisdom/temp/asset_keep`
- Keep pool overview:
  - `E:/cv5/wisdom/temp/asset_keep/README.md`
- Package manifest v2:
  - `E:/cv5/wisdom/temp/asset_keep/asset_manifest_v2.json`
- Intake subset rules:
  - `E:/cv5/wisdom/temp/asset_keep/intake-subsets.json`
- Human-readable subset notes:
  - `E:/cv5/wisdom/temp/asset_keep/subset-recommendations.md`
- Intake script:
  - `E:/cv5/wisdom/temp/asset_keep/scripts/apply-intake-subsets.ps1`
- First extracted intake output:
  - `E:/cv5/wisdom/temp/asset_keep/ingest_ready`
- Intake summary:
  - `E:/cv5/wisdom/temp/asset_keep/ingest_ready/summary.json`

## Current Structure

### Keep Pool

`E:/cv5/wisdom/temp/asset_keep` is split into:

- `art/primary`
- `art/reserve`
- `ui/primary`
- `ui/reserve`
- `audio/primary`
- `audio/reserve`

Meaning:

- `primary`: strongest near-term intake candidates
- `reserve`: worth keeping nearby, but not first-pass intake

## Primary Packages

### Art

- `sbs_-_top_down_dungeon_pack_0.zip`
- `DENZI_CC0_individual_organized_tiles_sprites.zip`
- `DawnLike.zip`

### UI

- `kenney_ui-pack`
- `kenney_game-icons`
- `Denzi_GUI_tileset.zip`

### Audio

- `JRPG_UI.zip`
- `rpg_sound_pack.zip`
- `battle_theme_i.zip`
- `UI_pack_1.zip`

## Reserve Packages

### Art

- `sbs_-_top_down_dungeon_pack.zip`
- `DENZI_CC0.zip`
- `character.zip`

### UI

- `kenney_input-prompts_1.4.1`
- `wenrexaassetsuicasual.zip`
- `ui.zip`
- `skymon-icons-free-v250329.zip`
- `RetroPixel_Icons.zip`

### Audio

- `8-bit_Sound_Effects_Pack_001.zip`
- `JBM_Sfxr_pack_1.zip`
- `rpg_soundtrack.zip`
- `monster_sfx_pack.zip`
- `retroindiejosh_8bitpack1.zip`

## Intake Decision

The current intake strategy is:

1. use `SBS` as the fastest environment shell
2. use `DENZI individual` as the main selective supplement
3. use `DawnLike` as the backup and expansion visual system
4. use `Kenney UI` as the primary HUD and component source
5. use `Kenney game-icons` as the main utility icon source
6. use `JRPG_UI` as the main compact UI sound bank
7. use `rpg_sound_pack` as the main gameplay SFX bank
8. use `battle_theme_i` as the first battle BGM source

## Subset Rules

The first intake is not full-pack import. It is subset-based.

Examples:

- `sbs_-_top_down_dungeon_pack_0.zip`:
  - keep `Tiles/Floors/*`
  - keep `Tiles/Walls/*`
  - keep `Tiles/*.tsx`
- `DENZI_CC0_individual_organized_tiles_sprites.zip`:
  - keep `floor/**`, `wall/**`, `monsters/**`, `paperdoll/**`, `water/**`, `features/**`, `items/**`
- `DawnLike.zip`:
  - keep selected `Objects`, `Characters`, `Items`, and `GUI` sheets only
- `kenney_ui-pack`:
  - keep one main color family plus bars, buttons, checks, icons, and a small sound subset
- `battle_theme_i.zip`:
  - keep `intro`, `loop`, and `full` in `mp3`

Full subset details are in:

- `E:/cv5/wisdom/temp/asset_keep/subset-recommendations.md`
- `E:/cv5/wisdom/temp/asset_keep/intake-subsets.json`

## Ingest Script

`apply-intake-subsets.ps1` now:

- reads `asset_manifest_v2.json`
- reads `intake-subsets.json`
- copies only included files
- skips `__MACOSX`, `.DS_Store`, and `._*`
- preserves relative structure
- checks output path safety before writing

## Ingest Result

First-pass extraction has already been executed into:

- `E:/cv5/wisdom/temp/asset_keep/ingest_ready`

Current extracted file counts:

- `art_sbs_topdown_dungeon_0`: 142 files
- `art_denzi_individual_tiles`: 980 files
- `art_dawnlike`: 20 files
- `ui_kenney_ui_pack`: 184 files
- `ui_kenney_game_icons`: 23 files
- `ui_denzi_gui_tileset`: 7 files
- `audio_jrpg_ui`: 9 files
- `audio_rpg_sound_pack`: 49 files
- `audio_battle_theme_i`: 3 files
- `audio_ui_pack_1`: 10 files

These counts come from:

- `E:/cv5/wisdom/temp/asset_keep/ingest_ready/summary.json`

## Recommended Next Step

The next useful step is no longer broad search.

The next useful step is one of:

1. reorganize `ingest_ready` into a final project-facing resource tree
2. generate a resource key mapping table for the loader
3. prune the large extracted sets again, especially:
   - `art_denzi_individual_tiles`
   - `ui_kenney_ui_pack`
4. convert final audio picks into the exact runtime formats we want

## Notes

- License handling was intentionally deferred in this phase.
- The current output is optimized for discovery, intake, and implementation speed.
- This is now a good point to stop scouting and begin real project integration.
