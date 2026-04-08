# 当前可做事项与 Micro Task 执行清单

## 当前状态

目前项目已经具备这些基础：

- 主线场景骨架已接通：
  - `StartCamp`
  - `FieldWest`
  - `FieldRuins`
  - `DungeonHub`
  - `DungeonRoomA`
  - `DungeonRoomB`
  - `DungeonRoomC`
  - `BossArena`
- 核心机制已具备：
  - 玩家移动、攻击、重生
  - `Box / SpringFlower / BombBug`
  - 压板、弹道陷阱、炸墙、场景切换
  - 检查点、存档、进度旗标
  - Hub 的 Boss 门联动
  - Boss 第一阶段护盾骨架
- 自动化基线可用：
  - `npm run test:typecheck`
  - `npm run test:node`
  - `npm run test:all`

## 现在可以做的事情

接下来真正值得做的，不再是“继续铺底层”，而是这 6 类：

1. 把 `DungeonRoomA/B/C` 从骨架推进到完整可玩房间。
2. 把 `BossArena` 从“有护盾概念”推进到“有完整战斗节奏”。
3. 把 `DungeonHub` 做成清晰的中继枢纽，包括进度反馈和回流体验。
4. 把 HUD、暂停、结算和引导做成正式版本。
5. 做微信小游戏构建、真机输入和性能适配。
6. 最后再做美术、音效和整体 polish。

## 执行规则

后续严格按串行 micro task 推进，规则固定如下：

1. 一次只做一个 task。
2. 当前 task 没通过测试门槛，不能进入下一个。
3. 每个 task 至少要过 `typecheck + node tests`。
4. 只要改到运行时交互、输入、场景连通、HUD，就必须额外过 `npm run test:all`。
5. 只要改到对应场景内容，就必须在 Cocos 里手动打开该场景做 1 次人工验证。
6. 如果某个 task 超时，优先缩 scope，不跨 task 借需求。

## 固定测试门槛

### 自动化门槛 A

```powershell
npm run test:typecheck
```

要求：通过。

### 自动化门槛 B

```powershell
npm run test:node
```

要求：通过。

### 自动化门槛 C

```powershell
npm run test:all
```

要求：通过。

说明：凡是涉及输入、HUD、场景切换、运行时交互、Boss 流程，必须跑这一项。

### 人工门槛 D

在 Cocos Creator 中打开对应场景，确认：

- 节点没有丢脚本
- 预览时能进入目标流程
- 不出现明显软锁或错误提示

## 串行 Micro Task

### Task 01

名称：`Room A` 完整可玩化

目标：
- 让 `Room A` 成为真正的 `Box` 教学房，不只是骨架。

改动范围：
- `DungeonRoomA.scene`
- 房间内阻挡、提示、开门节奏

完成标准：
- 玩家必须放 `Box` 才能持续压住压板。
- 打开门后才能拿到 `RoomA-ClearRelic`。
- 死亡或重生后，房间会正确复位。

测试门槛：
- A
- B
- C
- D，手动验证 `DungeonRoomA.scene`

通过后才能进入：
- `Task 02`

### Task 02

名称：`Room B` 完整可玩化

目标：
- 让 `Room B` 成为真正的 `SpringFlower` 教学房。

改动范围：
- `DungeonRoomB.scene`
- 弹道陷阱节奏
- 危险区尺寸和位置
- 落点反馈

完成标准：
- 不用 `SpringFlower` 不能稳定过房。
- 用对位置的 `SpringFlower` 可以稳定到达落点。
- 玩家掉入危险区会回检查点。

测试门槛：
- A
- B
- C
- D，手动验证 `DungeonRoomB.scene`

通过后才能进入：
- `Task 03`

### Task 03

名称：`Room C` 完整可玩化

目标：
- 让 `Room C` 成为真正的 `BombBug` 教学房。

改动范围：
- `DungeonRoomC.scene`
- 裂墙位置
- Bomb 放置空间
- 敌人干扰节奏

完成标准：
- 不使用 `BombBug` 无法拿到 `RoomC-ClearRelic`。
- 炸墙后路径和奖励显示稳定。
- 重生后墙体和奖励状态恢复正确。

测试门槛：
- A
- B
- C
- D，手动验证 `DungeonRoomC.scene`

通过后才能进入：
- `Task 04`

### Task 04

名称：`DungeonHub` 反馈强化

目标：
- 让 Hub 清楚展示 3 个房间的完成状态和 Boss 门解锁状态。

改动范围：
- `DungeonHub.scene`
- 旗标反馈节点
- 已完成房间的视觉提示

完成标准：
- 房间清理后回到 Hub，玩家能看出哪个房间已完成。
- 三个房间都完成后，Boss 门状态明确切换。
- Boss 门不开时没有误导性路径。

测试门槛：
- A
- B
- C
- D，手动验证 `DungeonHub.scene`

通过后才能进入：
- `Task 05`

### Task 05

名称：Boss 第一阶段可玩化

目标：
- 让 Boss 从“能受控切换状态”变成“能打一轮完整回合”。

改动范围：
- `BossArena.scene`
- `BossShieldPhaseController`
- 护盾、核心、攻击窗口

完成标准：
- Boss 开场免伤。
- 玩家必须先炸掉护盾。
- 护盾破后才能通过普通攻击造成伤害。
- Boss 有明确的危险期和输出期。

测试门槛：
- A
- B
- C
- D，手动验证 `BossArena.scene`

通过后才能进入：
- `Task 06`

### Task 06

名称：Boss 清关流程打通

目标：
- 让 Boss 战结束后形成真正的“胜利闭环”。

改动范围：
- `BossArena.scene`
- 胜利 Banner
- 回 Hub 或结算出口
- `boss-cleared` 旗标后续效果

完成标准：
- 击败 Boss 后胜利反馈明确。
- 胜利出口出现且可用。
- 再次进入时 Boss 已清除状态正确。

测试门槛：
- A
- B
- C
- D，手动验证 `BossArena.scene`

通过后才能进入：
- `Task 07`

### Task 07

名称：正式 HUD 第一版

目标：
- 把当前 HUD 从“开发可读”推进到“玩家可读”。

改动范围：
- `GameHud`
- 生命、当前回响、目标提示
- 选中回响高亮

完成标准：
- 不看调试文本也能知道当前 HP、当前回响和目标。
- 触屏按钮与当前回响状态一致。
- HUD 不遮挡关键玩法区域。

测试门槛：
- A
- B
- C
- D，手动验证 `StartCamp`、`DungeonHub`

通过后才能进入：
- `Task 08`

### Task 08

名称：暂停与重开流程

目标：
- 补一个最小正式暂停流，避免试玩时只能靠开发键位。

改动范围：
- 暂停面板
- 继续、重开、返回标题入口

完成标准：
- 可以从触屏和桌面都进入暂停。
- 暂停时游戏逻辑冻结。
- 重开会回到当前检查点。

测试门槛：
- A
- B
- C
- D，手动验证任意 2 个场景

通过后才能进入：
- `Task 09`

### Task 09

名称：存档与进度回归

目标：
- 验证场景、回响、房间旗标、Boss 状态在存档中的一致性。

改动范围：
- `GameSession`
- `SaveSystem`
- 进度旗标恢复逻辑

完成标准：
- 刷新后仍能恢复到正确检查点。
- 已获得回响不会丢失。
- 已完成房间和 Boss 清除状态保持正确。

测试门槛：
- A
- B
- C
- D，手动做一次完整“保存-退出-重开-验证”

通过后才能进入：
- `Task 10`

### Task 10

名称：竖切完整通关回路

目标：
- 让当前版本从 `StartCamp -> FieldWest -> FieldRuins -> DungeonHub -> 3 Rooms -> BossArena` 能跑完整一圈。

改动范围：
- 全部串联场景
- 门槛、回流、检查点摆放

完成标准：
- 新玩家从头开始能一路通到 Boss。
- 中途死亡不会破坏主线。
- 不依赖文档也能基本理解玩法。

测试门槛：
- A
- B
- C
- D，人工完整通关 1 次

通过后才能进入：
- `Task 11`

### Task 11

名称：微信小游戏构建接入

目标：
- 把当前可玩竖切接到微信小游戏构建链路。

改动范围：
- 构建设置
- 资源检查
- 预览包导出

完成标准：
- 本地可成功构建小游戏包。
- 微信开发者工具中可运行。
- 主要交互在模拟器中正常。

测试门槛：
- A
- B
- C
- D，微信开发者工具人工验证

通过后才能进入：
- `Task 12`

### Task 12

名称：移动端与性能第一轮优化

目标：
- 在微信环境下把输入、分辨率、性能拉到可试玩水平。

改动范围：
- 触屏布局
- 安全区
- 资源尺寸
- 运行时热点

完成标准：
- 触屏误触率可接受。
- 关键场景无明显掉帧和黑屏。
- HUD 和按钮在常见比例下不出界。

测试门槛：
- A
- B
- C
- D，微信开发者工具和真机各验证 1 轮

## 推荐执行顺序

严格按这个顺序：

1. `Task 01`
2. `Task 02`
3. `Task 03`
4. `Task 04`
5. `Task 05`
6. `Task 06`
7. `Task 07`
8. `Task 08`
9. `Task 09`
10. `Task 10`
11. `Task 11`
12. `Task 12`

## 当前最推荐立刻开始的任务

从 `Task 01` 开始，也就是先把 `DungeonRoomA` 做成完整可玩的 `Box` 房间。

原因很简单：

- 它依赖最少
- 回归成本最低
- 成功后可以直接复用“教学房完成”的模式到 `Room B` 和 `Room C`
- 失败也最容易收 scope
