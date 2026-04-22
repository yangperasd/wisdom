"""Add 24 new prompts to cover manifest bindings that had no prompts."""
import io, json, os

PROMPTS = 'E:/cv5/wisdom/tools/asset-gen/prompts'

def append_jsonl(path, rows):
    with io.open(path, 'a', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')

NEG_STD = "blur, anti-aliasing, smooth shading, gradient, 3d render, realistic, photo, text, watermark, dark grimdark, scary, gore, blood, edgy, hyperrealism"
NEG_UI  = "blur, anti-aliasing, smooth shading, gradient, 3d render, realistic, photo, text inside, watermark, modern UI, flat design, dark grimdark, neon, hyperrealism"
NEG_TILE = "blur, anti-aliasing, smooth shading, gradient, 3d render, realistic, photo, text, watermark, dark grimdark, scary, hyperrealism, rough edges, asymmetric seams"

# 3 creature-class entities (to echoes.jsonl)
echoes_new = [
    {"id": "common_enemy", "category": "enemy", "resolution": "standard",
     "prompt": "A friendly-yet-foe small creature enemy, pixel art, Zelda Echoes of Wisdom style. Round chibi monster silhouette: chubby round body with two stubby legs, two small beady eyes, tiny angry eyebrows (not scary). Muted autumn-orange body with cream belly, small black accent details. Toy-diorama miniature, glossy clean 2-3 tone shading. 32x32 sprite, transparent background, hand-pixeled, charming Nintendo aesthetic.",
     "negative": NEG_STD + ", demonic"},
    {"id": "boss_core", "category": "enemy", "resolution": "tall",
     "prompt": "A boss weakpoint crystal core, pixel art, Zelda Echoes of Wisdom style. Large glowing magenta-pink crystal with golden star inside, mounted on small dark pedestal with runes. Shimmering glow halo, cracked geometry revealing inner light. 32x48 sprite, transparent background, sharp pixels, 2-3 tone hard shading, charming magical Nintendo aesthetic.",
     "negative": NEG_STD + ", demonic, occult"},
    {"id": "breakable_target", "category": "enemy", "resolution": "standard",
     "prompt": "A breakable clay pot training target, pixel art, Zelda Echoes of Wisdom style. Chubby cylindrical terracotta pot with small handles, cracked vertical lines, friendly X mark on front (not scary). Warm clay-tan color with darker rim and small green moss patch. Toy-diorama miniature, glossy clean 2-3 tone shading. 32x32 sprite, transparent background, sharp pixels, charming Nintendo aesthetic.",
     "negative": NEG_STD + ", skull"}
]
append_jsonl(f'{PROMPTS}/echoes.jsonl', echoes_new)
print(f'+ echoes.jsonl: {len(echoes_new)} new prompts')

# 3 markers (to effects.jsonl)
effects_new = [
    {"id": "checkpoint", "category": "marker", "resolution": "tall",
     "prompt": "A magical checkpoint shrine, pixel art, Zelda Echoes of Wisdom style. Small golden altar on stone base with floating blue flame above, hovering sparkle particles, glowing warm rim light. 32x48 sprite, transparent background, sharp pixels, 2-3 hard tones, charming Nintendo magical aesthetic.",
     "negative": NEG_STD},
    {"id": "barrier_closed", "category": "marker", "resolution": "standard",
     "prompt": "A closed magical barrier gate, pixel art, Zelda Echoes of Wisdom style. Golden ornate frame with translucent cyan energy surface inside, small gemstone lock symbol, sparkle accents. Toy-diorama, glossy clean 2-3 tone shading, pastel highlights. 32x32 sprite, transparent background, sharp pixels, charming Nintendo aesthetic.",
     "negative": NEG_STD},
    {"id": "barrier_open", "category": "marker", "resolution": "standard",
     "prompt": "An open magical barrier portal, pixel art, Zelda Echoes of Wisdom style. Golden ornate frame with open passage center revealing sparkle particles, green safe-to-pass glow accents. Toy-diorama, glossy clean 2-3 tone shading. 32x32 sprite, transparent background, sharp pixels, charming Nintendo aesthetic.",
     "negative": NEG_STD}
]
append_jsonl(f'{PROMPTS}/effects.jsonl', effects_new)
print(f'+ effects.jsonl: {len(effects_new)} new prompts')

# 1 pickup (to items.jsonl)
items_new = [
    {"id": "pickup_relic", "category": "treasure", "resolution": "standard",
     "prompt": "A generic quest relic pickup, pixel art, Zelda Echoes of Wisdom style. Small ancient golden medallion with star emblem, glowing rim, hovering sparkle particles around it. Toy-diorama miniature charm, glossy shiny surface, pastel highlights, warm parchment and gold colors. 32x32 sprite, transparent background, sharp pixels, limited palette, charming Nintendo RPG pickup aesthetic.",
     "negative": NEG_STD}
]
append_jsonl(f'{PROMPTS}/items.jsonl', items_new)
print(f'+ items.jsonl: {len(items_new)} new prompts')

# UI: 3 panels/cards + 5 buttons + 2 icons
ui_new = [
    {"id": "hud_top_bar", "category": "panel", "resolution": [128, 24],
     "prompt": "Game UI top HUD status bar background, horizontal rectangle warm cream parchment with thin gold border frame and small leaf ornaments at ends. Toy-diorama UI feel, glossy clean shading, pastel highlights. 128x24 sprite, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom HUD aesthetic.",
     "negative": NEG_UI},
    {"id": "objective_card", "category": "panel", "resolution": [96, 32],
     "prompt": "Game UI objective quest card, small warm parchment card with ornate gold corner flourishes and single gold star emblem top-left indicating active quest. Toy-diorama UI feel, glossy clean shading, pastel highlights. 96x32 sprite, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom card aesthetic.",
     "negative": NEG_UI},
    {"id": "controls_card", "category": "panel", "resolution": [96, 48],
     "prompt": "Game UI controls help card, small warm parchment card with friendly gold frame with small icon rows of buttons, ornate scroll trim. Toy-diorama UI feel, glossy clean shading, pastel highlights. 96x48 sprite, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom tutorial card aesthetic.",
     "negative": NEG_UI},
    {"id": "touch_attack_button", "category": "button", "resolution": "ui_med",
     "prompt": "Touch attack button, round parchment-and-gold button with small crossed-swords emblem in center, slight glow rim. Toy-diorama UI feel, glossy clean shading, pastel highlights, warm cheerful colors. 48x48 sprite, transparent background, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom HUD aesthetic.",
     "negative": NEG_UI},
    {"id": "touch_summon_button", "category": "button", "resolution": "ui_med",
     "prompt": "Touch summon echo button, round parchment-and-gold button with small sparkly star emblem in center, cyan magical glow rim. Toy-diorama UI feel, glossy clean shading, pastel highlights. 48x48 sprite, transparent background, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom HUD aesthetic.",
     "negative": NEG_UI},
    {"id": "touch_respawn_button", "category": "button", "resolution": "ui_med",
     "prompt": "Touch respawn revive button, round parchment-and-gold button with small heart or phoenix-feather emblem in center, warm pink glow rim. Toy-diorama UI feel, glossy clean shading, pastel highlights. 48x48 sprite, transparent background, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom HUD aesthetic.",
     "negative": NEG_UI},
    {"id": "touch_echo_button", "category": "button", "resolution": "ui_med",
     "prompt": "Touch echo box selector button, round parchment-and-gold button with small wooden crate emblem in center, warm gold glow. Toy-diorama UI feel, glossy clean shading, pastel highlights. 48x48 sprite, transparent background, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom HUD aesthetic.",
     "negative": NEG_UI},
    {"id": "pause_button", "category": "button", "resolution": "ui_med",
     "prompt": "Touch pause button, round parchment-and-gold button with small pause bars emblem in center, soft cyan rim. Toy-diorama UI feel, glossy clean shading, pastel highlights. 48x48 sprite, transparent background, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom HUD aesthetic.",
     "negative": NEG_UI},
    {"id": "system_pause_icon", "category": "icon", "resolution": "ui_small",
     "prompt": "System pause icon, two vertical parchment-colored bars on gold small disc background, charming miniature UI. Toy-diorama feel, glossy clean shading, pastel highlights. 24x24 sprite, transparent background, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom HUD icon aesthetic.",
     "negative": NEG_UI},
    {"id": "system_confirm_icon", "category": "icon", "resolution": "ui_small",
     "prompt": "System confirm checkmark icon, bright green checkmark on gold small disc background, sparkle highlight. Toy-diorama UI feel, glossy clean shading, pastel highlights. 24x24 sprite, transparent background, sharp pixels, limited palette, charming Nintendo Echoes of Wisdom HUD icon aesthetic.",
     "negative": NEG_UI}
]
append_jsonl(f'{PROMPTS}/ui.jsonl', ui_new)
print(f'+ ui.jsonl: {len(ui_new)} new prompts')

# 7 tile textures in new tiles.jsonl (note: tileable, no transparency)
tiles_new = [
    {"id": "outdoor_ground_green", "category": "tile", "resolution": "standard",
     "prompt": "Seamless tileable grass ground texture, pixel art, Zelda Echoes of Wisdom style. Bright saturated green grass with small darker grass tuft variations, tiny white flower specks, pastel highlights. Edges designed to tile perfectly with neighbors. 32x32 tileable texture, sharp pixels, limited palette, no transparent background, charming Nintendo outdoor aesthetic.",
     "negative": NEG_TILE},
    {"id": "outdoor_ground_flowers", "category": "tile", "resolution": "standard",
     "prompt": "Seamless tileable flower meadow ground texture, pixel art, Zelda Echoes of Wisdom style. Bright green grass base with scattered small pink/yellow/white flower blossoms, tiny leaf accents, pastel highlights, cheerful mood. Edges tile perfectly. 32x32 tileable texture, sharp pixels, limited palette, no transparent background, charming Nintendo aesthetic.",
     "negative": NEG_TILE},
    {"id": "outdoor_path_cobble", "category": "tile", "resolution": "standard",
     "prompt": "Seamless tileable cobblestone path texture, pixel art, Zelda Echoes of Wisdom style. Warm tan and gray stones in irregular pattern, moss edges, friendly storybook feel. Edges tile perfectly. 32x32 tileable texture, sharp pixels, limited palette, no transparent background, charming Nintendo outdoor aesthetic.",
     "negative": NEG_TILE},
    {"id": "outdoor_ground_ruins", "category": "tile", "resolution": "standard",
     "prompt": "Seamless tileable ruins ground texture, pixel art, Zelda Echoes of Wisdom style. Cracked ancient tan-cream stone floor with moss patches and small leaf debris, warm lived-in feel (not grim). Edges tile perfectly. 32x32 tileable texture, sharp pixels, limited palette, no transparent background, charming Nintendo adventure aesthetic.",
     "negative": NEG_TILE},
    {"id": "outdoor_wall_standard", "category": "tile", "resolution": "standard",
     "prompt": "Seamless tileable warm stone wall texture, pixel art, Zelda Echoes of Wisdom style. Large blocks of cream-tan stones with mortar lines, ivy accents, soft shadows between blocks. Edges tile perfectly. 32x32 tileable texture, sharp pixels, limited palette, no transparent background, charming Nintendo adventure aesthetic.",
     "negative": NEG_TILE},
    {"id": "outdoor_wall_broken", "category": "tile", "resolution": "standard",
     "prompt": "Seamless tileable broken stone wall texture, pixel art, Zelda Echoes of Wisdom style. Crumbling cream-tan stones with missing bricks, rubble, ivy draped over, inviting ruin (not scary). Edges tile perfectly. 32x32 tileable texture, sharp pixels, limited palette, no transparent background, charming Nintendo adventure aesthetic.",
     "negative": NEG_TILE},
    {"id": "outdoor_wall_cracked", "category": "tile", "resolution": "standard",
     "prompt": "Seamless tileable cracked stone wall texture, pixel art, Zelda Echoes of Wisdom style. Cream-tan stone wall with zigzag crack running through, hints of warm light peeking through, small pebbles. Edges tile perfectly. 32x32 tileable texture, sharp pixels, limited palette, no transparent background, charming Nintendo aesthetic.",
     "negative": NEG_TILE}
]
with io.open(f'{PROMPTS}/tiles.jsonl', 'w', encoding='utf-8') as f:
    for r in tiles_new:
        f.write(json.dumps(r, ensure_ascii=False) + '\n')
print(f'+ tiles.jsonl (new): {len(tiles_new)} prompts')

print()
print(f'Total new prompts added: {len(echoes_new)+len(effects_new)+len(items_new)+len(ui_new)+len(tiles_new)}')

# Count total per file
total = 0
for pf in ['items','echoes','effects','ui','tiles']:
    p = f'{PROMPTS}/{pf}.jsonl'
    if os.path.exists(p):
        n = sum(1 for l in io.open(p,'r',encoding='utf-8') if l.strip())
        total += n
        print(f'  {pf}.jsonl: {n}')
print(f'  Grand total prompts: {total}')
