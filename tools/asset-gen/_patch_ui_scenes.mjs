/**
 * Patch scenes: wire UI AI assets.
 *   - For each HudTopBar / HudObjectiveCard / HudControlsCard node: add a new
 *     HudPanelSkin component with visualTexture pointing at the AI PNG texture UUID.
 *   - For each TouchAttack / TouchPlaceEcho / TouchRespawn / TouchEchoBox /
 *     TouchEchoFlower / TouchEchoBomb / TouchPause node: set buttonTexture on
 *     the existing TouchCommandButton component.
 *
 * Backups to tools/asset-gen/backups/scenes/.
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const WISDOM = 'E:/cv5/wisdom';
const BACKUP_DIR = join(WISDOM, 'tools/asset-gen/backups/scenes');
mkdirSync(BACKUP_DIR, { recursive: true });

const HUDPANELSKIN_HASH = 'a1c00d3EjRKvI3v/ty6mHAA';
const TOUCH_COMMAND_BUTTON_HASH = '06577HddtdNiK0QaBZo0Fsa';

// Node name → AI PNG texture UUID (with @6c48a already included)
const HUD_PANEL_BINDINGS = {
  'HudTopBar':        '01fdfe07-4734-4ca1-a903-7af0f9748809@6c48a',
  'HudObjectiveCard': '5359ba1b-a194-4353-aa85-823f47f1987e@6c48a',
  'HudControlsCard':  '0243b55e-d1f0-4062-804c-2822fa2ba755@6c48a'
};

const TOUCH_BUTTON_BINDINGS = {
  'TouchAttack':      '4db6e8e8-ea1b-47f5-8bab-dd5d0be7676f@6c48a', // touch_attack_button
  'TouchPlaceEcho':   'a8a57ba2-27c6-4012-9f50-3cede9263f62@6c48a', // touch_summon_button
  'TouchRespawn':     'd26065c6-5652-4b0e-9e30-36410face126@6c48a', // touch_respawn_button
  'TouchEchoBox':     '394a9d96-da78-465c-9ead-08b85a0ed0b2@6c48a', // touch_echo_button (shared)
  'TouchEchoFlower':  '394a9d96-da78-465c-9ead-08b85a0ed0b2@6c48a',
  'TouchEchoBomb':    '394a9d96-da78-465c-9ead-08b85a0ed0b2@6c48a',
  'TouchPause':       '84638674-eae4-4928-adc7-e343c5f6d91d@6c48a'  // pause_button
};

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (full.endsWith('.scene') || full.endsWith('.prefab')) out.push(full);
  }
  return out;
}
const files = walk(join(WISDOM, 'assets/scenes'));

const timestamp = Date.now();
let totalHudPanelAdds = 0, totalTouchUpdates = 0, filesTouched = 0;

for (const file of files) {
  const relFile = relative(WISDOM, file).replace(/\\/g, '/');
  const data = JSON.parse(readFileSync(file, 'utf-8'));

  // 1) Find nodes by name
  const nodeByName = new Map();
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (c?.__type__ === 'cc.Node' && c._name) {
      if (!nodeByName.has(c._name)) nodeByName.set(c._name, []);
      nodeByName.get(c._name).push(i);
    }
  }

  const changes = [];

  // 2) For each HUD panel name → add HudPanelSkin component
  for (const [name, textureUuid] of Object.entries(HUD_PANEL_BINDINGS)) {
    const nids = nodeByName.get(name) || [];
    for (const nid of nids) {
      const node = data[nid];
      // Skip if HudPanelSkin already attached
      const existingComps = (node._components || []).map(r => data[r.__id__]).filter(Boolean);
      if (existingComps.some(c => c.__type__ === HUDPANELSKIN_HASH)) {
        changes.push(`  ${name} #${nid}: HudPanelSkin already attached — skip`);
        continue;
      }

      // Append new HudPanelSkin component at the end of the data array
      const newCompIndex = data.length;
      const newComp = {
        __type__: HUDPANELSKIN_HASH,
        _name: '',
        _objFlags: 0,
        node: { __id__: nid },
        _enabled: true,
        __prefab: null,
        visualSpriteFrame: null,
        visualTexture: { __uuid__: textureUuid, __expectedType__: 'cc.Texture2D' },
        hideLabelWhenSkinned: true,
        _id: ''
      };
      data.push(newComp);

      // Wire into node._components
      node._components ||= [];
      node._components.push({ __id__: newCompIndex });

      totalHudPanelAdds++;
      changes.push(`  ${name} #${nid}: + HudPanelSkin → ${textureUuid.slice(0,13)}...`);
    }
  }

  // 3) For each touch button name → set buttonTexture on TouchCommandButton
  for (const [name, textureUuid] of Object.entries(TOUCH_BUTTON_BINDINGS)) {
    const nids = nodeByName.get(name) || [];
    for (const nid of nids) {
      const node = data[nid];
      const compRefs = node._components || [];
      const tbcIndex = compRefs
        .map(r => r.__id__)
        .find(ci => data[ci]?.__type__ === TOUCH_COMMAND_BUTTON_HASH);
      if (tbcIndex === undefined) {
        changes.push(`  ${name} #${nid}: no TouchCommandButton — skip`);
        continue;
      }
      const tbc = data[tbcIndex];
      // Only patch if buttonTexture not already set
      if (tbc.buttonTexture?.__uuid__ === textureUuid) {
        changes.push(`  ${name} #${nid}: buttonTexture already pointing at AI — skip`);
        continue;
      }
      tbc.buttonTexture = { __uuid__: textureUuid, __expectedType__: 'cc.Texture2D' };
      totalTouchUpdates++;
      changes.push(`  ${name} #${nid}: TouchCommandButton.buttonTexture = ${textureUuid.slice(0,13)}...`);
    }
  }

  if (changes.length === 0) {
    continue;
  }

  const bakName = relFile.replace(/\//g, '__') + '.bak.' + timestamp;
  copyFileSync(file, join(BACKUP_DIR, bakName));
  writeFileSync(file, JSON.stringify(data, null, 2));
  filesTouched++;
  console.log(`[${relFile}]  (backup: ${bakName})`);
  for (const c of changes) console.log(c);
}

console.log('');
console.log('=== Summary ===');
console.log('  HudPanelSkin components added: ' + totalHudPanelAdds);
console.log('  TouchCommandButton.buttonTexture set: ' + totalTouchUpdates);
console.log('  Files touched: ' + filesTouched);
console.log('  Backup timestamp: ' + timestamp);
