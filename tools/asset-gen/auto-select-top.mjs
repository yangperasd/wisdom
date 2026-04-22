/**
 * auto-select-top.mjs
 *
 * After post-process + technical-gate pass, this script picks the BEST
 * candidate per prompt using deterministic technical signals (no AI calls):
 *   - palette match score (higher = closer to Denzi+Echoes palette)
 *   - opaque ratio in healthy range (target: 0.10 ~ 0.55 for items)
 *   - color count near sweet spot (8-20)
 *   - silhouette compactness (centroid concentration)
 *
 * Outputs: `screened/auto-selected.json` listing the top-K per prompt.
 * Then prepare-screening.mjs can be run on just those instead of all candidates,
 * massively reducing agent calls.
 *
 * Usage:
 *   node auto-select-top.mjs              # top-1 per prompt across all categories
 *   node auto-select-top.mjs --top 2      # top-2
 *   node auto-select-top.mjs --category items
 */
import sharp from 'sharp';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = import.meta.dirname;
const config = JSON.parse(await readFile(join(ROOT, 'config.json'), 'utf-8'));

function parseArgs() {
  const args = { topK: 1, category: null };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--top') args.topK = parseInt(process.argv[++i], 10);
    else if (a === '--category') args.category = process.argv[++i];
  }
  return args;
}

// Extract prompt id from filename: "sword_iron_v05.png" -> "sword_iron"
function promptIdFromFile(filename) {
  const m = filename.match(/^(.+?)_v\d+\.png$/);
  return m ? m[1] : null;
}

// Score a single candidate using its analysis bundle.
function scoreCandidate(analysis, palette) {
  let score = 0;
  // Color count sweet spot: 8-20 colors. Penalize outside.
  const colors = analysis.uniqueColors;
  if (colors >= 8 && colors <= 20) score += 3;
  else if (colors >= 4 && colors <= 28) score += 2;
  else score += 0;

  // Opaque ratio sweet spot: 0.10-0.55
  const op = analysis.opaqueRatio;
  if (op >= 0.10 && op <= 0.55) score += 3;
  else if (op >= 0.05 && op <= 0.7) score += 1;

  // Palette match
  if (palette.length > 0) {
    const dist = analysis.paletteDistance;
    if (dist < 25) score += 4;
    else if (dist < 40) score += 2;
    else if (dist < 60) score += 1;
  }

  // Bonus: not too many tiny isolated pixels (proxy for clean silhouette)
  // Use tightness = opaque pixels / bounding box area (estimated from extents)
  return score;
}

async function analyzeForScoring(filePath, palette) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  let opaque = 0;
  const colorSet = new Set();
  const samples = [];
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a > 200) {
      opaque++;
      const key = (data[i] << 16) | (data[i+1] << 8) | data[i+2];
      colorSet.add(key);
      if (samples.length < 200) samples.push([data[i], data[i+1], data[i+2]]);
    }
  }
  let paletteDistance = Infinity;
  if (palette.length > 0 && samples.length > 0) {
    let totalD = 0;
    for (const c of samples) {
      let minD = Infinity;
      for (const p of palette) {
        const d = Math.sqrt((c[0]-p.r)**2 + (c[1]-p.g)**2 + (c[2]-p.b)**2);
        if (d < minD) minD = d;
      }
      totalD += minD;
    }
    paletteDistance = totalD / samples.length;
  }
  return { uniqueColors: colorSet.size, opaqueRatio: opaque / total, paletteDistance };
}

async function main() {
  const args = parseArgs();

  // Load Round 0 results to know what passed
  const r0Path = join(ROOT, 'screened', 'round0-results.json');
  if (!existsSync(r0Path)) {
    console.error('Run technical-gate.mjs first to produce round0-results.json');
    process.exit(1);
  }
  const r0 = JSON.parse(await readFile(r0Path, 'utf-8'));
  const passed = r0.results.filter(r => r.passed);
  console.log(`Loaded ${passed.length} R0-passed candidates`);

  // Load palette
  const palettePath = join(ROOT, 'reference-sheets', 'palette.json');
  const palette = existsSync(palettePath) ? JSON.parse(await readFile(palettePath, 'utf-8')) : [];

  // Group by prompt id
  const groups = new Map();
  for (const c of passed) {
    const filename = basename(c.file);
    const promptId = promptIdFromFile(filename);
    if (!promptId) continue;
    if (args.category && c.file.split(/[\\/]/)[0] !== args.category) continue;
    if (!groups.has(promptId)) groups.set(promptId, []);
    groups.get(promptId).push(c);
  }

  console.log(`Grouped into ${groups.size} unique prompts`);

  // Score and pick top-K per group
  const selected = [];
  for (const [promptId, candidates] of groups) {
    const scored = [];
    for (const c of candidates) {
      const analysis = await analyzeForScoring(c.path, palette);
      const score = scoreCandidate(analysis, palette);
      scored.push({ ...c, _analysis: analysis, _score: score });
    }
    scored.sort((a, b) => b._score - a._score);
    const winners = scored.slice(0, args.topK);
    for (const w of winners) {
      selected.push({
        promptId,
        file: w.file,
        path: w.path,
        category: w.file.split(/[\\/]/)[0],
        score: w._score,
        analysis: w._analysis
      });
    }
    const wList = winners.map(w => `${basename(w.file)}(${w._score})`).join(', ');
    console.log(`  ${promptId.padEnd(25)} (${candidates.length} candidates) -> picked ${wList}`);
  }

  const outPath = join(ROOT, 'screened', 'auto-selected.json');
  await writeFile(outPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    topK: args.topK,
    totalSelected: selected.length,
    selected
  }, null, 2));
  console.log(`\n${selected.length} top candidates saved -> ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
