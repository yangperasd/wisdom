/**
 * build-peer-sheets.mjs
 *
 * Builds category-specific peer reference sprite sheets from existing Denzi
 * art so screening agents (especially Adv-B Consistency Breaker) can compare
 * candidates against same-category peers, not arbitrary armor pieces.
 *
 * Outputs to reference-sheets/:
 *   - denzi-tech-weapons-ref.png   (deepdwarf weapon-bearing sprites)
 *   - denzi-tech-armor-ref.png     (helmets + shields)
 *   - denzi-tech-creatures-ref.png (mixed enemies for summon/echo)
 *   - denzi-tech-environment-ref.png (env tiles for vfx/portal/UI)
 *
 * Run after extract-palette.mjs has produced the basic ref sheets.
 */
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';

const ROOT     = import.meta.dirname;
const ART_ROOT = join(ROOT, '..', '..', 'assets', 'art');
const OUT_DIR  = join(ROOT, 'reference-sheets');

// Category → list of glob-like filename patterns (relative to ART_ROOT) to include.
const CATEGORY_SOURCES = {
  weapons: [
    'characters/enemies/denzi/monsters/deepdwarf/deepdwarf_axe.png',
    'characters/enemies/denzi/monsters/deepdwarf/deepdwarf_battleaxe.png',
    'characters/enemies/denzi/monsters/deepdwarf/deepdwarf_blunderbus.png',
    'characters/enemies/denzi/monsters/deepdwarf/deepdwarf_hammer.png',
    'characters/enemies/denzi/monsters/deepdwarf/deepdwarf_morningstar.png',
    'characters/enemies/denzi/monsters/deepdwarf/deepdwarf_staff.png',
    'characters/enemies/denzi/monsters/deepdwarf/deepdwarf_torch.png',
    // Pad with helmets to fill the sheet — they're at least item-class
    'items/denzi/items/helmet/helmet_horned.png',
    'items/denzi/items/helmet/helmet_winged.png',
    'items/denzi/items/helmet/helmet_plumed.png'
  ],
  armor: [
    'items/denzi/items/helmet/helmet_crested.png',
    'items/denzi/items/helmet/helmet_enchanted.png',
    'items/denzi/items/helmet/helmet_gold.png',
    'items/denzi/items/helmet/helmet_golden.png',
    'items/denzi/items/helmet/helmet_horned.png',
    'items/denzi/items/helmet/helmet_other.png',
    'items/denzi/items/helmet/helmet_plain.png',
    'items/denzi/items/helmet/helmet_plumed.png',
    'items/denzi/items/helmet/helmet_spiked.png',
    'items/denzi/items/helmet/helmet_steel.png',
    'items/denzi/items/helmet/helmet_winged.png',
    'items/denzi/items/shield/shield_deep_a.png',
    'items/denzi/items/shield/shield_deep_b.png',
    'items/denzi/items/shield/shield_deep_c.png',
    'items/denzi/items/shield/shield_deep_d.png',
    'items/denzi/items/shield/shield_deep_e.png',
    'items/denzi/items/shield/shield_deep_f.png'
  ]
  // creatures + environment fall back to existing extract-palette output
};

async function buildSheet(filePaths, outputPath, cellW = 32, cellH = 32, cols = 6) {
  const validPaths = [];
  for (const p of filePaths) {
    try { await sharp(p).metadata(); validPaths.push(p); } catch { /* skip missing */ }
  }
  if (validPaths.length === 0) {
    console.warn(`  No valid files for ${basename(outputPath)}`);
    return;
  }
  const rows = Math.ceil(validPaths.length / cols);
  const width = cols * cellW;
  const height = rows * cellH;
  const canvas = Buffer.alloc(width * height * 4, 0);

  for (let i = 0; i < validPaths.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const resized = await sharp(validPaths[i])
      .resize(cellW, cellH, { kernel: 'nearest', fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .raw().ensureAlpha().toBuffer();
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
  }
  await sharp(canvas, { raw: { width, height, channels: 4 } }).png().toFile(outputPath);
  console.log(`  ${basename(outputPath)}: ${validPaths.length} sprites (${cols}x${rows})`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log('Building category-specific peer reference sheets:');
  for (const [cat, files] of Object.entries(CATEGORY_SOURCES)) {
    const fullPaths = files.map(f => join(ART_ROOT, f));
    await buildSheet(fullPaths, join(OUT_DIR, `denzi-tech-${cat}-ref.png`));
  }
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
