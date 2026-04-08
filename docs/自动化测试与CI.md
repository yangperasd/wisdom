# 自动化测试与 CI

这套项目现在有两层自动化：

- `Node` 层：检查场景结构、prefab 结构和纯逻辑 helper。
- `Playwright` 层：连到 Cocos 本地预览页，验证摇杆、按钮、回响放置、压板开门、炸墙等关键流程。

## 本地命令

纯结构/逻辑测试：

```powershell
npm run test:node
```

直接跑浏览器 smoke：

```powershell
npm run test:smoke
```

让脚本自动读取 Cocos 预览地址并先做可用性检查：

```powershell
npm run test:smoke:local
```

整套一起跑：

```powershell
npm run test:all
```

更适合 CI 或统一入口的命令：

```powershell
npm run test:ci
```

`test:ci` 的行为是：

- 永远先跑 `Node` 层测试。
- 如果能拿到可访问的预览地址，就继续跑 `Playwright` smoke。
- 如果拿不到预览地址，默认只打印 `skip`，不会失败。
- 如果你明确要求 smoke 不能跳过，设置 `REQUIRE_PREVIEW_SMOKE=1`。

## 预览地址来源

优先顺序如下：

1. 环境变量 `PREVIEW_BASE_URL`
2. `[server.json](/E:/cv5/wisdom/profiles/v2/packages/server.json)` 里的本地预览端口

默认本机 Creator 预览一般会落到类似：

```text
http://127.0.0.1:7456/
```

## GitHub Actions

工作流文件在：

[automation-tests.yml](/E:/cv5/wisdom/.github/workflows/automation-tests.yml)

默认行为：

- `push`
- `pull_request`
- `workflow_dispatch`

都会执行 `npm run test:ci`。

如果仓库里没有可访问的 Cocos 预览服务，GitHub Actions 会只跑 `Node` 层测试。

如果你想让 GitHub 也跑浏览器 smoke，有两种方式：

1. 使用能访问预览地址的自托管 runner，并设置仓库变量 `PREVIEW_BASE_URL`
2. 把预览地址暴露到 runner 可访问的网络，再设置仓库变量 `PREVIEW_BASE_URL`

如果你还希望“连不上预览就算失败”，再额外设置：

```text
REQUIRE_PREVIEW_SMOKE=1
```

## 当前 smoke 覆盖

浏览器 smoke 目前覆盖：

- 预览页能正常进入 `MechanicsLab`
- 虚拟摇杆能驱动玩家移动
- 触屏攻击按钮能进入攻击态
- 触屏召唤箱子并触发压板开门
- 触屏切换炸弹回响并炸开裂墙

核心用例在：

[preview-smoke.spec.mjs](/E:/cv5/wisdom/tests/preview-smoke.spec.mjs)
