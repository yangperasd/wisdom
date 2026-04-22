/**
 * Apply Group 1 only: outdoor_ground_green in 4 scene files (6 nodes total).
 * Backs up each scene before writing.
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const WISDOM = 'E:/cv5/wisdom';

const BINDING_KEY = 'outdoor_ground_green';
const NEW_SELECTED_PATH = 'assets/art/generated/tile/outdoor_ground_green.png';
const OLD_TEX_UUID = '48bb2cd7-f437-42bb-9562-12d52c38b0b6@6c48a';
const NEW_TEX_UUID = '99384034-c3e1-4a69-8dda-8d72941ae52c@6c48a';

const ASSET_BINDING_TAG_TYPE = '3d2a6zMsZNMmK4uaNDa0rs2';
const SCENE_DRESSING_SKIN_TYPE = '5a770BhwHBNKL5hXAituhD+';

const SCENES = [
  'assets/scenes/DungeonRoomA.scene',
  'assets/scenes/DungeonRoomB.scene',
  'assets/scenes/FieldWest.scene',
  'assets/scenes/StartCamp.scene'
];

let totalTagUpdates = 0;
let totalSkinUpdates = 0;
const timestamp = Date.now();

for (const relPath of SCENES) {
  const full = join(WISDOM, relPath);
  const original = readFileSync(full, 'utf8');
  const data = JSON.parse(original);

  // Group components by node id
  const byNode = new Map();
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (!c || typeof c !== 'object') continue;
    const nid = c.node?.__id__;
    if (nid === undefined) continue;
    const ty = c.__type__;
    if (ty !== ASSET_BINDING_TAG_TYPE && ty !== SCENE_DRESSING_SKIN_TYPE) continue;
    if (!byNode.has(nid)) byNode.set(nid, { tags: [], skins: [] });
    const slot = byNode.get(nid);
    if (ty === ASSET_BINDING_TAG_TYPE) slot.tags.push(i);
    else slot.skins.push(i);
  }

  let sceneChanges = [];
  for (const [nid, { tags, skins }] of byNode) {
    for (const ti of tags) {
      const tag = data[ti];
      if (tag.bindingKey !== BINDING_KEY) continue;

      // Update tag path fields
      const oldSelected = tag.selectedPath;
      if (oldSelected !== NEW_SELECTED_PATH) {
        if (!tag.fallbackPath) tag.fallbackPath = oldSelected;
        tag.selectedPath = NEW_SELECTED_PATH;
        tag.bindingStatus = 'phase_4_ai_rewired';
        sceneChanges.push(`node#${nid}: tag path ${oldSelected} -> ${NEW_SELECTED_PATH}`);
        totalTagUpdates++;
      }

      // Update sibling skins
      for (const si of skins) {
        const skin = data[si];
        if (skin.texture?.__uuid__ === OLD_TEX_UUID) {
          skin.texture.__uuid__ = NEW_TEX_UUID;
          sceneChanges.push(`node#${nid}: skin#${si} texture ${OLD_TEX_UUID.slice(0,13)}... -> ${NEW_TEX_UUID.slice(0,13)}...`);
          totalSkinUpdates++;
        } else if (skin.texture?.__uuid__) {
          sceneChanges.push(`node#${nid}: skin#${si} texture UUID mismatch (found ${skin.texture.__uuid__.slice(0,13)}... expected ${OLD_TEX_UUID.slice(0,13)}...) — SKIPPED for safety`);
        } else if (skin.spriteFrame?.__uuid__) {
          sceneChanges.push(`node#${nid}: skin#${si} uses spriteFrame not texture — SKIPPED (unexpected for a tile)`);
        }
      }
    }
  }

  if (sceneChanges.length === 0) {
    console.log(`[${relPath}] no changes`);
    continue;
  }

  // Backup + write
  copyFileSync(full, `${full}.bak.${timestamp}`);
  writeFileSync(full, JSON.stringify(data, null, 2));
  console.log(`[${relPath}] wrote ${sceneChanges.length} changes (backup: ${relPath}.bak.${timestamp}):`);
  for (const c of sceneChanges) console.log('  ' + c);
}

console.log('');
console.log('=== Summary ===');
console.log('  Tag path updates:  ' + totalTagUpdates);
console.log('  Skin UUID updates: ' + totalSkinUpdates);
console.log('  Timestamp tag:     ' + timestamp + ' (use for backup rollback if needed)');
