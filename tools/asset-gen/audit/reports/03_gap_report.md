# Gap Analysis — game needs × pipeline supply

Generated at: 2026-04-17T03:22:40.236Z

## A. Manifest bindings with NO corresponding prompt

- `worldEntities.player`  expected: `assets/art/characters/player/denzi/paperdoll/doll_female.png`
- `worldEntities.common_enemy`  expected: `(no path)`
- `worldEntities.boss_core`  expected: `(no path)`
- `worldEntities.checkpoint`  expected: `(no path)`
- `worldEntities.outdoor_ground_green`  expected: `assets/art/environment/dungeon/denzi/floor/darkgreen/floor_darkgreen_a.png`
- `worldEntities.outdoor_ground_flowers`  expected: `assets/art/environment/dungeon/denzi/floor/flowers/floor_flowers_a.png`
- `worldEntities.outdoor_path_cobble`  expected: `assets/art/environment/dungeon/denzi/floor/cobblestone/floor_cobblestone_a.png`
- `worldEntities.outdoor_ground_ruins`  expected: `assets/art/environment/dungeon/denzi/floor/cinder/floor_cinder_b.png`
- `worldEntities.outdoor_wall_standard`  expected: `assets/art/environment/dungeon/denzi/wall/compound/standard/wall_compound_standard_b.png`
- `worldEntities.outdoor_wall_broken`  expected: `assets/art/environment/dungeon/denzi/wall/compound/breakdown/wall_compound_breakdown_b.png`
- `worldEntities.outdoor_wall_cracked`  expected: `assets/art/environment/dungeon/denzi/wall/compound/crack/wall_compound_crack_b.png`
- `worldEntities.breakable_target`  expected: `assets/art/characters/enemies/denzi/monsters/traps/trap_unidentified.png`
- `worldEntities.pickup_relic`  expected: `assets/art/items/denzi/items/shield/shield_deep_a.png`
- `worldEntities.environment_dungeon_floor_family`  expected: `(no path)`
- `worldEntities.environment_dungeon_wall_family`  expected: `(no path)`
- `worldEntities.environment_dungeon_prop_family`  expected: `(no path)`
- `uiEntities.objective_card`  expected: `assets/art/ui/hud/kenney/PNG/Red/Default/button_rectangle_gloss.png`
- `uiEntities.controls_card`  expected: `assets/art/ui/hud/kenney/PNG/Red/Default/button_rectangle_depth_flat.png`
- `uiEntities.touch_attack_button`  expected: `(no path)`
- `uiEntities.touch_summon_button`  expected: `(no path)`
- `uiEntities.touch_respawn_button`  expected: `(no path)`
- `uiEntities.pause_button`  expected: `(no path)`
- `audioRoles.ui_click_primary`  expected: `assets/audio/ui/kenney/click-b.ogg`
- `audioRoles.ui_confirm_primary`  expected: `assets/audio/ui/menu_alt/MESSAGE-B_Accept.wav`
- `audioRoles.ui_open_menu`  expected: `assets/audio/ui/menu_alt/MENU A_Select.wav`
- `audioRoles.ui_error`  expected: `assets/audio/ui/menu_alt/ALERT_Error.wav`
- `audioRoles.combat_player_swing`  expected: `(no path)`
- `audioRoles.enemy_bite_small`  expected: `assets/audio/sfx/enemies/rpg/beetle/bite-small2.wav`
- `audioRoles.enemy_giant_voice`  expected: `(no path)`
- `audioRoles.world_door_open`  expected: `(no path)`
- `audioRoles.battle_bgm`  expected: `(no path)`
- `fonts.ui_font_main`  expected: `(no path)`
- `fonts.ui_font_compact`  expected: `(no path)`
- `fonts.ui_font_world_label`  expected: `assets/art/ui/fonts/kenney/Kenney Future Narrow.ttf`

## B. Prompts with ZERO candidates passing Round 0 (gen/quality gap)

- `vfx_portal_glow` (portal): generated 8, passed R0: 0
- `vfx_arrow_trail` (trail): generated 8, passed R0: 0
- `vfx_echo_summon` (magic): generated 8, passed R0: 0
- `btn_action_normal` (button): generated 8, passed R0: 0
- `bar_health_fill` (bar): generated 8, passed R0: 0

## C. Prompts with ZERO generations (never ran or failed silently)

_(none)_

## D. Prompts screened but NOT 9-agent complete

Total: 53/53

- `sword_iron` r1:3/3 r2:0/3 r3:0/3
- `sword_fire` r1:3/3 r2:0/3 r3:0/3
- `sword_ice` r1:3/3 r2:0/3 r3:0/3
- `axe_battle` r1:3/3 r2:0/3 r3:0/3
- `staff_magic` r1:3/3 r2:0/3 r3:0/3
- `bow_longbow` r1:3/3 r2:0/3 r3:0/3
- `dagger_quick` r1:3/3 r2:0/3 r3:0/3
- `mace_holy` r1:3/3 r2:0/3 r3:0/3
- `potion_health` r1:3/3 r2:0/3 r3:0/3
- `potion_mana` r1:3/3 r2:0/3 r3:0/3
- ...(43 more)

## E. Entity classes STILL using RectVisual placeholder

- `(unknown-class)`

## F. Prefab SpriteFrame fields set to null

- `assets/prefabs/ArrowProjectile.prefab` :: `visualSpriteFrame`
