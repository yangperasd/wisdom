# Image 2.0 High-Risk Adoption Template

Use this template before any `boss_core`, HUD, or full-scene candidate is treated as more than exploratory preview.

## Scope

- `boss_core`
- HUD panels and touch buttons
- full-scene background sheets

## Required evidence

1. `contact-sheet.png` plus `screening-report.json`
2. manual scorecard with the normal 8 dimensions
3. scene review against at least one real target scene
4. adversarial review with explicit IP / silhouette / gameplay-readability notes
5. non-GUI WeChat proof:
   - `build:wechat:config`
   - `build:wechat`
   - `verify:wechat`
   - `test:wechat:playthrough`

## Extra gates for high-risk assets

- `boss_core`
  - must read as a boss anchor at `132x120` scale in `BossArena`
  - must keep state readability after palette-only danger / hurt / vulnerable swaps
  - must not become a generic character portrait pasted into the arena
- `boss_shield_closed` / `boss_shield_open`
  - must be reviewed as a pair, not as isolated singles
  - closed/open state difference must be readable at mobile scale
  - silhouette change must communicate danger-window logic without dark sci-fi language
- HUD / full-scene sheets
  - no direct live promotion from a first exploratory batch
  - require explicit human signoff even if screening and runtime pass

## Human-stop threshold

Stop the loop for human product input only if one of these becomes true:

- two prompt rounds in a row still fail the same high-risk readability problem
- the candidate clears style gates but creates a product-direction fork
- the team must choose between two materially different boss / HUD directions

Otherwise keep iterating inside the loop.
