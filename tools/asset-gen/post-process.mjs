/**
 * post-process.mjs
 *
 * Post-processes raw ComfyUI outputs:
 *   1. Background removal (alpha matting on near-black/white edges)
 *   2. Nearest-Neighbor downscale (256x256 -> 32x32 / 32x48 / etc.)
 *   3. Palette remap to Denzi reference palette
 *   4. Pixel grid alignment
 *
 * Reads from `generated/{category}/*.png` (raw output from gen-batch.mjs at
 * 256x256), writes processed output back in-place. Idempotent: skips files
 * already at target resolution.
 *
 * Usage:
 *   node post-process.mjs                          # process all categories
 *   node post-process.mjs --category items
 *   node post-process.mjs --target-resolution 32x32
 */
import sharp from 'sharp';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = import.meta.dirname;
const config = JSON.parse(await readFile(join(ROOT, 'config.json'), 'utf-8'));

// ── Args ────────────────────────────────────────────────────────────

function parseArgs() {
  const args = { category: null, targetRes: null };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--category') args.category = process.argv[++i];
    else if (a === '--target-resolution') {
      const [w, h] = process.argv[++i].split('x').map(Number);
      args.targetRes = [w, h];
    }
  }
  return args;
}

// ── Determine target dimensions per file ─────────────────────────────

function getTargetDimsFromPromptId(filename, promptsByCategory) {
  // Extract id from filename: `${id}_v${N}.png`
  const m = filename.match(/^(.+)_v\d+\.png$/);
  if (!m) return null;
  const id = m[1].split('_batch')[0]; // strip batch suffix if present
  for (const entry of promptsByCategory) {
    // entry.id might be 'sword_iron', filename id might be 'sword_iron'
    if (entry.id === id) {
      if (Array.isArray(entry.resolution)) return entry.resolution;
      const key = entry.resolution || 'standard';
      const r = config.generation.target_resolutions[key];
      if (r) return r;
    }
  }
  return null;
}

async function loadPromptsByCategory(category) {
  const file = join(ROOT, 'prompts', `${category}.jsonl`);
  if (!existsSync(file)) return [];
  const lines = (await readFile(file, 'utf-8')).split('\n').filter(l => l.trim());
  return lines.map(l => JSON.parse(l));
}

// ── Background removal ─────────────────────────────────────────────

async function removeBackground(buffer, info) {
  // Heuristic: pixels near pure white or pure black with no surrounding color
  // info are treated as background. Conservative: only edges.
  const { width, height } = info;
  const data = Buffer.from(buffer);
  const channels = info.channels;

  // Flood-fill from corners with luminance threshold
  const visited = new Uint8Array(width * height);
  const queue = [];
  const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];

  function isBackgroundPixel(x, y) {
    const off = (y * width + x) * channels;
    const r = data[off], g = data[off + 1], b = data[off + 2];
    // Near-white (>240) or near-pure-grey background
    const lum = (r * 299 + g * 587 + b * 114) / 1000;
    return lum > 245 || (r > 240 && g > 240 && b > 240);
  }

  for (const [cx, cy] of corners) {
    if (isBackgroundPixel(cx, cy)) queue.push([cx, cy]);
  }

  while (queue.length > 0) {
    const [x, y] = queue.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const idx = y * width + x;
    if (visited[idx]) continue;
    if (!isBackgroundPixel(x, y)) continue;
    visited[idx] = 1;
    // Set alpha to 0
    const off = idx * channels;
    if (channels === 4) data[off + 3] = 0;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return data;
}

// ── Palette remap ───────────────────────────────────────────────────

function remapToPalette(buffer, info, palette) {
  const data = Buffer.from(buffer);
  const channels = info.channels;
  const total = info.width * info.height;

  for (let i = 0; i < total; i++) {
    const off = i * channels;
    if (channels === 4 && data[off + 3] < 50) continue; // skip transparent

    const r = data[off], g = data[off + 1], b = data[off + 2];
    let minD = Infinity, best = palette[0];
    for (const p of palette) {
      const d = (r-p.r)**2 + (g-p.g)**2 + (b-p.b)**2;
      if (d < minD) { minD = d; best = p; }
    }
    data[off] = best.r; data[off + 1] = best.g; data[off + 2] = best.b;
  }

  return data;
}

// ── Process one image ───────────────────────────────────────────────

async function processImage(filePath, targetDims, palette) {
  let img = sharp(filePath).ensureAlpha();
  const meta = await img.metadata();

  // Skip if already at target
  if (meta.width === targetDims[0] && meta.height === targetDims[1]) {
    return { skipped: true };
  }

  // 1. Background removal (on full-res input, before downscale)
  if (config.post_process.remove_background) {
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const cleaned = await removeBackground(data, info);
    img = sharp(cleaned, { raw: { width: info.width, height: info.height, channels: info.channels } });
  }

  // 2. Nearest-Neighbor downscale
  img = img.resize(targetDims[0], targetDims[1], { kernel: 'nearest', fit: 'fill' });

  // 3. Palette remap (on downscaled)
  if (config.post_process.palette_remap && palette.length > 0) {
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const remapped = remapToPalette(data, info, palette);
    img = sharp(remapped, { raw: { width: info.width, height: info.height, channels: info.channels } });
  }

  // 4. Save back to same path
  await img.png({ compressionLevel: 9, palette: false }).toFile(filePath + '.tmp');

  // Atomic replace
  const { rename } = await import('node:fs/promises');
  await rename(filePath + '.tmp', filePath);

  return { skipped: false, finalDims: targetDims };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const generatedDir = join(ROOT, 'generated');

  // Load palette
  const palettePath = join(ROOT, 'reference-sheets', 'palette.json');
  let palette = [];
  if (existsSync(palettePath)) {
    palette = JSON.parse(await readFile(palettePath, 'utf-8'));
  } else {
    console.warn('No palette.json - skipping palette remap');
  }

  if (!existsSync(generatedDir)) {
    console.error('No generated/ directory yet. Run gen-batch.mjs first.');
    process.exit(1);
  }

  const allCategories = ['weapon', 'consumable', 'key', 'treasure', 'accessory', 'armor', 'tool',
                         'pickup',
                         'summon', 'enemy',
                         'explosion', 'heal', 'impact', 'portal', 'particle', 'trail', 'magic', 'marker',
                         'button', 'panel', 'bar', 'icon',
                         'tile'];
  const categoryToFile = {
    weapon: 'items', consumable: 'items', key: 'items', treasure: 'items',
    accessory: 'items', armor: 'items', tool: 'items', pickup: 'items',
    summon: 'echoes', enemy: 'echoes',
    explosion: 'effects', heal: 'effects', impact: 'effects', portal: 'effects',
    particle: 'effects', trail: 'effects', magic: 'effects', marker: 'effects',
    button: 'ui', panel: 'ui', bar: 'ui', icon: 'ui',
    tile: 'tiles'
  };

  // Cache prompts per file
  const promptsCache = new Map();
  async function getPrompts(catFile) {
    if (!promptsCache.has(catFile)) promptsCache.set(catFile, await loadPromptsByCategory(catFile));
    return promptsCache.get(catFile);
  }

  const cats = await readdir(generatedDir, { withFileTypes: true });
  let processed = 0, skipped = 0, errored = 0;

  for (const cat of cats) {
    if (!cat.isDirectory()) continue;
    if (args.category && cat.name !== args.category) continue;

    const promptFile = categoryToFile[cat.name];
    if (!promptFile) {
      console.warn(`Unknown category: ${cat.name} (no prompt mapping)`);
      continue;
    }
    const prompts = await getPrompts(promptFile);

    const files = (await readdir(join(generatedDir, cat.name))).filter(f => f.endsWith('.png'));
    for (const file of files) {
      const filePath = join(generatedDir, cat.name, file);
      let targetDims = args.targetRes || getTargetDimsFromPromptId(file, prompts);
      if (!targetDims) {
        targetDims = config.generation.target_resolutions.standard; // default 32x32
      }

      try {
        const r = await processImage(filePath, targetDims, palette);
        if (r.skipped) { skipped++; }
        else {
          processed++;
          if (processed % 10 === 0) console.log(`  processed ${processed}...`);
        }
      } catch (err) {
        console.error(`  ${file}: ${err.message}`);
        errored++;
      }
    }
  }

  console.log(`\nPost-process complete: ${processed} processed, ${skipped} skipped, ${errored} errors`);
}

main().catch(err => { console.error(err); process.exit(1); });
