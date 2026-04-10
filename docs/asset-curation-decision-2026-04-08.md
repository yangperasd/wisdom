# Asset Curation Decision - 2026-04-08

## Goal

This pass narrows the runtime asset tree to a single primary style direction, removes obvious staging duplicates from `assets/`, and records one canonical selection policy so the same entity does not drift across scenes.

## Multi-agent synthesis

Three parallel reviews were used for this decision:

- Code inventory review: current project is a Cocos Creator 3.8.8 editor-first project with scene/prefab wiring, not a runtime string-loading asset project.
- Art/style review: the most coherent mainline is `DENZI world art + Kenney UI`.
- Naming/dedupe review: reserve packs and prep packs should not stay under runtime `assets/`; manifest keys should become the stable naming layer.

## Primary style decision

### Keep as mainline

- World, characters, enemies, items, dungeon environment:
  - `assets/art/environment/dungeon/denzi`
  - `assets/art/characters/player/denzi`
  - `assets/art/characters/enemies/denzi`
  - `assets/art/items/denzi`
- HUD, button frames, UI icons:
  - `assets/art/ui/hud/kenney/PNG/Red/Default`
  - `assets/art/ui/icons/kenney_game_icons`
- Fonts:
  - `assets/art/ui/fonts/kenney/Kenney Future.ttf`
  - `assets/art/ui/fonts/kenney/Kenney Future Narrow.ttf`
  - `assets/art/ui/fonts/dawnlike/SDS_8x8.ttf`
  - `assets/art/ui/fonts/dawnlike/SDS_6x6.ttf`
- Audio:
  - `assets/audio/ui/kenney`
  - `assets/audio/ui/jrpg`
  - `assets/audio/ui/menu_alt`
  - `assets/audio/sfx/combat/rpg`
  - `assets/audio/sfx/interface/rpg`
  - `assets/audio/sfx/items/rpg`
  - `assets/audio/sfx/world/rpg`
  - `assets/audio/sfx/enemies/rpg`

### Downgrade to reserve

- DawnLike world/character/item/effect/UI skin material
- DENZI GUI sheet set
- Kenney alternate HUD color skin `PNG/Extra`
- Prep/source-pack directories that were still living under runtime `assets/`

## Runtime cleanup done in this pass

The following directories were moved out of runtime `assets/` into `temp/asset_keep/reserve_runtime`:

- `assets/art/prep`
- `assets/audio/prep`
- `assets/art/environment/dawnlike`
- `assets/art/characters/player/dawnlike`
- `assets/art/characters/enemies/dawnlike`
- `assets/art/items/dawnlike`
- `assets/art/effects/dawnlike`
- `assets/art/ui/skins/dawnlike`
- `assets/art/ui/skins/denzi`
- `assets/art/ui/hud/kenney/PNG/Extra`

This keeps the project runtime tree focused on one main visual line:

- `DENZI` for world-facing art
- `Kenney Red / Default` for HUD-facing UI

## Naming policy

Raw source filenames are left in place where changing them would create unnecessary churn.
The canonical naming layer is the manifest key, not the imported source filename.

### Rules for stable keys

- Use lowercase ASCII and underscores.
- Use semantic keys by role, not by vendor pack name.
- Use one key per entity role, not one key per scene variant.
- Use suffixes only when variants are intentional:
  - `_v01`, `_v02`
  - `_loop`
  - `_primary`, `_secondary`
  - `_locked`, `_selected`, `_idle`

### Recommended path/key conventions

- UI art:
  - `ui.hud.{widget}.{state}`
  - `ui.icon.{name}`
  - `ui.font.{role}`
- Audio:
  - `audio.ui.{action}`
  - `audio.sfx.combat.{role}.{action}`
  - `audio.sfx.enemy.{enemy}.{action}`
  - `audio.sfx.item.{item}.{action}`
  - `audio.bgm.{scene_or_mode}.{name}`
- World art:
  - `world.env.{theme}.{group}`
  - `world.character.{role}`
  - `world.enemy.{type}`
  - `world.prop.{type}`

## What this pass intentionally did not do

- No scene/prefab asset binding yet
- No folder-by-folder vendor filename rewrite
- No destructive pruning inside the DENZI main pack
- No audio normalization pass

## Known gaps

- Outdoor/camp/ruins scenes still need a stronger canonical environment subset than the current dungeon-heavy DENZI selection.
- Boss art is still only defined at the category level, not a locked final sprite sheet.
- `assets/audio/music/battle/battle_theme_i` currently has the directory structure but no visible runtime music file in place; this needs a separate fix decision before BGM is wired.

## Follow-up artifacts

This decision is paired with:

- `docs/code-asset-entity-inventory-2026-04-08.md`
- `assets/configs/asset_selection_manifest.json`
