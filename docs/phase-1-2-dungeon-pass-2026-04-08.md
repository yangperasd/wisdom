# Phase 1-2 Dungeon Pass - 2026-04-08

## What this pass completed

This pass executed the first two high-priority parts of the staged asset plan:

- Phase 1:
  - unify the pause-menu visual family across the four main scenes
  - confirm the shared HUD/button/icon baseline stays aligned
- Phase 2:
  - wire first-pass dungeon visuals for checkpoint, portal, and gate states in `DungeonHub`

## Visible changes

### UI consistency

The following scenes now use the same pause-menu button family for `PauseContinue`, `PauseRestart`, and `PauseCamp`:

- `assets/scenes/DungeonHub.scene`
- `assets/scenes/StartCamp.scene`
- `assets/scenes/FieldRuins.scene`
- `assets/scenes/BossArena.scene`

`PauseRestart` no longer inherits the round respawn button look in these scenes.
It now matches the rectangular pause-menu family.

### DungeonHub world entities

`DungeonHub` now has a first-pass dungeon prop language for:

- checkpoint
- all scene portals
- boss gate closed state
- boss gate open state

Selected art:

- checkpoint:
  - `assets/art/environment/dungeon/denzi/features/ashenzaris_altar.png`
- portal:
  - `assets/art/environment/dungeon/denzi/features/sarcophagus/features_sarcophagus_a.png`
- barrier closed:
  - `assets/art/environment/dungeon/denzi/wall/compound/standard/wall_compound_standard_a.png`
- barrier open:
  - `assets/art/environment/dungeon/denzi/wall/compound/breakdown/wall_compound_breakdown_a.png`

## Technical approach

This pass intentionally did not replace gameplay roots or interaction scripts.
Instead, it used the existing placeholder structure and added runtime sprite skin support.

### New helper

- `assets/scripts/visual/SpriteVisualSkin.ts`

This helper:

- resolves the existing `*-Visual` placeholder node
- creates a runtime `Sprite` child on that placeholder
- sizes the sprite to the placeholder transform
- disables `RectVisual` fill and stroke so the selected art can take over

### Updated scripts

- `assets/scripts/core/CheckpointMarker.ts`
- `assets/scripts/core/ScenePortal.ts`
- `assets/scripts/core/FlagGateController.ts`

These scripts now expose `SpriteFrame` fields so scenes can bind first-pass world visuals without changing gameplay logic.

## Resource preparation done

The following art files were promoted into runtime-ready `sprite-frame` assets by adding `.meta` files:

- `assets/art/environment/dungeon/denzi/features/ashenzaris_altar.png`
- `assets/art/environment/dungeon/denzi/features/sarcophagus/features_sarcophagus_a.png`
- `assets/art/environment/dungeon/denzi/features/sarcophagus/features_sarcophagus_b.png`
- `assets/art/environment/dungeon/denzi/wall/compound/standard/wall_compound_standard_a.png`
- `assets/art/environment/dungeon/denzi/wall/compound/breakdown/wall_compound_breakdown_a.png`
- `assets/art/items/denzi/items/helmet/helmet_enchanted.png`
- `assets/art/items/denzi/items/shield/shield_deep_a.png`

## What to test now

### Test 1: Pause menu consistency

Open these scenes:

- `DungeonHub`
- `StartCamp`
- `FieldRuins`
- `BossArena`

Expected result:

- pause menu buttons look like one family
- `PauseRestart` no longer looks like a touch-action button

### Test 2: DungeonHub interaction readability

Open `DungeonHub`.

Expected result:

- checkpoint reads differently from portal
- portals share one consistent silhouette
- closed gate and open gate read as the same structure in two states

## What is still not done

- pickup / relic art is selected, but `DungeonHub` still has no dedicated pickup runtime node to bind
- `BossArena` still has no runtime battle BGM
- outdoor scene material language is still the biggest world-art gap

## Result against the phase board

- `T01`: done
- `T02`: done
- `T03`: done
- `T04`: done
- `T05`: done
- `T06`: blocked by missing pickup node in `DungeonHub`

## Recommended next move

The strongest next step is:

1. finish the remaining Phase 2 pickup binding by deciding which scene should host the first relic or echo pickup node
2. move directly into Phase 3 outdoor biome selection for `StartCamp`, `FieldWest`, and `FieldRuins`

That preserves the current momentum:

- UI is now stable enough
- `DungeonHub` is now a stronger representative slice
- the next big win is giving the outdoor scenes their own identity
