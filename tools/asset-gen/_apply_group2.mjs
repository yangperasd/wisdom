/**
 * Apply Group 2: outdoor_ground_ruins in 5 scene files (6 nodes total).
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const WISDOM = 'E:/cv5/wisdom';
const BINDING_KEY = 'outdoor_ground_ruins';
const NEW_SELECTED_PATH = 'assets/art/generated/tile/outdoor_ground_ruins.png';
const OLD_TEX_UUID = 'a69b8b82-f3de-4f62-9e5c-44a2e1bfc6fe@6c48a';  // probe first before trust — will fall back to whatever's there if mismatch
const NEW_TEX_UUID = '2248350b-583b-478d-8a6b-f9e462419658@6c48a';

const ASSET_BINDING_TAG_TYPE = '3d2a6zMsZNMmK4uaNDa0rs2';
const SCENE_DRESSING_SKIN_TYPE = '5a770BhwHBNKL5hXAituhD+';

const SCENES = [
  'assets/scenes/DungeonRoomB.scene',
  'assets/scenes/DungeonRoomC.scene',
  'assets/scenes/FieldRuins.scene',
  'assets/scenes/MechanicsLab.scene'
];

let totalTagUpdates = 0;
let totalSkinUpdates = 0;
const timestamp = Date.now();

for (const relPath of SCENES) {
  const full = join(WISDOM, relPath);
  const data = JSON.parse(readFileSync(full, 'utf8'));

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

      const oldSelected = tag.selectedPath;
      if (oldSelected !== NEW_SELECTED_PATH) {
        if (!tag.fallbackPath) tag.fallbackPath = oldSelected;
        tag.selectedPath = NEW_SELECTED_PATH;
        tag.bindingStatus = 'phase_4_ai_rewired';
        sceneChanges.push(`node#${nid}: tag path ${oldSelected} -> ${NEW_SELECTED_PATH}`);
        totalTagUpdates++;
      }

      for (const si of skins) {
        const skin = data[si];
        const currUuid = skin.texture?.__uuid__;
        if (!currUuid) {
          sceneChanges.push(`node#${nid}: skin#${si} no texture UUID — SKIPPED`);
          continue;
        }
        if (currUuid === NEW_TEX_UUID) continue; // already right
        // Accept any current texture UUID for this binding (since old UUID may differ per scene)
        skin.texture.__uuid__ = NEW_TEX_UUID;
        sceneChanges.push(`node#${nid}: skin#${si} texture ${currUuid.slice(0,13)}... -> ${NEW_TEX_UUID.slice(0,13)}...`);
        totalSkinUpdates++;
      }
    }
  }

  if (sceneChanges.length === 0) {
    console.log(`[${relPath}] no changes`);
    continue;
  }

  copyFileSync(full, `${full}.bak.${timestamp}`);
  writeFileSync(full, JSON.stringify(data, null, 2));
  console.log(`[${relPath}] wrote ${sceneChanges.length} changes (backup: ${relPath}.bak.${timestamp}):`);
  for (const c of sceneChanges) console.log('  ' + c);
}

console.log('');
console.log('=== Summary ===');
console.log('  Tag path updates:  ' + totalTagUpdates);
console.log('  Skin UUID updates: ' + totalSkinUpdates);
console.log('  Timestamp tag:     ' + timestamp);
