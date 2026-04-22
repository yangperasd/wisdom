import { readFileSync, readdirSync } from 'node:fs';
const sel = JSON.parse(readFileSync('screened/auto-selected.json', 'utf-8')).selected;
const existing = new Set(readdirSync('screened/agent-verdicts').map(f => f.replace('.json', '')));
const newOnes = sel.filter(s => {
  const candId = s.file.replace(/\\/g, '/').split('/').pop().replace('.png', '');
  return !existing.has(candId);
});
console.log('Total selected:', sel.length);
console.log('Already have verdicts on disk:', sel.length - newOnes.length);
console.log('New to dispatch:', newOnes.length);
console.log('New IDs:', newOnes.map(s => s.promptId).join(', '));
