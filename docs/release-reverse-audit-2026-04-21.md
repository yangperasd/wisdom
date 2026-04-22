# 上线反推审计：可爱风微信小游戏 MVP（2026-04-21）

## 结论

当前项目的功能骨架已经能支撑一条 `StartCamp -> FieldWest -> FieldRuins -> DungeonHub -> DungeonRoomA/B/C -> BossArena -> 返回营地` 的纵切路线，但它还不是可发布状态。主要阻断项不是单个 bug，而是三条系统性风险：

- 微信小游戏主包门禁仍在旧的宽松 demo 口径下放行，实际官方主包限制应按 `4MB` 硬失败处理。
- 美术方向已经从“明亮、温暖、可爱、玩具感”漂移成“AI 素材 + Denzi 地牢 + 程序化 HUD”的混搭。
- 玩家首局体验缺少硬验收：启动等待、首屏理解、触控教学、死亡复活、Boss 结算都还没有形成发布门禁。

本轮整改目标不是完整复刻《智慧的再现》，而是把首发 MVP 锁成“可爱的童话试炼遗迹”：高明度、暖色、低噪声、圆润、玩具感、路径清楚，不允许滑回黑暗地牢。

## Gate 0：决策锁定

首发场景集合锁定为：

| 类型 | 场景 |
|---|---|
| 主包首屏 | `StartCamp` |
| 首发主流程 | `FieldWest`, `FieldRuins`, `DungeonHub`, `DungeonRoomA`, `DungeonRoomB`, `DungeonRoomC`, `BossArena` |
| 内部测试 | `MechanicsLab`，不进入首发微信主流程 |

HUD 原则锁定为：同一 HUD 区域只能有一个 renderer owner。`RectVisual`、`SpriteVisualSkin`、`HudPanelSkin`、`GameHud.applySpriteSkin()`、`TouchCommandButton` 不能继续多头控制同一节点。

资产事实源锁定为：

| 层级 | 职责 | 规则 |
|---|---|---|
| `asset_selection_manifest.json` | 记录设计意图和风格策略 | 只负责“应该是什么” |
| `asset_binding_manifest_v2.json` | 记录当前绑定结果 | 负责“现在用什么” |
| runtime 场景/组件 | 只按绑定渲染 | 不得绕过 manifest 私接新图 |

## Gate 1：微信发布可行性

Cocos Creator 3.8 官方微信小游戏文档写明：小游戏主包体积不能超过 `4MB`，且远程不能下载脚本文件。当前构建产物曾测得 `build/wechatgame` 为 `4,416,729 bytes`，已经高于主包硬线。

包体矩阵：

| 包体区域 | 允许内容 | 禁止内容 | 验收 |
|---|---|---|---|
| 主包 | 启动壳、`StartCamp`、核心脚本、首屏必需 UI/角色资源 | 后续场景大素材、低优先级装饰、测试场景 | `<= 4 * 1024 * 1024 bytes` |
| 分包 | `FieldWest` 以后场景、关卡素材、Boss 资源 | 运行所需核心脚本 | 每包单独测量 |
| 远程资源 | 图片、音频等低优先级资源 | `.js`, `.mjs`, `.cjs`, `.wasm` | 远程脚本列表必须为空 |
| 预警线 | 主包超过 `3.7MB` | 继续加资源 | 只允许修包体，不允许加内容 |

构建参数必须显式校验，不允许依赖默认值：

| 参数 | 当前策略 |
|---|---|
| `startSceneAssetBundle` | `true` |
| `mainBundleIsRemote` | `false`，脚本和启动主包保持本地 |
| `bundleCommonChunk` | `true`，共享代码显式审计 |
| `skipCompressTexture` | `false` |
| `remoteServerAddress` | 只在资源远程化阶段配置 |

## Gate 2：风格评分表

每张核心场景截图和关键素材都按 0-2 分评分，总分低于 12/16 不允许进入主流程；任一禁用项命中直接回炉。

| 项目 | 0 分 | 1 分 | 2 分 |
|---|---|---|---|
| 明度 | 大片黑灰压屏 | 局部偏暗 | 高明度、轻盈 |
| 暖度 | 冷灰/脏绿主导 | 冷暖混乱 | 米白、奶油黄、蜂蜜金、嫩绿、天空蓝协调 |
| 低噪声 | 铺开后像噪声墙 | 局部抢眼 | 支持纹理低频、干净 |
| 玩具感 | 写实、硬、脏 | 有少量圆润感 | 手工、玩具、童话试炼感 |
| 圆润轮廓 | 尖锐、哥特、压迫 | 部分友好 | 圆润、可亲、非恐怖 |
| 路径可读性 | 看不出路和交互 | 需要读文字 | 3 秒内知道往哪走 |
| HUD 一致性 | 多套 UI 混搭 | 局部混用 | 单一 HUD 语言 |
| 角色可见度 | 被地表/HUD 淹没 | 勉强可见 | 一眼看到玩家和交互重点 |

## 禁用清单

命中以下任一项，不能进入首发主流程：

| 禁用项 | 判定 |
|---|---|
| 黑灰大底 | 大面积黑、深灰、深蓝作为主背景 |
| 脏绿噪点 | 地表铺开后形成高频噪声 |
| 写实裂纹 | 真实石材、脏裂缝、冷硬 Dungeon Crawler 质感 |
| 尖锐哥特 | 尖刺、恐怖、压迫、侵蚀感 |
| 血腥压迫 | 黑红血腥、恐怖 Boss 竞技场 |
| 冷硬金属 | 金属冷光成为主语言 |
| 过重金边 | HUD 装饰压过信息 |
| 多套 UI 混搭 | 程序化蓝灰、AI 卷轴、Kenney 按钮同屏互抢 |
| 风格混搭 | 像素、手绘、写实、AI 质感在同一主视觉里并列 |

AI 资产边界：

| 类别 | 是否可直接定稿 |
|---|---|
| 地表、墙体、主 HUD、角色主体、Boss 主体、关键交互提示 | 不可直接定稿 |
| 小道具、局部特效、单次奖励物 | 可作为候选，必须过评分表 |
| `common_enemy`, `boss_core`, `checkpoint`, `touch_attack_button`, `system_pause_icon` | 局部点缀候选，不得成为全局风格锚点 |

## Gate 3：工程控制面

必须先完成以下工程约束，再进入批量场景美术重做：

| 约束 | 验收 |
|---|---|
| manifest 对账 | 设计意图、绑定结果、场景接线无漂移 |
| HUD 单 owner | 同一 HUD 节点不再被多个视觉组件同时控制 |
| 场景依赖图 | 主包、分包、公共资源、测试资源边界清楚 |
| 当前失败测试 | `tests/dungeon-scenes.test.mjs` 必须全绿 |
| 视觉基线 | 每个核心场景至少一张基线截图和人工评分 |

## Gate 4：新手首局验收表

| 玩家时间线 | 必须通过的验收 |
|---|---|
| 冷启动 | 有 loading 或明确反馈，玩家不会以为卡死 |
| 首屏 5 秒 | 玩家能说出“我在哪、往哪走、能点什么” |
| 只用触屏 60 秒 | 完成移动、攻击、召唤、暂停 |
| 第一次误触 | 不误退出、不误进场景、不软锁 |
| 第一次死亡 | 有明确复活入口，不依赖隐藏键盘 |
| 第一次切场 | 知道从哪来、到哪去、下一步目标是什么 |
| 三房间 | 3 秒内区分箱子、弹花、炸虫主题 |
| Boss 战 | 有战前预告、战中阶段反馈、战后结算 |
| 返回营地 | 明确知道已通关，不像回档或重进 |
| 全流程 | 软锁、假死、无出口、无反馈状态为 0 |

## Gate 5：发布验收

发布候选必须同时满足：

- 包体校验和 `verify:wechat` 通过。
- 结构测试、`dungeon-scenes`、主流程 playthrough、移动端 HUD、微信构建输出全绿。
- Preview 只算辅助，不算微信可发证据。
- DevTools simulator 必须真实加载首场景，端口监听不算通过。
- 真机验收记录设备、微信版本、打开路径、首场景、复活、Boss 结束和返回营地结果。

## 参考依据

- Cocos Creator 3.8 微信小游戏发布文档：`https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-wechatgame.html`
- 当前构建工具：`tools/wechat-build-utils.mjs`
- 当前构建校验：`tools/verify-wechat-build-output.mjs`
- 当前结构测试：`tests/dungeon-scenes.test.mjs`
- 当前主流程审计：`tests/demo-playthrough-audit.spec.mjs`
