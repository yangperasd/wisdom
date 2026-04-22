# UI AI Asset Wiring — Blocked

## Status

12 AI UI assets are placed under `assets/art/ui/` and registered in `asset_binding_manifest_v2.json` as `source: ai-generated`, but **no scene or prefab currently renders them as sprites**.

## Why

The HUD/UI in all scenes (StartCamp / DungeonRoomA-C / FieldWest / FieldRuins / BossArena / DungeonHub / MechanicsLab) renders UI via the `RectVisual` component at `assets/scripts/visual/RectVisual.ts`. RectVisual uses the Graphics API to draw colored rectangles + gradient / hatch / highlight for a placeholder look. It has **no `SpriteFrame` field** — it cannot display a PNG.

Every UI node like `HudTopBar`, `HudObjectiveCard`, `HudControlsCard`, `TouchAttack-Visual`, `TouchPause-Visual` etc. is a RectVisual, not a Sprite.

## AI UI assets without a sprite consumer

| Binding key | AI PNG path | Expected scene presence |
|---|---|---|
| hud_top_bar | assets/art/ui/skins/echoes/panel/hud_top_bar.png | HudTopBar node across all scenes |
| objective_card | assets/art/ui/skins/echoes/panel/objective_card.png | HudObjectiveCard |
| controls_card | assets/art/ui/skins/echoes/panel/controls_card.png | HudControlsCard |
| touch_attack_button | assets/art/ui/skins/echoes/button/touch_attack_button.png | TouchAttack-Visual |
| touch_summon_button | assets/art/ui/skins/echoes/button/touch_summon_button.png | TouchPlaceEcho-Visual |
| touch_respawn_button | assets/art/ui/skins/echoes/button/touch_respawn_button.png | TouchRespawn-Visual |
| touch_echo_button | assets/art/ui/skins/echoes/button/touch_echo_button.png | TouchEchoBox/Flower/Bomb-Visual |
| pause_button | assets/art/ui/skins/echoes/button/pause_button.png | TouchPause-Visual |
| system_pause_icon | assets/art/ui/icons/echoes/system_pause_icon.png | (inside pause button) |
| system_confirm_icon | assets/art/ui/icons/echoes/system_confirm_icon.png | (unbound for now) |
| common_enemy | assets/art/generated/enemy/common_enemy.png | worldEntity — see note below |
| barrier_closed | assets/art/generated/marker/barrier_closed.png | worldEntity — no node present in any scene |

## Decisions blocking further auto-wiring

### Path A — Replace RectVisual with cc.Sprite

Touch every `*-Visual` node and `Hud*Card` node:
1. Remove the `RectVisual` component (or keep it disabled as backdrop).
2. Add a `cc.Sprite` component.
3. Wire its `spriteFrame` field to the AI SpriteFrame UUID.
4. Deal with sizing / label visibility (RectVisual's decorative role is lost).

Risk: changes the visual layout semantics, may break existing HUD tests.

### Path B — Add SpriteFrame support to RectVisual

Extend `RectVisual.ts` with an optional `spriteFrame` property; when set, render the sprite centered/stretched instead of the colored rect. Then wire the AI UUID into each RectVisual instance.

Risk: bigger code change, but keeps all existing geometry + `hideLabelWhenSkinned` style behavior.

### Path C — Leave UI as-is, ship only world-asset AI upgrades

Only world entities (tiles, checkpoints, enemies, pickups, etc.) use AI assets. UI stays on Kenney + RectVisual placeholders until a deliberate UI skin pass is done.

## Additional notes

- `common_enemy` binding is in manifest but no scene node has `bindingKey: "common_enemy"` — the actual enemy prefab referenced from scenes is `monsters/deepdwarf/deepdwarf_a.png`. Rewiring it requires a different hook (probably EnemyVisualController's spriteFrame defaults).
- `barrier_closed` has a similar situation — not present in any scene node.

## Recommendation

Present these 3 paths to the user. Do NOT pick unilaterally — Path A and B both involve behavioral changes.
