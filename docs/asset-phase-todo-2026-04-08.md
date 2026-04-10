# Asset Integration Phase TODO - 2026-04-08

## Goal

Turn the current asset situation into a staged delivery plan where each phase produces an immediately testable visual or audio improvement inside the project.

## Current scene status overview

| Scene | UI baseline | World art status | Audio status | Main gaps | Suggested phase |
| --- | --- | --- | --- | --- | --- |
| `DungeonHub` | strong | partial | partial | checkpoint / portal / barrier / pickup still placeholder-level | Phase 2 |
| `StartCamp` | strong | weak | partial | outdoor camp environment family not locked | Phase 3 |
| `FieldRuins` | strong | weak | partial | outdoor ruins environment family not locked | Phase 3 |
| `BossArena` | strong | weak | weak | boss look not locked, battle BGM missing, world props placeholder | Phase 4 |
| `FieldWest` | weak | weak | weak | no propagated UI baseline, outdoor set missing | Phase 3 |
| `DungeonRoomA` | weak | medium | weak | dungeon set available but not scene-bound | Phase 5 |
| `DungeonRoomB` | weak | medium | weak | dungeon set available but not scene-bound | Phase 5 |
| `DungeonRoomC` | weak | medium | weak | dungeon set available but not scene-bound | Phase 5 |
| `MechanicsLab` | weak | weak | weak | no dedicated mechanical prop language yet | Phase 6 |

## Cross-scene asset gap summary

| Entity / system | Status | Current issue | Decision direction |
| --- | --- | --- | --- |
| HUD cards | selected and wired | stable | keep Kenney red default |
| touch action buttons | selected and wired | `PauseRestart` style mismatch | unify in Phase 1 |
| button icons | selected and wired | echo buttons still hybrid visual path | keep hybrid for now |
| UI fonts | selected and wired | world pixel font not runtime-ready | keep Kenney Future until later |
| portal audio | selected and wired | may cut short on scene switch | defer unless it feels bad |
| battle BGM | missing | `BossArena` has no runtime music file | solve in Phase 4 |
| checkpoint prop | candidate only | still placeholder language | solve in Phase 2 |
| portal prop | candidate only | still placeholder language | solve in Phase 2 |
| barrier closed/open | candidate only | not scene-bound yet | solve in Phase 2 |
| pickup / relic | candidate only | not scene-bound yet | solve in Phase 2 |
| boss art | candidate only | no final lock | solve in Phase 4 |
| echo world visuals | partial | UI exists, world entity look not locked | solve in Phase 4 or 6 |
| outdoor environment set | missing final kit | camp / west / ruins still under-defined | solve in Phase 3 |
| mechanics lab set | missing final kit | no dedicated prop family | solve in Phase 6 |

## Phase plan

### Phase 1: UI consistency cleanup

Goal:
Make the already-propagated UI layer feel intentionally unified across the playable scenes.

Scope:
- fix `PauseRestart` so it matches the pause menu button family
- review `DungeonHub`, `StartCamp`, `FieldRuins`, `BossArena` for any remaining inconsistent HUD/button/icon binding
- keep echo buttons on the current hybrid path unless there is a clear regression

Deliverable:
- all currently styled scenes use one pause-menu visual language
- no obvious mismatch between touch buttons, pause buttons, HUD cards, and labels

Direct test value:
- open each of the four scenes and immediately see consistent HUD and pause UI
- this phase should produce visible improvement without touching world art

Exit check:
- `DungeonHub` pause menu looks internally consistent
- same interaction language appears in `StartCamp`, `FieldRuins`, and `BossArena`

### Phase 2: Dungeon core entity pass

Goal:
Turn the dungeon-facing scenes from placeholder world props into a coherent first playable art pass.

Scope:
- bind final first-pass picks for:
  - checkpoint
  - portal
  - barrier closed / open
  - pickup / relic
- prioritize `DungeonHub`
- define the canonical dungeon prop language once, then reuse it across dungeon scenes

Deliverable:
- `DungeonHub` reads as a real gameplay slice rather than a UI-over-placeholder slice
- one canonical mapping table for shared dungeon entities

Direct test value:
- launch `DungeonHub` and immediately see prop-level improvement on interactable objects
- player can visually distinguish portal, checkpoint, barrier, and reward objects

Exit check:
- one selected asset per shared dungeon entity
- no scene-specific fork for the same gameplay entity

### Phase 3: Outdoor biome pass

Goal:
Build a stable outdoor visual kit for the non-dungeon exploration scenes.

Scope:
- lock one outdoor family for:
  - `StartCamp`
  - `FieldWest`
  - `FieldRuins`
- choose ground, walls/edges, ruins, camp props, and landmark props as a set instead of one-off picks
- propagate the UI baseline to `FieldWest`

Deliverable:
- three outdoor scenes feel like they belong to the same project
- camp and ruins stop borrowing dungeon language where it does not fit

Direct test value:
- entering `StartCamp`, `FieldWest`, and `FieldRuins` should show immediate biome differentiation from dungeon spaces
- this phase gives the biggest “the game has a world” payoff

Exit check:
- `FieldWest` reaches the same UI baseline as the other main scenes
- outdoor prop and tile families are documented and reused consistently

### Phase 4: Boss encounter pass

Goal:
Make `BossArena` feel like a deliberate climax scene instead of a mechanically ready placeholder.

Scope:
- lock boss visual family
- restore or select one runtime battle BGM
- assign first-pass boss arena props using the same binding rules as other shared entities
- decide whether echo-related visuals need boss-specific treatment

Deliverable:
- `BossArena` has recognizable boss visuals
- `BossArena` has battle music
- UI, world props, and audio finally support the encounter fantasy

Direct test value:
- entering `BossArena` should immediately feel different through both visual focus and audio
- this is the first phase where atmosphere should jump noticeably

Exit check:
- one locked boss art family
- one wired runtime BGM path
- no placeholder portal/checkpoint style left in the boss scene unless explicitly accepted

### Phase 5: Dungeon room rollout

Goal:
Apply the dungeon entity kit from Phase 2 to the remaining dungeon content scenes.

Scope:
- `DungeonRoomA`
- `DungeonRoomB`
- `DungeonRoomC`
- reuse the same shared dungeon floor, wall, prop, portal, checkpoint, barrier, and pickup decisions

Deliverable:
- all dungeon rooms feel like one connected environment family

Direct test value:
- moving across dungeon scenes should no longer feel like jumping between prototype islands

Exit check:
- no room-specific art divergence for shared dungeon entities unless called out intentionally

### Phase 6: Mechanics lab and secondary polish

Goal:
Handle the remaining special-case content after the main player path is visually coherent.

Scope:
- create a first dedicated material language for `MechanicsLab`
- revisit echo world visuals if still weak
- revisit portal audio cut-off if it feels bad in runtime
- revisit optional world-label font path if pixel font becomes runtime-ready

Deliverable:
- no major scene remains clearly “outside the art plan”

Direct test value:
- special-purpose scenes stop feeling like leftovers

Exit check:
- `MechanicsLab` has its own coherent prop family
- remaining polish issues are truly optional rather than structural

## Recommended execution order

| Priority | Phase | Why now |
| --- | --- | --- |
| P1 | Phase 1 | cheapest visible cleanup, stabilizes the current UI baseline |
| P1 | Phase 2 | turns the most-complete scene into a real representative slice |
| P1 | Phase 3 | fixes the biggest world-art gap across multiple scenes |
| P2 | Phase 4 | important for milestone quality, but depends on asset lock and BGM |
| P2 | Phase 5 | easier once the dungeon entity kit is fixed |
| P3 | Phase 6 | valuable, but not on the critical path for a coherent playable loop |

## Working TODO board

| ID | Task | Phase | Status | Visible test result |
| --- | --- | --- | --- | --- |
| T01 | unify `PauseRestart` visual family with other pause actions | Phase 1 | done | pause menu becomes consistent on open |
| T02 | do a final pass on shared HUD/button/icon assignments in 4 main scenes | Phase 1 | done | all four scenes show the same UI language |
| T03 | bind final first-pass checkpoint asset | Phase 2 | done | checkpoint reads clearly in `DungeonHub` |
| T04 | bind final first-pass portal asset | Phase 2 | done | portal reads clearly in `DungeonHub` |
| T05 | bind closed/open barrier visuals | Phase 2 | done | barrier state difference is visible |
| T06 | bind pickup / relic visual | Phase 2 | blocked | reward object becomes readable |
| T07 | lock outdoor biome kit for `StartCamp` | Phase 3 | todo | camp scene gains a stable look |
| T08 | lock outdoor biome kit for `FieldWest` | Phase 3 | todo | west field stops looking underdefined |
| T09 | lock outdoor biome kit for `FieldRuins` | Phase 3 | todo | ruins scene gains a stable look |
| T10 | propagate shared UI baseline to `FieldWest` | Phase 3 | todo | west field UI matches other scenes |
| T11 | lock boss visual family | Phase 4 | todo | boss becomes recognizable |
| T12 | restore or select runtime battle BGM for `BossArena` | Phase 4 | todo | boss arena gains battle music |
| T13 | bind boss-scene portal/checkpoint/world props | Phase 4 | todo | boss arena stops feeling placeholder |
| T14 | roll dungeon entity kit into `DungeonRoomA` | Phase 5 | todo | room A matches the hub language |
| T15 | roll dungeon entity kit into `DungeonRoomB` | Phase 5 | todo | room B matches the hub language |
| T16 | roll dungeon entity kit into `DungeonRoomC` | Phase 5 | todo | room C matches the hub language |
| T17 | define `MechanicsLab` material language | Phase 6 | todo | mechanics lab gains a coherent identity |
| T18 | evaluate whether to keep or replace hybrid echo button visuals | Phase 6 | todo | echo UI path becomes a conscious final choice |
| T19 | evaluate portal audio cut-off in runtime | Phase 6 | todo | portal transition sound either feels correct or gets redesigned |

## Suggested milestone checkpoints

| Milestone | Includes | What we should be able to test right after |
| --- | --- | --- |
| M1 | Phase 1 complete | open four scenes and inspect UI consistency |
| M2 | Phase 2 complete | enter `DungeonHub` and evaluate core interactable readability |
| M3 | Phase 3 complete | compare dungeon scenes vs outdoor scenes and confirm biome separation |
| M4 | Phase 4 complete | enter `BossArena` and confirm boss fantasy through look plus audio |
| M5 | Phase 5 complete | move across all dungeon scenes and confirm shared language |
| M6 | Phase 6 complete | special scenes and edge cases no longer feel unfinished |

## Recommendation

The best near-term path is:

1. finish Phase 1 quickly
2. immediately move into Phase 2
3. then attack Phase 3 as the biggest remaining world-art gap

That gives us a sequence where every step is visible in-engine and each step raises the project's apparent completeness.
