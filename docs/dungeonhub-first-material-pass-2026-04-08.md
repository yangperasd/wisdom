# DungeonHub First Material Pass - 2026-04-08

## What this pass does

This is the first real scene-side asset integration pass after the curation work.
The chosen scene is `DungeonHub`, because it matches the selected mainline style best:

- world art: `DENZI`
- UI art: `Kenney Red / Default`
- UI font: `Kenney Future`

## Actual scene wiring completed

The following files were updated to replace system `Arial` labels with the project font `Kenney Future`:

- `assets/scenes/DungeonHub.scene`
- `assets/prefabs/ArrowProjectile.prefab`
- `assets/prefabs/EchoBox.prefab`
- `assets/prefabs/EchoSpringFlower.prefab`
- `assets/prefabs/EchoBombBug.prefab`

### Replacement summary

- `DungeonHub.scene`: 35 label entries switched to `Kenney Future`
- `ArrowProjectile.prefab`: 1 label entry switched
- `EchoBox.prefab`: 1 label entry switched
- `EchoSpringFlower.prefab`: 1 label entry switched
- `EchoBombBug.prefab`: 1 label entry switched

## Why font wiring came first

`DungeonHub.scene` currently has:

- labels
- node hierarchy for HUD and pause menu
- `RectVisual`-driven placeholder visuals

It does not currently expose a ready-made scene structure for:

- `cc.Sprite`
- `cc.Button`
- `cc.AudioSource`

That means the safest first material pass is:

1. unify the scene typography
2. lock the visual identity for all text-bearing UI and shared prefabs
3. record the selected sprite/audio targets in a binding manifest for the next pass

## Selected targets for the next scene pass

These are already recorded in:

- `assets/configs/asset_binding_manifest_v2.json`

### UI targets

- HUD frames: `Kenney Red / Default`
- Touch buttons: `button_round_gloss.png`
- Pause button: `button_round_line.png`
- Icons: `Kenney Game Icons`

### World targets

- Checkpoint: `ashenzaris_altar.png`
- Portal: temporary `ashenzaris_altar.png` placeholder
- Closed barrier: `wall_compound_standard_a.png`
- Open barrier: `wall_compound_breakdown_a.png`

### Audio targets

- UI click: `click-a.ogg`
- UI confirm: `Confirm.wav`
- UI open: `Open.wav`
- UI error: `Error.wav`
- Door/world interaction: `door.wav`

## Remaining limits

- No sprite nodes were added in this pass
- No button image states were added in this pass
- No audio playback wiring was added in this pass
- No BGM was wired because battle music runtime placement is still incomplete

## Recommended next pass

1. Add `Sprite` components to the `DungeonHub` HUD and pause nodes and bind them to the selected Kenney assets.
2. Add a small UI audio router script and bind click/open/confirm/error sounds.
3. Replace selected world placeholder nodes with actual `DENZI` sprite usage for checkpoint, portal, and barriers.
