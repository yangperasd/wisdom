import { readFileSync } from 'node:fs';
const r = JSON.parse(readFileSync('screened/final-ranked.json', 'utf-8'));
const arr = Array.isArray(r) ? r : (r.results || r.ranked || Object.values(r));
console.log('top-level keys:', Object.keys(r).slice(0, 10));
console.log('total ranked:', arr.length);
console.log('');
// Compute composite score from 3 rounds
function scoreOf(e) {
  const r1 = e.round1_aesthetic?.verdicts?.map(v => v.score) || [];
  const r2 = e.round2_ui_context?.verdicts?.map(v => v.score) || [];
  const r3 = e.round3_adversarial?.verdicts?.map(v => v.score) || [];
  const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  const r1a = avg(r1), r2a = avg(r2), r3m = r3.length ? Math.min(...r3) : 0;
  return { composite: r1a * 0.35 + r2a * 0.35 + r3m * 0.30, r1a, r2a, r3m };
}
function passOf(e) {
  // Pass = R3 no fail + R1 majority >=6 + R2 majority >=6
  const r1p = (e.round1_aesthetic?.verdicts || []).filter(v => v.score >= 6).length;
  const r2p = (e.round2_ui_context?.verdicts || []).filter(v => v.score >= 6).length;
  const r3f = (e.round3_adversarial?.verdicts || []).filter(v => v.verdict === 'fail').length;
  return r1p >= 2 && r2p >= 2 && r3f === 0;
}
for (const e of arr) {
  e._s = scoreOf(e);
  e._pass = passOf(e);
}
const buckets = { '>=7.5': 0, '7.0-7.49': 0, '6.5-6.99': 0, '6.0-6.49': 0, '5.5-5.99': 0, '5.0-5.49': 0, '<5.0': 0 };
for (const e of arr) {
  const s = e._s.composite;
  if (s >= 7.5) buckets['>=7.5']++;
  else if (s >= 7.0) buckets['7.0-7.49']++;
  else if (s >= 6.5) buckets['6.5-6.99']++;
  else if (s >= 6.0) buckets['6.0-6.49']++;
  else if (s >= 5.5) buckets['5.5-5.99']++;
  else if (s >= 5.0) buckets['5.0-5.49']++;
  else buckets['<5.0']++;
}
console.log('Score distribution:');
for (const [b, n] of Object.entries(buckets)) console.log('  ' + b.padEnd(12), n);

console.log('');
console.log('Pass count (R1>=2 pass, R2>=2 pass, R3 no fail):', arr.filter(e => e._pass).length);
console.log('');
console.log('Top 20 by composite:');
const sorted = [...arr].sort((a, b) => b._s.composite - a._s.composite);
for (const e of sorted.slice(0, 20)) {
  const id = e.candidateName || e.file;
  const s = e._s;
  const status = e._pass ? 'PASS' : 'FAIL';
  console.log(`  ${status} ${id.padEnd(32)} comp=${s.composite.toFixed(2)}  R1=${s.r1a.toFixed(1)} R2=${s.r2a.toFixed(1)} R3min=${s.r3m.toFixed(1)}`);
}
console.log('');
console.log('Bottom 10 by composite:');
for (const e of sorted.slice(-10)) {
  const id = e.candidateName || e.file;
  const s = e._s;
  const status = e._pass ? 'PASS' : 'FAIL';
  console.log(`  ${status} ${id.padEnd(32)} comp=${s.composite.toFixed(2)}  R1=${s.r1a.toFixed(1)} R2=${s.r2a.toFixed(1)} R3min=${s.r3m.toFixed(1)}`);
}
