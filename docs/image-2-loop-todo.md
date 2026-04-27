# Image 2.0 Loop Todo

日期：2026-04-24

这份文档只放“可执行事项”，不混入长篇经验和历史叙述。

状态约定：

- `todo`：还没开始
- `doing`：当前 loop 正在做
- `blocked`：被外部条件卡住
- `done`：已完成且证据落地

优先级约定：

- `P0`：当前主链路阻断项
- `P1`：下一步强相关项
- `P2`：重要但可延后

## P0

| ID | 状态 | 事项 | 交付物 | 完成标准 |
| --- | --- | --- | --- | --- |
| I2-001 | done | 把 prompt playbook 物化成 prompt library 文件 | `temp/image2/prompt-library/...` | 至少拆出 global、negative、type、by-key 四层 |
| I2-002 | done | 落地 `tools/image2-build-contact-sheet.mjs` 脚手架 | 脚本 + 最小输入输出约定 | 能对一个批次目录生成 contact sheet 或可扩展骨架 |
| I2-003 | done | 落地 `tools/image2-screen-candidates.mjs` 脚手架 | 脚本 + screening report 格式 | 至少输出硬筛字段和 style score 占位结构 |
| I2-004 | done | 落地 `assets/configs/asset_binding_candidate_manifest_image2.json` | staging manifest | 能承载候选绑定，不污染 live manifest |

## P1

| ID | 状态 | 事项 | 交付物 | 完成标准 |
| --- | --- | --- | --- | --- |
| I2-005 | done | 跑环境语法 Batch 01 第一轮候选 | `outdoor_wall_* / outdoor_path_cobble / outdoor_ground_flowers` 候选图和 job 描述 | 至少每个 key 有可评审候选 |
| I2-006 | doing | 产出环境语法批次的 screening report | contact sheet + style scorecard + 对抗审核 | 能据此决定晋升、回退或继续迭代 |
| I2-007 | done | 做候选 overlay 预览接线 | 运行时 preview 开关或 staging 叠加逻辑 | 不改 live binding 也能进场景预览 |
| I2-008 | done | 把环境语法批次重新跑 `verify:wechat` 与 `test:wechat:playthrough` | `temp/wechat-size-report.json` + `temp/wechat-runtime-playthrough-evidence.json` | 候选进场后主链路仍绿 |

## P1.5

| ID | 状态 | 事项 | 交付物 | 完成标准 |
| --- | --- | --- | --- | --- |
| I2-009 | todo | 准备交互道具批次的参考图/编辑模式策略 | 每个 key 的 `generate` / `edit` 建议 | `checkpoint`、`portal`、`barrier_*`、`pickup_relic` 明确策略 |
| I2-010 | doing | 启动 `player redesign track` 第一轮 | concept / paperdoll / key pose 方向说明 | 不是 live 替换，而是可评审的角色方向候选 |

## P2

| ID | 状态 | 事项 | 交付物 | 完成标准 |
| --- | --- | --- | --- | --- |
| I2-011 | todo | 建立 `Image 2.0` 候选批次命名规范 | `batchId` / job 目录规则 | 后续批次和证据路径统一 |
| I2-012 | todo | 建立抗 IP 近似检查清单 | reviewer checklist | 高风险资产审核时可复用 |
| I2-013 | todo | 给 HUD / `boss_core` / 场景大图定义更高采用门槛模板 | 审核模板 | 高风险专项不再临时决定规则 |

## 本轮建议

如果下一轮直接继续，默认把以下三项串成一个 loop：

1. 基于真实 Batch 01 候选补齐 `I2-006` 的 manual style scorecard、场景人工审阅和对抗审核
2. 对未达 `>= 12/16` 或仍显著像 placeholder 的 key 继续迭代 prompt / edit
3. 只在明确需要窗口级截图时才附加 GUI smoke，日常 loop 继续以 `verify:wechat` + `test:wechat:playthrough` 为主

补充说明：

- `I2-005`、`I2-007`、`I2-008` 现在都已有真实 Batch 01 候选证据支撑。
- 当前真正没收口的是 `I2-006`，因为 manual style score、对抗审核和场景人工审阅还没补齐。
- GUI smoke 不是默认 gate；它会抢焦点 / 抢鼠标，只能在确实需要窗口级补充证据时再用。

## Loop 04 update

- `I2-006` remains `doing`.
- Batch 01 manual-review evidence now exists at:
  - `temp/image2/evidence/real-image2-env-batch-01/style-scorecard.json`
  - `temp/image2/evidence/real-image2-env-batch-01/scene-review.json`
  - `temp/image2/evidence/real-image2-env-batch-01/adversarial-review.json`
- Batch 01 is not promoted because `outdoor_ground_flowers` and `outdoor_wall_cracked` received P1 redo findings in adversarial review.
- The next concrete target is `temp/image2/jobs/2026-04-24-env-batch-02/prompts.json`.
- Daily WeChat proof stays non-GUI: `verify:wechat` plus `test:wechat:playthrough`.

## Loop 06 update

- `I2-006` remains `doing`.
- Batch 01 preview staging no longer uses raw `512x512` review images as runtime tiles.
  - `outdoor_ground_*` and `outdoor_path_*` preview assets now materialize as `32x32`.
  - `outdoor_wall_*` preview assets now materialize as `64x64`.
- The non-GUI WeChat gate is still green on the semantic tile path:
  - `verify:wechat` passed with main package `2,611,732 bytes`
  - `test:wechat:playthrough` passed on `build/wechatgame-staging-20260424122909`
- Runtime-probe hygiene is now part of the default loop baseline:
  - websocket probe bootstrap must be cleaned after playthrough
  - default runtime probe must not run modal-dismiss helpers
  - `reload:wechat` is back to green and should be preferred over restart when refreshing the already-open DevTools session
- The real remaining blocker is still content quality, not harness stability:
  - `outdoor_ground_flowers`
  - `outdoor_wall_cracked`
- The next concrete target remains `temp/image2/jobs/2026-04-24-env-batch-02/prompts.json`.

## Loop 07 update

- `I2-006` remains `doing`.
- `reload:wechat` now scrubs stale runtime-probe bootstrap from every `build/wechatgame*` output before opening the latest build, because legacy staging directories can still poison a live DevTools session.
- The user-facing `ws://127.0.0.1:37991` spam should now be treated as resolved harness residue unless a newly cleaned build reproduces it again.
- Batch 02 prompt semantics are now tightened:
  - `outdoor_ground_flowers` must read as a large repeatable floor surface, not a decorative square patch
  - `outdoor_wall_cracked` must read as modular damaged wall material, not a full-frame texture card
- The non-GUI WeChat gate is temporarily yellow:
  - `node --test tests/wechat-build-policy.test.mjs` passed
  - `npm run test:typecheck` passed
  - `npm run reload:wechat` passed and cleaned stale bootstrap
  - latest `npm run test:wechat:playthrough` blocked waiting for runtime `hello` after non-GUI `close --project -> open`
- The next concrete target is:
  1. restore a green `test:wechat:playthrough` on the cleaned non-GUI path
  2. continue `temp/image2/jobs/2026-04-24-env-batch-02/prompts.json`

## Loop 08 update

- `I2-006` remains `doing`.
- The non-GUI WeChat gate is green again on the stable `build/wechatgame` path:
  - `build:wechat` reclaimed `build/wechatgame`
  - `verify:wechat` passed with main package `2,854,643 bytes`
  - `reload:wechat` reopened `build/wechatgame`
  - `test:wechat:playthrough` passed with `WECHAT_RUNTIME_PROBE_FORCE_REOPEN=0`
- Default runtime-proof policy is now tightened in code, not only in notes:
  - `test:wechat:playthrough` defaults to no forced reopen
  - `rebuild:wechat` now pre-closes all known `build/wechatgame*` project paths so older open projects do not keep forcing timestamped build outputs
- `breakable_target` now has a real candidate-preview binding and is no longer a pure placeholder target.
- The next concrete target is to continue unresolved live placeholders without reopening the WeChat harness problem:
  1. `outdoor_ground_green`
  2. `outdoor_ground_ruins`
  3. `boss_core`
  4. `boss_shield_closed`
  5. `boss_shield_open`

## Loop 09 update

- `I2-006` remains `doing`, but the runtime evidence gap is now much narrower:
  - scene regeneration must be run with `IMAGE2_CANDIDATE_PREVIEW=1`, otherwise candidate-preview bindings silently fall back to the live placeholder manifest
  - `SpriteVisualSkin.setPlaceholderLabelVisible()` now hides sibling label nodes when a controller targets a `*-Visual` node
  - scene generation now feeds texture-backed candidate previews into `BossVisualController`, `EnemyVisualController`, `PlayerVisualController`, and `BreakableTarget` consistently
- The non-GUI WeChat gate is green with the candidate overlay enabled:
  - `build:wechat:config` passed
  - `build:wechat` passed with tolerated Creator exit `36`
  - `verify:wechat` passed with main package `2,854,937 bytes`
  - `test:wechat:playthrough` passed
  - `temp/wechat-runtime-probe-evidence.json` now reports `activePlaceholderBindings = 0`
- With candidate overlay applied, the remaining merged-manifest placeholders are only the intentionally procedural high-risk UI keys:
  - `hud_top_bar`
  - `objective_card`
  - `controls_card`
  - `touch_*`
  - `pause_button`
- `I2-010` is now active:
  - `temp/image2/jobs/2026-04-24-player-track-01/prompts.json`
  - `temp/image2/candidates/player/2026-04-24-player-track-01/player_direction_a_cape_v00.png`
  - `temp/image2/candidates/player/2026-04-24-player-track-01/player_direction_b_skirt_v00.png`
  - `temp/image2/evidence/2026-04-24-player-track-01/review.json`
  - Direction A was selected for the next iteration
  - `temp/image2/jobs/2026-04-24-player-track-02/prompts.json`
  - `temp/image2/candidates/player/2026-04-24-player-track-02/player_direction_a_paperdoll_v00.png`
  - `temp/image2/evidence/2026-04-24-player-track-02/review.json`
  - `temp/image2/jobs/2026-04-24-player-track-03/prompts.json`
  - `temp/image2/candidates/player/2026-04-24-player-track-03/player_direction_a_runtime_sheet_v00.png`
  - `temp/image2/evidence/2026-04-24-player-track-03/review.json`

## Loop 10 update

- `I2-010` stays `doing`.
- Preview-only bridge files are now in place:
  - `assets/configs/asset_binding_candidate_manifest_image2.json`
  - `assets/art/generated/image2-preview/player_preview/player_preview_v00.png`
  - `assets/scenes/PlayerPreview.scene`
  - `tests/player-preview-bridge.test.mjs`
- Live `player` binding remains unchanged; this is only the in-game preview hook.

## Loop 11 update

- `I2-010` stays `doing`.
- `player_preview` is now visible in normal gameplay scenes under candidate-preview generation, not only in `PlayerPreview.scene`:
  - `Player` nodes in `StartCamp` and `MechanicsLab` now carry `AssetBindingTag(bindingKey = player_preview, status = candidate_preview)`
  - latest `temp/wechat-runtime-probe-evidence.json` shows `Player -> player_preview` during actual non-GUI WeChat runtime snapshots
- `I2-006` stays `doing`.
- Echo summon line is confirmed wired, but still needs presentation tuning:
  - `echo_box`
  - `echo_spring_flower`
  - `echo_bomb_bug`
- `echo_bomb_bug` does not currently have a repeat-explosion logic regression; Playwright `bomb bug disappears after fuse explosion` is green.
- The non-GUI WeChat gate is green on this loop's player-preview bridge:
  - `verify:wechat` passed on `build/wechatgame-staging`
  - `test:wechat:playthrough` passed
  - `temp/wechat-runtime-probe-evidence.json` records `Player` as `candidate_preview`
- Current caution:
  - `temp/wechat-size-report.json` shows main package `4,173,005` bytes, only `21,299` bytes under the `4 MB` hard budget
- The next concrete target is:
  1. tune object-like framing for `echo_box` / `echo_spring_flower` / `echo_bomb_bug`
  2. keep `player_preview` gameplay bridge green without touching live `player`
  3. avoid regressing the non-GUI WeChat gate while iterating on presentation

## Adversarial checkpoint

- Do not stop the loop just because the preview bridge exists in `PlayerPreview.scene` or in gameplay scenes under `candidate_preview`.
- Do not stop the loop because GUI smoke was skipped, noisy, or failed; it is evidence-only.
- Do not stop the loop on DevTools stderr noise alone (`game.json code 10`, `ws://127.0.0.1:37991`, trust-modal chatter).
- If a full DevTools restart is used, the reopen is incomplete until `信任并运行` is handled.
- Do not promote live `player` from a single generated image; keep the redesign track separate until the plan's player gates are met.
## Loop 12 update

- `I2-006` stays `doing`.
- `I2-010` stays `doing`.
- The non-GUI WeChat gate is green again on the default in-place path:
  - `temp/wechat-runtime-probe-evidence.json` returned `hello` and a `command-result`
  - `temp/wechat-runtime-playthrough-evidence.json` passed the 19-step default `run-sequence`
  - `temp/wechat-size-report.json` remains under the 4 MB hard cap
- Echo framing is now good enough to treat as bounded object presentation, not textured-card placeholder behavior:
  - `echo_box`
  - `echo_spring_flower`
  - `echo_bomb_bug`
- `player_preview` stays a preview bridge only. It can appear in gameplay runtime under candidate preview, but that does not finish the `player` redesign gate.
- Why we still cannot stop:
  - the player redesign track is not finished
  - the remaining image2 iteration work is still open
  - GUI smoke remains evidence-only, not the main gate
- Next loop target:
  - keep only the echo/player framing cleanup path active, and do not touch live `player`

## Player track 05 archive

- Status: done for archive, not done for promotion.
- `temp/image2/jobs/2026-04-25-player-track-05/prompts.json` and `temp/image2/prompt-library/by-key/player_redesign_track_05_direction_a_single_sprite.txt` are complete enough to support the archive.
- `temp/image2/candidates/player/2026-04-25-player-track-05/player_preview_v00.png` is the archived candidate image.
- `temp/image2/evidence/2026-04-25-player-track-05/review.json` records the honest provenance:
  - the image is now a derived crop applied to `assets/art/generated/image2-preview/player_preview/player_preview_v00.png`
  - the crop source is `temp/image2/candidates/player/2026-04-24-player-track-03/player_direction_a_runtime_sheet_v00.png`
  - it is not a fresh generation in this task
  - it must not be treated as a live `player` bind
- Next action, if the redesign track continues, is to produce a genuinely new candidate or a stricter modular redraw; do not promote this archive by itself.

## Loop 13 update

- `I2-010` stays `doing`.
- `player_preview` bridge has been refreshed to use a more gameplay-like top-down crop derived from Track 03 instead of the earlier front-facing archive crop.
- `assets/configs/asset_binding_candidate_manifest_image2.json` now points the `player_preview` candidate provenance at:
  - `temp/image2/candidates/player/2026-04-25-player-track-05/player_preview_v00.png`
  - `temp/image2/evidence/2026-04-25-player-track-05/review.json`
- `I2-006` stays `doing`.
- Echo presentation is not fully closed after all:
  - `echo_box` remains a hard gap because the current preview bridge art is only `10x13`
  - `echo_spring_flower` remains acceptable
  - `echo_bomb_bug` needs better current close evidence before calling it finished
- Why we still cannot stop:
  - `player` is still on the redesign track and has not reached final look signoff
  - `echo_box` still fails the "not显著像 placeholder / micro-bridge" presentation bar
  - the refreshed `player_preview` bridge is now runtime-proven again, but that proof does not finish the redesign track or the unresolved summon-object presentation work
- Next loop target:
  1. continue with `echo_box` source-side size/framing cleanup
  2. keep the refreshed `player_preview` bridge green on the stable non-GUI WeChat path
  3. only then reassess whether `echo_bomb_bug` still needs an additional close-evidence pass

## Loop 14 update

- `I2-006` stays `doing`.
- The current non-GUI WeChat gate is green on the latest tree again:
  - `verify:wechat` passed with main package `3,226,054 bytes`
  - `test:wechat:playthrough` passed with scene route `8/8`
- `echo_box` now has scene-level runtime evidence instead of only staging-tool evidence:
  - `temp/image2/evidence/2026-04-25-echo-box-runtime-spotcheck/MechanicsLab.png`
  - `temp/image2/evidence/2026-04-25-echo-box-runtime-spotcheck/FieldWest.png`
  - `temp/image2/evidence/2026-04-25-echo-box-runtime-spotcheck/report.json`
  - current runtime footprint is a bounded `58x58` world object, not the earlier micro-bridge
- `boss_core` / `boss_shield_*` candidate-preview runtime is confirmed in `BossArena`:
  - `temp/image2/evidence/2026-04-25-boss-preview-spotcheck/BossArena-closed.png`
  - `temp/image2/evidence/2026-04-25-boss-preview-spotcheck/BossArena-open.png`
  - `temp/image2/evidence/2026-04-25-boss-preview-spotcheck/report.json`
  - the boss batch is currently entering runtime through `SpriteFrame` refs, even though live source-scene tests still protect placeholder-only defaults
- `I2-010` stays `doing`.
- Why we still cannot stop:
  - `player` is still on the redesign track and has not reached final signoff
  - the high-risk boss/player content still needs quality/adversarial review; current proof is about runtime coverage, not final art acceptance
- The next concrete target is:
  1. decide whether the current boss batch is visually acceptable enough to stay staged, or whether it needs a fresh image iteration
  2. keep the non-GUI WeChat gate green while doing that review
  3. return to the unfinished `player redesign track` instead of promoting live `player`

## Loop 15 update

- `I2-010` stays `doing`.
- `track-06` is archived as a failed-but-useful fresh generation:
  - it preserved Direction A styling
  - it failed preview-bridge screening because the PNG baked a checkerboard-like opaque background
- `track-07` is now the active preview-only player bridge batch:
  - `assets/art/generated/image2-preview/player_preview/player_preview_v00.png`
  - `temp/image2/candidates/player/2026-04-25-player-track-07/player_preview_v00.png`
  - `temp/image2/evidence/2026-04-25-player-track-07/review.json`
- The new bridge is now proven in gameplay scenes, not only in manifest metadata:
  - `temp/image2/evidence/2026-04-25-preview-spotcheck-track07-refresh/StartCamp.png`
  - `temp/image2/evidence/2026-04-25-preview-spotcheck-track07-refresh/FieldWest.png`
  - `temp/image2/evidence/2026-04-25-preview-spotcheck-track07-refresh/MechanicsLab.png`
- The non-GUI WeChat gate is green again on stable `build/wechatgame`:
  - `verify:wechat` passed with main package `3,193,610 bytes`
  - `test:wechat:playthrough` passed with movement gate green and scene route `8/8`
- Why we still cannot stop:
  - the `player` redesign track is still not final; current proof is only preview-bridge-safe, not live-player-safe
  - the boss family still needs manual quality/adversarial signoff even though runtime coverage exists
  - the interactive object family still needs final scene-level acceptance, not just runtime proof
- Next loop target:
  1. keep `track-07` green while judging whether it is only a temporary preview bridge or strong enough to stay as the best-so-far redesign-track gameplay look
  2. push boss-family quality/adversarial closure
  3. push interactive-object-family quality closure instead of reopening the WeChat harness unless the stable path turns yellow again
