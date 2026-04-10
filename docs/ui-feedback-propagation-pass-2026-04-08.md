# UI Feedback Propagation Pass - 2026-04-08

## Scope

This pass extended the runtime UI feedback work from `DungeonHub` into the shared scene set:

- `DungeonHub`
- `StartCamp`
- `FieldRuins`
- `BossArena`

The goal was to keep one consistent interaction language across scenes instead of letting each scene drift into its own temporary button, font, or sound style.

## What changed

### 1. Shared runtime icon support

`GameHud.ts` now supports runtime icon sprite assignment for:

- attack
- summon
- respawn
- pause
- echo selection buttons

Selected icon family:

- `assets/art/ui/icons/kenney_game_icons/cross.png`
- `assets/art/ui/icons/kenney_game_icons/plus.png`
- `assets/art/ui/icons/kenney_game_icons/home.png`
- `assets/art/ui/icons/kenney_game_icons/pause.png`
- `assets/art/ui/icons/kenney_game_icons/exclamation.png`

### 2. Shared button-frame and audio wiring

`TouchCommandButton.ts` now provides a common runtime path for:

- sprite-frame based button skinning
- click feedback
- confirm feedback
- menu-open feedback
- error feedback
- action feedback for player attack

Selected shared resources:

- `assets/art/ui/hud/kenney/PNG/Red/Default/button_round_gloss.png`
- `assets/art/ui/hud/kenney/PNG/Red/Default/button_round_line.png`
- `assets/art/ui/hud/kenney/PNG/Red/Default/button_rectangle_border.png`
- `assets/audio/ui/kenney/click-a.ogg`
- `assets/audio/ui/jrpg/Confirm.wav`
- `assets/audio/ui/jrpg/Open.wav`
- `assets/audio/ui/jrpg/Error.wav`
- `assets/audio/sfx/combat/rpg/swing.wav`

### 3. Portal sound propagation

`ScenePortal.ts` now supports optional enter audio, and the selected shared portal sound was propagated to the four scenes above:

- `assets/audio/sfx/world/rpg/door.wav`

### 4. Paused-action error feedback bug fixed

A known logic gap in `TouchCommandButton.ts` was closed in this pass.

Before this change, some branches that were blocked while paused returned early and skipped `errorClip` playback.
Now the blocked-while-paused path plays the configured error feedback before returning.

## Scene coverage

### DungeonHub

`DungeonHub` now has:

- Kenney Future label font applied
- HUD card sprite frames applied
- button-frame sprite references applied
- icon sprite references applied
- UI click, confirm, menu, error, attack, and portal audio references applied

### StartCamp

`StartCamp` now shares the same runtime UI feedback preset as `DungeonHub`:

- Kenney Future label font
- HUD card sprite frames
- button-frame sprite references
- icon sprite references
- UI and portal feedback audio references

### FieldRuins

`FieldRuins` now shares the same runtime UI feedback preset as `DungeonHub`:

- Kenney Future label font
- HUD card sprite frames
- button-frame sprite references
- icon sprite references
- UI and portal feedback audio references

### BossArena

`BossArena` now shares the same runtime UI feedback preset for UI and portal interaction:

- Kenney Future label font
- HUD card sprite frames
- button-frame sprite references
- icon sprite references
- UI and portal feedback audio references

`BossArena` battle BGM is still unresolved and remains outside this pass.

## Files changed in this pass

- `assets/scripts/ui/GameHud.ts`
- `assets/scripts/input/TouchCommandButton.ts`
- `assets/scripts/core/ScenePortal.ts`
- `assets/scenes/DungeonHub.scene`
- `assets/scenes/StartCamp.scene`
- `assets/scenes/FieldRuins.scene`
- `assets/scenes/BossArena.scene`
- selected `.meta` files under `assets/art/ui/hud/kenney/PNG/Red/Default`
- selected `.meta` files under `assets/art/ui/icons/kenney_game_icons`
- selected `.meta` files under `assets/audio`

## Known follow-up items

- `PauseRestart` currently inherits the generic respawn round button frame because the propagation pass keyed off `command = 2`. That is functionally safe, but visually it is not as consistent as the other pause-menu actions.
- Echo selection buttons still keep their `RectVisual` state logic under the icon overlay on purpose.
- `BossArena` still needs a restored runtime battle-music file before BGM should be wired.

## Recommended next pass

1. Override `PauseRestart` by node name so the whole pause menu uses one visual family.
2. Replace placeholder world props for checkpoint and portal with more dedicated DENZI picks.
3. Restore a runtime battle BGM file and only then wire `BossArena` music.
