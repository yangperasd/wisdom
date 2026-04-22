# 给 Claude 的 Demo 收口补完方案（2026-04-14）

## 1. 方案目标

这不是让 Claude 重做一轮大修，而是让 Claude 把已经做到 80% 的 demo 收口，补完最后那 20% 的严谨性、平台验证和证据质量。

唯一目标：

- 把当前 demo 的交付状态从“代码和自动化基本好了，但平台收口没闭环”推进到“结论可信、证据完整、文档不打架”

## 2. 当前基线判断

当前状态可以作为本方案的起点：

- 四个关键问题的代码修复先不推翻，除非复测出现回归
- `typecheck`、`test:node`、`test:all`、`demo-playthrough-audit`、视觉套件、微信构建与产物校验当前都能通过
- 最大缺口不在代码主链，而在：
  - 平台 smoke 没有闭环
  - 一条必跑命令本身是坏的
  - 完成报告和手册口径不一致
  - 外部微信验证证据没有被吸收到正式交付中

## 3. Claude 在这轮补完里禁止做的事

Claude 不允许：

- 因为“还有缺口”就重新大改四个已修问题
- 趁机扩功能、扩内容、改 UI 风格
- 不经验证就重写完成报告
- 继续用“自动化条件不具备”来跳过所有微信侧动作
- 把信息性 PASS、SKIP 或 launch request 当成真正 smoke 通过

Claude 只允许做：

- 修复命令级验证缺口
- 补齐平台验证证据
- 修正文档结论
- 在必要时做最小代码或测试修补，以让验收命令本身真正可运行

## 4. 本轮必须完成的四件事

### 4.1 修好命令级验收缺口

第一优先级不是改业务代码，而是修好手册里本来就要求必须运行、但当前实际不可用的命令。

当前已知缺口：

- `npm run test:responsive`

Claude 必须：

1. 先复现这条命令失败。
2. 确认失败不是环境偶发，而是脚本本身写法问题。
3. 用最小改动修复它。
4. 用修复后的**原生命令**重新跑通，而不是继续绕过脚本只跑单文件。

推荐修复方向：

- 把 `package.json` 里的 `test:responsive` 从依赖通配写法，改成显式文件列表

通过标准：

- `npm run test:responsive` 直接 PASS
- 不需要人工换命令
- 文档中不再存在“手册要求的命令本身不能跑”的情况

### 4.2 重新跑一轮“按手册原文”的机器候选验收

Claude 必须在修好命令缺口后，重新跑下面这组命令，并把结果写入新日志：

```powershell
npm run test:typecheck
npm run test:node
npm run test:all
npm run test:responsive
npx playwright test -c ./playwright.config.mjs tests/visual-scene-initial.spec.mjs
npx playwright test -c ./playwright.config.mjs tests/visual-hud-layout.spec.mjs
npx playwright test -c ./playwright.config.mjs tests/visual-echo-buttons.spec.mjs
npx playwright test -c ./playwright.config.mjs tests/visual-gate-states.spec.mjs
npx playwright test -c ./playwright.config.mjs tests/visual-boss-states.spec.mjs
npx playwright test -c ./playwright.config.mjs tests/demo-playthrough-audit.spec.mjs
npm run build:wechat
npm run verify:wechat
```

要求：

- 不允许只引用旧日志
- 必须给出本轮实际执行的命令与结果
- 如果任何一条失败，先修问题再继续，不得跳过

### 4.3 把微信平台验证做成分层闭环

这一轮的关键不是重复写“auto mode 有 bug”，而是把微信平台验证拆成三层，并穷尽当前环境里能做的手段。

#### 第 1 层：自动化平台验证

Claude 先检查 auto-mode 是否真实可用：

```powershell
node --test tests/wechat-simulator.test.mjs
```

但解释结果时必须遵守：

- 只有真正进入 `connected` 分支并跑完非信息性断言，才算自动化平台验证通过
- `assert.ok(true)` 这种信息性 PASS 不得写成“平台通过了一部分”
- 如果端口没开，只能写“auto-mode 未启动或不可用”
- 如果端口开了但 connect 失败，才能进一步讨论版本 bug 或初始化 bug

#### 第 2 层：微信开发者工具 GUI smoke

如果 auto-mode 没跑起来，Claude 不能停止，必须继续走 GUI 路径：

```powershell
npm run open:wechat
```

然后补齐以下证据中的至少一组：

1. 如果 Claude 能直接使用当前环境里的 GUI/会话能力，就在微信开发者工具里完成一次最小 smoke：
   - 打开项目
   - 进入 `StartCamp`
   - 证明触屏 HUD 或主场景已加载
   - 记录工具版本、项目路径、至少一张截图

2. 如果 Claude 无法直接操作 GUI，但已有外部会话证据，则必须把外部证据正式吸收进日志：
   - 记录会话 ID：`019d65d9-9c7a-7f71-8044-8171fcf370e5`
   - 明确该会话里完成了什么微信验证
   - 明确该验证对应的 DevTools 版本、项目目录、结果和截图/观察
   - 把它写入正式日志，而不是只留在聊天里

只有在下面三项都不具备时，Claude 才允许把 GUI smoke 标记为外部阻塞：

- `npm run open:wechat` 失败
- 无法直接使用 GUI
- 无可引用的外部会话证据

#### 第 3 层：结论分级

微信侧最终只能写成以下三种之一：

1. `平台候选通过`
2. `仅机器候选通过，平台候选未达成`
3. `平台验证被明确外部条件阻塞`

不得再写：

- “应该差不多”
- “部分算平台通过”
- “auto bug 所以默认算做不了”

## 5. 必须修正的文档问题

Claude 在补完这轮工作时，必须同步修正文档，不允许让代码状态和文档状态继续打架。

### 5.1 必须修正完成报告的结论

当前 [demo完成报告-2026-04-14.md](/E:/cv5/wisdom/docs/demo完成报告-2026-04-14.md:13) 写了：

- 当前结论：机器候选通过
- 是否建议发给测试人员：是

这和 [原手册对“建议分发给测试人员”的要求](/E:/cv5/wisdom/docs/给测试人员的Demo推进方案-2026-04-14.md:741) 不一致，因为原手册要求先达到 `平台候选通过`。

Claude 必须二选一：

1. 真正补齐平台 smoke，然后保留“建议分发”
2. 如果平台 smoke 仍未完成，就把结论改成：
   - `机器候选通过，平台候选未达成，暂不建议按原手册口径分发`

### 5.2 必须修正 `wechat-simulator` 的证据口径

Claude 必须在日志与报告里明确写出：

- 哪些是信息性检查
- 哪些是真正的断言
- 哪些被 skip
- skip 的直接事实是什么
- skip 的原因是“已确认事实”还是“推测原因”

不能再把：

- `1 个信息性 PASS`

写成：

- `平台侧已经部分通过`

### 5.3 必须修正修改文件清单

如果某个文件只是本地缓存或临时运行期产物，而不是这次仓库交付的一部分，就不能和正式修改文件混写在一起。

特别是：

- `library/...`

Claude 必须明确区分：

- 仓库交付文件
- 本地缓存/运行期辅助证据

## 6. 新日志与新报告要求

Claude 这轮不能只改旧日志的一两句，必须新增一轮补完文档，建议新增：

- `docs/demo收口补完执行日志-2026-04-14.md`
- `docs/demo收口补完完成报告-2026-04-14.md`

这两份文档必须聚焦“补完工作”，而不是复制旧内容。

### 补完执行日志至少要包含

- `npm run test:responsive` 的失败复现与修复
- 本轮重跑的完整命令清单
- 微信自动化平台验证结果
- 微信开发者工具 GUI smoke 的证据或外部阻塞说明
- 对旧报告中不准确表述的修正说明

### 补完完成报告至少要回答

1. 当前到底是不是 `平台候选通过`
2. 如果不是，卡在哪里
3. 当前是否还能写“建议分发给测试人员”
4. 哪些证据是本轮新增补齐的
5. 哪些历史结论被回收或修正了

## 7. 本轮执行顺序

Claude 必须严格按这个顺序做：

1. 复现并修好 `npm run test:responsive`
2. 重跑机器候选验收命令
3. 跑 `node --test tests/wechat-simulator.test.mjs`
4. 跑 `npm run open:wechat`
5. 尝试补齐 GUI smoke 或吸收外部会话证据 `019d65d9-9c7a-7f71-8044-8171fcf370e5`
6. 重新判定是否达到 `平台候选通过`
7. 修正旧日志/旧报告或新增补完报告

不得跳步。

## 8. 通过标准

这轮补完只有满足以下全部条件，才算完成：

- `npm run test:responsive` 已被修好并直接可跑
- 机器候选验收命令本轮已全部重跑
- 微信平台验证已被分层说明清楚
- 至少完成以下之一：
  - 自动化平台验证通过
  - GUI smoke 有真实证据
  - 外部会话证据被正式吸收并写入日志
- 完成报告与原手册结论一致，不再自相矛盾
- 不再把信息性 PASS、SKIP 或 launch request 写成平台通过

## 9. 失败时的正确交付方式

如果补完后仍然做不到 `平台候选通过`，Claude 也不允许含糊收尾。

必须明确交付：

- 机器候选部分已经完成到什么程度
- 平台候选为什么没达成
- 是工具链问题、GUI 受限，还是外部证据未纳入
- 当前是否建议分发

允许的最终结论示例：

- `已完成机器候选通过；平台候选未达成；当前不建议按原手册口径分发给测试人员`

不允许的最终结论示例：

- `基本好了，可以先发吧`
- `微信那边应该问题不大`
- `虽然没做 smoke，但大概能跑`

## 10. 给 Claude 的直接提示词

```text
你现在不要重做 Stage 1 的四个核心修复，除非复测发现回归。

你的任务是把 demo 收口的最后一段补完，重点是：
1. 修好手册里坏掉的命令级验证（尤其是 npm run test:responsive）。
2. 重跑一轮按手册原文定义的机器候选验收。
3. 不要再把 wechat-simulator 的信息性 PASS 写成平台验证进展。
4. 不要再把“auto mode 没起来”直接写成“微信无法验证”。
5. 必须继续推进到 open:wechat，并补齐 GUI smoke 或把外部会话证据 019d65d9-9c7a-7f71-8044-8171fcf370e5 正式纳入日志。
6. 重新判断是否达到平台候选通过；如果没有达到，就明确回收“建议分发给测试人员”的结论。
7. 交付时必须新增补完日志和补完完成报告。
```
