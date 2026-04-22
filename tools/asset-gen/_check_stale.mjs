import { readFileSync, readdirSync } from 'node:fs';
const sel = JSON.parse(readFileSync('screened/auto-selected.json', 'utf-8')).selected;
const promptsToCheck = ['panel_dialog', 'panel_inventory', 'icon_echo_flower'];
for (const p of promptsToCheck) {
  const e = sel.find(s => s.promptId === p);
  console.log(p.padEnd(20), '->', e ? e.file : 'NOT IN auto-selected');
}
console.log('---');
const files = readdirSync('screened/agent-verdicts').map(f => f.replace('.json', ''));
const topNames = new Set(sel.map(s => s.file.replace(/\\/g, '/').split('/').pop().replace('.png', '')));
const stale = files.filter(f => !topNames.has(f));
console.log('Stale bundles (not in current auto-selected):', stale.length);
console.log(stale);
