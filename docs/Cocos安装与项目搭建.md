# Cocos 安装与项目搭建

## 当前状态

- `Cocos Dashboard` 已安装
- 安装位置：`C:\Program Files (x86)\CocosDashboard\CocosDashboard.exe`
- 当前项目已经补成最小 Cocos 工程结构，可在安装好 Creator 后直接导入

## 已确认的版本信息

- 官方下载页当前可见的 `3.8` 最新版本是 `3.8.6`
- 该版本在官方页面标注日期为 `2025-03-28`
- 官方页面说明该版本需要“从 Dashboard 安装”

## 第一步：打开 Dashboard

可执行文件：

`C:\Program Files (x86)\CocosDashboard\CocosDashboard.exe`

如果桌面或开始菜单已经出现 `Cocos Dashboard`，也可以直接从那里打开。

## 第二步：安装 Cocos Creator 3.8.6

在 Dashboard 中按这个顺序操作：

1. 进入 `编辑器 / Editor`
2. 找到 `3.8.6`
3. 点击 `安装`
4. 安装路径建议使用默认路径，避免权限和空格问题带来额外变量
5. 等待编辑器下载完成

如果 `3.8.6` 不在默认列表：

1. 在版本筛选里展开 `3.x`
2. 找到 `3.8.6`
3. 再点击安装

## 第三步：用当前目录创建或导入项目

推荐直接使用当前目录：

`E:\cv5\wisdom`

两种方式都可以：

### 方式 A：导入当前目录

1. 打开 Creator 3.8.6
2. 点击 `导入项目`
3. 选择 `E:\cv5\wisdom`

### 方式 B：在 Dashboard 中打开

1. 点击 `项目 / Project`
2. 选择 `导入`
3. 选择 `E:\cv5\wisdom`
4. 指定使用 `3.8.6`

## 为什么当前目录已经可以导入

我已经补好了这些基础文件：

- [project.json](/E:/cv5/wisdom/project.json)
- [jsconfig.json](/E:/cv5/wisdom/jsconfig.json)
- [.gitignore](/E:/cv5/wisdom/.gitignore)
- [assets/scripts](/E:/cv5/wisdom/assets/scripts)

Creator 第一次打开时会自动生成：

- `library/`
- `local/`
- `temp/`
- `settings/`

另外我已经补了这两个文件，方便 Creator 以标准 2D TS 项目识别：

- [package.json](/E:/cv5/wisdom/package.json)
- [tsconfig.json](/E:/cv5/wisdom/tsconfig.json)

## 第四步：创建第一个测试场景

建议新建场景名：

`MechanicsLab`

建议场景结构：

```text
Canvas
World
  Player
    AttackAnchor
  EchoRoot
  RoomRoot
  EnemyRoot
  TriggerRoot
PersistentRoot
```

具体挂载说明看这里：

- [Cocos挂载清单.md](/E:/cv5/wisdom/docs/Cocos挂载清单.md)

## 第五步：先挂这几个核心脚本

先只接通最小闭环：

- [GameManager.ts](/E:/cv5/wisdom/assets/scripts/core/GameManager.ts)
- [SaveSystem.ts](/E:/cv5/wisdom/assets/scripts/core/SaveSystem.ts)
- [PlayerController.ts](/E:/cv5/wisdom/assets/scripts/player/PlayerController.ts)
- [HealthComponent.ts](/E:/cv5/wisdom/assets/scripts/combat/HealthComponent.ts)
- [EchoManager.ts](/E:/cv5/wisdom/assets/scripts/echo/EchoManager.ts)
- [RoomResetController.ts](/E:/cv5/wisdom/assets/scripts/puzzle/RoomResetController.ts)

第 1 周执行顺序看这里：

- [第1周任务清单.md](/E:/cv5/wisdom/docs/第1周任务清单.md)

## 第六步：先完成 1 个机制实验场

第一阶段不要做正式关卡，只做 3 个区块：

- 起点区：移动和攻击
- 机关区：木箱压板
- 压力区：木箱挡弹过路

完成这一步以后，再做第二个回响和迷宫。

## 当前最推荐的开工顺序

1. 安装 `Creator 3.8.6`
2. 导入 `E:\cv5\wisdom`
3. 新建 `MechanicsLab` 场景
4. 按挂载清单接好玩家、EchoRoot、RoomRoot
5. 先跑通移动、攻击、木箱回响
6. 再接压板机关和弹道机关

## 参考资料

- [Cocos Creator 下载页](https://www.cocos.com/creator-download)
- [Cocos Creator 3.8 用户手册](https://docs.cocos.com/creator/3.8/manual/zh/)
- [Cocos Creator 发布到微信小游戏](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/publish-wechatgame.html)
- [Cocos Creator 小游戏分包](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/subpackage.html)
