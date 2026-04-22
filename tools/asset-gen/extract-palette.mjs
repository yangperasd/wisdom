/**
 * extract-palette.mjs
 *
 * Builds the project's master color palette by MERGING two sources:
 *   1. A hand-curated Echoes-of-Wisdom palette (warm primary tones for the
 *      target aesthetic — bright greens/blues/yellows/pinks/parchment)
 *   2. K-means extracted secondary tones from existing Denzi PNG sprites
 *      (provides shadow/transition colors that match good pixel art craft)
 *
 * Outputs:
 *   1. reference-sheets/palette-extract.png  — combined color swatch image
 *   2. reference-sheets/palette.json         — machine-readable palette
 *   3. reference-sheets/denzi-*-ref.png      — category reference sprite sheets
 *      (kept as TECHNIQUE references, not mood references)
 */
import sharp from 'sharp';
import { readdir, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import { existsSync } from 'node:fs';

const ART_ROOT = join(import.meta.dirname, '..', '..', 'assets', 'art');
const OUT_DIR  = join(import.meta.dirname, 'reference-sheets');

// ── Hand-curated Echoes-of-Wisdom palette ───────────────────────────
// These are the PRIMARY tones we want generated assets to live in.
// K-means tones from Denzi are appended as secondary shadow / transition colors.

const ECHOES_PALETTE = [
  // Hyrule grass greens
  { r: 0x4e, g: 0xa8, b: 0x4e, role: 'grass-mid'    },
  { r: 0x6d, g: 0xc0, b: 0x6d, role: 'grass-light'  },
  { r: 0x2f, g: 0x6d, b: 0x2f, role: 'grass-dark'   },
  // Sky / magic blues
  { r: 0x5f, g: 0xb3, b: 0xe6, role: 'sky-mid'      },
  { r: 0x88, g: 0xcc, b: 0xe8, role: 'sky-light'    },
  { r: 0x2c, g: 0x7e, b: 0xb5, role: 'sky-dark'     },
  // Sunny gold / treasure
  { r: 0xff, g: 0xd8, b: 0x66, role: 'gold-light'   },
  { r: 0xff, g: 0xaa, b: 0x44, role: 'gold-mid'     },
  { r: 0xcc, g: 0x77, b: 0x33, role: 'gold-dark'    },
  // Candy pink (heart / Tri highlight / flower)
  { r: 0xff, g: 0xb0, b: 0xc4, role: 'pink-light'   },
  { r: 0xf4, g: 0x8a, b: 0xa6, role: 'pink-mid'     },
  { r: 0xc4, g: 0x55, b: 0x7a, role: 'pink-dark'    },
  // Parchment / cream (UI backgrounds)
  { r: 0xff, g: 0xfa, b: 0xe6, role: 'cream-light'  },
  { r: 0xd4, g: 0xc8, b: 0xb0, role: 'cream-mid'    },
  { r: 0x9a, g: 0x88, b: 0x6f, role: 'cream-dark'   },
  // Outline neutral (pixel art near-black)
  { r: 0x3a, g: 0x2e, b: 0x25, role: 'outline-warm' },
  { r: 0x1f, g: 0x1a, b: 0x14, role: 'outline-deep' },
  // Pure white highlight (sparingly used for sparkles)
  { r: 0xff, g: 0xff, b: 0xff, role: 'highlight'    }
].map(c => ({ ...c, count: 0, source: 'echoes-curated' }));

// ── K-means color clustering ────────────────────────────────────────

function euclidean(a, b) {
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
}

function kMeans(pixels, k, maxIter = 30) {
  // Initialize centroids via k-means++ seeding
  const centroids = [pixels[Math.floor(Math.random() * pixels.length)].slice()];
  for (let c = 1; c < k; c++) {
    const dists = pixels.map(p => Math.min(...centroids.map(ctr => euclidean(p, ctr))));
    const total = dists.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pixels.length; i++) {
      r -= dists[i];
      if (r <= 0) { centroids.push(pixels[i].slice()); break; }
    }
  }

  let assignments = new Int32Array(pixels.length);
  for (let iter = 0; iter < maxIter; iter++) {
    // Assign
    let changed = false;
    for (let i = 0; i < pixels.length; i++) {
      let minD = Infinity, minC = 0;
      for (let c = 0; c < k; c++) {
        const d = euclidean(pixels[i], centroids[c]);
        if (d < minD) { minD = d; minC = c; }
      }
      if (assignments[i] !== minC) { assignments[i] = minC; changed = true; }
    }
    if (!changed) break;

    // Update centroids
    const sums = Array.from({ length: k }, () => [0, 0, 0]);
    const counts = new Int32Array(k);
    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      sums[c][0] += pixels[i][0];
      sums[c][1] += pixels[i][1];
      sums[c][2] += pixels[i][2];
      counts[c]++;
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centroids[c] = [sums[c][0]/counts[c], sums[c][1]/counts[c], sums[c][2]/counts[c]];
      }
    }
  }

  // Count per cluster for sorting by frequency
  const freq = new Int32Array(k);
  for (const a of assignments) freq[a]++;

  return centroids
    .map((c, i) => ({ r: Math.round(c[0]), g: Math.round(c[1]), b: Math.round(c[2]), count: freq[i] }))
    .sort((a, b) => b.count - a.count);
}

// ── Scan and collect pixel data ─────────────────────────────────────

async function collectPngs(dir) {
  const results = [];
  async function walk(d) {
    let entries;
    try { entries = await readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory() && !e.name.endsWith('.meta')) await walk(full);
      else if (e.name.endsWith('.png') && !e.name.endsWith('.meta')) results.push(full);
    }
  }
  await walk(dir);
  return results;
}

async function extractOpaquePixels(pngPath, sampleRate = 1) {
  const { data, info } = await sharp(pngPath)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const pixels = [];
  for (let i = 0; i < data.length; i += 4 * sampleRate) {
    const a = data[i + 3];
    if (a > 128) { // only opaque-ish pixels
      pixels.push([data[i], data[i+1], data[i+2]]);
    }
  }
  return pixels;
}

// ── Build reference sprite sheets ───────────────────────────────────

async function buildSpriteSheet(pngs, outputPath, cols = 8, cellW = 32, cellH = 32) {
  const maxItems = Math.min(pngs.length, cols * 8); // max 8 rows
  const rows = Math.ceil(maxItems / cols);
  const width = cols * cellW;
  const height = rows * cellH;

  // Create transparent canvas
  const canvas = Buffer.alloc(width * height * 4, 0);

  for (let idx = 0; idx < maxItems; idx++) {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    try {
      const resized = await sharp(pngs[idx])
        .resize(cellW, cellH, { kernel: 'nearest', fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .raw()
        .ensureAlpha()
        .toBuffer();

      // Blit into canvas
      for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
          const srcOff = (y * cellW + x) * 4;
          const dstOff = ((row * cellH + y) * width + col * cellW + x) * 4;
          canvas[dstOff]     = resized[srcOff];
          canvas[dstOff + 1] = resized[srcOff + 1];
          canvas[dstOff + 2] = resized[srcOff + 2];
          canvas[dstOff + 3] = resized[srcOff + 3];
        }
      }
    } catch { /* skip unreadable files */ }
  }

  await sharp(canvas, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outputPath);

  console.log(`  -> ${basename(outputPath)}: ${maxItems} sprites in ${cols}x${rows} grid`);
}

// ── Generate palette swatch image ───────────────────────────────────

async function buildPaletteSwatch(palette, outputPath) {
  const swatchW = 16;
  const cols = 8;
  const rows = Math.ceil(palette.length / cols);
  const width = cols * swatchW;
  const height = rows * swatchW;
  const canvas = Buffer.alloc(width * height * 4, 255);

  for (let i = 0; i < palette.length; i++) {
    const { r, g, b } = palette[i];
    const row = Math.floor(i / cols);
    const col = i % cols;
    for (let y = 0; y < swatchW; y++) {
      for (let x = 0; x < swatchW; x++) {
        const off = ((row * swatchW + y) * width + col * swatchW + x) * 4;
        canvas[off] = r; canvas[off+1] = g; canvas[off+2] = b; canvas[off+3] = 255;
      }
    }
  }

  await sharp(canvas, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outputPath);
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // 1. Collect all Denzi PNGs by category
  const categories = {
    enemies: join(ART_ROOT, 'characters', 'enemies', 'denzi', 'monsters'),
    player:  join(ART_ROOT, 'characters', 'player', 'denzi', 'paperdoll'),
    items:   join(ART_ROOT, 'items'),
    env:     join(ART_ROOT, 'environment', 'dungeon', 'denzi'),
  };

  const allPixels = [];
  const categoryPngs = {};

  for (const [cat, dir] of Object.entries(categories)) {
    if (!existsSync(dir)) { console.log(`  skip ${cat}: dir not found`); continue; }
    const pngs = await collectPngs(dir);
    categoryPngs[cat] = pngs;
    console.log(`[${cat}] Found ${pngs.length} PNGs`);

    // Sample pixels from each (subsample for speed)
    for (const png of pngs) {
      const px = await extractOpaquePixels(png, 2);
      allPixels.push(...px);
    }
  }

  console.log(`\nTotal opaque pixels sampled: ${allPixels.length}`);

  // 2. Run K-means clustering on Denzi pixels for SHADOW/TRANSITION tones
  const K_DENZI = 12;
  console.log(`Running K-means (k=${K_DENZI}) on Denzi sprites for secondary tones...`);
  const denziTones = kMeans(allPixels, K_DENZI).map(c => ({ ...c, source: 'denzi-extracted', role: 'shadow-or-transition' }));

  // 3. Merge: Echoes curated tones (primary) + Denzi extracted (secondary).
  //    Skip Denzi tones that are too close to existing Echoes tones (deduplicate).
  const merged = [...ECHOES_PALETTE];
  const dedupeThreshold = 35; // RGB Euclidean distance
  for (const dt of denziTones) {
    let isDuplicate = false;
    for (const ep of merged) {
      const d = Math.sqrt((dt.r-ep.r)**2 + (dt.g-ep.g)**2 + (dt.b-ep.b)**2);
      if (d < dedupeThreshold) { isDuplicate = true; break; }
    }
    if (!isDuplicate) merged.push(dt);
  }

  console.log(`\nFinal palette (${merged.length} colors):`);
  for (const c of merged) {
    console.log(`  rgb(${c.r}, ${c.g}, ${c.b}) [${c.source}/${c.role}]`);
  }

  // 4. Save palette JSON
  const paletteJson = merged.map(c => ({
    r: c.r, g: c.g, b: c.b,
    hex: `#${c.r.toString(16).padStart(2,'0')}${c.g.toString(16).padStart(2,'0')}${c.b.toString(16).padStart(2,'0')}`,
    source: c.source,
    role: c.role
  }));
  await writeFile(join(OUT_DIR, 'palette.json'), JSON.stringify(paletteJson, null, 2));
  console.log('\nSaved palette.json');

  // 5. Generate palette swatch PNG
  await buildPaletteSwatch(merged, join(OUT_DIR, 'palette-extract.png'));
  console.log('Saved palette-extract.png');

  // 6. Generate reference sprite sheets per category
  //    These serve as TECHNIQUE references (1px outlines, 32x32 grid, 2-3 tone shading)
  //    NOT mood references — the Echoes palette and prompts drive the mood/tone.
  for (const [cat, pngs] of Object.entries(categoryPngs)) {
    if (pngs.length === 0) continue;
    const shuffled = pngs.sort(() => Math.random() - 0.5);
    await buildSpriteSheet(shuffled, join(OUT_DIR, `denzi-tech-${cat}-ref.png`));
  }

  console.log('\nDone! Reference sheets saved to:', OUT_DIR);
}

main().catch(err => { console.error(err); process.exit(1); });
