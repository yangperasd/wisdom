/**
 * Apply Codex's REPLACE actions: swap placed top-1 with the chosen sibling.
 * Reads from generated/{cat}/{id}_vNN.png, writes to assets/art/{mapped}/{id}.png.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const WISDOM = 'E:/cv5/wisdom';
const ROOT = WISDOM + '/tools/asset-gen';

// Codex's REPLACE picks (candidate_id → new sibling version)
const replaces = [
  { id: 'icon_echo_box', category: 'icon', gen_cat: 'icon', new_v: '05' },
  { id: 'system_pause_icon', category: 'icon', gen_cat: 'icon', new_v: '01' },
  { id: 'key_boss', category: 'key', gen_cat: 'key', new_v: '02' },
  { id: 'echo_box_idle', category: 'summon', gen_cat: 'summon', new_v: '01' },
  { id: 'potion_mana', category: 'consumable', gen_cat: 'consumable', new_v: '07' },
  { id: 'bar_health_fill', category: 'bar', gen_cat: 'bar', new_v: '07' },
  { id: 'scroll_fire', category: 'consumable', gen_cat: 'consumable', new_v: '00' },
  { id: 'touch_attack_button', category: 'button', gen_cat: 'button', new_v: '04' }
];

// Same map as integrate-approved.mjs
const CATEGORY_TO_ARTDIR = {
  weapon: ['items','generated','weapon'], consumable: ['items','generated','consumable'],
  key: ['items','generated','key'], treasure: ['items','generated','treasure'],
  accessory: ['items','generated','accessory'], armor: ['items','generated','armor'],
  tool: ['items','generated','tool'],
  summon: ['characters','echoes','generated'],
  explosion: ['effects','explosion'], heal: ['effects','heal'], impact: ['effects','impact'],
  portal: ['effects','portal'], particle: ['effects','particle'], trail: ['effects','trail'],
  magic: ['effects','magic'],
  button: ['ui','skins','echoes','button'], panel: ['ui','skins','echoes','panel'],
  bar: ['ui','skins','echoes','bar'], icon: ['ui','icons','echoes']
};

console.log('=== Applying 8 REPLACE actions ===');
for (const r of replaces) {
  const src = join(ROOT, 'generated', r.gen_cat, `${r.id}_v${r.new_v}.png`);
  const dirSegs = CATEGORY_TO_ARTDIR[r.category];
  const dest = join(WISDOM, 'assets/art', ...dirSegs, `${r.id}.png`);
  if (!existsSync(src)) { console.log('  MISSING: ' + src); continue; }
  copyFileSync(src, dest);
  console.log('  REPLACED ' + r.id + ' -> v' + r.new_v + ' at ' + dest.replace(/\\/g,'/').replace(WISDOM + '/', ''));
}

// Move the old rejected/revise files back to rejected/manual (keep trace)
// Actually integrate-approved already moved them there, so nothing extra
console.log('\nDone.');
