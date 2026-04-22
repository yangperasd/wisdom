# Loop 47 Entity Label Policy

Date: 2026-04-22

## Purpose

After Loop 46 shortened long signpost copy, the next source of editor-like clutter was enemy labels that exposed AI behavior states: `巡逻`, `守卫`, and `看守`.

For the cute first-release MVP, world labels should name things the player can understand at a glance. They should not leak implementation or behavior-state vocabulary.

## Applied Change

| Scene | Previous enemy label | New label |
|---|---|---|
| `FieldWest` | `巡逻` | `史莱姆` |
| `FieldRuins` | `守卫` | `史莱姆` |
| `DungeonRoomA` | `看守` | `史莱姆` |
| `DungeonRoomB` | `巡逻` | `史莱姆` |
| `DungeonRoomC` | `守卫` | `史莱姆` |

`StartCamp` already used `史莱姆`, so this also improves consistency across the first-session path.

## Gate

`tests/style-resource-gate.test.mjs` now rejects first-pass world labels that are direct enemy AI behavior-state words:

| Forbidden player-facing label | Reason |
|---|---|
| `巡逻` | AI state, not creature identity |
| `守卫` | Role/state label, reads like debug annotation |
| `看守` | Role/state label, not toy-like creature identity |

## Boundary

This is not final monster naming or final iconography approval. It is a placeholder-copy hygiene rule until creature art and names are approved.

Next useful loop: decide whether always-on player/enemy labels should eventually become contextual popups or icon/nameplates once visual identity is strong enough.
