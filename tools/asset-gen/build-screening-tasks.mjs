/**
 * build-screening-tasks.mjs
 *
 * Reads screening-queue.json (from prepare-screening) and emits a flat list
 * of agent-task entries: one per (candidate, agent_id) pair. Each entry has
 * everything needed to spawn the agent: agent id, candidate label/category,
 * full prompt (system + user combined), and image paths to read.
 *
 * Output: `screened/agent-tasks.json` — Claude Code reads this and spawns
 * agents in parallel batches (e.g. 9 at a time). Each agent appends its
 * verdict back to `screened/agent-verdicts/{candidate-label}.json`.
 *
 * Usage: node build-screening-tasks.mjs
 *        node build-screening-tasks.mjs --skip-round2  (skip UI agents)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = import.meta.dirname;

function parseArgs() {
  const args = { skipRound2: false };
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--skip-round2') args.skipRound2 = true;
  }
  return args;
}

// --- Agent prompt templates (mirrored from agents/*.mjs but inlined here so
//     this script is self-contained for batch dispatch) ---

const VERDICT_SCHEMA = `Return ONLY a single JSON object (no markdown fences, no extra text):
{"agent":"<agent_id>","score":<integer 1-10>,"verdict":"pass|marginal|fail","issues":[],"reasoning":"..."}
Adversarial agents add: ,"confidence":<float 0.0-1.0>
Thresholds: 8+ pass, 5-7 marginal, <=4 fail.`;

const isTile = (c) => c.category === 'tile';

function aestheticA(c) {
  if (isTile(c)) {
    return {
      agent_id: 'aesthetic_a_style_fidelity',
      round: 1,
      images: [c.zoom, c.refPath],
      prompt: `AESTHETIC AGENT A — Style Fidelity for Zelda: Echoes of Wisdom TILE TEXTURES.
CRITICAL: this candidate is a 32x32 SEAMLESS TILING TEXTURE (full-bleed ground/wall). DO NOT penalize it for lacking a sprite silhouette, lacking an outline, or lacking a focal subject — tiles are not sprites.
EMOTIONAL: bright/warm/Hyrule outdoor feel; saturated greens/browns/stone-greys with warm undertones; hand-pixeled organic variation; toy-diorama ground texture. Never grim/muddy/realistic-photo/AAA.
TECHNICAL: deliberate pixel placement (no noise mush, no gradient bleed); 2-4 tone hard shading on macro features (not gradients); pixel-grid-snapped; no AA. Hand-pixeled texture is the goal.
Read: ${c.zoom} (candidate tile at multiple zooms/bgs)
Read: ${c.refPath} (Denzi peer reference for category "${c.category}")
Evaluate emotional (60%) + technical (40%).
${VERDICT_SCHEMA}`
    };
  }
  return {
    agent_id: 'aesthetic_a_style_fidelity',
    round: 1,
    images: [c.zoom, c.refPath],
    prompt: `AESTHETIC AGENT A — Style Fidelity for Zelda: Echoes of Wisdom pixel art.
EMOTIONAL: bright/warm/charming/friendly Hyrule mood; saturated greens/blues/yellows/pinks; round friendly silhouettes; toy-diorama. Never grim/scary.
TECHNICAL: 1px hard outlines (no AA); 2-3 tone hard shading; pixel-grid-snapped; hand-pixeled. Fail either axis = fail.
Read: ${c.zoom} (candidate at multiple zooms/bgs)
Read: ${c.refPath} (Denzi peer reference for category "${c.category}")
Evaluate emotional (60%) + technical (40%).
${VERDICT_SCHEMA}`
  };
}
function aestheticB(c) {
  if (isTile(c)) {
    return {
      agent_id: 'aesthetic_b_cute_clarity',
      round: 1,
      images: [c.zoom],
      prompt: `AESTHETIC AGENT B — Tileability & Macro-Pattern Judge (TILE VARIANT).
CRITICAL: this is a 32x32 full-bleed tiling texture. DO NOT judge it on silhouette/sticker-test/outline — those apply to sprites, not tiles.
Good tile: SEAMLESS edges (left col ~= right col / top row ~= bottom row); NO DOMINANT FOCAL FEATURE (so it doesn't cluster conspicuously when tiled 3x3+); BALANCED VISUAL DENSITY across the 32x32 area; "invisible background" quality — it supports foreground sprites without fighting them.
Bad tile: obvious seam artifacts at edges; single bright/dark hot-spot that repeats as a visible polka-dot pattern; empty flat swaths mixed with dense busy zones; would visually compete with a player sprite placed on top.
GEOMETRY CHECK (REQUIRED in your reasoning): (1) do the pixels in column 0 visually match column 31? (2) do the pixels in row 0 visually match row 31? (3) if tiled 3x3 mentally, would any feature draw the eye as a repeated polka dot? Name specific coordinates if you spot a seam break.
Read: ${c.zoom} (1x grey | 4x clean | 4x DARK | 4x LIGHT)
${VERDICT_SCHEMA}`
    };
  }
  return {
    agent_id: 'aesthetic_b_cute_clarity',
    round: 1,
    images: [c.zoom],
    prompt: `AESTHETIC AGENT B — Cute & Charm + Silhouette Clarity. Reference: Echoes of Wisdom — distinct silhouette + friendly toy charm. Good = round/soft, instantly readable at 1x, contrast on bright AND dark bg, visible personality, sticker test. Bad = mushy silhouette, edgy aggressive shapes, no personality.
Read: ${c.zoom} (1x grey | 4x clean | 4x DARK | 4x LIGHT)
Evaluate readability at 1x, contrast on both bgs, edge cleanliness, CHARM. Charming-but-mushy or clear-but-charmless both fail.
${VERDICT_SCHEMA}`
  };
}
function aestheticC(c) {
  if (isTile(c)) {
    return {
      agent_id: 'aesthetic_c_color_harmony',
      round: 1,
      images: [c.zoom, c.palettePath],
      prompt: `AESTHETIC AGENT C — Color Harmony for Echoes-tuned TILE palette.
CRITICAL: tile textures. Target = bright saturated Hyrule outdoor ground/wall, NOT a muted "realistic" dirt/concrete. A tile should sit ON the palette (greens/browns/stones with warm undertones, candy-pink accents for flowers) — but may span FEWER hues than a sprite (6-12 internal tones is normal).
Good tile palette: saturated warm base hue dominates; 2-4 darker/lighter tones for macro features; any accent color (flower, crack) is palette-consistent. No pure black/grey shadows — shadows shift hue (warm brown / deep teal / plum).
Bad tile palette: muddy desaturated AAA-realistic; neon artificial; cold grey dungeon-crawler; pure black shadows; gradient bleed.
Read: ${c.zoom}
Read: ${c.palettePath} (Echoes-tuned palette swatch)
Evaluate internal harmony, mood (BRIGHT/WARM vs grim/cold), saturation appropriate-for-ground-texture, palette compatibility, shadow color quality.
${VERDICT_SCHEMA}`
    };
  }
  return {
    agent_id: 'aesthetic_c_color_harmony',
    round: 1,
    images: [c.zoom, c.palettePath],
    prompt: `AESTHETIC AGENT C — Color Harmony for Echoes-tuned palette. Target: BRIGHT harmonious — saturated greens/sky blues/sunset oranges/candy pinks/parchment golds. Warm mid-values dominate. Shadows are colored darks (deep teal/plum/warm brown), NEVER pure black/grey. Avoid muddy desaturated, neon, cold corporate, goth near-black.
Read: ${c.zoom}
Read: ${c.palettePath} (Echoes-tuned palette swatch)
Evaluate internal harmony, mood (BRIGHT/WARM vs grim/cold), saturation, palette compatibility, shadow color quality.
${VERDICT_SCHEMA}`
  };
}
function uiA(c) {
  if (isTile(c)) {
    return {
      agent_id: 'ui_a_readability',
      round: 2,
      images: [c.compositeScene, c.originalScene],
      prompt: `UI AGENT A — TILE-IN-SCENE READABILITY for Echoes-style game.
CRITICAL: the candidate is a TILE texture, not a sprite. It will cover the ground/wall. Its job is to be BACKGROUND-SUPPORTIVE — sprites placed on top (player, enemies, items) must remain readable.
Good tile context: foreground sprites still pop (tile has consistent low-to-mid visual energy); no tile feature "competes" with or mimics a sprite; tile looks native to the Echoes scene (not a photo pasted in); tile edges in the scene don't show visible seams where two tiles meet.
Bad tile context: tile busier/brighter than sprites on top (foreground gets lost); tile has a detail that looks like a sprite/item (confusing); tile obviously "from a different game"; visible grid seams / corner artifacts where tiles abut.
Read: ${c.compositeScene} (scene WITH the candidate tile applied as ground)
Read: ${c.originalScene} (same scene without, for comparison)
Evaluate: do foreground sprites remain readable? does the tile read as native Echoes ground? are seams visible at tile boundaries? is the energy level appropriate (background, not foreground)?
${VERDICT_SCHEMA}`
    };
  }
  return {
    agent_id: 'ui_a_readability',
    round: 2,
    images: [c.compositeScene, c.originalScene],
    prompt: `UI AGENT A — In-Context Readability for Echoes-style game. Well-integrated: spottable in 0.5s; distinct from bg tiles; clear silhouette; bright/uncluttered Echoes feel. Poorly integrated: same hue as bg; outline disappears; visual noise; tonal clash.
Read: ${c.compositeScene} (scene WITH "${c.label}" composited; red arrow marks position)
Read: ${c.originalScene} (same scene WITHOUT, comparison)
Evaluate locatability, distinguishment, dark-area visibility, native-vs-pasted, confusion with other entities, Echoes-cleanliness.
${VERDICT_SCHEMA}`
  };
}
function uiB(c) {
  if (isTile(c)) {
    return {
      agent_id: 'ui_b_mood_coherence',
      round: 2,
      images: [c.compositeScene, c.originalScene],
      prompt: `UI AGENT B — Mood Coherence for TILE textures in Echoes-style scene.
TARGET: the tile should reinforce bright fairy-tale Hyrule outdoor mood — sunny greens, warm stones, friendly brightness.
IN-TONE tile: warm saturated outdoor ground/wall; reads as "Hyrule field/path/wall"; hand-pixeled charm; no realistic photo vibe.
OUT-OF-TONE tile (FLAG): grimdark dungeon floor; muddy AAA-realistic terrain; horror blood-soaked ground; goth-metal stonework; sci-fi/corporate texture; cold grey dungeon-crawler; anime kawaii-pop; neon artificial.
Read: ${c.compositeScene} (scene WITH the tile applied)
Read: ${c.originalScene} (scene WITHOUT, reference)
Evaluate whether the tile preserves cute/sunny/fairy-tale outdoor tone or shifts mood problematically.
${VERDICT_SCHEMA}`
    };
  }
  return {
    agent_id: 'ui_b_mood_coherence',
    round: 2,
    images: [c.compositeScene, c.originalScene],
    prompt: `UI AGENT B — Mood Coherence for Echoes-style game. TARGET: cute fairy-tale adventure; warm greens/blues/yellows/pinks/parchment; bright sunny magical; toy diorama. IN-TONE: cute round, bright saturated, whimsical sparkle. OUT-OF-TONE (FLAG): grimdark/horror, edgy/aggressive, realistic, cold-corporate, goth/metal, dungeon-crawler, anime fan-service, generic mobile cartoon.
Read: ${c.compositeScene} (scene WITH "${c.label}")
Read: ${c.originalScene} (scene WITHOUT, tone reference)
Evaluate whether new sprite preserves cute/sunny/fairy-tale tone or shifts mood problematically.
${VERDICT_SCHEMA}`
  };
}
function uiC(c) {
  if (isTile(c)) {
    return {
      agent_id: 'ui_c_scale_proportion',
      round: 2,
      images: [c.compositeScene],
      prompt: `UI AGENT C — DENSITY & SCALE for TILE textures (Echoes top-down 2D, toy diorama).
CRITICAL: tiles are 32x32 and will repeat. This rubric is about VISUAL DENSITY not sprite-size.
Good density: 3-8 recognizable "macro features" (grass tufts, stone chips, cracks, flowers) across the 32x32; features are ~4-8 pixels in scale (readable next to a 32x32 player sprite without competing); overall energy is LOWER than any sprite that would sit on top.
Bad density: either totally featureless (flat void) or totally chaotic (noise mush); features are too small (sub-pixel speckle mush) or too large (single-object tile, fills frame); tile features are the same visual size as a character, stealing attention.
GEOMETRY CHECK (REQUIRED in your reasoning): (1) count the number of distinct macro-features you can see at 1x — too few (<3) or too many (>10) fails. (2) estimate the scale of the largest feature in pixels. (3) compared to a 32x32 player sprite, would the tile be quieter or louder?
Read: ${c.compositeScene} (scene with the tile applied as ground)
${VERDICT_SCHEMA}`
    };
  }
  return {
    agent_id: 'ui_c_scale_proportion',
    round: 2,
    images: [c.compositeScene],
    prompt: `UI AGENT C — Scale & Proportion for Echoes-style top-down 2D game (toy diorama). Scale: player 32x32; items 50-75% of player NEVER larger; summons 50-80%; HUD icons ≤24x24. Errors: item bigger than player; creature wrong size for category; effects overwhelm scene; inconsistent perspective; zoomed-in/zoomed-out look.
Read: ${c.compositeScene} (scene with "${c.label}" of category "${c.category}" composited)
Evaluate size appropriateness for category, proportion vs other entities, perspective match, "toy diorama" vs "wallpaper" feel.
${VERDICT_SCHEMA}`
  };
}
function advA(c) {
  if (isTile(c)) {
    return {
      agent_id: 'adversarial_a_artifact_hunter',
      round: 3,
      images: [c.zoom8x],
      prompt: `ADVERSARIAL AGENT A — AI Artifact Hunter for TILE TEXTURES. HARSH.
TILE-specific AI tells (8): (1) sub-pixel noise/speckle that looks like JPEG artifact; (2) anti-aliased edges at the 32x32 boundary; (3) gradient bleed instead of hard-stepped 2-4 tone shading; (4) blurry "painted digital" look instead of hand-pixeled; (5) melting/morphing detail at edges; (6) color bleed between distinct elements; (7) unreadable noise patches; (8) SEAM ARTIFACTS when tile is repeated (the most critical tile defect).
GEOMETRY CHECK (REQUIRED — state results in your reasoning): (a) does column 0 match column 31 pixel-for-pixel in hue and tone? (b) does row 0 match row 31? (c) when mentally tiled 3x3, would any pixel column/row stand out as a seam? If a seam is visible, the tile fails regardless of other merits.
Read: ${c.zoom8x} (4x AND 8x extreme zoom for sub-pixel and edge inspection)
Inspect for all 8 tells + the geometry check. Include "confidence" 0.0-1.0.
${VERDICT_SCHEMA}`
    };
  }
  return {
    agent_id: 'adversarial_a_artifact_hunter',
    round: 3,
    images: [c.zoom8x],
    prompt: `ADVERSARIAL AGENT A — AI Artifact Hunter. DESTROY candidates by hunting AI generation tells. Be ruthless.
10 AI tells: sub-pixel features; AA edges; noise pixels in solid areas; inconsistent outlines (1px/2px/missing); gradient shading instead of 2-3 hard tones; pattern artifacts; melting details; asymmetry; color bleed; semantic failures. Any clear artifact = fail.
Read: ${c.zoom8x} (4x AND 8x extreme zoom for sub-pixel inspection)
Inspect for all 10. Include "confidence" 0.0-1.0.
${VERDICT_SCHEMA}`
  };
}
function advB(c) {
  if (isTile(c)) {
    return {
      agent_id: 'adversarial_b_consistency_breaker',
      round: 3,
      images: [c.vsPeers],
      prompt: `ADVERSARIAL AGENT B — Style Consistency Breaker for TILE TEXTURES vs peer family. HARSH.
7 tile-style dims: (1) palette overlap with peer ground/wall tiles; (2) pixel-density (feature count per 32x32); (3) shading technique (hard-stepped vs gradient); (4) warmth/saturation bias; (5) hand-pixeled charm level; (6) photo-realism contamination; (7) overall "Echoes outdoor" vs "different-game" feel.
NOTE: peer set is same-category reference tiles. Don't penalize for being a different SURFACE TYPE (grass vs stone vs path) — focus on STYLE/PALETTE/RENDERING consistency.
Read: ${c.vsPeers} (LEFT: peer tile reference; RIGHT: candidate tile at matching scale)
Check all 7. Include "confidence".
${VERDICT_SCHEMA}`
    };
  }
  return {
    agent_id: 'adversarial_b_consistency_breaker',
    round: 3,
    images: [c.vsPeers],
    prompt: `ADVERSARIAL AGENT B — Style Consistency Breaker. Find ANY discontinuity vs peer family. HARSH.
11 dims: outline weight; outline color; shadow direction; shadow count; highlight intensity; color temperature; detail density; proportion; rendering style; palette overlap; CHARM LEVEL (peers cute Echoes? candidate match?).
NOTE: peer set is same-category Denzi sprites. Don't penalize for being a different ITEM TYPE within the category — focus on style/palette/rendering CONSISTENCY.
Read: ${c.vsPeers} (LEFT: peer reference sheet; RIGHT: candidate at matching scale)
Check all 11. Include "confidence".
${VERDICT_SCHEMA}`
  };
}
function advC(c) {
  if (isTile(c)) {
    return {
      agent_id: 'adversarial_c_tone_mismatch',
      round: 3,
      images: [c.vsPeersWarm],
      prompt: `ADVERSARIAL AGENT C — Tone Mismatch Detector for TILE TEXTURES in Echoes-style game.
TARGET tile tone: bright warm Hyrule outdoor ground/wall; sunny greens, warm stones, friendly tans; hand-pixeled; reinforces fairy-tale adventure mood.
OUT-OF-TONE (FAIL): GRIMDARK dungeon floor; AAA-REALISTIC muddy dirt/concrete; HORROR blood-soaked or skull-marked ground; GOTH-METAL stonework; SCI-FI/CORPORATE tile; COLD-CORPORATE grey concrete; DESATURATED dungeon-crawler; WESTERN AAA rust; OCCULT sigils; UNCANNY photorealistic terrain. MERCILESS.
Read: ${c.vsPeersWarm} (LEFT: peer tile reference; RIGHT: candidate at 4x; on parchment bg)
Detect any tonal drift from Hyrule-outdoor-bright. Include "confidence".
${VERDICT_SCHEMA}`
    };
  }
  return {
    agent_id: 'adversarial_c_tone_mismatch',
    round: 3,
    images: [c.vsPeersWarm],
    prompt: `ADVERSARIAL AGENT C — Tone Mismatch Detector for Echoes-style game.
TARGET: cute/charming/friendly fairy-tale; bright/warm/sunny Hyrule; whimsical magic; toy-diorama; wholesome Nintendo-family-friendly.
OUT-OF-TONE (FAIL): GRIMDARK; EDGY; REALISTIC; COLD-CORPORATE; ANIME FAN-SERVICE; GENERIC MOBILE-CARTOON; DESATURATED DUNGEON-CRAWLER; WESTERN AAA; OCCULT; UNCANNY. MERCILESS.
Read: ${c.vsPeersWarm} (LEFT: peer reference; RIGHT: candidate 4x; on parchment bg)
Detect any tonal drift. Include "confidence".
${VERDICT_SCHEMA}`
  };
}

const ROUND1_AGENTS = [aestheticA, aestheticB, aestheticC];
const ROUND2_AGENTS = [uiA, uiB, uiC];
const ROUND3_AGENTS = [advA, advB, advC];

async function main() {
  const args = parseArgs();
  const queuePath = join(ROOT, 'screened', 'screening-queue.json');
  if (!existsSync(queuePath)) {
    console.error('No screening-queue.json. Run prepare-screening.mjs --from-auto-selected first.');
    process.exit(1);
  }
  const { queue } = JSON.parse(await readFile(queuePath, 'utf-8'));

  const tasks = [];
  for (const c of queue) {
    const agentBuilders = [...ROUND1_AGENTS, ...(args.skipRound2 ? [] : ROUND2_AGENTS), ...ROUND3_AGENTS];
    for (const build of agentBuilders) {
      const t = build(c);
      tasks.push({
        task_id: `${c.label}__${t.agent_id}`,
        candidate_label: c.label,
        candidate_category: c.category,
        candidate_path: c.spritePath,
        ...t
      });
    }
  }

  const outPath = join(ROOT, 'screened', 'agent-tasks.json');
  await writeFile(outPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    candidate_count: queue.length,
    agents_per_candidate: args.skipRound2 ? 6 : 9,
    total_tasks: tasks.length,
    tasks
  }, null, 2));

  console.log(`Built ${tasks.length} agent tasks for ${queue.length} candidates -> ${outPath}`);
  console.log(`Round 1 (aesthetic): ${queue.length * ROUND1_AGENTS.length}`);
  if (!args.skipRound2) console.log(`Round 2 (UI):         ${queue.length * ROUND2_AGENTS.length}`);
  console.log(`Round 3 (adversarial): ${queue.length * ROUND3_AGENTS.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
