# 2026-04-10 Micro Task 收口

## 已完成的代码型任务

### M09 DungeonRoomA 共用 dungeon 套件接入

- `RoomABackdrop` 绑定 `outdoor_ground_green`
- `RoomAChallengeZone` 绑定 `outdoor_path_cobble`
- `RoomA-GateClosed / RoomA-GateOpen` 绑定 `barrier_closed / barrier_open`
- 场景结构测试已补齐

### M10 DungeonRoomB 共用 dungeon 套件接入

- `RoomBBackdrop` 绑定 `outdoor_ground_green`
- `RoomBTrapLane` 绑定 `outdoor_ground_ruins`
- `RoomBLandingZone` 绑定 `outdoor_ground_flowers`
- `RoomB-Trap` 绑定 `outdoor_wall_cracked`
- `RoomB-GapHazard` 使用同一条危险材质语言
- 场景结构测试已补齐

### M11 DungeonRoomC 共用 dungeon 套件接入

- `RoomCBackdrop` 绑定 `outdoor_ground_ruins`
- `RoomCBombZone` 绑定 `outdoor_path_cobble`
- `RoomC-WallClosed / RoomC-WallOpen` 绑定 `outdoor_wall_cracked / outdoor_wall_broken`
- 场景结构测试已补齐

### M12 MechanicsLab 材质语言

- `generate-mechanics-lab.mjs` 补齐了和主线一致的图片解析与 `SceneDressingSkin` 生成路径
- `MechanicsLab` 现在有统一的实验场材质语言：
  - `WorldBackdrop / TrapZone / BombZone` 使用 `outdoor_ground_ruins`
  - `PickupStrip / PlateZone / LandingZone` 使用 `outdoor_path_cobble`
  - `Gate-Closed / Gate-Open` 使用 `barrier_closed / barrier_open`
  - `Trap-01` 使用 `outdoor_wall_cracked`
  - `BombWall-Closed / BombWall-Open` 使用 `outdoor_wall_cracked / outdoor_wall_broken`
- `PlayerVisualController` 和 `EnemyVisualController` 也已接入与主线一致的纹理绑定路径

## 体验决策型任务

### M13 Echo 按钮视觉路线定稿

结论：
- 保留当前 `hybrid` 方案，不做代码改动

保留原因：
- 当前 `GameHud.ts` 已经把 echo 按钮的状态逻辑稳定收在 `RectVisual + Label` 上
- 图标是可选覆盖层，不会破坏 `selected / unlocked / locked` 三态
- 现在就切成纯图标按钮，会把“锁定态可读性”和“选中态高对比”重新做一遍，不划算

后续触发条件：
- 只有在拿到每个 echo 的独立高识别图标，并且确认小屏下文字确实造成拥挤时，才考虑切纯图标路线

### M14 Portal 音频切换评估

结论：
- 保留当前“进入时立即播放一次 `enterClip`，不加延迟、不加淡出”的实现

保留原因：
- 当前 `ScenePortal.ts` 的路径很短，只做一次 `playOneShot`
- 这条音频不会阻塞 `switchScene`
- 在现有微信小游戏调试链路里，没有出现“重复叠播导致明显破碎”或“延迟导致手感断裂”的证据

后续触发条件：
- 只有当真机上确认出现以下问题之一时，才补代码：
  - 连续切场时音效重叠明显刺耳
  - 切场太快导致音效几乎不可感知
  - 目标场景 BGM 首帧与 `portal` 音效打架

## 当前结论

- 剩余顺序表里的代码型素材接入任务已经全部完成
- `M13 / M14` 已按当前实现正式定稿，不追加代码
- 后续如果继续推进，新的工作重点应该转到：
  - 真机体验回归
  - 真实素材替换
  - Playwright / 预览链路恢复后补一轮 smoke
