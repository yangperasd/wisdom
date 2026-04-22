# Harness Loop Memory: cute WeChat MVP release

This file is the working memory for the main agent loop. Update it after every loop so the project does not drift back into "demo looks done" while release gates are still red.

## North Star

- Target feel: bright, warm, cute, rounded, toy-like, close to the spirit of "Echoes of Wisdom".
- Forbidden drift: dark dungeon, dirty green noise, realistic cracks, gothic spikes, oppressive blood/red, cold hard metal, heavy gold borders, mixed UI languages, pixel/hand-painted/realistic/AI texture mashups.
- First release is a cute WeChat mini-game MVP, not a full clone.

## Loop Protocol

1. Main agent reads this memory, the release audit, the fixlist, and the latest validation output.
2. Main agent chooses the single highest-priority blocker for the next loop.
3. Task agent implements a bounded slice with explicit write ownership.
4. Main agent reviews and runs targeted checks.
5. Adversarial agent audits the result against the fixed north star and release gates.
6. Main agent decides whether a human decision is needed. If not, update this memory and start the next loop.

## Gate Status

| Gate | Status | Evidence | Next action |
|---|---|---|---|
| Gate 0: decision lock | Green for docs | `release-reverse-audit-2026-04-21.md`, `release-reverse-fixlist-2026-04-21.md` | Keep updated only through this loop memory |
| Gate 1: WeChat release feasibility | Yellow | `node tools/verify-wechat-build-output.mjs` passes; main package is `2,540,452 bytes`, budget is `4,194,304 bytes`; simulator proof is now honest but still opt-in/external | Harden Cocos build process health and collect real simulator/true-device evidence |
| Gate 2: style/resource lock | Red | Current dungeon visuals still too dark/noisy | Do after Gate 1 unless a tiny safe style inventory task is needed |
| Gate 3: engineering control plane | Green for static guardrails | HUD owner and scene/prefab `AssetBindingTag` checks pass; runtime visual refactor still deferred | Keep guardrails updated as new assets/prefabs are added |
| Gate 4: first-session validation | Yellow | `tests/first-session-flow.test.mjs` proves the touch-first route structurally; `tests/first-session-runtime.spec.mjs` now adds runtime StartCamp HUD/touch evidence and touch-only smoke, but no continuous mobile first-session playthrough is gated yet | Add runtime playthrough evidence for first 5 seconds, touch-only progression, death/respawn, Boss clear, and return to camp |
| Gate 5: release validation | Red | Depends on Gates 1-4 | Not started |

## Current Hard Facts

- WeChat main package hard cap: `4 * 1024 * 1024 bytes`.
- Warning line: `Math.floor(3.7 * 1024 * 1024)` bytes.
- Current generated size report: `temp/wechat-size-report.json`.
- Current main package bytes: `2,540,452`.
- Current total output bytes: `2,686,776`.
- Current WeChat package layout:
  - Main package: `2,540,452 bytes`.
  - Cocos-generated subpackage `subpackages/main`: `146,324 bytes`.
  - Remote payload: `0 bytes`, with no remote scripts.
- Current top-level pressure:
  - `cocos-js`: `1,982,062 bytes`
  - `assets`: `370,989 bytes`
  - `subpackages`: `146,324 bytes`
  - `web-adapter.js`: `90,055 bytes`
  - `src`: `25,446 bytes`
- `game.json` declares `subpackages/main/`.
- Cocos runtime settings declare `assets.subpackages: ["main"]` and `assets.projectBundles: ["internal", "start-scene", "main"]`.
- `node tools/verify-wechat-build-output.mjs` passes against the current generated output.
- Targeted tests pass: `tests/wechat-build-config.test.mjs`, `tests/wechat-runtime-settings.test.mjs`, `tests/dungeon-scenes.test.mjs`, `tests/wechat-build-output.test.mjs`.
- `npm run build:wechat` previously wrote output but logged `Creator finished with exit code 36`; this is now modeled as a tolerated non-zero build-stage status that still requires `verify:wechat` before release green.
- `tests/wechat-simulator.test.mjs` now writes `temp/wechat-simulator-evidence.json`; default unavailable simulator runs are recorded as skipped/blocked, while `REQUIRE_WECHAT_SIMULATOR=1` hard-fails when auto mode cannot connect.

## Last Misses To Avoid Repeating

- Do not treat a written plan as completion. A gate is complete only when its validation evidence is green.
- Do not let old demo package budgets override the 4MB WeChat main-package gate.
- Do not let preview smoke count as WeChat release evidence.
- Do not use AI-generated large ground/wall/HUD/character/Boss assets as final art.
- Do not start broad cute-style art replacement until package feasibility is under control, unless the task only inventories or removes unused payload.

## Active Loop 1

| Field | Value |
|---|---|
| Loop goal | Gate 1: make WeChat package reporting and split strategy executable, then shrink/split enough to pass 4MB |
| Main-agent local task | Maintain memory, review worker output, run targeted checks, decide if human intervention is needed |
| Task agent | `Plato`: Gate 1 package/build implementation |
| Audit agents | `Socrates`: read-only Gate 1 adversarial pre-audit; `Russell`: read-only Gate 1 post-change audit |
| Human decision threshold | Any change that moves scripts remote, drops required gameplay, removes launch scene content, or depends on a real server URL |

## Loop 1 Adversarial Pre-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | Current build has no real WeChat subpackages. `game.json` has no `subpackages`, and Cocos `settings` still lists only `internal` and `main`. | Treat Gate 1 as red until generated output proves non-start scenes are outside main. |
| P0 | CI now requires WeChat verify but does not produce a WeChat build in GitHub Actions. | Record as human decision: either self-hosted/installed Cocos build in CI, or verify an uploaded artifact. |
| P0 | Size pressure is mostly `cocos-js`, not art. | Prioritize engine/module trimming and real bundle splitting before broad art replacement. |
| P1 | Size verification currently reads `game.json` first, but Cocos bundle truth is also in `src/settings.*.json` and bundle configs. | Update verification/reporting to include Cocos settings facts and fail if expected subpackages are absent. |
| P1 | Remote validation is defensive only; no actual remote strategy exists. | Do not introduce remote URLs without a human decision. Keep remote script ban. |

## Loop 1 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| WeChat cap | Green | Main package is `2,557,851 bytes`, below `4,194,304 bytes` hard cap and below `3,879,731 bytes` warning line |
| Bundle split | Green for generated output | `game.json.subpackages[0].root` is `subpackages/main/`; Cocos settings declare `assets.subpackages: ["main"]` |
| Engine payload | Green for current 2D slice, pending runtime smoke | Explicit `includeModules` excludes unused Spine, DragonBones, and default 3D runtime |
| Remote script ban | Green | `packageBreakdown.remote.scripts` is empty |
| Size report | Green | `temp/wechat-size-report.json` is written before the hard-cap assertion |
| Cocos build process | Yellow | `npm run build:wechat` logs `Creator finished with exit code 36` even though output verifies green |
| CI evidence chain | Yellow/P0 decision | GitHub Actions requires `verify:wechat`, but the workflow does not create or download a Cocos build artifact |

## Loop 1 Local Validation

| Command | Result |
|---|---|
| `node --check tools/wechat-build-utils.mjs` | Pass |
| `node --check tools/verify-wechat-build-output.mjs` | Pass |
| `node --test tests/wechat-build-config.test.mjs tests/wechat-runtime-settings.test.mjs tests/dungeon-scenes.test.mjs` | Pass |
| `node tools/verify-wechat-build-output.mjs` | Pass |
| `node --test tests/wechat-build-output.test.mjs` | Pass |

## Loop 1 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | GitHub Actions runs `npm run test:ci` with `REQUIRE_WECHAT_VERIFY=1`, but a clean hosted checkout has no ignored `build/wechatgame` or `temp` output and the workflow has no Cocos build/artifact step. | Gate 1 remains Yellow, not full Green. Human decision required: self-hosted Cocos CI or artifact-based verification. |
| P1 | `tools/run-wechat-build.mjs` accepts Cocos Creator exit code `36` and continues to optimize output. | Track as build-process hardening. Do not call Creator build fully green unless verify also passes and logs are reviewed. |
| P1 | WeChat DevTools/simulator tests can skip most runtime proof when auto mode is unavailable. | Add simulator or true-device evidence before Gate 5. Preview smoke remains auxiliary only. |
| P1 | Size report is written to ignored `temp/wechat-size-report.json`, so it is local evidence, not committed or artifact-retained release evidence. | Move/copy release reports into an artifact or checked release-evidence path once CI strategy is chosen. |
| P2 | The engine module whitelist has no obvious direct usage conflict, but still lacks DevTools/real-device runtime proof. | Keep whitelist, require runtime smoke before treating Gate 1 as closed. |

## Open Questions For This Loop

- Does `Creator` exit code `36` mean a benign editor/runtime shutdown state in this local environment, or should `run-wechat-build.mjs` fail hard and force separate verification?
- Does the module whitelist still pass a real WeChat DevTools simulator launch and a mobile touch smoke?
- Should the next loop prioritize build-process hardening, HUD/manifest ownership checks, or cute-style resource lock?

## Human Decisions Needed

| Decision | Recommended default | Why it matters |
|---|---|---|
| CI evidence chain | Selected: use a self-hosted Windows runner with Cocos Creator installed for `build:wechat -> verify:wechat -> upload size report` | This is the only clean way for every commit to prove the ignored build output from the same commit. |
| Artifact-only verification fallback | Accept only for manual release candidates, not normal PR CI | Uploading a local build artifact can prove a release candidate, but it cannot make every PR clean-room reproducible. |

## Active Loop 2

| Field | Value |
|---|---|
| Loop goal | Gate 1: make CI prove WeChat build output from a clean checkout using a self-hosted Windows + Cocos runner |
| Main-agent local task | Keep memory updated, review CI changes, run local workflow/script syntax checks, decide if remaining CI risk is acceptable |
| Task agent | `Hubble`: self-hosted Cocos CI implementation |
| Audit agent | Pending: read-only CI evidence-chain adversarial audit after implementation |
| Human decision threshold | Any fallback to artifact-only verification for normal PR CI, adding secrets/deployment config, or changing release branch policy |

## Loop 2 Acceptance Target

| Requirement | Target |
|---|---|
| Hosted Node tests | Continue to run on `windows-latest` without requiring ignored WeChat build output |
| WeChat CI job | Runs on self-hosted Windows + Cocos runner |
| Build chain | Executes `npm ci`, `npm run build:wechat`, and `npm run verify:wechat` from clean checkout |
| Evidence retention | Uploads `temp/wechat-size-report.json`, Cocos build log, and enough build output metadata as GitHub Actions artifacts |
| No artifact fallback | Normal PR/push CI must not rely on manually uploaded `build/wechatgame` |

## Loop 2 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Hosted CI split | Green | `node-tests` runs on `windows-latest`, preserves preview smoke through `npm run test:ci`, and does not set `REQUIRE_WECHAT_VERIFY` |
| WeChat CI split | Green structurally | `wechat-build-verify` runs on `[self-hosted, Windows, cocos]` and executes `npm ci -> build:wechat:config -> build:wechat -> verify:wechat` |
| Release evidence | Green structurally | Workflow uploads `temp/wechat-size-report.json`, build config, logs, and runtime settings as artifacts |
| CI guardrail | Green | `tests/ci-workflow.test.mjs` verifies hosted/WeChat job separation, build-before-verify ordering, and artifact paths |
| External runner proof | Yellow | Requires an actual self-hosted runner with labels `self-hosted`, `Windows`, `cocos` and valid Cocos path variables |
| Hosted node execution | Red from unrelated drift | `node tools/run-automation-tests.mjs` fails in `tests/mechanics-lab.scene.test.mjs` because the test expects `ashenzaris_altar.png` but the scene now points at `checkpoint.png` |

## Loop 2 Local Validation

| Command | Result |
|---|---|
| `node --test tests/ci-workflow.test.mjs` | Pass |
| `node --check tools/run-automation-tests.mjs` | Pass |
| `node --check tools/run-ci-tests.mjs` | Pass |
| `node tools/verify-wechat-build-output.mjs` | Pass |
| `node --test tests/wechat-build-config.test.mjs tests/wechat-runtime-settings.test.mjs tests/wechat-build-output.test.mjs` | Pass |
| `git diff --check` | Pass with LF/CRLF warnings only |
| `node tools/run-automation-tests.mjs` | Fails on MechanicsLab resource drift, unrelated to CI split |

## Loop 2 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | The original CI fake-green/clean-checkout problem is structurally fixed by separating hosted node tests and self-hosted Cocos WeChat build verification. | Treat Loop 2 objective as complete. |
| P1 | Self-hosted runner labels and Cocos path variables must exist outside the repo. | Keep Gate 1 Yellow until a real CI run proves the job executes. |
| P1 | `run-wechat-build.mjs` still accepts Cocos exit code `36`; `verify:wechat` catches package failures but build-stage signal remains soft. | Track as build-process hardening after the hosted node red is fixed. |
| P1 | MechanicsLab scene/test drift now blocks hosted `node-tests`. | Start Loop 3 to fix the drift; do not roll back CI split. |
| P2 | `ci-workflow.test.mjs` is string-level, not a real GitHub Actions runner simulation. | Sufficient as topology guardrail; still requires real CI execution proof. |

## Active Loop 3

| Field | Value |
|---|---|
| Loop goal | Make hosted `node-tests` executable again by fixing MechanicsLab resource/test drift |
| Main-agent local task | Inspect drift, review task output, run targeted and node-entry validations |
| Task agent | Pending |
| Audit agent | Pending |
| Human decision threshold | Any choice that changes first-release scene set, removes MechanicsLab from tests, or rewrites gameplay behavior instead of aligning resource expectations |

## Loop 3 Acceptance Target

| Requirement | Target |
|---|---|
| Drift source | Identify whether `checkpoint.png` is the intended new MechanicsLab marker or whether the scene should still use `ashenzaris_altar.png` |
| Minimal fix | Align test and scene/resource binding without broad scene rewrites |
| Hosted node entry | `node tools/run-automation-tests.mjs` no longer fails on MechanicsLab drift |
| CI guardrails | `tests/ci-workflow.test.mjs` remains green |

## Loop 3 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Drift source | Green | `asset_binding_manifest_v2`, `MechanicsLab.scene`, and `generate-mechanics-lab.mjs` all point `checkpoint` to `assets/art/generated/marker/checkpoint.png`; `ashenzaris_altar.png` is fallback |
| Minimal fix | Green | `tests/mechanics-lab.scene.test.mjs` now expects `/checkpoint\.png$/` for the `checkpoint` binding |
| Hosted node entry | Green | `node tools/run-automation-tests.mjs` passes `168/168` tests |
| CI entry | Green locally | `node tools/run-ci-tests.mjs` passes node tests, WeChat verify, and 4 preview smoke tests |
| Adversarial audit | Green | Loop 3 audit found no evidence of weakening tests to hide a scene issue |

## Loop 3 Local Validation

| Command | Result |
|---|---|
| `node --test tests/mechanics-lab.scene.test.mjs` | Pass |
| `node --test tests/ci-workflow.test.mjs` | Pass |
| `node tools/verify-wechat-build-output.mjs` | Pass |
| `node tools/run-automation-tests.mjs` | Pass, `168/168` |
| `node tools/run-ci-tests.mjs` | Pass, including 4 preview smoke tests |

## Loop 3 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | No evidence that the test was weakened; test, scene, manifest, and generator now agree on `checkpoint.png`. | Treat Loop 3 objective as complete. |
| P1 | Whether `checkpoint.png` itself is cute enough belongs to the Gate 2 style audit, not this drift fix. | Carry into Loop 4 resource/style guardrails. |
| P2 | `DebugLabel` inactive assertion is a low-risk existing guardrail for developer-only scaffolding. | Keep; do not treat as Loop 3 blocker. |

## Active Loop 4

| Field | Value |
|---|---|
| Loop goal | Gate 2: create enforceable style/resource locks so AI-generated dark/noisy assets cannot silently become final art |
| Main-agent local task | Inspect manifest shape, review task output, run resource/style tests, decide if art direction needs human input |
| Task agent | Pending |
| Audit agent | Pending |
| Human decision threshold | Any decision to approve a currently marginal/failing AI asset as final, remove the cute-style north star, or change the must-redo asset list |

## Loop 4 Acceptance Target

| Requirement | Target |
|---|---|
| Style source of truth | Style rules, forbidden list, must-redo keys, and AI asset boundaries are machine-readable or testable |
| Current ugly assets | `outdoor_wall_standard`, `outdoor_wall_broken`, `outdoor_wall_cracked`, `outdoor_path_cobble`, and `outdoor_ground_flowers` are blocked from final approval |
| Allowed generated assets | Generated assets may remain as candidate/temporary only unless explicitly whitelisted as final-safe |
| Automated guardrail | Node tests catch forbidden final bindings or missing style status |

## Loop 4 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Style source of truth | Green for current listed keys | `assets/configs/style_resource_gate.json` stores north star, forbidden list, AI boundary, and key states |
| Must-redo assets | Green | Must-redo keys are `blocked-final` |
| AI asset boundary | Green for current listed AI/generated-path keys | Non-whitelisted AI/generated assets cannot be `final-approved` |
| Automated guardrail | Green | `tests/style-resource-gate.test.mjs` is included in `tools/run-automation-tests.mjs` |
| Default node entry | Green | `node tools/run-automation-tests.mjs` passes `173/173` |
| CI entry | Green locally | `node tools/run-ci-tests.mjs` passes node tests, WeChat verify, and 4 preview smoke tests |

## Loop 4 Local Validation

| Command | Result |
|---|---|
| `node --test tests/style-resource-gate.test.mjs` | Pass |
| `node --check tests/style-resource-gate.test.mjs` | Pass |
| `node --check tools/run-automation-tests.mjs` | Pass |
| `node tools/run-automation-tests.mjs` | Pass, `173/173` |
| `node tools/run-ci-tests.mjs` | Pass, including 4 preview smoke tests |
| `git diff --check` | Pass with LF/CRLF warnings only |

## Loop 4 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | No direct leak for current listed keys; must-redo is blocked and current AI resources are not final-approved. | Treat Loop 4 objective as complete for the current asset list. |
| P1 | The gate is still list-based; new visual keys or unmarked generated paths can bypass unless added to the config. | Start Loop 5 to make the gate coverage-based. |
| P1 | Protected primary visuals such as `player` are not represented in the style gate. | Add primary/reference roles and require every visual binding to be classified. |
| P2 | North star and must-redo assertions are hard-coded and stable. | Keep exact-match tests. |

## Active Loop 5

| Field | Value |
|---|---|
| Loop goal | Upgrade Gate 2 style guardrail from current-key whitelist to visual-binding coverage enforcement |
| Main-agent local task | Review coverage policy, run node/CI validation, decide if any primary visual approval needs human input |
| Task agent | Pending |
| Audit agent | Pending |
| Human decision threshold | Any new final approval for AI-generated player, Boss, main HUD, wall/floor, or interaction prompt assets |

## Loop 5 Acceptance Target

| Requirement | Target |
|---|---|
| Visual coverage | Every `worldEntities` and `uiEntities` visual binding key in `asset_binding_manifest_v2.json` has an explicit style gate policy or explicit exemption |
| Protected primary roles | `player` and other non-AI primary/reference visuals are classified and cannot silently switch to generated assets |
| New key detection | Adding a new visual binding key without a style gate entry fails node tests |
| Existing AI boundary | Current AI/generated assets remain blocked from `final-approved` unless explicitly whitelisted |

## Loop 5 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Visual coverage | Green | Every current `worldEntities` and `uiEntities` key has a style gate policy; `visualKeyExemptions` is empty |
| Missing keys | Green | Added policy for `player`, `portal`, and the three `environment_dungeon_*_family` selectors |
| Protected/reference roles | Green | `player` is `protected`; `portal` and family selectors are `reference`; tests block `source: ai-generated`, generated paths, and `final-approved` |
| New key detection | Green | Tests enumerate manifest visual keys and fail if a new key lacks policy or exemption |
| Existing AI boundary | Green | AI/generated non-whitelisted assets still cannot become `final-approved` |
| Default node entry | Green | `node tools/run-automation-tests.mjs` passes `174/174` |

## Loop 5 Local Validation

| Command | Result |
|---|---|
| `node --check tests/style-resource-gate.test.mjs` | Pass |
| `node --test tests/style-resource-gate.test.mjs` | Pass |
| `node --check tools/run-automation-tests.mjs` | Pass |
| `node tools/run-automation-tests.mjs` | Pass, `174/174` |
| `git diff --check` | Pass with LF/CRLF warnings only |

## Loop 5 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | No direct leak in the upgraded style/resource gate. | Treat Loop 5 objective as complete. |
| P1 | New visual keys are now caught, and all current manifest visual keys are covered. | Gate 2 guardrail can stand while art replacement proceeds later. |
| P1 | Protected/reference checks are functional for current keys. | Keep and expand only when new protected roles are introduced. |
| P2 | `visualKeyExemptions` could become a future escape hatch if overused. | Require explicit reason and keep empty by default. |

## Active Loop 6

| Field | Value |
|---|---|
| Loop goal | Gate 1: strengthen real WeChat runtime evidence beyond package structure and preview smoke |
| Main-agent local task | Inspect DevTools/simulator scripts, choose the smallest executable improvement, review task output |
| Task agent | Pending |
| Audit agent | Pending |
| Human decision threshold | Any requirement for real device credentials, changing AppID policy, or modifying external WeChat/Cocos installation state |

## Loop 6 Acceptance Target

| Requirement | Target |
|---|---|
| Current tool clarity | WeChat DevTools/simulator scripts clearly separate config checks, launch checks, and true runtime smoke |
| No fake pass | Simulator tests should not imply a real launch passed when auto mode is skipped |
| Evidence output | Successful local/CI runs should preserve enough output to prove what was launched and what was skipped |
| Gate status | If true DevTools/real-device proof remains external, memory must keep Gate 1 Yellow rather than Green |

## Loop 6 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Static skip bug | Green | Runtime checks now use execution-time skip/fail helpers instead of definition-time `{ skip: !connected }` |
| No fake simulator pass | Green | Default unavailable auto mode records `status: skipped`, `portOpen: false`, `connected: false` in `temp/wechat-simulator-evidence.json` |
| Hard release gate | Green structurally | `REQUIRE_WECHAT_SIMULATOR=1` makes missing/unreachable simulator automation fail with non-zero exit |
| Evidence artifact | Green structurally | Self-hosted WeChat workflow uploads `temp/wechat-simulator-evidence.json` and can opt into `node --test tests/wechat-simulator.test.mjs` |
| True runtime proof | Yellow | Current local run still has auto-mode port unavailable, so no actual Cocos-in-WeChat runtime checks ran |

## Loop 6 Local Validation

| Command | Result |
|---|---|
| `node --check tests/wechat-simulator.test.mjs` | Pass |
| `node --test tests/ci-workflow.test.mjs tests/wechat-simulator.test.mjs` | Pass; simulator default is `1 pass / 9 skipped` |
| `REQUIRE_WECHAT_SIMULATOR=1 node --test tests/wechat-simulator.test.mjs` | Expected hard fail because auto-mode port is unavailable |
| `node tools/run-automation-tests.mjs` | Pass, `175/175` |
| `git diff --check` | Pass with LF/CRLF warnings only |

## Loop 6 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | No fake-green simulator evidence remains. Runtime checks are execution-time gated, and evidence records skipped/blocked state honestly. | Treat Loop 6 objective as complete. |
| P1 | Simulator evidence remains opt-in and external; unset `REQUIRE_WECHAT_SIMULATOR` means CI will not produce runtime simulator proof. | Keep Gate 1 Yellow until a real self-hosted DevTools/true-device run records proof. |
| P2 | Hard-fail output cancels child tests when `before()` fails, but still exits non-zero and writes blocked evidence. | Accept for now; improve formatting only if it becomes painful in CI logs. |

## Active Loop 7

| Field | Value |
|---|---|
| Loop goal | Gate 1: harden Cocos WeChat build process health around Creator exit code `36` |
| Main-agent local task | Completed this loop; keep memory aligned and move to Gate 3 unless a new Gate 1 blocker appears |
| Task agent | Completed |
| Audit agent | Completed |
| Human decision threshold | Any decision to ignore non-zero Cocos exits without verified output, delete build output, or change installed Cocos/WeChat tooling |

## Loop 7 Acceptance Target

| Requirement | Target |
|---|---|
| Exit-code policy | `run-wechat-build.mjs` makes the exit-code `36` tolerance explicit and evidence-backed, not silent |
| Build evidence | Build logs/config/report show whether Creator exited cleanly, tolerated, or failed |
| Hard failure | Non-zero Cocos exits must fail unless they are explicitly tolerated and followed by successful package verification |
| CI clarity | Self-hosted job output/artifacts should make build-stage health distinguishable from package verification |

## Loop 7 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Exit-code policy | Green | `creatorExitCodePolicy` and `classifyCreatorExitCode()` live in `tools/wechat-build-utils.mjs`; `0` is clean, `36` is tolerated, everything else fails |
| Build status evidence | Green | `tools/run-wechat-build.mjs` now writes `temp/wechat-build-status.json` with creator/config/log/output paths, exit code, final status, tolerated reason, timestamps, and runtime-settings optimization state |
| 36 warning | Green | Exit code `36` now logs an explicit tolerated-non-zero warning and still requires `verify:wechat` to be green before the build can be treated as release-safe |
| CI evidence chain | Green structurally | `automation-tests.yml` uploads `temp/wechat-build-status.json`; `tests/ci-workflow.test.mjs` asserts the path/order; `tools/run-automation-tests.mjs` includes the new policy test |
| Local validation | Green | Targeted policy tests pass; `node tools/run-automation-tests.mjs` and `node tools/run-ci-tests.mjs` pass locally |
| Build execution | Yellow | No real Cocos build was run in this loop, by request; the hardening is structural and still needs a live build/verify pass in the Cocos environment |

## Loop 7 Local Validation

| Command | Result |
|---|---|
| `node --check tools/wechat-build-utils.mjs` | Pass |
| `node --check tools/run-wechat-build.mjs` | Pass |
| `node --check tools/run-automation-tests.mjs` | Pass |
| `node --test tests/wechat-build-policy.test.mjs` | Pass |
| `node --test tests/ci-workflow.test.mjs` | Pass |
| `node --test tests/wechat-build-config.test.mjs` | Pass |
| `node tools/run-automation-tests.mjs` | Pass, `178/178` |
| `node tools/run-ci-tests.mjs` | Pass, including WeChat verify and 4 preview smoke tests |
| `git diff --check` | Pass with LF/CRLF warnings only |

## Loop 7 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | No more silent `new Set([0,36])` allowance in the build runner. Exit-code handling is now explicit and testable. | Treat Loop 7 objective as complete. |
| P1 | The status file improves observability, but it still depends on a real Cocos run to be populated with live evidence. | Keep Gate 1 Yellow until a self-hosted build/verify execution lands. |
| P2 | `36` is tolerated only as a build-stage signal; it must never be treated as final green without package verification. | Keep the warning text and CI ordering exactly as-is. |

## Active Loop 8

| Field | Value |
|---|---|
| Loop goal | Gate 3: enforce HUD renderer ownership and manifest/control-plane consistency |
| Main-agent local task | Inspect HUD/visual scripts and manifests, delegate a minimal static guardrail, run node tests, then adversarially review for multi-owner drift |
| Task agent | Pending |
| Audit agent | Pending |
| Human decision threshold | Any choice that changes the visible HUD layout/art direction, deletes runtime HUD behavior, or replaces the manifest architecture |

## Loop 8 Acceptance Target

| Requirement | Target |
|---|---|
| HUD owner rule | A HUD node/region cannot be simultaneously driven by `RectVisual`, `SpriteVisualSkin`, `HudPanelSkin`, and `GameHud.applySpriteSkin()` without an explicit transition owner |
| Manifest source of truth | `asset_selection_manifest` intent and `asset_binding_manifest_v2` current binding have a documented/testable relationship |
| Drift detection | Tests catch missing bindings, duplicate HUD renderer ownership, or visual keys that bypass the style gate |
| Minimal behavior risk | Add static/control-plane guardrails before changing visible HUD art |

## Loop 8 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| HUD owner rule | Green | `tests/control-plane-ownership.test.mjs` requires launch-scene HUD panels to use `HudPanelSkin` as primary owner, keep `RectVisual` as fallback, avoid root `cc.Sprite`, and keep `GameHud` panel spriteFrame refs unbound |
| Scene binding manifest | Green | Active scene `AssetBindingTag` entries now match `asset_binding_manifest_v2` source and selected path |
| Prefab binding manifest | Green | `ArrowProjectile.prefab` `projectile_arrow` moved from `asset_selection_manifest.entities` to `asset_binding_manifest_v2.worldEntities` and is covered by the control-plane test |
| Missing keys | Green | Added binding/style policies for `echo_spring_flower`, `echo_bomb_bug`, `boss_shield_closed`, `boss_shield_open`, and `projectile_arrow` |
| Style guardrail continuity | Green | New keys are `reference` or `transition`, never `final-approved` |

## Loop 8 Local Validation

| Command | Result |
|---|---|
| `node --check tests/control-plane-ownership.test.mjs` | Pass |
| `node --test tests/control-plane-ownership.test.mjs tests/style-resource-gate.test.mjs tests/echo-prefabs.test.mjs` | Pass |
| `node tools/run-automation-tests.mjs` | Pass, `181/181` |
| `node tools/run-ci-tests.mjs` | Pass, including WeChat verify and 4 preview smoke tests |
| `git diff --check` | Pass with LF/CRLF warnings only |

## Loop 8 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | No HUD owner or launch-scene binding bypass found after the static guardrail. | Treat Loop 8 objective as complete. |
| P1 | No missing coverage for the named scene binding keys after manifest/style gate updates. | Keep the control-plane test in the default automation suite. |
| P2 | Initial audit found `ArrowProjectile.prefab` still using `asset_selection_manifest.entities`. | Fixed in-loop by moving `projectile_arrow` into binding v2/style gate and adding prefab scanning; post-fix audit found no new issues. |

## Active Loop 9

| Field | Value |
|---|---|
| Loop goal | Gate 4: create a first-session playthrough guard for touch-only MVP flow |
| Main-agent local task | Completed: inspected existing Playwright/demo playthrough tests, delegated a bounded first-session acceptance gate, strengthened it after adversarial findings, and ran targeted/CI checks |
| Task agent | `Kepler`: first-session structural gate implementation |
| Audit agent | `Einstein`: mobile UX adversary; `Carver`: release QA adversary |
| Human decision threshold | Any change that rewrites gameplay progression, shortens the product flow, or changes player-facing control scheme |

## Loop 9 Acceptance Target

| Requirement | Target |
|---|---|
| Touch-only scope | New/updated guard must not depend on keyboard-only inputs for movement, attack, summon, pause, or respawn |
| Flow coverage | `StartCamp -> FieldWest -> FieldRuins -> DungeonHub -> RoomA/B/C -> BossArena -> return camp` is represented as executable or at least structurally enforced evidence |
| First-screen clarity | Guard checks that first `5` seconds expose location, direction/objective, and tappable controls |
| Failure clarity | If full automated playthrough is not possible yet, the gap must be explicit and not counted as release green |

## Loop 9 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Structural first-session gate | Green structurally | Added `tests/first-session-flow.test.mjs` to prove the launch loop is connected without pretending to be a real continuous playthrough |
| Touch-only entry | Green structurally | The new gate requires active/enabled `HudRoot` + `PauseMenuController`, active `TouchHudRoot`, `TouchJoystick`, and `TouchCommandButton` nodes for move/attack/summon/respawn/pause across the launch scenes |
| Flow coverage | Green structurally | The new gate asserts the full route `StartCamp -> FieldWest -> FieldRuins -> DungeonHub -> DungeonRoomA/B/C -> BossArena -> StartCamp` via `ScenePortal` targets |
| First-screen clarity | Green structurally | The new gate requires non-empty `GameHud.sceneTitle`, `GameHud.objectiveText`, `GameHud.mobileHintText`, bound title/objective labels, and StartCamp text that explains location, direction, and first action |
| Room identity | Green structurally | The new gate checks each room for theme-signaling nodes: A plate/clear relic, B trap/gap/launch hint, C bomb zone/wall/hint |
| Boss return path | Green structurally | The new gate requires `BossEnemy-Core`, shield phase nodes, boss controllers, and `Portal-BossVictory` back to camp |
| Anti-drift strength | Green structurally | After adversarial review, the gate also checks button command enums, component references, active/enabled state, and key HUD/touch/pause parent hierarchy |
| Failure clarity | Green | The test file is named as a structural gate and includes a comment that it does not claim a real release-green playthrough |

## Loop 9 Local Validation

| Command | Result |
|---|---|
| `node --check tests/first-session-flow.test.mjs` | Pass |
| `node --test tests/first-session-flow.test.mjs` | Pass |
| `node --check tools/run-automation-tests.mjs` | Pass |
| `node tools/run-automation-tests.mjs` | Pass, `182/182` |
| `node tools/run-ci-tests.mjs` | Pass, including WeChat verify and 4 preview smoke tests |
| `git diff --check` | Pass with LF/CRLF warnings only |

## Loop 9 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Both adversarial agents agreed the structural gate is honest and does not claim true runtime release evidence. | Close Loop 9 as structural-green only. |
| P1 | Initial audit found the first version only proved serialized touch wiring, not active/enabled/visible structural state. | Fixed in-loop by asserting active HUD/touch nodes, enabled components, button command enums, component refs, and key parent hierarchy. |
| P1 | Runtime first-session proof is still missing: the static gate cannot prove the player sees the first 5 seconds, uses touch continuously, dies/respawns, clears Boss, and returns to camp. | Start Loop 10 as a runtime Playwright/real-device Gate 4 loop; keep Gate 4 Yellow, not Green. |
| P2 | Static text checks prove text exists, not that a novice sees or understands it in the first 5 seconds. | Carry into Loop 10 with screenshot/runtime HUD evidence and human-readable first-screen scoring. |

## Active Loop 10

| Field | Value |
|---|---|
| Loop goal | Gate 4: add runtime first-session evidence beyond the structural gate |
| Main-agent local task | Completed: delegated runtime smoke, upgraded it after adversarial findings to use viewport input instead of internal method calls, and ran CI |
| Task agent | `Sartre`: first-session runtime smoke implementation |
| Audit agent | `Gibbs`: mobile UX adversary; `Euler`: release QA adversary; `Euclid`: post-fix adversarial re-audit |
| Human decision threshold | Any change that shortens the required product route, changes player-facing controls, or treats preview evidence as WeChat true-device proof |

## Loop 10 Acceptance Target

| Requirement | Target |
|---|---|
| First 5 seconds | Runtime evidence shows StartCamp HUD has location, objective, and tappable controls visible without keyboard |
| Touch-only runtime | At least one Playwright/preview gate proves joystick movement, attack, summon, pause/resume, and respawn/return-camp touch commands execute through touch controls |
| Route runtime | If full continuous `StartCamp -> BossArena -> StartCamp` is too flaky, the gate must state the limitation and cover deterministic route segments without pretending full release green |
| Release honesty | Preview runtime can improve Gate 4, but WeChat simulator/true-device proof remains required before Gate 5 |

## Loop 10 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Runtime smoke file | Green | Added `tests/first-session-runtime.spec.mjs` as a small Playwright smoke for StartCamp first-screen HUD/touch evidence |
| Default preview chain | Green | `tools/test-runner-helpers.mjs` now runs both `tests/preview-smoke.spec.mjs` and `tests/first-session-runtime.spec.mjs` through `runPlaywrightSmoke()` |
| First-screen evidence | Green for current scope | The smoke waits for StartCamp HUD text to appear, verifies `HudRoot` / `TouchHudRoot`, and checks touch controls are active/in-viewport enough to be used |
| Touch-only runtime | Green for current scope | After adversarial review, the smoke now maps Cocos node `worldPosition` to canvas DOM coordinates and uses Playwright `page.mouse` drag/click input for joystick, attack, summon, pause, continue, and restart |
| Respawn honesty | Green | `TouchRespawn` is not consistently visible on the initial StartCamp screen, so the runtime proof kills the player, opens the touch pause menu, and clicks `PauseRestart` through viewport input instead of pretending hidden `TouchRespawn` is first-screen visible |
| CI entry | Green | `node tools/run-ci-tests.mjs` now passes node tests, WeChat verify, and both preview smoke specs (`6` Playwright tests total, latest run `21.1s` for preview chain) |
| Gate status | Yellow | This is still runtime smoke evidence, not a full continuous first-session playthrough or true-device WeChat proof |

## Loop 10 Local Validation

| Command | Result |
|---|---|
| `node --check tests/first-session-runtime.spec.mjs` | Pass |
| `npx playwright test -c ./playwright.config.mjs ./tests/first-session-runtime.spec.mjs` | Pass, `2/2` |
| `node tools/run-ci-tests.mjs` | Pass, including WeChat verify and `6` preview tests |
| `git diff --check` | Pass with LF/CRLF warnings only |

## Loop 10 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. No audit found release-green misrepresentation or CI bypass after the runtime smoke landed. | Close Loop 10 as preview-runtime-smoke green only. |
| P1 | Initial UX audit found the first runtime smoke called `TouchCommandButton` / `TouchJoystick` internals, so event-dispatch failures could fake-pass. | Fixed in-loop by switching to real Playwright viewport drag/click input on canvas coordinates; post-fix re-audit found no P0/P1. |
| P1 | Initial audit found the smoke did not prove complete route progression beyond StartCamp. | Keep Gate 4 Yellow; route playthrough remains the next Gate 4 loop if prioritized. |
| P2 | First-screen evidence is still state + viewport-position based, not visual occlusion or human comprehension scoring. | Carry into visual/UX audit; do not call first-screen readability fully green. |
| P2 | Preview runtime smoke only runs when preview is available; it is not WeChat DevTools/true-device proof. | Keep Gate 1 and Gate 4 Yellow until simulator/true-device release evidence exists. |

## Active Loop 11

| Field | Value |
|---|---|
| Loop goal | Gate 2: start reducing the actual dark/noisy dungeon visual gap toward the cute bright toy-like target |
| Main-agent local task | Applied a safe dungeon warm palette slice, then fixed the shared HUD owner gap surfaced by control-plane tests |
| Task agent | `McClintock`: dungeon palette slice implementation |
| Audit agent | `Tesla`: art-direction adversary; `Confucius`: engineering/release adversary |
| Human decision threshold | Any decision to approve AI-generated ground/wall/HUD/player/Boss assets as final, replace the art direction, or perform broad scene regeneration without a rollback plan |

## Loop 11 Acceptance Target

| Requirement | Target |
|---|---|
| Style delta | Identify the smallest ugly visible slice that can move scenes toward bright, warm, rounded, toy-like without changing gameplay |
| Safety | Keep must-redo AI textures blocked from final approval; no new large AI ground/wall/HUD/player/Boss final assets |
| Evidence | Update docs/memory with before/after or explicit non-final status; run style/resource guardrails and CI where relevant |
| Package | Do not increase WeChat main package risk; any new asset must remain small or temporary/non-final |

## Loop 11 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Dungeon palette slice | Green for scope | `DungeonHub`, `DungeonRoomA/B/C`, and `BossArena` now use brighter, warmer, rounder panel fills and softer strokes/corner radii; generator and serialized scenes were synced |
| Asset boundary | Green | No new large art resources were added and no AI ground/wall/HUD/player/Boss asset was finalized |
| HUD owner | Green | `HudTopBar`, `HudObjectiveCard`, and `HudControlsCard` now get `HudPanelSkin` + `AssetBindingTag` from `tools/generate-week2-scenes.mjs` for every launch scene |
| Style gate | Green | `tests/style-resource-gate.test.mjs` passed |
| Dungeon structure | Green | `tests/dungeon-scenes.test.mjs` passed |
| Control plane | Green | `tests/control-plane-ownership.test.mjs` passed after the shared HUD generator fix |
| Default automation | Green | `node tools/run-automation-tests.mjs` passed, `182/182` |
| CI aggregate | Green with caveat | `node tools/run-ci-tests.mjs` passed node tests, WeChat verify, and `6/6` preview tests; this is still not true-device WeChat proof |
| Gate status | Yellow | Visual direction improved, but Boss/core progression visuals and dungeon ground/wall materials still need art-direction cleanup before Gate 2 can be called green |

## Loop 11 Local Validation

| Command | Result |
|---|---|
| `node --test tests/control-plane-ownership.test.mjs` | Pass |
| `node --test tests/style-resource-gate.test.mjs tests/dungeon-scenes.test.mjs tests/first-session-flow.test.mjs` | Pass, `11/11` |
| `node tools/run-automation-tests.mjs` | Pass, `182/182` |
| `node tools/run-ci-tests.mjs` | Pass, WeChat main package `2,557,851 bytes`, preview runtime `6/6` |

## Loop 11 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | Initial post-slice state failed the control-plane HUD owner rule: all launch scenes were missing `HudPanelSkin` on the three HUD panels. | Fixed in-loop by adding `addHudPanelSkin()` to the shared scene generator and regenerating launch scenes. |
| P1 | The dungeon palette slice only improves large colored panels; key Boss/progression visuals still include `generated/*` candidates and Kenney red button placeholders. | Carry into Loop 12 as the highest-priority Gate 2 art cleanup. |
| P1 | Broad regeneration increases audit noise and can touch all launch scenes, not only dungeon scenes. | Keep the generator as the source of truth; require targeted validation and memory notes whenever scenes are regenerated. |
| P2 | Dungeon ground/wall fallback families can still pull dark/dirty texture language back into the game. | Carry into Loop 12 with a no-large-new-assets, no-final-AI constraint. |

## Active Loop 12

| Field | Value |
|---|---|
| Loop goal | Gate 2: remove the next visible cute-style blockers after HUD owner convergence |
| Main-agent local task | Converted Boss shield from mixed image skins into a locked warm `RectVisual` placeholder and added regression coverage |
| Task agent | `Raman`: initial Boss shield implementation attempt; main agent integrated and narrowed it |
| Audit agent | `Schrodinger`: art-direction adversary; `Carver`: engineering/release adversary |
| Human decision threshold | Any proposal to replace Boss/player/main HUD with new final art, approve generated assets as final, or change the cute north star |

## Loop 12 Acceptance Target

| Requirement | Target |
|---|---|
| Boss/progression clarity | Boss shield/core/checkpoint/relic visuals stop reading as Kenney-tooling or raw generated placeholders where feasible |
| Style safety | Changes must stay bright, warm, rounded, readable, and explicitly non-final if they use placeholders |
| Package safety | No large new images; WeChat main package remains below `4MB` and preferably below the `3.7MB` warning line |
| Evidence | Run style/resource, control-plane, dungeon, automation, and CI checks if scene generation or runtime visuals change |

## Loop 12 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Boss shield mixed UI cleanup | Green for scope | `BossShield-Closed/Open` no longer bind Kenney red HUD buttons or dungeon sarcophagus images |
| Placeholder honesty | Green | `boss_shield_closed/open` now use empty `selectedPath` / `fallbackPath` and `bindingStatus: rect_visual_placeholder` |
| Runtime rendering ownership | Green | `BossShield-Closed/Open` no longer have `SceneDressingSkin`; their visible child remains `RectVisual` |
| Regression guard | Green | `tests/dungeon-scenes.test.mjs` now locks empty paths, placeholder status, no `SceneDressingSkin`, no root `cc.Sprite`, and `RectVisual` child ownership |
| Asset boundary | Green | No new images were added and no AI Boss/HUD art was approved as final |
| Gate status | Yellow | Shield mixing is reduced, but Boss core and checkpoint remain generated candidate visuals and still anchor the BossArena look |

## Loop 12 Local Validation

| Command | Result |
|---|---|
| `node --test tests/style-resource-gate.test.mjs tests/control-plane-ownership.test.mjs tests/dungeon-scenes.test.mjs` | Pass, `13/13` |
| `node tools/run-automation-tests.mjs` | Pass, `182/182` after adding the Boss shield regression guard |
| `node tools/run-ci-tests.mjs` | Pass, WeChat main package `2,557,851 bytes`, preview runtime `6/6` |

## Loop 12 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. No reviewer found package, CI, or control-plane drift after the Boss shield change. | Close Loop 12 as scoped green. |
| P1 | Art review found the shield is now cleaner but still reads as a text sign/card rather than a final cute world prop. | Keep Gate 2 Yellow; final shield art remains future work. |
| P1 | Engineering review found the first implementation lacked a regression test to stop future HUD-image fallback. | Fixed in-loop by hardening `tests/dungeon-scenes.test.mjs`. |
| P1 | Boss core and checkpoint still use generated candidate images and are the next BossArena visual anchors to address. | Carry into Loop 13. |
| P2 | `pickup_relic` remains generated candidate art, but it is not the highest-priority BossArena blocker. | Keep as follow-up after Boss core/checkpoint. |

## Active Loop 13

| Field | Value |
|---|---|
| Loop goal | Gate 2: reduce BossArena's remaining generated visual anchor problem |
| Main-agent local task | Removed generated `boss_core` from the BossArena main visual path and marked `checkpoint` as a non-final generated candidate |
| Task agent | `Herschel`: assessment only; main agent implemented the scoped change |
| Audit agent | `Kuhn`: art-direction adversary; `Maxwell`: engineering/release adversary |
| Human decision threshold | Any decision to make generated Boss/checkpoint art final, introduce new large art, or change the cute-style target |

## Loop 13 Acceptance Target

| Requirement | Target |
|---|---|
| Boss core honesty | `boss_core` is either replaced with an existing safer reference asset or clearly constrained as non-final candidate with stronger visual/test guardrails |
| Checkpoint honesty | `checkpoint` avoids becoming a final generated anchor and remains consistent across scenes |
| Style continuity | Changes must move BossArena toward bright, warm, cute, round, toy-like language without returning to dark dungeon props |
| Evidence | Run style/resource, dungeon, control-plane, automation, and CI if scene or manifest bindings change |

## Loop 13 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Boss core generated visual removal | Green for scope | `boss_core` now has empty `selectedPath` / `fallbackPath`, empty fallback list, and `bindingStatus: rect_visual_placeholder` |
| Boss core rendering path | Green for scope | `BossEnemy-Core` now uses procedural `RectVisual` children (`Visual`, `Inner`, `Shine`) and `BossVisualController` no longer binds generated sprite frames or textures |
| Checkpoint honesty | Green for scope | `checkpoint` remains the existing generated marker but is explicitly `non_final_generated_candidate` and locked to its current candidate path |
| Regression guard | Green | `tests/dungeon-scenes.test.mjs` locks boss core empty image paths, null sprite frames/textures, and procedural visual nodes; `tests/style-resource-gate.test.mjs` locks boss core/checkpoint status |
| Package safety | Green | No new images were added |
| Gate status | Yellow | Generated Boss core dependency is removed, but the procedural replacement still reads too much like a UI badge rather than a final cute world object |

## Loop 13 Local Validation

| Command | Result |
|---|---|
| `node --test tests/style-resource-gate.test.mjs tests/control-plane-ownership.test.mjs tests/dungeon-scenes.test.mjs tests/content-scenes.test.mjs` | Pass, `19/19` before final guard hardening |
| `node tools/run-automation-tests.mjs` | Pass, `183/183` |
| `node tools/run-ci-tests.mjs` | Pass, WeChat main package `2,557,851 bytes`, preview runtime `6/6` |

## Loop 13 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. No reviewer found control-plane, package, CI, or runtime drift. | Close Loop 13 as scoped green. |
| P1 | Art review found the procedural core removed generated-image pollution but still reads like a warm UI badge/card, not a cute world object with body. | Carry into Loop 14 as the next visual target. |
| P1 | Engineering review found the first guard only locked textures, not sprite-frame rebindings. | Fixed in-loop by asserting all BossVisualController sprite-frame and texture bindings stay null. |
| P2 | `checkpoint` is now honest as a non-final generated candidate, but still not final cute save-point art. | Keep as lower-priority Gate 2 visual debt. |

## Active Loop 14

| Field | Value |
|---|---|
| Loop goal | Gate 2: make the procedural Boss core read less like UI and more like a cute world object |
| Main-agent local task | Adjust Boss core shape language in generator without adding images or changing gameplay |
| Task agent | Pending |
| Audit agent | Pending |
| Human decision threshold | Any proposal to add final Boss art, change gameplay hitboxes substantially, or approve generated Boss assets as final |

## Loop 14 Acceptance Target

| Requirement | Target |
|---|---|
| Shape language | Boss core should look less like a rectangular/card badge and more like a toy-like object with body |
| Gameplay safety | Keep Boss gameplay components and approximate collision intent stable |
| No new assets | Use procedural scene nodes only; no added images |
| Evidence | Run dungeon/style/control-plane, automation, and CI if scene generator changes |

## Loop 14 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Boss core shape language | Green for scope | `BossEnemy-Core` now uses a layered procedural toy-object silhouette: inner body, orb, base, eyes, and shine nodes, instead of a single badge/card face |
| Gameplay safety | Green | `BossEnemy-Core` collider is explicitly locked back to `150 x 60`, preserving the existing gameplay hitbox intent while the visual shape changes |
| Regression guard | Green | `tests/dungeon-scenes.test.mjs` asserts the Boss core hierarchy, RectVisual-only placeholder nodes, null sprite-frame/texture bindings, and stable collider size |
| Package safety | Green | No new image assets were added; CI still reports WeChat main package `2,557,851 bytes`, below the `4MB` hard cap and `3.7MB` warning line |
| Gate status | Yellow | The core is less UI-like, but art review still sees some symmetric placeholder/badge language; BossShield also remains visibly sign/card-like |

## Loop 14 Local Validation

| Command | Result |
|---|---|
| `node --test tests/dungeon-scenes.test.mjs tests/style-resource-gate.test.mjs tests/control-plane-ownership.test.mjs` | Pass, `14/14` |
| `node tools/run-automation-tests.mjs` | Pass, `183/183` |
| `node tools/run-ci-tests.mjs` | Pass, WeChat main package `2,557,851 bytes`, preview runtime `6/6` |

## Loop 14 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. No audit found package, CI, or control-plane drift after the Boss core procedural change. | Close Loop 14 as scoped green. |
| P1 | Engineering review caught a collider drift from `150 x 60` to `112 x 96` during the visual rewrite. | Fixed in-loop by restoring `150 x 60` and adding an explicit dungeon-scene assertion. |
| P1 | Art review found the core is improved but still partly reads as a centered placeholder/badge rather than fully living toy-world art. | Keep Gate 2 Yellow; carry as follow-up after the cleaner BossShield pass. |
| P1 | BossShield still reads like an English sign/card with `SHELL LOCKED` / `SHELL OPEN`. | Start Loop 15 to remove the sign-card language without adding assets or changing gameplay. |
| P2 | `checkpoint` remains a non-final generated candidate. | Keep as lower-priority Gate 2 visual debt. |

## Active Loop 15

| Field | Value |
|---|---|
| Loop goal | Gate 2: make BossShield-Closed/Open stop reading like text signs/cards and read more like warm rounded toy-world mechanisms |
| Main-agent local task | Review task-agent output, run targeted/automation/CI checks, then open art and engineering adversarial audits |
| Task agent | `Nietzsche`: BossShield procedural mechanism cleanup |
| Audit agent | Pending after implementation |
| Human decision threshold | Any proposal to add final Boss shield art, approve generated Boss/HUD assets as final, change gameplay hitboxes/phase logic, or change the cute-style target |

## Loop 15 Acceptance Target

| Requirement | Target |
|---|---|
| Shape language | `BossShield-Closed/Open` should use bright, warm, rounded procedural parts that read as a world mechanism, not English labels or UI cards |
| Gameplay safety | Preserve `BreakableTarget` references, active-state behavior, and Boss shield phase controller wiring |
| No new assets | Use procedural scene nodes only; no added images and no generated art approval |
| Regression guard | Tests should catch reintroduction of shield image skins, root sprites, or placeholder text-sign language |
| Evidence | Run dungeon/style/control-plane, automation, and CI if the scene generator changes |

## Loop 15 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Shield language | Green | `BossShield-Closed/Open` no longer use `SHELL LOCKED` / `SHELL OPEN`; both are now warm procedural mechanism placeholders built from rounded RectVisual parts only |
| Gameplay safety | Green | `BreakableTarget` wiring, active-state behavior, and Boss shield phase controller references were preserved unchanged |
| Regression guard | Green | `tests/dungeon-scenes.test.mjs` now rejects shield label cards, root sprites, and hidden `-Visual` label wrappers, and checks the new procedural child nodes |
| Package safety | Green | No image assets were added; CI still verifies WeChat main package `2,557,851 bytes`, below the `4MB` cap |
| Gate status | Yellow | Literal shield text is gone, but art audit still finds the shield too centered/symmetrical/card-like and the broader BossArena still sign-heavy |

## Loop 15 Local Validation

| Command | Result |
|---|---|
| `node --test tests/dungeon-scenes.test.mjs tests/style-resource-gate.test.mjs` | Pass, `11/11` |
| `node tools/run-automation-tests.mjs` | Pass, `183/183` |
| `node tools/run-ci-tests.mjs` | Pass, WeChat main package `2,557,851 bytes`, preview runtime `6/6` |

## Loop 15 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Neither art nor engineering audit found a release-blocking regression. | Keep moving without human escalation. |
| P1 | Art audit `Singer` found that `BossShield-Closed/Open` removed literal `SHELL` text but still reads as a centered symmetrical UI card/badge because it is built from large nested rounded panels and mirrored arms. | Do not close Gate 2 for BossArena; continue with a second shield/world-mechanism pass. |
| P1 | Art audit also found BossArena still has conspicuous English signage: `DANGER: BREAK SHIELD`, `WINDOW: ATTACK NOW`, and return-hint text. | Add the broader BossArena sign/card language to Loop 16, while preserving gameplay clarity. |
| P2 | Engineering audit `Archimedes` found no gameplay wiring or package issue, but noted the memory should record which independent auditors produced the feedback. | This section now names `Singer` and `Archimedes`; future loops should avoid pre-writing post-audit conclusions before audits return. |
| P2 | `checkpoint` remains a non-final generated candidate. | Keep as lower-priority Gate 2 debt. |

## Loop 16 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Shield silhouette | Green for scope | `BossShield-Closed/Open` now root as pure containers with warm petal/charm child parts, instead of a big centered card root |
| Boss status text | Green for scope | `BossStatusBanner`, `BossWindowBanner`, `BossReturnHint`, and `BossHint` now use short Chinese cues instead of English signage |
| Return cue | Green for scope | `Portal-BossVictory` now says `回营地`, keeping the return path readable without a large English sign |
| Victory cue | Green for scope | `BossVictoryBanner` now says `试炼完成`, and `TRIAL CLEARED` is part of the forbidden English regression list |
| Regression guard | Green | `tests/dungeon-scenes.test.mjs` now blocks shield root cards, shield labels, shield sprites/skins, removed English phrases, and key `BossShieldPhaseController` references |
| Package safety | Green | No image assets were added; CI still reports WeChat main package `2,557,851 bytes` |
| Gate status | Yellow | BossArena text/sign debt is reduced, but independent art audit still finds the shield too centered and emblem/card-like |

## Loop 16 Local Validation

| Command | Result |
|---|---|
| `node --test tests/dungeon-scenes.test.mjs tests/first-session-flow.test.mjs` | Pass, `5/5` |
| `node --test tests/style-resource-gate.test.mjs tests/control-plane-ownership.test.mjs` | Pass, `10/10` |
| `node tools/run-automation-tests.mjs` | Pass, `183/183` |
| `node tools/run-ci-tests.mjs` | Pass, WeChat main package `2,557,851 bytes`, preview runtime `6/6` |

## Loop 16 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Independent art and engineering audits found no release-blocking regression. | Keep moving without human escalation. |
| P1 | Art audit `Dewey` found the shield is improved but still reads like a centered UI emblem/card because its rounded parts remain clustered around a `172 x 112` root silhouette. | Do not close the BossArena style pass; start Loop 17 to break the shield silhouette further. |
| P1 | Engineering audit `Boyle` found tests did not lock the `BossShieldPhaseController` serialized fields. | Fixed in-loop by asserting `shieldTarget`, `bossHealth`, `bossAI`, `bossContactDamage`, and danger/vulnerable activation lists in `tests/dungeon-scenes.test.mjs`. |
| P2 | Memory originally closed Loop 16 too confidently before recording independent audit caveats. | This section now records `Dewey` and `Boyle` explicitly and keeps Gate 2 Yellow. |

## Loop 17 Implementation Result

| Field | Value |
|---|---|
| Shield language | Green for scope. `BossShield-Closed/Open` now use an asymmetric warm procedural cluster with `ShellLobe`, `HingeFin`, `CharmCore`, `Counterweight`, `Latch`, `Spark`, and `Anchor` instead of the earlier centered petal badge layout. |
| Gameplay safety | Green. `BreakableTarget`, `BossShieldPhaseController`, boss health, active states, and the victory return path were left intact. |
| Visual guardrails | Green. Tests still block root `RectVisual`, `cc.Label`, `cc.Sprite`, and `SceneDressingSkin`, lock the new child node names, reject the old symmetric `Petal*` leftovers, and pin key shield phase timing values. |
| Audit posture | Yellow. The shield is less badge-like, but art audit still treats it as procedural placeholder art and the wider BossArena as text-heavy. |

## Loop 17 Validation

| Command | Result |
|---|---|
| `node --test tests/dungeon-scenes.test.mjs tests/style-resource-gate.test.mjs tests/control-plane-ownership.test.mjs` | Pass, `14/14` |
| `node tools/run-ci-tests.mjs` | Pass, WeChat main package `2,557,851 bytes`, total `2,733,825`, preview runtime `6/6` |

## Loop 17 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Independent audits found no release-blocking regression. | Keep moving without human escalation. |
| P1 | Art audit `Euclid` found the shield is a real directional win but still reads like procedural placeholder art inside a centered invisible container silhouette. | Do not claim final Boss art; keep Gate 2 Yellow. |
| P1 | Engineering audit `Rawls` found the wider BossArena remains text-heavy (`先破盾`, `趁隙打`, `回营地`, `试炼完成`, `炸虫破盾，趁隙输出。`). | Start Loop 18 to reduce BossArena text density while preserving player feedback. |
| P2 | Engineering audit found shield phase tuning values were not pinned by tests. | Fixed in-loop by asserting `vulnerableSeconds`, `dangerMoveSpeed`, and `vulnerableMoveSpeed` in `tests/dungeon-scenes.test.mjs`. |

## Active Loop 18

| Field | Value |
|---|---|
| Loop goal | Gate 2: reduce BossArena text density and sign-board feeling without removing necessary player feedback |
| Main-agent local task | Delegate a bounded copy/visual-feedback pass, preserve gameplay wiring and Chinese readability, then run validation |
| Task agent | Completed in this pass |
| Audit agent | Pending |
| Human decision threshold | Any move to remove required boss feedback entirely, add final Boss art, alter gameplay wiring, or approve generated Boss/HUD assets as final |

## Loop 18 Acceptance Target

| Requirement | Target |
|---|---|
| Text density | Reduce simultaneous BossArena text surfaces so the arena feels less like a cluster of signs |
| Player clarity | Preserve clear cues for shield danger, attack window, victory, and return path |
| Gameplay safety | Preserve Boss core collider, shield phase fields, BreakableTarget, active states, and victory portal |
| No new assets | Procedural scene nodes and copy/layout only; no new bitmap/generated art |
| Evidence | Run dungeon/style/control-plane, automation, and CI if generator or scenes change |

## Loop 18 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| HUD objective | Green for scope | BossArena HUD objective now carries the longer Chinese boss instruction: `先破盾，再趁窗口输出；胜利后回营地。` |
| World-space density | Green for scope | `BossReturnHint` and `BossHint` were removed; the remaining boss banners are shorter cues only |
| Phase cues | Green for scope | `BossStatusBanner`, `BossWindowBanner`, and `BossVictoryBanner` were shortened to `破盾` / `输出` / `完成` |
| Gameplay safety | Green | `BreakableTarget`, shield phase fields, active states, and `Portal-BossVictory` wiring were preserved |

## Loop 18 Validation

| Command | Result |
|---|---|
| `node --test tests/dungeon-scenes.test.mjs tests/first-session-flow.test.mjs` | Pass, `5/5` |
| `npx playwright test -c ./playwright.config.mjs ./tests/demo-playthrough-audit.spec.mjs --grep "Boss fight starts correctly|Boss defeat triggers victory state"` | Pass, `2/2` |
| `node tools/run-automation-tests.mjs` | Pass, `183/183` |
| `node tools/run-ci-tests.mjs` | Pass, WeChat main package `2,557,851 bytes`, preview runtime `6/6` |

## Loop 18 Audit Status

| Priority | Status |
|---|---|
| P0 | None |
| P1 | Art/UX audit still sees BossArena as less noisy but not final cute-world art: HUD objective + short phase banners + portal label still read as sign cluster debt |
| P1 | Engineering audit found runtime and structural clear-state assertions were too weak; fixed by asserting Boss clear active/deactive refs and runtime victory UI state |
| P1 | Main follow-up discovered source/library/build drift: source scenes had current BossArena copy, local Cocos `library` and WeChat build payload still had older BossArena data |
| P2 | `library` cache gate remains soft in clean CI when no local `library` cache exists |

## Loop 19 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Cocos preview cache gate | Green | Added `tests/cocos-library-cache.test.mjs`; if local `library/<uuid>.json` exists for a release scene, it must JSON-match `assets/scenes/*.scene` |
| Local preview cache sync | Green | Synced 8 release scene cache files from source scene files, including `library/21/217ece9c-aa9f-4460-90b2-f23a5b5f8adb.json` |
| Runtime source check | Green | Playwright Boss victory audit now reads `先破盾，再趁窗口输出；胜利后回营地。` from runtime and asserts Boss victory/portal/banner active states |
| Build output fact source | Green | Added `resolveLastWechatBuildOutputDir()` so simulator, DevTools launch, verify, CI, optimize, and build-output tests use the last completed build status before falling back to config |
| Stale build payload gate | Green | `tests/wechat-build-output.test.mjs` now rejects removed BossArena payload markers: `BossHint`, `BossReturnHint`, `TRIAL CLEARED`, `DANGER: BREAK SHIELD`, and the old English objective |
| WeChat package rebuild | Green | Rebuilt `build/wechatgame`; status is `tolerated` for Creator exit code 36, runtime settings optimized, no stale BossArena payload remains |
| Package safety | Green | WeChat main package is `2,551,250 bytes`, total output `2,718,014 bytes`, below the `4MB` hard cap and `3.7MB` warning line |

## Loop 19 Validation

| Command | Result |
|---|---|
| `node --test tests/cocos-library-cache.test.mjs` | Pass, `1/1` after cache sync |
| `npx playwright test -c ./playwright.config.mjs ./tests/demo-playthrough-audit.spec.mjs --grep "Boss fight starts correctly|Boss defeat triggers victory state"` | Pass, `2/2`; runtime objective is current Chinese text |
| `node --test tests/wechat-build-policy.test.mjs tests/wechat-build-output.test.mjs tests/wechat-simulator.test.mjs tests/cocos-library-cache.test.mjs` | Pass, `17` passed and `9` simulator checks skipped because auto mode was not connected |
| `node tools/run-wechat-build.mjs` | Pass with tolerated Creator exit code `36`; output `E:\cv5\wisdom\build\wechatgame` |
| `node tools/verify-wechat-build-output.mjs` | Pass; main package `2,551,250`, total `2,718,014` |
| `node tools/run-automation-tests.mjs` | Pass, `186/186` |
| `node tools/run-ci-tests.mjs` | Pass, node `186/186`, WeChat verify pass, preview smoke `6/6` |

## Loop 19 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Final engineering audit found no release-blocking source/cache/build drift. | Close Loop 19 as scoped green. |
| P1 | None. Old staging is no longer preferred implicitly; build status output dir now wins only for completed `clean` / `tolerated` builds. | No human escalation required. |
| P2 | `tests/cocos-library-cache.test.mjs` still skips when `library` cache files do not exist, so it is a local-preview cache gate rather than a clean-CI hard gate. | Keep as non-blocking follow-up unless we decide to create CI fixtures for Cocos library cache. |

## Active Loop 20

| Field | Value |
|---|---|
| Loop goal | Gate 2: return from engineering drift to visible cute-style gap, focusing on the dark/noisy dungeon/field visual language |
| Main-agent local task | Inventory current scene visual bindings and identify the smallest high-impact style change that pushes scenes toward bright, warm, toy-like readability without adding package-heavy assets |
| Task agent | Pending |
| Audit agent | Pending |
| Human decision threshold | Any proposal to approve generated art as final, add large bitmap packs, change the cute-style target, or defer the WeChat `4MB` hard cap |

## Loop 20 Acceptance Target

| Requirement | Target |
|---|---|
| Style direction | Move at least one high-impact scene/background set away from dark dungeon/noisy green and toward bright, warm, rounded toy-world readability |
| Package safety | No new large bitmap assets; main package must stay under `4MB` and ideally under `3.7MB` |
| Control-plane safety | Keep `asset_selection_manifest` as intent and `asset_binding_manifest_v2` as binding source; no direct untracked asset swaps |
| Evidence | Run style/resource, scene, automation, CI, and at least one adversarial art/engineering audit |

## Loop 20 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Generated-art containment | Green for scope | Main HUD/touch controls, checkpoint/portal markers, enemies, barriers, breakables, and relic pickups now use image-free `rect_visual_placeholder` bindings instead of generated bitmap anchors |
| HUD renderer ownership | Green | Generated scenes keep HUD panels on warm `RectVisual` placeholders and tests reject `HudPanelSkin` / `cc.Sprite` multi-owner rendering on the same HUD nodes |
| Cute-style guardrail | Green for scope | Added `assets/configs/style_resource_gate.json` and `tests/style-resource-gate.test.mjs` to lock the cute north star, forbidden dark/gothic/noisy families, must-redo resources, transition resources, and protected/reference keys |
| Scene visual pass | Yellow-green | Regenerated release scenes with warmer/lighter procedural placeholders for HUD, RoomC, BossArena, and key gameplay objects; this improves the dark/noisy gap but is still not final cute art |
| Binding control plane | Green | `asset_binding_manifest_v2` now avoids first-release dungeon-family scene binding targets and marks non-final visual keys as transition placeholders |
| WeChat freshness gate | Green | `verify-wechat-build-output` now fails stale builds by checking release scenes, config, scripts, prefabs, art/audio/config directories, build config, and build tools |
| Portal runtime coverage | Green for current preview | Added a portal-contact helper and StartCamp gate-to-FieldWest assertion that verifies `ScenePortal` requests `FieldWest` and records the target checkpoint |
| Runtime teardown safety | Green | `PlayerController.onDisable` / `onDestroy` now use optional event cleanup so scene teardown does not crash when event wiring is already absent |
| Visual evidence | Green for scope | Refreshed initial-scene baselines for the eight release scenes plus MechanicsLab after the placeholder pass |
| Package safety | Green | Rebuilt WeChat output: main package `2,534,683 bytes`, total output `2,681,659 bytes`, below both the `4MB` hard cap and `3.7MB` warning line |

## Loop 20 Validation

| Command | Result |
|---|---|
| `node --test tests/style-resource-gate.test.mjs tests/content-scenes.test.mjs tests/dungeon-scenes.test.mjs tests/control-plane-ownership.test.mjs tests/cocos-library-cache.test.mjs` | Pass, `26/26` |
| `npx playwright test -c ./playwright.config.mjs ./tests/first-session-runtime.spec.mjs --grep "touch-only actions"` | Pass after stabilizing the touch attack assertion |
| `npx playwright test -c ./playwright.config.mjs ./tests/demo-playthrough-audit.spec.mjs --grep "Portal transition from StartCamp to FieldWest"` | Pass; portal contact requests `FieldWest` and stores `field-west-entry` |
| `npx playwright test -c ./playwright.config.mjs ./tests/visual-scene-initial.spec.mjs --update-snapshots` | Pass, `9/9`; refreshed initial-scene visual baselines |
| `node tools/run-wechat-build.mjs` | Pass with tolerated Creator exit code `36`; output `E:\cv5\wisdom\build\wechatgame` |
| `node tools/verify-wechat-build-output.mjs` | Pass; freshness covered `2710` source inputs, main package `2,534,683`, total `2,681,659` |
| `node tools/run-automation-tests.mjs` | Pass, `193/193` |
| `node tools/run-ci-tests.mjs` | Pass, node `193/193`, WeChat verify pass, preview runtime `6/6` |

## Loop 20 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Post-fix art and engineering audits found no release-blocking package, control-plane, or runtime regression. | Close Loop 20 as scoped green without human escalation. |
| P1 | Art audit found the main HUD, touch buttons, key gameplay objects, and some Boss/Room surfaces were still using generated or dark-looking anchors. | Fixed in-loop by demoting these to image-free transition placeholders, warming procedural colors, and adding style gates. |
| P1 | Engineering audit found `verify:wechat` did not itself enforce source freshness and the input set was too narrow. | Fixed in-loop by moving freshness checks into shared WeChat utilities and invoking them from verification and tests. |
| P1 | Engineering audit found the portal playthrough only checked structure rather than contact behavior. | Fixed in-loop with a runtime portal-contact helper that asserts the requested scene and checkpoint. |
| P1 | A full real preview `loadScene` transition exposed stale-preview teardown risk in `PlayerController.onDestroy`. | Fixed source with null-safe event cleanup; current portal test intercepts `switchScene` to avoid relying on stale compiled preview chunks. |
| P2 | Visuals are now safer and brighter, but still procedural placeholders rather than final "cute toy-world" art. | Start Loop 21 on actual art direction/sample sheets and visual scoring, not more engineering drift. |
| P2 | `HudPanelSkin` still exists as a transition script even though generated release scenes no longer use it for HUD panels. | Keep as cleanup debt unless a later audit finds it reintroduced as an owner. |

## Active Loop 21

| Field | Value |
|---|---|
| Loop goal | Gate 2: convert the placeholder-safe cute direction into a small final-style art sample set and score it against the cute north star |
| Main-agent local task | Compare refreshed screenshots against the style rubric, choose the smallest set of final art samples to design or specify, and keep package impact near zero until approval |
| Task agent | Pending |
| Audit agent | Pending |
| Human decision threshold | Any decision to approve final art, add bitmap packs that affect package budget, change the cute north star, or accept AI-generated HUD/terrain/character art as final |

## Loop 21 Acceptance Target

| Requirement | Target |
|---|---|
| Style scoring | Each first-release scene gets a rubric score for brightness, warmth, low noise, toy feel, rounded silhouettes, path readability, HUD consistency, and character visibility |
| Sample scope | Produce or specify only a tiny final-style sample sheet first: ground tile, path tile, wall/edge tile, HUD panel, button, checkpoint/portal marker, enemy/relic placeholder language |
| Package safety | No bulk bitmap import until the sample set passes the rubric and expected main-package impact is estimated |
| Player-readability simulation | Re-run the first-session reverse journey from StartCamp to FieldWest/FieldRuins/DungeonHub and note where players still see "dark dungeon" or "mixed UI" |
| Evidence | At minimum run style/resource tests, visual initial-scene screenshots, and one art adversarial audit before changing broad scene art |

## Loop 21 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Style scoring | Green for scope | Added `docs/loop21-cute-style-scorecard-2026-04-21.md`, scoring every first-release scene across brightness, warmth, low noise, toy feel, rounded silhouette, path readability, HUD consistency, and character visibility |
| Reverse journey | Green for scope | Scorecard walks `StartCamp -> FieldWest -> FieldRuins -> DungeonHub -> DungeonRoomA/B/C -> BossArena -> return camp` and records where players still see mixed UI, sign boards, and placeholder scaffolding |
| Sample-sheet scope | Green | Scorecard limits the next final-style sample sheet to ground, path, wall/edge, HUD panel, primary button, checkpoint/portal marker, and enemy/relic placeholder language before any bulk bitmap import |
| Black edge / first impression | Green | Generated first-release scenes now use warm cream camera clear color `#f7f2dd` instead of black, reducing screenshot dark pixels in release scenes to near zero without adding assets |
| Visual regression gate | Green | `test:ci` now runs `visual-scene-initial.spec.mjs` after runtime smoke whenever preview is available, so initial-scene screenshots are no longer manual-only evidence |
| Package safety | Green | No bitmap assets were added; WeChat main package remains `2,534,683 bytes`, total output `2,681,659 bytes` |

## Loop 21 Validation

| Command | Result |
|---|---|
| `node --test tests/style-resource-gate.test.mjs tests/content-scenes.test.mjs tests/cocos-library-cache.test.mjs` | Pass, `20/20` |
| `npx playwright test -c ./playwright.config.mjs ./tests/visual-scene-initial.spec.mjs --update-snapshots` | Pass, `9/9`; initial-scene baselines refreshed after warm camera clear color |
| Screenshot luminance check | Release scenes dropped to `dark<20 = 0.0%` and `dark<50 <= 0.3%`; `MechanicsLab` remains dark but is internal-only |
| `node tools/run-wechat-build.mjs` | Pass with tolerated Creator exit code `36`; output `E:\cv5\wisdom\build\wechatgame` |
| `node tools/verify-wechat-build-output.mjs` | Pass; freshness covered `2710` source inputs, main package `2,534,683`, total `2,681,659` |
| `node tools/run-automation-tests.mjs` | Pass, `194/194` before CI-visual wiring and `195/195` after CI-visual wiring |
| `node --test tests/ci-workflow.test.mjs` | Pass, `5/5`; local CI runner is asserted to include initial visual snapshots |
| `node tools/run-ci-tests.mjs` | Pass, node `195/195`, WeChat verify pass, preview runtime `6/6`, visual initial snapshots `9/9` |

## Loop 21 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Art/UX and engineering audits found no release-blocking regression. | Continue without human escalation. |
| P1 | Art/UX audit `Volta` found mixed UI is still the dominant north-star miss: oversized translucent cards, Chinese/English labels, and functional signs still read more like control panels than a toy world. | Keep Gate 2 Yellow; start Loop 22 on UI language/surface reduction before broad art import. |
| P1 | Art/UX audit found `BossArena` still reads as a pale QA staging board with a placeholder boss blob and `BOSS CHECK`, despite the warm clear-color win. | Keep BossArena as a priority sample-sheet target. |
| P1 | Engineering audit `Wegener` found refreshed screenshots were not part of `test:ci`. | Fixed in-loop by adding `runPlaywrightVisualInitial()` and running it from `tools/run-ci-tests.mjs` after preview smoke. |
| P2 | `tests/cocos-library-cache.test.mjs` still skips on clean runners without local `library` cache. | Keep as known local-preview debt unless we add tracked fixtures or a Creator cache export step. |
| P2 | Visual snapshots wait for scene nodes and frames, but do not explicitly wait for every final texture/spriteFrame to load. | Accept for current placeholder phase; revisit when final bitmap art lands. |
| P2 | `MechanicsLab` remains visually dark. | Keep excluded from first-release style approval evidence. |

## Active Loop 22

| Field | Value |
|---|---|
| Loop goal | Gate 2: attack the largest remaining visual miss, mixed UI / sign-board language, while preserving touch-first clarity |
| Main-agent local task | Replace or reduce the most visible English/debug labels and oversized control-panel surfaces in the first journey, starting with StartCamp/FieldWest and BossArena, using procedural styling only |
| Task agent | Pending |
| Audit agent | Pending |
| Human decision threshold | Any proposal to approve final art, add bitmap packs, remove essential player instruction, change the cute north star, or weaken the WeChat 4MB gate |

## Loop 22 Acceptance Target

| Requirement | Target |
|---|---|
| Mixed UI reduction | The initial journey should show fewer English/debug labels and fewer giant instruction-board surfaces |
| Player clarity | The player can still identify movement, attack, summon, destination, locked/unlocked gates, and boss state within 5 seconds |
| No new assets | Use procedural layout/copy changes only; no bitmap import until the sample sheet is approved |
| Regression gate | Update structural/copy tests and visual baselines; `test:ci` must remain green with visual snapshots included |

## Loop 22 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Mixed UI copy reduction | Green for scope | First-release visible scene and touch-control labels were unified toward Chinese copy in `tools/generate-week2-scenes.mjs`; old labels such as `ATTACK`, `SUMMON`, `PENDING`, `BOUNDARY`, `Boss Arena`, and `PLAYER` are now rejected in first-pass scenes |
| Runtime HUD copy | Green for scope | `assets/scripts/ui/GameHud.ts` now renders `生命`, `回响`, `营火`, Chinese echo names, Chinese pause actions, and `·锁` locked echo states instead of `HP/Echo/Check/None` style debug copy |
| Post-audit leak fixes | Green | Fixed late leaks found during audit: player label is now `小勇者`, RoomC hint is `让炸虫碰裂墙，打开小路`, BossArena title is `首领庭院`, and serialized initial HUD labels are `回响 箱子` / `营火 未激活` |
| WeChat payload guard | Green | Added a build-output gate that scans WeChat JSON scene payloads for old visible debug labels, preventing source/preview/build drift from hiding stale English copy |
| Preview cache alignment | Green for local evidence | Regenerated first-release scenes and synced local `library/<uuid>.json` scene caches so Cocos preview and source scenes match |
| Visual evidence | Green for scope | Refreshed `visual-scene-initial` baselines after the copy fixes |
| Package safety | Green | Rebuilt WeChat output: main package `2,534,611 bytes`, total output `2,680,935 bytes`, below both the `4MB` hard cap and `3.7MB` warning line |

## Loop 22 Validation

| Command | Result |
|---|---|
| `node --test tests/style-resource-gate.test.mjs tests/content-scenes.test.mjs tests/dungeon-scenes.test.mjs tests/cocos-library-cache.test.mjs` | Pass, `26/26` after cache sync |
| `npx playwright test -c ./playwright.config.mjs ./tests/visual-scene-initial.spec.mjs --update-snapshots` | Pass, `9/9`; baselines refreshed |
| `node tools/run-wechat-build.mjs` | Pass with tolerated Creator exit code `36`; output `E:\cv5\wisdom\build\wechatgame` |
| `node tools/verify-wechat-build-output.mjs` | Pass; freshness covered `2710` source inputs, main package `2,534,611`, total `2,680,935` |
| `node --test tests/wechat-build-output.test.mjs tests/style-resource-gate.test.mjs tests/cocos-library-cache.test.mjs` | Pass, `30/30`; includes new WeChat JSON visible-label gate |
| `node tools/run-automation-tests.mjs` | Pass, `198/198` |
| `node tools/run-ci-tests.mjs` | Pass, node `198/198`, WeChat verify pass, preview runtime `6/6`, visual initial snapshots `9/9` |

## Loop 22 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Visual, UX, and engineering audits found no release-blocking regression. | Close Loop 22 without human escalation. |
| P1 | Visual audit `Chandrasekhar` found the biggest remaining cute-style miss is still board density and control-panel composition, especially in `DungeonHub`, `DungeonRoomB/C`, and `BossArena`. | Keep Gate 2 Yellow; start a later loop on reducing board density before adding bitmap art. |
| P1 | UX audit `Sartre` found current runtime smoke is still mostly `StartCamp`, not a full packaged-player journey through `FieldWest -> FieldRuins -> DungeonHub -> rooms -> BossArena -> return camp`. | Start the next loop on a full first-session runtime journey gate. |
| P1 | UX audit found `BossArena` still had English title `Boss Arena`. | Fixed in-loop by renaming visible title to `首领庭院` and adding source/build guards. |
| P1 | Local scan found RoomC still had visible English hint `BombBug is the only echo that can break this wall.` and player label `PLAYER`. | Fixed in-loop and added both source-scene and WeChat JSON payload guards. |
| P2 | `MechanicsLab` remains in visual initial baselines even though it is internal-only and visually darker. | Keep as internal test evidence; split release/internal visual evidence in a later loop. |
| P2 | Engineering audit `Gibbs` found preview smoke and visual initial checks are optional when `PREVIEW_BASE_URL` is absent/unhealthy unless `REQUIRE_PREVIEW_SMOKE=1` is set. | Keep as CI policy debt; release CI should make preview evidence required. |
| P2 | Engineering audit found clean CI can skip `cocos-library-cache.test.mjs` when no local `library` cache exists. | Keep as local-preview debt; current local cache is synced, but release mode needs stricter cache/artifact evidence. |
| P2 | Engineering audit found `temp/wechat-build-status.json` records build completion/tolerated state but not verification success. | Keep as release-control debt; add `verificationStatus` before treating build status as a publishable artifact. |

## Active Loop 23

| Field | Value |
|---|---|
| Loop goal | Gate 4: add a full first-session runtime journey gate that better simulates a packaged WeChat player path |
| Main-agent local task | Build or extend a runtime spec for `StartCamp -> FieldWest -> FieldRuins -> DungeonHub -> DungeonRoomA/B/C -> BossArena -> return camp`, asserting mobile HUD entry points, readable scene copy, respawn availability, loading/fallback behavior, room theme distinction, and boss feedback |
| Task agent | Pending |
| Audit agent | Pending |
| Human decision threshold | Any need to change the intended player route, skip required rooms, weaken touch-only acceptance, or make CI preview mandatory in a way that changes developer/release workflow |

## Loop 23 Acceptance Target

| Requirement | Target |
|---|---|
| Runtime journey | A test or harness loads/traverses every first-release scene in order and records user-visible HUD/state evidence |
| Touch-first evidence | Movement, attack, summon, pause/resume, and respawn remain reachable without keyboard assumptions |
| Scene readability | Each stop exposes a Chinese title/objective and at least one clear next action within the first few seconds |
| Boss loop | BossArena exposes pre-fight objective, combat/damage feedback, defeat/clear state, and return-camp path evidence |
| Regression gate | The new journey gate runs in automation/CI when preview evidence is available, with release-mode behavior documented if preview is required |

## Loop 23 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Full runtime journey | Green for current Cocos preview evidence | Added and wired `tests/first-session-journey.spec.mjs`, covering `StartCamp -> FieldWest -> FieldRuins -> DungeonHub -> DungeonRoomA/B/C -> BossArena -> StartCamp` in one session with real `loadScene` transitions |
| CI wiring | Green | `tools/test-runner-helpers.mjs` exposes `runPlaywrightFirstSessionJourney()` and `tools/run-ci-tests.mjs` runs it after preview runtime smoke and before visual initial snapshots |
| Touch-first checkpoints | Green for scope | Journey asserts joystick, attack, summon, pause, and respawn entries exist in every release scene and verifies manual touch respawn before boss travel continues |
| Scene readability | Green for scope | Every stop asserts the expected Chinese scene title, objective keywords, and stale/debug visible-text bans |
| Room progression | Green for scope | The journey clears RoomA/B/C, validates room-clear flags, and verifies the boss portal opens only after all three room flags exist |
| Runtime crash hardening | Green | Hardened event owner subscription/cleanup across player, enemy, boss, HUD, music, puzzle, and flag-gate controllers so preview `loadScene` teardown no longer crashes on missing event owners |
| Respawn softlock fix | Green | `FlagGateController` now reapplies flag-controlled visibility after respawn reset, fixing the Boss portal closing permanently after death/respawn in `DungeonHub` |
| Package safety | Green | Latest WeChat verify reports main package `2,535,767 bytes`, total output `2,682,091 bytes`, still below the `4MB` hard cap and `3.7MB` warning line |

## Loop 23 Validation

| Command | Result |
|---|---|
| `npx playwright test -c ./playwright.config.mjs ./tests/first-session-journey.spec.mjs` | Pass, `1/1`; failed first on real teardown/softlock issues, then passed after source fixes |
| `node --test tests\ci-workflow.test.mjs tests\first-session-flow.test.mjs tests\dungeon-scenes.test.mjs tests\gameplay-logic.test.mjs tests\style-resource-gate.test.mjs` | Pass, `40/40` |
| `node --test tests\control-plane-ownership.test.mjs tests\cocos-library-cache.test.mjs` | Pass, `4/4` |
| `node tools\run-wechat-build.mjs` | Pass with tolerated Creator exit code `36`; output `E:\cv5\wisdom\build\wechatgame` |
| `node tools\verify-wechat-build-output.mjs` | Pass; freshness covered `2710` source inputs, main package `2,535,767`, total `2,682,091` |
| `node tools\run-automation-tests.mjs` | Pass, `198/198` |
| `node tools\run-ci-tests.mjs` | Pass, node `198/198`, WeChat verify pass, preview runtime `6/6`, first-session journey `1/1`, visual initial snapshots `9/9` |

## Loop 23 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Plato and Boyle found the full-scene journey, event teardown crash, and Boss portal respawn softlock closed for current Cocos preview evidence. | Close Loop 23 without human escalation. |
| P1 | Boyle found the journey still bypasses real player interaction for pickups, breakable walls, and boss defeat by invoking component callbacks or direct health damage. | Start Loop 24 on making the journey more player-assisted and less result-synthetic. |
| P1 | Plato found the journey proves the happy path is passable, but does not yet prove loading/fallback or scene-switch failure recovery. | Keep as next reliability debt after journey authenticity improves. |
| P2 | Boyle found the touch HUD assertions prove mobile entries exist but do not reject desktop keyboard/mouse hints. | Include negative touch-only copy assertions in Loop 24. |
| P2 | Boyle found CI can still greenlight without WeChat package evidence when no build directory exists unless release mode forces verification. | Keep as release CI policy debt; current local CI did run WeChat verification and reported package bytes. |
| P2 | Current journey evidence is Cocos preview evidence, not true WeChat DevTools simulator or real-device proof. | Keep Gate 5 incomplete until simulator/real-device evidence is captured and archived. |

## Active Loop 24

| Field | Value |
|---|---|
| Loop goal | Gate 4 hardening: make the first-session journey less synthetic and more representative of touch/player-driven play |
| Main-agent local task | Coordinate implementation, review worker changes, run targeted/CI validation, and request adversarial re-audit |
| Task agent | Hilbert |
| Audit agent | Boyle and Plato after implementation |
| Human decision threshold | Any need to change the intended player route, accept a flaky long-running physical simulation as release gate, weaken touch-only acceptance, or treat preview evidence as final WeChat/real-device evidence |

## Loop 24 Acceptance Target

| Requirement | Target |
|---|---|
| Player-assisted interactions | Pickups, portals, plates, wall breaks, and boss damage should assert the player/echo/action is near and active before triggering results |
| Touch-only copy | Runtime HUD and visible labels must not expose desktop keyboard/mouse instructions in the first-session journey |
| Boss evidence | Boss clear should involve shield/window feedback and player attack or attack-path evidence rather than only direct health mutation |
| Stability | The journey remains deterministic enough for `test:ci`; no broad flaky physics waits |
| Residual truthfulness | Any still-synthetic helper must be named/described honestly so the evidence cannot be mistaken for true-device E2E |

## Loop 24 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Player-assisted journey | Yellow-green | Replaced the most direct result helpers with `playerAssistedPickupContact()`, `breakTargetWithBombEcho()`, `playerAssistedBossDefeat()`, and `triggerPlayerAttackContact()` so the journey now moves the player, presses touch buttons, places echoes, checks distances, and then uses controlled contacts for deterministic completion |
| Portal/plate reachability | Green for scope | `triggerPortalContact()` and `triggerPlateContact()` now accept `maxDistance` and return measured distance, preventing far-away contact helpers from silently passing |
| Bomb wall evidence | Green for scope | Walls now require touch-selecting the bomb echo, touch-placing it near the target, verifying explosion-range distance, waiting for fuse frames, and only then asserting `BreakableTarget` state |
| Boss evidence | Yellow | Boss clear now requires shield break, damage-window feedback, touch attack activity, proximity, and at least one accepted attack. A controlled `HealthComponent.applyDamage()` fallback remains when the attack hitbox callback does not route damage through the runtime collider path |
| Touch-only HUD copy | Green | `GameHud` now renders only `mobileHintText` in the visible controls label, and the journey rejects visible desktop keyboard/mouse hints |
| Package safety | Green | Latest WeChat verify reports main package `2,535,738 bytes`, total output `2,682,062 bytes`, still below the `4MB` hard cap and `3.7MB` warning line |

## Loop 24 Validation

| Command | Result |
|---|---|
| `node --check tests\first-session-journey.spec.mjs` | Pass |
| `node --check tests\helpers\playwright-cocos-helpers.mjs` | Pass |
| `npx playwright test -c ./playwright.config.mjs ./tests/first-session-journey.spec.mjs` | Pass, `1/1` |
| `node --test tests\ci-workflow.test.mjs tests\first-session-flow.test.mjs tests\style-resource-gate.test.mjs` | Pass, `22/22` |
| `node tools\run-wechat-build.mjs` | Pass with tolerated Creator exit code `36`; output `E:\cv5\wisdom\build\wechatgame` |
| `node tools\verify-wechat-build-output.mjs` | Pass; freshness covered `2710` source inputs, main package `2,535,738`, total `2,682,062` |
| `node tools\run-automation-tests.mjs` | Pass, `198/198` |
| `node tools\run-ci-tests.mjs` | Pass, node `198/198`, WeChat verify pass, preview runtime `6/6`, first-session journey `1/1`, visual initial snapshots `9/9` |
| `npx tsc --noEmit --pretty false --skipLibCheck` | Not applicable; this repository uses Creator's bundled TypeScript via `run-automation-tests`, while raw `npx tsc` resolves to npm's placeholder package |

## Loop 24 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Plato and Boyle found no new release-blocking regression. | Continue without human escalation. |
| P1 | Boyle found pickup progression is still stage-triggered because `playerAssistedPickupContact()` moves near the pickup but still directly calls `pickup.onBeginContact(...)`. | Start Loop 25 by experimenting with real overlap/physics stepping for pickup collection before falling back to controlled contact. |
| P1 | Boyle found Boss defeat can still be faked because `triggerPlayerAttackContact()` calls `attackHitbox.onBeginContact(...)` and then can apply direct health damage if the damage window is open. | Start Loop 25 on removing or sharply constraining the fallback; if physics cannot be made stable, document the exact technical boundary. |
| P1 | Plato kept the loading/fallback/scene-switch-failure risk from Loop 23 as a future reliability loop. | Defer until interaction-authenticity P1 is resolved or explicitly bounded. |
| P2 | Preview evidence still is not WeChat DevTools simulator or real-device proof. | Keep Gate 5 incomplete until simulator/real-device evidence is captured and archived. |

## Active Loop 25

| Field | Value |
|---|---|
| Loop goal | Gate 4 hardening: remove or bound the remaining direct pickup and boss damage shortcuts in the first-session journey |
| Main-agent local task | Experiment against Cocos preview to see whether real collider overlap/physics stepping can collect pickups and route boss attack damage without direct component callbacks; then implement the smallest stable tightening |
| Task agent | Pending |
| Audit agent | Boyle and Plato after implementation |
| Human decision threshold | If stable physics-driven evidence would require a large runtime refactor, changing combat/collection rules, or accepting a flaky release gate |

## Loop 25 Acceptance Target

| Requirement | Target |
|---|---|
| Pickup evidence | Prefer real player overlap plus frame stepping; if not stable, helper name and assertions must make the synthetic boundary explicit |
| Boss evidence | Prefer touch attack plus attack hitbox collision routing without direct `applyDamage`; if fallback remains, it must be counted and constrained so it cannot hide a fully broken attack path |
| No route change | Keep `StartCamp -> FieldWest -> FieldRuins -> DungeonHub -> RoomA/B/C -> BossArena -> StartCamp` unchanged |
| CI stability | First-session journey remains deterministic and under the existing timeout |
| Documentation | Memory records whether real physics was adopted or why it was bounded |

## Loop 25 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Pickup physics experiment | Bounded | `collectPickupWithBoundedPreviewAssist()` first moves the player onto the pickup and steps 30 frames. Current Cocos preview does not reliably dispatch `BEGIN_CONTACT`, so the helper keeps a bounded synthetic contact only after recording `physicsAttempt.collected === false` |
| Pickup truthfulness | Green for evidence semantics | Added `collectionMode`, `syntheticContactApplied`, `syntheticContactDistance`, `physicsAttempt`, and `previewLimitation`, plus `expectBoundedPickupEvidence()` so the journey cannot silently present bounded preview assist as true physics overlap |
| Boss attack fallback | Green for scoped risk | Removed the direct `HealthComponent.applyDamage(1)` fallback from the Boss leg. The test now requires `fallbackApplied` to be `0` and at least one accepted touch-attack hitbox damage event |
| Boss hitbox boundary | Bounded | If immediate touch attack does not produce health loss, the helper may still call `AttackHitbox.onBeginContact(...)`, but only while the touch attack is active and the player is within `96px`; this is disclosed as bounded preview synthetic hitbox contact rather than direct health mutation |
| Package safety | Green | No runtime package source changed after the latest WeChat build; verify still reports main package `2,535,738 bytes`, total output `2,682,062 bytes` |

## Loop 25 Validation

| Command | Result |
|---|---|
| `node --check tests\first-session-journey.spec.mjs` | Pass |
| `npx playwright test -c ./playwright.config.mjs ./tests/first-session-journey.spec.mjs` | Pass, `1/1` |
| `node --test tests\ci-workflow.test.mjs` | Pass, `5/5` |
| `node tools\run-automation-tests.mjs` | Pass, `198/198` |
| `node tools\verify-wechat-build-output.mjs` | Pass; freshness covered `2710` source inputs, main package `2,535,738`, total `2,682,062` |
| `node tools\run-ci-tests.mjs` | Pass, node `198/198`, WeChat verify pass, preview runtime `6/6`, first-session journey `1/1`, visual initial snapshots `9/9` |

## Loop 25 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato found no new release-blocking regression. | Continue without human escalation. |
| P1 | None from the previous interaction-authenticity thread. Boyle downgraded pickup and boss concerns from P1 to P2 after the bounded evidence and removal of direct boss health fallback. | Close Loop 25 as scoped green/yellow-green. |
| P1 | Plato still finds loading/fallback/scene-switch failure coverage missing. | Start Loop 26 on scene loading and failure recovery evidence. |
| P2 | Pickup leg is still bounded preview assist, not real collision proof. | Keep as explicit preview-evidence debt; do not call this true-device physics proof. |
| P2 | Boss leg still may synthesize `AttackHitbox.onBeginContact(...)` when immediate touch attack does not land. | Keep as preview-evidence debt; worst direct `HealthComponent.applyDamage` shortcut is closed. |
| P2 | Preview/runtime evidence still is not WeChat DevTools simulator or real-device proof. | Keep Gate 5 incomplete until simulator/real-device evidence is captured and archived. |

## Active Loop 26

| Field | Value |
|---|---|
| Loop goal | Gate 4 reliability: add loading/fallback/scene-switch failure evidence so players do not mistake slow or failed loads for a hard lock |
| Main-agent local task | Inspect `SceneLoader`, current HUD/loading surfaces, and tests; implement the smallest runtime/test gate for scene switch in-progress and failure recovery |
| Task agent | Pending |
| Audit agent | Boyle and Plato after implementation |
| Human decision threshold | If we need a new loading UI design direction, a product-level retry/abort policy, or a release workflow change that makes preview/WeChat simulator mandatory |

## Loop 26 Acceptance Target

| Requirement | Target |
|---|---|
| Loading state | Scene switching exposes a user-visible loading/in-progress state or equivalent runtime state before completion |
| Failure state | A simulated `loadScene` failure must surface a fallback/retry message or recoverable state rather than silent hang |
| No route regression | The first-session journey and preview smoke still pass |
| Package safety | WeChat verify remains below `4MB` and fresh for runtime source changes |
| Evidence boundary | If only preview-level failure injection is possible, document that it is not WeChat device evidence |

## Loop 26 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Observable switch state | Green | `SceneLoader` now exposes `idle/switching/failed` state, emits `scene-switch-state-changed`, preserves state across scene reload, and has retry/clear helpers |
| Visible player fallback | Green for preview scope | `GameHud` binds `SceneLoader` and replaces the objective line with visible `提示  正在前往...` or `提示  加载...失败，可重试...` copy |
| Preview failure injection | Green | `tests/scene-loader-failure.spec.mjs` simulates immediate `loadScene` failure and pending load, then asserts both runtime state and visible HUD copy |
| Journey regression guard | Green | `tests/first-session-journey.spec.mjs` now asserts portal transitions leave the switch state `idle` for the expected target scene |
| CI wiring | Green | `scene-loader-failure.spec.mjs` is part of preview smoke through `tools/test-runner-helpers.mjs` and `tools/run-ci-tests.mjs` |
| Package safety | Green | Latest WeChat verify reports main package `2,539,259 bytes`, total output `2,685,583 bytes`, below the `4MB` hard cap and `3.7MB` warning line |

## Loop 26 Validation

| Command | Result |
|---|---|
| `npx playwright test -c ./playwright.config.mjs ./tests/scene-loader-failure.spec.mjs ./tests/first-session-journey.spec.mjs` | Pass, `3/3` after refreshing Cocos preview build output |
| `node tools\verify-wechat-build-output.mjs` | Pass; freshness covered `2710` source inputs, main package `2,539,259`, total `2,685,583` |
| `node tools\run-automation-tests.mjs` | Pass, `198/198` |
| `node tools\run-ci-tests.mjs` | Pass, node `198/198`, WeChat verify pass, preview runtime `8/8`, first-session journey `1/1`, visual initial snapshots `9/9` |

## Loop 26 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato found no release-blocking regression in the visible fallback, CI wiring, or HUD ownership constraints. | Continue without human escalation. |
| P1 | Plato found accepted-but-stalled scene switches are still not covered: if `director.loadScene()` accepts but never calls back, the HUD can remain in `switching` forever with no timeout/retry transition. | Start Loop 27 on a bounded scene-switch watchdog and visible timeout fallback. |
| P1 | Plato found the new failure evidence is still preview-injected, not real WeChat degraded-load evidence. | Keep Gate 5 incomplete until WeChat DevTools/true-device evidence is collected. |
| P2 | Boyle found `run-ci-tests` can still skip WeChat verification if no build output exists and release mode is not forcing it, so a green CI log must show the verify step ran to count as package evidence. | Keep as release CI policy debt; current local Loop 26 CI did run WeChat verification and recorded package bytes. |

## Active Loop 27

| Field | Value |
|---|---|
| Loop goal | Gate 4 reliability: convert accepted-but-stalled scene switches into a visible retryable timeout instead of an endless loading state |
| Main-agent local task | Coordinate a bounded watchdog implementation, run targeted/CI validation, request adversarial re-audit, and decide whether the remaining WeChat-native evidence gap needs human intervention |
| Task agent | Darwin |
| Audit agent | Boyle and Plato after implementation |
| Human decision threshold | Any change that alters the intended route, adds a new product-level loading screen design, makes preview/WeChat simulator mandatory for all local developers, or changes network/server deployment policy |

## Loop 27 Acceptance Target

| Requirement | Target |
|---|---|
| Watchdog | A `loadScene` call that is accepted but does not complete within a bounded time transitions from `switching` to `failed` |
| Visible fallback | The HUD shows retryable timeout copy, not only a generic loading line |
| Retry path | `retryLastFailedSwitch()` still targets the original scene after timeout |
| No false timeout | A normally completing scene switch returns to `idle` without being overwritten by a stale watchdog |
| CI stability | Targeted Playwright, automation, and full CI remain green; WeChat package remains below `4MB` |

## Loop 27 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Watchdog | Green for preview/runtime scope | `SceneLoader` now has `switchTimeoutSeconds`, per-request ids, stale callback/watchdog protection, and converts accepted-but-stalled switches to `failed` |
| Visible timeout fallback | Green | Timeout failures reuse the existing `GameHud` scene-switch failed notice, so players see a retryable fallback instead of endless loading |
| Retry preservation | Green | The timeout test confirms `retryLastFailedSwitch()` re-targets the original `FieldWest` switch |
| False-timeout guard | Green for current deterministic race | The normal pending-completion test uses a tiny timeout and confirms a stale watchdog cannot overwrite `idle` after the callback succeeds |
| Package safety | Green | Latest WeChat verify reports main package `2,540,452 bytes`, total output `2,686,776 bytes`, below the `4MB` hard cap and `3.7MB` warning line |

## Loop 27 Validation

| Command | Result |
|---|---|
| `npm run test:typecheck` | Pass |
| `npx playwright test -c ./playwright.config.mjs ./tests/scene-loader-failure.spec.mjs ./tests/first-session-journey.spec.mjs` | Pass, `4/4` |
| `node tools\run-wechat-build.mjs` | Pass with tolerated Creator exit code `36`; output `E:\cv5\wisdom\build\wechatgame` |
| `node tools\verify-wechat-build-output.mjs` | Pass; freshness covered `2710` source inputs, main package `2,540,452`, total `2,686,776` |
| `node tools\run-automation-tests.mjs` | Pass, `198/198` |
| `node tools\run-ci-tests.mjs` | Pass, node `198/198`, WeChat verify pass, preview runtime `9/9`, first-session journey `1/1`, visual initial snapshots `9/9` |

## Loop 27 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato found no release-blocking regression. | Continue without human escalation. |
| P1 | None. Plato marked the previous accepted-but-stalled-switch P1 closed for preview/runtime scope. | Close Loop 27 as green for its bounded goal. |
| P2 | Boyle and Plato both noted the fixed `12s` timeout can still false-fail on unusually slow real devices, so it may need tuning after true-device evidence. | Keep as Gate 5 tuning debt, not a Loop 27 blocker. |
| P2 | Boyle reiterated that CI validates preview timeout behavior and package bytes, not native WeChat degraded-load runtime behavior. | Do not overclaim; keep WeChat DevTools/true-device degraded-load proof under Gate 5. |

## Active Loop 28

| Field | Value |
|---|---|
| Loop goal | Gate 2: reduce the biggest remaining cute-style miss, board density/control-panel composition in `DungeonHub`, `DungeonRoomB/C`, and `BossArena` |
| Main-agent local task | Coordinate a bounded visual cleanup with no new bitmap assets, verify route/tests/package, then request visual/engineering adversarial review |
| Task agent | Pascal |
| Audit agent | Boyle and Plato after implementation |
| Human decision threshold | Any proposal to add large bitmap packs, approve generated art as final, change the cute north star, remove essential player guidance, or weaken the WeChat `4MB` gate |

## Loop 28 Acceptance Target

| Requirement | Target |
|---|---|
| Board density | Reduce simultaneous world-space labels/cards in the target scenes without removing core progression feedback |
| Cute direction | Prefer warm rounded procedural shapes, icons, spacing, and short Chinese cues over large debug panels or English status boards |
| Route safety | Full first-session journey still passes through all release scenes and returns to camp |
| Visual evidence | Refresh or validate initial visual snapshots after the cleanup |
| Package safety | No new large assets; WeChat verify remains below `4MB` |

## Loop 28 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Board density | Green for scoped pass | `DungeonHub` room statuses were compressed to small badge marks, `DungeonRoomB/C` labels/cards were reduced to short cues, and `BossArena` status copy was shortened to `破盾 / 快打 / 回营地` |
| Cute direction | Green/yellow-green | Target scenes now lean warmer, rounder, and less like debug control boards; no new large bitmap assets were added |
| Visual evidence chain | Green after blocker fix | Source scenes, release library cache, preview runtime labels, and refreshed initial screenshots now agree for `DungeonHub` and `BossArena` |
| Anti-stale guard | Green | `tests/visual-scene-initial.spec.mjs` now reads runtime labels before screenshots and rejects legacy English HUD/debug copy for first-release scenes |
| Cache evidence | Green for preview-available scope | `tests/cocos-library-cache.test.mjs` now requires release scene cache files to exist when Cocos preview is reachable, then compares cache JSON to source scene JSON |
| Package safety | Green | Latest full CI reports WeChat main package `2,540,452 bytes`, total output `2,684,676 bytes`, below the `4MB` hard cap and `3.7MB` warning line |

## Loop 28 Validation

| Command | Result |
|---|---|
| `node --test tests\first-session-flow.test.mjs tests\dungeon-scenes.test.mjs tests\content-scenes.test.mjs tests\style-resource-gate.test.mjs` | Pass, `26/26` |
| `npx playwright test -c ./playwright.config.mjs ./tests/visual-scene-initial.spec.mjs --update-snapshots=all` | Pass, regenerated all initial visual baselines |
| `node --test tests\cocos-library-cache.test.mjs` | Pass, `1/1` |
| `npx playwright test -c ./playwright.config.mjs ./tests/visual-scene-initial.spec.mjs` | Pass, `9/9` |
| `node tools\run-automation-tests.mjs` | Pass, `198/198` |
| `node tools\run-ci-tests.mjs` | Pass, node `198/198`, WeChat verify pass, preview runtime `9/9`, first-session journey `1/1`, visual initial snapshots `9/9` |

## Loop 28 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato found no release-blocking regression after the evidence-chain fix. | Continue without human escalation. |
| P1 | None remaining. The earlier stale visual baseline / old English HUD evidence drift was closed by forced baseline refresh, runtime label guard, and cache-existence/equality guard. | Close Loop 28 as green for its scoped Gate 2 cleanup. |
| P2 | Legacy-label guard is exact-string based, so new variants of old dense debug copy could still slip through. | Keep as test-hardening debt; not a blocker because current first-release labels and screenshots are aligned. |
| P2 | Cache equality plus runtime labels improve source-to-preview evidence but still are not native WeChat device visual proof. | Keep Gate 5 simulator/real-device evidence as separate release debt. |
| P3 | `MechanicsLab` remains intentionally exempt and still contains English debug labels. | Accept because it is internal/test-only and not in the first-release route. |

## Active Loop 29

| Field | Value |
|---|---|
| Loop goal | Fix visual evidence framing: stop double-cropping the top of screenshots after hiding the Cocos preview toolbar |
| Main-agent local task | Coordinate a helper-level screenshot capture fix, refresh affected baselines, verify visual tests and full CI, then request adversarial review |
| Task agent | Anscombe |
| Audit agent | Boyle and Plato after implementation |
| Human decision threshold | Any proposal to change product HUD layout, remove top HUD content, weaken screenshot coverage, or drop visual baselines instead of fixing capture |

## Loop 29 Acceptance Target

| Requirement | Target |
|---|---|
| Screenshot framing | Initial/HUD/state visual baselines show the full player-facing game viewport, including top HUD/title, without Cocos toolbar noise |
| Single helper | Visual specs use a shared clean screenshot helper/options instead of hardcoded per-file `TOOLBAR_HEIGHT = 37` clips |
| No product change | Runtime scenes, HUD layout, and gameplay logic are unchanged |
| Visual evidence | Affected snapshots are regenerated from current preview output |
| CI stability | Visual tests and full CI remain green |

## Loop 29 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Screenshot framing | Green | `getCleanScreenshotOptions()` defaults to full-viewport capture after toolbar/debug hiding, so top HUD/title pixels are preserved |
| Single helper | Green | `visual-scene-initial`, `visual-hud-layout`, `visual-gate-states`, `visual-boss-states`, `visual-echo-buttons`, and `demo-playthrough-audit` now use shared clean screenshot options |
| Old crop removal | Green | `rg "TOOLBAR_HEIGHT|y:\\s*TOOLBAR_HEIGHT|height:\\s*.*TOOLBAR_HEIGHT" tests -n` has no matches |
| Visual evidence | Green | Refreshed baselines show complete top HUD/title; `DungeonHub-initial.png` and `StartCamp-hud-mobile.png` were manually spot-checked |
| Product logic | Green | No intended runtime gameplay/HUD layout changes; change is test capture/evidence only |

## Loop 29 Validation

| Command | Result |
|---|---|
| `npx playwright test -c ./playwright.config.mjs ./tests/visual-scene-initial.spec.mjs ./tests/visual-hud-layout.spec.mjs ./tests/visual-gate-states.spec.mjs ./tests/visual-boss-states.spec.mjs ./tests/visual-echo-buttons.spec.mjs` | Pass, `29/29` |
| `npx playwright test -c ./playwright.config.mjs ./tests/demo-playthrough-audit.spec.mjs` | Pass, `23/23`; audit still reports non-blocking `FieldWest` attack CRITICAL and `MechanicsLab` pause cosmetic |
| `node tools\run-ci-tests.mjs` | Pass, node `198/198`, WeChat verify pass, main package `2,540,452`, total output `2,684,676`, preview runtime `9/9`, first-session journey `1/1`, visual initial snapshots `9/9` |

## Loop 29 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. The fixed helper and regenerated baselines close the top-crop evidence bug. | Close Loop 29 as green. |
| P2 | Runtime legacy-label guard is still exact-string based. | Keep as future test-hardening debt; current release-scene labels are guarded and aligned. |
| P2 | Snapshot evidence still depends on honest stored baselines and preview/runtime, not native WeChat device screenshots. | Keep Gate 5 simulator/real-device evidence as release debt. |

## Active Loop 30

| Field | Value |
|---|---|
| Loop goal | Gate 4 input reliability: investigate the `FieldWest` demo audit CRITICAL where touch attack sometimes does not enter attacking state |
| Main-agent local task | Determine whether this is a real player-facing input/state bug, a test sequencing issue after joystick movement, or an audit false positive; fix the smallest safe layer |
| Task agent | Pending |
| Audit agent | Boyle and Plato after implementation |
| Human decision threshold | Any change that alters combat feel, attack cooldown/duration, enemy placement, or first-session route design |

## Loop 30 Acceptance Target

| Requirement | Target |
|---|---|
| Reproduction | Isolate why `FieldWest` can log `Attack button pressed but player is not in attacking state` in demo audit |
| Product safety | If real, touch attack reliably enters/records attack state in `FieldWest` without changing combat tuning globally |
| Audit correctness | If false positive, adjust the audit to wait/read the correct attack signal without hiding real failures |
| Regression coverage | Add or update a targeted preview/runtime test for the chosen fix |
| CI stability | Demo audit, preview smoke, journey, and full CI remain green |

## Loop 30 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Reproduction | False-positive classified | One-off preview run across first-release scenes found `TouchAttack` wired to `Player` and `isAttacking=true` immediately and after two stepped frames |
| Product safety | Green | No runtime combat code, attack duration, enemy placement, or route design was changed |
| Audit correctness | Green | `pressTouchButton()` now returns the immediate post-touch `isAttacking` value from the same `page.evaluate`; demo audit uses that before a 1-frame fallback |
| FieldWest audit | Green | `FieldWest` now reports `DEMO READY (0B / 0C / 0X)` instead of a transient attack CRITICAL |
| Remaining non-release signal | Accepted | `MechanicsLab` still logs a pause cosmetic, but it is internal/test-only and not part of first-release route |

## Loop 30 Validation

| Command | Result |
|---|---|
| One-off preview runtime attack probe | Pass; all first-release scenes had `TouchAttack` player binding and immediate/two-frame attacking state |
| `npx playwright test -c ./playwright.config.mjs ./tests/demo-playthrough-audit.spec.mjs` | Pass, `23/23`; `FieldWest` now `DEMO READY (0B / 0C / 0X)` |
| `node tools\run-ci-tests.mjs` | Pass, node `198/198`, WeChat verify pass, main package `2,540,452`, total output `2,684,676`, preview runtime `9/9`, first-session journey `1/1`, visual initial snapshots `9/9` |

## Loop 30 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato found no release-blocking issue. | Continue without human escalation. |
| P1 | None. Both auditors agreed this reduces a flaky audit timing hole and does not mask a real missing-button failure. | Close Loop 30 as green. |
| P2 | `isAttacking` proves attack state started, not every downstream combat side effect. | Keep as future audit-hardening debt; current first-session combat coverage remains covered by journey/preview tests. |
| P2 | If the player was already attacking before a press, an immediate `isAttacking` read could over-credit the new press. | Low risk in current demo sequence; future helper can return `attackBefore/attackAfter` or command-specific evidence. |

## Active Loop 31

| Field | Value |
|---|---|
| Loop goal | Gate 2 visual style: improve first-release large-area outdoor/ruins surfaces toward bright warm toy-like readability |
| Main-agent local task | Identify the highest-leverage procedural scene-generation changes for `StartCamp`, `FieldWest`, and `FieldRuins` without adding large assets |
| Task agent | Pending |
| Audit agent | Boyle and Plato after implementation |
| Human decision threshold | Any proposal to add large bitmap packs, approve AI-generated large-area tiles as final, or change the cute north star |

## Loop 31 Acceptance Target

| Requirement | Target |
|---|---|
| Large-area readability | Outdoor/ruins floor and path areas look less noisy/dungeon-like and more warm, soft, and readable |
| Style constraints | No black/dirty green/realistic crack/gothic/metal-heavy style anchors; no new large bitmap assets |
| Route safety | Portals, pickups, gates, and first-session journey remain intact |
| Visual evidence | Refresh relevant visual baselines and inspect first-release screenshots |
| Package safety | WeChat verify remains below `4MB` |

## Loop 31 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Large-area readability | Green for scoped pass | `StartCamp`, `FieldWest`, and `FieldRuins` now use lighter warm-green / warm-beige panel systems with lower contrast and softer path blocks |
| Toy-like direction | Green/yellow-green | Added rounded glow/decor panels in the generator, moving the outdoor surfaces toward a calm toy-block rhythm rather than noisy dungeon tiles |
| Style constraints | Green | No large bitmap assets or AI large-area final tiles were introduced |
| Route safety | Green | Portal, pickup, gate, and first-session route tests still pass |
| Package safety | Green | Latest full CI reports WeChat main package `2,541,291 bytes`, total output `2,687,200 bytes`, below the `4MB` hard cap and `3.7MB` warning line |

## Loop 31 Validation

| Command | Result |
|---|---|
| `node --test tests\content-scenes.test.mjs tests\style-resource-gate.test.mjs` | Pass, `21/21` |
| `npx playwright test -c ./playwright.config.mjs ./tests/visual-scene-initial.spec.mjs` | Pass, `9/9` |
| `node tools\run-ci-tests.mjs` | Pass, node `198/198`, WeChat verify pass, main package `2,541,291`, total output `2,687,200`, preview runtime `9/9`, first-session journey `1/1`, visual initial snapshots `9/9` |

## Loop 31 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato found no engineering or route blocker. | Continue without emergency rollback. |
| P1 | None. Both auditors judged the change substantive, not just a wash/desaturation pass. | Close Loop 31 as green/yellow-green for scoped style cleanup. |
| P2 | Some cracked/ruins vocabulary remains for puzzle legibility, so this is a warm cute reinterpretation, not a full material-language replacement. | Keep as future art/material polish debt. |
| P2 | Cute-style proof still depends on screenshot baselines and human aesthetic judgment. | Keep manual scorecard/native visual evidence as Gate 5 / polish debt. |

## Next Loop Candidate 32

| Field | Value |
|---|---|
| Candidate goal | Gate 5 native evidence: run or prepare WeChat DevTools simulator / true-device proof for first scene, respawn, Boss clear, and return-to-camp |
| Why it may need human | WeChat DevTools may require a logged-in desktop session, QR confirmation, or a real device; this crosses the current no-human-intervention threshold |
| Alternative no-human loop | Continue Gate 2 material polish on remaining cracked/ruins vocabulary and exact-string legacy-label guard hardening |

## Active Loop 32

| Field | Value |
|---|---|
| Loop goal | Gate 2 / Gate 4 hardening: prevent mixed English/debug visible copy variants from slipping through, then fix the first-session Boss journey blocker found by full CI |
| Main-agent local task | Add source/runtime visible-label guards, diagnose the first-session Boss failure, and keep CI/WeChat package evidence green |
| Task agent | Main agent executed directly because the first red CI signal was on the critical path |
| Audit agent | Boyle and Plato |
| Human decision threshold | Any change that alters the cute north star, increases package strategy risk, or changes combat tuning/feel rather than harness correctness/runtime robustness |

## Loop 32 Acceptance Target

| Requirement | Target |
|---|---|
| Copy/style guard | First-release scenes reject visible English/debug label variants, not only exact legacy strings |
| Runtime evidence | Initial visual snapshot tests read final Canvas labels and fail if mixed English/debug copy appears |
| Boss journey | Touch-first full journey reaches Boss, handles shield windows, defeats Boss, and returns to camp |
| Runtime stability | Scene switching must not surface a user-visible error overlay from stale `SceneLoader` callbacks |
| Package safety | WeChat build stays fresh and under the `4MB` hard cap |

## Loop 32 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Source copy guard | Green | `tests/style-resource-gate.test.mjs` now parses first-pass scene `cc.Label._string` values and rejects `/[A-Za-z]{2,}/` English/debug copy |
| Runtime copy guard | Green | `tests/visual-scene-initial.spec.mjs` now rejects runtime Canvas label strings containing English word labels for first-release scenes; `MechanicsLab` remains exempt as an internal test scene |
| Scene switch lifecycle | Green | `SceneLoader` now falls back to shared switch state when old/destroyed instance callbacks read `switchState`, avoiding the observed `Cannot read properties of null (reading 'status')` overlay |
| Boss shield runtime | Green | `BossShieldPhaseController` now resolves `shieldTarget` whether serialized as a `BreakableTarget` or a `Node` containing one, and uses that for event subscription, broken-state checks, resets, and damage-window checks |
| Boss journey harness | Green | `first-session-journey` waits for player attack idle and re-breaks the shield when the remaining vulnerable window is too short, matching a realistic multi-window Boss fight instead of machine-tapping into an expiring window |

## Loop 32 Validation

| Command | Result |
|---|---|
| `node --test tests\style-resource-gate.test.mjs` | Pass, `17/17` |
| `npx playwright test -c ./playwright.config.mjs ./tests/visual-scene-initial.spec.mjs` | Pass, `9/9` |
| `npx playwright test -c ./playwright.config.mjs ./tests/scene-loader-failure.spec.mjs` | Pass, `3/3` |
| `npx playwright test -c ./playwright.config.mjs ./tests/first-session-journey.spec.mjs` | Pass, `1/1` |
| `node tools\run-wechat-build.mjs` | Pass with tolerated Cocos Creator exit code `36`; build output refreshed |
| `node tools\run-ci-tests.mjs` | Pass, node `199/199`, WeChat verify pass, main package `2,541,486`, total output `2,687,395`, preview runtime `9/9`, first-session journey `1/1`, visual initial snapshots `9/9` |

## Loop 32 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Runtime lifecycle, Boss shield handling, and visible-copy guards were accepted as non-blocking. | Close Loop 32 as green. |
| P2 | Boss journey now re-breaks the shield when the damage window is too short, so it proves route robustness but not final human combat timing comfort. | Keep a future manual/mobile timing scorecard or dedicated combat-feel test before release. |
| P2 | `/[A-Za-z]{2,}/` is intentionally strict and may need a whitelist if future first-release copy needs legal brand terms or abbreviations. | Keep strict for current cute Chinese-first MVP; revisit only with a concrete allowed-copy requirement. |
| P2 | Runtime visible-copy guard only scans `Label.string` under Canvas and not hypothetical non-Label text renderers. | Accept for current Cocos UI path; control-plane ownership and visual snapshots still cover the known HUD path. |

## Next Loop Candidate 33

| Field | Value |
|---|---|
| Candidate goal | Gate 2 / Gate 4 product evidence: add a lightweight combat-feel/timing audit so the Boss damage-window proof is not only harness-assisted |
| Why it matters | Loop 32 made first-session journey robust, but adversarial audit correctly noted it does not prove a human touch player has enough time per Boss window |
| No-human path | Add non-tuning evidence that records Boss window duration, accepted hits per window, and touch attack cadence assumptions without changing combat values |
| Human threshold | Any proposal to change `vulnerableSeconds`, Boss HP, damage, attack duration, or other combat-feel tuning |

## Active Loop 33

| Field | Value |
|---|---|
| Loop goal | Gate 4 product evidence: add a non-tuning Boss touch timing budget and stabilize Boss journey attack evidence |
| Main-agent local task | Convert the Loop 32 P2 combat-feel concern into a CI-readable evidence gate without changing combat values |
| Task agent | Main agent executed directly; full CI surfaced a first-session timing issue on the critical path |
| Audit agent | Boyle and Plato |
| Human decision threshold | Any change to Boss HP, `vulnerableSeconds`, attack duration, damage, invulnerability, or intended combat feel |

## Loop 33 Acceptance Target

| Requirement | Target |
|---|---|
| No tuning | Runtime combat constants remain unchanged |
| Timing evidence | CI reads actual `BossArena.scene` timing constants and checks touch-first margin |
| Journey stability | Boss defeat evidence should not depend on Playwright delays between separate browser evaluations |
| Package safety | WeChat build remains fresh and under the `4MB` hard cap |

## Loop 33 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Timing budget helper | Green | `computeTouchDamageWindowBudget()` calculates usable Boss window, conservative touch cadence, attacks per window, and windows to defeat |
| Scene-backed gate | Green | `boss-logic.test.mjs` reads actual `BossArena.scene` values: boss HP `8`, vulnerable window `3.2s`, player attack `0.18s`, boss invulnerability `0.12s` |
| Product constraint | Green | The test asserts at least four deliberate touch attacks per window and defeat within two shield windows under `0.55s` cadence plus `0.35s` recognition buffer |
| Journey attack evidence | Green | Boss touch attack assist now presses `TouchAttack` and performs immediate/synthetic hitbox evidence in one `page.evaluate`, avoiding CI delay between the touch command and bounded contact |
| Runtime tuning | Green | No runtime combat values were changed |

## Loop 33 Validation

| Command | Result |
|---|---|
| `node --test tests\boss-logic.test.mjs` | Pass, `17/17` |
| `npx playwright test -c ./playwright.config.mjs ./tests/first-session-journey.spec.mjs` | Pass, `1/1` |
| `node tools\run-ci-tests.mjs` | Pass, node `200/200`, WeChat verify pass, main package `2,541,486`, total output `2,687,395`, preview runtime `9/9`, first-session journey `1/1`, visual initial snapshots `9/9` |

## Loop 33 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Both auditors accepted the timing-budget gate and same-context attack assist as harness hardening without runtime tuning. | Close Loop 33 as green. |
| P2 | Same-context attack assist can still mask some touch-routing or stuck-touch lifecycle regressions. | Accept as journey flake hardening; preview smoke still separately checks real `TouchAttack` starts attack state. |
| P2 | The timing budget uses explicit assumptions (`0.55s` touch cadence, `0.35s` recognition buffer), which are useful but not a substitute for true human/device feel testing. | Keep true-device/manual combat feel as Gate 5 debt. |

## Next Loop Candidate 34

| Field | Value |
|---|---|
| Candidate goal | Gate 0 / Gate 1 release composition: prove `MechanicsLab` stays internal/test-only and cannot drift into the first-release WeChat package |
| Why it matters | The plan explicitly locks `MechanicsLab` out of first release, but it still contains English/debug labels and should not be package/user-facing evidence |
| No-human path | Add or tighten build/config tests that first-release scene lists, package manifests, and visual guard exemptions cannot accidentally include `MechanicsLab` as a release scene |
| Human threshold | Any proposal to remove the scene from the editor project entirely or change the first-release scene set |

## Active Loop 34

| Field | Value |
|---|---|
| Loop goal | Gate 0 / Gate 1 release composition: make `MechanicsLab` exclusion explicit in config and built payload tests |
| Main-agent local task | Add readable release-composition gates without deleting or changing the internal test scene |
| Task agent | Main agent executed directly; change was small and on the CI critical path |
| Audit agent | Boyle and Plato |
| Human decision threshold | Any proposal to remove `MechanicsLab` from the editor project or change the first-release scene set |

## Loop 34 Acceptance Target

| Requirement | Target |
|---|---|
| Config gate | `createWechatBuildConfig()` must not include `MechanicsLab.scene` in the WeChat first-release scene list |
| Start scene safety | WeChat `startScene` must remain the first release scene, not an internal test scene |
| Built payload gate | Built first-release asset JSON must not include `MechanicsLab` or its internal/debug markers |
| Test-scene safety | Existing MechanicsLab tests remain untouched and green |

## Loop 34 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Build config | Green | `tests/wechat-build-config.test.mjs` now has an explicit `MechanicsLab` exclusion test |
| Build output | Green | `tests/wechat-build-output.test.mjs` now scans built asset JSON for `MechanicsLab` and its internal English/debug markers |
| Package safety | Green | Full CI still reports WeChat main package `2,541,486 bytes`, total output `2,687,395 bytes` |

## Loop 34 Validation

| Command | Result |
|---|---|
| `node --test tests\wechat-build-config.test.mjs` | Pass, `5/5` |
| `node --test tests\wechat-build-output.test.mjs` | Pass, `14/14` |
| `node tools\run-ci-tests.mjs` | Pass, node `202/202`, WeChat verify pass, main package `2,541,486`, total output `2,687,395`, preview runtime `9/9`, first-session journey `1/1`, visual initial snapshots `9/9` |

## Loop 34 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Both auditors found the config and output gates aligned with the first-release scene set. | Close Loop 34 as green. |
| P2 | Build-output guard scans JSON payloads and would not catch a future leak through a non-JSON artifact or packaging format change. | Accept for current Cocos scene payloads; revisit if packaging changes. |
| P2 | If release scene order intentionally changes, the explicit scene-list tests must be updated. | Expected behavior; scene-set changes are a human decision threshold. |

## Next Loop Candidate 35

| Field | Value |
|---|---|
| Candidate goal | Gate 1 package evidence: make the size report and package breakdown easier to audit from CI output and docs |
| Why it matters | The hard cap is green, but release review still benefits from an explicit main/subpackage/remote breakdown tied to the same commit |
| No-human path | Add or tighten tests/docs around `temp/wechat-size-report.json`, package breakdown fields, and script/remote red lines without changing package strategy |
| Human threshold | Any proposal to move resources remote/subpackage differently or change WeChat packaging architecture |

## Active Loop 35

| Field | Value |
|---|---|
| Loop goal | Gate 1 package evidence: make `temp/wechat-size-report.json` self-explanatory for release audit |
| Main-agent local task | Enrich the existing verify report without changing package strategy or resource placement |
| Task agent | Main agent executed directly because the change was contained to verification/reporting |
| Audit agent | Boyle and Plato |
| Human decision threshold | Any proposal to alter subpackage/remote strategy or move resources/scripts |

## Loop 35 Acceptance Target

| Requirement | Target |
|---|---|
| Hard cap evidence | Report includes main package hard-cap result, usage percent, and byte margin |
| Warning evidence | Report includes warning-line result, usage percent, and byte margin |
| Package matrix | Report includes subpackage count, remote bytes, and remote script count |
| Red line | Report explicitly states remote scripts are not allowed and asserts count is `0` |
| CI safety | Full CI remains green after build freshness refresh |

## Loop 35 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Size report audit block | Green | `verify-wechat-build-output.mjs` now writes `audit.mainPackageWithinBudget`, `mainPackageBelowWarning`, usage percentages, margins, subpackage count, remote bytes, and remote script policy/count |
| Hard assertions | Green | The verifier asserts `remoteScriptCount === 0` and `mainPackageWithinBudget === true` before writing the report |
| Current report | Green | Main package `2,541,486 bytes`, total `2,687,395 bytes`, budget usage `60.59%`, warning usage `65.51%`, budget margin `1,652,818 bytes`, remote scripts `0` |

## Loop 35 Validation

| Command | Result |
|---|---|
| `node tools\run-wechat-build.mjs` | Pass with tolerated Cocos Creator exit code `36`; build output refreshed after verifier changed |
| `node tools\verify-wechat-build-output.mjs` | Pass; generated enriched `temp/wechat-size-report.json` |
| `node tools\run-ci-tests.mjs` | Pass, node `202/202`, WeChat verify pass, main package `2,541,486`, total output `2,687,395`, preview runtime `9/9`, first-session journey `1/1`, visual initial snapshots `9/9` |

## Loop 35 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Both auditors accepted the report fields as derived from the same package breakdown and guarded by hard assertions. | Close Loop 35 as green. |
| P2 | Report is still written to `temp/`, so long-term retention depends on CI artifact upload. | CI workflow already uploads `temp/wechat-size-report.json`; keep a release snapshot if/when cutting a release. |
| P2 | Some budget checks now appear both in the audit block and final assertions. | Accept as evidence duplication, not a second source of truth. |

## Next Loop Candidate 36

| Field | Value |
|---|---|
| Candidate goal | Gate 5 human-required evidence handoff: make simulator/true-device validation steps and evidence fields explicit |
| Why it matters | Automated gates are green, but WeChat DevTools simulator / real device proof may require login, QR scan, and physical device steps |
| No-human path | Create a release evidence checklist/doc that records exact steps, expected outputs, and what still requires human execution |
| Human threshold | Actually opening/logging into WeChat DevTools or validating on a physical phone |

## Active Loop 36

| Field | Value |
|---|---|
| Loop goal | Gate 5 human-required evidence handoff: make simulator/true-device validation steps and evidence fields explicit |
| Main-agent local task | Add a clear release evidence checklist that separates automated proof, simulator proof, and true-device proof |
| Task agent | Main agent executed directly because the change was documentation-only and bounded |
| Audit agent | Boyle and Plato |
| Human decision threshold | Actually logging into WeChat DevTools, scanning QR codes, or validating on a physical phone |

## Loop 36 Acceptance Target

| Requirement | Target |
|---|---|
| Honest evidence boundary | The doc must explicitly state what automation can and cannot prove |
| Simulator steps | The doc must give exact DevTools simulator setup, commands, and required output evidence |
| True-device steps | The doc must require touch-only first-session playthrough and environment/device metadata |
| Result contract | The doc must define `PASS`, `BLOCKED_BY_HUMAN_ENV`, and `FAIL` without allowing local CI to masquerade as platform proof |
| Cute-style continuity | The doc must keep the bright, warm, cute, toy-like style as a Gate 5 pass criterion |

## Loop 36 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Gate 5 checklist | Green | Added `docs/wechat-gate5-human-evidence-checklist-2026-04-22.md` |
| Evidence boundary | Green | The checklist states local automation cannot prove WeChat DevTools real loading, runtime differences, true-device touch feel, weak network, QR preview, or WeChat-version compatibility |
| Simulator handoff | Green | The checklist includes build/open/verify commands, DevTools checks, and `temp/wechat-simulator-evidence.json` retention requirements |
| True-device handoff | Green | The checklist requires device, OS, WeChat version, DevTools version, AppID, network, screenshots/videos, and a touch-only full first-session route |
| Audit refinements | Green | Added an explicit warning that simulator evidence cannot replace true-device evidence and added a fixed `README.md` evidence template |

## Loop 36 Validation

| Command | Result |
|---|---|
| `rg -n "BLOCKED_BY_HUMAN_ENV|remoteScriptCount|4 \\* 1024 \\* 1024|DevTools 真实加载|当前自动化不能证明|真机验收" docs\wechat-gate5-human-evidence-checklist-2026-04-22.md` | Pass; all hard-boundary phrases present |
| `rg -n "不能替代真机验收|Simulator 证据不能证明|README\\.md 建议使用以下固定模板|结论：PASS / BLOCKED_BY_HUMAN_ENV / FAIL|RoomC|BossArena" docs\wechat-gate5-human-evidence-checklist-2026-04-22.md` | Pass; audit follow-up phrases and template anchors present |

## Loop 36 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Both auditors accepted the human boundary and evidence contract. | Close Loop 36 as green. |
| P2 | The initial simulator steps could be misread as enough for all Gate 5 evidence. | Fixed by adding a sentence that simulator evidence cannot replace true-device validation or mark Gate 5 `PASS` by itself. |
| P2 | Human record format was still somewhat open. | Fixed by adding a fixed `README.md` template for evidence archives. |
| P2 | Final evidence still depends on a human copying/attaching artifacts from DevTools and a phone. | Accepted as the real human threshold; Codex must not fabricate this proof. |

## Next Loop Candidate 37

| Field | Value |
|---|---|
| Candidate goal | Gate 5 evidence template: provide a ready-to-fill archive skeleton so human platform evidence is harder to record incorrectly |
| Why it matters | Loop 36 defines the evidence contract, but an actual template directory reduces copy/paste mistakes and makes final platform artifacts easier to review |
| No-human path | Add a `docs/wechat-gate5-evidence-template/` skeleton with README and issue log placeholders aligned to the checklist |
| Human threshold | Filling the template with real DevTools simulator or physical-device evidence |

## Active Loop 37

| Field | Value |
|---|---|
| Loop goal | Gate 5 evidence template: provide a ready-to-fill archive skeleton so human platform evidence is harder to record incorrectly |
| Main-agent local task | Add a template evidence directory with README, issue log, screenshot/video placeholders, evidence IDs, and cute-style scoring |
| Task agent | Main agent executed directly because the work was documentation scaffolding |
| Audit agent | Boyle and Plato |
| Human decision threshold | Filling any field with real DevTools simulator or physical-device evidence |

## Loop 37 Acceptance Target

| Requirement | Target |
|---|---|
| Not prefilled | The template must not imply Gate 5 has passed before evidence exists |
| Evidence IDs | Required screenshots/videos must have stable IDs so artifacts can be reviewed |
| Environment fields | Device, OS, WeChat version, DevTools version, AppID, build dir, code version, and network must be recorded |
| Full route | The template must include StartCamp through BossArena and return-to-camp evidence |
| Cute-style scoring | The template must preserve the 《智慧的再现》 bright, warm, cute, toy-like rubric |

## Loop 37 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Template directory | Green | Added `docs/wechat-gate5-evidence-template/README.md`, `issues.md`, `screenshots/.gitkeep`, and `videos/.gitkeep` |
| Status boundary | Green | `README.md` starts with “模板状态：待填写，禁止预填 PASS” and requires exactly one final result only after evidence exists |
| Evidence IDs | Green | Screenshot/video rows `G5-001` through `G5-008` separately cover StartCamp, field movement, DungeonHub, RoomA, RoomB, RoomC, BossArena, and return-to-camp |
| Issue tracking | Green | `issues.md` has P0/P1/P2 tables with scene, step, symptom, soft-lock flag, evidence, and handling result |
| Style scoring | Green | `issues.md` adds a `0-2` bright/warm/low-noise/round-toy/path/HUD/dark-dungeon rubric |

## Loop 37 Validation

| Command | Result |
|---|---|
| `rg -n "PASS|BLOCKED_BY_HUMAN_ENV|FAIL|remoteScriptCount|StartCamp|BossArena|黑暗地牢|4 \\* 1024 \\* 1024" docs\wechat-gate5-evidence-template` | Pass; core evidence and gate anchors present |
| `rg -n "禁止预填|待填写|G5-001|G5-005|0-2|智慧的再现|是否回到黑暗地牢|PASS" docs\wechat-gate5-evidence-template` | Pass; audit follow-up anchors present |
| `rg -n "G5-003|G5-004|G5-005|G5-006|G5-007|G5-008|RoomA|RoomB|RoomC|DungeonHub" docs\wechat-gate5-evidence-template\README.md` | Pass; dungeon hub and rooms have separate evidence rows |

## Loop 37 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Both auditors accepted the template as a handoff scaffold rather than fake evidence. | Close Loop 37 as green. |
| P2 | The initial template still centered `PASS / BLOCKED_BY_HUMAN_ENV / FAIL` strongly enough that a rushed editor could misread it as completed. | Fixed by adding “模板状态：待填写，禁止预填 PASS” and keeping the final result as `待填写`. |
| P2 | Screenshot/video evidence was initially too directory-level and could under-document rooms. | Fixed by adding stable evidence IDs and splitting DungeonHub, RoomA, RoomB, and RoomC into separate required rows. |
| P2 | Style scoring remains a human judgment rubric rather than a strict machine gate. | Accepted; final aesthetic judgment requires human review, but the rubric now anchors the intended cute style. |

## Next Loop Candidate 38

| Field | Value |
|---|---|
| Candidate goal | Gate 2 style implementation prep: convert the cute-style north star into a concrete scene-by-scene visual debt list |
| Why it matters | Gate 5 handoff is now explicit, but the screenshots still show the dungeon/field art is far from the bright toy-like target |
| No-human path | Inspect existing docs, manifests, tests, and scene/resource names to produce a prioritized visual debt checklist without changing final art direction |
| Human threshold | Choosing final art assets or approving/commissioning new visual samples |

## Active Loop 38

| Field | Value |
|---|---|
| Loop goal | Gate 2 style implementation prep: convert the cute-style north star into a concrete scene-by-scene visual debt list |
| Main-agent local task | Coordinate a task agent document pass, inspect existing style gates/docs/manifests, then adversarially audit the resulting visual debt map |
| Task agent | Pauli wrote `docs/loop38-cute-visual-debt-2026-04-22.md` |
| Audit agent | Boyle and Plato |
| Human decision threshold | Choosing final art assets, approving final visual samples, or deciding whether AI candidates can become formal resources |

## Loop 38 Acceptance Target

| Requirement | Target |
|---|---|
| Route-based | The debt list must follow `StartCamp -> FieldWest -> FieldRuins -> DungeonHub -> DungeonRoomA/B/C -> BossArena -> 返回营地` |
| Scene-specific | Every first-release scene must have problems, recommended direction, forbidden items, acceptance, and human art decisions |
| Priority-based | The doc must separate P0/P1/P2 rather than remain a loose critique |
| Gate-aligned | The doc must preserve package, AI boundary, `MechanicsLab` exclusion, and `style_resource_gate` constraints |
| Not overclaiming | The doc must not become the final art decision table or Gate 5 pass certificate |

## Loop 38 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Visual debt map | Green | Added `docs/loop38-cute-visual-debt-2026-04-22.md` |
| Scene route | Green | The doc covers StartCamp, FieldWest, FieldRuins, DungeonHub, DungeonRoomA/B/C, BossArena, and return-to-camp |
| Priority | Green | P0 focuses on package boundary, StartCamp first-read, DungeonHub hub clarity, and BossArena closure; P1 covers field/dungeon theme clarity; P2 covers polish |
| Resource anchors | Green | It repeats the must-redo list for `outdoor_wall_standard`, `outdoor_wall_broken`, `outdoor_wall_cracked`, `outdoor_path_cobble`, and `outdoor_ground_flowers` |
| Boundary fix | Green | Added a “边界与下一步产物” section stating the doc is a visual debt map, not final art approval, machine test, package decision, or Gate 5 pass proof |

## Loop 38 Validation

| Command | Result |
|---|---|
| `rg -n "P0|P1|P2|StartCamp|FieldWest|FieldRuins|DungeonHub|DungeonRoomA|DungeonRoomB|DungeonRoomC|BossArena|outdoor_wall|outdoor_path_cobble|outdoor_ground_flowers|人类|禁止|验收|智慧的再现" docs\loop38-cute-visual-debt-2026-04-22.md` | Pass; route, priorities, resources, forbidden items, acceptance, and human-decision anchors present |
| `rg -n "视觉债务地图|不是最终美术裁决|不是机器可执行测试|它不能决定|资源决策表|是否允许进入主包|Gate 5" docs\loop38-cute-visual-debt-2026-04-22.md` | Pass; audit boundary text present |

## Loop 38 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors accepted the scene priority order and alignment with the cute-style north star. | Close Loop 38 as green. |
| P2 | The document is judgment-heavy and not a machine-executable gate. | Fixed by explicitly labeling it a visual debt map, not a final art decision or test spec. |
| P2 | Resource examples are directional rather than a frozen resource decision table. | Converted into the next loop candidate; this requires a separate decision table. |
| P2 | The doc could be misread as final art approval or Gate 5 pass evidence. | Fixed by stating it cannot decide final art, AI promotion, package entry, or Gate 5 `PASS`. |

## Next Loop Candidate 39

| Field | Value |
|---|---|
| Candidate goal | Gate 2 resource decision table: turn the visual debt map into per-key decisions without creating a second source of truth |
| Why it matters | Loop 38 says which resources need decisions; implementation needs a concrete table tied back to `style_resource_gate.json` and `asset_binding_manifest_v2.json` |
| No-human path | Generate a documentation table from current gate/binding/scene references listing resource key, current state, first-release usage, decision, package action, and human-decision requirement |
| Human threshold | Promoting any candidate art to final, changing package placement, or adding new bitmap resources |

## Active Loop 39

| Field | Value |
|---|---|
| Loop goal | Gate 2 resource decision table: turn the visual debt map into per-key decisions without creating a second source of truth |
| Main-agent local task | Parse current gate/binding/scene usage and document resource decisions without changing package or art binding |
| Task agent | Main agent executed directly because the work was a source-derived documentation view |
| Audit agent | Boyle and Plato |
| Human decision threshold | Promoting candidate art, changing package placement, or adding new bitmap resources |

## Loop 39 Acceptance Target

| Requirement | Target |
|---|---|
| Source boundary | The doc must explicitly state it is not a new source of truth |
| P0 coverage | The five must-redo keys must be listed and not softened |
| Package safety | The doc must keep the 4 MiB hard cap and no-remote-script rule visible |
| AI boundary | Generated/AI assets must not be promoted to final art by documentation |
| Human boundary | Final art, package entry, and candidate promotion remain human decisions |

## Loop 39 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Decision table | Green | Added `docs/loop39-style-resource-decision-table-2026-04-22.md` |
| Source boundary | Green | The doc says it is a view of `style_resource_gate.json`, `asset_binding_manifest_v2.json`, and scene wiring, not a new fact source |
| P0 resources | Green | `outdoor_wall_standard`, `outdoor_wall_broken`, `outdoor_wall_cracked`, `outdoor_path_cobble`, and `outdoor_ground_flowers` remain `must-redo` |
| Package / AI boundary | Green | The doc blocks AI big images from directly entering the main package and keeps the 4 MiB hard cap visible |
| Drift protection | Green | Added a note that source changes require regenerating/reviewing the table and that `paths: []` does not mean final art is accepted |

## Loop 39 Validation

| Command | Result |
|---|---|
| Inline Node read of `style_resource_gate.json`, `asset_binding_manifest_v2.json`, and first-release scenes | Pass; produced key/role/status/path/scene usage data used for the doc |
| `rg -n "不是新的事实源|唯一事实源|outdoor_wall_standard|outdoor_wall_broken|outdoor_wall_cracked|outdoor_path_cobble|outdoor_ground_flowers|touch_attack_button|boss_core|checkpoint|AI|主包|人类定稿|禁止升级|tiny sample sheet" docs\loop39-style-resource-decision-table-2026-04-22.md` | Pass; core decisions and boundaries present |
| `rg -n "不等于已经可以作为最终美术发售|漂移保护|不得把本文当成长期冻结的第二事实源" docs\loop39-style-resource-decision-table-2026-04-22.md` | Pass; audit follow-up boundaries present |

## Loop 39 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors accepted the key decisions and package/AI/human boundaries. | Close Loop 39 as green. |
| P2 | This is a decision view and can drift if source manifests change. | Fixed by adding a drift-protection note. |
| P2 | `paths: []` could be misread as “free to ship final.” | Fixed by stating procedural placeholders are not final art approval. |
| P2 | Local candidates like `boss_core`, `checkpoint`, and `touch_*` still need sample/art + package evidence before promotion. | Converted into next implementation candidate. |

## Next Loop Candidate 40

| Field | Value |
|---|---|
| Candidate goal | P0 cute sample-sheet spec: define the minimum sample sheet needed before any new tile/wall bitmap enters the project |
| Why it matters | The resource decision table identifies five must-redo keys; the next safe step is to define a tiny sample sheet contract without importing art or growing the main package |
| No-human path | Add a sample-sheet spec doc with exact tiles, dimensions, style rules, preview scenes, package-budget checks, and rejection criteria |
| Human threshold | Selecting or approving the actual sample sheet artwork |

## Active Loop 40

| Field | Value |
|---|---|
| Loop goal | P0 cute sample-sheet spec: define the minimum sample sheet needed before any new tile/wall bitmap enters the project |
| Main-agent local task | Add a tiny sample-sheet specification for the five P0 must-redo tile/wall keys without importing art or changing bindings |
| Task agent | Main agent executed directly because the work was documentation/specification only |
| Audit agent | Boyle and Plato |
| Human decision threshold | Selecting/approving actual sample sheet artwork or importing any new bitmap |

## Loop 40 Acceptance Target

| Requirement | Target |
|---|---|
| Five-key coverage | The spec must cover all P0 must-redo keys |
| No import permission | The spec must not imply candidates can be directly imported or bound |
| Package budget | The spec must keep 4 MiB hard cap, 3.7 MiB warning, and sample-stage increment visible |
| Cute-style scoring | The spec must provide executable style scoring and rejection criteria |
| Human boundary | Human confirmation remains required before any artwork becomes final |

## Loop 40 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Sample spec | Green | Added `docs/loop40-p0-cute-sample-sheet-spec-2026-04-22.md` |
| Five-key coverage | Green | Covers `outdoor_wall_standard`, `outdoor_wall_broken`, `outdoor_wall_cracked`, `outdoor_path_cobble`, and `outdoor_ground_flowers` |
| Scope control | Green | Requires contact sheet, single-tile previews, small scene collages, and package estimate instead of full scene replacement |
| Package gate | Green | Keeps main package `<= 4 * 1024 * 1024 bytes`, warning line, `<= 256 KiB` sample-stage increment target, and remote scripts `0` |
| Candidate boundary | Green | Added that `candidate` only means “can be reviewed,” not imported, formally bound, or final art |

## Loop 40 Validation

| Command | Result |
|---|---|
| `rg -n "outdoor_wall_standard|outdoor_wall_broken|outdoor_wall_cracked|outdoor_path_cobble|outdoor_ground_flowers|256 KiB|12/16|禁止项|不允许改写|asset_binding_manifest_v2|主包|4 \\* 1024 \\* 1024|候选|人类确认|失败" docs\loop40-p0-cute-sample-sheet-spec-2026-04-22.md` | Pass; core spec anchors present |
| `rg -n "candidate.*可进入评审|不表示.*可导入工程|不表示.*可改正式绑定|不表示.*最终美术" docs\loop40-p0-cute-sample-sheet-spec-2026-04-22.md` | Pass; audit follow-up candidate boundary present |

## Loop 40 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors accepted scope, package checks, scoring, and human boundary. | Close Loop 40 as green. |
| P2 | Readers could confuse `candidate` filenames with approval to import/bind/finalize. | Fixed by explicitly defining `candidate` as review-only. |
| P2 | Actual artwork still requires human confirmation. | Accepted as the human threshold for this phase. |

## Next Loop Candidate 41

| Field | Value |
|---|---|
| Candidate goal | ComfyUI/AI sample brief: constrain generation so it cannot recreate the current ugly/dark/mixed-art failure |
| Why it matters | The original problem came from generated assets being loaded into the game without enough style and package constraints |
| No-human path | Add a prompt/negative-prompt/QA brief document for P0 sample sheet generation, including rejection checks before import |
| Human threshold | Running ComfyUI, selecting generated outputs, or approving any artwork |

## Active Loop 41

| Field | Value |
|---|---|
| Loop goal | ComfyUI/AI sample brief: constrain generation so it cannot recreate the current ugly/dark/mixed-art failure |
| Main-agent local task | Add an AI candidate-generation brief for the P0 sample sheet with prompts, negative prompts, rejection checks, and originality checks |
| Task agent | Main agent executed directly because no image generation or import was performed |
| Audit agent | Boyle and Plato |
| Human decision threshold | Running ComfyUI, selecting outputs, approving artwork, or importing any bitmap |

## Loop 41 Acceptance Target

| Requirement | Target |
|---|---|
| Candidate-only | The brief must not permit direct final art, binding edits, HUD skin generation, or full-scene dumps |
| Five-key coverage | The brief must cover the five P0 must-redo keys |
| Negative guard | The brief must reject dark dungeon, dirty noise, realistic cracks, UI/text, and over-detailed output |
| Package guard | The brief must keep `12/16` scoring and `<= 256 KiB` candidate budget visible |
| Originality | The brief must avoid copying concrete IP assets while preserving the desired cute qualities |

## Loop 41 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| AI brief | Green | Added `docs/loop41-comfyui-cute-sample-brief-2026-04-22.md` |
| Scope control | Green | Blocks direct final art, direct manifest edits, full-scene generation, and HUD main skin generation |
| Prompting | Green | Includes stable positive prompt, negative prompt, and per-key prompts for all five must-redo keys |
| Rejection checks | Green | Adds import rejection checks for style, readability, HUD conflict, and package budget |
| Originality check | Green | Adds a separate originality checklist for recognizable commercial-game silhouettes, proprietary patterns, logos, UI composition, and screenshot copying |

## Loop 41 Validation

| Command | Result |
|---|---|
| `rg -n "不复制|AI 图直接定稿|asset_binding_manifest_v2|outdoor_wall_standard|outdoor_wall_broken|outdoor_wall_cracked|outdoor_path_cobble|outdoor_ground_flowers|dark dungeon|dirty green noise|12/16|256 KiB|导入前拒绝清单|候选生成" docs\loop41-comfyui-cute-sample-brief-2026-04-22.md` | Pass; scope, prompts, budget, and key coverage present |
| `rg -n "原创性复核|商业游戏|专有图案|Logo|现成截图|项目自己的风格词" docs\loop41-comfyui-cute-sample-brief-2026-04-22.md` | Pass; originality follow-up present |

## Loop 41 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors accepted the prompt, negative prompt, rejection list, and AI boundary. | Close Loop 41 as green. |
| P2 | Prompt specs are not legal originality guarantees. | Fixed by adding an originality review checklist. |
| P2 | Final sample choice and package entry still require human approval. | Accepted as the human threshold. |

## Next Loop Candidate 42

| Field | Value |
|---|---|
| Candidate goal | Code-level import guard: ensure P0 generated/candidate art cannot be silently promoted through binding manifests |
| Why it matters | The docs are clear, but harness should also guard against future accidental manifest edits that bind generated/candidate P0 art |
| No-human path | Inspect existing style-resource tests and add a focused assertion if there is a gap |
| Human threshold | Intentionally approving candidate art and updating manifests after visual/package review |

## Active Loop 42

| Field | Value |
|---|---|
| Loop goal | Code-level import guard: ensure P0 generated/candidate art cannot be silently promoted through binding manifests |
| Main-agent local task | Strengthen `style-resource-gate` so P0 must-redo keys stay image-free until reviewed cute samples are approved |
| Task agent | Main agent executed directly because the code change was a focused test guard |
| Audit agent | Boyle and Plato |
| Human decision threshold | Intentionally approving candidate art and updating manifests after visual/package review |

## Loop 42 Acceptance Target

| Requirement | Target |
|---|---|
| Existing coverage check | Confirm existing tests already block generated-path shortcuts |
| Candidate shortcut guard | Add an assertion that blocks selected/fallback candidate paths on must-redo keys before approval |
| AI marker guard | Must-redo keys cannot be marked AI-generated before approval |
| Placeholder convention | Current P0 keys must remain `rect_visual_placeholder` while blocked-final |
| CI | Targeted and full CI remain green |

## Loop 42 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Test gap closed | Green | Added `must-redo keys stay image-free until a reviewed cute sample is approved` to `tests/style-resource-gate.test.mjs` |
| Binding guard | Green | Test asserts empty selected/fallback paths and empty `getEntryPaths()` for all five must-redo keys |
| AI guard | Green | Test asserts must-redo keys are not marked with the AI source marker |
| Future flow | Green | Future approved art can still land by intentionally updating policy/tests with review evidence |

## Loop 42 Validation

| Command | Result |
|---|---|
| `node --test tests\style-resource-gate.test.mjs` | Pass, `18/18` |
| `node tools\run-ci-tests.mjs` | Pass, node `203/203`, WeChat verify pass, main package `2,541,486`, total output `2,687,395`, preview runtime `9/9`, first-session journey `1/1`, visual initial snapshots `9/9` |

## Loop 42 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors accepted the guard as aligned with Gate 2 and WeChat package strategy. | Close Loop 42 as green. |
| P2 | The test is intentionally coupled to current `rect_visual_placeholder` and empty-path conventions. | Accept; this is the intended blocked-final convention and should be deliberately changed only after sample approval. |
| P2 | If candidate assets scale up later, a separate whitelist/mapping table may help. | Defer until actual candidate assets exist. |

## Next Loop Candidate 43

| Field | Value |
|---|---|
| Candidate goal | Visual baseline index: make existing initial-scene screenshots reviewable as baseline evidence without calling them final cute approval |
| Why it matters | Gate 3/5 require visual regression baselines and human scoring; screenshots exist but need an index, limitations, and scoring slots |
| No-human path | Add a doc mapping each first-release scene to its current baseline screenshot, score dimensions, known debt, and human-review status |
| Human threshold | Actually scoring/approving the screenshots as final cute-style acceptance |

## Active Loop 43

| Field | Value |
|---|---|
| Loop goal | Visual baseline index: make existing initial-scene screenshots reviewable as baseline evidence without calling them final cute approval |
| Main-agent local task | Index existing initial screenshots, add scoring slots, and clearly separate preview baselines from simulator/true-device proof |
| Task agent | Main agent executed directly because the work was documentation/indexing only |
| Audit agent | Boyle and Plato |
| Human decision threshold | Actually scoring screenshots or accepting them as final cute-style evidence |

## Loop 43 Acceptance Target

| Requirement | Target |
|---|---|
| Screenshot coverage | All first-release scenes must have a baseline screenshot path |
| Internal scene boundary | `MechanicsLab` must be marked internal-only |
| Evidence boundary | The doc must not claim final style, WeChat runtime, or true-device proof |
| Scoring | The doc must include the 8-dimension cute-style scorecard and 12/16 threshold |
| Gate 5 boundary | The doc must require automation, human scoring, simulator, and true-device evidence before `PASS` |

## Loop 43 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Baseline index | Green | Added `docs/loop43-visual-baseline-index-2026-04-22.md` |
| Screenshot coverage | Green | Indexed `StartCamp`, `FieldWest`, `FieldRuins`, `DungeonHub`, `DungeonRoomA/B/C`, `BossArena`, and `MechanicsLab` |
| Scoring table | Green | Adds `0/1/2` scoring across 8 dimensions with `12/16` threshold |
| Evidence boundary | Green | States preview screenshots have not proven final cute style, WeChat runtime, true-device touch, weak network, or QR preview |
| Audit fix | Green | Reworded “it cannot prove” bullets to start with “未证明” to prevent skim-read overclaiming |

## Loop 43 Validation

| Command | Result |
|---|---|
| PowerShell `Test-Path` over all `visual-scene-initial` screenshot files | Pass; all indexed PNG files exist |
| `rg -n "不是最终美术通过证据|不是微信 DevTools simulator 证据|不是真机证据|12/16|Gate 5|待评审|MechanicsLab|visual-scene-initial" docs\loop43-visual-baseline-index-2026-04-22.md` | Pass; baseline and evidence-boundary anchors present |
| `rg -n "未证明场景|未证明微信小游戏真实 runtime|未证明真机触屏" docs\loop43-visual-baseline-index-2026-04-22.md` | Pass; audit follow-up wording present |

## Loop 43 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors accepted coverage, `MechanicsLab` boundary, and preview/simulator/true-device split. | Close Loop 43 as green. |
| P2 | “It cannot prove” bullets could be skim-read incorrectly. | Fixed by rewriting them as explicit “未证明...” statements. |

## Next Loop Candidate 44

| Field | Value |
|---|---|
| Candidate goal | No-new-art visual improvement probe: inspect whether procedural placeholder colors can be safely brightened without adding assets |
| Why it matters | The project is still visually far from the cute target, and some improvement may be possible through existing RectVisual/procedural colors with zero package cost |
| No-human path | Inspect RectVisual/SceneDressing/color usage and, only if a small safe change exists, adjust procedural colors plus visual tests |
| Human threshold | Any change that selects final art, imports bitmaps, or redefines the approved visual north star |

## Active Loop 44

| Field | Value |
|---|---|
| Loop goal | No-new-art visual improvement probe: inspect whether procedural placeholder colors can be safely brightened without adding assets |
| Main-agent local task | Inspect RectVisual, scene binding colors, and current baseline screenshots before deciding whether to patch colors |
| Task agent | Main agent executed directly because this was a probe/no-code decision |
| Audit agent | Boyle and Plato |
| Human decision threshold | Any final art/color north-star change |

## Loop 44 Acceptance Target

| Requirement | Target |
|---|---|
| Color inventory | Extract current P0/P1 binding colors from first-release scenes |
| Screenshot check | Inspect representative current baselines rather than relying on old screenshots |
| No blind patch | Avoid global `RectVisual` or blanket palette changes if the problem is hierarchy instead of darkness |
| Next target | Identify the next safe loop if color is not the right lever |

## Loop 44 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Color inventory | Green | P0/P1 fills are already mostly warm/light: cream, warm green, pale blue, honey, peach |
| Screenshot check | Green | Viewed `StartCamp`, `DungeonHub`, and `BossArena` current baselines |
| No-code decision | Green | Did not patch `RectVisual` defaults or scene colors because global recolor would be high-risk and low-value |
| Next target | Green | Identified HUD/banner/card hierarchy and flowchart-like layout as the dominant current visual issue |

## Loop 44 Validation

| Command / Evidence | Result |
|---|---|
| Inline Node extraction of first-release binding colors | Pass; produced scene/key/node/fill/stroke/radius inventory |
| `view_image` on `StartCamp-initial.png`, `DungeonHub-initial.png`, `BossArena-initial.png` | Pass; confirmed current issue is hierarchy/card dominance more than black/dark palette |

## Loop 44 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors agreed no global recolor should happen now. | Close Loop 44 as green/no-code. |
| P2 | Some local color tweaks may still be useful later, but should serve hierarchy and readability rather than blanket recolor. | Convert into next HUD/hierarchy loop. |

## Next Loop Candidate 45

| Field | Value |
|---|---|
| Candidate goal | HUD density / hierarchy probe: find small no-art changes that reduce the current flowchart feel |
| Why it matters | Current baselines are warm but still look like oversized HUD/cards over abstract blocks, not a coherent cute toy world |
| No-human path | Inspect GameHud responsive layout and scene world labels/cards; if safe, reduce dominance of non-essential HUD/world instruction layers while preserving touch-first tests |
| Human threshold | Any redesign of final HUD skin, new iconography, or final UI art language |

## Active Loop 45

| Field | Value |
|---|---|
| Loop goal | HUD density / hierarchy probe: reduce the current flowchart/banner feel with no new art |
| Main-agent local task | Trim always-visible top HUD footprint, tighten phone layout detection, and re-sync the gameplay logic helper with runtime layout formulas |
| Task agent | Main agent executed directly because the patch was small and localized |
| Audit agent | Boyle and Plato |
| Human decision threshold | Any final HUD skin, iconography, or UI art-language redesign |

## Loop 45 Acceptance Target

| Requirement | Target |
|---|---|
| HUD dominance | Top HUD and objective card should be narrower/shorter without hiding core first-session info |
| Touch-first safety | Mobile touch controls must still pass move/attack/summon/pause/respawn smoke |
| No-overlap safety | Active touch HUD buttons must not overlap across desktop/tablet/mobile |
| Runtime/test sync | `tests/helpers/gameplay-logic.mjs` must mirror the new `GameHud` layout formulas |
| Style boundary | No final-art claim and no new bitmap/vector asset import |

## Loop 45 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Top HUD footprint | Green | `GameHud` top bar/objective card width and height reduced to read less like full-width debug banners |
| Mobile heuristic | Green with P2 risk | Phone layout detection now uses canvas size/aspect gates instead of treating all wide canvases as phones |
| Touch layout | Green | Mobile hides echo row/reset and scales primary touch buttons; summon aligns with attack at same Y |
| Helper sync | Green | `tests/helpers/gameplay-logic.mjs` mirrors top cards, mobile tier, echo-row offscreen behavior, summon Y, and reset Y |
| Test coverage | Green | `tests/gameplay-logic.test.mjs` asserts desktop/tablet/phone tier behavior |

## Loop 45 Validation

| Command | Result |
|---|---|
| `node --test tests\gameplay-logic.test.mjs` | Pass; 14/14 |
| `npx playwright test "tests/visual-hud-layout.spec.mjs" "tests/visual-scene-initial.spec.mjs" "tests/first-session-runtime.spec.mjs" "tests/hud-geometry-no-overlap.spec.mjs" "tests/responsive-hud-behavior.spec.mjs" "tests/responsive-safe-area.spec.mjs"` | Pass; 35/35 |

## Loop 45 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors found no helper/runtime drift or first-session touch regression. | Close Loop 45 as green. |
| P2 | Mobile heuristic can still classify narrow desktop/editor windows as phone-like. | Accept for now; keep as future responsive hardening unless a real desktop regression appears. |
| P2 | Helper mirrors runtime, so future copy-paste drift can still stay green if both are changed together. | Keep Playwright runtime screenshots and geometry tests as the source of behavioral proof. |

## Next Loop Candidate 46

| Field | Value |
|---|---|
| Candidate goal | World-label / instruction-card hierarchy pass: reduce editor-like text clutter after HUD density cleanup |
| Why it matters | First-release scenes now have many world-space hints and labels in addition to HUD objectives, making the current cute toy world feel like a debug flowchart |
| No-human path | Inventory first-release labels, define a scene-text budget, and add a guard that prevents long world-space instruction labels from multiplying outside approved exceptions |
| Human threshold | Rewriting the tutorial narrative, approving final Chinese copy, or changing the core teaching order |

## Active Loop 46

| Field | Value |
|---|---|
| Loop goal | World-label / instruction-card hierarchy pass: reduce editor-like long text after HUD density cleanup |
| Main-agent local task | Shorten the longest world-space hints into signpost copy and add a style gate that prevents world-label sprawl |
| Task agent | Main agent executed directly because the changes were small scene-copy edits plus one gate |
| Audit agent | Boyle and Plato |
| Human decision threshold | Approving final Chinese copy, rewriting tutorial narrative, or changing teaching order |

## Loop 46 Acceptance Target

| Requirement | Target |
|---|---|
| World-copy brevity | First-release world-space labels must stay <= 10 characters |
| World-label count | Per-scene count budgets must prevent future label multiplication |
| HUD boundary | HUD/objective/touch/pause labels must not be counted as world labels |
| Evidence | Current budgets and copy changes must be documented |
| Visual safety | Initial scene preview tests must still load and retain expected labels |

## Loop 46 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Copy shortening | Green | Shortened 5 long world hints in `StartCamp`, `FieldWest`, `DungeonHub`, and `DungeonRoomA` |
| Style gate | Green | Added `first-pass world labels stay short and sparse like cute signposts, not debug instructions` |
| Documentation | Green | Added `docs/loop46-world-label-budget-2026-04-22.md` |
| Inventory | Green | First-release longest world label is now <= 9 characters |

## Loop 46 Validation

| Command | Result |
|---|---|
| `node --test tests\style-resource-gate.test.mjs` | Pass; 19/19 |
| `npx playwright test "tests/visual-scene-initial.spec.mjs"` | Pass; 9/9 |
| Inline Node world-label inventory | Pass; world labels within count budgets and max length <= 9 |

## Loop 46 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors found HUD/world classification correct for current scene roots and no first-session comprehension break. | Close Loop 46 as green. |
| P2 | The world-label classifier only excludes `HudRoot`, `TouchHudRoot`, and `PausePanel`; future overlay roots may need a whitelist update. | Accept as current-scene guard; expand if a new UI root is introduced. |
| P2 | The guard checks brevity, not human copy quality or actual comprehension. | Keep final copy approval as a human Gate 5 item. |
| P2 | The guard only scans `cc.Label`; future text-render paths could escape it. | Accept until another text renderer appears. |

## Next Loop Candidate 47

| Field | Value |
|---|---|
| Candidate goal | Placeholder entity-label audit: separate useful in-world signposts from debug/name labels that keep the scene looking like an editor |
| Why it matters | Even after shortening signposts, always-on labels such as player/enemy/status placeholders can still make the world feel like annotated rectangles instead of toy objects |
| No-human path | Inventory always-on entity/status labels, add classification/budget docs or tests, and only hide labels that are already safely backed by non-text visual affordances |
| Human threshold | Removing labels that are required for comprehension before replacement icons/art exist, or approving final entity iconography |

## Active Loop 47

| Field | Value |
|---|---|
| Loop goal | Placeholder entity-label audit: remove enemy AI behavior-state words from player-facing world labels |
| Main-agent local task | Replace `巡逻`, `守卫`, and `看守` enemy labels with the creature identity `史莱姆`, then guard against those state labels returning |
| Task agent | Main agent executed directly because the changes were small scene-copy edits plus one gate |
| Audit agent | Boyle and Plato |
| Human decision threshold | Final monster naming, iconography approval, or hiding labels needed for comprehension before art exists |

## Loop 47 Acceptance Target

| Requirement | Target |
|---|---|
| Debug-copy cleanup | Enemy labels must not expose AI behavior states |
| Comprehension | Enemies must still have a readable placeholder identity |
| Style boundary | The change must be documented as placeholder-copy hygiene, not final monster naming |
| Guard | Style gate must fail if the forbidden behavior-state words return as world labels |

## Loop 47 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Scene copy | Green | `FieldWest`, `FieldRuins`, `DungeonRoomA/B/C` enemy labels now use `史莱姆` |
| Style gate | Green | Added `first-pass world labels do not expose enemy AI behavior states as player-facing copy` |
| Documentation | Green | Added `docs/loop47-entity-label-policy-2026-04-22.md` |

## Loop 47 Validation

| Command | Result |
|---|---|
| `node --test tests\style-resource-gate.test.mjs` | Pass; 20/20 |
| `npx playwright test "tests/visual-scene-initial.spec.mjs"` | Pass; 9/9 |
| `rg -n '"_string": "(巡逻|守卫|看守)"' assets\scenes` | No matches; exit 1 expected for no matches |

## Loop 47 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors found no comprehension break and no final-naming boundary violation. | Close Loop 47 as green. |
| P2 | `史莱姆` is a temporary unified identity and narrows future naming until monster art/naming is approved. | Accept; final monster naming remains a human review item. |
| P2 | The denylist is exact-word based and may need exceptions if those words are later used in a valid non-enemy context. | Accept; add exemptions only when a real use case appears. |

## Next Loop Candidate 48

| Field | Value |
|---|---|
| Candidate goal | Post-scene-edit release-chain verification: ensure preview, node gates, and WeChat package evidence are not stale after text/style changes |
| Why it matters | Scene edits can make the previous WeChat build stale; Gate 1/5 require size report and package freshness, not just local preview screenshots |
| No-human path | Run node CI, WeChat config/build/verify if local Cocos tooling is available, refresh size report, and document any simulator/true-device human evidence still blocked |
| Human threshold | WeChat DevTools login, simulator auto-mode connection, QR preview, or true-device acceptance |

## Active Loop 48

| Field | Value |
|---|---|
| Loop goal | Post-scene-edit release-chain verification: remove stale preview/build evidence after Loops 45-47 |
| Main-agent local task | Run local CI, fix stale Cocos preview cache and stale WeChat build, refresh visual baselines, then rerun full CI |
| Task agent | Main agent executed directly because this was an evidence/verification loop |
| Audit agent | Boyle and Plato |
| Human decision threshold | WeChat DevTools login, simulator auto-mode connection, QR preview, or true-device acceptance |

## Loop 48 Acceptance Target

| Requirement | Target |
|---|---|
| Cocos cache | Local `library/<uuid>.json` release-scene cache must match `assets/scenes/*.scene` when preview is reachable |
| WeChat package | Build output must be fresh for current release inputs and pass 4MB hard cap |
| Visual baseline | Intentional copy/layout snapshot changes must be regenerated and pass |
| CI chain | `npm run test:ci` must pass end-to-end after refresh |
| Evidence boundary | Human-only DevTools/true-device/final-style proof must remain explicitly unclaimed |

## Loop 48 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Initial CI probe | Red as expected | First `npm run test:ci` failed on stale Cocos cache and stale WeChat output |
| Cocos preview cache | Green | Synced 8 first-release cache files and `tests/cocos-library-cache.test.mjs` passed 1/1 |
| WeChat build | Green | `build:wechat:config`, `build:wechat`, and `verify:wechat` passed; Creator exit code `36` remained tolerated by project policy |
| Size report | Green | `temp/wechat-size-report.json` main package `2,541,479` bytes, total `2,687,304` bytes |
| Visual snapshots | Green | Regenerated intended `visual-scene-initial` baselines |
| Evidence doc | Green | Added `docs/loop48-release-chain-evidence-2026-04-22.md` |

## Loop 48 Validation

| Command | Result |
|---|---|
| `node --test tests\cocos-library-cache.test.mjs` | Pass; 1/1 |
| `npm run build:wechat:config; npm run build:wechat; npm run verify:wechat` | Pass; verify refreshed size report |
| `npx playwright test "tests/visual-scene-initial.spec.mjs" --update-snapshots` | Pass; 9/9 |
| `npm run test:ci` | Pass; node 205/205, WeChat verify fresh, preview smoke 9/9, first-session journey 1/1, visual initial 9/9 |

## Loop 48 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors accepted package freshness, size budget, and snapshot refresh legitimacy. | Close Loop 48 as green. |
| P2 | Cocos preview cache proof is still source-to-cache plus preview-smoke, not a single definitive runtime-cache assertion. | Accept; current evidence chain is sufficient for local automation, not final device proof. |
| P2 | Snapshot updates must stay tied to reviewed source diffs and not bless unrelated future drift. | Documented in Loop 48 evidence and visual baseline index remains non-final. |
| P2 | Cocos Creator exit code `36` remains a tolerated process quirk. | Keep as known build-process residual; verify must remain the green gate. |

## Next Loop Candidate 49

| Field | Value |
|---|---|
| Candidate goal | Evidence template consolidation: make the latest size report, CI pass, and refreshed baselines easy for a human Gate 5 reviewer to consume |
| Why it matters | Automated gates are now green, but the next human reviewer still needs a concise evidence map instead of hunting through temp files and scattered loop docs |
| No-human path | Update the Gate 5 evidence template/readme or add a short index that points to current size report, snapshots, CI command, and remaining human-only checks |
| Human threshold | Actually filling simulator/true-device results, final visual scores, or copy approval |

## Active Loop 49

| Field | Value |
|---|---|
| Loop goal | Evidence template consolidation: make latest automated proof easy for a Gate 5 reviewer to find without overclaiming final approval |
| Main-agent local task | Add a current automation evidence index and link it from the Gate 5 template README |
| Task agent | Main agent executed directly because this was documentation/indexing |
| Audit agent | Boyle and Plato |
| Human decision threshold | Filling simulator/true-device observations, final visual scores, copy approval, or monster naming approval |

## Loop 49 Acceptance Target

| Requirement | Target |
|---|---|
| Automation index | Record the latest full CI pass and package numbers in one reviewer-facing file |
| Human boundary | Explicitly state that automation green is not Gate 5 `PASS` |
| Evidence links | Point to size report, build status/config, baselines, checklist, and issue log |
| Validation | Verify anchors and key evidence paths exist |

## Loop 49 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Current evidence index | Green | Added `docs/wechat-gate5-evidence-template/current-automation-evidence-2026-04-22.md` |
| README entry | Green | Added pointer from `docs/wechat-gate5-evidence-template/README.md` |
| Human boundary | Green | Status is `AUTOMATION_GREEN_HUMAN_EVIDENCE_PENDING`; missing device checks mean `BLOCKED_BY_HUMAN_ENV`, not `PASS` |

## Loop 49 Validation

| Command | Result |
|---|---|
| `rg -n "AUTOMATION_GREEN_HUMAN_EVIDENCE_PENDING|2,541,479|BLOCKED_BY_HUMAN_ENV|current-automation-evidence" docs\wechat-gate5-evidence-template docs\loop48-release-chain-evidence-2026-04-22.md` | Pass; expected anchors found |
| `Test-Path` for current evidence doc, `temp/wechat-size-report.json`, and `StartCamp-initial.png` | Pass; all true |

## Loop 49 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors confirmed no stale numbers, no `PASS` overclaim, and no missing critical evidence link. | Close Loop 49 as green. |
| P2 | Gate 5 README can still look like a final conclusion form to a skimming reviewer. | Convert into Loop 50 anti-overclaim banner. |
| P2 | README rendering can look garbled in some terminal output, increasing reading cost. | Avoid broad rewrite now; add a clear ASCII/Chinese status banner at top. |

## Next Loop Candidate 50

| Field | Value |
|---|---|
| Candidate goal | Gate 5 README anti-overclaim hardening |
| Why it matters | The template is where humans will write the final result; a prominent banner should prevent automation evidence from being mistaken for release approval |
| No-human path | Add a concise top-of-file status banner that says automation green is not `PASS`, and list the remaining human-only blockers |
| Human threshold | Changing the actual Gate 5 conclusion to `PASS`, `FAIL`, or filling device observations |

## Active Loop 50

| Field | Value |
|---|---|
| Loop goal | Gate 5 README anti-overclaim hardening |
| Main-agent local task | Add a prominent top-of-file status banner to the Gate 5 template README |
| Task agent | Main agent executed directly because this was a small documentation hardening |
| Audit agent | Boyle and Plato |
| Human decision threshold | Changing the actual Gate 5 conclusion or filling device observations |

## Loop 50 Acceptance Target

| Requirement | Target |
|---|---|
| Anti-overclaim | README must say automation green is not `PASS` |
| Human blockers | README must name DevTools simulator, QR/true-device, final style, final copy, and monster naming as human-only blockers |
| Future PASS | Wording must still allow a later legitimate human `PASS` |

## Loop 50 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| README banner | Green | Added `AUTOMATION_GREEN_HUMAN_EVIDENCE_PENDING` banner and human-only blockers near the top |

## Loop 50 Validation

| Command | Result |
|---|---|
| `rg -n "AUTOMATION_GREEN_HUMAN_EVIDENCE_PENDING|human-only blockers|current-automation-evidence" docs\wechat-gate5-evidence-template\README.md` | Pass; banner anchors found |
| `Get-Content -TotalCount 10 docs\wechat-gate5-evidence-template\README.md` | Pass; banner visible at top |

## Loop 50 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors confirmed no overclaim and no blocking of a later legitimate human `PASS`. | Close Loop 50 as green. |
| P2 | A hurried reviewer could still skim past a README warning. | Convert into Loop 51 automated doc guard. |

## Next Loop Candidate 51

| Field | Value |
|---|---|
| Candidate goal | Gate 5 evidence anti-overclaim test |
| Why it matters | The README and current automation evidence file now carry safety-critical wording; a future edit should not accidentally remove it |
| No-human path | Add a node test that verifies the Gate 5 template remains pending, links current automation evidence, and lists human-only blockers |
| Human threshold | Actually changing Gate 5 status to `PASS` after real human/device evidence |

## Active Loop 51

| Field | Value |
|---|---|
| Loop goal | Gate 5 evidence anti-overclaim test |
| Main-agent local task | Add a node test that verifies pending status, anti-PASS wording, human blockers, and evidence paths |
| Task agent | Main agent executed directly because this was a small test/doc guard |
| Audit agent | Boyle and Plato |
| Human decision threshold | Actually changing Gate 5 status to `PASS` after real human/device evidence |

## Loop 51 Acceptance Target

| Requirement | Target |
|---|---|
| Pending status | Evidence docs must keep `AUTOMATION_GREEN_HUMAN_EVIDENCE_PENDING` |
| Anti-overclaim | Test must fail if current automation evidence claims `Status: PASS` |
| Human blockers | Test must require DevTools, QR/true-device, final style, final copy, and monster naming blockers |
| CI inclusion | The new guard must run through `tools/run-automation-tests.mjs` |

## Loop 51 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| New test | Green | Added `tests/gate5-evidence-template.test.mjs` |
| CI inclusion | Green | Added test to `tools/run-automation-tests.mjs` |
| Wording alignment | Green | Unified `QR / true-device playthrough` in current evidence after the new test caught inconsistent phrasing |

## Loop 51 Validation

| Command | Result |
|---|---|
| `node --test tests\gate5-evidence-template.test.mjs` | Pass; 2/2 |
| `node tools\run-automation-tests.mjs` | Pass; 207/207 |

## Loop 51 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors confirmed the guard does not block future legitimate human `PASS`. | Close Loop 51 as green. |
| P2 | Test hard-codes dated evidence file and phrases, so future legitimate template updates need synchronized test updates. | Accept as intended guardrail cost. |
| P2 | Evidence paths are checked as substrings, not existence/schema. | Convert into Loop 52 path-existence hardening. |

## Next Loop Candidate 52

| Field | Value |
|---|---|
| Candidate goal | Gate 5 evidence path existence hardening |
| Why it matters | A human reviewer should not be sent to broken or stale-looking evidence links |
| No-human path | Extend the Gate 5 evidence test to assert the linked docs, temp artifacts, and visual snapshot directory actually exist |
| Human threshold | Replacing temp automation artifacts with human/device attachments |

## Active Loop 52

| Field | Value |
|---|---|
| Loop goal | Gate 5 evidence path existence hardening |
| Main-agent local task | Extend the Gate 5 evidence test to assert listed docs/temp artifacts/screenshot directory exist |
| Task agent | Main agent executed directly because this was a small test hardening |
| Audit agent | Boyle and Plato |
| Human decision threshold | Replacing temp automation artifacts with human/device attachments |

## Loop 52 Acceptance Target

| Requirement | Target |
|---|---|
| Broken-link prevention | Every path listed in current automation evidence must exist locally |
| CI inclusion | The path guard must pass through `tools/run-automation-tests.mjs` |
| Evidence boundary | Existence checks must not claim freshness or device proof |

## Loop 52 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Path existence | Green | `tests/gate5-evidence-template.test.mjs` now calls `fs.existsSync()` for listed evidence paths |

## Loop 52 Validation

| Command | Result |
|---|---|
| `node --test tests\gate5-evidence-template.test.mjs` | Pass; 2/2 |
| `node tools\run-automation-tests.mjs` | Pass; 207/207 |

## Loop 52 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors accepted path existence as useful and not overclaiming Gate 5. | Close Loop 52 as green. |
| P2 | The test is coupled to generated `temp/` artifacts and CI ordering. | Accept for this release-evidence gate because `run-automation-tests` already verifies WeChat output before this test. |
| P2 | `existsSync` proves presence but not freshness. | Convert into Loop 53 numeric freshness hardening. |

## Next Loop Candidate 53

| Field | Value |
|---|---|
| Candidate goal | Gate 5 automation evidence numeric freshness |
| Why it matters | The reviewer-facing evidence file includes package numbers; they should match the current size report rather than silently going stale |
| No-human path | Extend the Gate 5 evidence test to read `temp/wechat-size-report.json` and verify documented main package, total size, and remote script count |
| Human threshold | Replacing automation numbers with human/device observations |

## Active Loop 53

| Field | Value |
|---|---|
| Loop goal | Gate 5 automation evidence numeric freshness |
| Main-agent local task | Extend the evidence test so reviewer-facing package numbers must match `temp/wechat-size-report.json` |
| Task agent | Main agent executed directly because this was a small test hardening |
| Audit agent | Boyle and Plato |
| Human decision threshold | Replacing automation numbers with human/device observations |

## Loop 53 Acceptance Target

| Requirement | Target |
|---|---|
| Size freshness | Current automation evidence must match hard cap, warning threshold, main package, total output, and budget margin from the current size report |
| Remote safety | Current automation evidence must match `remoteScriptCount` from the current size report |
| CI inclusion | The numeric freshness guard must pass through `tools/run-automation-tests.mjs` |

## Loop 53 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Numeric freshness | Green | `tests/gate5-evidence-template.test.mjs` reads `temp/wechat-size-report.json` and compares documented numbers |

## Loop 53 Validation

| Command | Result |
|---|---|
| `node --test tests\gate5-evidence-template.test.mjs` | Pass; 3/3 |
| `node tools\run-automation-tests.mjs` | Pass; 208/208 |

## Loop 53 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | Continue without human escalation. |
| P1 | None. Auditors accepted the numeric freshness scope and no missing critical package numbers. | Close Loop 53 as green. |
| P2 | The guard is coupled to generated `temp/wechat-size-report.json`. | Accept because this is explicitly an automation-evidence freshness gate. |
| P2 | It does not independently re-derive package contents or replace DevTools/true-device proof. | Keep WeChat verify and human Gate 5 evidence as separate layers. |

## Next Loop Candidate 54

| Field | Value |
|---|---|
| Candidate goal | Full CI re-run after Gate 5 evidence guard additions |
| Why it matters | New evidence tests are now in node automation; the whole local CI chain should prove they coexist with WeChat verify, preview smoke, first-session journey, and visual baselines |
| No-human path | Run `npm run test:ci`, record results, and audit remaining human-only blockers |
| Human threshold | DevTools simulator / true-device / final style approval |

## Active Loop 54

| Field | Value |
|---|---|
| Loop goal | Full CI re-run after Gate 5 evidence guard additions |
| Main-agent local task | Re-run the full local CI chain after adding Gate 5 evidence guards |
| Task agent | Main agent executed directly because this was a verification loop |
| Audit agent | Boyle and Plato |
| Human decision threshold | DevTools simulator / true-device / final style approval |

## Loop 54 Acceptance Target

| Requirement | Target |
|---|---|
| Node automation | New Gate 5 evidence tests must run in the node automation set |
| WeChat verify | Current build output must stay fresh and under 4MB |
| Preview smoke | Preview smoke must still pass |
| First-session journey | Full touch-first journey must still pass |
| Visual baselines | Initial visual snapshots must still pass |

## Loop 54 Implementation Result

| Area | Result | Evidence |
|---|---|---|
| Full CI | Green | `npm run test:ci` passed end-to-end |
| Node automation | Green | 208/208 |
| WeChat verify | Green | Fresh for 2710 inputs; main package `2,541,479` bytes; total output `2,687,304` bytes |
| Preview smoke | Green | 9/9 |
| First-session journey | Green | 1/1 |
| Visual initial | Green | 9/9 |

## Loop 54 Validation

| Command | Result |
|---|---|
| `npm run test:ci` | Pass; node 208/208, WeChat verify fresh, preview smoke 9/9, first-session journey 1/1, visual initial 9/9 |

## Loop 54 Adversarial Post-Audit Findings

| Priority | Finding | Harness response |
|---|---|---|
| P0 | None. Boyle and Plato both returned GO. | No automated blocker remains in this harness slice. |
| P1 | None. Auditors found no overclaim and no need to refresh build again. | Close Loop 54 as green. |
| P2 | Evidence guards remain coupled to current `temp/` and build artifact structure. | Accept; future build structure changes must update guards. |
| P2 | Automation evidence is not final Gate 5 `PASS`. | Stop at human threshold for simulator/true-device/final visual approval. |

## Human Threshold Reached After Loop 54

| Field | Value |
|---|---|
| Automated status | Green for the current harness slice |
| Remaining blockers | WeChat DevTools simulator real load, QR / true-device playthrough, final cute-style scorecard, final Chinese copy approval, final monster naming approval |
| Why no further no-human loop now | Continuing to mark Gate 5 or style as complete would overclaim human/device/aesthetic evidence that automation cannot produce |
