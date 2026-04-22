/**
 * aggregate.mjs
 *
 * Reads every per-candidate verdict bundle in `screened/agent-verdicts/*.json`
 * and produces `screened/final-ranked.json` — sorted by overall pass status
 * (passes first), then by final score descending.
 *
 * This is the deterministic "synthesis" step that runs after Claude Code has
 * spawned its 9 agents per candidate and persisted each bundle to disk.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = import.meta.dirname;
const VERDICTS_DIR = join(ROOT, 'screened', 'agent-verdicts');
const OUT_PATH     = join(ROOT, 'screened', 'final-ranked.json');

async function main() {
  if (!existsSync(VERDICTS_DIR)) {
    console.error(`No verdict bundles at ${VERDICTS_DIR}. Spawn agents first.`);
    process.exit(1);
  }

  const files = (await readdir(VERDICTS_DIR)).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.error(`No verdict bundles in ${VERDICTS_DIR}.`);
    process.exit(1);
  }

  const results = [];
  const incomplete = [];
  for (const f of files) {
    try {
      const bundle = JSON.parse(await readFile(join(VERDICTS_DIR, f), 'utf-8'));
      // Defensive: bundles missing R2 or R3 cannot have a trustworthy composite.
      // Previously, null R2/R3 short-circuited finalScore computation to R1-only,
      // pushing incomplete runs to top of ranking. Flag + exclude here.
      const hasR1 = Array.isArray(bundle.round1_aesthetic?.verdicts) && bundle.round1_aesthetic.verdicts.length > 0;
      const hasR2 = Array.isArray(bundle.round2_ui_context?.verdicts) && bundle.round2_ui_context.verdicts.length > 0;
      const hasR3 = Array.isArray(bundle.round3_adversarial?.verdicts) && bundle.round3_adversarial.verdicts.length > 0;
      if (!hasR1 || !hasR2 || !hasR3) {
        bundle._incomplete = {
          missing: [!hasR1 && 'R1', !hasR2 && 'R2', !hasR3 && 'R3'].filter(Boolean)
        };
        incomplete.push(bundle);
        continue;
      }
      results.push(bundle);
    } catch (err) {
      console.warn(`Skipping ${f}: ${err.message}`);
    }
  }

  // Sort: passed first, then by finalScore desc
  results.sort((a, b) => {
    const ap = a.synthesis?.overallPassed ? 1 : 0;
    const bp = b.synthesis?.overallPassed ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return (b.synthesis?.finalScore || 0) - (a.synthesis?.finalScore || 0);
  });

  const summary = {
    total:    results.length,
    incomplete: incomplete.length,
    incompleteNames: incomplete.map(b => ({ name: b.candidateName, missing: b._incomplete.missing })),
    passed:   results.filter(r => r.synthesis?.overallPassed).length,
    failed:   results.filter(r => !r.synthesis?.overallPassed).length,
    avgScore: parseFloat((results.reduce((s, r) => s + (r.synthesis?.finalScore || 0), 0) / results.length || 0).toFixed(2))
  };

  await writeFile(OUT_PATH, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary,
    results
  }, null, 2));

  console.log(`Aggregated ${results.length} candidates -> ${OUT_PATH}`);
  console.log(`  Passed: ${summary.passed} | Failed: ${summary.failed} | Avg score: ${summary.avgScore}`);
  for (const r of results.slice(0, 10)) {
    const status = r.synthesis?.overallPassed ? 'PASS' : 'FAIL';
    console.log(`  ${status}  ${r.candidateName.padEnd(24)}  score=${r.synthesis?.finalScore}  warnings=${r.synthesis?.warningCount}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
