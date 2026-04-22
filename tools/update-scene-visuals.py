"""
Batch-update RectVisual colors/effects across all scene JSON files.

Design system (2026-04-16 visual polish):
  Primary   #4A90D9  (74,144,217)  -- portals, info, echo buttons
  Secondary #5B8A4C  (91,138,76)   -- success, open gates, go
  Accent    #E8A838  (232,168,56)  -- selected, highlights, gold
  Surface   #1A2432  (26,36,50)    -- HUD bars, dark panels
  Danger    #C94040  (201,64,64)   -- enemies, closed gates, hazards

Node naming conventions for pattern matching:
  *Backdrop, *Lane, *Zone, *Strip  -> scene zones (large, hatch/stipple)
  Hud*                             -> HUD panels
  Touch*, Joystick*                -> buttons
  Checkpoint-*                     -> save markers
  Portal-*                         -> scene transitions
  *Gate-Closed, *Wall-Closed       -> locked barriers
  *Gate-Open, *Wall-Open           -> opened barriers
  *Plate*                          -> pressure plates
  *Enemy*                          -> hostiles
  *Hint*                           -> hint labels
  *Sign*                           -> signs
  *Relic*                          -> collectibles
  Pause*                           -> pause menu
  *Banner*                         -> victory/objective banners
  *Pickup*                         -> echo pickups
  *Landing*                        -> landing zones
  *Barrier*                        -> barriers
  *StatusPending*                  -> room status pending
  *StatusDone*                     -> room status complete
  *Trap*, *Hazard*                 -> traps/hazards
  *Bomb*                           -> bomb-related
  Debug*                           -> debug overlays
"""

import json
import os
import sys
import re

SCENE_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'scenes')

def color(r, g, b, a=255):
    return {"__type__": "cc.Color", "r": r, "g": g, "b": b, "a": a}

# -------------------------------------------------------------------
# Color rules: each entry is (name_pattern, dict of RectVisual overrides).
# Patterns are checked with fnmatch-style matching against the
# resolved node name (parent_name/visual_name or just node_name).
# First match wins.
# -------------------------------------------------------------------

RULES = [
    # ============================================================
    # HUD ELEMENTS
    # ============================================================
    # Top bar: deep navy surface with subtle blue-teal stroke, double border
    ("HudTopBar", {
        "fillColor": color(18, 28, 42, 230),
        "strokeColor": color(80, 140, 175, 80),
        "strokeWidth": 2,
        "cornerRadius": 16,
        "gradientStrength": 0.50,
        "doubleBorder": 0.7,
        "innerShadow": 0.3,
    }),
    # Objective card: slightly raised dark teal panel
    ("HudObjectiveCard", {
        "fillColor": color(22, 38, 48, 218),
        "strokeColor": color(80, 150, 130, 65),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.45,
        "doubleBorder": 0.5,
    }),
    # Controls hint card: subtle dark panel
    ("HudControlsCard", {
        "fillColor": color(16, 24, 34, 195),
        "strokeColor": color(75, 115, 145, 50),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.40,
    }),

    # ============================================================
    # TOUCH BUTTONS
    # ============================================================
    # Attack button: vivid warm orange with glow
    ("TouchAttack*Visual", {
        "fillColor": color(228, 140, 48, 250),
        "strokeColor": color(255, 220, 160, 120),
        "strokeWidth": 3,
        "cornerRadius": 16,
        "gradientStrength": 0.55,
        "innerShadow": 0.5,
        "outerGlow": 0.6,
        "outerGlowColor": color(255, 180, 80, 90),
        "bottomAccent": color(180, 100, 20, 180),
        "doubleBorder": 0.6,
    }),
    # Summon button: rich blue with glow
    ("TouchPlaceEcho*Visual", {
        "fillColor": color(58, 118, 195, 250),
        "strokeColor": color(150, 200, 245, 120),
        "strokeWidth": 3,
        "cornerRadius": 16,
        "gradientStrength": 0.55,
        "innerShadow": 0.5,
        "outerGlow": 0.6,
        "outerGlowColor": color(100, 160, 240, 90),
        "bottomAccent": color(30, 75, 140, 180),
        "doubleBorder": 0.6,
    }),
    # Respawn button: muted wine/maroon
    ("TouchRespawn*Visual", {
        "fillColor": color(128, 56, 62, 235),
        "strokeColor": color(220, 170, 165, 100),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.4,
        "bottomAccent": color(90, 30, 35, 160),
    }),
    # Echo Box button: warm amber gold
    ("TouchEchoBox*Visual", {
        "fillColor": color(198, 158, 68, 255),
        "strokeColor": color(255, 230, 160, 110),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.35,
        "outerGlow": 0.3,
        "outerGlowColor": color(230, 190, 90, 60),
        "bottomAccent": color(160, 120, 40, 150),
    }),
    # Echo Flower button: lush green
    ("TouchEchoFlower*Visual", {
        "fillColor": color(68, 148, 78, 255),
        "strokeColor": color(170, 240, 180, 110),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.35,
        "outerGlow": 0.3,
        "outerGlowColor": color(100, 200, 120, 60),
        "bottomAccent": color(40, 100, 50, 150),
    }),
    # Echo Bomb button: deep crimson
    ("TouchEchoBomb*Visual", {
        "fillColor": color(168, 58, 56, 255),
        "strokeColor": color(240, 170, 160, 110),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.35,
        "outerGlow": 0.3,
        "outerGlowColor": color(200, 90, 80, 60),
        "bottomAccent": color(120, 30, 30, 150),
    }),
    # Pause button: neutral blue-grey
    ("TouchPause*Visual", {
        "fillColor": color(52, 68, 92, 240),
        "strokeColor": color(160, 190, 220, 100),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.45,
        "innerShadow": 0.3,
    }),
    # Joystick visual: dark translucent base
    ("Joystick/Joystick-Visual", {
        "fillColor": color(14, 22, 30, 180),
        "strokeColor": color(120, 180, 200, 100),
        "strokeWidth": 3,
        "cornerRadius": 74,
        "gradientStrength": 0.30,
        "doubleBorder": 0.4,
    }),
    # Joystick knob: bright teal accent
    ("Joystick-Knob", {
        "fillColor": color(90, 175, 195, 255),
        "strokeColor": color(200, 245, 255, 140),
        "strokeWidth": 2,
        "cornerRadius": 31,
        "gradientStrength": 0.55,
        "innerShadow": 0.4,
    }),

    # ============================================================
    # PAUSE MENU
    # ============================================================
    ("PausePanel", {
        "fillColor": color(12, 18, 28, 242),
        "strokeColor": color(100, 150, 190, 90),
        "strokeWidth": 2,
        "cornerRadius": 20,
        "gradientStrength": 0.40,
        "doubleBorder": 0.6,
        "innerShadow": 0.3,
    }),
    ("PauseContinue*Visual", {
        "fillColor": color(78, 175, 92, 248),
        "strokeColor": color(180, 245, 190, 110),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.4,
        "bottomAccent": color(45, 120, 55, 160),
    }),
    ("PauseRestart*Visual", {
        "fillColor": color(128, 56, 62, 235),
        "strokeColor": color(220, 170, 165, 100),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.4,
        "bottomAccent": color(90, 30, 35, 160),
    }),
    ("PauseCamp*Visual", {
        "fillColor": color(52, 68, 92, 240),
        "strokeColor": color(160, 190, 220, 100),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.45,
        "innerShadow": 0.3,
    }),

    # ============================================================
    # SCENE ZONES (large area rects) -- use stipple + hatch combo
    # ============================================================
    # Backdrops: deep scene-tinted dark. Switch from pure hatch to
    # hatch + stipple combo for richer texture
    ("*Backdrop", {
        "strokeWidth": 2,
        "cornerRadius": 20,
        "gradientStrength": 0.40,
        "hatchStrength": 0.40,
        "hatchSpacing": 28,
        "stippleStrength": 0.35,
        "stippleSpacing": 20,
        "innerShadow": 0.25,
    }),
    # Lanes/strips: walkable corridors -- lighter tint than backdrop
    ("*Lane", {
        "strokeWidth": 2,
        "cornerRadius": 16,
        "gradientStrength": 0.38,
        "hatchStrength": 0.30,
        "hatchSpacing": 24,
        "stippleStrength": 0.25,
        "stippleSpacing": 22,
    }),
    ("*Strip", {
        "strokeWidth": 2,
        "cornerRadius": 14,
        "gradientStrength": 0.38,
        "hatchStrength": 0.30,
        "hatchSpacing": 24,
        "stippleStrength": 0.25,
        "stippleSpacing": 22,
    }),
    # Zones: functional areas -- keep distinct fill, add inner shadow
    ("*Zone", {
        "strokeWidth": 2,
        "cornerRadius": 16,
        "gradientStrength": 0.42,
        "hatchStrength": 0.35,
        "hatchSpacing": 22,
        "stippleStrength": 0.30,
        "stippleSpacing": 18,
        "innerShadow": 0.20,
    }),

    # ============================================================
    # INTERACTIVE OBJECTS
    # ============================================================
    # Checkpoints: warm gold beacon with glow
    ("Checkpoint-*Visual", {
        "fillColor": color(232, 186, 72, 255),
        "strokeColor": color(255, 235, 170, 160),
        "strokeWidth": 2,
        "cornerRadius": 10,
        "gradientStrength": 0.55,
        "innerShadow": 0.4,
        "outerGlow": 0.5,
        "outerGlowColor": color(240, 200, 100, 80),
        "bottomAccent": color(180, 130, 30, 180),
    }),
    # Portals: glowing blue doorway
    ("Portal-*Visual", {
        "fillColor": color(58, 100, 155, 235),
        "strokeColor": color(150, 200, 240, 130),
        "strokeWidth": 2,
        "cornerRadius": 14,
        "gradientStrength": 0.50,
        "innerShadow": 0.35,
        "outerGlow": 0.5,
        "outerGlowColor": color(100, 160, 230, 80),
        "doubleBorder": 0.5,
    }),
    # Gates/Walls closed: solid red barrier (matches Gate-Closed, GateClosed)
    ("*Gate-Closed*Visual", {
        "fillColor": color(178, 52, 48, 255),
        "strokeColor": color(240, 160, 150, 130),
        "strokeWidth": 3,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.5,
        "bottomAccent": color(120, 25, 20, 200),
    }),
    ("*GateClosed*Visual", {
        "fillColor": color(178, 52, 48, 255),
        "strokeColor": color(240, 160, 150, 130),
        "strokeWidth": 3,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.5,
        "bottomAccent": color(120, 25, 20, 200),
    }),
    ("*Wall-Closed*Visual", {
        "fillColor": color(168, 62, 54, 255),
        "strokeColor": color(235, 155, 145, 125),
        "strokeWidth": 3,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.5,
        "bottomAccent": color(110, 30, 25, 200),
    }),
    ("*WallClosed*Visual", {
        "fillColor": color(168, 62, 54, 255),
        "strokeColor": color(235, 155, 145, 125),
        "strokeWidth": 3,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.5,
        "bottomAccent": color(110, 30, 25, 200),
    }),
    # Gates/Walls open: inviting green (matches Gate-Open, GateOpen)
    ("*Gate-Open*Visual", {
        "fillColor": color(72, 170, 95, 255),
        "strokeColor": color(170, 240, 185, 130),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.35,
        "outerGlow": 0.3,
        "outerGlowColor": color(100, 210, 130, 60),
    }),
    ("*GateOpen*Visual", {
        "fillColor": color(72, 170, 95, 255),
        "strokeColor": color(170, 240, 185, 130),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.35,
        "outerGlow": 0.3,
        "outerGlowColor": color(100, 210, 130, 60),
    }),
    ("*Wall-Open*Visual", {
        "fillColor": color(72, 170, 95, 255),
        "strokeColor": color(170, 240, 185, 130),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.35,
        "outerGlow": 0.3,
        "outerGlowColor": color(100, 210, 130, 60),
    }),
    ("*WallOpen*Visual", {
        "fillColor": color(72, 170, 95, 255),
        "strokeColor": color(170, 240, 185, 130),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.35,
        "outerGlow": 0.3,
        "outerGlowColor": color(100, 210, 130, 60),
    }),
    # Barrier rects: semi-transparent block
    ("*Barrier*Visual", {
        "fillColor": color(60, 70, 95, 135),
        "strokeColor": color(130, 150, 180, 80),
        "strokeWidth": 2,
        "cornerRadius": 10,
        "gradientStrength": 0.35,
        "innerShadow": 0.3,
    }),
    # Pressure plates: bright leaf green with accent
    ("*Plate*Visual", {
        "fillColor": color(95, 180, 85, 255),
        "strokeColor": color(190, 250, 180, 130),
        "strokeWidth": 2,
        "cornerRadius": 10,
        "gradientStrength": 0.50,
        "innerShadow": 0.4,
        "bottomAccent": color(55, 130, 50, 170),
    }),
    # Enemies: vivid red threat marker
    ("*Enemy*Visual", {
        "fillColor": color(185, 55, 62, 255),
        "strokeColor": color(245, 170, 175, 130),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.45,
        "outerGlow": 0.3,
        "outerGlowColor": color(220, 80, 80, 50),
    }),
    # Clear relics: warm treasure gold
    ("*Relic*Visual", {
        "fillColor": color(195, 150, 48, 255),
        "strokeColor": color(245, 220, 140, 140),
        "strokeWidth": 2,
        "cornerRadius": 10,
        "gradientStrength": 0.55,
        "innerShadow": 0.4,
        "outerGlow": 0.5,
        "outerGlowColor": color(230, 190, 80, 80),
    }),
    # Traps: warning orange
    ("*Trap*Visual", {
        "fillColor": color(210, 120, 55, 255),
        "strokeColor": color(250, 200, 140, 120),
        "strokeWidth": 2,
        "cornerRadius": 10,
        "gradientStrength": 0.50,
        "innerShadow": 0.4,
    }),
    # Gap hazards: dark red warning
    ("*Hazard*Visual", {
        "fillColor": color(145, 55, 48, 175),
        "strokeColor": color(220, 140, 130, 90),
        "strokeWidth": 2,
        "cornerRadius": 10,
        "gradientStrength": 0.45,
        "innerShadow": 0.3,
    }),
    # Landing zones: calm blue
    ("*Landing*Visual", {
        "fillColor": color(58, 95, 135, 185),
        "strokeColor": color(140, 190, 230, 90),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.40,
        "innerShadow": 0.25,
    }),
    # Room status pending: amber-red indicator
    ("*StatusPending*Visual", {
        "fillColor": color(155, 72, 58, 185),
        "strokeColor": color(220, 150, 130, 80),
        "strokeWidth": 2,
        "cornerRadius": 8,
        "gradientStrength": 0.45,
        "innerShadow": 0.3,
    }),
    # Room status done: green indicator
    ("*StatusDone*Visual", {
        "fillColor": color(58, 145, 78, 185),
        "strokeColor": color(160, 240, 175, 90),
        "strokeWidth": 2,
        "cornerRadius": 8,
        "gradientStrength": 0.45,
        "innerShadow": 0.3,
    }),
    # Echo pickups: distinctive colored markers
    ("*Pickup*Visual", {
        "fillColor": color(155, 62, 55, 255),
        "strokeColor": color(235, 155, 145, 120),
        "strokeWidth": 2,
        "cornerRadius": 10,
        "gradientStrength": 0.50,
        "innerShadow": 0.4,
        "outerGlow": 0.4,
        "outerGlowColor": color(200, 100, 80, 70),
    }),

    # ============================================================
    # LABELS & HINTS -- visual hierarchy via size/accent differences
    # ============================================================
    # Hint labels: translucent info capsule with accent underline
    ("*Hint*Visual", {
        "fillColor": color(30, 52, 68, 190),
        "strokeColor": color(100, 160, 195, 65),
        "strokeWidth": 2,
        "cornerRadius": 10,
        "gradientStrength": 0.42,
        "bottomAccent": color(74, 144, 217, 140),
    }),
    # Signs: warm earthy info markers
    ("*Sign*Visual", {
        "fillColor": color(95, 72, 42, 190),
        "strokeColor": color(195, 175, 130, 60),
        "strokeWidth": 2,
        "cornerRadius": 10,
        "gradientStrength": 0.42,
        "bottomAccent": color(180, 145, 80, 130),
    }),
    # Victory/objective banners: celebratory green with gold accent
    ("*Banner*Visual", {
        "fillColor": color(52, 135, 68, 255),
        "strokeColor": color(160, 240, 175, 110),
        "strokeWidth": 2,
        "cornerRadius": 14,
        "gradientStrength": 0.50,
        "innerShadow": 0.35,
        "bottomAccent": color(232, 168, 56, 180),
        "doubleBorder": 0.4,
    }),

    # Boss shield (BossArena specific)
    ("*Shield-Closed*Visual", {
        "fillColor": color(155, 65, 52, 195),
        "strokeColor": color(230, 150, 130, 100),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.45,
        "innerShadow": 0.4,
    }),
    ("*Shield-Open*Visual", {
        "fillColor": color(58, 145, 78, 195),
        "strokeColor": color(160, 240, 175, 100),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.45,
        "innerShadow": 0.3,
    }),
    # Reward/prize items: bright gold
    ("*Reward*Visual", {
        "fillColor": color(228, 190, 82, 255),
        "strokeColor": color(255, 235, 160, 140),
        "strokeWidth": 2,
        "cornerRadius": 10,
        "gradientStrength": 0.55,
        "innerShadow": 0.4,
        "outerGlow": 0.5,
        "outerGlowColor": color(240, 200, 100, 80),
    }),

    # ============================================================
    # PLAYER
    # ============================================================
    ("Player*Visual", {
        "fillColor": color(90, 155, 210, 255),
        "strokeColor": color(200, 235, 255, 170),
        "strokeWidth": 2,
        "cornerRadius": 12,
        "gradientStrength": 0.50,
        "innerShadow": 0.35,
        "outerGlow": 0.3,
        "outerGlowColor": color(120, 180, 240, 60),
    }),

    # ============================================================
    # DEBUG
    # ============================================================
    ("Debug*Visual", {
        "fillColor": color(16, 24, 34, 225),
        "strokeColor": color(80, 120, 150, 50),
        "strokeWidth": 1,
        "cornerRadius": 8,
    }),
    ("WorldBackdrop", {
        "fillColor": color(14, 22, 32, 255),
        "strokeWidth": 0,
    }),
]


def match_name(node_name, pattern):
    """Simple wildcard matching: * matches any substring."""
    if not pattern or not node_name:
        return False
    # Convert pattern to regex
    regex = '^' + re.escape(pattern).replace(r'\*', '.*') + '$'
    return bool(re.match(regex, node_name, re.IGNORECASE))


def resolve_node_name(data, obj):
    """Get a meaningful name for this RectVisual's owner node."""
    nid = obj.get('node', {}).get('__id__', -1)
    if nid < 0 or nid >= len(data):
        return ''
    node = data[nid]
    name = node.get('_name', '')
    # If the node is a -Visual child, prepend parent name
    if name.endswith('-Visual') or name == '':
        pid = node.get('_parent', {}).get('__id__', -1)
        if 0 <= pid < len(data):
            pname = data[pid].get('_name', '')
            name = pname + '/' + name
    return name


def process_scene(scene_path):
    """Apply visual rules to a single scene file. Returns count of changes."""
    with open(scene_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    changes = 0
    for obj in data:
        if 'fillColor' not in obj or 'strokeColor' not in obj or 'cornerRadius' not in obj:
            continue

        name = resolve_node_name(data, obj)
        if not name:
            continue

        # Find first matching rule
        matched_rule = None
        for pattern, overrides in RULES:
            if match_name(name, pattern):
                matched_rule = (pattern, overrides)
                break

        if not matched_rule:
            continue

        pattern, overrides = matched_rule
        applied = False
        for key, value in overrides.items():
            if key in ('fillColor', 'strokeColor', 'outerGlowColor', 'bottomAccent'):
                current = obj.get(key, {})
                if (current.get('r') != value['r'] or current.get('g') != value['g']
                        or current.get('b') != value['b'] or current.get('a') != value['a']):
                    obj[key] = value
                    applied = True
            else:
                if obj.get(key) != value:
                    obj[key] = value
                    applied = True

        if applied:
            changes += 1
            print('  [%s] <- %s' % (name, pattern))

    if changes > 0:
        with open(scene_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')
        print('  >> %d RectVisual(s) updated' % changes)

    return changes


def main():
    scene_dir = os.path.abspath(SCENE_DIR)
    if not os.path.isdir(scene_dir):
        print('Scene directory not found: %s' % scene_dir)
        sys.exit(1)

    scene_files = sorted([
        f for f in os.listdir(scene_dir)
        if f.endswith('.scene') and not f.endswith('.meta')
    ])

    total = 0
    for sf in scene_files:
        path = os.path.join(scene_dir, sf)
        print('\n=== %s ===' % sf)
        total += process_scene(path)

    print('\n\nDone. Total changes: %d across %d scenes.' % (total, len(scene_files)))


if __name__ == '__main__':
    main()
