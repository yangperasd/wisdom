# Asset Code Gap Review - 2026-04-08

## Purpose

This review aligns the current codebase with the staged asset plan in:

- `docs/asset-phase-todo-2026-04-08.md`

The goal is to answer one practical question:

Which parts of the current project can accept art or audio immediately, and which parts still need code-side support before asset integration will be efficient or stable?

## Short answer

The project is already in a good state for:

- HUD and touch-button skinning
- pause-menu skinning
- checkpoint / portal / gate sprite binding
- scene-by-scene world prop replacement where the object is already represented by a dedicated node

The project is not yet in a good state for:

- character art integration for player / enemy / boss
- echo world-visual replacement
- reusable pickup / relic art integration
- battle BGM and scene-level music handling
- manifest-driven asset propagation across generated scenes

So the answer is:

- for environment and UI phases, most work is binding and scene authoring, not gameplay rewrite
- for character, echo, pickup, and boss presentation, code-side support is still too thin and should be extended before large-scale asset rollout

## Current asset-ready code surface

### Already ready for direct binding

These systems already expose asset-facing properties or helper paths and do not need gameplay changes for first-pass art integration:

- `assets/scripts/ui/GameHud.ts`
  - supports `SpriteFrame` assignment for HUD cards
  - supports icon overlays for attack / summon / respawn / pause / echo buttons
- `assets/scripts/input/TouchCommandButton.ts`
  - supports `SpriteFrame` for button skin
  - supports shared UI/action `AudioClip` references
- `assets/scripts/core/ScenePortal.ts`
  - supports portal `SpriteFrame`
  - supports one-shot enter sound
- `assets/scripts/core/CheckpointMarker.ts`
  - supports checkpoint `SpriteFrame`
- `assets/scripts/core/FlagGateController.ts`
  - supports closed / open gate `SpriteFrame`
- `assets/scripts/visual/SpriteVisualSkin.ts`
  - already provides the bridge from placeholder `RectVisual` nodes to sprite-based first-pass art

This means:

- Phase 1 is fundamentally code-ready
- most of Phase 2 is code-ready
- large parts of Phase 3 and Phase 5 are scene-binding work, not logic work

## Current blockers and thin spots

### 1. Pickups and relics are still logic-only

Relevant scripts:

- `assets/scripts/echo/EchoUnlockPickup.ts`
- `assets/scripts/core/ProgressFlagPickup.ts`

Current state:

- both scripts only handle trigger logic
- neither script exposes `SpriteFrame`
- neither script exposes pickup audio
- neither script provides a standard collected / idle visual path

Impact:

- `T06` being blocked is not only a scene-authoring issue
- you can still place a sprite manually in the scene, but there is no reusable pickup presentation path yet

Recommendation:

- add one reusable pickup skin layer rather than wiring each pickup by hand
- smallest safe option:
  - add `visualSpriteFrame: SpriteFrame | null`
  - add `pickupClip: AudioClip | null`
  - apply sprite in `onLoad()`
  - play one-shot sound on collect
- better option:
  - introduce one shared `CollectibleVisual.ts` component and let both pickup scripts use it

### 2. Breakables and destructible props lack first-pass visual hooks

Relevant script:

- `assets/scripts/puzzle/BreakableTarget.ts`

Current state:

- the script only toggles child nodes
- there is no sprite binding field
- there is no break sound, impact effect, or broken/unbroken art helper

Impact:

- the gameplay is usable
- the asset pass will become repetitive if every breakable prop has to be custom-wired in scene nodes

Recommendation:

- for Phase 5 and Phase 6, add one reusable visual binding path for:
  - intact sprite
  - broken sprite
  - optional break clip
- gameplay logic itself does not need to change
- this is a presentation-layer extension

### 3. Echo prefabs are still prototype-facing

Relevant assets/scripts:

- `assets/prefabs/EchoBox.prefab`
- `assets/prefabs/EchoSpringFlower.prefab`
- `assets/prefabs/EchoBombBug.prefab`
- `assets/scripts/echo/BombBugFuse.ts`
- `assets/scripts/echo/SpringFlowerBounce.ts`

Current state:

- all three echo prefabs are still built around:
  - `RectVisual`
  - label text
- `BombBugFuse.ts` still tries to drive a `Label` countdown on the root

Impact:

- static first-pass prop art can be attached
- but the current prefab structure still assumes debug-style text readability
- this is especially weak for:
  - Bomb Bug
  - Spring Flower

Recommendation:

- Phase 4 or Phase 6 should refactor the echo prefabs, not just restyle them
- preferred change:
  - keep gameplay root and colliders untouched
  - replace the current visual subtree with a dedicated art child
  - move countdown text to an optional child overlay instead of using the root label

Logic impact:

- low
- mostly prefab structure and a small BombBug UI adjustment

### 4. Player, enemy, and boss art do not yet have a proper visual adapter layer

Relevant scripts:

- `assets/scripts/player/PlayerController.ts`
- `assets/scripts/enemy/EnemyAI.ts`
- `assets/scripts/boss/BossEncounterController.ts`
- `assets/scripts/boss/BossShieldPhaseController.ts`

Current state:

- gameplay logic is clean, but visual state exposure is minimal
- `PlayerController.ts` gives you:
  - facing direction
  - attack start / end events
- but it does not expose:
  - move-state events
  - hurt event
  - idle/run/forced-move state in a visual-friendly way
- `EnemyAI.ts` does not expose:
  - current state publicly
  - facing direction
  - state-changed events
- boss scripts toggle gameplay nodes and damage windows, but do not provide a dedicated VFX/audio-facing adapter

Impact:

- static character sprites can be dropped in now
- animated sprite-sheet integration will be awkward and brittle if done directly against current gameplay scripts

Recommendation:

- do not rewrite gameplay
- add thin visual adapter components instead:
  - `PlayerVisualController.ts`
  - `EnemyVisualController.ts`
  - `BossVisualController.ts`
- minimum gameplay-side extensions worth adding:
  - `PlayerController.getMoveInput()` or `isMoving()`
  - player hurt / respawn event
  - `EnemyAI.getState()` and `getFacingDirection()`
  - optional enemy state-changed event

This is the main place where logic-layer changes are actually justified.

### 5. Scene music is not a real system yet

Relevant code:

- `assets/scripts/core/SceneLoader.ts`
- `assets/scripts/core/ScenePortal.ts`
- `assets/scripts/input/TouchCommandButton.ts`

Current state:

- one-shot UI and portal sounds are already supported
- there is still no scene-level music controller
- `SceneLoader.ts` only switches scenes
- there is no BGM start / stop / fade / persist behavior

Impact:

- this is the real code blocker for `T12`
- wiring battle BGM straight into `BossArena` without a small music system will create special-case logic

Recommendation:

- add a small `SceneMusicController.ts` or `AudioBusController.ts`
- minimum feature set:
  - play looped BGM on scene start
  - stop or fade on scene switch
  - support per-scene `AudioClip`
- this is a code-side addition, but it is isolated and does not require gameplay changes

### 6. Asset manifests exist, but the project does not consume them

Relevant files:

- `assets/configs/asset_selection_manifest.json`
- `assets/configs/asset_binding_manifest_v2.json`
- `tools/generate-week2-scenes.mjs`

Current state:

- the manifests are useful editorially
- but runtime and generation code do not read them
- the actual scene structure is still mostly authored by generator code plus explicit scene bindings

Impact:

- this is manageable for one scene pass
- it becomes risky as soon as more scenes need the same asset family propagated consistently

Recommendation:

- do not add a runtime string-loader system
- instead, add build-time or generator-time manifest consumption
- the best fit for this project is:
  - keep scene/prefab references explicit
  - teach `tools/generate-week2-scenes.mjs` to read one binding manifest for shared assets

This is not required to finish Phase 3, but it becomes strongly recommended before large Phase 5 rollout.

### 7. One old layout path should be treated as deprecated

Relevant file:

- `assets/scripts/ui/CanvasHudLayout.ts`

Current state:

- `GameHud.ts` already owns the real HUD responsive layout path
- `CanvasHudLayout.ts` duplicates old layout logic
- there is no evidence that current main scenes should continue using it

Impact:

- this is not a blocker
- but it is a trap for future asset integration, because it creates uncertainty about which HUD path is canonical

Recommendation:

- treat `GameHud.ts` as the only active HUD layout path
- either remove `CanvasHudLayout.ts` later or mark it as deprecated in docs

## Phase-by-phase code impact

### Phase 3: Outdoor biome pass

Code changes required:

- none for gameplay logic
- small scene/prefab binding work only

What can be done directly:

- outdoor ground and wall art
- checkpoint and portal art reuse
- scene props and landmarks
- `FieldWest` UI asset propagation

What is optional but helpful:

- read shared bindings from the manifest in the scene generator

### Phase 4: Boss encounter pass

Code changes required:

- yes, small but meaningful

Needed additions:

- boss visual adapter layer
- scene BGM controller
- likely boss hit / shield / vulnerability visual hooks

Gameplay rewrite needed:

- no

### Phase 5: Dungeon room rollout

Code changes required:

- mostly no, if you only reuse the Phase 2 dungeon prop language

Needed additions:

- breakable / pickup visual support if you want the rooms to stop depending on placeholder node toggles

Gameplay rewrite needed:

- no

### Phase 6: MechanicsLab and echo polish

Code changes required:

- yes, mostly on prefab presentation

Needed additions:

- better echo prefab visual structure
- optional projectile/trap visual hooks
- optional world label / pixel font path if that becomes runtime-ready

Gameplay rewrite needed:

- no

## Recommended implementation order

### Do now

1. Keep using current scene binding for Phase 3 environment art.
2. Add reusable visual/audio support to:
   - `ProgressFlagPickup.ts`
   - `EchoUnlockPickup.ts`
   - `BreakableTarget.ts`
3. Mark `GameHud.ts` as the canonical HUD skin/layout path and stop extending `CanvasHudLayout.ts`.

### Do before BossArena art lock

1. Add a small scene music controller.
2. Add visual adapter components for:
   - player
   - enemy
   - boss

### Do before full echo polish

1. Refactor echo prefabs so art is not anchored to `Label` placeholders.
2. Move Bomb Bug countdown to an optional overlay child.

### Do before large-scale scene propagation

1. Make `tools/generate-week2-scenes.mjs` read a shared binding manifest.

## Final answer

If the question is:

Does asset integration now require gameplay-layer rewrites?

The answer is:

- no for UI, environment, checkpoints, portals, and gate-state work
- yes for a few targeted presentation-facing extensions around:
  - pickups
  - breakables
  - character/boss visual state exposure
  - BGM
  - echo prefab presentation

So the codebase is already good enough to keep moving into Phase 3, but it is not yet fully prepared for the later character- and boss-facing asset passes without a small round of presentation-layer engineering.
