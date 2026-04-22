# Loop 22 Mixed UI Copy Plan

## Goal

Reduce the current mixed UI / sign-board feel without changing the cute, warm north star or adding new assets.

The hard constraint is still player clarity in the first 5 seconds:

- Player must know where they are.
- Player must know the current goal.
- Player must know the one or two immediately available actions.
- Everything else should become background, not a competing voice.

This loop only allows procedural work:

- Rename text.
- Merge or delete duplicate labels.
- Shorten copy.
- Reposition or downscale existing surface elements.
- Lower opacity / visual weight of non-essential panels.

No new art, no new assets, no scene structure rewrite.

## What The Screenshots Are Telling Us

The biggest problem is not missing information. It is that too many surfaces are trying to explain the game at the same time.

Across `StartCamp`, `FieldWest`, `FieldRuins`, `DungeonHub`, `DungeonRoomA/B/C`, and `BossArena`, the frame usually contains all of these at once:

- a scene title,
- a long objective banner,
- a floating signboard hint,
- one or more English state chips,
- a back-navigation button,
- the action buttons `SUMMON` and `ATTACK`,
- `PAUSE`,
- and sometimes a second status label like `CHECK`, `PENDING`, or `BOUNDARY`.

That creates a “control panel over world” read instead of a “cute world with gentle guidance” read.

## Top 5 Highest-Impact Changes

1. Collapse the title language into one scene style.

   Use one language per scene family for the visible title and room labels. The current mix of Chinese objectives, English room names, and English state chips is the fastest way to make the UI feel layered and technical.

   Recommended direction:

   - camp / field scenes: Chinese title + Chinese objective copy,
   - dungeon scenes: Chinese title + Chinese room identity,
   - keep only `SUMMON`, `ATTACK`, and `PAUSE` as the stable action vocabulary for now.

2. Delete duplicate “check” surfaces.

   Each scene currently has both a long objective banner and a smaller sign-like label such as `BOX TRAINING`, `WEST GATE CHECK`, `ROOM A CHECK`, or `BOSS CHECK`.

   Keep the objective banner, remove the duplicate signboard, or collapse the signboard into a tiny sublabel. The banner should be the single source of truth for what to do next.

3. Convert English state chips into visual status, not story text.

   Chips like `PENDING`, `BOUNDARY`, `SCOUT`, `GUARD`, `TRAP`, `FLOWER SPOT`, and `BOMB SPOT` read like debug annotations because they are big, hard-edged, and numerous.

   Procedural fix:

   - keep only one state chip per scene when truly needed,
   - shorten chip text to a single noun if possible,
   - reduce size and opacity,
   - move them away from the main path or goal area.

4. Demote navigation buttons into secondary chips.

   Buttons like `BACK TO HUB`, `BACK TO WEST`, `BACK TO RUINS`, `RETURN CAMP` are useful, but they currently compete with the main objective and make the layout feel like a menu.

   Keep the function, but make the surface lighter:

   - smaller width,
   - lower contrast,
   - less elevation,
   - closer to the edge,
   - and only one back action visible at a time.

5. Shrink the boss and dungeon “board” surfaces.

   The large pale translucent rectangles are the main visual reason the scenes still read as UI overlays. They are not bad by themselves, but they occupy too much of the frame.

   Recommended procedural change:

   - trim their width and height,
   - raise transparency,
   - reduce corner emphasis,
   - keep them as soft background support instead of the primary object in frame.

## Scene-by-Scene Priority

### `StartCamp`

- Keep the camp title and the objective banner.
- Remove or absorb `BOX TRAINING`.
- Keep `SLIME`, `WEST GATE`, `SUMMON`, and `ATTACK` only if they stay tiny and clearly subordinate.
- Goal: the player should read this as “camp entrance, train, then go west,” not “test board with labels.”

### `FieldWest`

- Keep the route clarity.
- Replace the long explanatory label with shorter action copy.
- Demote `BACK TO CAMP` and `SCOUT` into lighter chips.
- Goal: feel like a gentle route node, not a mid-screen control overlay.

### `FieldRuins`

- Preserve the “advance through ruins” understanding.
- Replace `UNLOCK BOMB`, `GUARD`, `TRAP`, and `BACK TO WEST` with shorter, lighter, more ordinal labels.
- Goal: the ruins should still be readable in 5 seconds, but the scene should stop speaking in subsystem language.

### `DungeonHub`

- This is the most important de-mixing scene.
- Replace `Trial Hub`, `ROOM A/B/C`, and `PENDING` as floating block text with a single hub title, smaller room tags, and one status layer.
- Goal: feel like a world hub that points forward, not a dashboard.

### `DungeonRoomA`

- Keep the room identity and the “box” mechanic.
- Remove redundant `ROOM A CHECK` weight.
- Keep `WARDEN`, `PLATE`, and `GATE` only if they can be visually subordinated to the room.
- Goal: one glance should say “box room, place box, open gate.”

### `DungeonRoomB`

- This scene has the strongest mixed-overlay debt because `BOUNDARY`, `TRAP`, `FLOWER SPOT`, and the room banner are all competing.
- Reduce the number of visible chips.
- Shorten the trap copy to a single lightweight label.
- Goal: make the flower route legible without feeling like a dev note pasted on top of the map.

### `DungeonRoomC`

- Keep `bomb` as the room identity.
- Replace `CRACKED` and `BOMB SPOT` with one dominant cue plus one secondary cue.
- Goal: the cracked wall should feel like part of the world, not a sticky annotation.

### `BossArena`

- The boss area needs the most surface simplification after the hub.
- Keep the pre-fight objective and the back-to-camp outcome.
- Remove the extra board-like emphasis around `BOSS CHECK`.
- Goal: the scene should feel like a final encounter space, not a large empty staging panel.

## 5-Second Clarity Rule

For every scene, enforce this order of attention:

1. Scene identity.
2. One sentence objective.
3. One obvious action or goal marker.
4. Secondary back / status / helper text only if still needed.

If a surface does not help the player answer one of these three questions in 5 seconds, it should become smaller, lighter, or disappear.

## Recommended Next Loop

Implement the copy and surface simplification in this order:

1. `DungeonHub`
2. `StartCamp`
3. `DungeonRoomB`
4. `FieldRuins`
5. `BossArena`
6. `FieldWest`
7. `DungeonRoomA`
8. `DungeonRoomC`

This order gives the largest reduction in mixed UI debt fastest, while preserving first-run guidance.
