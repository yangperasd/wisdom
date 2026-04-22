/**
 * technical-gate.mjs
 *
 * Round 0: AI-free, pure-code filter. Eliminates obviously broken candidates
 * BEFORE any expensive LLM agent calls. Checks pixel dimensions, alpha
 * coverage, color count, palette distance. ~25% of candidates filtered here.
 *
 * Reads candidates from `generated/{category}/*.png`, writes pass/fail
 * results to `screened/round0-results.json`. Failed candidates are moved to
 * `rejected/round0/` with reason annotations.
 */
import sharp from 'sharp';
import { readFile, writeFile, mkdir, readdir, rename, copyFile } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = import.meta.dirname;
const config = JSON.parse(await readFile(join(ROOT, 'config.json'), 'utf-8'));
const checks = config.screening.round0_checks;

// ── Pixel analysis helpers ──────────────────────────────────────────

async function analyzeImage(pngPath) {
  const { data, info } = await sharp(pngPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const totalPixels = width * height;
  let opaquePixels = 0;
  let semiTransparent = 0;
  const colorSet = new Set();
  const opaqueColors = [];

  for (let i = 0; i < data.length; i += channels) {
    const a = data[i + 3];
    if (a > 200) {
      opaquePixels++;
      const key = (data[i] << 16) | (data[i+1] << 8) | data[i+2];
      colorSet.add(key);
      opaqueColors.push([data[i], data[i+1], data[i+2]]);
    } else if (a > 50) {
      semiTransparent++;
    }
  }

  return {
    width, height, channels,
    totalPixels,
    opaquePixels,
    semiTransparent,
    transparentPixels: totalPixels - opaquePixels - semiTransparent,
    opaqueRatio: opaquePixels / totalPixels,
    transparentRatio: (totalPixels - opaquePixels - semiTransparent) / totalPixels,
    uniqueColors: colorSet.size,
    opaqueColors  // sample of opaque pixel colors for palette distance
  };
}

function computePaletteDistance(colors, palette) {
  if (colors.length === 0 || palette.length === 0) return Infinity;
  // For each opaque color, find its closest palette color; average.
  const sample = colors.length > 200 ? colors.filter((_, i) => i % Math.ceil(colors.length / 200) === 0) : colors;
  let totalDist = 0;
  for (const c of sample) {
    let minD = Infinity;
    for (const p of palette) {
      const d = Math.sqrt((c[0]-p.r)**2 + (c[1]-p.g)**2 + (c[2]-p.b)**2);
      if (d < minD) minD = d;
    }
    totalDist += minD;
  }
  return totalDist / sample.length;
}

// ── Run all checks on one image ─────────────────────────────────────

function resolveChecks(category) {
  // Merge default checks with category override (if any)
  const overrides = checks.category_overrides || {};
  const override = overrides[category] || {};
  return { ...checks, ...override, category_applied: override && Object.keys(override).length > 0 ? category : null };
}

function runChecks(analysis, palette, expectedDims, category) {
  const effectiveChecks = resolveChecks(category);
  const issues = [];

  const { width, height } = analysis;
  const dimMatch = expectedDims.some(([w, h]) => w === width && h === height);
  if (!dimMatch) {
    issues.push({ check: 'dimensions', detail: `expected one of ${JSON.stringify(expectedDims)}, got ${width}x${height}` });
  }
  if (analysis.channels !== 4) {
    issues.push({ check: 'has_alpha', detail: `channels=${analysis.channels}` });
  }
  if (analysis.transparentRatio < effectiveChecks.min_alpha_ratio) {
    issues.push({ check: 'min_transparent_ratio', detail: `transparent=${analysis.transparentRatio.toFixed(2)}, need >= ${effectiveChecks.min_alpha_ratio} (category=${category})` });
  }
  if (analysis.transparentRatio > effectiveChecks.max_alpha_ratio) {
    issues.push({ check: 'max_transparent_ratio', detail: `transparent=${analysis.transparentRatio.toFixed(2)}, exceeds ${effectiveChecks.max_alpha_ratio} (category=${category})` });
  }
  if (analysis.uniqueColors < effectiveChecks.min_colors) {
    issues.push({ check: 'min_colors', detail: `colors=${analysis.uniqueColors}, need >= ${effectiveChecks.min_colors}` });
  }
  if (analysis.uniqueColors > effectiveChecks.max_colors) {
    issues.push({ check: 'max_colors', detail: `colors=${analysis.uniqueColors}, exceeds ${effectiveChecks.max_colors}` });
  }
  if (analysis.opaqueRatio < effectiveChecks.min_opaque_ratio) {
    issues.push({ check: 'not_blank', detail: `opaque=${analysis.opaqueRatio.toFixed(2)}, need >= ${effectiveChecks.min_opaque_ratio} (category=${category})` });
  }
  if (palette && palette.length > 0) {
    const dist = computePaletteDistance(analysis.opaqueColors, palette);
    if (dist > effectiveChecks.palette_distance_threshold) {
      issues.push({ check: 'palette_distance', detail: `avg distance=${dist.toFixed(1)}, threshold=${effectiveChecks.palette_distance_threshold}` });
    }
  }

  return { passed: issues.length === 0, issues, _checks: effectiveChecks };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  // Load palette
  const palettePath = join(ROOT, 'reference-sheets', 'palette.json');
  let palette = [];
  if (existsSync(palettePath)) {
    palette = JSON.parse(await readFile(palettePath, 'utf-8'));
  } else {
    console.warn('No palette.json found - palette distance check will be skipped.');
  }

  // Expected dimensions (32x32 standard, 32x48 tall, plus UI sizes + HUD banners)
  const expectedDims = [
    [32, 32], [32, 48], [16, 16], [24, 24],
    [48, 48], [64, 12], [60, 8], [128, 64], [128, 128],
    [128, 24],  // hud_top_bar
    [96, 32],   // objective_card
    [96, 48]    // controls_card
  ];

  const generatedDir = join(ROOT, 'generated');
  const screenedDir = join(ROOT, 'screened');
  const rejectedDir = join(ROOT, 'rejected', 'round0');
  await mkdir(screenedDir, { recursive: true });
  await mkdir(rejectedDir, { recursive: true });

  if (!existsSync(generatedDir)) {
    console.error(`No generated/ directory yet. Run gen-batch.mjs first.`);
    process.exit(1);
  }

  const results = [];
  let passed = 0, failed = 0;

  // Walk all categories
  const categories = await readdir(generatedDir, { withFileTypes: true });
  for (const cat of categories) {
    if (!cat.isDirectory()) continue;
    const catDir = join(generatedDir, cat.name);
    const files = (await readdir(catDir)).filter(f => f.endsWith('.png'));

    for (const file of files) {
      const fullPath = join(catDir, file);
      try {
        const analysis = await analyzeImage(fullPath);
        const result = runChecks(analysis, palette, expectedDims, cat.name);

        results.push({
          file: join(cat.name, file),
          path: fullPath,
          category: cat.name,
          width: analysis.width,
          height: analysis.height,
          uniqueColors: analysis.uniqueColors,
          opaqueRatio: parseFloat(analysis.opaqueRatio.toFixed(3)),
          transparentRatio: parseFloat(analysis.transparentRatio.toFixed(3)),
          passed: result.passed,
          issues: result.issues,
          category_threshold_applied: result._checks?.category_applied || null
        });

        if (result.passed) {
          passed++;
        } else {
          failed++;
          // Move to rejected/round0/{category}/
          const rejCatDir = join(rejectedDir, cat.name);
          await mkdir(rejCatDir, { recursive: true });
          await copyFile(fullPath, join(rejCatDir, file));
        }
      } catch (err) {
        console.error(`  Error analyzing ${file}:`, err.message);
        failed++;
      }
    }
  }

  // Write results
  await writeFile(
    join(screenedDir, 'round0-results.json'),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { total: passed + failed, passed, failed, passRate: (passed / (passed + failed) || 0).toFixed(3) },
      checks_config: checks,
      results
    }, null, 2)
  );

  console.log(`Round 0 complete: ${passed} passed, ${failed} failed (pass rate: ${((passed/(passed+failed))*100).toFixed(1)}%)`);
  console.log(`Results: ${join(screenedDir, 'round0-results.json')}`);
  console.log(`Rejected images: ${rejectedDir}`);
}

main().catch(err => { console.error(err); process.exit(1); });
