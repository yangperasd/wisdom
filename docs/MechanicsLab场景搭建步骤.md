# MechanicsLab 场景搭建步骤

这份清单的目标不是把场景做漂亮，而是让你在 `Cocos Creator 3.8.8` 里尽快搭出一个能跑的机制实验场。

完成后你应该能做到：

- `WASD / 方向键` 移动
- `J` 攻击敌人
- `K` 放置当前回响
- `Q / E` 切换回响
- `R` 回到检查点
- 玩家会被敌人或子弹打掉血
- 玩家死亡后回到检查点
- 拾取物可以解锁新回响
- 压板和弹道机关能工作

## 1. 新建场景

1. 在 `assets/scenes` 下新建场景，命名为 `MechanicsLab.scene`
2. 双击打开场景
3. 保存一次

## 2. 根节点结构

先把下面这些节点按层级建出来：

```text
Canvas
  DebugLabel
World
  Player
    AttackAnchor
  EchoRoot
  RoomRoot
  EnemyRoot
    EnemyA
  TriggerRoot
    Checkpoint-01
    Plate-01
    Trap-01
    EchoPickup-Flower
PersistentRoot
```

建议位置：

- `World` 放在 `(0, 0, 0)`
- `Player` 放在 `(-260, 0, 0)`
- `Checkpoint-01` 放在 `(-260, 0, 0)`
- `Plate-01` 放在 `(-40, -20, 0)`
- `Trap-01` 放在 `(120, 40, 0)`
- `EnemyA` 放在 `(20, 80, 0)`
- `EchoPickup-Flower` 放在 `(-140, 80, 0)`

## 3. 先做最小地形

为了先跑机制，不需要瓦片地图，先用纯节点占位：

1. 在 `World` 下新建 `Ground`
2. 给 `Ground` 加一个 `Sprite`
3. 给 `Ground` 加一个 `UITransform`
4. 把尺寸改成大一点，比如 `960 x 540`
5. 颜色改成浅灰或绿色，方便看见范围

再做四面墙，避免角色跑出测试区：

1. 在 `World` 下新建 `WallTop`、`WallBottom`、`WallLeft`、`WallRight`
2. 每个墙节点都加：
   - `UITransform`
   - `BoxCollider2D`
3. 顶底墙尺寸建议 `960 x 20`
4. 左右墙尺寸建议 `20 x 540`
5. 位置分别摆到边界上

如果你已经开启了 `Physics2D`，这些墙会直接拦角色和子弹；如果还没开，也先保留，后面转正式碰撞时直接复用。

## 4. 搭 Player

### 4.1 Player 节点

给 `Player` 挂这些组件：

- `Sprite`
- `UITransform`
- `BoxCollider2D`
- [HealthComponent.ts](/E:/cv5/wisdom/assets/scripts/combat/HealthComponent.ts)
- [PlayerController.ts](/E:/cv5/wisdom/assets/scripts/player/PlayerController.ts)
- [KeyboardInputDriver.ts](/E:/cv5/wisdom/assets/scripts/input/KeyboardInputDriver.ts)

建议参数：

- `Player` 节点名字必须保留为 `Player`
- `UITransform` 尺寸先用 `32 x 32`
- `HealthComponent.maxHealth = 3`
- `PlayerController.moveSpeed = 220`
- `PlayerController.attackDuration = 0.18`
- `PlayerController.attackReach = 18`

### 4.2 AttackAnchor 节点

`AttackAnchor` 作为 `Player` 子节点，给它挂：

- `UITransform`
- `BoxCollider2D`
- [AttackHitbox.ts](/E:/cv5/wisdom/assets/scripts/player/AttackHitbox.ts)

建议参数：

- `UITransform` 尺寸先用 `24 x 24`
- `AttackHitbox.player` 指向 `Player` 上的 `PlayerController`
- `AttackHitbox.targetNameIncludes = Enemy`

### 4.3 回填 PlayerController

在 `PlayerController` 上设置：

- `attackAnchor` 指向 `AttackAnchor`
- `health` 指向同节点上的 `HealthComponent`

### 4.4 回填 KeyboardInputDriver

在 `KeyboardInputDriver` 上设置：

- `player` 指向 `Player` 上的 `PlayerController`

## 5. 搭 EchoRoot

给 `EchoRoot` 挂：

- [EchoManager.ts](/E:/cv5/wisdom/assets/scripts/echo/EchoManager.ts)

建议参数：

- `spawnLimit = 2`
- 暂时至少配一个 `Box` prefab

然后回到 `PlayerController`：

- `echoManager` 指向 `EchoRoot` 上的 `EchoManager`

## 6. 先做两个 prefab

## 6.1 Box 回响 prefab

在 `assets/prefabs` 下新建 `EchoBox.prefab`

结构很简单，一个节点就够：

- 节点名先命名为 `EchoBoxPrefab`
- 组件加：
  - `Sprite`
  - `UITransform`
  - `BoxCollider2D`

建议：

- 尺寸 `32 x 32`
- 颜色改成棕色

注意：真正生成时，[EchoManager.ts](/E:/cv5/wisdom/assets/scripts/echo/EchoManager.ts) 会把实例名字改成 `Echo-box`，所以压板脚本能识别，不需要你手动改 prefab 名。

## 6.2 子弹 prefab

在 `assets/prefabs` 下新建 `ArrowProjectile.prefab`

给 prefab 根节点挂：

- `Sprite`
- `UITransform`
- `BoxCollider2D`
- [SimpleProjectile.ts](/E:/cv5/wisdom/assets/scripts/puzzle/SimpleProjectile.ts)
- [DamageOnContact.ts](/E:/cv5/wisdom/assets/scripts/combat/DamageOnContact.ts)

建议参数：

- 尺寸 `16 x 8`
- `SimpleProjectile.speed = 260`
- `SimpleProjectile.maxLifetime = 2`
- `SimpleProjectile.destroyOnAnyContact = true`
- `DamageOnContact.targetNameIncludes = Player`
- `DamageOnContact.destroyAfterHit = true`

## 7. 把 prefab 回填给 EchoManager

在 `EchoManager.entries` 里先加一条：

- `echoId = Box`
- `prefab = EchoBox.prefab`

如果你顺手还想先占位另外两个回响，也可以直接加：

- `SpringFlower`
- `BombBug`

但第一个测试回合只接 `Box` 就够。

## 8. 搭 PersistentRoot

给 `PersistentRoot` 挂这些组件：

- [GameManager.ts](/E:/cv5/wisdom/assets/scripts/core/GameManager.ts)
- [SceneLoader.ts](/E:/cv5/wisdom/assets/scripts/core/SceneLoader.ts)
- [SaveSystem.ts](/E:/cv5/wisdom/assets/scripts/core/SaveSystem.ts)
- [GameSession.ts](/E:/cv5/wisdom/assets/scripts/core/GameSession.ts)

回填方式：

- `GameManager.playerRoot` 指向 `Player`
- `GameSession.gameManager` 指向 `GameManager`
- `GameSession.saveSystem` 指向 `SaveSystem`
- `GameSession.echoManager` 指向 `EchoRoot` 上的 `EchoManager`
- `GameSession.player` 指向 `Player` 上的 `PlayerController`

## 9. 搭 Checkpoint

给 `Checkpoint-01` 挂：

- `UITransform`
- `BoxCollider2D`
- [CheckpointMarker.ts](/E:/cv5/wisdom/assets/scripts/core/CheckpointMarker.ts)

建议参数：

- 节点名保持 `Checkpoint-01`
- `CheckpointMarker.markerId = checkpoint-01`
- `CheckpointMarker.playerNameIncludes = Player`
- `BoxCollider2D` 范围做大一点，比如 `48 x 48`

## 10. 搭 Plate 压板

给 `Plate-01` 挂：

- `Sprite`
- `UITransform`
- `BoxCollider2D`
- [PressurePlateSwitch.ts](/E:/cv5/wisdom/assets/scripts/puzzle/PressurePlateSwitch.ts)

你再额外新建两个门节点：

- `GateClosed`
- `GateOpen`

都放到 `RoomRoot` 下。

建议：

- `GateClosed` 默认 `active = true`
- `GateOpen` 默认 `active = false`

然后在 `Plate-01` 的 `PressurePlateSwitch` 上设置：

- `allowedNodeNameIncludes = Echo-box`
- `activateOnPressed` 加入 `GateOpen`
- `deactivateOnPressed` 加入 `GateClosed`
- `startsPressed = false`

## 11. 搭 Trap 发射器

给 `Trap-01` 挂：

- `Sprite`
- `UITransform`
- [ProjectileTrap.ts](/E:/cv5/wisdom/assets/scripts/puzzle/ProjectileTrap.ts)

可选再建一个子节点 `SpawnPoint`，作为发射点。

建议参数：

- `projectilePrefab = ArrowProjectile.prefab`
- `spawnPoint = SpawnPoint`
- `intervalSeconds = 1.2`
- `directionX = -1`
- `directionY = 0`
- `autoStart = true`

## 12. 搭 Enemy

给 `EnemyA` 挂：

- `Sprite`
- `UITransform`
- `BoxCollider2D`
- [HealthComponent.ts](/E:/cv5/wisdom/assets/scripts/combat/HealthComponent.ts)
- [DamageOnContact.ts](/E:/cv5/wisdom/assets/scripts/combat/DamageOnContact.ts)
- [EnemyAI.ts](/E:/cv5/wisdom/assets/scripts/enemy/EnemyAI.ts)

建议参数：

- 节点名保持包含 `Enemy`，例如 `EnemyA`
- `HealthComponent.maxHealth = 2`
- `DamageOnContact.targetNameIncludes = Player`
- `DamageOnContact.destroyAfterHit = false`
- `EnemyAI.target` 指向 `Player`
- `EnemyAI.initialState = Patrol`
- `EnemyAI.moveSpeed = 60`
- `EnemyAI.chaseDistance = 120`

如果你不想先做巡逻点，可以把 `initialState` 改成 `Idle`

## 13. 搭回响拾取物

给 `EchoPickup-Flower` 挂：

- `Sprite`
- `UITransform`
- `BoxCollider2D`
- [EchoUnlockPickup.ts](/E:/cv5/wisdom/assets/scripts/echo/EchoUnlockPickup.ts)

建议参数：

- `echoManager` 指向 `EchoRoot` 上的 `EchoManager`
- `echoId = SpringFlower`
- `playerNameIncludes = Player`
- `selectAfterUnlock = true`
- `destroyOnPickup = true`

## 14. 搭 Debug HUD

在 `Canvas/DebugLabel` 上挂：

- `Label`
- [DebugHud.ts](/E:/cv5/wisdom/assets/scripts/ui/DebugHud.ts)

建议参数：

- `Label` 放左上角
- 字号先用 `20`
- 宽高先给大一点，比如 `320 x 180`

然后在 `DebugHud` 上设置：

- `label` 指向当前 `Label`
- `playerHealth` 指向 `Player` 上的 `HealthComponent`
- `echoManager` 指向 `EchoRoot` 上的 `EchoManager`
- `showControls = true`

## 15. 搭 RoomResetController

给 `RoomRoot` 挂：

- [RoomResetController.ts](/E:/cv5/wisdom/assets/scripts/puzzle/RoomResetController.ts)

在 `resetNodes` 里至少加入：

- `GateClosed`
- `GateOpen`
- `EnemyA`
- `EchoPickup-Flower`

然后：

- `echoManager` 指向 `EchoRoot` 上的 `EchoManager`

这样在重生时，门、敌人、拾取物和已放下的回响都会回到初始状态。

## 16. 第一轮跑通顺序

进入预览后，按下面顺序测试：

1. `WASD` 能移动
2. 走到 `Checkpoint-01`，左上角 HUD 出现 `checkpoint-01`
3. 碰到 `EchoPickup-Flower`，HUD 里的回响数量增加
4. `Q / E` 或 `1 / 2 / 3` 能切换回响
5. `K` 能放箱子
6. 把箱子推到压板上，门状态切换
7. `J` 攻击能让 `EnemyA` 掉血
8. 被敌人或子弹碰到会掉血
9. 血量归零后回到检查点
10. `R` 手动重生后，门和敌人会重置

## 17. 如果某一步不工作，优先检查这些

- 节点名里是不是保留了 `Player`、`Enemy`
- `PlayerController.attackAnchor` 有没有回填
- `PlayerController.echoManager` 有没有回填
- `GameSession` 的四个引用有没有全拖进去
- `EchoManager.entries` 里 prefab 有没有配置
- `AttackAnchor` 上有没有 `BoxCollider2D`
- `ProjectileTrap.projectilePrefab` 有没有指向子弹 prefab
- `RoomResetController.resetNodes` 有没有把门和敌人拖进去

## 18. 现在最省事的做法

如果你只想最快看到效果，建议先按这个最小范围搭：

- `Player`
- `AttackAnchor`
- `EchoRoot`
- `PersistentRoot`
- `Checkpoint-01`
- `Plate-01`
- `Trap-01`
- `EnemyA`
- `EchoPickup-Flower`
- `DebugLabel`
- `EchoBox.prefab`
- `ArrowProjectile.prefab`

把这套先跑通，再考虑加正式地形、美术和第二个房间。
