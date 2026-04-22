/**
 * merge-raw-verdicts.mjs
 *
 * After all agents have written their individual verdict files to
 * `screened/raw-verdicts/{candidate}__{agent_id}.json`, this script:
 *   1. Groups them by candidate
 *   2. Loads the matching screening-queue.json entry to get path/category
 *   3. Computes per-round aggregate (pass/marginal/fail counts, avg score)
 *   4. Computes synthesis (final score, warnings, overallPassed)
 *   5. Writes one consolidated bundle per candidate to `agent-verdicts/{candidate}.json`
 *
 * After this, aggregate.mjs can run as usual.
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = import.meta.dirname;
const RAW_DIR = join(ROOT, 'screened', 'raw-verdicts');
const OUT_DIR = join(ROOT, 'screened', 'agent-verdicts');

// Round membership
const ROUND_OF = {
  aesthetic_a_style_fidelity:    1,
  aesthetic_b_cute_clarity:      1,
  aesthetic_c_color_harmony:     1,
  ui_a_readability:              2,
  ui_b_mood_coherence:           2,
  ui_c_scale_proportion:         2,
  adversarial_a_artifact_hunter: 3,
  adversarial_b_consistency_breaker: 3,
  adversarial_c_tone_mismatch:   3
};

function aggregateRound(verdicts, mode = 'majority') {
  const valid = verdicts.filter(v => v && !v.error);
  if (valid.length === 0) return { pass: false, passes: 0, marginals: 0, fails: 0, avgScore: 0, reason: 'all_errored' };
  const passes    = valid.filter(v => v.verdict === 'pass').length;
  const marginals = valid.filter(v => v.verdict === 'marginal').length;
  const fails     = valid.filter(v => v.verdict === 'fail').length;
  const avgScore  = parseFloat((valid.reduce((s, v) => s + (v.score || 0), 0) / valid.length).toFixed(2));

  if (mode === 'veto') {
    const vetoes = valid.filter(v => v.verdict === 'fail' && (v.confidence || 1.0) >= 0.8);
    return { pass: vetoes.length === 0, passes, marginals, fails, avgScore, vetoes: vetoes.length, reason: vetoes.length > 0 ? `vetoed_by_${vetoes.length}` : 'no_veto' };
  }
  // Majority
  const enoughPasses = passes >= 2;
  const noStrongFail = fails < 2;
  const scoreOk = avgScore >= 6;
  return { pass: enoughPasses && noStrongFail && scoreOk, passes, marginals, fails, avgScore, reason: !enoughPasses ? 'insufficient_passes' : !noStrongFail ? 'too_many_fails' : !scoreOk ? `low_avg_${avgScore}` : 'pass' };
}

async function main() {
  if (!existsSync(RAW_DIR)) {
    console.error(`No ${RAW_DIR}. Spawn agents first to write raw verdicts.`);
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });

  const queuePath = join(ROOT, 'screened', 'screening-queue.json');
  const queue = JSON.parse(await readFile(queuePath, 'utf-8')).queue;
  const queueByLabel = Object.fromEntries(queue.map(c => [c.label, c]));

  const files = (await readdir(RAW_DIR)).filter(f => f.endsWith('.json'));
  console.log(`Loading ${files.length} raw verdicts...`);

  const byCand = new Map();
  for (const f of files) {
    // filename: {candidate_label}__{agent_id}.json
    const m = f.match(/^(.+?)__(.+?)\.json$/);
    if (!m) continue;
    const [, label, agentId] = m;
    let v;
    try {
      v = JSON.parse(await readFile(join(RAW_DIR, f), 'utf-8'));
    } catch (err) {
      console.warn(`  bad JSON in ${f}: ${err.message}`);
      v = { agent: agentId, error: err.message, verdict: 'fail', score: 0, issues: ['unparseable'], reasoning: 'verdict file unparseable' };
    }
    if (!byCand.has(label)) byCand.set(label, { round1: [], round2: [], round3: [] });
    const round = ROUND_OF[agentId] || 1;
    byCand.get(label)[`round${round}`].push(v);
  }

  console.log(`Building bundles for ${byCand.size} candidates...`);

  for (const [label, rounds] of byCand) {
    const qEntry = queueByLabel[label];
    if (!qEntry) {
      console.warn(`  no queue entry for ${label}, skipping`);
      continue;
    }

    const r1 = { verdicts: rounds.round1, aggregate: aggregateRound(rounds.round1, 'majority') };
    const r2 = rounds.round2.length > 0
      ? { verdicts: rounds.round2, aggregate: aggregateRound(rounds.round2, 'majority') }
      : null;
    const r3 = { verdicts: rounds.round3, aggregate: aggregateRound(rounds.round3, 'veto') };

    const r1Score = r1.aggregate.avgScore || 0;
    const r2Score = r2 ? (r2.aggregate.avgScore || 0) : r1Score;
    const r3Scores = (r3.verdicts || []).filter(v => v && !v.error).map(v => v.score || 0);
    const r3Min = r3Scores.length > 0 ? Math.min(...r3Scores) : 0;
    const finalScore = parseFloat((r1Score * 0.35 + r2Score * 0.35 + r3Min * 0.30).toFixed(2));

    const allVerdicts = [...r1.verdicts, ...(r2?.verdicts || []), ...r3.verdicts].filter(v => v && !v.error);
    const warningCount = allVerdicts.filter(v => v.verdict === 'marginal').length;
    const failCount    = allVerdicts.filter(v => v.verdict === 'fail').length;
    const unanimousPass = allVerdicts.length > 0 && allVerdicts.every(v => v.verdict === 'pass');

    const bundle = {
      file: qEntry.spritePath?.split(/[\\/]/).slice(-2).join('/') || label,
      path: qEntry.spritePath,
      category: qEntry.category,
      candidateName: label,
      round1_aesthetic: r1,
      round2_ui_context: r2,
      round3_adversarial: r3,
      synthesis: {
        finalScore,
        aestheticAvg: r1Score,
        uiContextAvg: r2Score,
        adversarialMin: r3Min,
        warningCount,
        failCount,
        unanimousPass,
        overallPassed: r1.aggregate.pass && (!r2 || r2.aggregate.pass) && r3.aggregate.pass
      },
      timestamp: new Date().toISOString()
    };

    await writeFile(join(OUT_DIR, `${label}.json`), JSON.stringify(bundle, null, 2));
  }

  console.log(`Wrote ${byCand.size} bundles to ${OUT_DIR}`);
}

main().catch(err => { console.error(err); process.exit(1); });
