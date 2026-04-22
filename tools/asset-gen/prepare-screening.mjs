/**
 * prepare-screening.mjs
 *
 * Builds the auxiliary images that the screening agents need to look at:
 *   - {label}-zoom.png        : 4-panel zoom strip (1x, 4x, on-dark, on-light)
 *   - {label}-zoom8x.png      : 4x + 8x extreme zoom for artifact hunting
 *   - {label}-vs-peers.png    : side-by-side comparison with peer reference sheet
 *   - {label}-vs-peers-warm.png: same but on parchment/warm background for tone check
 *
 * Outputs everything under `screened/work/{candidate-label}/`. Then prints a
 * `screening-queue.json` listing one entry per candidate with all the paths
 * that Claude Code (the orchestrating agent) needs to feed into its 9 agents.
 *
 * Usage:
 *   node prepare-screening.mjs                          # all Round-0 passes
 *   node prepare-screening.mjs --candidate <path.png>   # single ad-hoc image
 *   node prepare-screening.mjs --category items
 */
import sharp from 'sharp';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = import.meta.dirname;
const REF_DIR = join(ROOT, 'reference-sheets');
const WORK_DIR = join(ROOT, 'screened', 'work');

// ── Args ────────────────────────────────────────────────────────────

function parseArgs() {
  const args = { category: null, candidate: null, scene: null, fromAutoSelected: false };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--category')  args.category = process.argv[++i];
    else if (a === '--candidate') args.candidate = process.argv[++i];
    else if (a === '--scene') args.scene = process.argv[++i];
    else if (a === '--from-auto-selected') args.fromAutoSelected = true;
  }
  return args;
}

// Pick a scene screenshot appropriate for the category being screened.
function pickSceneForCategory(category) {
  const ROOT_DIR = join(import.meta.dirname, '..', '..');
  const SHOTS = 'tests/__screenshots__/visual-scene-initial.spec.mjs';
  const map = {
    weapon:     'StartCamp-initial.png',
    armor:      'StartCamp-initial.png',
    consumable: 'StartCamp-initial.png',
    key:        'DungeonHub-initial.png',
    treasure:   'DungeonHub-initial.png',
    accessory:  'StartCamp-initial.png',
    tool:       'FieldWest-initial.png',
    summon:     'StartCamp-initial.png',
    explosion:  'BossArena-initial.png',
    heal:       'StartCamp-initial.png',
    impact:     'BossArena-initial.png',
    portal:     'DungeonRoomA-initial.png',
    particle:   'FieldRuins-initial.png',
    trail:      'BossArena-initial.png',
    magic:      'MechanicsLab-initial.png',
    button:     'StartCamp-initial.png',
    panel:      'StartCamp-initial.png',
    bar:        'StartCamp-initial.png',
    icon:       'StartCamp-initial.png'
  };
  return join(ROOT_DIR, SHOTS, map[category] || 'StartCamp-initial.png');
}

// ── Reference sheet selector ────────────────────────────────────────

function pickReferenceSheet(category) {
  // Use category-specific peer sheets where available (weapons, armor have their own).
  const map = {
    weapon: 'weapons', armor: 'armor',
    consumable: 'items', key: 'items', treasure: 'items', accessory: 'items', tool: 'items', icon: 'items',
    pickup: 'items',
    summon: 'enemies', enemy: 'enemies',
    explosion: 'enemies', heal: 'enemies', impact: 'enemies', trail: 'enemies',
    portal: 'env', particle: 'env', magic: 'env', button: 'env', panel: 'env', bar: 'env',
    tile: 'env', marker: 'env'
  };
  const refKey = map[category] || 'items';
  return join(REF_DIR, `denzi-tech-${refKey}-ref.png`);
}

// ── Image builders ──────────────────────────────────────────────────

async function buildZoomStrip(spritePath, outputPath) {
  const meta = await sharp(spritePath).ensureAlpha().metadata();
  const { width: w, height: h } = meta;

  const cellW = Math.max(128, w * 4);
  const cellH = Math.max(128, h * 4);
  const padding = 8;
  const totalW = cellW * 4 + padding * 5;
  const totalH = cellH + padding * 2;

  const canvas = await sharp({
    create: { width: totalW, height: totalH, channels: 4, background: { r: 32, g: 32, b: 36, alpha: 1 } }
  }).png().toBuffer();

  const original = await sharp(spritePath).ensureAlpha().png().toBuffer();
  const upscaled4x = await sharp(spritePath).ensureAlpha().resize(w * 4, h * 4, { kernel: 'nearest' }).png().toBuffer();

  const onDark = await sharp({ create: { width: cellW, height: cellH, channels: 4, background: { r: 18, g: 18, b: 22, alpha: 1 } } })
    .composite([{ input: upscaled4x, gravity: 'center' }]).png().toBuffer();
  const onLight = await sharp({ create: { width: cellW, height: cellH, channels: 4, background: { r: 230, g: 226, b: 218, alpha: 1 } } })
    .composite([{ input: upscaled4x, gravity: 'center' }]).png().toBuffer();
  const cell0 = await sharp({ create: { width: cellW, height: cellH, channels: 4, background: { r: 64, g: 64, b: 70, alpha: 1 } } })
    .composite([{ input: original, gravity: 'center' }]).png().toBuffer();
  const cell1 = await sharp({ create: { width: cellW, height: cellH, channels: 4, background: { r: 64, g: 64, b: 70, alpha: 1 } } })
    .composite([{ input: upscaled4x, gravity: 'center' }]).png().toBuffer();

  await sharp(canvas)
    .composite([
      { input: cell0,   left: padding,                  top: padding },
      { input: cell1,   left: padding * 2 + cellW,      top: padding },
      { input: onDark,  left: padding * 3 + cellW * 2,  top: padding },
      { input: onLight, left: padding * 4 + cellW * 3,  top: padding }
    ])
    .png().toFile(outputPath);
}

async function buildExtremeZoom(spritePath, outputPath) {
  const meta = await sharp(spritePath).ensureAlpha().metadata();
  const upscale4 = await sharp(spritePath).ensureAlpha().resize(meta.width * 4, meta.height * 4, { kernel: 'nearest' }).png().toBuffer();
  const upscale8 = await sharp(spritePath).ensureAlpha().resize(meta.width * 8, meta.height * 8, { kernel: 'nearest' }).png().toBuffer();

  const w4 = meta.width * 4, h4 = meta.height * 4;
  const w8 = meta.width * 8, h8 = meta.height * 8;
  const padding = 12;
  const totalW = w4 + w8 + padding * 3;
  const totalH = Math.max(h4, h8) + padding * 2;

  await sharp({ create: { width: totalW, height: totalH, channels: 4, background: { r: 30, g: 30, b: 35, alpha: 1 } } })
    .composite([
      { input: upscale4, left: padding, top: padding },
      { input: upscale8, left: padding * 2 + w4, top: padding }
    ])
    .png().toFile(outputPath);
}

async function buildSceneComposite(spritePath, scenePath, outputPath, originalOutPath) {
  // Load scene + candidate
  const scene = sharp(scenePath);
  const sceneMeta = await scene.metadata();
  const candMeta = await sharp(spritePath).metadata();

  // Upscale candidate 4x so it's visible in the scene
  const upscale = 4;
  const candW = candMeta.width * upscale;
  const candH = candMeta.height * upscale;
  const candBuf = await sharp(spritePath).ensureAlpha().resize(candW, candH, { kernel: 'nearest' }).png().toBuffer();

  // Position roughly center
  const px = Math.round(sceneMeta.width / 2 - candW / 2);
  const py = Math.round(sceneMeta.height / 2 - candH / 2);

  // Draw a red arrow as SVG, pointing to candidate
  const arrowSize = 60;
  const ax = px + candW + 8;
  const ay = py + Math.round(candH / 2) - Math.round(arrowSize / 2);
  const arrowSvg = Buffer.from(`<svg width="${arrowSize}" height="${arrowSize}" xmlns="http://www.w3.org/2000/svg"><polygon points="${arrowSize - 6},${arrowSize/2} ${arrowSize/2},6 ${arrowSize/2},${arrowSize/2 - 8} 6,${arrowSize/2 - 8} 6,${arrowSize/2 + 8} ${arrowSize/2},${arrowSize/2 + 8} ${arrowSize/2},${arrowSize - 6}" fill="rgba(220,40,40,0.95)" stroke="white" stroke-width="2"/></svg>`);

  // Composite candidate + arrow onto scene
  await sharp(scenePath)
    .composite([
      { input: candBuf, left: px, top: py },
      { input: arrowSvg, left: ax, top: ay }
    ])
    .png()
    .toFile(outputPath);

  // Also save the original scene unchanged for comparison
  await sharp(scenePath).png().toFile(originalOutPath);
}

async function buildVsPeers(spritePath, refPath, outputPath, opts = {}) {
  const { background = { r: 28, g: 28, b: 32, alpha: 1 } } = opts;
  const refMeta = await sharp(refPath).metadata();
  const candMeta = await sharp(spritePath).metadata();

  const candUpscale = Math.min(refMeta.width / candMeta.width, refMeta.height / candMeta.height);
  const candW = Math.round(candMeta.width * candUpscale);
  const candH = Math.round(candMeta.height * candUpscale);

  const padding = 12;
  const totalW = refMeta.width + candW + padding * 3;
  const totalH = Math.max(refMeta.height, candH) + padding * 2;

  const refBuf = await sharp(refPath).ensureAlpha().png().toBuffer();
  const candBuf = await sharp(spritePath).ensureAlpha().resize(candW, candH, { kernel: 'nearest' }).png().toBuffer();

  await sharp({ create: { width: totalW, height: totalH, channels: 4, background } })
    .composite([
      { input: refBuf,  left: padding,                       top: padding },
      { input: candBuf, left: padding * 2 + refMeta.width,   top: padding }
    ])
    .png().toFile(outputPath);
}

// ── Process one candidate ──────────────────────────────────────────

async function prepareCandidate(spritePath, category, label, scenePath = null) {
  const workDir = join(WORK_DIR, label);
  await mkdir(workDir, { recursive: true });

  const refPath     = pickReferenceSheet(category);
  const palettePath = join(REF_DIR, 'palette-extract.png');

  const zoomPath        = join(workDir, 'zoom.png');
  const zoom8xPath      = join(workDir, 'zoom8x.png');
  const vsPeersPath     = join(workDir, 'vs-peers.png');
  const vsPeersWarmPath = join(workDir, 'vs-peers-warm.png');

  await buildZoomStrip(spritePath, zoomPath);
  await buildExtremeZoom(spritePath, zoom8xPath);
  await buildVsPeers(spritePath, refPath, vsPeersPath);
  await buildVsPeers(spritePath, refPath, vsPeersWarmPath, { background: { r: 250, g: 245, b: 230, alpha: 1 } });

  let compositeScenePath = null, originalScenePath = null;
  if (scenePath && existsSync(scenePath)) {
    compositeScenePath = join(workDir, 'composite-scene.png');
    originalScenePath  = join(workDir, 'original-scene.png');
    await buildSceneComposite(spritePath, scenePath, compositeScenePath, originalScenePath);
  }

  return {
    label,
    category,
    spritePath,
    refPath,
    palettePath,
    workDir,
    zoom: zoomPath,
    zoom8x: zoom8xPath,
    vsPeers: vsPeersPath,
    vsPeersWarm: vsPeersWarmPath,
    compositeScene: compositeScenePath,
    originalScene: originalScenePath
  };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  await mkdir(WORK_DIR, { recursive: true });

  const queue = [];

  if (args.fromAutoSelected) {
    // Bulk mode: read auto-selected.json (top-K candidates per prompt)
    const asPath = join(ROOT, 'screened', 'auto-selected.json');
    if (!existsSync(asPath)) {
      console.error('auto-selected.json not found. Run auto-select-top.mjs first.');
      process.exit(1);
    }
    const as = JSON.parse(await readFile(asPath, 'utf-8'));
    let count = 0;
    for (const sel of as.selected) {
      const scene = pickSceneForCategory(sel.category);
      const label = basename(sel.file, '.png').replace(/[\\/]/g, '_');
      const entry = await prepareCandidate(sel.path, sel.category, label, scene);
      queue.push(entry);
      count++;
      if (count % 5 === 0) console.log(`  prepared ${count}/${as.selected.length}...`);
    }
    console.log(`Prepared ${count} candidates from auto-selected.json (with scene composites)`);
  } else if (args.candidate) {
    // Ad-hoc single-file mode (great for demos)
    const sprite = args.candidate;
    if (!existsSync(sprite)) { console.error(`Not found: ${sprite}`); process.exit(1); }
    const category = args.category || 'item';
    const label = basename(sprite, '.png');
    const entry = await prepareCandidate(sprite, category, label, args.scene);
    queue.push(entry);
    console.log(`Prepared ad-hoc candidate: ${label}${args.scene ? ' (with scene composite)' : ''}`);
  } else {
    // Bulk mode: read round0-results.json
    const round0Path = join(ROOT, 'screened', 'round0-results.json');
    if (!existsSync(round0Path)) {
      console.error('round0-results.json not found. Run technical-gate.mjs first, OR use --candidate for ad-hoc.');
      process.exit(1);
    }
    const round0 = JSON.parse(await readFile(round0Path, 'utf-8'));
    let cands = round0.results.filter(r => r.passed);
    if (args.category) cands = cands.filter(r => r.file.split(/[\\/]/)[0] === args.category);

    for (const c of cands) {
      const label = c.file.replace(/[\\/]/g, '_').replace(/\.png$/, '');
      const category = c.file.split(/[\\/]/)[0];
      const entry = await prepareCandidate(c.path, category, label);
      queue.push(entry);
    }
    console.log(`Prepared ${queue.length} candidates`);
  }

  const queuePath = join(ROOT, 'screened', 'screening-queue.json');
  await mkdir(dirname(queuePath), { recursive: true });
  await writeFile(queuePath, JSON.stringify({ timestamp: new Date().toISOString(), queue }, null, 2));
  console.log(`Queue written: ${queuePath}`);
  console.log(`\nNext: ask Claude Code to screen the candidates listed in this queue.`);
  console.log(`Each candidate has 4 prepared images (zoom, zoom8x, vs-peers, vs-peers-warm).`);
}

main().catch(err => { console.error(err); process.exit(1); });
