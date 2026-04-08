# Cocos 挂载清单

## 场景推荐结构

建议先做一个最小测试场景：

```text
Canvas
World
  Player
    AttackAnchor
  EchoRoot
  RoomRoot
    ResettableNodes...
  EnemyRoot
  TriggerRoot
    Checkpoint
    Plate
    Trap
PersistentRoot
```

## 节点与组件

### PersistentRoot

挂载：

- [GameManager.ts](/E:/cv5/wisdom/assets/scripts/core/GameManager.ts)
- [SceneLoader.ts](/E:/cv5/wisdom/assets/scripts/core/SceneLoader.ts)
- [SaveSystem.ts](/E:/cv5/wisdom/assets/scripts/core/SaveSystem.ts)

说明：

- `GameManager.playerRoot` 指向 `Player`

### Player

挂载：

- [PlayerController.ts](/E:/cv5/wisdom/assets/scripts/player/PlayerController.ts)
- [HealthComponent.ts](/E:/cv5/wisdom/assets/scripts/combat/HealthComponent.ts)

说明：

- `PlayerController.attackAnchor` 指向 `AttackAnchor`
- `PlayerController.health` 指向同节点上的 `HealthComponent`
- `PlayerController.echoManager` 指向 `EchoRoot` 上的 `EchoManager`

### EchoRoot

挂载：

- [EchoManager.ts](/E:/cv5/wisdom/assets/scripts/echo/EchoManager.ts)

说明：

- 在 `entries` 里配置 `木箱 / 跳台花 / 炸弹虫` 的 prefab
- 第 1 周只需要先配 `木箱`

### RoomRoot

挂载：

- [RoomResetController.ts](/E:/cv5/wisdom/assets/scripts/puzzle/RoomResetController.ts)

说明：

- `resetNodes` 填所有会被重置的位置物体、门、机关、临时障碍
- `echoManager` 指向 `EchoRoot` 上的 `EchoManager`

### EnemyRoot

说明：

- 每个敌人节点单独挂 [EnemyAI.ts](/E:/cv5/wisdom/assets/scripts/enemy/EnemyAI.ts)
- `target` 指向 `Player`
- `patrolPoints` 指向该敌人的巡逻点

### TriggerRoot

可以放这些组件：

- [CheckpointMarker.ts](/E:/cv5/wisdom/assets/scripts/core/CheckpointMarker.ts)
- [PressurePlateSwitch.ts](/E:/cv5/wisdom/assets/scripts/puzzle/PressurePlateSwitch.ts)
- [ProjectileTrap.ts](/E:/cv5/wisdom/assets/scripts/puzzle/ProjectileTrap.ts)

说明：

- `CheckpointMarker` 需要挂在带 `Collider2D` 的检查点节点上
- `PressurePlateSwitch` 需要挂在带 `Collider2D` 的压板节点上
- `ProjectileTrap` 需要配置 `projectilePrefab` 和可选的 `spawnPoint`
- 子弹 prefab 上挂 [SimpleProjectile.ts](/E:/cv5/wisdom/assets/scripts/puzzle/SimpleProjectile.ts)

## 第 1 周最小可运行配置

只要先配出下面这些，就足够开始机制验证：

- 1 个 `PersistentRoot`
- 1 个 `Player`
- 1 个 `AttackAnchor`
- 1 个 `EchoRoot`
- 1 个 `RoomRoot`
- 1 个 `Checkpoint`
- 1 个木箱 prefab
- 1 个压板机关
- 1 个直线弹道机关

## 当前骨架的边界

这批脚本是“最小可开工骨架”，不是完整成品。

还需要你在 Cocos 编辑器里继续补：

- 输入层
- UI prefab
- 机关具体表现
- 敌人受击和攻击逻辑
- 正式场景资源
