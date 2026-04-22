# Loop43 Visual Baseline Index

日期：2026-04-22

## 定位

这份索引把现有 `visual-scene-initial` 截图整理成可复核的视觉基线。它不是最终美术通过证据，不是微信 DevTools simulator 证据，也不是真机证据。

它能证明：

- 每个核心场景都有一张当前预览环境下的初始截图。
- 后续改动可以用这些截图做视觉回归对比。
- 人类评审可以基于同一组文件打分，而不是凭记忆讨论。

它不能证明：

- 未证明场景已经达到《智慧的再现》式可爱风。
- 未证明微信小游戏真实 runtime 已通过。
- 未证明真机触屏、弱网、扫码预览已通过。

## 截图索引

| 场景 | 基线截图 | 状态 | 已知视觉债务 |
| --- | --- | --- | --- |
| `StartCamp` | `tests/__screenshots__/visual-scene-initial.spec.mjs/StartCamp-initial.png` | 预览基线 | 首屏仍像原型集合，HUD/世界层级需继续收口 |
| `FieldWest` | `tests/__screenshots__/visual-scene-initial.spec.mjs/FieldWest-initial.png` | 预览基线 | 野外路径可读，但地表/边界仍有原型感 |
| `FieldRuins` | `tests/__screenshots__/visual-scene-initial.spec.mjs/FieldRuins-initial.png` | 预览基线 | 遗迹可读，但仍偏冷、偏噪、偏关卡说明板 |
| `DungeonHub` | `tests/__screenshots__/visual-scene-initial.spec.mjs/DungeonHub-initial.png` | 预览基线 | 中继枢纽清晰度不足，容易滑回功能菜单感 |
| `DungeonRoomA` | `tests/__screenshots__/visual-scene-initial.spec.mjs/DungeonRoomA-initial.png` | 预览基线 | 箱子主题仍主要靠逻辑和文案，不够玩具化 |
| `DungeonRoomB` | `tests/__screenshots__/visual-scene-initial.spec.mjs/DungeonRoomB-initial.png` | 预览基线 | 弹花主题需要更鲜明，跳跃/节奏感不足 |
| `DungeonRoomC` | `tests/__screenshots__/visual-scene-initial.spec.mjs/DungeonRoomC-initial.png` | 预览基线 | 炸虫主题容易被噪声吞没，危险反馈需可爱化 |
| `BossArena` | `tests/__screenshots__/visual-scene-initial.spec.mjs/BossArena-initial.png` | 预览基线 | 终局仪式感不足，Boss/场地/HUD 边界需收口 |
| `MechanicsLab` | `tests/__screenshots__/visual-scene-initial.spec.mjs/MechanicsLab-initial.png` | 内部测试基线 | 不进入首发包，不作为可爱风首发验收对象 |

## 评分表

每个首发场景按 `0/1/2` 评分，满分 `16`。低于 `12/16` 不得视为风格通过；任一禁用项命中直接退回。

| 场景 | 明度 | 暖度 | 低噪声 | 玩具感 | 圆润轮廓 | 路径可读 | HUD 一致 | 角色可见 | 总分 | 人类结论 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `StartCamp` |  |  |  |  |  |  |  |  |  | 待评审 |
| `FieldWest` |  |  |  |  |  |  |  |  |  | 待评审 |
| `FieldRuins` |  |  |  |  |  |  |  |  |  | 待评审 |
| `DungeonHub` |  |  |  |  |  |  |  |  |  | 待评审 |
| `DungeonRoomA` |  |  |  |  |  |  |  |  |  | 待评审 |
| `DungeonRoomB` |  |  |  |  |  |  |  |  |  | 待评审 |
| `DungeonRoomC` |  |  |  |  |  |  |  |  |  | 待评审 |
| `BossArena` |  |  |  |  |  |  |  |  |  | 待评审 |

## 禁用项复核

| 禁用项 | 命中则处理 |
| --- | --- |
| 黑灰大底 | 退回 |
| 脏绿噪点 | 退回 |
| 写实裂纹 | 退回 |
| 尖锐哥特 | 退回 |
| 血腥压迫 | 退回 |
| 冷硬金属 | 退回 |
| 过重金边 | 退回 |
| 多套 UI 混搭 | 退回 |
| 像素 / 手绘 / 写实 / AI 质感同屏混搭 | 退回 |

## 复查流程

1. 运行 `node tools\run-ci-tests.mjs` 生成或刷新截图。
2. 打开本索引中的每张首发截图。
3. 按 8 项评分表填写分数。
4. 检查禁用项。
5. 低于 `12/16` 或命中禁用项的场景进入视觉债务清单。
6. 只有自动化截图、人工评分、微信 simulator、真机 evidence 都满足后，才允许 Gate 5 写 `PASS`。

## 当前结论

当前截图可以作为回归基线，但不能作为最终风格通过证据。它们证明项目有稳定截图链路，也同时暴露出 Loop38 已记录的视觉债务：世界仍偏原型、部分地表/墙体过噪或过暗、HUD 和场景语言还没有完全收成一个可爱的玩具世界。
