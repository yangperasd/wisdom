# Loop41 ComfyUI Cute Sample Brief

日期：2026-04-22

## 目标

约束 ComfyUI / AI 生成流程，让它只产出 P0 tiny sample sheet 的候选图，不再把未经筛选的生成图直接装进游戏。

北极星是接近《智慧的再现》给人的明亮、温暖、可爱、圆润、玩具感，但不复制具体角色、图案、Logo、UI 或专有资产。我们要学习的是气质：小模型、童话、清爽、低噪声、路径清楚。

## 不可越界

| 禁止 | 原因 |
| --- | --- |
| AI 图直接定稿 | 必须先过评分、拼贴预览、包体估算和人工确认 |
| AI 图直接改 `asset_binding_manifest_v2.json` | 候选不等于正式绑定 |
| 大面积生成整场景 | 会失控、混风格、增加包体 |
| 模仿具体 IP 图案或角色 | 需要保持原创 |
| 生成 HUD 主皮肤 | HUD 当前保持程序化温暖占位，最终需单独定稿 |

## 输出范围

只生成五个 P0 key 的样张候选：

| Key | 输出 |
| --- | --- |
| `outdoor_wall_standard` | 1-2 张标准边界 / 矮墙候选 |
| `outdoor_wall_broken` | 1-2 张破损边界候选 |
| `outdoor_wall_cracked` | 1-2 张可破坏裂纹候选 |
| `outdoor_path_cobble` | 1-2 张主路径候选 |
| `outdoor_ground_flowers` | 1-2 张花草点缀地表候选 |

不生成：

| 禁止生成 | 原因 |
| --- | --- |
| 主角主体 | 已保护在 hand-curated paperdoll path |
| Boss 主体 | 必须人类定稿 |
| 主 HUD | 需要单一 HUD 语言，不和场景图混在一起生成 |
| 关键交互提示文字 | 禁止文字烘进贴图 |
| 整张场景大图 | 首发包体和可维护性风险高 |

## 通用正向提示词

建议把提示词拆成稳定前缀 + 每个 key 的具体描述。

稳定前缀：

```text
bright warm cute toy-like top-down adventure game tile, soft rounded shapes, simplified paper-craft and clay-toy feeling, cheerful daylight, low contrast texture, low visual noise, readable walking path, cozy fairy-tale ruins, gentle color palette, clean silhouette, no text, no UI, no characters
```

中文意图：

```text
明亮、温暖、可爱、像玩具模型的俯视冒险游戏 tile；圆润、低噪声、低对比、路径清楚；像纸雕或黏土玩具，不要写实地牢，不要文字，不要 UI，不要角色。
```

## 通用负向提示词

```text
dark dungeon, horror, gothic, sharp spikes, realistic cracks, dirty green noise, muddy texture, black stone, cold metal, blood, heavy gold trim, high frequency detail, grunge, photorealistic, gritty, wet cave, skulls, bones, text, letters, labels, UI panel, button, logo, character, boss, weapon, violent, scary, oppressive, over-detailed, noisy
```

中文负向：

```text
不要黑暗地牢、恐怖、哥特、尖刺、写实裂纹、脏绿噪点、黑石头、冷硬金属、血腥、重金边、高频细节、写实、潮湿洞窟、骷髅、文字、按钮、UI、Logo、角色、Boss、武器、压迫感。
```

## 分 key 提示

### `outdoor_wall_standard`

```text
small rounded low wall edge tile, warm beige stone or soft wood-stone hybrid, toy diorama boundary, gentle highlight, readable border, cute adventure camp edge
```

失败信号：

- 像墓穴墙。
- 黑灰比例过高。
- 边缘太尖或太金属。

### `outdoor_wall_broken`

```text
broken rounded wall tile, cute soft ruin fragment, warm stone, chipped but friendly, no horror, no sharp danger, clear large shapes, toy-like ruin edge
```

失败信号：

- 破损像灾难现场。
- 裂口太写实、太锋利。
- 颜色冷灰、压迫。

### `outdoor_wall_cracked`

```text
cracked wall tile for a cartoon breakable obstacle, simple readable crack symbol, rounded stone, warm color, playful puzzle affordance, clear but not scary
```

失败信号：

- 裂纹像恐怖片。
- 可破坏点不清楚。
- 需要文字才能懂。

### `outdoor_path_cobble`

```text
warm cobble walking path tile, clear top-down direction, rounded stones, soft tan and honey colors, low detail, readable route, cozy adventure trail
```

失败信号：

- 路径和地面分不开。
- 石头细节太碎。
- 对比太高抢玩家。

### `outdoor_ground_flowers`

```text
warm grass and tiny flower ground tile, soft low-noise meadow, sparse cute flowers, gentle green, no dirty noise, toy garden feeling, readable background
```

失败信号：

- 花草变成脏绿纹理。
- 高频点太多。
- 背景比角色和路径抢眼。

## 生成设置建议

这些不是硬技术参数，只是防止失控的约束：

| 项 | 建议 |
| --- | --- |
| 单图尺寸 | `128x128` 或 `256x256` 起步 |
| 变体数量 | 每个 key 最多保留 2 个候选 |
| Contact sheet | 不超过 `1024x1024` |
| 细节 | 宁可少，不要密 |
| 色板 | 控制在温暖浅色系 |
| 文本 | 禁止任何可读字母或符号 |
| 透明通道 | 只有墙体边界需要时再考虑 |

## 人工筛选流程

1. 先看缩略图，删除黑、脏、写实、尖锐、恐怖的图。
2. 每个 key 最多留下 2 张。
3. 按 8 项风格评分打分，低于 `12/16` 淘汰。
4. 放进 contact sheet，不进工程。
5. 做 `StartCamp`、`FieldWest`、`FieldRuins`、`DungeonHub`、`BossArena` 小拼贴。
6. 估算压缩体积，总候选目标 `<= 256 KiB`。
7. 人类确认后，才允许开后续“候选资源导入”分支。

## 导入前拒绝清单

任何一项为“是”，都不能导入：

| 检查 | 是/否 |
| --- | --- |
| 是否像黑暗地牢？ |  |
| 是否有脏绿噪点？ |  |
| 是否有写实裂纹？ |  |
| 是否有冷硬金属？ |  |
| 是否有过重金边？ |  |
| 是否有文字或 UI 烘进图里？ |  |
| 是否和当前温暖 HUD 打架？ |  |
| 是否让路径更难读？ |  |
| 是否让玩家或交互点更不明显？ |  |
| 是否会让新增体积超过样张预算？ |  |

## 原创性复核

任何一项为“是”，都不能导入，也不能进入正式评审：

| 检查 | 是/否 |
| --- | --- |
| 是否能看出具体商业游戏的角色轮廓？ |  |
| 是否出现可识别的专有图案、徽章、Logo 或 UI 构图？ |  |
| 是否像是在复刻某个现成截图而不是原创 tile？ |  |
| 是否依赖“某 IP 风格”才能解释它为什么好看？ |  |
| 是否可以用项目自己的风格词描述：明亮、温暖、可爱、圆润、玩具感、低噪声、路径清楚？ |  |

## 结论

ComfyUI 只能负责“候选生成”，不能负责“美术定稿”。这轮最重要的不是多出图，而是把生成器约束到明亮、温暖、可爱、低噪声、路径清楚的狭窄通道里，再用评分、拼贴、包体和人工审查拦住丑图进工程。
