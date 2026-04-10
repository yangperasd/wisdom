# Code Asset Entity Inventory - 2026-04-08

## Project shape

- Engine/workflow: Cocos Creator 3.8.8
- Current build model: scene/prefab wiring plus script-driven HUD
- Current visual state: many scene objects are still using labels and procedural `RectVisual` blocks as placeholders
- Current audio state: no explicit runtime audio playback wiring found yet

## Scenes

- `StartCamp`
- `FieldWest`
- `FieldRuins`
- `DungeonHub`
- `DungeonRoomA`
- `DungeonRoomB`
- `DungeonRoomC`
- `BossArena`
- `MechanicsLab`

## Explicit systems found in code

### Core gameplay systems

- Player movement and attack
- Health and damage
- Enemy AI
- Boss encounter and boss shield phase
- Echo summon system:
  - Box
  - Spring Flower
  - Bomb Bug
- Projectile traps and simple projectiles
- Checkpoints, respawn, scene portals
- Flag-gated progression
- Room reset and puzzle state reset

### UI systems

- Top HUD bar
- Objective card
- Controls card
- Scene title label
- Health label
- Echo label
- Checkpoint label
- Pause panel
- Touch joystick
- Touch attack button
- Touch summon button
- Touch respawn button
- Touch echo selection buttons
- Pause toggle button

### Current prefab set

- `ArrowProjectile`
- `EchoBox`
- `EchoSpringFlower`
- `EchoBombBug`

## Entity groups that need canonical art decisions

### Global UI

- HUD top bar
- Objective card
- Controls card
- Touch buttons
- Pause buttons
- System icons
- UI font roles
- UI confirm/click/error/open/close sound roles

### Player-facing world entities

- Player avatar
- Player attack effect or hit feedback
- Checkpoint marker
- Scene portal marker
- Echo unlock pickup
- Breakable target
- Pressure plate
- Barrier open / barrier closed
- Reset / respawn hazard zones

### Echo entities

- Echo Box
- Echo Spring Flower
- Echo Bomb Bug

### Enemy entities

- Common enemy
- Dungeon room variant enemy
- Ruins/field enemy variant
- Boss core
- Boss shield closed
- Boss shield open
- Projectile enemy/trap

### Environment groups

- Camp / field / ruins exterior
- Dungeon floors
- Dungeon walls
- Dungeon doors and gates
- Trap / lab / mechanical surfaces
- Boss arena set dressing

## Scene-to-asset needs

### StartCamp

- Needs:
  - global HUD
  - pause menu
  - player
  - checkpoint
  - portal
  - camp/field environment
- Status:
  - HUD and fonts can be standardized now
  - camp environment still needs a final canonical subset

### FieldWest

- Needs:
  - global HUD
  - player
  - portal
  - checkpoint
  - enemy
  - field/ruins environment
- Status:
  - field-facing environment is still weaker than dungeon-facing coverage

### FieldRuins

- Needs:
  - global HUD
  - player
  - ruins enemy
  - echo pickup
  - hints / checkpoint / portal
  - ruins environment
- Status:
  - a consistent enemy family can be chosen now
  - ruins environment still needs a locked material family

### DungeonHub

- Needs:
  - global HUD
  - player
  - checkpoint
  - door/gate states
  - dungeon environment
- Status:
  - DENZI can cover this immediately

### DungeonRoomA

- Needs:
  - global HUD
  - player
  - breakable target / room reset
  - enemy
  - checkpoint / portal
  - dungeon environment
- Status:
  - DENZI is a good fit

### DungeonRoomB

- Needs:
  - global HUD
  - player
  - projectile trap
  - enemy
  - checkpoint / portal
  - dungeon / trap environment
- Status:
  - DENZI plus current projectile prefab is enough for a first pass

### DungeonRoomC

- Needs:
  - global HUD
  - player
  - barriers
  - relic or pickup object
  - enemy
  - checkpoint / portal
  - dungeon environment
- Status:
  - DENZI mainline can cover most of this

### BossArena

- Needs:
  - global HUD
  - player
  - boss
  - boss shield closed/open states
  - boss lane / backdrop / banners
  - checkpoint / exit portal
  - boss music
- Status:
  - boss art and boss BGM are still not fully locked

### MechanicsLab

- Needs:
  - global HUD
  - player
  - mechanical / trap environment
  - projectile logic support
  - checkpoint / portal
- Status:
  - can reuse DENZI metal / compound families

## Canonical role decisions from this pass

### Selected now

- `ui_main_family`: Kenney Red / Default
- `ui_icon_family`: Kenney Game Icons
- `ui_font_main`: Kenney Future
- `ui_font_pixel`: SDS_8x8
- `world_main_family`: DENZI
- `combat_sfx_family`: RPG Sound Pack split runtime folders
- `ui_sfx_family`: Kenney UI, with JRPG and Menu Alt retained as reserve-use options

### Still unresolved

- Outdoor field/camp canonical tileset subset
- Final boss sprite family
- Final echo-specific sprite language
- Runtime BGM selection and placement

## Asset policy implication

To avoid scene drift, these rules should hold:

- The same HUD widget must reuse the same Kenney family asset across all scenes.
- The same role must map to one font key, not one font per scene.
- The same enemy class should not switch between DENZI and DawnLike by scene.
- Alternate packs remain in reserve until an explicit replacement decision is made.
