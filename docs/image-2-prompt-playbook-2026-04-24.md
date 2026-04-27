# Image 2.0 Prompt Playbook

日期：2026-04-24

## 1. 用途

这份文档不是“灵感提示词草稿”，而是给后续执行 agent 直接复用的固定 prompt 手册。

目标：

- 让 `Image 2.0 / gpt-image-2` 的候选图生成不靠自由发挥
- 统一项目的可爱风北极星
- 降低“单张图好看，但进游戏就跑偏”的概率
- 让后续 batch 生成、筛选、导入都能直接引用同一套 prompt 结构

适用范围：

- `outdoor_wall_standard`
- `outdoor_wall_broken`
- `outdoor_wall_cracked`
- `outdoor_path_cobble`
- `outdoor_ground_flowers`
- `checkpoint`
- `portal`
- `breakable_target`
- `pickup_relic`
- `barrier_closed`
- `barrier_open`
- `common_enemy`
- `boss_shield_closed`
- `boss_shield_open`
- `projectile_arrow`
- `echo_box`
- `echo_spring_flower`
- `echo_bomb_bug`

特别说明：

- `player` 不再被视为“不能重做”
- 但 `player` 仍然不是普通资产批次里可以直接自动落地的对象
- `player` 走单独的 `player redesign track`
- 这条轨道只允许先做 `concept / paperdoll / key pose sheet`，不允许直接覆盖正式 live player

参考依据：

- [GPT Image 2 model page](https://developers.openai.com/api/docs/models/gpt-image-2)
- [Image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
- [GPT Image Generation Models Prompting Guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)
- [style_resource_gate.json](/E:/cv5/wisdom/assets/configs/style_resource_gate.json)
- [asset_selection_manifest.json](/E:/cv5/wisdom/assets/configs/asset_selection_manifest.json)

## 2. 固定北极星

所有 prompt 都必须同时满足：

- 明亮
- 温暖
- 可爱
- 圆润
- 玩具感
- 低噪声
- 顶视角可读
- 移动端小尺寸可读

所有 prompt 都必须显式排除：

- 黑暗地牢
- 灰重配色
- 脏绿噪点
- 写实裂纹
- 尖锐哥特
- 血腥压迫
- 冷硬金属
- 过重金边
- 像素 / 写实 / 手绘混搭
- 任何可识别商业 IP 复制感

## 3. 统一 Prompt 骨架

后续任何批次都不要从零写 prompt，统一按下面 8 段式骨架填空。

```text
[Asset Identity]
Create a single game asset for key: {key}.
Asset type: {tile | prop | enemy | fx}.
Use case in game: {scene role, gameplay purpose}.

[Style Target]
Bright, warm, cute, rounded, toy-like fantasy adventure.
Inspired by the feeling of a modern cheerful adventure game with diorama charm,
but do not copy any existing IP, character, icon, silhouette, emblem, or composition.

[Visual Language]
Soft chunky shapes, friendly proportions, simple readable silhouette,
clean hand-crafted material feel, low noise, low texture clutter,
gentle highlights, warm ambient color, playful fantasy mood.

[Rendering Constraints]
Top-down readable game asset, clear from small size, mobile-friendly readability,
simple value grouping, strong silhouette, minimal tiny details,
clean edges, consistent with a unified cute outdoor world set.

[Asset-Specific Requirements]
{describe shape, function, state, tileability, camera angle, variant relation, palette bias}

[Output Framing]
Centered asset, plain or transparent background, no scene mockup,
no UI, no text, no watermark, no frame, no drop shadow outside the asset.
If tile: seamless tile, orthographic top-down readability.
If prop/enemy: single isolated sprite-like asset.

[Negative Constraints]
No dark dungeon mood, no gray-heavy palette, no dirty green noise,
no realistic cracks, no sharp gothic forms, no blood, no horror,
no cold hard metal, no heavy gold trim, no pixel-art look,
no painterly realism, no mixed art styles, no photorealism.

[Variant Goal]
Generate {1 | 2 | 3} variants with the same family language,
keeping silhouette readable and production-safe.
```

## 4. 全局正向前缀

推荐每条 prompt 都带这段稳定前缀：

```text
bright warm cute toy-like top-down adventure game asset, soft rounded shapes, simplified paper-craft and clay-toy feeling, cheerful daylight, low contrast texture, low visual noise, cozy fairy-tale ruins, readable route language, clean silhouette, gentle beige green honey palette
```

用途：

- 统一世界观
- 压住“越生成越写实 / 越生成越黑”的漂移
- 给后续所有 key 一个共同家族感

## 5. 全局负面块

推荐每条 prompt 尾部都固定拼上这段：

```text
Do not copy any existing game IP, mascot, character, enemy, emblem, shrine, portal, or relic design.
No exact franchise resemblance.
No dark dungeon mood.
No gray-heavy palette.
No dirty green speckle noise.
No realistic cracks or realistic rubble.
No sharp gothic shapes.
No blood, gore, horror, menace, or oppressive atmosphere.
No cold hard metal as the primary material.
No excessive gold trim.
No photorealism.
No painterly realism.
No pixel art look.
No mixed visual styles.
No busy micro-detail that disappears at mobile size.
No text, labels, UI, watermark, mockup, frame, or background scene.
```

## 6. 资产类型模板

### 6.1 Tile 模板

```text
Create a seamless top-down environment tile for a cute fantasy adventure game.
Bright, warm, rounded, toy-like, low-noise, readable at small size.
Large simple shapes, soft material breakup, subtle variation, no harsh contrast.
The tile must repeat cleanly on all sides.
Avoid realistic debris, high-frequency noise, muddy dark patches, sharp cracks.
```

Semantic role rules:

- Ground and path tiles must read as broad surfaces that can cover large areas without turning into a framed patch, medallion, or obvious textured square.
- Wall tiles must read as modular structure, not as a single flat poster texture; cracks and seams should follow the wall material logic.
- If an asset is not meant to tile, render only the object silhouette with a tight crop and empty background instead of a full textured square.

适用：

- `outdoor_wall_standard`
- `outdoor_wall_broken`
- `outdoor_wall_cracked`
- `outdoor_path_cobble`
- `outdoor_ground_flowers`

### 6.2 Prop 模板

```text
Create a single top-down readable prop asset for a cute fantasy adventure game.
Friendly silhouette, rounded construction, warm colors, handmade toy-like feel.
Readable from mobile distance, with 2-4 big shape groups and restrained detail.
Isolated asset, centered, transparent or plain background, no text.
```

适用：

- `checkpoint`
- `portal`
- `echo_box`
- `breakable_target`
- `pickup_relic`
- `barrier_closed`
- `barrier_open`

### 6.3 Enemy 模板

```text
Create a single enemy asset for a bright, warm, cute fantasy action game.
Make it mischievous or playful rather than scary.
Round body plan, readable head-body contrast, simple facial read, iconic silhouette.
No gore, no horror, no realism, no aggressive spikes unless softened and toy-like.
```

适用：

- `common_enemy`

### 6.4 FX / Combat Prop 模板

```text
Create a stylized effect or combat prop asset for a bright, warm, cute fantasy game.
Use simple layered shapes, soft glow, clean color separation, readable motion implication.
Keep it lightweight, iconic, and mobile-readable.
No smoky dark VFX, no realistic particles, no neon sci-fi energy unless explicitly needed.
```

适用：

- `boss_shield_closed`
- `boss_shield_open`
- `projectile_arrow`
- `echo_spring_flower`
- `echo_bomb_bug`

### 6.5 Player Redesign 模板

这个模板只用于角色方向和纸娃娃候选，不用于直接出最终 live player。

```text
Create a top-down heroine design sheet for a bright, warm, cute fantasy adventure game.
The protagonist should feel like a young princess-like adventurer:
cheerful, brave, gentle, rounded, toy-like, and easy to recognize at mobile scale.
Design for paperdoll readability: clear head-body separation, readable hair mass,
simple dress or tunic layering, soft accessories, strong silhouette from top-down gameplay view.
Keep the style handcrafted, low-noise, warm, and friendly.
Do not copy any existing franchise protagonist, costume, crown, emblem, hairstyle, or signature color blocking.
Output as a concept or state-sheet candidate, not as a final promotional illustration.
```

## 7. Key Prompt 示例

### 7.1 outdoor_wall_standard

```text
Create a seamless top-down wall tile for key: outdoor_wall_standard.
Cute outdoor ruin wall for a bright, warm, toy-like fantasy adventure game.
Use soft stone blocks with rounded edges, creamy beige and warm sandstone tones,
subtle moss accents only, very low noise, clean readable seams.
The wall should feel hand-built and friendly, not ancient-horror or realistic ruin.
Seamless tile, orthographic readability, mobile-friendly.
No dark gray bricks, no dirty green speckle noise, no realistic erosion, no gothic mood.
```

### 7.2 outdoor_wall_broken

```text
Create a seamless top-down wall tile for key: outdoor_wall_broken.
Same family as outdoor_wall_standard, but partially collapsed in a cute readable way.
Use chunky broken gaps, rounded fallen pieces, soft stone chunks,
playful ruin feeling rather than violent destruction.
Keep the silhouette broad and readable, with clear walkable vs blocked read.
No sharp rubble, no photoreal cracks, no war damage realism, no dark ruin palette.
```

### 7.3 outdoor_wall_cracked

```text
Create a seamless top-down wall tile for key: outdoor_wall_cracked.
Same family as outdoor_wall_standard, but it must read as a clearly damaged state at mobile size.
Use a small number of large rounded crack paths, visible across major blocks, with soft warm shadow and tiny friendly chips.
Cracks should be broad and readable, not hairline fracture maps and not dense all-over texture.
Keep the tile bright, warm, toy-like, and seamless.
The state difference from outdoor_wall_standard should be obvious in one quick glance.
No black crack webs, no dirty grime, no grim dungeon atmosphere, no realistic ruin damage.
```

### 7.4 outdoor_path_cobble

```text
Create a seamless top-down path tile for key: outdoor_path_cobble.
Warm cheerful cobblestone path for a cute fantasy field scene.
Use rounded stones, soft spacing, creamy tan and honey-gray palette,
clean walking read, low noise, gentle highlight, no harsh outlines.
The path should feel welcoming and toy-like, like a crafted miniature board path.
No dark wet stones, no realistic gravel, no sharp broken pavement, no muddy look.
```

### 7.5 outdoor_ground_flowers

```text
Create a seamless top-down ground tile for key: outdoor_ground_flowers.
Cute grassy meadow ground with tiny warm flowers for a bright fantasy adventure.
Use very broad calm grass color fields first, then add only a few sparse stylized flower accents.
This tile should support gameplay readability before decoration.
Flowers must feel occasional, not evenly scattered confetti and not a floral carpet.
Keep the center of the read calm enough for small actors, pickups, and markers to stay visible.
This is a base floor surface, not a decorative flower patch.
It must feel natural when repeated across a large walkable area and must not create a square block read.
No dirty green static noise, no realistic grass blades, no cluttered botanical detail, no wallpaper-like full coverage.
```

### 7.6 checkpoint

```text
Create a single prop asset for key: checkpoint.
A warm, magical checkpoint marker for a cute fantasy adventure game.
Rounded beacon form, friendly carved stone or wood base, soft golden glow,
easy to recognize instantly as a save or rest marker.
Top-down readable, centered, isolated asset, simple silhouette.
No sci-fi terminal, no gothic shrine, no heavy metal trim, no realistic torch.
```

### 7.7 portal

```text
Create a single prop asset for key: portal.
A traversal portal for a bright, warm, cute fantasy adventure game.
Use a rounded arch or ring form, playful magical energy, soft blue-gold or teal-gold glow,
friendly and inviting, not dangerous.
Keep the silhouette iconic and readable from small size.
No dark void portal, no horror vortex, no sharp runes, no sci-fi machinery.
```

### 7.8 breakable_target

```text
Create a single prop asset for key: breakable_target.
Cute breakable crate or treasure-box hybrid for a bright fantasy adventure game.
Rounded corners, warm wood, simple latch or band detail, playful adventure feeling.
Readable at small size, top-down isolated asset, clear breakable affordance.
No realistic splinters, no dark storage crate, no gritty dungeon prop.
```

### 7.9 pickup_relic

```text
Create a single reward prop asset for key: pickup_relic.
A room-clear relic for a cute fantasy adventure game.
Small precious object with warm gold, cream stone, and gentle colored gem accents,
feels delightful and collectible, not realistic treasure.
Readable, centered, toy-like, celebratory, simple silhouette.
No ornate realistic crown, no grim artifact, no excessive gold trim.
```

### 7.10 barrier_closed

```text
Create a single prop asset for key: barrier_closed.
Closed path barrier for a bright, warm, cute fantasy adventure game.
Friendly magical or crafted obstacle language, rounded posts or panels,
clearly reads as blocked but not hostile.
Keep it top-down readable and visually related to barrier_open.
No prison bars, no black iron gate, no oppressive fortress mood.
```

### 7.11 barrier_open

```text
Create a single prop asset for key: barrier_open.
Open state matching barrier_closed in the same visual family.
The path should now clearly read as passable, with lighter energy and more open spacing.
Cute fantasy crafted logic, rounded forms, same palette family as barrier_closed.
No broken horror gate, no realistic machinery, no dark dungeon framing.
```

### 7.12 common_enemy

```text
Create a single enemy asset for key: common_enemy.
Cute mischievous overworld enemy for a bright fantasy adventure game.
Round compact body, playful face, clear front read, soft horns or fins only if rounded,
friendly-dangerous rather than scary.
Use warm earthy body colors with one accent color.
No horror monster, no insect realism, no sharp spikes, no dark dungeon mood.
```

### 7.13 boss_core

```text
Create a single boss core asset for key: boss_core.
Cute fantasy boss centerpiece for a bright, warm, toy-like adventure game.
Design it as a compact top-down boss body, not a full character illustration:
round magical seed-orb, petal-shell, or jewel-creature silhouette with one clear face read,
clear center mass, readable at mobile scale, and strong state readability when recolored for danger / hurt / vulnerable.
Transparent background, centered object, no scene backdrop, no cast shadow.
No grim demon eye, no black-red void heart, no razor crown, no heavy mech shell, no horror idol energy.
```

### 7.14 boss_shield_closed

```text
Create a single boss shield asset for key: boss_shield_closed.
Closed shield state for a cute fantasy boss encounter.
It should feel magical, toy-like, and readable: rounded shield petals or lobes,
warm protective glow, sturdy but not threatening.
Designed as one half of a pair with boss_shield_open, same family language.
No hard sci-fi shield, no black-red demon barrier, no razor-like shards.
```

### 7.15 boss_shield_open

```text
Create a single boss shield asset for key: boss_shield_open.
Open shield state matching boss_shield_closed in the same art family.
The shield should visibly separate or unfold into a vulnerable-state presentation,
with clearer inner opening, lighter glow, and more open silhouette.
Cute fantasy magical mechanism, not mechanical sci-fi.
No dark energy ring, no harsh metallic blades, no chaotic particle storm.
```

### 7.16 projectile_arrow

```text
Create a single combat prop asset for key: projectile_arrow.
Cute stylized dart or arrow projectile for a bright fantasy adventure game.
Simple shape, clear directionality, toy-like construction, readable at small size.
Use a restrained palette and avoid tiny ornament.
No realistic weapon rendering, no sharp brutal metal, no dark assassin vibe.
```

### 7.17 echo_spring_flower

```text
Create a single summon asset for key: echo_spring_flower.
Cute spring flower companion for a bright fantasy adventure game.
Round floral body, friendly pet-like energy, soft petals, warm pastel accents,
magical but grounded, easy to recognize from small size.
No botanical realism, no dense petal detail, no fragile illustration look.
```

### 7.18 echo_bomb_bug

```text
Create a single summon asset for key: echo_bomb_bug.
Cute bomb bug companion for a bright fantasy adventure game.
Round bug body, toy-like shell, playful explosive motif, readable from distance,
slightly mischievous, not disgusting.
Warm red-orange and cream palette with a controlled dark accent.
No realistic insect anatomy, no gore, no scary mandibles, no dirty textures.
```

### 7.19 player concept / paperdoll direction

```text
Create a top-down heroine concept sheet for the player character in a bright, warm, cute fantasy adventure game.
The character should feel like a princess-like young adventurer: brave, gentle, cheerful, and magical,
with a rounded toy-like silhouette and clean paperdoll readability.
Design for gameplay, not for a splash illustration:
clear head-body separation, readable hairstyle shape, simple cape or skirt logic,
clean front / back / side turn readability, mobile-scale visibility first.
Warm cream, honey, soft coral, and light teal or sky accents are welcome,
but keep the palette controlled and unified with a cozy outdoor world.
Do not copy any existing franchise heroine, princess costume, crown, icon, emblem, or exact silhouette.
No realistic anatomy rendering, no ornate JRPG overload, no dark fantasy styling.
```

## 8. 多轮迭代策略

### 8.1 第一轮：定大方向

第一轮的目标不是终稿，而是先确认它有没有进入正确世界。

第一轮必须优先验证：

- 有没有进入明亮、温暖、可爱、圆润、玩具感
- 有没有明显掉进黑暗地牢或脏绿噪点
- 小尺寸下轮廓是不是仍可读

第一轮写法：

- 只强调 `bright / warm / cute / rounded / toy-like`
- 只强调 `top-down readable / mobile-readable`
- 只要求 2 到 3 个核心材质词
- 不要一上来塞太多局部细节

### 8.2 第二轮：修项目问题

不要整段推翻，按失败点小步修正。

| 失败现象 | Prompt 修法 |
| --- | --- |
| 太脏 | `clean large shapes, lower texture noise, simpler surface breakup` |
| 太黑 | `higher value range, lighter base colors, sunlit warmth` |
| 太写实 | `stylized toy-like construction, simplified cracks, fewer realistic materials` |
| 太不清晰 | `stronger silhouette, fewer tiny details, clearer big-medium-small shape hierarchy` |
| 太像某个现成游戏 | 去掉过于具体的类比词，改成抽象风格描述 |
| 花草太抢眼 | `sparser accents, broader color grouping, less decorative density` |
| 门 / 奖励看不懂 | `stronger affordance, more iconic silhouette, clearer state read` |

### 8.3 第三轮：成对资产统一

适用：

- `barrier_closed` / `barrier_open`
- `boss_shield_closed` / `boss_shield_open`

第三轮必须加入：

- `same family language`
- `same palette family`
- `same construction logic`
- 只改状态差异，不改资产家族

## 9. Generate 还是 Edit

### 9.1 优先直接生成

更适合直接生成多版候选：

- `outdoor_wall_standard`
- `outdoor_wall_broken`
- `outdoor_wall_cracked`
- `outdoor_path_cobble`
- `outdoor_ground_flowers`

原因：

- 它们是风格母题
- 它们决定场景语法
- 它们属于 `must-redo`

### 9.2 更适合 image edit + reference

更适合“保结构、改表面”的 key：

- `checkpoint`
- `portal`
- `barrier_closed`
- `barrier_open`
- `boss_shield_closed`
- `boss_shield_open`
- `pickup_relic`

原因：

- 这些承担交互语义
- 现有玩法认知不应该被彻底推翻
- 编辑 + reference 更适合保住结构和状态差

### 9.3 两者都可，但建议先参考编辑

- `breakable_target`
- `projectile_arrow`
- `echo_spring_flower`
- `echo_bomb_bug`
- `common_enemy`

原因：

- 它们有现成玩法认知和尺寸约束
- 纯生成更容易“单图好看，但不适配游戏”

### 9.4 Player 只走 reference-guided redesign

`player` 当前不应走“纯生成一张图然后直接替换”的路径。

更合适的方式：

- 先从当前 player 运行时截图或现有拆件出发
- 做 `reference-guided edit`
- 让模型在保留顶视角可读性的前提下，把角色往“可爱的公主冒险者”方向统一
- 先出多状态样张，再决定是否进入纸娃娃拆件重绘

优先顺序：

1. 角色气质方向图
2. front / back / side 基础朝向
3. idle / walk / attack 关键帧样张
4. 纸娃娃拆件方案
5. 单场景 preview

## 10. 推荐批次顺序

不要全量铺开，建议按这条顺序：

1. `outdoor_wall_standard`
2. `outdoor_path_cobble`
3. `outdoor_ground_flowers`
4. `outdoor_wall_broken`
5. `outdoor_wall_cracked`
6. `checkpoint`
7. `portal`
8. `barrier_closed`
9. `barrier_open`

## 11. 批次文件建议

建议后续把这份 playbook 资产化成下面这些文件：

- `temp/image2/prompt-library/global-style.txt`
- `temp/image2/prompt-library/negative-style.txt`
- `temp/image2/prompt-library/type/tile.txt`
- `temp/image2/prompt-library/type/prop.txt`
- `temp/image2/prompt-library/type/enemy.txt`
- `temp/image2/prompt-library/type/fx.txt`
- `temp/image2/prompt-library/by-key/<bindingKey>.txt`
- `temp/image2/jobs/<batchId>/prompts.json`

`prompts.json` 推荐字段：

- `bindingKey`
- `assetType`
- `prompt`
- `negativePrompt`
- `referenceMode`
- `targetSize`
- `variantCount`
- `scenes`
- `notes`

## 12. 一句话原则

先用固定骨架收紧风格，再用小步迭代修正失败点，而不是每次都把 prompt 重写成另一套世界观。
