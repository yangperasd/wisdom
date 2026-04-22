import { readFileSync } from 'node:fs';
const r = JSON.parse(readFileSync('screened/round0-results.json', 'utf-8')).results;
const watch = ['breakable_target','pickup_relic','hud_top_bar','objective_card','controls_card'];
const counts = {};
for (const e of r) {
  const fname = e.file.replace(/\\/g, '/').split('/').pop();
  const m = fname.match(/^(.+)_v\d+\.png$/);
  if (!m) continue;
  const id = m[1];
  if (!watch.includes(id)) continue;
  counts[id] = counts[id] || { pass: 0, fail: 0, issues: {} };
  if (e.passed) counts[id].pass++;
  else {
    counts[id].fail++;
    for (const iss of (e.issues || [])) counts[id].issues[iss.check] = (counts[id].issues[iss.check] || 0) + 1;
  }
}
console.log('=== Targeted 5-prompt R0 after rework ===');
for (const id of watch) {
  const c = counts[id] || { pass: 0, fail: 0, issues: {} };
  console.log(id.padEnd(22), 'pass=' + c.pass, 'fail=' + c.fail, Object.keys(c.issues).length ? 'issues=' + JSON.stringify(c.issues) : '');
}
console.log('');
console.log('Overall R0:', r.filter(e => e.passed).length, '/', r.length);

const newPrompts = ['pickup_relic','common_enemy','boss_core','breakable_target','checkpoint','barrier_closed','barrier_open','hud_top_bar','objective_card','controls_card','touch_attack_button','touch_summon_button','touch_respawn_button','touch_echo_button','pause_button','system_pause_icon','system_confirm_icon','outdoor_ground_green','outdoor_ground_flowers','outdoor_path_cobble','outdoor_ground_ruins','outdoor_wall_standard','outdoor_wall_broken','outdoor_wall_cracked'];
const newCounts = {};
for (const e of r) {
  const fname = e.file.replace(/\\/g, '/').split('/').pop();
  const m = fname.match(/^(.+)_v\d+\.png$/);
  if (!m) continue;
  const id = m[1];
  if (!newPrompts.includes(id)) continue;
  newCounts[id] = newCounts[id] || { pass: 0, fail: 0 };
  if (e.passed) newCounts[id].pass++; else newCounts[id].fail++;
}
let newPass = 0, newFail = 0;
const zeros = [], weak = [];
for (const id of newPrompts) {
  const c = newCounts[id] || { pass: 0, fail: 0 };
  newPass += c.pass; newFail += c.fail;
  if (c.pass === 0) zeros.push(id + ' (0/8)');
  else if (c.pass < 4) weak.push(id + ' (' + c.pass + '/8)');
}
console.log('');
console.log('=== 24 new prompts R0 summary ===');
console.log('Total:', newPass, '/', (newPass + newFail), '(' + ((newPass / (newPass + newFail)) * 100).toFixed(1) + '%)');
console.log('Zero-pass prompts:', zeros.length ? zeros.join(', ') : 'none');
console.log('Weak (<50%) prompts:', weak.length ? weak.join(', ') : 'none');
