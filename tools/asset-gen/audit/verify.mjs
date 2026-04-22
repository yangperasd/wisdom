/**
 * verify.mjs — hard-check audit of the asset-gen pipeline.
 *
 * Runs 5 standards and writes per-standard reports + a summary. Every claim
 * the verifier makes is backed by a file path / count on disk. No AI in the
 * loop. Run with: `node tools/asset-gen/audit/verify.mjs`.
 */
import sharp from 'sharp';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, basename, relative } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = join(import.meta.dirname, '..', '..', '..');                   // E:/cv5/wisdom
const ASSETGEN = join(ROOT, 'tools', 'asset-gen');
const REPORTS = join(ASSETGEN, 'audit', 'reports');

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function walkFiles(dir, filter = () => true) {
  const out = [];
  async function walk(d) {
    let entries;
    try { entries = await readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else if (filter(e.name, full)) out.push(full);
    }
  }
  await walk(dir);
  return out;
}

async function loadJsonl(path) {
  if (!existsSync(path)) return [];
  const txt = await readFile(path, 'utf-8');
  return txt.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
}

async function loadJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, 'utf-8'));
}

function asRel(p) { return relative(ROOT, p).replace(/\\/g, '/'); }

// ─────────────────────────────────────────────────────────────
// STANDARD 1 — Game actual needs (scanned from codebase)
// ─────────────────────────────────────────────────────────────
// Looks for:
//   a) RectVisual usage in scripts/ (= placeholder rendering, needs real sprite)
//   b) prefab files with visualSpriteFrame: null
//   c) asset_binding_manifest_v2.json entries without fallbackPath or missing files
async function standard1_gameNeeds() {
  const report = {
    rectvisual_usages: [],
    prefab_null_sprites: [],
    manifest_entries: [],
    manifest_bindings_with_missing_files: [],
    entity_visual_controllers: []
  };

  // (a) RectVisual usage
  const scriptFiles = await walkFiles(join(ROOT, 'assets', 'scripts'),
    n => n.endsWith('.ts'));
  for (const f of scriptFiles) {
    const txt = await readFile(f, 'utf-8');
    if (txt.includes('RectVisual')) {
      // Count occurrences + extract class context
      const matches = [...txt.matchAll(/class\s+(\w+)[^{]*\{[^}]*RectVisual/g)];
      for (const m of matches) {
        report.rectvisual_usages.push({ file: asRel(f), class: m[1] });
      }
      // If no class context match, just record file-level usage
      if (matches.length === 0 && /RectVisual/.test(txt)) {
        report.rectvisual_usages.push({ file: asRel(f), class: '(unknown-class)' });
      }
    }
  }

  // (b) prefab null sprites
  const prefabFiles = await walkFiles(join(ROOT, 'assets', 'prefabs'),
    n => n.endsWith('.prefab'));
  for (const f of prefabFiles) {
    const txt = await readFile(f, 'utf-8');
    // Match "visualSpriteFrame": null / "idleSpriteFrame": null / etc.
    const nullMatches = [...txt.matchAll(/"(\w*SpriteFrame)"\s*:\s*null/g)];
    for (const m of nullMatches) {
      report.prefab_null_sprites.push({ file: asRel(f), field: m[1] });
    }
  }

  // (c) manifest bindings
  const manifestPath = join(ROOT, 'assets', 'configs', 'asset_binding_manifest_v2.json');
  const manifest = await loadJson(manifestPath);
  if (manifest) {
    for (const bucket of ['worldEntities', 'uiEntities', 'audioRoles', 'fonts']) {
      const entries = manifest[bucket] || {};
      for (const [key, val] of Object.entries(entries)) {
        const entry = { bucket, key, path: val.fallbackPath || val.path || null, uuid: val.uuid || null };
        report.manifest_entries.push(entry);
        if (entry.path) {
          const full = join(ROOT, entry.path);
          if (!existsSync(full)) {
            report.manifest_bindings_with_missing_files.push({
              bucket, key, expected_path: entry.path
            });
          }
        }
      }
    }
  }

  // (d) visual controller sprite slots (hint at expected sprites)
  for (const f of scriptFiles) {
    if (!/VisualController\.ts$/.test(f)) continue;
    const txt = await readFile(f, 'utf-8');
    const slotMatches = [...txt.matchAll(/(\w+)SpriteFrame\s*:/g)];
    const slots = [...new Set(slotMatches.map(m => m[1]))];
    report.entity_visual_controllers.push({ file: asRel(f), slots });
  }

  report._summary = {
    rectvisual_files: report.rectvisual_usages.length,
    prefab_null_sprite_fields: report.prefab_null_sprites.length,
    total_manifest_bindings: report.manifest_entries.length,
    manifest_bindings_missing_file: report.manifest_bindings_with_missing_files.length
  };
  return report;
}

// ─────────────────────────────────────────────────────────────
// STANDARD 2 — Generation coverage
// ─────────────────────────────────────────────────────────────
async function standard2_coverage() {
  const report = { prompts: [], total_prompts: 0 };

  // All prompts
  const promptFiles = ['items', 'echoes', 'effects', 'ui'];
  const allPrompts = [];
  for (const pf of promptFiles) {
    const path = join(ASSETGEN, 'prompts', `${pf}.jsonl`);
    const prompts = await loadJsonl(path);
    for (const p of prompts) allPrompts.push({ ...p, _source: `${pf}.jsonl` });
  }

  // Round 0 results
  const r0 = await loadJson(join(ASSETGEN, 'screened', 'round0-results.json'));
  const r0Map = new Map();
  if (r0) {
    for (const r of r0.results || []) {
      const filename = basename(r.file);
      const m = filename.match(/^(.+)_v\d+\.png$/);
      if (m) {
        const pid = m[1];
        if (!r0Map.has(pid)) r0Map.set(pid, { total: 0, passed: 0, failed: 0 });
        r0Map.get(pid).total++;
        if (r.passed) r0Map.get(pid).passed++; else r0Map.get(pid).failed++;
      }
    }
  }

  // Auto-selected
  const autoSel = await loadJson(join(ASSETGEN, 'screened', 'auto-selected.json'));
  const autoSelMap = new Map();
  if (autoSel) {
    for (const s of autoSel.selected || []) autoSelMap.set(s.promptId, s);
  }

  // Agent verdicts on disk
  const verdictDir = join(ASSETGEN, 'screened', 'agent-verdicts');
  const verdictFiles = existsSync(verdictDir) ? await readdir(verdictDir) : [];
  const verdictMap = new Map();
  for (const vf of verdictFiles) {
    if (!vf.endsWith('.json')) continue;
    const bundle = await loadJson(join(verdictDir, vf));
    if (!bundle) continue;
    const pid = bundle.candidateName?.replace(/_v\d+$/, '');
    if (pid) verdictMap.set(pid, bundle);
  }

  // Generated per category directory
  const generatedDir = join(ASSETGEN, 'generated');
  const genCounts = new Map();
  if (existsSync(generatedDir)) {
    const cats = await readdir(generatedDir, { withFileTypes: true });
    for (const c of cats) {
      if (!c.isDirectory()) continue;
      const files = await readdir(join(generatedDir, c.name));
      for (const f of files) {
        const m = f.match(/^(.+)_v\d+\.png$/);
        if (m) genCounts.set(m[1], (genCounts.get(m[1]) || 0) + 1);
      }
    }
  }

  for (const p of allPrompts) {
    const genCount = genCounts.get(p.id) || 0;
    const r0Info = r0Map.get(p.id) || { total: 0, passed: 0, failed: 0 };
    const autoSelected = autoSelMap.has(p.id);
    const verdicted = verdictMap.has(p.id);
    const bundle = verdictMap.get(p.id);
    const r1Count = bundle?.round1_aesthetic?.verdicts?.length || 0;
    const r2Count = bundle?.round2_ui_context?.verdicts?.length || 0;
    const r3Count = bundle?.round3_adversarial?.verdicts?.length || 0;
    const finalScore = bundle?.synthesis?.finalScore || null;
    const overallPassed = bundle?.synthesis?.overallPassed || false;

    report.prompts.push({
      id: p.id,
      category: p.category,
      source: p._source,
      generated_count: genCount,
      r0_total: r0Info.total,
      r0_passed: r0Info.passed,
      r0_failed: r0Info.failed,
      auto_selected: autoSelected,
      has_verdict_bundle: verdicted,
      verdict_counts: { r1: r1Count, r2: r2Count, r3: r3Count },
      final_score: finalScore,
      overall_passed: overallPassed
    });
  }

  report.total_prompts = allPrompts.length;
  report._summary = {
    total_prompts: allPrompts.length,
    prompts_with_generations: report.prompts.filter(p => p.generated_count > 0).length,
    prompts_with_r0_passes: report.prompts.filter(p => p.r0_passed > 0).length,
    prompts_auto_selected: report.prompts.filter(p => p.auto_selected).length,
    prompts_verdicted: report.prompts.filter(p => p.has_verdict_bundle).length,
    prompts_fully_9agent_screened: report.prompts.filter(p =>
      p.verdict_counts.r1 === 3 && p.verdict_counts.r2 === 3 && p.verdict_counts.r3 === 3
    ).length,
    prompts_only_r1_screened: report.prompts.filter(p =>
      p.verdict_counts.r1 === 3 && p.verdict_counts.r2 === 0 && p.verdict_counts.r3 === 0
    ).length,
    prompts_no_round0_pass: report.prompts.filter(p => p.r0_total > 0 && p.r0_passed === 0).map(p => p.id),
    prompts_not_generated_at_all: report.prompts.filter(p => p.generated_count === 0).map(p => p.id),
    prompts_overall_passed: report.prompts.filter(p => p.overall_passed).length
  };
  return report;
}

// ─────────────────────────────────────────────────────────────
// STANDARD 3 — Gap analysis (needs × supply)
// ─────────────────────────────────────────────────────────────
function standard3_gap(needs, coverage) {
  const lines = [];
  lines.push('# Gap Analysis — game needs × pipeline supply');
  lines.push('');
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push('');

  // A. entities the game wants (from manifest/prefab) but NO matching prompt
  const promptIds = new Set(coverage.prompts.map(p => p.id));
  lines.push('## A. Manifest bindings with NO corresponding prompt');
  lines.push('');
  const noPrompt = [];
  for (const b of needs.manifest_entries) {
    // Heuristic match: manifest key vs any prompt id substring
    const matched = [...promptIds].some(pid =>
      pid.includes(b.key) || b.key.includes(pid.split('_')[0])
    );
    if (!matched) noPrompt.push(b);
  }
  if (noPrompt.length === 0) lines.push('_(none)_');
  for (const n of noPrompt) lines.push(`- \`${n.bucket}.${n.key}\`  expected: \`${n.path || '(no path)'}\``);
  lines.push('');

  // B. Prompts with 0 candidates past Round 0
  lines.push('## B. Prompts with ZERO candidates passing Round 0 (gen/quality gap)');
  lines.push('');
  const r0Dead = coverage.prompts.filter(p => p.generated_count > 0 && p.r0_passed === 0);
  if (r0Dead.length === 0) lines.push('_(none)_');
  for (const p of r0Dead) lines.push(`- \`${p.id}\` (${p.category}): generated ${p.generated_count}, passed R0: 0`);
  lines.push('');

  // C. Prompts not generated at all
  lines.push('## C. Prompts with ZERO generations (never ran or failed silently)');
  lines.push('');
  const notGen = coverage.prompts.filter(p => p.generated_count === 0);
  if (notGen.length === 0) lines.push('_(none)_');
  for (const p of notGen) lines.push(`- \`${p.id}\` (${p.category})`);
  lines.push('');

  // D. Prompts fully generated but incompletely screened
  lines.push('## D. Prompts screened but NOT 9-agent complete');
  lines.push('');
  const partial = coverage.prompts.filter(p =>
    p.has_verdict_bundle &&
    !(p.verdict_counts.r1 === 3 && p.verdict_counts.r2 === 3 && p.verdict_counts.r3 === 3)
  );
  lines.push(`Total: ${partial.length}/${coverage.prompts.filter(p => p.has_verdict_bundle).length}`);
  lines.push('');
  for (const p of partial.slice(0, 10)) {
    lines.push(`- \`${p.id}\` r1:${p.verdict_counts.r1}/3 r2:${p.verdict_counts.r2}/3 r3:${p.verdict_counts.r3}/3`);
  }
  if (partial.length > 10) lines.push(`- ...(${partial.length - 10} more)`);
  lines.push('');

  // E. RectVisual still in use
  lines.push('## E. Entity classes STILL using RectVisual placeholder');
  lines.push('');
  if (needs.rectvisual_usages.length === 0) lines.push('_(none)_');
  const uniqClasses = [...new Set(needs.rectvisual_usages.map(u => u.class))];
  for (const c of uniqClasses) lines.push(`- \`${c}\``);
  lines.push('');

  // F. Prefab fields with null SpriteFrame
  lines.push('## F. Prefab SpriteFrame fields set to null');
  lines.push('');
  if (needs.prefab_null_sprites.length === 0) lines.push('_(none)_');
  for (const p of needs.prefab_null_sprites) lines.push(`- \`${p.file}\` :: \`${p.field}\``);
  lines.push('');

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
// STANDARD 4 — Format compliance
// ─────────────────────────────────────────────────────────────
async function standard4_format() {
  const report = { candidates: [], violations: [] };
  const generatedDir = join(ASSETGEN, 'generated');
  if (!existsSync(generatedDir)) {
    report._summary = { note: 'generated/ dir missing' };
    return report;
  }
  const pngs = await walkFiles(generatedDir, n => n.endsWith('.png'));
  // Load prompts to know expected resolution per id
  const allPrompts = [];
  for (const pf of ['items', 'echoes', 'effects', 'ui']) {
    allPrompts.push(...await loadJsonl(join(ASSETGEN, 'prompts', `${pf}.jsonl`)));
  }
  const promptByCat = new Map();
  for (const p of allPrompts) promptByCat.set(p.id, p);

  for (const png of pngs) {
    const bn = basename(png);
    const m = bn.match(/^(.+)_v\d+\.png$/);
    if (!m) continue;
    const pid = m[1];
    const prompt = promptByCat.get(pid);
    try {
      const meta = await sharp(png).metadata();
      const hasAlpha = meta.channels === 4 || meta.hasAlpha;
      const expected = prompt?.resolution;
      let expectedDims = null;
      if (typeof expected === 'string') {
        expectedDims = { standard: [32, 32], tall: [32, 48], ui_small: [24, 24], ui_med: [48, 48], ui_panel: [128, 128] }[expected] || [32, 32];
      } else if (Array.isArray(expected)) {
        expectedDims = expected;
      }
      const dimMatch = expectedDims ? (meta.width === expectedDims[0] && meta.height === expectedDims[1]) : null;
      const entry = {
        file: asRel(png),
        prompt_id: pid,
        width: meta.width,
        height: meta.height,
        channels: meta.channels,
        has_alpha: hasAlpha,
        expected: expectedDims,
        dim_match: dimMatch
      };
      report.candidates.push(entry);
      if (expectedDims && !dimMatch) {
        report.violations.push({ ...entry, violation: 'wrong_dimensions' });
      }
      if (!hasAlpha) {
        report.violations.push({ ...entry, violation: 'no_alpha_channel' });
      }
    } catch (err) {
      report.violations.push({ file: asRel(png), violation: 'unreadable', error: err.message });
    }
  }
  report._summary = {
    total_pngs: report.candidates.length,
    violations: report.violations.length,
    wrong_dimension_count: report.violations.filter(v => v.violation === 'wrong_dimensions').length,
    no_alpha_count: report.violations.filter(v => v.violation === 'no_alpha_channel').length
  };
  return report;
}

// ─────────────────────────────────────────────────────────────
// STANDARD 5 — Prompt quality
// ─────────────────────────────────────────────────────────────
async function standard5_promptQuality(coverage) {
  // Core style anchors every prompt needs
  const requiredKeywords = ['pixel', 'Echoes of Wisdom'];
  // Bonus mood anchors (need >=2 of these)
  const recommendedKeywords = ['cute', 'charming', 'Nintendo', 'bright', 'warm', 'charming'];
  // Bonus: a resolution mention somewhere (any NxM form)
  const resolutionPattern = /\d+x\d+/;
  const requiredNegatives = ['blur', 'anti-aliasing', '3d render', 'realistic', 'dark grimdark'];
  const report = { prompts: [] };
  for (const pf of ['items', 'echoes', 'effects', 'ui']) {
    const prompts = await loadJsonl(join(ASSETGEN, 'prompts', `${pf}.jsonl`));
    for (const p of prompts) {
      const text = (p.prompt || '').toLowerCase();
      const neg = (p.negative || '').toLowerCase();
      const covInfo = coverage.prompts.find(c => c.id === p.id);
      const required_hits = requiredKeywords.filter(k => text.includes(k.toLowerCase())).length;
      const has_resolution = resolutionPattern.test(text);
      const recommended_hits = recommendedKeywords.filter(k => text.includes(k.toLowerCase())).length;
      const negative_hits = requiredNegatives.filter(k => neg.includes(k.toLowerCase())).length;
      const text_length = (p.prompt || '').length;
      const entry = {
        id: p.id,
        category: p.category,
        prompt_length: text_length,
        required_keyword_hits: required_hits,
        has_resolution_mention: has_resolution,
        recommended_keyword_hits: recommended_hits,
        negative_keyword_hits: negative_hits,
        r0_pass_rate: covInfo && covInfo.r0_total ? (covInfo.r0_passed / covInfo.r0_total).toFixed(2) : null,
        issues: []
      };
      if (required_hits < requiredKeywords.length) entry.issues.push('missing_required_keywords');
      if (!has_resolution) entry.issues.push('missing_resolution_mention');
      if (recommended_hits < 2) entry.issues.push('weak_mood_keywords');
      if (negative_hits < 3) entry.issues.push('weak_negative_prompt');
      if (covInfo && covInfo.r0_total > 0 && covInfo.r0_passed / covInfo.r0_total < 0.3) {
        entry.issues.push('low_r0_pass_rate');
      }
      report.prompts.push(entry);
    }
  }
  report._summary = {
    total_prompts: report.prompts.length,
    with_issues: report.prompts.filter(p => p.issues.length > 0).length,
    missing_keywords: report.prompts.filter(p => p.issues.includes('missing_required_keywords')).length,
    weak_negatives: report.prompts.filter(p => p.issues.includes('weak_negative_prompt')).length,
    low_pass_rate: report.prompts.filter(p => p.issues.includes('low_r0_pass_rate')).length
  };
  return report;
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
async function main() {
  console.log('=== asset-gen pipeline verifier ===\n');
  const lines = [];
  const timestamp = new Date().toISOString();

  console.log('[1/5] Standard 1: Game needs...');
  const needs = await standard1_gameNeeds();
  await writeFile(join(REPORTS, '01_needed_assets.json'), JSON.stringify(needs, null, 2));
  lines.push(`## Standard 1 — Game actual needs`);
  lines.push('');
  for (const [k, v] of Object.entries(needs._summary)) lines.push(`- **${k}**: ${v}`);
  lines.push('');

  console.log('[2/5] Standard 2: Coverage...');
  const coverage = await standard2_coverage();
  await writeFile(join(REPORTS, '02_prompt_coverage.json'), JSON.stringify(coverage, null, 2));
  lines.push(`## Standard 2 — Generation coverage (${coverage._summary.total_prompts} prompts)`);
  lines.push('');
  for (const [k, v] of Object.entries(coverage._summary)) {
    if (Array.isArray(v) && v.length > 5) lines.push(`- **${k}**: ${v.length} (first 5: ${v.slice(0, 5).join(', ')})`);
    else lines.push(`- **${k}**: ${Array.isArray(v) ? JSON.stringify(v) : v}`);
  }
  lines.push('');

  console.log('[3/5] Standard 3: Gap analysis...');
  const gapMd = standard3_gap(needs, coverage);
  await writeFile(join(REPORTS, '03_gap_report.md'), gapMd);
  lines.push('## Standard 3 — Gap analysis');
  lines.push('_(see 03_gap_report.md)_');
  lines.push('');

  console.log('[4/5] Standard 4: Format compliance...');
  const format = await standard4_format();
  await writeFile(join(REPORTS, '04_format_violations.json'), JSON.stringify(format, null, 2));
  lines.push(`## Standard 4 — Format compliance`);
  lines.push('');
  for (const [k, v] of Object.entries(format._summary || {})) lines.push(`- **${k}**: ${v}`);
  lines.push('');

  console.log('[5/5] Standard 5: Prompt quality...');
  const promptQ = await standard5_promptQuality(coverage);
  await writeFile(join(REPORTS, '05_prompt_quality.json'), JSON.stringify(promptQ, null, 2));
  lines.push(`## Standard 5 — Prompt quality`);
  lines.push('');
  for (const [k, v] of Object.entries(promptQ._summary)) lines.push(`- **${k}**: ${v}`);
  lines.push('');

  const summaryPath = join(REPORTS, '99_summary.md');
  await writeFile(summaryPath, [
    `# Pipeline Audit Summary`,
    `Generated: ${timestamp}`,
    '',
    ...lines,
    '',
    '## Report files',
    '- `01_needed_assets.json` — raw inventory of game needs',
    '- `02_prompt_coverage.json` — per-prompt status table',
    '- `03_gap_report.md` — human-readable gap narrative',
    '- `04_format_violations.json` — dimension/alpha violations',
    '- `05_prompt_quality.json` — prompt text quality audit',
  ].join('\n'));

  console.log('\n=== Done. See reports in: ', REPORTS);
}

main().catch(err => { console.error(err); process.exit(1); });
