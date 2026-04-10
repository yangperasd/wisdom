# DungeonHub UI Feedback Pass - 2026-04-08

## What this pass added

This pass moved `DungeonHub` from a font-only material pass to a real interaction-feedback pass:

- HUD card backgrounds now have selected Kenney sprite references
- action and pause buttons now have selected Kenney button-frame references
- touch and pause buttons now have UI audio clip references
- scene portals now have a world interaction door sound reference

## Files changed

- `assets/scripts/ui/GameHud.ts`
- `assets/scripts/input/TouchCommandButton.ts`
- `assets/scripts/core/ScenePortal.ts`
- `assets/scenes/DungeonHub.scene`
- selected HUD image `.meta` files under `assets/art/ui/hud/kenney/PNG/Red/Default`
- selected audio `.meta` files under `assets/audio`

## Runtime behavior added

### HUD card skinning

`GameHud` now applies sprite skins at runtime to:

- `HudTopBar`
- `HudObjectiveCard`
- `HudControlsCard`

These use:

- `button_rectangle_line.png`
- `button_rectangle_flat.png`
- `button_rectangle_border.png`

### Button skinning

`TouchCommandButton` now supports:

- runtime button-frame sprite assignment
- one-shot UI or action audio playback

This is wired in `DungeonHub` for:

- `TouchAttack`
- `TouchPlaceEcho`
- `TouchRespawn`
- `TouchPause`
- `PauseContinue`
- `PauseRestart`
- `PauseCamp`

Echo selection buttons keep the old `RectVisual` path for now, because their locked/unlocked/selected state is still driven by `GameHud` visual-state logic.

### Audio feedback

`TouchCommandButton` is now wired with:

- click feedback
- confirm feedback
- menu-open feedback
- error feedback
- player attack swing feedback

`ScenePortal` is now wired with:

- optional `enterClip`
- optional `enterClipVolume`

All DungeonHub portals currently reference the same door sound.

## Resource preparation done

To support this pass:

- selected Kenney HUD button images were promoted from `texture` metadata to `sprite-frame` metadata
- selected runtime audio files were given `audio-clip` metadata where missing

## Current limits

- No Kenney icon sprites are bound yet
- Echo buttons still use procedural visuals
- Pause menu still uses text labels instead of icon-driven buttons
- Portal sound may be cut short by immediate scene switching depending on runtime behavior

## Recommended next pass

1. Add icon sprite references for pause, summon, respawn, and echo actions once the selected icon files are promoted into runtime-ready sprite-frame assets.
2. Replace portal placeholder visuals with dedicated world props from the DENZI selection.
3. Move the same UI feedback wiring to `StartCamp`, `FieldRuins`, and `BossArena`.
