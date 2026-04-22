# Gate 5 Evidence

Current automated evidence index: `docs/wechat-gate5-evidence-template/current-automation-evidence-2026-04-22.md`

> Gate 5 current state: `AUTOMATION_GREEN_HUMAN_EVIDENCE_PENDING`.
> Do not mark this template as `PASS` from automation alone.
> Remaining human-only blockers: WeChat DevTools simulator real load, QR / true-device playthrough, final cute-style score, final Chinese copy approval, and final monster naming approval.

模板状态：待填写，禁止预填 `PASS`

结论：待填写

> 只有自动化、微信 DevTools simulator、真机首局三类证据全部满足时，才能写 `PASS`。
> 如果缺 DevTools 登录、AppID、service port、二维码扫码、真机或微信版本信息，请写 `BLOCKED_BY_HUMAN_ENV`。
> 最终提交前只能保留一个结论值：`PASS`、`BLOCKED_BY_HUMAN_ENV` 或 `FAIL`。

## 环境

| 字段 | 记录 |
| --- | --- |
| 验收时间 |  |
| 设备型号 |  |
| 系统版本 |  |
| 微信版本 |  |
| DevTools 版本 |  |
| AppID |  |
| 构建目录 | `build/wechatgame` |
| 代码版本 |  |
| 网络 |  |

## 自动化

| 检查 | 结果 |
| --- | --- |
| `node tools\run-ci-tests.mjs` |  |
| 主包大小 |  |
| 主包预算 | `4 * 1024 * 1024 bytes` |
| 3.7 MiB 预警线 |  |
| `remoteScriptCount` |  |
| size report |  |

## Simulator

| 检查 | 结果 |
| --- | --- |
| DevTools 已登录 |  |
| service port / auto mode 已开启 |  |
| 真实打开 `build/wechatgame` |  |
| 冷启动进入 `StartCamp` |  |
| Cocos runtime 已加载 |  |
| Player 节点存在 |  |
| Touch HUD 可见 |  |
| 无 fatal overlay |  |
| `temp/wechat-simulator-evidence.json` |  |
| DevTools 截图 |  |

## 真机首局

| 步骤 | 结果 |
| --- | --- |
| 冷启动 5 秒内能判断位置、方向、可点入口 |  |
| StartCamp 明亮、温暖、可爱、玩具感 |  |
| 触屏移动 |  |
| 触屏攻击 |  |
| 触屏召唤 |  |
| 暂停 / 恢复 |  |
| 死亡 / 复活 |  |
| FieldWest 路径可读 |  |
| FieldRuins 废墟主题可爱不压迫 |  |
| DungeonHub 不回到黑暗地牢 |  |
| RoomA 3 秒内识别箱子主题 |  |
| RoomB 3 秒内识别弹花主题 |  |
| RoomC 3 秒内识别炸虫主题 |  |
| BossArena 战前预告 |  |
| BossArena 战中阶段反馈 |  |
| BossArena 战后结算 |  |
| 返回营地 |  |

## 证据索引

| 文件 | 内容 |
| --- | --- |
| `size-report.json` |  |
| `simulator-evidence.json` |  |
| `screenshots/` |  |
| `videos/` |  |
| `issues.md` |  |

## 截图 / 视频清单

| ID | 类型 | 文件路径 | 场景 | 证明内容 | 必需 |
| --- | --- | --- | --- | --- | --- |
| G5-001 | 截图 / 视频 |  | StartCamp | 冷启动首屏和可点击入口 | 是 |
| G5-002 | 截图 / 视频 |  | FieldWest 或 FieldRuins | 中途移动与路径可读 | 是 |
| G5-003 | 截图 / 视频 |  | DungeonHub | 地牢入口仍明亮可爱 | 是 |
| G5-004 | 截图 / 视频 |  | RoomA | 3 秒内识别箱子主题 | 是 |
| G5-005 | 截图 / 视频 |  | RoomB | 3 秒内识别弹花主题 | 是 |
| G5-006 | 截图 / 视频 |  | RoomC | 3 秒内识别炸虫主题 | 是 |
| G5-007 | 截图 / 视频 |  | BossArena | Boss 战前 / 战中 / 战后反馈 | 是 |
| G5-008 | 截图 / 视频 |  | StartCamp | Boss 后返回营地 | 是 |

## 结论说明

| 结论 | 说明 |
| --- | --- |
| `PASS` |  |
| `BLOCKED_BY_HUMAN_ENV` |  |
| `FAIL` |  |
