import { readFileSync } from 'node:fs';
const sel = JSON.parse(readFileSync('screened/auto-selected.json', 'utf-8')).selected;
const tileSel = sel.filter(s => s.category === 'tile');
console.log('Tile top picks:', tileSel.length);
for (const s of tileSel) {
  const candName = s.file.replace(/\\/g, '/').split('/').pop().replace('.png', '');
  console.log('  ', candName, '->', s.file);
}
