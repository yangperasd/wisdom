# Complete Rewire Plan (V2)
Timestamp: 2026-04-20T11:29:32.589Z

## Summary
- AI bindings in manifest: 19
- Binding keys with candidate locations: 7
- Total plan entries: 56
  - Real UUID swaps (to apply): **13**
  - UUID already correct (no-op): 13
  - tag.selectedPath updates (to apply): 17
  - tag.selectedPath already correct (no-op): 13


### barrier_open  →  assets/art/generated/marker/barrier_open.png
- SpriteFrame: 164ff52d-0d32-4672-92e3-88eb4854d4c2@f9941  |  Texture: 164ff52d-0d32-4672-92e3-88eb4854d4c2@6c48a
- Actionable: 2 / 2

| # | File | Node #id (name) | Component | Field | Current → New |
|---|---|---|---|---|---|
| 1 | assets/scenes/FieldRuins.scene | #297 (RuinsWall-Open) | 5a770BhwHBNKL5hXAituhD+ | spriteFrame | `3e045e5d-7115...` → `164ff52d-0d32...` |
| 2 | assets/scenes/FieldRuins.scene | #297 (RuinsWall-Open) | AssetBindingTag | selectedPath | `assets/art/environment/dungeon/denzi/wall/compound/breakdown/wall_compound_breakdown_a.png` → `assets/art/generated/marker/barrier_open.png` |

### boss_core  →  assets/art/generated/enemy/boss_core.png
- SpriteFrame: (none in .meta)  |  Texture: b707f4eb-ae7b-42f6-aebb-548c0ee04acf@6c48a
- Actionable: 2 / 2

| # | File | Node #id (name) | Component | Field | Current → New |
|---|---|---|---|---|---|
| 1 | assets/scenes/BossArena.scene | #211 (BossEnemy-Core) | 95602/xKPxEzLPyROilT699 | dangerTexture | `4b4e5bc7-6cd2...` → `b707f4eb-ae7b...` |
| 2 | assets/scenes/BossArena.scene | #211 (BossEnemy-Core) | AssetBindingTag | selectedPath | `assets/art/characters/enemies/denzi/monsters/seraph/seraph.png` → `assets/art/generated/enemy/boss_core.png` |

### breakable_target  →  assets/art/generated/enemy/breakable_target.png
- SpriteFrame: (none in .meta)  |  Texture: 69ec051a-3fe0-4280-8346-a6954fe76680@6c48a
- Actionable: 1 / 3

| # | File | Node #id (name) | Component | Field | Current → New |
|---|---|---|---|---|---|
| 1 | assets/scenes/MechanicsLab.scene | #192 (BombGateRoot) | AssetBindingTag | selectedPath | `assets/art/characters/enemies/denzi/monsters/traps/trap_pressureplate.png` → `assets/art/generated/enemy/breakable_target.png` |

### checkpoint  →  assets/art/generated/marker/checkpoint.png
- SpriteFrame: 3a1cbb19-debf-4581-8ce6-3db40f36fe2c@f9941  |  Texture: 3a1cbb19-debf-4581-8ce6-3db40f36fe2c@6c48a
- Actionable: 22 / 22

| # | File | Node #id (name) | Component | Field | Current → New |
|---|---|---|---|---|---|
| 1 | assets/scenes/BossArena.scene | #200 (Checkpoint-BossArena) | 4fefbUSqChNH4KCAepDh+Dc | visualSpriteFrame | `413b43cb-75e7...` → `3a1cbb19-debf...` |
| 2 | assets/scenes/BossArena.scene | #200 (Checkpoint-BossArena) | AssetBindingTag | selectedPath | `assets/art/environment/dungeon/denzi/features/ashenzaris_altar.png` → `assets/art/generated/marker/checkpoint.png` |
| 3 | assets/scenes/DungeonHub.scene | #202 (Checkpoint-DungeonHub) | 4fefbUSqChNH4KCAepDh+Dc | visualSpriteFrame | `413b43cb-75e7...` → `3a1cbb19-debf...` |
| 4 | assets/scenes/DungeonHub.scene | #202 (Checkpoint-DungeonHub) | AssetBindingTag | selectedPath | `assets/art/environment/dungeon/denzi/features/ashenzaris_altar.png` → `assets/art/generated/marker/checkpoint.png` |
| 5 | assets/scenes/DungeonRoomA.scene | #200 (Checkpoint-DungeonRoomA) | 4fefbUSqChNH4KCAepDh+Dc | visualSpriteFrame | `413b43cb-75e7...` → `3a1cbb19-debf...` |
| 6 | assets/scenes/DungeonRoomA.scene | #200 (Checkpoint-DungeonRoomA) | AssetBindingTag | selectedPath | `assets/art/environment/dungeon/denzi/features/ashenzaris_altar.png` → `assets/art/generated/marker/checkpoint.png` |
| 7 | assets/scenes/DungeonRoomB.scene | #225 (Checkpoint-DungeonRoomB) | 4fefbUSqChNH4KCAepDh+Dc | visualSpriteFrame | `413b43cb-75e7...` → `3a1cbb19-debf...` |
| 8 | assets/scenes/DungeonRoomB.scene | #225 (Checkpoint-DungeonRoomB) | AssetBindingTag | selectedPath | `assets/art/environment/dungeon/denzi/features/ashenzaris_altar.png` → `assets/art/generated/marker/checkpoint.png` |
| 9 | assets/scenes/DungeonRoomC.scene | #220 (Checkpoint-DungeonRoomC) | 4fefbUSqChNH4KCAepDh+Dc | visualSpriteFrame | `413b43cb-75e7...` → `3a1cbb19-debf...` |
| 10 | assets/scenes/DungeonRoomC.scene | #220 (Checkpoint-DungeonRoomC) | AssetBindingTag | selectedPath | `assets/art/environment/dungeon/denzi/features/ashenzaris_altar.png` → `assets/art/generated/marker/checkpoint.png` |
| 11 | assets/scenes/FieldRuins.scene | #215 (Checkpoint-FieldRuins) | 4fefbUSqChNH4KCAepDh+Dc | visualSpriteFrame | `413b43cb-75e7...` → `3a1cbb19-debf...` |
| 12 | assets/scenes/FieldRuins.scene | #215 (Checkpoint-FieldRuins) | AssetBindingTag | selectedPath | `assets/art/environment/dungeon/denzi/features/ashenzaris_altar.png` → `assets/art/generated/marker/checkpoint.png` |
| 13 | assets/scenes/FieldWest.scene | #215 (Checkpoint-FieldWest) | 4fefbUSqChNH4KCAepDh+Dc | visualSpriteFrame | `413b43cb-75e7...` → `3a1cbb19-debf...` |
| 14 | assets/scenes/FieldWest.scene | #215 (Checkpoint-FieldWest) | AssetBindingTag | selectedPath | `assets/art/environment/dungeon/denzi/features/ashenzaris_altar.png` → `assets/art/generated/marker/checkpoint.png` |
| 15 | assets/scenes/FieldWest.scene | #226 (Checkpoint-FieldWestReturn) | 4fefbUSqChNH4KCAepDh+Dc | visualSpriteFrame | `413b43cb-75e7...` → `3a1cbb19-debf...` |
| 16 | assets/scenes/FieldWest.scene | #226 (Checkpoint-FieldWestReturn) | AssetBindingTag | selectedPath | `assets/art/environment/dungeon/denzi/features/ashenzaris_altar.png` → `assets/art/generated/marker/checkpoint.png` |
| 17 | assets/scenes/MechanicsLab.scene | #84 (Checkpoint-01) | 4fefbUSqChNH4KCAepDh+Dc | visualSpriteFrame | `413b43cb-75e7...` → `3a1cbb19-debf...` |
| 18 | assets/scenes/MechanicsLab.scene | #84 (Checkpoint-01) | AssetBindingTag | selectedPath | `assets/art/environment/dungeon/denzi/features/ashenzaris_altar.png` → `assets/art/generated/marker/checkpoint.png` |
| 19 | assets/scenes/StartCamp.scene | #215 (Checkpoint-Camp) | 4fefbUSqChNH4KCAepDh+Dc | visualSpriteFrame | `413b43cb-75e7...` → `3a1cbb19-debf...` |
| 20 | assets/scenes/StartCamp.scene | #215 (Checkpoint-Camp) | AssetBindingTag | selectedPath | `assets/art/environment/dungeon/denzi/features/ashenzaris_altar.png` → `assets/art/generated/marker/checkpoint.png` |
| 21 | assets/scenes/StartCamp.scene | #226 (Checkpoint-CampReturn) | 4fefbUSqChNH4KCAepDh+Dc | visualSpriteFrame | `413b43cb-75e7...` → `3a1cbb19-debf...` |
| 22 | assets/scenes/StartCamp.scene | #226 (Checkpoint-CampReturn) | AssetBindingTag | selectedPath | `assets/art/environment/dungeon/denzi/features/ashenzaris_altar.png` → `assets/art/generated/marker/checkpoint.png` |

### outdoor_ground_green  →  assets/art/generated/tile/outdoor_ground_green.png
- SpriteFrame: (none in .meta)  |  Texture: 99384034-c3e1-4a69-8dda-8d72941ae52c@6c48a
- Actionable: 0 / 12

  (all entries already point to AI asset — nothing to do)

### outdoor_ground_ruins  →  assets/art/generated/tile/outdoor_ground_ruins.png
- SpriteFrame: (none in .meta)  |  Texture: 2248350b-583b-478d-8a6b-f9e462419658@6c48a
- Actionable: 0 / 12

  (all entries already point to AI asset — nothing to do)

### pickup_relic  →  assets/art/items/generated/treasure/pickup_relic.png
- SpriteFrame: (none in .meta)  |  Texture: 7a9193a1-30bd-438e-b089-1d833f772be0@6c48a
- Actionable: 3 / 3

| # | File | Node #id (name) | Component | Field | Current → New |
|---|---|---|---|---|---|
| 1 | assets/scenes/DungeonRoomA.scene | #260 (RoomA-ClearRelic) | AssetBindingTag | selectedPath | `assets/art/items/denzi/items/helmet/helmet_enchanted.png` → `assets/art/items/generated/treasure/pickup_relic.png` |
| 2 | assets/scenes/DungeonRoomB.scene | #286 (RoomB-ClearRelic) | AssetBindingTag | selectedPath | `assets/art/items/denzi/items/helmet/helmet_enchanted.png` → `assets/art/items/generated/treasure/pickup_relic.png` |
| 3 | assets/scenes/DungeonRoomC.scene | #270 (RoomC-ClearRelic) | AssetBindingTag | selectedPath | `assets/art/items/denzi/items/helmet/helmet_enchanted.png` → `assets/art/items/generated/treasure/pickup_relic.png` |

### AI bindings with NO location found in any scene/prefab
- `hud_top_bar` — assets/art/ui/skins/echoes/panel/hud_top_bar.png
- `objective_card` — assets/art/ui/skins/echoes/panel/objective_card.png
- `controls_card` — assets/art/ui/skins/echoes/panel/controls_card.png
- `touch_attack_button` — assets/art/ui/skins/echoes/button/touch_attack_button.png
- `touch_summon_button` — assets/art/ui/skins/echoes/button/touch_summon_button.png
- `touch_respawn_button` — assets/art/ui/skins/echoes/button/touch_respawn_button.png
- `touch_echo_button` — assets/art/ui/skins/echoes/button/touch_echo_button.png
- `pause_button` — assets/art/ui/skins/echoes/button/pause_button.png
- `system_pause_icon` — assets/art/ui/icons/echoes/system_pause_icon.png
- `system_confirm_icon` — assets/art/ui/icons/echoes/system_confirm_icon.png
- `common_enemy` — assets/art/generated/enemy/common_enemy.png
- `barrier_closed` — assets/art/generated/marker/barrier_closed.png