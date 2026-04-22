# Loop 48 Release Chain Evidence

Date: 2026-04-22

## Purpose

Loops 45-47 changed HUD layout, world-signpost copy, enemy placeholder labels, scene source files, visual baselines, and WeChat package inputs. Loop 48 verified that those changes did not leave stale preview cache or stale WeChat package evidence behind.

## Initial Blockers Found

`npm run test:ci` correctly failed before refresh:

| Blocker | Cause | Fix |
|---|---|---|
| Local Cocos preview cache stale | `assets/scenes/*.scene` changed after `library/<uuid>.json` cache files | Synced first-release scene cache files from source scenes |
| WeChat build stale | Scene files changed after previous `build/wechatgame` output | Rebuilt WeChat package and reran `verify:wechat` |
| Visual initial snapshots stale | Scene/HUD copy intentionally changed | Regenerated `visual-scene-initial` baselines |

## Commands Run

| Command | Result |
|---|---|
| `node --test tests\cocos-library-cache.test.mjs` | Pass; 1/1 after cache sync |
| `npm run build:wechat:config` | Pass; generated `temp/wechatgame.build-config.json` |
| `npm run build:wechat` | Pass with tolerated Cocos Creator exit code `36` |
| `npm run verify:wechat` | Pass; refreshed `temp/wechat-size-report.json` |
| `npx playwright test "tests/visual-scene-initial.spec.mjs" --update-snapshots` | Pass; regenerated intended copy-change baselines |
| `npm run test:ci` | Pass; full local CI chain green |

## Size Report

Source: `temp/wechat-size-report.json`

| Metric | Value |
|---|---:|
| WeChat main-package hard cap | `4,194,304` bytes |
| Warning threshold | `3,879,731` bytes |
| Main package | `2,541,479` bytes |
| Total output | `2,687,304` bytes |
| Main-package budget usage | `60.59%` |
| Main-package warning usage | `65.51%` |
| Remote scripts | `0` |
| Subpackages | `1` |

## Final Automated Evidence

`npm run test:ci` passed after refresh:

| Gate | Result |
|---|---|
| Node/typecheck/structure tests | Pass; 205/205 |
| WeChat output verification | Pass; fresh output and size report |
| Preview smoke | Pass; 9/9 |
| First-session journey | Pass; 1/1 |
| Initial visual snapshots | Pass; 9/9 |

## Still Human-Blocked

This loop does not prove final release acceptance. The following still require human/device evidence:

| Evidence | Status |
|---|---|
| WeChat DevTools simulator real load | Not proven by this loop |
| QR preview / true-device load | Not proven by this loop |
| Final cute-style visual score | Not human-approved |
| Final Chinese copy and monster naming | Not human-approved |
| Cocos Creator exit code `36` meaning | Still treated as tolerated by project policy because `verify:wechat` passes |

