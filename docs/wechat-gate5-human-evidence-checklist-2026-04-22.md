# Gate 5 微信平台与真机证据清单

日期：2026-04-22

本文件是 Gate 5 的人工证据交接清单。它不把本地 CI、preview smoke、端口监听伪装成微信可发证据；它只说明当前自动化已经证明了什么，以及微信 DevTools simulator 和真机必须继续证明什么。

## 1. 当前自动化证据

最近一次 harness loop 的自动化结论：

| 项目 | 结果 |
| --- | --- |
| Node 测试 | 202 / 202 通过 |
| 微信构建输出校验 | 通过 |
| Preview smoke | 9 / 9 通过 |
| 新手首局 journey | 1 / 1 通过 |
| 首屏视觉初始检查 | 9 / 9 通过 |
| 主包大小 | 2,541,486 bytes |
| 全包大小 | 2,687,395 bytes |
| 主包 4 MiB 预算占用 | 60.59% |
| 3.7 MiB 预警线占用 | 65.51% |
| 主包预算余量 | 1,652,818 bytes |
| 预警线余量 | 1,338,245 bytes |
| 分包数量 | 1 |
| 远程资源体积 | 0 bytes |
| 远程脚本数量 | 0 |

可引用的本地证据文件：

| 文件 | 用途 |
| --- | --- |
| `temp/wechat-size-report.json` | 包体、预算、远程脚本审计 |
| `temp/wechat-simulator-evidence.json` | 微信 DevTools 自动化 simulator 证据，只有启用并跑通 simulator 后才可作为 Gate 5 证据 |
| `docs/wechat-platform-evidence-2026-04-15/` | 历史平台证据，当前只能作为参考，不能替代本轮最终验收 |

当前自动化能证明：构建结构、包体预算、核心脚本测试、浏览器 preview 路线、触屏首局路线、首屏基础视觉守卫已经过关。

当前自动化不能证明：微信 DevTools 真实项目加载、微信 runtime 差异、真机触控手感、真实弱网加载、扫码预览链路、微信版本兼容。

## 2. 人工介入边界

以下事项必须由人类或已登录的微信 DevTools 环境完成，Codex 不能伪造为已通过：

| 事项 | 为什么需要人工 |
| --- | --- |
| 微信 DevTools 登录 | 需要微信账号状态或扫码 |
| DevTools service port / auto mode | 需要本机 DevTools 设置与授权 |
| 小游戏 AppID 权限 | 可能需要项目成员权限 |
| 真机预览 | 需要实体手机、微信版本、扫码或上传体验版 |
| 真实网络表现 | 需要实际网络环境或人工切换弱网 |
| 手感判断 | 需要人类在手机上触控移动、攻击、召唤、暂停、复活 |

如果没有上述条件，本地 harness 只能继续产出准备材料和自动化证明，不能宣布 Gate 5 完成。

## 3. Simulator 验收步骤

本节只产出微信 DevTools simulator 证据。即使本节全部通过，也不能替代真机验收，不能单独把 Gate 5 标记为 `PASS`。

推荐在 PowerShell 中从仓库根目录执行：

```powershell
node tools\generate-wechat-build-config.mjs
node tools\run-wechat-build.mjs
node tools\verify-wechat-build-output.mjs
node tools\open-wechat-devtools.mjs
```

打开微信 DevTools 后确认：

| 检查项 | 通过标准 |
| --- | --- |
| 项目目录 | 指向 `build/wechatgame` |
| AppID | 使用本项目可运行的小程序 / 小游戏 AppID |
| 编译模式 | 能正常编译小游戏 |
| 首场景 | 冷启动进入 `StartCamp` |
| 黑屏 / 卡死 | 不出现 |
| Cocos runtime | 已加载，不只停在 DevTools 空项目 |
| Canvas / Player | 场景中存在玩家节点 |
| Touch HUD | 移动、攻击、召唤、暂停入口可见 |
| 错误面板 | 不出现 fatal overlay |

如果 DevTools 已开启 service port，并且知道自动化端口，可继续执行：

```powershell
$env:REQUIRE_WECHAT_SIMULATOR='1'
$env:WECHAT_AUTO_PORT='<DevTools service port>'
node --test tests\wechat-simulator.test.mjs
```

Simulator 自动化通过后，必须保留：

| 文件 / 记录 | 要求 |
| --- | --- |
| `temp/wechat-simulator-evidence.json` | 状态为 passed，包含首场景、玩家、HUD、截图路径 |
| 截图 | 至少一张 DevTools simulator 首场景截图 |
| DevTools 信息 | 记录 DevTools 版本、AppID、打开目录 |

Simulator 证据只能证明：微信 DevTools 环境可以加载构建产物，并且首场景、玩家、基础 HUD 在 simulator 中存在。

Simulator 证据不能证明：手机触控手感、扫码链路、真实微信版本兼容、弱网表现、长流程 Boss 闭环。

## 4. 真机首局验收步骤

真机验收必须只使用触屏，不接键鼠，不依赖隐藏键盘按键。

开始前记录：

| 字段 | 示例 |
| --- | --- |
| 日期时间 | 2026-04-22 20:30 |
| 设备型号 | iPhone / Android 具体型号 |
| 系统版本 | iOS / Android 版本 |
| 微信版本 | 微信设置页版本号 |
| DevTools 版本 | 微信开发者工具版本号 |
| AppID | 当前运行 AppID |
| 构建目录 | `build/wechatgame` |
| 代码版本 | commit hash 或当前工作树说明 |
| 网络 | Wi-Fi / 5G / 弱网 |

真机流程：

| 步骤 | 通过标准 |
| --- | --- |
| 冷启动 | 5 秒内能判断“我在哪、往哪走、能点什么” |
| StartCamp | 风格明亮、温暖、可爱，不像黑暗地牢 |
| 触屏移动 | 虚拟摇杆或移动入口可用 |
| 攻击 | 触屏攻击可触发，不依赖键盘 |
| 召唤 | 箱子 / 召唤入口可触发，有明确反馈 |
| 暂停 / 恢复 | 触屏可暂停并返回 |
| 死亡 / 复活 | 死亡后有明确移动端复活入口 |
| FieldWest | 路径可读，不被脏绿噪点或黑块吞没 |
| FieldRuins | 废墟主题可读，但不滑向阴暗压迫 |
| DungeonHub | 地牢入口仍保持可爱、温暖、玩具感 |
| RoomA | 3 秒内能识别箱子主题 |
| RoomB | 3 秒内能识别弹花主题 |
| RoomC | 3 秒内能识别炸虫主题 |
| BossArena | 有战前预告、阶段反馈、胜利结算 |
| 返回营地 | Boss 后有明确回营地路径 |

必须留存的人工证据：

| 证据 | 最低要求 |
| --- | --- |
| 冷启动截图或视频 | 包含 StartCamp 首屏 |
| 中途截图或视频 | 至少覆盖 FieldWest 或 FieldRuins |
| 房间截图或视频 | 至少覆盖 DungeonHub 或一个 Room |
| Boss 截图或视频 | 覆盖战前 / 战中 / 战后任一关键节点 |
| 返回营地截图或视频 | 证明闭环完成 |
| 问题记录 | 每个问题记录场景、步骤、表现、是否软锁 |

## 5. Gate 5 通过标准

Gate 5 只有在以下全部满足后才能宣布完成：

| 类别 | 标准 |
| --- | --- |
| 包体 | 主包 `<= 4 * 1024 * 1024 bytes`，低于 3.7 MiB 预警线更佳 |
| 远程脚本 | `remoteScriptCount == 0` |
| 自动化 | `node tools\run-ci-tests.mjs` 全绿 |
| 微信 simulator | DevTools 真实加载 `StartCamp`，不是只打开目录或监听端口 |
| 真机 | 触屏完成完整首局主流程 |
| 软锁 | 软锁率为 0 |
| 复活 | 移动端入口明确可用 |
| 加载 | 慢加载或弱网有 loading / fallback 文案 |
| 风格 | 明亮、温暖、可爱、圆润、玩具感；不回到黑暗地牢 |
| 调试残留 | 首发包不出现 `MechanicsLab`、英文 debug 标签、实验提示 |

## 6. 失败判定

出现以下任一情况，Gate 5 必须失败并回到整改：

| 失败项 | 处理 |
| --- | --- |
| 主包超过 4 MiB | P0，先拆包 / 压缩 / 移除资源 |
| 远程脚本存在 | P0，脚本不得远程 |
| DevTools 黑屏 | P0，定位微信 runtime 差异 |
| 真机触屏无法完成移动 / 攻击 / 复活 | P0 |
| 首局软锁 | P0 |
| Boss 后不能返回营地 | P0 |
| 关键场景明显黑暗压迫 | P1，回到风格锁定 |
| UI 多套皮肤混搭 | P1，回到 HUD 唯一路径 |
| 弱网无反馈且像卡死 | P1 |

## 7. 证据归档格式

建议新建目录：

```text
docs/wechat-gate5-evidence-YYYY-MM-DD/
```

建议包含：

| 文件 | 内容 |
| --- | --- |
| `README.md` | 验收时间、设备、微信版本、DevTools 版本、AppID、结论 |
| `size-report.json` | 从 `temp/wechat-size-report.json` 复制的包体报告 |
| `simulator-evidence.json` | 从 `temp/wechat-simulator-evidence.json` 复制的 simulator 证据 |
| `screenshots/` | DevTools 和真机截图 |
| `videos/` | 如有，保存首局流程视频 |
| `issues.md` | 遗留问题、优先级、是否阻断 |

`README.md` 建议使用以下固定模板：

```markdown
# Gate 5 Evidence

结论：PASS / BLOCKED_BY_HUMAN_ENV / FAIL

## 环境

- 验收时间：
- 设备型号：
- 系统版本：
- 微信版本：
- DevTools 版本：
- AppID：
- 构建目录：
- 代码版本：
- 网络：

## 自动化

- `node tools\run-ci-tests.mjs`：
- 主包大小：
- `remoteScriptCount`：
- size report：

## Simulator

- 是否真实打开 `build/wechatgame`：
- 是否进入 `StartCamp`：
- 证据文件：
- 截图：

## 真机首局

- StartCamp：
- 触屏移动：
- 攻击：
- 召唤：
- 暂停 / 恢复：
- 死亡 / 复活：
- FieldWest：
- FieldRuins：
- DungeonHub：
- RoomA：
- RoomB：
- RoomC：
- BossArena：
- 返回营地：

## 问题

- P0：
- P1：
- P2：
```

`README.md` 结论只能写以下三种之一：

| 结论 | 含义 |
| --- | --- |
| `PASS` | 自动化、simulator、真机全部通过 |
| `BLOCKED_BY_HUMAN_ENV` | 自动化通过，但缺 DevTools 登录、AppID、真机或微信环境 |
| `FAIL` | 已在 simulator 或真机发现阻断问题 |

## 8. 下一步

在没有人工微信环境前，harness 可以继续推进的事项：

| 方向 | 目标 |
| --- | --- |
| 风格评分 | 对当前核心场景逐项打分，继续压低黑暗地牢感 |
| 视觉基线 | 固化每个核心场景的标准截图与人工评分位置 |
| 资源清单 | 继续把 AI 候选资源和最终绑定资源分离 |
| HUD 清理 | 继续减少多 renderer owner 的历史残留 |

真正需要人工介入的下一跳：

| 事项 | 人类需要提供 |
| --- | --- |
| 微信 DevTools simulator | 登录后的 DevTools、service port 或截图证据 |
| 真机验收 | 设备、微信版本、首局截图 / 视频、问题记录 |
