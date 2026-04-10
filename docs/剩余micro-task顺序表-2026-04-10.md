# 剩余 Micro Task 顺序表 - 2026-04-10

## 说明

这份清单替代旧的阶段表和零散 TODO，按当前代码真实进度重排。

执行规则：

1. 只按顺序做，不跳项。
2. 每个 task 完成后必须先过测试门禁，才能进入下一个。
3. 除非遇到硬阻塞，我会按这份顺序自动往下做，不再中间停下来等一句“继续”。

统一测试门禁：

- `npm run test:typecheck`
- `npm run test:node`
- `npm run test:all`

如 task 只影响生成场景或静态资源绑定，还要补一次对应场景结构测试。

## 已完成的代码侧准备

这些代码层工作已经做完，不需要重复排入后续队列：

- `C01` 拾取物统一表现层
  - `CollectiblePresentation.ts`
  - `EchoUnlockPickup.ts`
  - `ProgressFlagPickup.ts`
- `C02` 可破坏物统一表现层
  - `BreakableTarget.ts`
  - `TransientAudio.ts`
  - `SpriteVisualSkin.ts`
- `C03` 场景级 BGM 控制器
  - `SceneMusicController.ts`
- `C04` 玩家 / 敌人视觉适配层
  - `PlayerVisualController.ts`
  - `EnemyVisualController.ts`
- `C05` 移动端 HUD 与触屏布局第一轮收口
- `C06` 微信小游戏构建、校验、模拟器链路

## 当前剩余队列

### M01 `BossVisualController`

目标：
- 给 `BossArena` 的核心敌人补独立视觉适配层
- 不改 Boss 机制，只补表现状态出口

代码范围：
- `assets/scripts/boss/BossVisualController.ts`
- `assets/scripts/boss/BossShieldPhaseController.ts`
- `tools/generate-week2-scenes.mjs`
- `tests/gameplay-logic.test.mjs`
- `tests/dungeon-scenes.test.mjs`

完成标准：
- `BossEnemy-Core` 默认挂上 `BossVisualController`
- 支持 `danger / vulnerable / hurt / defeated` 四类主要状态
- 接入后能隐藏占位文字并支持翻转

### M02 `Echo` prefab 视觉树重构

目标：
- 把 `EchoBox / EchoSpringFlower / EchoBombBug` 从“根节点文字原型”改成“逻辑根 + 独立 visual child”

代码范围：
- `assets/prefabs/EchoBox.prefab`
- `assets/prefabs/EchoSpringFlower.prefab`
- `assets/prefabs/EchoBombBug.prefab`
- `assets/scripts/echo/BombBugFuse.ts`
- prefab 结构测试

完成标准：
- 三个 echo prefab 都有稳定的 visual 子树
- `BombBug` 倒计时不再依赖根节点 `Label`

### M03 陷阱 / 投射物表现接入口

目标：
- 给 `ProjectileTrap / SimpleProjectile` 补贴图、音效、可选命中特效入口

代码范围：
- `assets/scripts/puzzle/ProjectileTrap.ts`
- `assets/scripts/puzzle/SimpleProjectile.ts`
- `assets/scripts/visual/*`
- `MechanicsLab` 与相关房间生成逻辑

完成标准：
- 陷阱和箭矢可直接挂素材，不再只靠色块和标签

### M04 生成器读取共享绑定清单

目标：
- 让生成器消费共享 manifest，而不是把资产绑定规则散落在脚本里

代码范围：
- `assets/configs/asset_selection_manifest.json`
- `assets/configs/asset_binding_manifest_v2.json`
- `tools/generate-week2-scenes.mjs`
- `tools/generate-mechanics-lab.mjs`

完成标准：
- checkpoint / portal / gate / pickup / relic / boss shared props 至少一部分从 manifest 读入
- 不做运行时字符串加载，只做生成期绑定

### M05 `StartCamp` 户外素材绑定

目标：
- 锁定营地场景的户外视觉族

完成标准：
- `StartCamp` 的地面、边界、营地地标、checkpoint / portal 不再是原型混搭

### M06 `FieldWest` 户外素材绑定 + UI 基线收口

目标：
- 让 `FieldWest` 进入和主线场景一致的视觉与 HUD 基线

完成标准：
- `FieldWest` UI 不再弱于 `StartCamp / FieldRuins`
- 户外边界、关键交互点完成第一轮绑定

### M07 `FieldRuins` 户外素材绑定

目标：
- 锁定 ruins 户外套件

完成标准：
- 裂墙、遗迹、路标、portal / checkpoint 与主场景语言统一

### M08 `BossArena` 资源接入收口

目标：
- 在已有音乐和 boss 视觉入口基础上完成 boss 场景第一轮资源绑定

完成标准：
- boss 外观、battle BGM、boss scene 的 portal / checkpoint / shield props 完成第一轮接入

### M09 `DungeonRoomA` 共享 dungeon 套件接入

目标：
- 把 hub 已确定的 dungeon 实体语言落到 `RoomA`

### M10 `DungeonRoomB` 共享 dungeon 套件接入

目标：
- 把同一套 dungeon 语言落到 `RoomB`

### M11 `DungeonRoomC` 共享 dungeon 套件接入

目标：
- 把同一套 dungeon 语言落到 `RoomC`

### M12 `MechanicsLab` 材质语言

目标：
- 给 `MechanicsLab` 单独定义机械机关视觉族，而不是继续沿用户外 / 地牢混用

### M13 Echo 按钮视觉路线定稿

目标：
- 决定是否保留当前 hybrid echo button 方案

说明：
- 这是体验决策 task，不是机制重写

### M14 Portal 音频切断评估

目标：
- 真机和模拟器下确认 portal 切场音效是否需要延迟、淡出或重设计

说明：
- 只有在运行时体验明显差时才落代码

## 顺序执行说明

从现在开始，按下面的顺序推进：

1. `M01 BossVisualController`
2. `M02 Echo prefab 视觉树重构`
3. `M03 陷阱 / 投射物表现接入口`
4. `M04 生成器读取共享绑定清单`
5. `M05 StartCamp 户外素材绑定`
6. `M06 FieldWest 户外素材绑定 + UI 基线收口`
7. `M07 FieldRuins 户外素材绑定`
8. `M08 BossArena 资源接入收口`
9. `M09 DungeonRoomA 共享 dungeon 套件接入`
10. `M10 DungeonRoomB 共享 dungeon 套件接入`
11. `M11 DungeonRoomC 共享 dungeon 套件接入`
12. `M12 MechanicsLab 材质语言`
13. `M13 Echo 按钮视觉路线定稿`
14. `M14 Portal 音频切断评估`

## 会停下来的情况

只有这几种情况我才会停下来重新确认：

- 测试门禁失败且需要改 task 范围
- 发现素材文件实际缺失，无法继续绑定
- 发现会覆盖你当前未提交的有效工作
