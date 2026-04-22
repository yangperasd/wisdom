# Loop39 风格资源决策表

日期：2026-04-22

## 定位

这份表是 `style_resource_gate.json`、`asset_binding_manifest_v2.json` 和当前首发场景接线的文档视图，不是新的事实源。

唯一事实源仍然是：

- 意图与风格门禁：`assets/configs/style_resource_gate.json`
- 当前绑定：`assets/configs/asset_binding_manifest_v2.json`
- 场景实际接线：`assets/scenes/*.scene`

本文只回答：每个关键资源 key 现在该保留、重做、候选、还是交给人类定稿；以及它是否允许影响微信主包。

## 决策口径

| 决策 | 含义 |
| --- | --- |
| 保留 | 当前状态可继续作为首发实现的一部分 |
| 过渡保留 | 可以继续跑流程，但不得作为最终可爱风锚点 |
| 必须重做 | 不允许作为最终视觉，进入正式美术前必须替换或重新定调 |
| 局部候选 | 只能作为局部点缀或参考，不能升级为全局风格锚点 |
| 人类定稿 | 必须由人类美术/产品拍板，自动化不能决定 |

包体口径：

| 规则 | 结论 |
| --- | --- |
| 当前主包硬线 | `4 * 1024 * 1024 bytes` |
| 当前预警线 | `3.7 MiB` |
| 脚本远程 | 禁止 |
| AI 大图直接进主包 | 禁止，除非先通过风格评分、缩放预览、场景验收和包体增量检查 |
| `paths: []` | 通常表示当前为程序化 / RectVisual 占位，不等于资源缺失，也不等于已经可以作为最终美术发售 |

漂移保护：如果 `style_resource_gate.json`、`asset_binding_manifest_v2.json` 或首发场景接线发生变化，本表必须重新生成或复核；不得把本文当成长期冻结的第二事实源。

## P0 决策

| Key | 当前角色 | 当前状态 | 首发使用 | 决策 | 包体动作 | 人类边界 |
| --- | --- | --- | --- | --- | --- | --- |
| `outdoor_wall_standard` | must-redo | `rect_visual_placeholder` | `StartCamp`, `BossArena` | 必须重做 | 不新增 bitmap，先做小样张和增量估算 | 最终墙体色温、圆角、材质由人类定稿 |
| `outdoor_wall_broken` | must-redo | `rect_visual_placeholder` | `FieldRuins` | 必须重做 | 不直接导入 AI 裂墙图 | 破损程度上限由人类定稿 |
| `outdoor_wall_cracked` | must-redo | `rect_visual_placeholder` | `FieldRuins`, `BossArena` | 必须重做 | 禁止写实裂纹直接进主包 | 裂纹必须可爱化、低压迫 |
| `outdoor_path_cobble` | must-redo | `rect_visual_placeholder` | `StartCamp`, `FieldWest`, `FieldRuins`, `DungeonRoomA`, `DungeonRoomC` | 必须重做 | 先用程序化色块验证路径语言 | 路径 tile 的形状、明度、人眼优先级由人类定稿 |
| `outdoor_ground_flowers` | must-redo | `rect_visual_placeholder` | `StartCamp`, `FieldWest`, `FieldRuins`, `DungeonRoomB` | 必须重做 | 不允许脏绿噪点或密集花纹直接进主包 | 花草密度和低噪声标准由人类定稿 |

## P1 决策

| Key | 当前角色 | 当前状态 | 首发使用 | 决策 | 包体动作 | 人类边界 |
| --- | --- | --- | --- | --- | --- | --- |
| `outdoor_ground_green` | transition | `rect_visual_placeholder` | `StartCamp`, `FieldWest`, `DungeonRoomA`, `DungeonRoomB` | 过渡保留 | 可继续无图占位，不作为最终锚点 | 最终草地色板需人类确认 |
| `outdoor_ground_ruins` | transition | `rect_visual_placeholder` | `FieldRuins`, `DungeonRoomB`, `DungeonRoomC` | 过渡保留 | 可继续无图占位，不扩大使用面 | 遗迹是否偏童话神殿或营地遗迹需人类选择 |
| `portal` | transition | `rect_visual_placeholder` | 全首发路线 | 过渡保留 | 当前无新增包体风险 | 最终入口轮廓必须和 checkpoint 区分 |
| `checkpoint` | transition | `rect_visual_placeholder` | 全首发路线 | 过渡保留 | 当前无新增包体风险 | 最终检查点必须温暖、可爱、低噪声 |
| `common_enemy` | transition | `rect_visual_placeholder` | `StartCamp`, `FieldWest`, `FieldRuins`, `DungeonRoomA/B/C` | 局部候选 | 不启用生成图主体 | 敌人最终轮廓不可恐怖化 |
| `boss_core` | accent | `rect_visual_placeholder` | `BossArena` | 局部候选 | 不启用生成图主体 | Boss 最终主体必须人类定稿 |
| `boss_shield_closed` | transition | `rect_visual_placeholder` | `BossArena` | 过渡保留 | 保持程序化反馈直到样张通过 | 护盾状态变化需要人类确认可读性 |
| `boss_shield_open` | transition | `rect_visual_placeholder` | `BossArena` | 过渡保留 | 保持程序化反馈直到样张通过 | 脆弱窗口的颜色/轮廓需要人类确认 |
| `pickup_relic` | transition | `rect_visual_placeholder` | `DungeonRoomA/B/C` | 过渡保留 | 不新增奖励大图 | 奖励物是否统一成小徽章/玩具 relic 需人类定稿 |
| `breakable_target` | transition | `rect_visual_placeholder` | `FieldRuins` | 过渡保留 | 不导入写实破裂资源 | 可破坏提示必须卡通化 |
| `barrier_open` | transition | `rect_visual_placeholder` | `FieldRuins` | 过渡保留 | 当前无新增包体风险 | 开/关状态轮廓需保持一眼可读 |

## HUD 与触屏控件

| Key | 当前角色 | 当前状态 | 决策 | 包体动作 | 人类边界 |
| --- | --- | --- | --- | --- | --- |
| `hud_top_bar` | transition | `rect_visual_placeholder` | 过渡保留 | 禁止 AI HUD 皮肤直接绑定 | 最终 HUD 只能有一套语言 |
| `objective_card` | transition | `rect_visual_placeholder` | 过渡保留 | 禁止 AI HUD 皮肤直接绑定 | 目标卡片必须少字、圆润、温暖 |
| `controls_card` | transition | `rect_visual_placeholder` | 过渡保留 | 禁止 AI HUD 皮肤直接绑定 | 控件区不能抢场景焦点 |
| `touch_attack_button` | transition | `rect_visual_placeholder` | 过渡保留 | 暂不启用候选贴图 | 最终按钮需要触屏可读性实机验收 |
| `touch_summon_button` | transition | `rect_visual_placeholder` | 过渡保留 | 暂不启用候选贴图 | 召唤语义必须和攻击区分 |
| `touch_respawn_button` | transition | `rect_visual_placeholder` | 过渡保留 | 暂不启用候选贴图 | 复活入口必须真机可见 |
| `touch_echo_button` | transition | `rect_visual_placeholder` | 过渡保留 | 暂不启用候选贴图 | 回响切换不能靠英文说明 |
| `pause_button` | transition | `rect_visual_placeholder` | 过渡保留 | 暂不启用候选贴图 | 暂停图标与位置需真机验收 |
| `system_pause_icon` | accent | PNG 候选 | 局部候选 | 可作为小图标候选，但不得带动整套 HUD | 是否转正需人类确认 |
| `system_confirm_icon` | accent | PNG 候选 | 局部候选 | 可作为小图标候选，但不得带动整套 HUD | 是否转正需人类确认 |

## 参考与保护项

| Key | 当前角色 | 当前状态 | 决策 | 包体动作 | 人类边界 |
| --- | --- | --- | --- | --- | --- |
| `player` | protected | paperdoll 路径 | 保留 | 不替换为 AI 主角图 | 主角主体不由 ComfyUI 直接定稿 |
| `echo_spring_flower` | reference | prefab reference | 过渡保留 | 不新增大图 | 最终弹花外形需人类确认 |
| `echo_bomb_bug` | reference | prefab reference | 过渡保留 | 不新增大图 | 最终炸虫可爱程度和危险提示需人类确认 |
| `projectile_arrow` | transition | prefab placeholder | 过渡保留 | 不新增弹体图集 | 最终投射物要轻量、卡通、低压迫 |
| `environment_dungeon_floor_family` | reference | directory family | 人类定稿 | 不自动套用整套 dungeon 资产 | 不能把 dungeon 素材家族当最终风格锚点 |
| `environment_dungeon_wall_family` | reference | directory family | 人类定稿 | 不自动套用整套 dungeon 资产 | 不能回到写实/阴暗墙体 |
| `environment_dungeon_prop_family` | reference | directory family | 人类定稿 | 不自动套用整套 dungeon 资产 | 道具必须统一到可爱玩具感 |

## 禁止升级清单

以下资源或方向不能在没有人类拍板和包体复核前升级为正式资源：

| 项目 | 禁止原因 |
| --- | --- |
| `assets/art/generated/tile/*` 大面积地表 | AI 质感容易变成噪点、脏绿或写实纹理 |
| `assets/art/generated/enemy/common_enemy.png` | 只能局部参考，不能决定敌人主体风格 |
| `assets/art/generated/enemy/boss_core.png` | Boss 主体必须人工定稿 |
| `assets/art/generated/marker/checkpoint.png` | checkpoint 是首局核心可读物，不能直接 AI 定稿 |
| 写实裂纹 / 黑灰砖墙 / 冷硬金属墙 | 与可爱风北极星冲突 |
| 多套 HUD skin 并存 | 会破坏世界统一性，也会增加包体和维护风险 |

## 下一步执行顺序

| 顺序 | 动作 | 不需要人类 | 需要人类 |
| --- | --- | --- | --- |
| 1 | 对 P0 五个 tile/wall key 做 tiny sample sheet 规格 | 可以写规格、包体预算、验收表 | 需要确认样张方向 |
| 2 | 对 `StartCamp` 和 `DungeonHub` 做色温/轮廓统一方案 | 可以写布局与替换清单 | 需要确认最终视觉锚点 |
| 3 | 对 `DungeonRoomA/B/C` 写三主题图形语法 | 可以写题眼、禁用项、截图位 | 需要确认箱子/弹花/炸虫最终造型 |
| 4 | 对 `BossArena` 写阶段反馈视觉规格 | 可以写状态清单和验收路径 | 需要确认 Boss 轮廓和胜利反馈 |
| 5 | 任何新 bitmap 进入工程前跑包体增量复核 | 可以做脚本/报告 | 需要确认是否值得进入主包 |

## 结论

当前最安全的路线不是继续堆 ComfyUI 资源，而是先冻结“哪些 key 绝不能直接转正”。P0 五个地表/墙体 key 是最先要处理的视觉债务；HUD、敌人、Boss、checkpoint 目前都只能作为过渡或局部候选，不能把它们提升为最终风格锚点。
