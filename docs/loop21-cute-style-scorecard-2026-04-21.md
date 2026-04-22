# Loop 21 Cute Style Scorecard

## 目的

这份文档只做一件事：把当前首发场景按“接近《智慧的再现》的明亮、温暖、可爱、玩具感”来重新打分，并反推下一步最小整改范围。

## 评分方法

- 每个维度按 `0/1/2` 打分。
- `2` = 已经贴近北极星。
- `1` = 方向对，但还有明显过渡感。
- `0` = 明显偏离，或会拉低首发体验。
- 维度固定为：`Brightness`、`Warmth`、`Low Noise`、`Toy Feel`、`Rounded Silhouette`、`Path Readability`、`HUD Consistency`、`Character Visibility`。

## 总览

| Scene | Score / 16 | 快速判断 | 主要问题 |
|---|---:|---|---|
| `StartCamp` | 10 | 最接近“可爱营地”方向，但仍像测试台 | HUD 和场景标签过多，英中混用明显 |
| `FieldWest` | 9 | 旅程可读，氛围比早期干净 | 仍有大块半透明板和英文功能标签 |
| `FieldRuins` | 8 | 路径和任务目标清楚 | 仍偏“关卡说明板”，不是玩具世界 |
| `DungeonHub` | 7 | 结构最像中转站 | 灰紫底、ROOM/PENDING 标签、UI 感过重 |
| `DungeonRoomA` | 8 | 规则清楚，读图快 | 大面积浅色空板，缺少角色和机关性格 |
| `DungeonRoomB` | 7 | 玩法提示清楚 | 长条说明、边界板、TRAP/BOUNDARY 文案还很临时 |
| `DungeonRoomC` | 7 | 可读性尚可 | 最像“调试房间”，空、浅、板感强 |
| `BossArena` | 6 | 流程闭环能看懂 | Boss 区最不像终态，仍是大空场 + 占位物 |

## 逆向玩家旅程

### `StartCamp`

- 玩家第一眼能理解“这是营地入口”，这是优点。
- 但画面里最先跳出来的不是世界，而是 HUD 说明板、任务条、`SLIME`、`WEST GATE`、`SUMMON`、`ATTACK` 这些标签。
- 问题不是黑，而是“像工具界面贴在柔和底色上”，还没有真正合成一个玩具世界。
- 结论：Brightness 和 Warmth 及格，HUD Consistency 还不够，Toy Feel 偏弱。

### `FieldWest`

- 路径和出口关系读得比早期好，整体比黑地牢思路更接近可爱方向。
- 但仍然是大面积软色块 + 功能按钮 + 英文块标签，像临时 UI overlay。
- 结论：Path Readability 还可以，Rounded Silhouette 有进步，但 HUD 还是主角。

### `FieldRuins`

- 这里开始出现明显的“遗迹/试炼区”语义，但仍是说明卡片主导。
- `Unlock BombBug`、`BACK TO WEST`、`GUARD`、`UNLOCK BOMB` 这些词把世界拉回关卡提示面。
- 结论：可读性不错，但 Low Noise 不高，Mixed UI 债务开始放大。

### `DungeonHub`

- 这是当前最明显的“中转/菜单化”场景。
- 背景偏灰紫，`Trial Hub`、`ROOM A/B`、`PENDING` 的文案让它像流程板而不是世界空间。
- 结论：可用，但离“明亮、温暖、玩具感”最远的一档之一。

### `DungeonRoomA`

- `Room A - Box` 的玩法语义一眼能懂，任务目标也明确。
- 但大白板式的布局、`WARDEN`、`PLATE`、`GATE` 这些块状标签，让它像测试图而不是完整房间。
- 结论：Path Readability 较好，Character Visibility 还行，Toy Feel 仍弱。

### `DungeonRoomB`

- `Room B - Flower` 的阅读路径清楚，陷阱和花的关系能被看见。
- 问题是大面积空白板、`BOUNDARY`、`TRAP`、`FLOWER SPOT` 等标签把“房间”变成了说明书。
- 结论：这是当前最典型的“mixed UI + placeholder debt”组合之一。

### `DungeonRoomC`

- 这是最容易暴露“关卡还没长成世界”的一张图。
- `Room C - Bomb` 可以快速理解，但画面仍然很浅、很空，`CRACKED`、`BOMB SPOT` 等标签直接暴露未完成感。
- 结论：可读性够了，情绪与体积感不够。

### `BossArena`

- Boss 结尾流程已经成立，但视觉上最像临时占位。
- 画面中央和右侧仍然是大块浅色空间、一个 boss 标记和少量按钮，缺少“终局感”。
- 结论：这是首发里最需要后续终态样张的一站。

### `Return Camp`

- 从当前截图看，返回营地的“可走流程”存在，但“可见归巢感”还没有真正成立。
- 现在更多是文案和流程控制在表达回营地，而不是一个一眼能认出的可爱返航画面。
- 结论：回营地应该作为最终样张的一部分，而不是只靠文字完成。

## 仍然存在的三类债务

### 1) Dark Dungeon Debt

- 这轮已经明显摆脱了黑灰压屏，但局部仍有灰紫、脏浅绿、低饱和大板块的“地牢旧语法”。
- 问题不是“太黑”，而是“仍然在用旧地牢的体积感和材质语言讲故事”。
- 风险点集中在 `DungeonHub`、`DungeonRoomC`、`BossArena` 这三处。

### 2) Mixed UI Debt

- 当前首发的最大视觉噪声之一就是 UI 语言混搭。
- 画面里同时出现中文目标、英文房间名、英文按钮、英文状态词和部分中文提示。
- 这会让玩家把场景理解成“功能拼装台”，而不是一个统一世界。

### 3) Generated-Artifact Placeholder Debt

- 目前已经把很多生成图从“最终锚点”降级成过渡占位，这是对的。
- 但视觉上仍然能看到明显的临时代码感：大卡片、空白板、边界条、状态标签、调试式提示词。
- 这类债务的真正风险不是丑一点，而是会让后续真正的可爱样张难以落位，因为世界骨架太像工具界面。

## 小型终态样张范围

先只做一个很小的 final-style sample sheet，不扩成整套大图集。

### 建议样张

- `ground tile`
- `path tile`
- `wall / edge tile`
- `HUD panel`
- `rounded primary button`
- `checkpoint / portal marker`
- `enemy / relic placeholder language`

### 期望形态

- 先以单页样张或小型板卡形式确认风格，不直接下发整场景重做。
- 样张要优先证明“明亮、温暖、圆润、低噪声、可读”，不是先追求细节丰富。
- HUD 与世界物件要同一套语言，不要再出现两个设计系统互相抢戏。

### 包体风险预期

- 如果样张仅是 `RectVisual` / 现有资源复用 / 纯规范说明，包体风险接近 `0`。
- 如果样张只新增一个很小的贴图板或单图集，风险是 `低-中`，但必须先估算净增量。
- 如果样张一开始就做整套地表、墙体、人物、Boss 的大面积 bitmap 替换，风险是 `高`，很容易重新碰到微信主包门禁。
- 经验上的安全线建议是：样张阶段不要引入会让主包明显膨胀的资源，优先保留“可替换的风格规范”，等样张通过再做批量导入。

## 下一步建议

1. 先做一版 tiny sample sheet，验证风格语法，而不是扩散到整套场景。
2. 同时把 `HUD Consistency` 和 `Mixed UI` 当成第一优先级，因为它们最影响“像不像一个世界”。
3. 只在样张通过后，再决定是否把地表、墙体、入口、Boss 做成正式终态资源。
