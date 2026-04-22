# Loop 46 World Label Budget

Date: 2026-04-22

## Purpose

The current screenshots read too much like a level-editor flowchart because the HUD objective, touch controls, portals, checkpoints, room states, and world hints all speak at once.

This loop keeps the cute-style direction fixed: bright, warm, round, toy-like, and readable. It does not approve final Chinese copy. It only turns long world-space instructions into short signpost copy and adds a guard so future scenes do not accumulate more debug-like labels.

## Rule

World-space labels in first-release scenes should behave like small toy-world signs:

| Rule | Limit |
|---|---:|
| Maximum characters per world label | 10 |
| HUD, touch buttons, and pause panel labels | Excluded |
| Scene title/objective HUD copy | Excluded |
| Long tutorial explanations | Belong in HUD/objective flow, not pasted into the world |

## Scene Budgets

| Scene | World-label budget |
|---|---:|
| `StartCamp` | 13 |
| `FieldWest` | 11 |
| `FieldRuins` | 11 |
| `DungeonHub` | 17 |
| `DungeonRoomA` | 10 |
| `DungeonRoomB` | 8 |
| `DungeonRoomC` | 9 |
| `BossArena` | 6 |

These budgets intentionally match the current scene structure instead of claiming the scenes are final. Later polish should reduce counts, not raise them.

## Copy Shortening Applied

| Scene | Before | After |
|---|---|---|
| `StartCamp` | `带回遗物后，营地会点亮回家的路。` | `点亮回家路` |
| `FieldWest` | `穿过这里即可进入遗迹试炼场` | `前往遗迹试炼` |
| `DungeonHub` | `每个房间教会一种回响，完成后徽章会亮起。` | `三间试炼收徽章` |
| `DungeonHub` | `收齐三枚遗物后，首领门会打开。` | `三枚徽章开首领门` |
| `DungeonRoomA` | `只有箱子能稳稳压住机关。` | `箱子压住机关` |

## Remaining Risk

The count budget is still generous because current scenes contain many functional labels: portal names, checkpoints, status marks, pickup names, player/enemy labels, and short hints. This loop prevents further label sprawl, but it does not solve final visual composition.

Next useful loop: inspect whether player/enemy/chest/portal labels can become icon-like markers or contextual popups instead of always-on text.
