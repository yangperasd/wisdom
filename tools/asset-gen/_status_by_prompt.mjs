import { readFileSync } from 'node:fs';
const r = JSON.parse(readFileSync('screened/final-ranked.json', 'utf-8')).results;

const byPrompt = new Map();
for (const e of r) {
  const id = e.candidateName.replace(/_v\d+$/, '');
  const fs = e.synthesis?.finalScore || 0;
  const r3min = (e.round3_adversarial?.verdicts || []).reduce((m, v) => Math.min(m, v.score), 10);
  const r1avg = (e.round1_aesthetic?.verdicts || []).reduce((s, v) => s + v.score, 0) / 3;
  const r2avg = (e.round2_ui_context?.verdicts || []).reduce((s, v) => s + v.score, 0) / 3;
  byPrompt.set(id, { candidate: e.candidateName, fs, r3min, r1avg, r2avg, category: e.category, passed: e.synthesis?.overallPassed });
}

const buckets = { A_pass: [], B_marginal_usable: [], C_weak_usable: [], D_unusable: [] };
for (const [id, d] of byPrompt) {
  // A: 正式 PASS
  if (d.passed) { buckets.A_pass.push([id, d]); continue; }
  // B: marginal usable — composite ≥ 6.0 AND R3min ≥ 4 (肉眼大概率可用，只是对抗 agent 挑刺)
  if (d.fs >= 6.0 && d.r3min >= 4) { buckets.B_marginal_usable.push([id, d]); continue; }
  // C: weak usable — composite 5.0-5.99 OR R3min = 3 (可能需要返工或人工 touch-up)
  if (d.fs >= 5.0 || d.r3min >= 3) { buckets.C_weak_usable.push([id, d]); continue; }
  // D: unusable
  buckets.D_unusable.push([id, d]);
}

function show(title, arr, full = false) {
  console.log(`\n=== ${title} (${arr.length}) ===`);
  arr.sort((a, b) => b[1].fs - a[1].fs);
  const limit = full ? arr.length : 12;
  for (const [id, d] of arr.slice(0, limit)) {
    console.log(`  ${id.padEnd(26)} cat=${d.category.padEnd(10)} fs=${d.fs.toFixed(2)}  R1=${d.r1avg.toFixed(1)} R2=${d.r2avg.toFixed(1)} R3min=${d.r3min}`);
  }
  if (!full && arr.length > limit) console.log(`  ... ${arr.length - limit} more`);
}

console.log(`Total prompts evaluated: ${byPrompt.size}`);
show('A: PASS (自动过 — 直接用)', buckets.A_pass, true);
show('B: Marginal Usable (composite ≥6.0 & R3min ≥4 — 肉眼应可用)', buckets.B_marginal_usable, true);
show('C: Weak (composite 5.0-5.99 或 R3min=3 — 需人工 touch-up)', buckets.C_weak_usable);
show('D: Unusable (composite <5 且 R3min <3 — 需重做)', buckets.D_unusable, true);

// Category breakdown of Unusable
const catCount = {};
for (const [, d] of buckets.D_unusable) catCount[d.category] = (catCount[d.category] || 0) + 1;
console.log('\n=== D (unusable) by category ===');
for (const [c, n] of Object.entries(catCount).sort((a, b) => b[1] - a[1])) console.log(`  ${c}: ${n}`);
