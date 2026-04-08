# Asset Runtime Tree - 2026-04-08

## Why this tree

After scanning the current project structure, the asset layout was organized around how this project is actually built today:

- Cocos Creator 3.8.8 project with a standard `assets/` editor workflow.
- Existing code is still mainly HUD/layout/script driven rather than runtime string-based asset loading.
- `assets/maps/` already exists, so TMX/TSX map prototypes belong there instead of under generic art folders.
- Current scripts and scenes suggest the next useful step is editor-friendly semantic grouping, not a temporary ingest dump.

Reference files used for this decision:

- `E:/cv5/wisdom/package.json`
- `E:/cv5/wisdom/assets/scripts/ui/GameHud.ts`
- `E:/cv5/wisdom/assets/scripts/ui/CanvasHudLayout.ts`

## New target structure

```text
assets/
  maps/
    prototypes/
      sbs_topdown_dungeon_0/

  art/
    environment/
      dungeon/
        denzi/
      dawnlike/
        objects/
    effects/
      dawnlike/
    characters/
      player/
        denzi/
        dawnlike/
      enemies/
        denzi/
        dawnlike/
    items/
      denzi/
      dawnlike/
    ui/
      hud/
        kenney/
      icons/
        kenney_game_icons/
      skins/
        denzi/
        dawnlike/
      fonts/
        kenney/
        dawnlike/

  audio/
    ui/
      jrpg/
      menu_alt/
      kenney/
    sfx/
      combat/
        rpg/
      interface/
        rpg/
      items/
        rpg/
      world/
        rpg/
      enemies/
        rpg/
          beetle/
          giant/
          gutteral_beast/
    music/
      battle/
        battle_theme_i/
```

## What was moved from `ingest_ready`

### Maps

- `art_sbs_topdown_dungeon_0` -> `assets/maps/prototypes/sbs_topdown_dungeon_0`
- Entire pack was kept together so `.tmx`, `.tsx`, and referenced tile images preserve relative paths.

### Environment art

- `art_denzi_individual_tiles/floor` -> `assets/art/environment/dungeon/denzi`
- `art_denzi_individual_tiles/wall` -> `assets/art/environment/dungeon/denzi`
- `art_denzi_individual_tiles/water` -> `assets/art/environment/dungeon/denzi`
- `art_denzi_individual_tiles/features` -> `assets/art/environment/dungeon/denzi`
- `art_dawnlike` floor, wall, door, trap sheets -> `assets/art/environment/dawnlike/objects`

### Character art

- `art_denzi_individual_tiles/paperdoll` -> `assets/art/characters/player/denzi`
- `art_dawnlike/Characters/Player0.png` -> `assets/art/characters/player/dawnlike`
- `art_denzi_individual_tiles/monsters` -> `assets/art/characters/enemies/denzi`
- `art_dawnlike` humanoid, undead, slime sheets -> `assets/art/characters/enemies/dawnlike`

### Items and effects

- `art_denzi_individual_tiles/items` -> `assets/art/items/denzi`
- Selected DawnLike item sheets -> `assets/art/items/dawnlike`
- DawnLike effect sheets -> `assets/art/effects/dawnlike`

### UI art

- `ui_kenney_ui_pack/PNG` -> `assets/art/ui/hud/kenney`
- `ui_kenney_game_icons/PNG/White/1x` -> `assets/art/ui/icons/kenney_game_icons`
- `ui_denzi_gui_tileset/GUI` -> `assets/art/ui/skins/denzi`
- DawnLike GUI sheets -> `assets/art/ui/skins/dawnlike`
- Kenney fonts -> `assets/art/ui/fonts/kenney`
- DawnLike fonts -> `assets/art/ui/fonts/dawnlike`

### Audio

- `audio_jrpg_ui` -> `assets/audio/ui/jrpg`
- `audio_ui_pack_1` -> `assets/audio/ui/menu_alt`
- Kenney UI sounds -> `assets/audio/ui/kenney`
- `rpg_sound_pack/battle` -> `assets/audio/sfx/combat/rpg`
- `rpg_sound_pack/interface` -> `assets/audio/sfx/interface/rpg`
- Selected inventory and pickup sounds -> `assets/audio/sfx/items/rpg`
- Door/world interaction sounds -> `assets/audio/sfx/world/rpg`
- Enemy-specific folders -> `assets/audio/sfx/enemies/rpg/*`
- `audio_battle_theme_i` -> `assets/audio/music/battle/battle_theme_i`

## Why this is closer to the project

- Better for Cocos editor drag-and-drop and prefab assignment.
- Easier to evolve toward scene-specific prefabs without renaming everything again.
- Separates reusable UI art from world art.
- Keeps map prototype assets isolated from production environment sheets.
- Splits audio by gameplay meaning instead of by source pack name.

## What is intentionally not done yet

- No scene or prefab references were rewired yet.
- No `.meta` hygiene pass or naming normalization pass yet.
- No deduplication between overlapping packs yet.
- No final runtime key manifest yet for programmatic loading.

## Suggested next steps

1. Pick one scene and wire a first-pass visual kit using the new `art/ui` and `art/environment` folders.
2. Decide whether `maps/prototypes/sbs_topdown_dungeon_0` stays as a prototype-only pack or becomes a real source map folder.
3. Create a final resource-key manifest only for assets that will actually be referenced by code or prefabs.
