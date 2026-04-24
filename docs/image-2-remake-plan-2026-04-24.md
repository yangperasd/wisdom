# Image 2.0 重做总方案

日期：2026-04-24

## 1. 方案结论

这版方案先把一个关键原则改正：

- 不是“有些部分不能用 Image 2.0 做”
- 而是“所有部分都可以尝试做候选，但不同类别的采用门槛不同”

也就是说：

- `player` 可以尝试生成或参考编辑
- `boss_core` 可以尝试生成或参考编辑
- HUD 也可以尝试做候选方向
- 整张场景大图也可以做探索性候选

真正的区别只在于：

- 有些类别可以更快进入候选预览
- 有些类别只能做探索，不允许一步到位进入正式 live 绑定

这份方案的目标不是“尽快多换图”，而是建立一条稳定的 `Image 2.0 -> 筛选 -> 候选预览 -> WeChat 验证 -> 对抗审核 -> 晋升或回退` 流水线。

## 2. 北极星与禁区

### 2.1 北极星

所有资产都要往这个方向收敛：

- 明亮
- 温暖
- 可爱
- 圆润
- 玩具感
- 低噪声
- 顶视角可读
- 移动端小尺寸可读

目标气质是“接近《智慧的再现》的可爱冒险感”，但不是复制具体角色、图标、服装、构图或 UI。

### 2.2 禁区

任何类别都不得滑回：

- 黑暗地牢
- 灰重配色
- 脏绿噪点
- 写实裂纹
- 尖锐哥特
- 血腥压迫
- 冷硬金属
- 过重金边
- 像素 / 写实 / 手绘混搭
- 明显的具体商业 IP 复制感

规则事实源：

- [style_resource_gate.json](/E:/cv5/wisdom/assets/configs/style_resource_gate.json)
- [asset_binding_manifest_v2.json](/E:/cv5/wisdom/assets/configs/asset_binding_manifest_v2.json)
- [asset_selection_manifest.json](/E:/cv5/wisdom/assets/configs/asset_selection_manifest.json)

## 3. 当前项目状态

当前状态不是“美术可发”，但已经进入“工程上适合跑候选替换”的阶段。

- `test:wechat:playthrough` 已能跑通 `StartCamp -> FieldWest -> FieldRuins -> DungeonHub -> RoomA/B/C -> BossArena -> StartCamp`
- `verify:wechat` 当前主包仍显著低于微信 `4 MB` 硬门
- BossArena 的明显叠框和重叠占位已经收敛
- 但大量世界元素仍然是 `rect_visual_placeholder` 或 `temporary_placeholder`

所以当前正确动作不是“把旧 ComfyUI 图整包迁进来”，而是开始新的 `Image 2.0` 候选流水线。

## 4. 资产范围与采用策略

这一章统一回答两个问题：

1. 哪些应该先做
2. 哪些虽然也能做，但采用门槛更高

### 4.1 第一优先级：环境语法

这批资产最直接决定项目还像不像“脏 placeholder 地牢”。

| Key | 当前状态 | 允许尝试 | 采用门槛 |
| --- | --- | --- | --- |
| `outdoor_wall_standard` | `rect_visual_placeholder` | 允许直接生成候选 | 中 |
| `outdoor_wall_broken` | `rect_visual_placeholder` | 允许直接生成候选 | 中 |
| `outdoor_wall_cracked` | `rect_visual_placeholder` | 允许直接生成候选 | 中 |
| `outdoor_path_cobble` | `rect_visual_placeholder` | 允许直接生成候选 | 中 |
| `outdoor_ground_flowers` | `rect_visual_placeholder` | 允许直接生成候选 | 中 |

说明：

- 这五个 key 是当前最值得先做的一批
- 它们属于 `must-redo`
- 第一轮就应该进 `Image 2.0` 候选批次

### 4.2 第二优先级：交互道具与通路语义

这批决定玩家能不能一眼读懂“哪里能走、哪里能开、哪里有奖励”。

| Key | 当前状态 | 允许尝试 | 采用门槛 |
| --- | --- | --- | --- |
| `checkpoint` | `rect_visual_placeholder` | 允许生成或编辑候选 | 中 |
| `portal` | `rect_visual_placeholder` | 允许生成或编辑候选 | 中 |
| `breakable_target` | `rect_visual_placeholder` | 允许生成或编辑候选 | 中 |
| `pickup_relic` | `rect_visual_placeholder` | 允许生成或编辑候选 | 中 |
| `barrier_closed` | `rect_visual_placeholder` | 允许生成或编辑候选 | 中 |
| `barrier_open` | `rect_visual_placeholder` | 允许生成或编辑候选 | 中 |

### 4.3 第三优先级：战斗、召唤与反馈

这批允许做，但默认比环境和通路更容易跑偏。

| Key | 当前状态 | 允许尝试 | 采用门槛 |
| --- | --- | --- | --- |
| `common_enemy` | `rect_visual_placeholder` | 允许生成或编辑候选 | 高 |
| `boss_shield_closed` | `rect_visual_placeholder` | 允许生成或编辑候选 | 高 |
| `boss_shield_open` | `rect_visual_placeholder` | 允许生成或编辑候选 | 高 |
| `projectile_arrow` | `temporary_placeholder` | 允许生成或编辑候选 | 中高 |
| `echo_spring_flower` | `asset_gap` | 允许生成或编辑候选 | 中高 |
| `echo_bomb_bug` | `asset_gap` | 允许生成或编辑候选 | 中高 |

### 4.4 高风险专项：允许试做，但采用门槛最高

这一层是本次重排的关键。

这些内容不是“不能碰”，而是：

- 可以尝试生成或编辑
- 可以做候选
- 可以做场景预览
- 但不能轻易一步进入正式 live 绑定

| 类别 | 允许尝试 | 为什么门槛高 |
| --- | --- | --- |
| `player` | 允许，且应该重做 | 牵涉纸娃娃、朝向、动作、持续可见性、小尺寸可读性 |
| 主 HUD | 允许做候选方向 | 会影响全局 UI 一致性，容易和世界资源混风格 |
| `boss_core` 正式本体 | 允许做概念候选 | 是终局锚点，跑偏成本高 |
| 整张场景大图 | 允许做探索性候选 | 包体、混风格和维护风险都高 |

### 4.5 Player 专项规则

`player` 必须改，但要走单独的 `player redesign track`。

这里明确三件事：

- 允许重做
- 鼓励重做
- 但禁止“拿一张 AI 图直接自动替换 live player”

player 第一轮允许的输出：

- 角色方向稿
- paperdoll 拆件方向稿
- idle / walk / attack 关键帧样张
- 色板和轮廓家族

player 第一轮不允许的事情：

- 直接覆盖正式 live player prefab / binding
- 直接宣称“单张图已经可以发包”
- 复制《智慧的再现》里具体主角外观

方向要求：

- 更接近“可爱的公主冒险者 / 少女英雄”
- 但不复制现成 IP
- 顶视角下头身和朝向必须清楚
- 能和当前暖色世界、召唤物和 HUD 并存

## 5. Prompt 规范

后续所有 prompt 一律不再现场自由发挥，统一按 playbook 走。

主入口文档：

- [image-2-prompt-playbook-2026-04-24.md](/E:/cv5/wisdom/docs/image-2-prompt-playbook-2026-04-24.md)

其中已经固定了：

- 统一 prompt 骨架
- 全局正向前缀
- 全局负面块
- `tile / prop / enemy / fx / player redesign` 模板
- 按 key 的具体示例
- 多轮迭代策略
- `generate` vs `reference-guided edit` 决策建议

执行规则：

- 不允许后续 agent 脱离 playbook 自行发明一整套新 prompt 体系
- 如需修改 prompt，先在 playbook 里补模板或补修正规则
- `player` 相关 prompt 只允许走 `player redesign` 模板

## 6. 候选导入与 staging 策略

### 6.1 目录分层

生成候选先放：

- `temp/image2/candidates/<bindingKey>/...`

筛选通过后进入项目候选层：

- `assets/art/generated/<bindingKey>/...`

不要第一步就直接改：

- 正式环境目录
- 正式角色目录
- 正式 live manifest

### 6.2 候选 manifest

建议所有 `Image 2.0` 候选先经由 staging manifest 叠加：

- `assets/configs/asset_binding_candidate_manifest_image2.json`

运行时逻辑建议：

1. 默认读取 [asset_binding_manifest_v2.json](/E:/cv5/wisdom/assets/configs/asset_binding_manifest_v2.json)
2. 打开 `IMAGE2_CANDIDATE_PREVIEW=1` 时，再叠加候选 manifest
3. 只有候选通过筛选、预览、包体和 runtime 验证后，才允许晋升正式 binding

### 6.3 WeChat Harness Path Rule

只要存在活跃的 WeChat DevTools 会话，probe / playthrough harness 优先写到：

- `%TEMP%\\wisdom-wechat-harnesses\\...`

不要默认复用旧 probe 路径，因为：

- 更容易被锁
- 更容易被 recent project 污染
- 更容易出现 stale config / stale runtime

## 7. 验证与证据分级

### 7.1 日常主门

日常候选验证默认优先级固定为：

1. `npm run build:wechat:config`
2. `npm run build:wechat`
3. `npm run verify:wechat`
4. `npm run test:wechat:playthrough`
5. 场景截图 / contact sheet / 拼贴评审
6. 可选 GUI smoke
7. 真机 / 人工体验确认

### 7.2 证据边界

| 证据 | 能证明什么 | 不能证明什么 |
| --- | --- | --- |
| `verify:wechat` | 构建输出、主包体积、关键构建参数、size report | 不能证明真实点击手感或真机体验 |
| `test:wechat:playthrough` | 非 GUI 的真实 WeChat runtime 持续链路健康 | 不能证明所有真实点击路径和真机触感 |
| Preview / Playwright | 结构、布局、截图回归 | 不是 WeChat runtime 证据 |
| DevTools GUI smoke | 补充性的窗口级输入证据 | 不能替代日常主门，也不能替代真机 |
| 真机 / 人工 DevTools | 最终手感和发布前体验 | 不能由当前自动化伪造 |

必须明确：

- `test:wechat:playthrough` 是当前最强的无人工 WeChat 运行时证据
- 它不是最终真机 Gate
- automation evidence 不能单独声称最终 `PASS`

### 7.3 DevTools Harness Hygiene

任何候选验证前，优先保证验证环境本身是干净的。

执行顺序：

1. 优先 `npm run rebuild:wechat`
2. 只需打开最新构建时，优先 `npm run open:wechat` 或 `npm run reload:wechat`
3. 如出现 `project.config.json` 解析弹窗，先跑 `npm run repair:wechat-project-configs`
4. 只有 stale runtime cache 真的是 blocker，才使用 `WECHAT_DEVTOOLS_FORCE_REOPEN=1`

必须防的环境问题：

- stale `project.config.json`
- recent project 指向旧 harness
- trust project modal
- stale runtime cache

约束：

- 结果和代码现状不一致时，先怀疑路径、缓存和 modal，再怀疑游戏逻辑
- 不要把 GUI smoke 或 modal-dismiss 脚本当日常 rebuild 流程
- `InjectTouchInput` 仍是诊断通道，不算发布证据

## 8. 自动筛选与风格评分

### 8.1 第一层：硬筛选

建议脚本：

- `tools/image2-build-contact-sheet.mjs`
- `tools/image2-screen-candidates.mjs`
- `tools/image2-stage-candidate-bindings.mjs`

硬规则至少包括：

- 文件格式
- 尺寸
- 文件大小
- 透明通道约束
- 亮度区间
- 噪声密度
- OCR 风险
- tile `2x2` repeat 预览

### 8.2 第二层：风格评分

评分维度固定为 8 项：

- 明度
- 暖度
- 低噪声
- 玩具感
- 圆润轮廓
- 路径可读性
- HUD 兼容性
- 角色可见度

规则：

- 每项 `0/1/2`
- 总分 `< 12/16` 直接淘汰
- 命中禁区直接淘汰

### 8.3 第三层：对抗审核

默认审核角色：

- 美术总监
- 关卡可读性 reviewer
- 移动端 UI reviewer
- 包体 reviewer
- 反抄袭 reviewer

## 9. 采用门槛

这一章替代原来的“禁止落地”思路。

现在统一改为“都可以尝试，但采用门槛不同”。

### 9.1 普通门槛

适用：

- 环境语法
- 大部分交互道具

晋升正式绑定至少满足：

- 风格评分 `>= 12/16`
- 未命中禁区
- 场景预览中不再显著像 placeholder
- `verify:wechat` 仍通过
- `test:wechat:playthrough` 仍通过
- 对抗 agent 无 P0 / P1 级异议

### 9.2 高门槛

适用：

- `common_enemy`
- `boss_shield_*`
- `projectile_arrow`
- `echo_*`

除普通门槛外，再要求：

- 与同家族资产视觉统一
- 战斗中不遮挡角色和关键反馈
- 小尺寸下仍能读懂状态差

### 9.3 最高门槛

适用：

- `player`
- 主 HUD
- `boss_core`
- 整张场景大图

这些类别允许试做，但采用时还要额外满足：

- 通过单独专项审查
- 通过更多状态 / 场景 / 交互验证
- 没有明显 IP 近似风险
- 对整体产品方向没有引入新的大分叉

特别是 `player`：

- 必须先通过 `player redesign track`
- 先有 concept / paperdoll / state sheet
- 再决定是否进入正式替换

## 10. Harness Loop 执行模型

后续执行默认按 harness loop 跑，不允许回到“先随便生图再说”的模式。

### 10.1 Loop 总目标

每一轮 loop 的目标都必须是“把某一个批次推进到下一个可验证状态”，而不是单纯多出几张图。

合法目标示例：

- 完成一批 prompt
- 完成一批候选图
- 完成 screening report
- 完成候选绑定预览
- 完成 WeChat runtime 验证
- 完成对抗审核结论

### 10.2 Loop 角色

每轮默认包含：

1. 主 agent
2. 任务 agent
3. 对抗 agent

分工：

- 主 agent：定本轮目标、整合证据、决定下一轮
- 任务 agent：执行单个明确任务
- 对抗 agent：找遗漏、找过度乐观、找证据越权

### 10.3 Loop 输入

每轮开始前默认先读：

- [image-2-remake-plan-2026-04-24.md](/E:/cv5/wisdom/docs/image-2-remake-plan-2026-04-24.md)
- [image-2-prompt-playbook-2026-04-24.md](/E:/cv5/wisdom/docs/image-2-prompt-playbook-2026-04-24.md)
- [image-2-loop-memory.md](/E:/cv5/wisdom/docs/image-2-loop-memory.md)
- [image-2-loop-todo.md](/E:/cv5/wisdom/docs/image-2-loop-todo.md)
- [AGENTS.md](/E:/cv5/wisdom/AGENTS.md)

只有本轮确实涉及 WeChat 构建、runtime、DevTools、包体、GUI smoke 时，才额外读取：

- [harness-loop-memory-2026-04-21.md](/E:/cv5/wisdom/docs/harness-loop-memory-2026-04-21.md)

### 10.4 单轮步骤

标准顺序：

1. 主 agent 选定一个明确批次目标
2. 任务 agent 产出候选或工具结果
3. 主 agent 收集证据
4. 对抗 agent 审核遗漏和误判
5. 主 agent 决定：
   - 晋级下一轮
   - 回退重做
   - 触发人工介入
6. 主 agent 回写：
   - [image-2-loop-memory.md](/E:/cv5/wisdom/docs/image-2-loop-memory.md)
   - [image-2-loop-todo.md](/E:/cv5/wisdom/docs/image-2-loop-todo.md)

### 10.5 默认批次顺序

默认顺序：

1. 环境语法批次
2. 交互道具批次
3. 战斗与召唤批次
4. `player redesign track`
5. 其余高风险专项

### 10.6 单轮有效证据

至少要有以下之一，才能算一轮有效推进：

- 新的 prompt 模板
- contact sheet
- screening report
- style scorecard
- candidate manifest preview
- `temp/wechat-size-report.json`
- `temp/wechat-runtime-playthrough-evidence.json`
- 对抗审核结论

### 10.7 单轮收口要求

每一轮 loop 结束时，必须把下面这些内容落回 memory / todo：

- 本轮推进了什么
- 本轮失败或被否决了什么
- 新增的 prompt 学习或筛选经验
- 新证据路径
- 对抗 agent 的结论
- 下一轮唯一目标
- todo 的状态变化

如果没有回写这些信息，就不算完成了一轮 harness loop。

## 11. 停止条件与人工介入阈值

这章统一收口，不再把“第一轮”“停止条件”“harness loop 协议”拆散。

### 11.1 Loop 停止条件

harness loop 只有两类合法停止条件：

1. 当前批次达到通过标准
2. 出现真正需要人工拍板的产品级分叉

### 11.2 批次通过标准

一个批次进入“通过”状态，至少满足：

- 风格评分 `>= 12/16`
- 未命中禁区
- 候选进入场景后不再显著像 placeholder
- `verify:wechat` 仍通过
- `test:wechat:playthrough` 仍通过
- 对抗 agent 没有 P0 / P1 级结论阻断

### 11.3 人工介入阈值

只有遇到下面这些情况，才需要停下来等人：

- 必须在两条明显不同的角色方向之间做产品选择
- `player` 进入最终形象定稿
- 候选已经接近可发，但需要真机 / 最终美术拍板
- 出现明显 IP 近似风险，需要人工判断

其余情况默认不停止 loop，而是继续推进下一轮。

## 12. 下一步落地顺序

现在最合理的落地顺序：

1. 先按 [image-2-prompt-playbook-2026-04-24.md](/E:/cv5/wisdom/docs/image-2-prompt-playbook-2026-04-24.md) 补 prompt library
2. 再做 contact sheet / screening 脚本
3. 再做 candidate manifest 叠加预览
4. 然后只跑第一批环境语法候选
5. 环境批次过后，再推进交互道具
6. 最后再开 `player redesign track`

首批建议工具：

- `tools/image2-build-contact-sheet.mjs`
- `tools/image2-screen-candidates.mjs`
- `tools/image2-stage-candidate-bindings.mjs`
- `assets/configs/asset_binding_candidate_manifest_image2.json`

一句话总结：

所有类别都可以试，但不是所有类别都能同样快地采用；真正要控制的是采用门槛，而不是探索权限。
