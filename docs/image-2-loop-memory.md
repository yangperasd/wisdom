# Image 2.0 Loop Memory

日期：2026-04-24

这份文档是 `Image 2.0 / gpt-image-2` 重做线的当前工作记忆。

它和 [harness-loop-memory-2026-04-21.md](/E:/cv5/wisdom/docs/harness-loop-memory-2026-04-21.md) 分工不同：

- 这里记录：批次进度、prompt 学习、筛选经验、候选验证边界、对抗审核结论、下一轮目标
- 那里记录：WeChat 构建、DevTools、runtime playthrough、包体、GUI smoke、harness hygiene

不要再把这两条线混写到同一个 memory 里。

## 1. 使用规则

每一轮 `Image 2.0` harness loop 收口时，必须至少更新这 6 类内容：

1. 本轮目标和结果
2. 新发现的 prompt / 审美 / 筛选经验
3. 新增或更新的证据路径
4. 对抗 agent 的结论
5. 下一轮的单一目标
6. [image-2-loop-todo.md](/E:/cv5/wisdom/docs/image-2-loop-todo.md) 的状态变化

如果本轮没有产生上面这些信息，就不算一轮有效推进。

## 2. 默认读取顺序

`Image 2.0` 相关 loop 默认按下面顺序读取上下文：

1. [image-2-remake-plan-2026-04-24.md](/E:/cv5/wisdom/docs/image-2-remake-plan-2026-04-24.md)
2. [image-2-prompt-playbook-2026-04-24.md](/E:/cv5/wisdom/docs/image-2-prompt-playbook-2026-04-24.md)
3. [image-2-loop-memory.md](/E:/cv5/wisdom/docs/image-2-loop-memory.md)
4. [image-2-loop-todo.md](/E:/cv5/wisdom/docs/image-2-loop-todo.md)
5. [AGENTS.md](/E:/cv5/wisdom/AGENTS.md)

只有在本轮涉及 WeChat 构建、runtime、DevTools、包体或 GUI smoke 时，才额外读取：

- [harness-loop-memory-2026-04-21.md](/E:/cv5/wisdom/docs/harness-loop-memory-2026-04-21.md)

## 3. 北极星与固定约束

本线不变的目标：

- 明亮
- 温暖
- 可爱
- 圆润
- 玩具感
- 低噪声
- 顶视角可读
- 小尺寸可读

本线不允许滑回：

- 黑暗地牢
- 脏绿噪点
- 写实裂纹
- 尖锐哥特
- 血腥压迫
- 冷硬金属
- 过重金边
- 混搭 UI / 混搭画风
- 明显可识别的具体商业 IP 复制感

## 4. 当前硬事实

- 当前工程已经适合跑候选替换，不再是“只能纸上谈方案”的状态。
- 当前 `verify:wechat` 和 `test:wechat:playthrough` 都是主链路门，不允许因为换图而绕过。
- 当前主包仍明显低于微信 `4 MB` 硬门，但每一轮候选导入后都要重新校验。
- BossArena 的大块叠框和重叠占位已经缓解，但整体仍属于“可读 placeholder”，不是最终可爱正式稿。
- 大量环境、交互物、敌人、召唤物仍然是 `rect_visual_placeholder`、`temporary_placeholder` 或 `asset_gap`。
- 旧 ComfyUI 资产不应整包迁入；新的主方向是 `Image 2.0 -> 候选 -> 筛选 -> staging -> WeChat 验证 -> 对抗审核 -> 晋升/回退`。

## 5. 当前程序状态

| 轨道 | 状态 | 当前结论 | 下一步 |
| --- | --- | --- | --- |
| 主方案 | Green | 总方案已统一为“都可尝试，采用门槛分层” | 只做增量修订，不再重新发明协议 |
| Prompt playbook | Green | 已物化为 `prompt library + batch prompts.json` | 用它驱动 Batch 01 首轮候选 |
| 候选导入机制 | Green | staging manifest、overlay 读取、外部候选导入 `assets/` 候选区都已落地，且 preview 构建已证实可进 runtime | 用真实 Batch 01 候选写入 candidate manifest |
| 自动筛选 | Yellow | contact sheet / screening / stage 脚本已落地，legacy smoke 已跑通 | 换成真实 `Image 2.0` Batch 01 候选继续跑 |
| 环境语法 Batch 01 | Yellow | job、prompt、smoke 证据已落地，legacy preview 候选已通过 `verify:wechat` 与 `test:wechat:playthrough` | 从 `outdoor_wall_* / outdoor_path_cobble / outdoor_ground_flowers` 的首批真实候选继续 |
| 交互道具批次 | Red | 依赖环境批次先跑通 | 环境批次后启动 |
| `player redesign track` | Yellow | 已明确允许且应该重做，但仍未产出第一轮概念候选 | 先出 concept / paperdoll / key pose 方向 |

## 6. 当前固定采用策略

### 6.1 可以先跑、优先最高

- `outdoor_wall_standard`
- `outdoor_wall_broken`
- `outdoor_wall_cracked`
- `outdoor_path_cobble`
- `outdoor_ground_flowers`

### 6.2 可以跑，但要保留玩法语义

- `checkpoint`
- `portal`
- `breakable_target`
- `pickup_relic`
- `barrier_closed`
- `barrier_open`

### 6.3 允许尝试，但采用门槛更高

- `common_enemy`
- `boss_shield_closed`
- `boss_shield_open`
- `projectile_arrow`
- `echo_spring_flower`
- `echo_bomb_bug`
- `player`
- HUD
- `boss_core`

## 7. 已吸收的经验

### 7.1 Prompt 经验

- 后续 agent 不允许脱离 playbook 现场自由发挥。
- 同类资产必须共享统一前缀和统一负面块。
- 第一轮 prompt 优先锁“大方向正确”，不要一开始堆太多局部细节词。
- `player` 不能按普通单图资产处理，必须走 `player redesign track`。

### 7.2 WeChat / Harness 经验

- `test:wechat:playthrough` 是当前最强的无人值守 WeChat runtime 证据，但不是最终真机手感证据。
- DevTools GUI smoke 不是日常主门，只能做补充证据。
- 活跃 DevTools 会话下，probe / playthrough harness 优先写到 `%TEMP%\\wisdom-wechat-harnesses\\...`。
- 如果结果和代码现状不一致，先怀疑 stale config、recent project、trust modal、runtime cache，再怀疑游戏逻辑。

## 8. 当前默认批次顺序

1. 环境语法 Batch 01
2. 交互道具批次
3. 战斗与召唤批次
4. `player redesign track`
5. 其余高风险专项

## 9. 本轮前的下一步建议

当前最合理的启动顺序：

1. 完成真实 Batch 01 的 manual style scorecard 和对抗审核
2. 只基于 `verify:wechat` + `test:wechat:playthrough` 继续走日常 harness loop
3. 仅当确实需要窗口级补充截图时才附加 GUI smoke，且不能把它当主 gate
4. 对未满足审美门槛的 key 继续迭代 prompt / edit，而不是急着晋升 live binding
5. 环境批次稳定后，再并行开轻量 `player redesign track`

## 10. Loop 记录模板

后续每轮都按这个模板往下追加：

### Loop XX

- 目标：
- 本轮产出：
- 新发现：
- 新证据：
- 对抗结论：
- todo 变化：
- 是否触发人工介入：
- 下一轮目标：

### Loop 00

- 目标：把 `Image 2.0` 这条线从旧的 WeChat harness memory 中拆出来，建立更稳的 memory / todo / plan / agents 分层。
- 本轮产出：
  - 新建 [image-2-loop-memory.md](/E:/cv5/wisdom/docs/image-2-loop-memory.md)
  - 新建 [image-2-loop-todo.md](/E:/cv5/wisdom/docs/image-2-loop-todo.md)
  - 更新 [image-2-remake-plan-2026-04-24.md](/E:/cv5/wisdom/docs/image-2-remake-plan-2026-04-24.md) 的 loop 输入与收口规则
  - 更新 [AGENTS.md](/E:/cv5/wisdom/AGENTS.md) 的 memory 约定
  - 给 [harness-loop-memory-2026-04-21.md](/E:/cv5/wisdom/docs/harness-loop-memory-2026-04-21.md) 增加作用域说明
- 新发现：
  - 旧 `harness-loop-memory` 更适合承载 WeChat runtime / DevTools / 包体 / harness hygiene，不适合继续兼任 `Image 2.0` 专题 memory。
  - `Image 2.0` 这条线最容易遗漏的不是“少了一个 prompt”，而是证据边界、DevTools 环境卫生、以及把临时 workaround 误写成正式流程。
  - 对于持续演进文档，使用不带日期的 living docs 比继续堆新的 dated memory 更稳。
- 新证据：
  - [image-2-loop-memory.md](/E:/cv5/wisdom/docs/image-2-loop-memory.md)
  - [image-2-loop-todo.md](/E:/cv5/wisdom/docs/image-2-loop-todo.md)
  - [image-2-remake-plan-2026-04-24.md](/E:/cv5/wisdom/docs/image-2-remake-plan-2026-04-24.md)
  - [AGENTS.md](/E:/cv5/wisdom/AGENTS.md)
- 对抗结论：建议分离 `memory / todo / plan / agents` 四层；最容易遗漏的 3 个点是证据边界混淆、DevTools 环境卫生遗漏、临时 workaround 被写成正式流程。
- todo 变化：初始化了 `I2-001` 到 `I2-013` 的基础队列，暂未改变执行状态。
- 是否触发人工介入：否。
- 下一轮目标：优先串行推进 `I2-001`、`I2-002`、`I2-003`，也就是 prompt library 物化和 screening 脚手架起步。

### Loop 01

- 目标：完成 `I2-001`、`I2-002`、`I2-003`、`I2-004`，并把“外部生成候选 -> 仓库 candidate preview”这段桥接补上。
- 本轮产出：
  - 新建 `temp/image2/prompt-library/` 四层结构和 `temp/image2/jobs/2026-04-24-env-batch-01/prompts.json`
  - 新建 [tools/image2-build-contact-sheet.mjs](/E:/cv5/wisdom/tools/image2-build-contact-sheet.mjs)
  - 新建 [tools/image2-screen-candidates.mjs](/E:/cv5/wisdom/tools/image2-screen-candidates.mjs)
  - 新建并补强 [tools/image2-stage-candidate-bindings.mjs](/E:/cv5/wisdom/tools/image2-stage-candidate-bindings.mjs)，支持 `--import-root` 把 `assets/` 外候选复制进候选区并自动补 `.meta`
  - 新建 [assets/configs/asset_binding_candidate_manifest_image2.json](/E:/cv5/wisdom/assets/configs/asset_binding_candidate_manifest_image2.json)
  - 更新 [tools/asset-binding-manifest-utils.mjs](/E:/cv5/wisdom/tools/asset-binding-manifest-utils.mjs)，支持 `IMAGE2_CANDIDATE_PREVIEW=1` 时叠加 candidate manifest
  - 新建 [tests/asset-binding-candidate-overlay.test.mjs](/E:/cv5/wisdom/tests/asset-binding-candidate-overlay.test.mjs) 和 [tests/image2-stage-candidate-bindings.test.mjs](/E:/cv5/wisdom/tests/image2-stage-candidate-bindings.test.mjs)
- 新发现：
  - `Codex` 内建图像能力可以承担 `Image 2.0 / gpt-image-2` 生成端；本仓库真正缺的不是本地 `OPENAI_API_KEY` 脚本，而是把外部 PNG 安全导入 candidate preview 链路的桥。
  - `legacy-tile-smoke` 冒烟里，5 个 must-redo key 共 40 张旧候选中有 32 张通过硬筛；`outdoor_path_cobble`、`outdoor_wall_broken`、`outdoor_wall_cracked`、`outdoor_wall_standard` 都是 `8/8` 通过，`outdoor_ground_flowers` 是 `0/8` 通过，主要失败项是 `noise_density` 和 `edge_repeatability`。
  - 如果 `stage` 没有 `--import-root`，任何不在 `assets/` 下的候选都无法进入 preview；这一步已经补齐。
  - 当前 `tests/style-resource-gate.test.mjs` 仍有 2 个现存失败，都是场景标签文案问题，不是这轮 Image 2.0 脚手架引入的回归。
- 新证据：
  - [prompts.json](/E:/cv5/wisdom/temp/image2/jobs/2026-04-24-env-batch-01/prompts.json)
  - [contact-sheet.png](/E:/cv5/wisdom/temp/image2/evidence/legacy-tile-smoke/contact-sheet.png)
  - [contact-sheet.json](/E:/cv5/wisdom/temp/image2/evidence/legacy-tile-smoke/contact-sheet.json)
  - [screening-report.json](/E:/cv5/wisdom/temp/image2/evidence/legacy-tile-smoke/screening-report.json)
  - [asset_binding_candidate_manifest_image2.json](/E:/cv5/wisdom/assets/configs/asset_binding_candidate_manifest_image2.json)
- 对抗结论：
  - `legacy-tile-smoke` 只能证明工具链和筛选阈值开始工作，不能把旧 ComfyUI 候选误记成真实 `Image 2.0` Batch 01 通过。
  - 本轮未达到批次通过标准，也未触发真正需要人工拍板的产品级分叉，所以 loop 不应停止，应该继续推进 Batch 01 的真实候选入仓与验证。
- todo 变化：
  - `I2-001` -> `done`
  - `I2-002` -> `done`
  - `I2-003` -> `done`
  - `I2-004` -> `done`
  - `I2-005` -> `doing`
  - `I2-006` -> `doing`
  - `I2-007` -> `doing`
- 是否触发人工介入：否。
- 下一轮目标：把 `Codex` 内建图像能力产出的 Batch 01 首批真实 PNG 导入 `candidate preview` 链路，随后再跑 `verify:wechat` 和 `test:wechat:playthrough`。

### Loop 02

- 目标：验证 `candidate preview overlay` 真的能穿过 WeChat 构建、包体校验和 runtime playthrough，而不是只停在脚本层 dry-run。
- 本轮产出：
  - 用 [tools/image2-stage-candidate-bindings.mjs](/E:/cv5/wisdom/tools/image2-stage-candidate-bindings.mjs) 把 4 个 legacy 通过项导入 [asset_binding_candidate_manifest_image2.json](/E:/cv5/wisdom/assets/configs/asset_binding_candidate_manifest_image2.json)
  - 在 `assets/art/generated/image2-preview/` 下落地 `outdoor_path_cobble`、`outdoor_wall_broken`、`outdoor_wall_cracked`、`outdoor_wall_standard` 的 preview 候选及 `.meta`
  - 带 `IMAGE2_CANDIDATE_PREVIEW=1` 跑通 `build:wechat:config`、`build:wechat`、`verify:wechat`、`test:wechat:playthrough`
- 新发现：
  - `candidate preview overlay` 不只是读 manifest 成功，而是真的会穿过场景生成、构建输出和 runtime harness。
  - 当前 preview 导入的 4 个 key 没有把 WeChat 主链路打坏；`verify:wechat` 仍过，`test:wechat:playthrough` 仍过。
  - 这一步依然只是 preview 链路验证，不等于真实 `Image 2.0` Batch 01 已通过，因为 `outdoor_ground_flowers` 仍没有通过候选，而且本轮导入的是 legacy 候选，不是首批真实 `gpt-image-2` 产物。
  - `build:wechat` 末尾仍有当前环境里常见的 `project.log` `EPERM` / GPU cache 噪音，以及 Cocos Creator `code 36 tolerated non-zero`；是否绿仍应以后续 `verify:wechat` 为准，本轮该门已通过。
- 新证据：
  - [asset_binding_candidate_manifest_image2.json](/E:/cv5/wisdom/assets/configs/asset_binding_candidate_manifest_image2.json)
  - `assets/art/generated/image2-preview/...`
  - [wechat-size-report.json](/E:/cv5/wisdom/temp/wechat-size-report.json)
  - [wechat-runtime-playthrough-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-playthrough-evidence.json)
- 对抗结论：
  - 这轮证明的是“preview candidate 不会自动破坏主链路”，不是“环境语法 Batch 01 已通过”。
  - 停止条件仍未满足，因为还缺：
    - 真实 `Image 2.0` / `gpt-image-2` Batch 01 PNG 入仓
    - `outdoor_ground_flowers` 的可评审候选
    - style score `>= 12/16`
    - 场景里“不再显著像 placeholder”的人工审阅证据
- todo 变化：
  - `I2-007` -> `done`
  - `I2-008` 保持 `todo`，因为本轮通过的是 legacy preview 验证，不是完整真实 Batch 01 验证
- 是否触发人工介入：否。
- 下一轮目标：继续把首批真实 `Image 2.0` Batch 01 PNG 导入仓库，尤其优先补 `outdoor_ground_flowers`，然后基于真实候选重跑 screening 和 WeChat 主链路。

### Loop 03

- 目标：把 5 个 `must-redo` key 的真实 `Image 2.0` 候选落进 Batch 01，并用非 GUI 主链验证它们是否真的能穿过 WeChat harness。
- 本轮产出：
  - 用 `Codex` 内建图像能力生成并落地 5 个真实候选到 `temp/image2/candidates/<bindingKey>/2026-04-24-env-batch-01/`
  - 产出真实 Batch 01 的 contact sheet 和统一 screening report
  - 用 [tools/image2-stage-candidate-bindings.mjs](/E:/cv5/wisdom/tools/image2-stage-candidate-bindings.mjs) 把 5 个真实候选导入 [asset_binding_candidate_manifest_image2.json](/E:/cv5/wisdom/assets/configs/asset_binding_candidate_manifest_image2.json) 和 `assets/art/generated/image2-preview/...`
  - 带 `IMAGE2_CANDIDATE_PREVIEW=1` 重跑 `build:wechat:config`、`build:wechat`、`verify:wechat`、`test:wechat:playthrough`
  - 额外试跑了一次 DevTools GUI smoke 作为补充窗口证据采样，并把失败原因记录下来
- 新发现：
  - `Codex` 内建生成图片会真实落盘到 `C:\\Users\\yangp\\.codex\\generated_images\\<thread-id>\\*.png`，所以这条链不需要仓库内 `OPENAI_API_KEY` 脚本就能把真实 `Image 2.0` PNG 接进 staging。
  - 这轮 5 个真实 Batch 01 候选都通过了硬筛，包含之前 legacy smoke 里 `0/8` 的 `outdoor_ground_flowers`。
  - 带真实候选的 preview overlay 仍能通过 `verify:wechat` 和 `test:wechat:playthrough`，说明非 GUI 主链没有被这批候选打坏。
  - GUI smoke 虽然抓到了窗口级截图，但运行时断言仍失败；它会抢焦点 / 抢鼠标，而且对 UI 命中和动作证明都不稳定，正好反证它不能作为日常 loop 主门。
- 新证据：
  - [contact-sheet.png](/E:/cv5/wisdom/temp/image2/evidence/real-image2-env-batch-01/contact-sheet.png)
  - [contact-sheet.json](/E:/cv5/wisdom/temp/image2/evidence/real-image2-env-batch-01/contact-sheet.json)
  - [screening-report.json](/E:/cv5/wisdom/temp/image2/evidence/real-image2-env-batch-01/screening-report.json)
  - [asset_binding_candidate_manifest_image2.json](/E:/cv5/wisdom/assets/configs/asset_binding_candidate_manifest_image2.json)
  - [wechat-size-report.json](/E:/cv5/wisdom/temp/wechat-size-report.json)
  - [wechat-runtime-playthrough-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-playthrough-evidence.json)
  - [wechat-gui-runtime-smoke-evidence.json](/E:/cv5/wisdom/temp/wechat-gui-runtime-smoke-evidence.json)
- 对抗结论：
  - 这轮证明的是“真实 Batch 01 候选已经进入并通过了非 GUI WeChat 主链验证”，不是“Batch 01 已整体通过”。
  - 停止条件仍未满足，因为还缺：
    - manual style score 是否达到 `>= 12/16`
    - 对抗审核结论是否允许晋升
    - 场景里“已不再明显像 placeholder”的人工审阅结论
  - GUI smoke 应该降回可选补充项；除非明确需要窗口级截图证据，否则后续 loop 不再使用鼠标驱动 DevTools 作为默认动作。
- todo 变化：
  - `I2-005` -> `done`
  - `I2-006` 保持 `doing`
  - `I2-008` -> `done`
- 是否触发人工介入：否，当前仍未出现必须立即做产品级拍板的分叉。
- 下一轮目标：补齐 5 个真实候选的 manual style scorecard、对抗审核和场景人工审阅，再决定哪些 key 继续迭代、哪些 key 具备晋升条件。
### Loop 04

- Goal: close the Batch 01 manual-review gate and decide pass, redo, or human-stop.
- Outputs:
  - `temp/image2/evidence/real-image2-env-batch-01/style-scorecard.json`
  - `temp/image2/evidence/real-image2-env-batch-01/scene-review.json`
  - `temp/image2/evidence/real-image2-env-batch-01/adversarial-review.json`
  - `temp/image2/evidence/real-image2-env-batch-01/scene-preview/StartCamp.png`
  - `temp/image2/evidence/real-image2-env-batch-01/scene-preview/FieldWest.png`
  - `temp/image2/evidence/real-image2-env-batch-01/scene-preview/FieldRuins.png`
  - `temp/image2/evidence/real-image2-env-batch-01/scene-preview/BossArena.png`
  - `temp/image2/jobs/2026-04-24-env-batch-02/prompts.json`
  - updated `docs/image-2-prompt-playbook-2026-04-24.md`
  - updated `temp/image2/prompt-library/by-key/outdoor_ground_flowers.txt`
  - updated `temp/image2/prompt-library/by-key/outdoor_wall_cracked.txt`
- New findings:
  - Batch 01 now has recorded manual scores for all five must-redo keys; all clear the numeric threshold, but not all clear adversarial signoff.
  - Scene review shows that the five target keys no longer read as obvious placeholder art in StartCamp, FieldWest, FieldRuins, and BossArena preview captures.
  - Runtime evidence still confirms candidate-preview adoption for the active preview bindings during WeChat runtime probing.
  - Adversarial review does not clear the batch for promotion: `outdoor_path_cobble` is the strongest pass, `outdoor_ground_flowers` is too busy as a dominant floor, and `outdoor_wall_cracked` is too close to `outdoor_wall_standard` at mobile scale.
  - The remaining blockers are still prompt-iteration problems, not a mandatory human-only product fork, so the harness loop must continue.
- New evidence:
  - `temp/image2/evidence/real-image2-env-batch-01/style-scorecard.json`
  - `temp/image2/evidence/real-image2-env-batch-01/scene-review.json`
  - `temp/image2/evidence/real-image2-env-batch-01/adversarial-review.json`
  - `temp/image2/evidence/real-image2-env-batch-01/scene-preview/*.png`
  - `temp/wechat-runtime-probe-evidence.json`
  - `temp/wechat-runtime-playthrough-evidence.json`
  - `temp/wechat-size-report.json`
- Adversarial conclusion:
  - No P0 blockers were found.
  - P1 redo findings remain on `outdoor_ground_flowers` and `outdoor_wall_cracked`.
  - Do not promote Batch 01 into live bindings.
- Todo change:
  - `I2-006` stays `doing`.
  - Batch 02 is now defined as a targeted retry for `outdoor_ground_flowers` and `outdoor_wall_cracked`.
- Human intervention triggered: no.
- Next loop goal: generate, screen, and stage `2026-04-24-env-batch-02` for `outdoor_ground_flowers` and `outdoor_wall_cracked`, then re-run the non-GUI WeChat gate.

### Loop 05

- Goal: stop reading the environment candidates as "textured slabs on top of placeholders" by fixing scene semantics, then re-run the non-GUI WeChat gate.
- Outputs:
  - updated [generate-week2-scenes.mjs](/E:/cv5/wisdom/tools/generate-week2-scenes.mjs)
  - regenerated `StartCamp.scene`, `FieldWest.scene`, `FieldRuins.scene`, `BossArena.scene`
  - updated [content-scenes.test.mjs](/E:/cv5/wisdom/tests/content-scenes.test.mjs)
  - updated [player-visibility-motion.spec.mjs](/E:/cv5/wisdom/tests/player-visibility-motion.spec.mjs)
  - updated [boss-fight-flow.spec.mjs](/E:/cv5/wisdom/tests/boss-fight-flow.spec.mjs)
  - new preview captures under `temp/image2/evidence/real-image2-env-batch-01/scene-preview-layout-pass-02/`
- New findings:
  - The visual blocker was not only candidate quality. `StartCamp`, `FieldWest`, and `FieldRuins` were still dominated by `outdoor_ground_green` / `outdoor_ground_ruins` transition placeholders, so Image 2 candidate tiles still read as textured rectangles sitting on top of a placeholder base.
  - Rebinding the scene backdrops and surface strips to candidate floor/path/wall tiles, and turning the routes into continuous floor bands, removed the obvious "big textured block" read in headless preview evidence.
  - After regenerating scene JSON, the preview server continued serving stale scene cache until `http://127.0.0.1:7456/asset-db/refresh` was called.
  - The first non-GUI WeChat playthrough failure was harness hygiene, not scene logic. One run connected to a stale harness project; a later run showed a blank white DevTools window and no runtime probe hello. Cleaning the DevTools process tree restored the harness.
- New evidence:
  - [StartCamp.png](/E:/cv5/wisdom/temp/image2/evidence/real-image2-env-batch-01/scene-preview-layout-pass-02/StartCamp.png)
  - [FieldWest.png](/E:/cv5/wisdom/temp/image2/evidence/real-image2-env-batch-01/scene-preview-layout-pass-02/FieldWest.png)
  - [FieldRuins.png](/E:/cv5/wisdom/temp/image2/evidence/real-image2-env-batch-01/scene-preview-layout-pass-02/FieldRuins.png)
  - [BossArena.png](/E:/cv5/wisdom/temp/image2/evidence/real-image2-env-batch-01/scene-preview-layout-pass-02/BossArena.png)
  - [wechat-size-report.json](/E:/cv5/wisdom/temp/wechat-size-report.json)
  - [wechat-runtime-probe-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-probe-evidence.json)
  - [wechat-runtime-playthrough-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-playthrough-evidence.json)
- Adversarial conclusion:
  - Scene geometry / tiling semantics are no longer the main blocker for Batch 01 preview adoption.
  - Batch 01 is still not promotable because content-quality blockers remain on `outdoor_ground_flowers` and `outdoor_wall_cracked`.
- Todo change:
  - `I2-006` stays `doing`, but the remaining blocker is now candidate content quality rather than scene geometry or WeChat preview/runtime integration.
- Human intervention triggered: no.
- Next loop goal: generate and review `2026-04-24-env-batch-02` retries for `outdoor_ground_flowers` and `outdoor_wall_cracked` using the new scene geometry baseline.

### Loop 06

- Goal: remove the remaining harness noise from Batch 01 preview adoption and stop staging raw `512x512` review candidates as runtime tiles before continuing Batch 02.
- Outputs:
  - updated [WechatDevtoolsRuntimeProbe.ts](/E:/cv5/wisdom/assets/scripts/qa/WechatDevtoolsRuntimeProbe.ts)
  - updated [run-wechat-runtime-playthrough.mjs](/E:/cv5/wisdom/tools/run-wechat-runtime-playthrough.mjs)
  - updated [run-wechat-runtime-probe.mjs](/E:/cv5/wisdom/tools/run-wechat-runtime-probe.mjs)
  - updated [open-wechat-devtools.mjs](/E:/cv5/wisdom/tools/open-wechat-devtools.mjs)
  - updated [rebuild-wechat-devtools.mjs](/E:/cv5/wisdom/tools/rebuild-wechat-devtools.mjs)
  - updated [image2-stage-candidate-bindings.mjs](/E:/cv5/wisdom/tools/image2-stage-candidate-bindings.mjs)
  - updated [asset_binding_candidate_manifest_image2.json](/E:/cv5/wisdom/assets/configs/asset_binding_candidate_manifest_image2.json)
  - updated tests:
    - [wechat-build-policy.test.mjs](/E:/cv5/wisdom/tests/wechat-build-policy.test.mjs)
    - [image2-stage-candidate-bindings.test.mjs](/E:/cv5/wisdom/tests/image2-stage-candidate-bindings.test.mjs)
- New findings:
  - The user-reported `WebSocket connection to 'ws://127.0.0.1:37991/' failed` noise was caused by stale runtime-probe bootstrap state, not by a socket legal-domain policy problem.
  - `test:wechat:playthrough` now cleans the temporary probe bootstrap back out of the staged `game.js` after each run, so a normal manual DevTools session does not keep inheriting the probe URL.
  - The runtime probe now self-retires after bounded no-server retries, which prevents infinite reconnect spam even if an old build or stale runtime still boots with probe state.
  - The non-GUI WeChat gate no longer runs modal-dismiss window scripts by default; that path is opt-in only and no longer piggybacks on normal runtime proof.
  - `open:wechat` / `reload:wechat` / `rebuild:wechat` were failing because `.bat` invocation quoting was broken; switching those helpers to the PowerShell env-path pattern restored the preferred non-restart workflow.
  - The Batch 01 preview assets were still visually misleading because runtime was tiling raw `512x512` review candidates. Candidate preview staging now materializes semantic runtime tiles instead:
    - `outdoor_ground_*` and `outdoor_path_*` -> `32x32`
    - `outdoor_wall_*` -> `64x64`
  - After semantic tile staging, the WeChat main package dropped to `2,611,732 bytes`, and the latest non-GUI runtime playthrough still passed.
- New evidence:
  - [asset_binding_candidate_manifest_image2.json](/E:/cv5/wisdom/assets/configs/asset_binding_candidate_manifest_image2.json)
  - [wechat-build-status.json](/E:/cv5/wisdom/temp/wechat-build-status.json)
  - [wechat-size-report.json](/E:/cv5/wisdom/temp/wechat-size-report.json)
  - [wechat-runtime-playthrough-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-playthrough-evidence.json)
  - [wechat-runtime-probe-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-probe-evidence.json)
- Adversarial conclusion:
  - The harness and runtime-preview semantics are no longer the main blockers for this environment batch.
  - Do not misread the improved WeChat proof as batch promotion approval; content-quality redo findings still remain on `outdoor_ground_flowers` and `outdoor_wall_cracked`.
- Todo change:
  - `I2-006` stays `doing`.
  - `I2-008` remains `done` and is now backed by the semantic runtime tile staging path instead of the raw-512 preview path.
- Human intervention triggered: no.
- Next loop goal: continue `2026-04-24-env-batch-02` targeted retry generation/review for `outdoor_ground_flowers` and `outdoor_wall_cracked`, now that preview semantics and non-GUI WeChat proof are stable.

### Loop 07

- Goal: stop legacy DevTools websocket residue from polluting the current Image 2.0 review loop, then keep the non-GUI WeChat path honest before continuing Batch 02.
- Outputs:
  - new [wechat-runtime-probe-bootstrap-utils.mjs](/E:/cv5/wisdom/tools/wechat-runtime-probe-bootstrap-utils.mjs)
  - updated [open-wechat-devtools.mjs](/E:/cv5/wisdom/tools/open-wechat-devtools.mjs)
  - updated [run-wechat-runtime-playthrough.mjs](/E:/cv5/wisdom/tools/run-wechat-runtime-playthrough.mjs)
  - updated [wechat-build-policy.test.mjs](/E:/cv5/wisdom/tests/wechat-build-policy.test.mjs)
  - updated [AGENTS.md](/E:/cv5/wisdom/AGENTS.md)
  - updated [image-2-prompt-playbook-2026-04-24.md](/E:/cv5/wisdom/docs/image-2-prompt-playbook-2026-04-24.md)
  - updated [outdoor_ground_flowers.txt](/E:/cv5/wisdom/temp/image2/prompt-library/by-key/outdoor_ground_flowers.txt)
  - updated [outdoor_wall_cracked.txt](/E:/cv5/wisdom/temp/image2/prompt-library/by-key/outdoor_wall_cracked.txt)
  - updated [2026-04-24-env-batch-02/prompts.json](/E:/cv5/wisdom/temp/image2/jobs/2026-04-24-env-batch-02/prompts.json)
- New findings:
  - The user-facing `ws://127.0.0.1:37991` spam did not require a codegen or legal-domain fix. Two legacy build outputs (`build/wechatgame` and `build/wechatgame-staging`) still carried probe bootstrap residue even though the latest timestamped build was already clean.
  - `reload:wechat` now scrubs stale probe bootstrap from every `build/wechatgame*` output before opening the latest build, so a DevTools window pinned to an old staging path no longer keeps inheriting the probe URL.
  - The current playthrough blocker moved one level deeper: after in-place bootstrap injection and non-GUI `close --project -> open -> auto-preview`, the runtime sometimes still fails to emit the initial `hello` within timeout. That is a current DevTools refresh/relaunch reliability issue, not the old websocket-residue issue.
  - Batch 02 prompt semantics are now explicit about role-driven framing:
    - ground/path tiles must spread as broad surfaces instead of reading like decorative square patches
    - wall tiles must read as modular structure rather than full-frame texture cards
    - non-tile assets should be generated as tight-cropped silhouettes instead of textured squares
  - The loop must continue because the environment content blockers (`outdoor_ground_flowers`, `outdoor_wall_cracked`) still exist and the non-GUI gate needs to be green again before claiming the WeChat leg is settled.
- New evidence:
  - [wechat-runtime-playthrough-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-playthrough-evidence.json)
  - [wechat-runtime-probe-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-probe-evidence.json)
- Adversarial conclusion:
  - Do not misdiagnose the latest blocked playthrough as a socket legal-domain issue.
  - Do not revert to GUI mouse smoke as the default answer.
- Todo change:
  - `I2-006` stays `doing`.
  - The WeChat subtask is back to yellow until `test:wechat:playthrough` returns to green on the cleaned, non-GUI path.
- Human intervention triggered: no.
- Next loop goal: recover a green non-GUI playthrough on the cleaned build path, then continue `2026-04-24-env-batch-02` retries for `outdoor_ground_flowers` and `outdoor_wall_cracked`.

### Loop 08

- Goal: restore a green non-GUI WeChat gate after the blocked `hello` timeout, then continue replacing remaining placeholder-like bindings with real candidate preview assets.
- Outputs:
  - updated [run-wechat-runtime-playthrough.mjs](/E:/cv5/wisdom/tools/run-wechat-runtime-playthrough.mjs)
  - updated [rebuild-wechat-devtools.mjs](/E:/cv5/wisdom/tools/rebuild-wechat-devtools.mjs)
  - updated [wechat-build-policy.test.mjs](/E:/cv5/wisdom/tests/wechat-build-policy.test.mjs)
  - updated [AGENTS.md](/E:/cv5/wisdom/AGENTS.md)
  - staged new prop candidate [breakable_target_v00.png](/E:/cv5/wisdom/assets/art/generated/image2-preview/breakable_target/breakable_target_v00.png)
  - updated [asset_binding_candidate_manifest_image2.json](/E:/cv5/wisdom/assets/configs/asset_binding_candidate_manifest_image2.json)
- New findings:
  - The blocked `hello` run was not caused by a socket legal-domain policy and was not caused by the newly staged `breakable_target` art itself.
  - The immediate trigger was path churn plus stale open-project locking:
    - `build:wechat` kept falling back to timestamped `build/wechatgame-staging-*` outputs when older `build/wechatgame*` projects were still open in DevTools.
    - opening those fresh timestamped paths is more likely to drift into trust / recent-project problems and suppress runtime `hello`.
  - Explicitly closing all known `build/wechatgame*` project paths allowed `build:wechat` to reclaim the stable `build/wechatgame` output again.
  - Once the stable path was restored, the non-GUI gate went green again with the default no-reopen direction:
    - `verify:wechat` passed on `build/wechatgame`
    - `reload:wechat` reopened `build/wechatgame`
    - `test:wechat:playthrough` passed with `WECHAT_RUNTIME_PROBE_FORCE_REOPEN=0`
  - DevTools CLI can still print noisy `code 10` errors (`d.on is not a function`, stale `game.json`) during `open` / `auto-preview` while the runtime probe still reaches `hello` and the full `8/8` route passes. Judge the gate by probe evidence, not CLI stderr alone.
- New evidence:
  - [wechat-build-status.json](/E:/cv5/wisdom/temp/wechat-build-status.json)
  - [wechat-size-report.json](/E:/cv5/wisdom/temp/wechat-size-report.json)
  - [wechat-runtime-playthrough-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-playthrough-evidence.json)
  - [wechat-runtime-probe-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-probe-evidence.json)
  - [screening-report.json](/E:/cv5/wisdom/temp/image2/evidence/2026-04-24-prop-batch-02/screening-report.json)
- Adversarial conclusion:
  - Do not diagnose timestamped-output trust drift as an art regression.
  - Do not force-reopen DevTools by default inside `test:wechat:playthrough`; keep reopen as an explicit recovery path only.
- Todo change:
  - `I2-006` stays `doing`.
  - The WeChat subtask is back to green on the default non-GUI path.
  - Remaining content placeholder focus moves to unresolved live placeholders: `outdoor_ground_green`, `outdoor_ground_ruins`, `boss_core`, `boss_shield_closed`, `boss_shield_open`.
- Human intervention triggered: no.
- Next loop goal: continue low-risk placeholder replacement after `breakable_target`, starting with the remaining unresolved non-player, non-HUD bindings while keeping the recovered non-GUI WeChat gate green.

### Loop 09

- Goal: remove the remaining runtime presentation-path leakage that still made candidate-backed entities look like placeholders, then continue the loop into the `player redesign track` instead of forcing a premature live player swap.
- Outputs:
  - updated [SpriteVisualSkin.ts](/E:/cv5/wisdom/assets/scripts/visual/SpriteVisualSkin.ts)
  - updated [generate-week2-scenes.mjs](/E:/cv5/wisdom/tools/generate-week2-scenes.mjs)
  - updated [generate-mechanics-lab.mjs](/E:/cv5/wisdom/tools/generate-mechanics-lab.mjs)
  - updated [wechat-build-policy.test.mjs](/E:/cv5/wisdom/tests/wechat-build-policy.test.mjs)
  - new player-track prompts:
    - [player_redesign_track_01_cape.txt](/E:/cv5/wisdom/temp/image2/prompt-library/by-key/player_redesign_track_01_cape.txt)
    - [player_redesign_track_01_skirt.txt](/E:/cv5/wisdom/temp/image2/prompt-library/by-key/player_redesign_track_01_skirt.txt)
    - [player_redesign_track_02_direction_a_paperdoll.txt](/E:/cv5/wisdom/temp/image2/prompt-library/by-key/player_redesign_track_02_direction_a_paperdoll.txt)
  - new player-track jobs:
    - [2026-04-24-player-track-01/prompts.json](/E:/cv5/wisdom/temp/image2/jobs/2026-04-24-player-track-01/prompts.json)
    - [2026-04-24-player-track-02/prompts.json](/E:/cv5/wisdom/temp/image2/jobs/2026-04-24-player-track-02/prompts.json)
- New findings:
  - The lingering “placeholder” read was not only a content problem. Controllers that target `*-Visual` nodes were hiding sprite art correctly while leaving sibling `*-Label` nodes active, so runtime could still look placeholder-like even when a valid sprite frame existed.
  - Candidate scene regeneration must explicitly run with `IMAGE2_CANDIDATE_PREVIEW=1`. Regenerating scene JSON without that env var silently bakes live placeholder bindings back into the scene files even when candidate manifests are already populated.
  - Feeding only `texture` or only `spriteFrame` was too brittle. The scene-generation path now supplies both sides wherever the target component supports both, so candidate-preview PNGs imported as texture-only assets still render in runtime.
  - With the overlay enabled, the runtime probe no longer reports broad world-entity placeholder leakage. The remaining merged-manifest placeholder-status keys are only the intentionally procedural high-risk UI entries (`hud_top_bar`, `objective_card`, `controls_card`, `touch_*`, `pause_button`).
- Fresh non-GUI WeChat evidence:
  - [wechat-size-report.json](/E:/cv5/wisdom/temp/wechat-size-report.json)
  - [wechat-runtime-playthrough-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-playthrough-evidence.json)
  - [wechat-runtime-probe-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-probe-evidence.json)
  - latest results:
    - `build:wechat:config` passed
    - `build:wechat` passed with tolerated Creator exit `36`
    - `verify:wechat` passed with main package `2,854,937 bytes`
    - `test:wechat:playthrough` passed
    - runtime probe `activePlaceholderBindings = 0`
- Player redesign track evidence:
  - Track 01 review assets:
    - [player_direction_a_cape_v00.png](/E:/cv5/wisdom/temp/image2/candidates/player/2026-04-24-player-track-01/player_direction_a_cape_v00.png)
    - [player_direction_b_skirt_v00.png](/E:/cv5/wisdom/temp/image2/candidates/player/2026-04-24-player-track-01/player_direction_b_skirt_v00.png)
    - [contact-sheet.png](/E:/cv5/wisdom/temp/image2/evidence/2026-04-24-player-track-01/contact-sheet.png)
    - [review.json](/E:/cv5/wisdom/temp/image2/evidence/2026-04-24-player-track-01/review.json)
  - Internal direction choice:
    - Direction A selected as the stronger base because it keeps better top-down readability and more distance from generic princess-IP shorthand.
  - Track 02 follow-up:
    - [player_direction_a_paperdoll_v00.png](/E:/cv5/wisdom/temp/image2/candidates/player/2026-04-24-player-track-02/player_direction_a_paperdoll_v00.png)
    - [review.json](/E:/cv5/wisdom/temp/image2/evidence/2026-04-24-player-track-02/review.json)
  - Track 03 runtime-facing sheet:
    - [player_direction_a_runtime_sheet_v00.png](/E:/cv5/wisdom/temp/image2/candidates/player/2026-04-24-player-track-03/player_direction_a_runtime_sheet_v00.png)
    - [review.json](/E:/cv5/wisdom/temp/image2/evidence/2026-04-24-player-track-03/review.json)
- Adversarial conclusion:
  - Do not describe the current world-entity state as “still many placeholders” without separating intentional UI procedural placeholders from actual failed candidate bindings.
  - Do not auto-bind the player just because the first paperdoll sheet is promising. The plan still requires the player to stay on its redesign track until front/back states and runtime-facing breakdowns are reviewed.
- Todo change:
  - `I2-006` stays `doing`.
  - `I2-010` is now `doing`.
- Human intervention triggered: no.
- Next loop goal: continue `player redesign track` with a no-text runtime-facing Direction A turnaround/state sheet, then decide whether the next safe step is state-sheet refinement or a paperdoll redraw plan.

### Loop 10 update

- Goal: land a preview-only bridge for the player redesign without touching the live `player` manifest.
- Outputs:
  - `assets/configs/asset_binding_candidate_manifest_image2.json`
  - `assets/art/generated/image2-preview/player_preview/player_preview_v00.png`
  - `assets/art/generated/image2-preview/player_preview/player_preview_v00.png.meta`
  - `assets/art/generated/image2-preview/player_preview.meta`
  - `assets/scenes/PlayerPreview.scene`
  - `assets/scenes/PlayerPreview.scene.meta`
  - `tests/player-preview-bridge.test.mjs`
- New finding: the preview scene resolves `player_preview` through the candidate overlay and leaves the live `player` binding on Denzi's paperdoll.
- Next step: keep `player` on the redesign track for concept/paperdoll/state-sheet work; this bridge is only the in-game preview hook.

### Loop 11

- Goal: close the gap between "player redesign track has preview art" and "actual gameplay runtime still shows live Denzi", while verifying that the echo summon line is a framing problem rather than a missing-wire or repeat-explosion bug.
- Outputs:
  - updated [generate-week2-scenes.mjs](/E:/cv5/wisdom/tools/generate-week2-scenes.mjs)
  - updated [generate-mechanics-lab.mjs](/E:/cv5/wisdom/tools/generate-mechanics-lab.mjs)
  - regenerated gameplay scenes with `IMAGE2_CANDIDATE_PREVIEW=1`:
    - [StartCamp.scene](/E:/cv5/wisdom/assets/scenes/StartCamp.scene)
    - [FieldWest.scene](/E:/cv5/wisdom/assets/scenes/FieldWest.scene)
    - [FieldRuins.scene](/E:/cv5/wisdom/assets/scenes/FieldRuins.scene)
    - [DungeonHub.scene](/E:/cv5/wisdom/assets/scenes/DungeonHub.scene)
    - [DungeonRoomA.scene](/E:/cv5/wisdom/assets/scenes/DungeonRoomA.scene)
    - [DungeonRoomB.scene](/E:/cv5/wisdom/assets/scenes/DungeonRoomB.scene)
    - [DungeonRoomC.scene](/E:/cv5/wisdom/assets/scenes/DungeonRoomC.scene)
    - [BossArena.scene](/E:/cv5/wisdom/assets/scenes/BossArena.scene)
    - [MechanicsLab.scene](/E:/cv5/wisdom/assets/scenes/MechanicsLab.scene)
  - updated tests:
    - [content-scenes.test.mjs](/E:/cv5/wisdom/tests/content-scenes.test.mjs)
    - [mechanics-lab.scene.test.mjs](/E:/cv5/wisdom/tests/mechanics-lab.scene.test.mjs)
    - [wechat-build-policy.test.mjs](/E:/cv5/wisdom/tests/wechat-build-policy.test.mjs)
- New findings:
  - The user's "player design exists but gameplay still shows the old player" report was correct. The gap was not runtime rendering; normal gameplay scene generation still hardcoded `getImageBindingProps('player')`, so `player_preview` only ever appeared in [PlayerPreview.scene](/E:/cv5/wisdom/assets/scenes/PlayerPreview.scene).
  - The smallest safe bridge is to let scene generation choose `player_preview` only when `IMAGE2_CANDIDATE_PREVIEW=1` and a `player_preview` candidate exists, while leaving [asset_binding_manifest_v2.json](/E:/cv5/wisdom/assets/configs/asset_binding_manifest_v2.json) untouched on live `player`.
  - Gameplay scenes now stamp an explicit `AssetBindingTag` onto `Player`, so runtime evidence can prove whether the current build is showing live `player` or preview `player_preview`.
  - `echo_box`, `echo_spring_flower`, and `echo_bomb_bug` are already wired through candidate preview; the remaining user-facing problem is their object framing / silhouette read, not a missing binding path.
  - The suspected repeat-explosion bug on `echo_bomb_bug` did not reproduce. `BombBugFuse` still self-guards with `exploded` and destroys the node after detonation.
  - This loop also reconfirmed that WeChat DevTools CLI can still emit `game.json code 10` noise during auto-preview while the actual runtime probe and full route still pass; judge the gate by probe/playthrough evidence, not the CLI stderr alone.
- New evidence:
  - [wechat-runtime-probe-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-probe-evidence.json)
  - [wechat-runtime-playthrough-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-playthrough-evidence.json)
  - [wechat-size-report.json](/E:/cv5/wisdom/temp/wechat-size-report.json)
- Adversarial conclusion:
  - `player_preview` is now visible in actual gameplay runtime as `candidate_preview`, but this is still only a preview-track bridge, not permission to promote a single generated player sheet into live `player`.
  - Current WeChat proof is green but tight: main package is `4,173,005` bytes, only `21,299` bytes under the `4 MB` hard budget. That is acceptable for this loop's proof boundary but too close to treat as a relaxed steady state.
  - Loop stop conditions are still not met:
    - `player` is still on the redesign track and has not reached final look signoff
    - object-like echo presentation still needs shape/framing iteration to stop reading as textured placeholder slabs
- Adversarial readout for the next loop:
  - Do not treat `player_preview` appearing in `PlayerPreview.scene` or gameplay scenes as a stop condition; it is only a preview bridge.
  - Do not treat GUI smoke success/failure as the main gate; it is evidence-only.
  - Do not treat DevTools `game.json code 10`, `ws://127.0.0.1:37991`, or similar stderr noise as a stop condition by themselves.
  - If a full DevTools restart is unavoidable, `信任并运行` must be handled before the reopen is considered complete.
  - Do not auto-bind live `player` from a single generated sheet; keep the redesign track and preview bridge separate.
- Todo change:
  - `I2-010` stays `doing`.
  - `I2-006` stays `doing`.
- Human intervention triggered: no.
- Next loop goal: tighten object-like presentation for `echo_box` / `echo_spring_flower` / `echo_bomb_bug` so they read as cropped world objects rather than textured cards, while keeping the new gameplay `player_preview` bridge and the non-GUI WeChat gate green.
### Loop 12 update

- Goal: keep the non-GUI WeChat gate honest while recording the object-framing conclusions and the remaining image2 work, without promoting preview bridges into live bindings.
- Outputs:
  - [temp/wechat-runtime-playthrough-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-playthrough-evidence.json)
  - [temp/wechat-runtime-probe-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-probe-evidence.json)
  - [temp/wechat-size-report.json](/E:/cv5/wisdom/temp/wechat-size-report.json)
  - [tests/cocos-echo-system.spec.mjs](/E:/cv5/wisdom/tests/cocos-echo-system.spec.mjs)
- New findings:
  - The default non-GUI playthrough is green again: runtime probe connected, `hello` returned, the 19-step `run-sequence` returned a command result, and the default scene route finished with `8/8` scenes loaded.
  - Package budget remains safe for this loop boundary: main package is still below the 4 MB hard cap and below the warning threshold.
  - Echo presentation has crossed the important threshold: `echo_box`, `echo_spring_flower`, and `echo_bomb_bug` now read more like bounded world objects than textured slabs/cards, and the echo runtime test background still shows no repeat-explosion logic regression.
  - `player_preview` remains a preview bridge, not a live `player` promotion. Its appearance in gameplay runtime proves the bridge works, but it does not satisfy the player redesign stop gate.
  - GUI smoke is still evidence-only; it is not the main gate and should not be used to claim loop completion.
- Why we cannot stop:
  - The loop stop conditions still are not fully satisfied because the player redesign track is not finished and the remaining image2 iteration work is still open.
  - The current green runtime proof only tells us that the non-GUI WeChat path is healthy; it does not finish the content-quality and player-design obligations in the plan.
- todo change:
  - `I2-006` stays `doing`.
  - `I2-010` stays `doing`.
- Human intervention triggered: no.
- Next loop goal: continue only one target, the echo/player framing cleanup path that keeps `player_preview` as a preview bridge while finishing the next safe presentation iteration without touching live `player`.

## Player track 05 archive

- `temp/image2/jobs/2026-04-25-player-track-05/prompts.json` and `temp/image2/prompt-library/by-key/player_redesign_track_05_direction_a_single_sprite.txt` are complete enough for a single-sprite redesign candidate review.
- `assets/art/generated/image2-preview/player_preview/player_preview_v00.png` is now the refreshed preview-bridge asset for track-05, but only because provenance is stated plainly:
  - it is not a fresh generation in this task
  - it is a derived crop from [player_direction_a_runtime_sheet_v00.png](/E:/cv5/wisdom/temp/image2/candidates/player/2026-04-24-player-track-03/player_direction_a_runtime_sheet_v00.png)
  - it is still not a live `player` replacement
- The archive evidence now lives at:
  - `temp/image2/candidates/player/2026-04-25-player-track-05/player_preview_v00.png`
  - `temp/image2/evidence/2026-04-25-player-track-05/review.json`
- Next step stays within the redesign track only; do not promote this archive into live bindings without a separate gate.

### Loop 13

- Goal: refresh the `player_preview` bridge so gameplay uses a top-down gameplay-view crop instead of the earlier front-facing full-body crop, then re-run the non-GUI WeChat gate to keep the redesign track honest.
- Outputs:
  - refreshed [player_preview_v00.png](/E:/cv5/wisdom/assets/art/generated/image2-preview/player_preview/player_preview_v00.png)
  - refreshed [player_preview_v00.png](/E:/cv5/wisdom/temp/image2/candidates/player/2026-04-25-player-track-05/player_preview_v00.png)
  - new [player_direction_a_single_sprite_v00.png](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-player-track-05/player_direction_a_single_sprite_v00.png)
  - preserved pre-refresh archive [player_preview_v00_pre_track05_crop_refresh.png](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-player-track-05/player_preview_v00_pre_track05_crop_refresh.png)
  - fresh preview screenshots:
    - [StartCamp.png](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-preview-spotcheck-track05-refresh/StartCamp.png)
    - [FieldWest.png](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-preview-spotcheck-track05-refresh/FieldWest.png)
    - [MechanicsLab.png](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-preview-spotcheck-track05-refresh/MechanicsLab.png)
  - refreshed non-GUI WeChat evidence:
    - [wechat-runtime-playthrough-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-playthrough-evidence.json)
    - [wechat-runtime-probe-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-probe-evidence.json)
    - [wechat-size-report.json](/E:/cv5/wisdom/temp/wechat-size-report.json)
  - updated [asset_binding_candidate_manifest_image2.json](/E:/cv5/wisdom/assets/configs/asset_binding_candidate_manifest_image2.json)
  - updated [review.json](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-player-track-05/review.json)
  - updated [player-preview-bridge.test.mjs](/E:/cv5/wisdom/tests/player-preview-bridge.test.mjs)
- New findings:
  - The old `player_preview` crop was a front-facing full-body cutout that fit the redesign archive story but mismatched the actual gameplay footprint.
  - The stronger honest bridge is a derived crop from Track 03 Direction A runtime sheet, using the large top-down gameplay-view block instead of the front view.
  - This is still redesign-track-only evidence. It refreshes gameplay preview framing, but it does not satisfy the plan's final-player gate and does not authorize live `player` replacement.
  - Fresh asset audit also corrected one over-optimistic claim from Loop 12: `echo_box` is still a hard presentation issue because the current bridge art is only `10x13`, so the summon line is not fully closed even though runtime wiring is green.
  - The first playthrough attempt after the crop refresh went yellow only because `build:wechat` had fallen back to a timestamped staging directory and the runtime never emitted `hello` there. Running [rebuild:wechat](/E:/cv5/wisdom/package.json) reclaimed the stable [build/wechatgame](/E:/cv5/wisdom/build/wechatgame) path, and the next non-GUI playthrough passed again.
  - Fresh preview screenshots show the new `player_preview` reads more like a top-down gameplay sprite in-world. The player still occupies the same runtime footprint (`94x104` in probe evidence), but the framing inside that footprint is much stronger than the earlier straight-on cutout.
- Adversarial conclusion:
  - Do not describe this crop refresh as a new Image 2 generation.
  - Do not describe the refreshed `player_preview` bridge as final player signoff.
  - Do not describe the echo line as fully solved while `echo_box` remains a micro-sprite bridge.
- Human intervention triggered: no.
- Next loop goal: continue the unresolved object-scale cleanup with `echo_box` as the next highest-signal presentation gap, while keeping the refreshed `player_preview` bridge and stable non-GUI WeChat path green.

### Loop 14

- Goal: validate the post-upscale `echo_box` presentation and the current `BossArena` candidate-preview runtime path on the latest tree, without treating live-placeholder tests as candidate-preview proof.
- Outputs:
  - refreshed non-GUI WeChat evidence:
    - [wechat-size-report.json](/E:/cv5/wisdom/temp/wechat-size-report.json)
    - [wechat-runtime-probe-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-probe-evidence.json)
    - [wechat-runtime-playthrough-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-playthrough-evidence.json)
  - new `echo_box` scene evidence:
    - [MechanicsLab.png](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-echo-box-runtime-spotcheck/MechanicsLab.png)
    - [FieldWest.png](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-echo-box-runtime-spotcheck/FieldWest.png)
    - [report.json](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-echo-box-runtime-spotcheck/report.json)
  - new `BossArena` state evidence:
    - [BossArena-closed.png](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-boss-preview-spotcheck/BossArena-closed.png)
    - [BossArena-open.png](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-boss-preview-spotcheck/BossArena-open.png)
    - [report.json](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-boss-preview-spotcheck/report.json)
- New findings:
  - The latest non-GUI WeChat gate is green again on the current tree even though the build output landed on `build/wechatgame-staging`:
    - `verify:wechat` passed with main package `3,226,054 bytes`
    - `test:wechat:playthrough` passed with runtime summary green and scene route `8/8`
  - `echo_box` is no longer a `10x13` micro-bridge at the preview asset level. The current staged preview asset is `123x160`, and the runtime spotcheck shows it rendering as a bounded `58x58` world object in both `MechanicsLab` and `FieldWest`.
  - The runtime probe now explicitly records `Echo-box` in `FieldWest` as `bindingKey = echo_box` with `bindingStatus = candidate_preview`, so the summon line is no longer only a prefab-level assumption.
  - `BossArena` candidate-preview wiring is real in runtime:
    - `boss_core`, `boss_shield_closed`, and `boss_shield_open` all expose candidate-preview `selectedPath` values in the preview runtime
    - `BossVisualController` and `BreakableTarget` are carrying `SpriteFrame` refs for the boss assets even when `Texture2D` refs are null
    - forcing a shield break switches the scene from closed/danger to open/vulnerable as expected, while keeping the candidate-preview paths on the boss nodes
  - The static dungeon-scene assertions about `boss_core` / `boss_shield_*` staying image-free are live-manifest / source-scene boundary checks, not evidence that candidate-preview runtime failed. Do not treat those tests as a contradiction to the `BossArena` preview report.
- Adversarial conclusion:
  - Do not start a fresh boss generation loop just because the live source-scene tests still protect placeholder-only defaults. Candidate-preview runtime proof for the existing boss batch already exists.
  - Do not treat the current green WeChat gate as permission to stop the loop. The `player` redesign track is still not finished, and the high-risk boss/player art still lacks final style/adversarial signoff.
  - Do not regress back to GUI smoke for this work. The new `echo_box` and `BossArena` evidence came from preview/runtime paths and the non-GUI WeChat gate, which is the intended loop proof boundary.
- Human intervention triggered: no.
- Next loop goal: use the new `echo_box` and `BossArena` screenshots/reports as the evidence base for the next quality decision, starting with whether the current boss batch needs a new image iteration or can stay in candidate-preview while the loop moves back to `player redesign track`.

## Player track 06 archive

- `temp/image2/jobs/2026-04-25-player-track-06/prompts.json` and `temp/image2/prompt-library/by-key/player_redesign_track_06_direction_a_single_sprite.txt` now archive the first genuinely fresh built-in imagegen retry from this loop.
- `temp/image2/candidates/player/2026-04-25-player-track-06/player_direction_a_single_sprite_v00.png` is preserved as a real candidate, but it is not preview-bridge-safe because:
  - the exported PNG baked an opaque checkerboard-like background instead of alpha
  - the camera angle still reads too front-facing for gameplay preview use
- `temp/image2/evidence/2026-04-25-player-track-06/review.json` records the failure honestly and explicitly blocks promotion into either `player_preview` or live `player`.

### Loop 15

- Goal: continue the unfinished `player redesign track` with a genuinely new built-in Image 2 candidate, recover a cleaner preview-only bridge from it, and keep the non-GUI WeChat gate honest on the latest tree.
- Outputs:
  - archived failed fresh-generation retry:
    - [player_direction_a_single_sprite_v00.png](/E:/cv5/wisdom/temp/image2/candidates/player/2026-04-25-player-track-06/player_direction_a_single_sprite_v00.png)
    - [review.json](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-player-track-06/review.json)
  - archived stricter retry batch:
    - [player_redesign_track_07_direction_a_single_sprite.txt](/E:/cv5/wisdom/temp/image2/prompt-library/by-key/player_redesign_track_07_direction_a_single_sprite.txt)
    - [prompts.json](/E:/cv5/wisdom/temp/image2/jobs/2026-04-25-player-track-07/prompts.json)
    - [review.json](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-player-track-07/review.json)
    - [player_direction_a_single_sprite_v00.png](/E:/cv5/wisdom/temp/image2/candidates/player/2026-04-25-player-track-07/player_direction_a_single_sprite_v00.png)
    - [player_direction_a_single_sprite_v00_cutout.png](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-player-track-07/player_direction_a_single_sprite_v00_cutout.png)
  - refreshed preview-only bridge:
    - [player_preview_v00.png](/E:/cv5/wisdom/assets/art/generated/image2-preview/player_preview/player_preview_v00.png)
    - [player_preview_v00.png](/E:/cv5/wisdom/temp/image2/candidates/player/2026-04-25-player-track-07/player_preview_v00.png)
    - [player_preview_v00_pre_track07_refresh.png](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-player-track-07/player_preview_v00_pre_track07_refresh.png)
  - fresh preview-runtime screenshots proving the new bridge is actually in-scene:
    - [StartCamp.png](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-preview-spotcheck-track07-refresh/StartCamp.png)
    - [FieldWest.png](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-preview-spotcheck-track07-refresh/FieldWest.png)
    - [MechanicsLab.png](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-preview-spotcheck-track07-refresh/MechanicsLab.png)
    - [report.json](/E:/cv5/wisdom/temp/image2/evidence/2026-04-25-preview-spotcheck-track07-refresh/report.json)
  - refreshed non-GUI WeChat evidence on the reclaimed stable path:
    - [wechat-size-report.json](/E:/cv5/wisdom/temp/wechat-size-report.json)
    - [wechat-runtime-probe-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-probe-evidence.json)
    - [wechat-runtime-playthrough-evidence.json](/E:/cv5/wisdom/temp/wechat-runtime-playthrough-evidence.json)
  - updated bridge metadata:
    - [asset_binding_candidate_manifest_image2.json](/E:/cv5/wisdom/assets/configs/asset_binding_candidate_manifest_image2.json)
    - [player-preview-bridge.test.mjs](/E:/cv5/wisdom/tests/player-preview-bridge.test.mjs)
- New findings:
  - `track-06` was useful learning, not usable output. It preserved the Direction A shape language, but the baked checkerboard background made it unsafe for preview bridging.
  - The stricter `track-07` retry still arrived on opaque white, but unlike `track-06` it was clean enough to derive a transparent cutout honestly from the fresh generation itself.
  - The new `player_preview` bridge is visibly live in gameplay now, not just in manifest metadata:
    - `StartCamp`, `FieldWest`, and `MechanicsLab` all render `bindingKey = player_preview`
    - the new bridge no longer carries the old baked shadow footprint from track-05
  - The first `build:wechat` + `verify:wechat` pass after the bridge refresh went yellow only because the playthrough landed on fallback `build/wechatgame-staging-20260425112145` and never received runtime `hello`.
  - Running [rebuild:wechat](/E:/cv5/wisdom/package.json) reclaimed stable [build/wechatgame](/E:/cv5/wisdom/build/wechatgame), and the next playthrough passed again with movement gate green and scene route `8/8`.
  - The current main package is still under the hard cap at `3,193,610 bytes`.
- Adversarial conclusion:
  - Do not describe `track-07` as final player signoff. It is a preview-only bridge refresh derived from a fresh single-image generation, not a finished player redesign package.
  - Do not describe the transient blocked playthrough on `build/wechatgame-staging-20260425112145` as a gameplay/art regression. On this machine it matched the known timestamped-path / recent-project DevTools drift pattern and recovered through `rebuild:wechat`.
  - Do not stop the art loop here. The player redesign track still lacks final concept/paperdoll/state-sheet signoff, and the boss/interactive-object families still need manual quality/adversarial closure.
- Human intervention triggered: no.
- Next loop goal: keep the refreshed `player_preview` bridge green while pushing the remaining stop-condition blockers down:
  - final-player redesign acceptance is still open
  - boss family quality/adversarial signoff is still open
  - interactive object family (`echo_box`, portal/checkpoint/barrier/breakable/pickup`) still needs final scene-level acceptance, not just runtime proof
