# MechanicsLab 第二轮补充

这一轮新增的目标是把测试场景从“能走能放箱子”推进到“能打、会掉血、能解锁回响、能看调试信息”。

## 新增组件

- `PersistentRoot`
  - 挂 `GameSession.ts`
  - `gameManager` 指向 `GameManager`
  - `saveSystem` 指向 `SaveSystem`
  - `echoManager` 指向 `EchoRoot` 上的 `EchoManager`
  - `player` 指向 `Player`

- `Player/AttackAnchor`
  - 再加一个带 `Collider2D` 的子节点，例如 `AttackHitbox`
  - 挂 `AttackHitbox.ts`
  - `player` 指向 `PlayerController`
  - `targetNameIncludes` 先填 `Enemy`

- `Enemy`
  - 挂 `HealthComponent.ts`
  - 挂 `DamageOnContact.ts`
  - `targetNameIncludes` 填 `Player`
  - 如果要巡逻或追击，再挂 `EnemyAI.ts`

- `Projectile` prefab
  - 挂 `SimpleProjectile.ts`
  - 挂 `DamageOnContact.ts`
  - `targetNameIncludes` 填 `Player`
  - `destroyAfterHit` 勾上

- `EchoPickup`
  - 挂 `EchoUnlockPickup.ts`
  - `echoManager` 指向 `EchoRoot`
  - `echoId` 选你要解锁的回响

- `Canvas/DebugLabel`
  - 新建一个 `Label`
  - 挂 `DebugHud.ts`
  - `label` 指向当前 `Label`
  - `playerHealth` 指向 `Player` 上的 `HealthComponent`
  - `echoManager` 指向 `EchoRoot`

## 建议节点结构

```text
Canvas
  DebugLabel
World
  Player
    AttackAnchor
      AttackHitbox
  EchoRoot
  RoomRoot
  EnemyRoot
    EnemyA
  TriggerRoot
    Checkpoint
    Plate
    Trap
    EchoPickup
PersistentRoot
```

## 这轮新增热键

- `J`：攻击
- `K`：放置当前回响
- `Q / E`：切换已解锁回响
- `1 / 2 / 3`：直接选回响
- `R`：手动回到当前检查点

## 最小验证顺序

1. 进入场景后，`DebugHud` 能显示血量、当前回响、检查点。
2. 玩家碰到 `Checkpoint` 后，`DebugHud` 里的检查点编号更新。
3. 玩家碰到 `EchoPickup` 后，能切到新回响。
4. `J` 攻击时，`AttackHitbox` 能让敌人掉血。
5. 子弹或敌人碰到玩家时，玩家掉血并能在检查点复活。
6. `R` 后，`RoomResetController` 能重置机关和房间状态。
