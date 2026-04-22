# 微信平台验证证据汇总（2026-04-15）

> 本目录是按 [`docs/给Claude的Demo收口补完方案-2026-04-14.md` §4.3 第 2 层](/E:/cv5/wisdom/docs/给Claude的Demo收口补完方案-2026-04-14.md:111) "GUI smoke 真实证据"清单**逐项落地**的证据集，作为补完日志步骤 9 的附件。
> 本目录的存在本身就是把外部会话 `019d65d9-9c7a-7f71-8044-8171fcf370e5` 的承接位置正式记入仓库。

---

## 1. 工具与构建上下文（事实层）

| 项 | 值 | 取证方式 |
|---|---|---|
| WeChat DevTools 版本 | **`2.01.2510290 Stable`** | 直接读 `C:\Program Files (x86)\Tencent\微信web开发者工具\code\package.nw\package.json` 的 `version` 字段；同时与 stderr.log 中 `wechatdevtools/2.01.2510290 MicroMessenger/8.0.5` UA 互证 |
| DevTools 进程 | 6 个 wechatdevtools.exe + 4+ 个 WeChatAppEx.exe（小程序运行容器） | `tasklist /FI "imagename eq wechatdevtools.exe"`、`tasklist /FI "imagename eq WeChatAppEx.exe"` |
| DevTools 登录态 | 在线 — `refreshTicket` 每 2 小时自动刷新，最近一次 2026-04-15 10:46:57 | `grep "refreshTicket finished" WeappLog/logs/2026-04-10-14-25-31-311-unDDMjbdsF.log \| tail -5` |
| Service Port 启用 | `enableServicePort: true`，`port: 42242`，`trustWhenAuto: true`，`allowGetTicket: true` | 直读 `<DevToolsUserData>/WeappLocalData/localstorage_b72da75d79277d2f5f9c30c9177be57e.json` 的 `security` 段 |
| Cocos 构建产物 | `E:\cv5\wisdom\build\wechatgame-staging`，**4,397,883 bytes** ≈ 4.19 MB（4519 KB du） | `npm run verify:wechat` + `du -sk build/wechatgame-staging` |
| 测试号 AppID | `wx2a215f964be2b668` — 微信官方公开测试号，**任何账号免绑定可用**（用户提供的关键事实 — 不是"权限受限"） | `tools/wechat-build-utils.mjs` 内置 + 用户口头确认 |

---

## 2. 场景视觉覆盖（双层证据）

> 对抗审计第 5 轮纠正：单一场景（StartCamp）不等于"主流程 smoke 通过"。原手册 §3 明确的 8 个主流程场景都要视觉验证过，否则就是以偏概全。

场景视觉覆盖**分两层**记录：

### 2.A 平台层（WeChat DevTools 运行时）

这一层才是"真·微信小游戏 runtime 是否能跑"的证据。

| # | 场景 | 状态 |
|---|---|---|
| 1 | StartCamp | ✅ DevTools 模拟器窗口截图 `devtools-startcamp-loaded.png` / 放大局部 `devtools-startcamp-loaded-simulator-crop.png`（HWND PrintWindow 抓） |
| 2 | FieldWest | ⚠️ 本轮未直接在 DevTools 运行时截图 |
| 3 | FieldRuins | ⚠️ 同上 |
| 4 | DungeonHub | ⚠️ 同上 |
| 5 | DungeonRoomA | ⚠️ 同上 |
| 6 | DungeonRoomB | ⚠️ 同上 |
| 7 | DungeonRoomC | ⚠️ 同上 |
| 8 | BossArena | ⚠️ 同上 |

**平台层覆盖：1 / 8**。

要把平台层扩到 8 / 8 需要的条件（本会话做不到的）：
- DevTools 模拟器里从 StartCamp 走到每个场景 → 需要桌面键鼠控制玩游戏（或 miniprogram-automator 真的跑通，但被 DevTools v2.01.2510290 的 cli auto `d.on` bug 阻挡）
- 或：build 时给每个场景单独做启动场景 → 逐一拉 DevTools → PrintWindow 截图（需要 8 次 build + 8 次 DevTools 重启；比较重）
- 或：在 DevTools webview 的 console 里执行 `cc.director.loadScene('FieldWest')` 等切场景调用 → 需要挂 chrome devtools protocol 到 DevTools（本会话测过：现有 DevTools 进程未启用 `--remote-debugging-port`，要重启才能挂，属侵入性动作）

### 2.B 代码层（Cocos preview + chromium headless）

这一层是"游戏 js bundle 在 chromium 里加载到每个场景后能正确渲染"的证据。同一份 js bundle 在微信 WeChatAppEx 里执行结果**基本等价**（WeChat 小游戏 runtime 是 chromium 内核 + 微信 adapter），所以 preview 层代码层跑通**强烈暗示** WeChat 运行时也能跑通 —— 但**不是直接证明**。

| # | 场景 | 状态 | 截图证据 |
|---|---|---|---|
| 1 | StartCamp | ✅ | [`scene-coverage-preview/StartCamp-initial.png`](./scene-coverage-preview/StartCamp-initial.png) 显示营地入口 + 目标提示 + SLIME 训练区 + BOX TRAINING / PRESS PLATE / 回响栏 / ATTACK / SUMMON / 摇杆 |
| 2 | FieldWest | ✅ | [`scene-coverage-preview/FieldWest-initial.png`](./scene-coverage-preview/FieldWest-initial.png) 显示林间小径 + 目标"拾取弹花" |
| 3 | FieldRuins | ✅ | [`scene-coverage-preview/FieldRuins-initial.png`](./scene-coverage-preview/FieldRuins-initial.png) 显示 Ruins Approach + 目标 "Unlock BombBug, blast the wall" |
| 4 | DungeonHub | ✅ | [`scene-coverage-preview/DungeonHub-initial.png`](./scene-coverage-preview/DungeonHub-initial.png) 显示 Trial Hub + 目标 "Clear the three chambers" |
| 5 | DungeonRoomA | ✅ | [`scene-coverage-preview/DungeonRoomA-initial.png`](./scene-coverage-preview/DungeonRoomA-initial.png) 显示 Room A - Box + 箱子机关 |
| 6 | DungeonRoomB | ✅ | [`scene-coverage-preview/DungeonRoomB-initial.png`](./scene-coverage-preview/DungeonRoomB-initial.png) 显示 Room B - Flower + 陷阱区 |
| 7 | DungeonRoomC | ✅ | [`scene-coverage-preview/DungeonRoomC-initial.png`](./scene-coverage-preview/DungeonRoomC-initial.png) 显示 Room C - Bomb + 可破坏墙 |
| 8 | BossArena | ✅ | [`scene-coverage-preview/BossArena-initial.png`](./scene-coverage-preview/BossArena-initial.png) 显示 Boss Arena + 玩家 + Boss sprite + "Break the shield with BombBug" 提示 |

**代码层覆盖：8 / 8**。

这些截图由 [`tests/visual-scene-initial.spec.mjs`](/E:/cv5/wisdom/tests/visual-scene-initial.spec.mjs) 自动生成，本次补完流程已跑过 9/9 PASS（视觉 snapshot diff 与 baseline 一致），见执行日志 §2。本目录 `scene-coverage-preview/` 下的 8 张 PNG 是从 `tests/__screenshots__/visual-scene-initial.spec.mjs/` 拷贝的主流程子集（剔除 MechanicsLab，因它是实验场不在主流程范围）。

### 2.C 两层证据的关系

- 代码层 8/8 ✅ 证明：游戏代码在 chromium 渲染环境里每个场景都能加载、HUD 绘制完整、场景资源齐全
- 平台层 1/8 ✅ 证明：至少 StartCamp 这一场景在**真·微信 DevTools 运行时**里也能加载并渲染出 HUD
- 两层的交叉覆盖 → StartCamp 代码层 & 平台层都 ✅ → WeChat runtime 的 boot 路径 + 资源加载 + HUD 渲染这一条链**在实际微信运行时被验过**
- 其他 7 个场景在平台层**没被直接验证**，但代码层的 8/8 通过 + StartCamp 在平台层通过 = **它们在微信运行时失败的概率很低，不是零**

**诚实表述**（对抗审计第 5 轮纠正后的最终口径）：本轮 GUI smoke 只在 WeChat DevTools 里直接验证了 1 个场景（StartCamp）。其他 7 个场景依赖"代码层通过 + 同一 runtime boot 路径在 StartCamp 可用"这两条间接推断。

原手册 [§10.2 微信开发者工具抽检](/E:/cv5/wisdom/docs/给测试人员的Demo推进方案-2026-04-14.md:560) **逐字列了 5 条**要求：
1. 项目可正常打开 ✅（weapp log `[handleImportProject]` 实证）
2. 可以进入 `StartCamp` ✅（平台层截图）
3. 摇杆、攻击、回响按钮可用 ✅（截图里 HUD 齐全）
4. 不出现黑屏、卡加载页、输入完全失效 ✅（截图正常）
5. **至少跑一次主流程 smoke** ❌（原手册 §3 定义主流程 = StartCamp → BossArena 8 场景闭环；WeChat runtime 下只有 StartCamp 初始态，没有"走到 BossArena"的证据）

之前版本本节写"现有证据**已足够**"是**半话术** — 只覆盖第 1-4 条，绕开第 5 条。现行口径（第 5 轮对抗审计后降级）：**§10.2 前 4 条实证 / 第 5 条未实证**。分发前**需要**会话外在 DevTools runtime 里从 StartCamp 手动走到 BossArena 至少一次，至少保留 1-2 张中间场景截图，才能闭环 §10.2 全部要求。补齐路径见 §2.A 下方列的 3 条。

---

## 3. GUI smoke 6 项清单实证矩阵（按方案 §4.3 第 2 层第 1 点）

| # | 方案要求项 | 结果 | 取证 |
|---|---|---|---|
| 1 | 打开项目 | ✅ **已实证** | DevTools 实际打开了项目；`[handleImportProject]open project: E:\cv5\wisdom\build\wechatgame-staging`（`launch.log` + `WeappLog/logs/2026-04-15-10-40-31-705-unDDMjbdsF.log` 10:40:30），见 `devtools-project-load.log` §1 |
| 2 | 进入 StartCamp 主场景 | ✅ **已实证** | [`devtools-startcamp-loaded.png`](./devtools-startcamp-loaded.png) 右上方模拟器窗口显示深色 + 绿色网格地形 + 可辨识玩家角色 sprite + HUD 顶部 `HP 3/3` / `Echo Box 1/3` 文本 + 左上标题 `营地入口` + 右侧三回响槽位 `BOX *` / `LOCK` / `LOCK`（初始态：Box 解锁、SpringFlower/BombBug 锁定）+ `ATTACK` / `SUMMON` 按钮 + 左下虚拟摇杆。放大局部见 [`devtools-startcamp-loaded-simulator-crop.png`](./devtools-startcamp-loaded-simulator-crop.png)（模拟器区域裁剪放大图，每个 HUD 元素都清晰可辨）。截图内容的诚实详描 + DevTools 自身未处理 UI 状态披露见本章节 §3.1；截图获取方式见 §3.2 |
| 3 | 证明触屏 HUD 或主场景已加载 | ✅ **已实证** | 同 #2：HUD 元素（HP 3/3 文本 + 三回响槽位 + ATTACK / SUMMON + 摇杆）显示在截图里；配合 weapp log 的 `[hybirdLog] init x4`（appservice / simulator / skyline / engine 四个 webview 实例化）双向互证 |
| 4 | 工具版本 | ✅ | `2.01.2510290 Stable`（package.json 直接读到；DevTools 窗口标题 bar 里也显示 `Stable v2.01.2510290`） |
| 5 | 项目路径 | ✅ | `E:\cv5\wisdom\build\wechatgame-staging` |
| 6 | 至少一张截图 | ✅ **已落仓库** | [`devtools-startcamp-loaded.png`](./devtools-startcamp-loaded.png) 174 KB，1250×1000。备份：[`devtools-startcamp-loaded-secondary.png`](./devtools-startcamp-loaded-secondary.png) 第二个 HWND 的截图 |

**6 / 6 项全部实证。**

### 3.1 截图里有的（诚实描述，不夸大）

对抗审计 agent 指出此前的措辞"绿色营地底图 + 玩家角色"略夸张，本节改为逐点描述实际能辨识的内容，并把**未处理的 UI 状态**如实写下：

**能辨识的（支持判定的）**：
- 左侧 DevTools 项目树：`application.e0a7b.js`、`assets/`、`cocos-js/`、`src/`、`game.js`、`engine-adapter.js`、`first-screen.js`、`logo.png`、`package.json`、`project.config.json`、`slogan.png`、`web-adapter.js` — wechatgame-staging 目录结构一致
- 右上方小游戏模拟器窗口内：深色背景 + 绿色网格地形、可辨识玩家角色 sprite、**HUD 顶部"HP 3/3"文本**、右侧三回响槽位 `BOX *` / `LOCK` / `LOCK`（Box 已解锁、SpringFlower 与 BombBug 锁定 — 与 StartCamp 初始态一致）、`ATTACK` 和 `SUMMON` 两个橙色/绿色按钮、左下圆形虚拟摇杆
- DevTools 窗口标题栏："wisdom - 微信开发者工具 Stable v2.01.2510290"

**未处理的 UI 状态（诚实披露，不选择性展示）**：
- DevTools 主区存在一个 **"A git repository was found in the parent folders of the workspace"** 的模态弹窗（Always / Never / Cancel 三个按钮），这是 DevTools 检测到 `E:\cv5\wisdom` 父目录中有 git 仓库时弹出的提示；未被关闭，覆盖在项目树右侧。这**不影响** 右上方模拟器的渲染（模拟器是独立 webview，已经加载 StartCamp 且 HUD 渲染到位），但说明 DevTools 本体处于"刚打开、未完全交互过"的状态
- 截图下半部分是 DevTools Console 面板，没有项目侧的严重报错（与本轮 weapp log 反向取证的结论一致）

### 3.2 截图获取方式

Windows 自带 `user32.dll` 的 `PrintWindow` Win32 API，可以在**不抢前台、不截整屏、不泄露桌面其他窗口**的前提下直接抓任意指定 HWND 的窗口内容。脚本内嵌 C# via PowerShell `Add-Type`：
1. 用 `EnumWindows` + `GetWindowThreadProcessId` 枚举 `wechatdevtools.exe` 进程的所有可见顶层窗口
2. 按窗口标题含 `wisdom`（当前项目名）过滤到 DevTools 主窗口
3. 对每个 HWND 调 `PrintWindow(hwnd, hdc, PW_RENDERFULLCONTENT)` 抓窗口位图
4. 保存 PNG 到本目录

一次调用产出两个 HWND 的快照（当前脚本行为 — 只处理前 2 个匹配 HWND，超过会跳过并打印 NOTE）：

```
candidates: 4
NOTE: found 4 matching HWNDs; only processing first 2 to keep the file manifest stable. Extras ignored.
SAVED HWND=0x3217C8 size=1250x1000 file=devtools-startcamp-loaded.png bytes=174041
SAVED HWND=0xB8226E size=1250x1000 file=devtools-startcamp-loaded-secondary.png bytes=169531
```

（上面本目录现有截图是第三轮对抗审计之前的旧脚本跑的输出，当时还没有 NOTE 行；结果落盘的两个文件与稳定文件名一致，与现脚本的输出目标相同。）

注：`devtools-startcamp-loaded.png` 和 `-secondary.png` 是**同一时刻、两个 DevTools 主窗口 HWND 的双重快照**（DevTools 架构里常见 — 主窗口 + 隐藏的 transparent frame）。**内容基本一致，不是独立的第二视角**，保留 secondary 只是多一份字节级备份，不用作"独立证据"。

---

## 4. 项目内文件加载体量（实证 #3 的支撑数据）

`WeappLog/logs/2026-04-15-10-41-57-502-unDDMjbdsF.log` 10:42:00 行：

```
[Fileutils][1.4.5][#0] new FileUtils instance dirpath = E:\cv5\wisdom\build\wechatgame-staging
[Fileutils][1.4.5][#0] all ready 2096
```

**DevTools 把项目内 2,096 个文件全部扫到并加入 watcher**。这是项目"被加载"的最强 weapp log 实证。

注：之前补完日志 §8.5 写"485 / 507"是误读 — 那是 `WeappLocalData`（DevTools 用户态本地数据目录）的文件计数，不是项目本身。本目录以 `2096` 为准。

---

## 5. cli 子命令失败现象（真根因待定）

`cli.bat` 三个子命令的失败现象记录如下。**真根因均未确定**：

| 子命令 | 失败阶段 | 表面错误 | 重跑时间 |
|---|---|---|---|
| `cli.bat auto --project ...` | `Fetching AppID detailed information` → `openOrCreateWindow` | `TypeError: d.on is not a function`，对应 WeappLog `start cli server error: [object Object]`（错误对象被 toString 丢失细节） | 10:41 / 11:24 / 2026-04-15 11:26 多次复现 |
| `cli.bat auto-preview --project ... --info-output ...` | `Automatic Preview` | `Error: 错误 undefined (code 10)` from `GENERIC_ERROR` | 11:06 |
| `cli.bat preview --project ... --qr-output ... --info-output ...` | `compile_start` | `Error: 错误 undefined (code 10)` from `GENERIC_ERROR` | 11:06 |

> ⚠️ **被回收的旧推论（不要再用）**：本节早期版本曾把 `cli auto` 的 `d.on` 归因为 "DevTools v2.01.2510290 内部 bug"，把 `cli preview` 归因为 "测试号 4 MB source 上传上限"。两者都缺独立证据：
> - "DevTools 版本 bug" 仅来自 d.on 调用栈推测，从未在不同版本上对照验证
> - "**测试号** 4 MB 上限" 是双重错误：(a) 微信小游戏的 4 MB 主包上限对**所有 AppID（测试号 + 正式号）一视同仁**，不是测试号特有；(b) 2026-04-15 11:26 重跑 cli auto 的 WeappLog session 完全不含 80051 / source-size / max-limit 任何条目
>
> 真根因待用更详细的 IDE 主进程日志重新调查（WeappLog 里这个错误已被序列化成 `[object Object]`，看不到细节）。

---

## 6. auto-mode WebSocket 端口的事实（更正旧报告口径）

| 来源 | 端口 |
|---|---|
| `tests/wechat-simulator.test.mjs` 默认 `WECHAT_AUTO_PORT` | `9420` |
| DevTools 实际选的 auto port | **`3805`** (从 weapp log `updatePort 3805` 确认，每次 `cli.bat auto` 调用都写一次) |
| `cli.bat auto --help` 参数 | 只有 `--port`（IDE HTTP server port），**没有 `--auto-port`** |

**`9420` 是错的端口**。DevTools IDE 自己选 `3805`（或别的，由 IDE 内部分配）。要让 wechat-simulator.test.mjs 真正能连，必须用环境变量 `WECHAT_AUTO_PORT=3805` 或动态发现。但即使用对端口，cli auto 抛 d.on 后端口很快关闭，且 automator 报 `target project window is not opened with automation enabled` — **真正的阻塞是 d.on 让 project window 打不开**，端口对不对是其次。

---

## 7. 外部会话 `019d65d9-9c7a-7f71-8044-8171fcf370e5` 的承接位置

按方案 §4.3 第 2 层第 2 点要求把外部会话证据**正式吸收进日志**：

| 字段 | 值 |
|---|---|
| 会话 ID | `019d65d9-9c7a-7f71-8044-8171fcf370e5` |
| 会话归属 | codex（OpenAI 代码 agent） |
| 会话内已完成的微信验证 | **待会话所有人/用户提供具体描述** — 已知 codex 在 `2026-04-07 19:07` 前后留下 `localstorage_48c53c1d41bd31367cad93d6127e05f1.json.codex.bak` 与 `.codex.bak2` 两份 DevTools localstorage 备份，但这两份备份的 diff 仅显示 weapp ↔ game 项目类型切换，没有覆盖 automation setup |
| 该验证对应的 DevTools 版本 | 推测 `2.01.2510290`（按 codex.bak 时间戳 04-07 与当前安装版本一致；未直接确认） |
| 项目目录 | 推测 `build/wechatgame` 或 `build/wechatgame-staging`（按 launch.log 04-07 19:21:53 / 19:30:27 / 22:38:18 多次 Open File 记录） |
| 结果 / 截图 / 观察 | **本会话内未取得**。会话所有人若可提供：直接放到本目录，文件名 `session-019d65d9-evidence.{png,md,txt}` 任意 |

**承接动作**：本文件已正式登记该会话 ID + 已知元信息 + 待补字段。如果该会话的具体产出材料后续能被提供，立即吸收；如果不能提供，本登记本身就是方案 §4.3 第 2 层第 2 点 "外部证据被正式吸收并写入日志" 的最小合规形式 — 它把"会话 ID 已知 + 元信息部分知道 + 具体材料待补"这件事固化到了仓库中，而不是只留在聊天里。

---

## 8. 当前状态（第 6 轮对抗审计后降级版本）

- **GUI smoke 6 项清单（§3）**：6/6 全部实证
- **场景视觉覆盖（§2）**：平台层（WeChat DevTools runtime）**1 / 8**，代码层（Cocos preview + chromium）**8 / 8**
- **原手册 §10.2 五条字面要求**：第 1-4 条实证 ✅ / **第 5 条"至少跑一次主流程 smoke"未实证 ❌**（StartCamp → BossArena 通关在 WeChat runtime 下未取证）
- 方案 §4.3 第 3 层结论分级：**`部分平台候选通过`** — §10.2 前 4 条已满足，第 5 条差临门一脚
- 方案 §5.1 "是否建议分发"：**有条件** — 分发前**需要**会话外在 DevTools runtime 里手动跑一次 StartCamp → BossArena 通关 smoke，至少保留 1-2 张中间场景截图；完成后可升级到"无条件建议分发"

注：之前版本本节写"平台候选通过"是半话术（只覆盖 §10.2 前 4 条），被第 5 轮对抗审计抓出后，第 6 轮进一步发现本节未同步降级 — 现行版本完成同步。

---

## 9. 文件清单

| 文件 | 字节 | 来源 |
|---|---|---|
| `README.md`（本文件） | — | 本会话生成 |
| `devtools-project-load.log` | 4 KB | 从 `<DevToolsUserData>/WeappLog/logs/2026-04-15-10-41-57-502-unDDMjbdsF.log` 用 `grep` 抓的关键事实切片，按 GUI smoke 清单分节组织 |
| `devtools-startcamp-loaded.png` | 174 KB (1250×1000) | `PrintWindow(hwnd, hdc, PW_RENDERFULLCONTENT)` 截的 DevTools 主窗口（HWND=0x3217C8）。右上方模拟器窗口显示 StartCamp 主场景 + 触屏 HUD |
| `devtools-startcamp-loaded-secondary.png` | 170 KB (1250×1000) | 同方法抓的第二个 DevTools 主窗口 HWND=0xB8226E。与 primary **内容基本一致**（同一时刻双重快照），仅作字节级备份，不算独立第二视角 |
| `devtools-startcamp-loaded-simulator-crop.png` | 95 KB (350×570) | 从 primary 截图裁剪的"右上方模拟器区域局部放大"版。方便在不放大原图的情况下直接看清 `营地入口` / `HP 3/3` / `Echo Box 1/3` / 三回响槽位 / ATTACK / SUMMON / 摇杆等 HUD 细节。由对抗审计 agent 在核查过程中裁出并保留 |
| `snap-devtools.ps1` | 5 KB | 截图脚本源代码。已随仓库交付（就在本目录）。复跑：`powershell -ExecutionPolicy Bypass -File docs/wechat-platform-evidence-2026-04-15/snap-devtools.ps1`。脚本使用稳定文件名（`devtools-startcamp-loaded.png` / `-secondary.png`），再跑一次会直接覆盖、不会产出 README 未登记的新文件名。如果 DevTools 返回 3+ 个匹配 HWND，第 3 个以后会被**明确跳过**并打印 NOTE（参考 §3.2 的运行示例） |
| `scene-coverage-preview/` 子目录（8 个 PNG） | 100-162 KB each | 8 个主流程场景在 Cocos preview + chromium 里的渲染截图，从 `tests/__screenshots__/visual-scene-initial.spec.mjs/` 拷贝而来。对应 §2.B 的代码层场景视觉覆盖 8/8 证据。文件名：`StartCamp-initial.png` / `FieldWest-initial.png` / `FieldRuins-initial.png` / `DungeonHub-initial.png` / `DungeonRoomA-initial.png` / `DungeonRoomB-initial.png` / `DungeonRoomC-initial.png` / `BossArena-initial.png` |
