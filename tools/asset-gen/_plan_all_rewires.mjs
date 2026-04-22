/**
 * Scan EVERYTHING and emit a complete rewire plan for remaining AI bindings.
 * V2: Knows about specialized component field names.
 *
 * Output: audit/rewire_plan.md + rewire_plan.json
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const WISDOM = 'E:/cv5/wisdom';
const MANIFEST = JSON.parse(readFileSync(join(WISDOM, 'assets/configs/asset_binding_manifest_v2.json'), 'utf-8'));
const AUDIT_DIR = join(WISDOM, 'tools/asset-gen/audit');
mkdirSync(AUDIT_DIR, { recursive: true });

const ASSET_BINDING_TAG_TYPE = '3d2a6zMsZNMmK4uaNDa0rs2';

// Every SpriteFrame/Texture2D @property field name across specialized components
const SPRITE_FIELDS = [
  // SceneDressingSkin
  'spriteFrame', 'texture',
  // CheckpointMarker / ScenePortal
  'visualSpriteFrame',
  // BreakableTarget
  'intactSpriteFrame', 'brokenSpriteFrame',
  // BossVisualController / EnemyVisualController / PlayerVisualController
  'dangerSpriteFrame', 'dangerTexture',
  'vulnerableSpriteFrame', 'vulnerableTexture',
  'hurtSpriteFrame', 'hurtTexture',
  'defeatedSpriteFrame', 'defeatedTexture',
  'idleSpriteFrame', 'idleTexture',
  'moveSpriteFrame', 'moveTexture',
  'attackSpriteFrame', 'attackTexture',
  'paperdollSpriteFrame', 'paperdollTexture',
  // FlagGateController
  'closedSpriteFrame', 'openSpriteFrame',
  // Generic Cocos (Sprite / Button)
  'normalSprite', 'pressedSprite', 'hoverSprite', 'disabledSprite', 'spriteAtlas',
  'iconSprite', 'iconFrame', 'bgSprite', 'backgroundSprite'
];

// Key mapping: which binding keys correspond to which field priorities
// (single-state bindings preferred where obvious)
const BINDING_TO_FIELDS = {
  checkpoint: ['visualSpriteFrame', 'spriteFrame', 'texture'],
  portal: ['visualSpriteFrame', 'spriteFrame', 'texture'],
  pickup_relic: ['visualSpriteFrame', 'spriteFrame', 'texture'],
  boss_core: ['dangerSpriteFrame', 'dangerTexture', 'spriteFrame', 'texture'],
  breakable_target: ['intactSpriteFrame', 'spriteFrame', 'texture'],
  barrier_open: ['openSpriteFrame', 'spriteFrame'],
  barrier_closed: ['closedSpriteFrame', 'spriteFrame'],
  common_enemy: ['idleSpriteFrame', 'idleTexture', 'dangerSpriteFrame', 'spriteFrame', 'texture']
};

// 1) AI bindings → uuid table
const aiBindings = new Map();
for (const bucket of ['uiEntities', 'worldEntities']) {
  for (const [k, e] of Object.entries(MANIFEST[bucket] || {})) {
    if (e.source !== 'ai-generated') continue;
    const rel = e.selectedPath || e.selectedBasePath;
    const abs = join(WISDOM, rel);
    if (!existsSync(abs + '.meta')) continue;
    const meta = JSON.parse(readFileSync(abs + '.meta', 'utf-8'));
    const subs = Object.values(meta.subMetas || {});
    const sf = subs.find(s => s?.importer === 'sprite-frame');
    const tex = subs.find(s => s?.importer === 'texture');
    aiBindings.set(k, {
      relPath: rel,
      spriteFrameFull: sf?.uuid || null,  // already includes @suffix from .meta
      textureFull: tex?.uuid || null,
      bucket
    });
  }
}

// 2) Collect all .scene and .prefab files
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
const files = [];
walk(join(WISDOM, 'assets/scenes'), files);
walk(join(WISDOM, 'assets/prefabs'), files);
walk(join(WISDOM, 'assets/resources'), files);

// 3) For each file, build node map + find candidate swaps
const plan = []; // { bindingKey, file, nodeId, nodeName, componentIndex, componentType, field, fieldType, currentUuid, newUuid, source, alreadyCorrect }

for (const file of files) {
  let data;
  try { data = JSON.parse(readFileSync(file, 'utf-8')); } catch { continue; }
  if (!Array.isArray(data)) continue;

  // node map
  const nodes = new Map();
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (c?.__type__ === 'cc.Node') {
      nodes.set(i, { name: c._name || '(unnamed)', compIndices: [] });
    }
  }
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (!c || typeof c !== 'object' || !c.node) continue;
    const nid = c.node.__id__;
    if (nodes.has(nid)) nodes.get(nid).compIndices.push(i);
  }

  // AssetBindingTag index
  const nodeByKey = new Map();
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (c?.__type__ === ASSET_BINDING_TAG_TYPE && c.bindingKey) {
      const nid = c.node.__id__;
      if (!nodeByKey.has(c.bindingKey)) nodeByKey.set(c.bindingKey, []);
      nodeByKey.get(c.bindingKey).push({ nodeId: nid, tagIndex: i });
    }
  }

  for (const [key, ai] of aiBindings) {
    // Path 1: Match via AssetBindingTag
    const tagged = nodeByKey.get(key) || [];
    for (const { nodeId, tagIndex } of tagged) {
      const node = nodes.get(nodeId);
      if (!node) continue;

      // Scan all components on this node for sprite fields
      let matched = false;
      const preferredFields = BINDING_TO_FIELDS[key] || SPRITE_FIELDS;
      for (const ci of node.compIndices) {
        if (ci === tagIndex) continue;
        const comp = data[ci];
        for (const f of preferredFields) {
          if (!(f in comp)) continue;
          const val = comp[f];
          if (!val || typeof val !== 'object' || !val.__uuid__) continue;
          const expected = val.__expectedType__ || '';
          const isTex = expected === 'cc.Texture2D';
          const isSF = expected === 'cc.SpriteFrame' || !expected;
          let newUuid = null;
          if (isTex && ai.textureFull) newUuid = ai.textureFull;
          else if (isSF && ai.spriteFrameFull) newUuid = ai.spriteFrameFull;
          else if (ai.textureFull) newUuid = ai.textureFull;
          plan.push({
            bindingKey: key,
            file: relative(WISDOM, file).replace(/\\/g, '/'),
            nodeId, nodeName: node.name,
            componentIndex: ci,
            componentType: comp.__type__,
            field: f,
            fieldType: expected,
            currentUuid: val.__uuid__,
            newUuid,
            source: 'AssetBindingTag-sibling',
            alreadyCorrect: newUuid && val.__uuid__ === newUuid
          });
          matched = true;
          break; // one field per component is enough
        }
      }

      // Always include the tag path update entry
      const tag = data[tagIndex];
      plan.push({
        bindingKey: key,
        file: relative(WISDOM, file).replace(/\\/g, '/'),
        nodeId, nodeName: node.name,
        componentIndex: tagIndex,
        componentType: 'AssetBindingTag',
        field: 'selectedPath',
        fieldType: 'string',
        currentUuid: tag.selectedPath,
        newUuid: ai.relPath,
        source: matched ? 'tag-path' : 'tag-path-only',
        alreadyCorrect: tag.selectedPath === ai.relPath
      });
    }

    // Path 2: No tag — search by node name containing bindingKey
    if (tagged.length === 0) {
      for (const [nid, node] of nodes) {
        const lname = node.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const lkey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!lname.includes(lkey)) continue;
        for (const ci of node.compIndices) {
          const comp = data[ci];
          for (const f of SPRITE_FIELDS) {
            if (!(f in comp)) continue;
            const val = comp[f];
            if (!val || typeof val !== 'object' || !val.__uuid__) continue;
            const expected = val.__expectedType__ || '';
            const isTex = expected === 'cc.Texture2D';
            const newUuid = isTex
              ? ai.textureFull
              : (ai.spriteFrameFull || ai.textureFull);
            plan.push({
              bindingKey: key,
              file: relative(WISDOM, file).replace(/\\/g, '/'),
              nodeId: nid, nodeName: node.name,
              componentIndex: ci,
              componentType: comp.__type__,
              field: f,
              fieldType: expected,
              currentUuid: val.__uuid__,
              newUuid,
              source: 'node-name-match',
              alreadyCorrect: val.__uuid__ === newUuid
            });
          }
        }
      }
    }
  }
}

// Group + stats
const byKey = new Map();
for (const p of plan) {
  if (!byKey.has(p.bindingKey)) byKey.set(p.bindingKey, []);
  byKey.get(p.bindingKey).push(p);
}

let uuidRealSwaps = 0;
let uuidAlready = 0;
let pathUpdates = 0;
let pathAlready = 0;
for (const p of plan) {
  if (p.field === 'selectedPath') {
    if (p.alreadyCorrect) pathAlready++; else pathUpdates++;
  } else {
    if (p.alreadyCorrect) uuidAlready++; else uuidRealSwaps++;
  }
}

// Write markdown
const md = [];
md.push('# Complete Rewire Plan (V2)');
md.push('Timestamp: ' + new Date().toISOString());
md.push('');
md.push('## Summary');
md.push('- AI bindings in manifest: ' + aiBindings.size);
md.push('- Binding keys with candidate locations: ' + byKey.size);
md.push('- Total plan entries: ' + plan.length);
md.push('  - Real UUID swaps (to apply): **' + uuidRealSwaps + '**');
md.push('  - UUID already correct (no-op): ' + uuidAlready);
md.push('  - tag.selectedPath updates (to apply): ' + pathUpdates);
md.push('  - tag.selectedPath already correct (no-op): ' + pathAlready);
md.push('');

const keyOrder = [...byKey.keys()].sort();
for (const k of keyOrder) {
  const entries = byKey.get(k);
  const ai = aiBindings.get(k);
  const actionable = entries.filter(e => !e.alreadyCorrect);
  md.push('');
  md.push(`### ${k}  →  ${ai.relPath}`);
  md.push(`- SpriteFrame: ${ai.spriteFrameFull || '(none in .meta)'}  |  Texture: ${ai.textureFull || '(none)'}`);
  md.push(`- Actionable: ${actionable.length} / ${entries.length}`);
  md.push('');
  if (actionable.length === 0) {
    md.push('  (all entries already point to AI asset — nothing to do)');
    continue;
  }
  md.push('| # | File | Node #id (name) | Component | Field | Current → New |');
  md.push('|---|---|---|---|---|---|');
  let n = 0;
  for (const p of actionable) {
    n++;
    const cur = p.currentUuid ? (p.field === 'selectedPath' ? p.currentUuid : p.currentUuid.slice(0,13) + '...') : '(null)';
    const nw = p.newUuid ? (p.field === 'selectedPath' ? p.newUuid : (typeof p.newUuid === 'string' && p.newUuid.length > 20 ? p.newUuid.slice(0,13) + '...' : p.newUuid)) : '(no UUID available)';
    md.push(`| ${n} | ${p.file} | #${p.nodeId} (${p.nodeName}) | ${p.componentType} | ${p.field} | \`${cur}\` → \`${nw}\` |`);
  }
}

const unref = [...aiBindings.keys()].filter(k => !byKey.has(k));
md.push('');
md.push('### AI bindings with NO location found in any scene/prefab');
if (unref.length === 0) md.push('(none)');
for (const k of unref) md.push('- `' + k + '` — ' + aiBindings.get(k).relPath);

writeFileSync(join(AUDIT_DIR, 'rewire_plan.md'), md.join('\n'));
writeFileSync(join(AUDIT_DIR, 'rewire_plan.json'), JSON.stringify({ timestamp: new Date().toISOString(), plan, aiBindings: Object.fromEntries(aiBindings) }, null, 2));

console.log('Wrote audit/rewire_plan.md and audit/rewire_plan.json');
console.log('Real UUID swaps to apply: ' + uuidRealSwaps);
console.log('UUID already correct: ' + uuidAlready);
console.log('selectedPath updates: ' + pathUpdates);
console.log('selectedPath already correct: ' + pathAlready);
console.log('Keys with no candidate location: ' + unref.length);
