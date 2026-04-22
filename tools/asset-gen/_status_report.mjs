import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const WISDOM = 'E:/cv5/wisdom';
const MANIFEST = JSON.parse(readFileSync(join(WISDOM, 'assets/configs/asset_binding_manifest_v2.json'), 'utf-8'));

// === 1) 77 AI assets placed — list them ===
const placed = [];
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full);
    else if (e.endsWith('.png')) placed.push(full.replace(WISDOM + '/', '').replace(/\\/g, '/'));
  }
}
for (const sub of ['assets/art/items/generated','assets/art/characters/echoes/generated',
                    'assets/art/generated','assets/art/effects','assets/art/ui/skins/echoes',
                    'assets/art/ui/icons/echoes']) walk(join(WISDOM, sub));

// Extract bindingKey from path
const aiKeys = new Set();
for (const p of placed) {
  const id = p.split('/').pop().replace('.png','');
  aiKeys.add(id);
}
console.log('1) AI assets placed on disk: ' + placed.length);

// === 2) Manifest entries marked ai-generated ===
const manifestAI = [];
for (const b of ['uiEntities','worldEntities']) {
  for (const [k, e] of Object.entries(MANIFEST[b] || {})) {
    if (e.source === 'ai-generated') manifestAI.push(k);
  }
}
console.log('2) Manifest AI bindings: ' + manifestAI.length);

// === 3) Count AssetBindingTag occurrences per key across all scenes ===
const ASSET_BINDING_TAG_TYPE = '3d2a6zMsZNMmK4uaNDa0rs2';
const SCENE_DRESSING_SKIN_TYPE = '5a770BhwHBNKL5hXAituhD+';

const sceneRoot = join(WISDOM, 'assets/scenes');
const prefabRoot = join(WISDOM, 'assets/prefabs');
const targetFiles = [];
function walkScenes(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walkScenes(full);
    else if (e.endsWith('.scene') || e.endsWith('.prefab')) targetFiles.push(full);
  }
}
walkScenes(sceneRoot);
walkScenes(prefabRoot);

const countsByKey = new Map();
const rewiredByKey = new Map();
const pathOnlyByKey = new Map();  // tag matched but no SceneDressingSkin sibling
const skinMismatchByKey = new Map();
const aiPaths = new Set();
for (const b of ['uiEntities','worldEntities']) {
  for (const [k, e] of Object.entries(MANIFEST[b] || {})) {
    if (e.source === 'ai-generated') {
      aiPaths.add(k + '::' + (e.selectedPath || e.selectedBasePath || ''));
    }
  }
}
// Helper: given manifest key, does tag/skin already point at new path/uuid?
const aiPathByKey = new Map();
for (const b of ['uiEntities','worldEntities']) {
  for (const [k, e] of Object.entries(MANIFEST[b] || {})) {
    if (e.source === 'ai-generated') aiPathByKey.set(k, e.selectedPath || e.selectedBasePath);
  }
}

for (const f of targetFiles) {
  let data;
  try { data = JSON.parse(readFileSync(f, 'utf-8')); } catch { continue; }
  if (!Array.isArray(data)) continue;

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

  for (const [, { tags, skins }] of byNode) {
    for (const ti of tags) {
      const tag = data[ti];
      const k = tag.bindingKey;
      if (!k) continue;
      countsByKey.set(k, (countsByKey.get(k) || 0) + 1);
      if (!aiPathByKey.has(k)) continue;  // not an AI-integrated binding

      const aiPath = aiPathByKey.get(k);
      const tagRewired = tag.selectedPath === aiPath;
      if (tagRewired) rewiredByKey.set(k, (rewiredByKey.get(k) || 0) + 1);

      if (skins.length === 0) {
        pathOnlyByKey.set(k, (pathOnlyByKey.get(k) || 0) + 1);
      }
    }
  }
}

console.log('');
console.log('3) AssetBindingTag occurrences across all .scene/.prefab files:');
const sortedKeys = [...countsByKey.keys()].sort();
console.log('   Key                       | Occurrences | AI-integrated? | Tag rewired | Path-only (no skin sibling)');
for (const k of sortedKeys) {
  const c = countsByKey.get(k);
  const ai = aiPathByKey.has(k) ? 'YES' : 'no';
  const rew = rewiredByKey.get(k) || 0;
  const po = pathOnlyByKey.get(k) || 0;
  console.log(`   ${k.padEnd(25)} | ${String(c).padStart(11)} | ${ai.padEnd(14)} | ${String(rew).padStart(11)} | ${String(po).padStart(27)}`);
}

console.log('');
console.log('=== Totals ===');
const totalOccurrences = [...countsByKey.values()].reduce((a,b)=>a+b,0);
const totalAIOccurrences = [...aiPathByKey.keys()].reduce((s,k) => s + (countsByKey.get(k)||0), 0);
const totalRewired = [...rewiredByKey.values()].reduce((a,b)=>a+b,0);
const totalPathOnly = [...pathOnlyByKey.values()].reduce((a,b)=>a+b,0);
console.log('Total AssetBindingTag occurrences: ' + totalOccurrences);
console.log('  of which AI-integrated: ' + totalAIOccurrences);
console.log('  of which tag path rewired: ' + totalRewired);
console.log('  of which path-only (need specialized component rewiring): ' + totalPathOnly);

// === 4) AI assets with no scene binding at all ===
console.log('');
console.log('4) AI assets placed BUT never referenced in any scene AssetBindingTag:');
const unreferenced = [];
for (const [k, _] of aiPathByKey) {
  if (!countsByKey.has(k)) unreferenced.push(k);
}
// Also: AI files placed but not in manifest at all (= loose assets, may be used by prefabs/scripts)
const manifestKeys = new Set([...Object.keys(MANIFEST.uiEntities || {}), ...Object.keys(MANIFEST.worldEntities || {})]);
const loose = [...aiKeys].filter(id => !manifestKeys.has(id) && !id.startsWith('echo_'));
console.log('   manifest bindings without scene presence: ' + unreferenced.length);
for (const k of unreferenced) console.log('     - ' + k);
console.log('   loose AI assets (no manifest binding at all): ' + loose.length);
for (const f of loose.slice(0,40)) console.log('     - ' + f);
if (loose.length > 40) console.log('     ... +' + (loose.length - 40) + ' more');
