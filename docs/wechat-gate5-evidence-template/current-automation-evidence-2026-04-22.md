# Current Automation Evidence

Date: 2026-04-22

Status: `AUTOMATION_GREEN_HUMAN_EVIDENCE_PENDING`

This file is a reviewer-facing index for the latest automated evidence. It does not claim Gate 5 `PASS`, because simulator auto-mode, QR / true-device playthrough, final cute-style score, and final copy approval still require human/device evidence.

## Latest Automated Run

| Item | Result |
|---|---|
| Command | `npm run test:ci` |
| Result | Pass |
| Node/typecheck/structure tests | `205/205` |
| WeChat verification | Pass, fresh for current release inputs |
| Preview smoke | `9/9` |
| First-session full journey | `1/1` |
| Initial visual snapshots | `9/9` |

## WeChat Package

Source: `temp/wechat-size-report.json`

| Metric | Value |
|---|---:|
| Hard cap | `4,194,304` bytes |
| Warning threshold | `3,879,731` bytes |
| Main package | `2,541,479` bytes |
| Total output | `2,687,304` bytes |
| Budget usage | `60.59%` |
| Warning usage | `65.51%` |
| Budget margin | `1,652,825` bytes |
| Remote script count | `0` |

## Key Evidence Files

| Evidence | Path |
|---|---|
| Release-chain evidence | `docs/loop48-release-chain-evidence-2026-04-22.md` |
| Size report | `temp/wechat-size-report.json` |
| WeChat build status | `temp/wechat-build-status.json` |
| WeChat build config | `temp/wechatgame.build-config.json` |
| Visual baseline index | `docs/loop43-visual-baseline-index-2026-04-22.md` |
| Initial visual snapshots | `tests/__screenshots__/visual-scene-initial.spec.mjs/` |
| Human evidence checklist | `docs/wechat-gate5-human-evidence-checklist-2026-04-22.md` |
| Issue log template | `docs/wechat-gate5-evidence-template/issues.md` |

## Human-Only Checks Still Required

| Check | Current status |
|---|---|
| WeChat DevTools simulator real load | Pending human environment |
| DevTools auto-mode evidence | Pending human environment |
| QR / true-device playthrough | Pending human environment |
| True-device touch playthrough | Pending human environment |
| Final cute-style scorecard | Pending human review |
| Final Chinese copy approval | Pending human review |
| Final monster naming approval | Pending human review |

## Reviewer Instruction

Use this file as the automation index, then fill the main Gate 5 template only with evidence actually observed in DevTools or on a real device. If those human/device checks are unavailable, the correct Gate 5 conclusion remains `BLOCKED_BY_HUMAN_ENV`, not `PASS`.
