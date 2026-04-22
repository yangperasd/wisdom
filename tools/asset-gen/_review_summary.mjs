import { readFileSync } from 'node:fs';
const lines = readFileSync('../../review-decisions.jsonl', 'utf-8').split('\n').filter(l => l.trim());
const decisions = lines.map(l => JSON.parse(l));

const buckets = { approve: [], reject: [], revise: [] };
for (const d of decisions) {
  if (buckets[d.decision]) buckets[d.decision].push(d);
}

console.log('=== Review tally ===');
console.log('Total reviewed: ' + decisions.length);
console.log('Approve: ' + buckets.approve.length);
console.log('Reject:  ' + buckets.reject.length);
console.log('Revise:  ' + buckets.revise.length);

console.log('\n=== Approved by category ===');
const catApprove = {};
for (const d of buckets.approve) catApprove[d.category] = (catApprove[d.category] || 0) + 1;
for (const [c, n] of Object.entries(catApprove).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + c.padEnd(12) + ' ' + n);
}

console.log('\n=== Rejected ===');
for (const d of buckets.reject) {
  console.log('  ' + d.id.padEnd(32) + ' ' + (d.note || '(no note)'));
}

console.log('\n=== Revise ===');
for (const d of buckets.revise) {
  console.log('  ' + d.id.padEnd(32) + ' ' + (d.note || '(no note)'));
}

// Coverage by prompt (compare to 82 total prompts in auto-selected.json)
const autoSel = JSON.parse(readFileSync('screened/auto-selected.json', 'utf-8')).selected;
const reviewedIds = new Set(decisions.map(d => d.id));
const autoSelIds = new Set(autoSel.map(s => s.file.replace(/\\/g, '/').split('/').pop().replace('.png', '')));
const notReviewed = [...autoSelIds].filter(id => !reviewedIds.has(id));
console.log('\n=== Coverage ===');
console.log('Auto-selected top picks: ' + autoSel.length);
console.log('Reviewed: ' + reviewedIds.size);
console.log('Not reviewed (still in auto-selected but no decision): ' + notReviewed.length);
if (notReviewed.length) console.log('  ' + notReviewed.join(', '));

// Score analysis of approved vs rejected
console.log('\n=== Score distribution of approved ===');
const scores = buckets.approve.map(d => d.score);
scores.sort((a, b) => a - b);
console.log('  min=' + scores[0] + ' max=' + scores[scores.length-1] + ' median=' + scores[Math.floor(scores.length/2)]);
console.log('  <5.0: ' + scores.filter(s => s < 5).length);
console.log('  5.0-5.49: ' + scores.filter(s => s >= 5 && s < 5.5).length);
console.log('  5.5-5.99: ' + scores.filter(s => s >= 5.5 && s < 6).length);
console.log('  6.0+: ' + scores.filter(s => s >= 6).length);
