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
| I2-010 | todo | 启动 `player redesign track` 第一轮 | concept / paperdoll / key pose 方向说明 | 不是 live 替换，而是可评审的角色方向候选 |

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
