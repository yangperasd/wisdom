/**
 * sync-scene-uuids.mjs
 *
 * After integrate-approved.mjs placed AI assets into `assets/art/` and updated
 * `asset_binding_manifest_v2.json`, this script rewires the actual scene and
 * prefab files so their visual components reference the new PNG UUIDs.
 *
 * How it works:
 *   1. Reads manifest → finds entries with `source: 'ai-generated'`.
 *   2. For each, reads the target PNG's `.meta` to extract SpriteFrame + Texture2D UUIDs.
 *   3. Scans all `.scene` and `.prefab` files under `assets/`.
 *   4. For each AssetBindingTag component with a matching bindingKey:
 *        - Finds sibling SceneDressingSkin on the same node (by __id__).
 *        - If SceneDressingSkin.spriteFrame is populated: replace its __uuid__.
 *        - Else if SceneDressingSkin.texture is populated: replace its __uuid__.
 *        - Updates AssetBindingTag.selectedPath to new AI path.
 *        - Demotes old selectedPath to fallbackPath if empty.
 *   5. Writes backups of modified files to same path + `.bak.<timestamp>`.
 *
 * Usage:
 *   node sync-scene-uuids.mjs                 # dry-run — print report only
 *   node sync-scene-uuids.mjs --apply         # actually write changes
 */
import { readFileSync, writeFileSync, copyFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const WISDOM = 'E:/cv5/wisdom';
const MANIFEST = join(WISDOM, 'assets/configs/asset_binding_manifest_v2.json');
const SCAN_ROOTS = [join(WISDOM, 'assets/scenes'), join(WISDOM, 'assets/prefabs'), join(WISDOM, 'assets/resources')];

// Type hashes in Cocos scene files (from scripts' __ccclass__ hash)
const ASSET_BINDING_TAG_TYPE = '3d2a6zMsZNMmK4uaNDa0rs2';  // AssetBindingTag
const SCENE_DRESSING_SKIN_TYPE = '5a770BhwHBNKL5hXAituhD+'; // SceneDressingSkin

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

// ── Step 1: Manifest → AI bindings ─────────────────────────────────────

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const aiBindings = new Map(); // bindingKey → { bucket, relPath, absPath }
for (const bucket of ['uiEntities', 'worldEntities']) {
  for (const [key, entry] of Object.entries(manifest[bucket] || {})) {
    if (entry.source !== 'ai-generated') continue;
    const rel = entry.selectedPath || entry.selectedBasePath;
    if (!rel) continue;
    const abs = join(WISDOM, rel);
    if (!existsSync(abs)) { console.warn('  WARN missing AI asset for ' + key + ': ' + abs); continue; }
    aiBindings.set(key, { bucket, relPath: rel, absPath: abs });
  }
}
console.log('AI bindings in manifest: ' + aiBindings.size);

// ── Step 2: Extract SpriteFrame + Texture2D UUIDs from each AI PNG's .meta ──

const uuidMap = new Map(); // bindingKey → { spriteFrame: uuid, texture: uuid, relPath }
for (const [key, { relPath, absPath }] of aiBindings) {
  const metaPath = absPath + '.meta';
  if (!existsSync(metaPath)) { console.warn('  WARN missing .meta for ' + key + ' at ' + metaPath); continue; }
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const subs = Object.values(meta.subMetas || {});
  const sf = subs.find(s => s?.importer === 'sprite-frame');
  const tex = subs.find(s => s?.importer === 'texture');
  uuidMap.set(key, {
    spriteFrame: sf?.uuid || null,
    texture: tex?.uuid || null,
    relPath
  });
}
console.log('UUIDs resolved: ' + uuidMap.size);

// ── Step 3: Walk scan roots, collect .scene / .prefab ──────────────────

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (full.endsWith('.scene') || full.endsWith('.prefab')) out.push(full);
  }
  return out;
}
const targetFiles = [];
for (const root of SCAN_ROOTS) walk(root, targetFiles);
console.log('Scene/prefab files to scan: ' + targetFiles.length);

// ── Step 4: For each file, find AssetBindingTag → SceneDressingSkin sibling ──

let totalMatches = 0;
let totalReplacements = 0;
let filesChanged = 0;
const report = [];

for (const file of targetFiles) {
  const original = readFileSync(file, 'utf8');
  let data;
  try {
    data = JSON.parse(original);
  } catch (e) {
    console.warn('  SKIP (parse error): ' + file);
    continue;
  }
  if (!Array.isArray(data)) {
    console.warn('  SKIP (not array): ' + file);
    continue;
  }

  // Build node-id → { tagIndices: [], skinIndices: [] } map
  const byNode = new Map();
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (typeof c !== 'object' || c === null) continue;
    const nid = c.node?.__id__;
    if (nid === undefined) continue;
    const ty = c.__type__;
    if (ty === ASSET_BINDING_TAG_TYPE || ty === SCENE_DRESSING_SKIN_TYPE) {
      if (!byNode.has(nid)) byNode.set(nid, { tagIndices: [], skinIndices: [] });
      const entry = byNode.get(nid);
      if (ty === ASSET_BINDING_TAG_TYPE) entry.tagIndices.push(i);
      else entry.skinIndices.push(i);
    }
  }

  const fileChanges = [];

  for (const [nid, { tagIndices, skinIndices }] of byNode) {
    for (const ti of tagIndices) {
      const tag = data[ti];
      const key = tag.bindingKey;
      if (!uuidMap.has(key)) continue; // not an AI binding
      const target = uuidMap.get(key);
      totalMatches++;

      // Update AssetBindingTag path fields
      const oldSelected = tag.selectedPath;
      const needPathUpdate = oldSelected !== target.relPath;
      if (needPathUpdate) {
        if (!tag.fallbackPath) tag.fallbackPath = oldSelected;
        tag.selectedPath = target.relPath;
        tag.bindingStatus = 'phase_4_ai_rewired';
      }

      if (skinIndices.length === 0) {
        fileChanges.push(`  NOTE binding ${key} on node#${nid}: no SceneDressingSkin sibling — updated path fields only`);
        continue;
      }

      // For each sibling SceneDressingSkin, swap UUID in whichever field is populated
      for (const si of skinIndices) {
        const skin = data[si];
        if (skin.spriteFrame && skin.spriteFrame.__uuid__) {
          if (!target.spriteFrame) {
            fileChanges.push(`  SKIP ${key} node#${nid}: skin uses spriteFrame but target PNG has no sprite-frame subMeta`);
            continue;
          }
          const oldUuid = skin.spriteFrame.__uuid__;
          if (oldUuid === target.spriteFrame) continue; // already pointing right
          skin.spriteFrame.__uuid__ = target.spriteFrame;
          totalReplacements++;
          fileChanges.push(`  UPDATE ${key} node#${nid}: spriteFrame ${oldUuid.slice(0,13)}... → ${target.spriteFrame.slice(0,13)}...`);
        } else if (skin.texture && skin.texture.__uuid__) {
          if (!target.texture) {
            fileChanges.push(`  SKIP ${key} node#${nid}: skin uses texture but target PNG has no texture subMeta`);
            continue;
          }
          const oldUuid = skin.texture.__uuid__;
          if (oldUuid === target.texture) continue;
          skin.texture.__uuid__ = target.texture;
          totalReplacements++;
          fileChanges.push(`  UPDATE ${key} node#${nid}: texture ${oldUuid.slice(0,13)}... → ${target.texture.slice(0,13)}...`);
        } else {
          // Empty skin — set spriteFrame or texture based on what's available
          if (target.spriteFrame) {
            skin.spriteFrame = { __uuid__: target.spriteFrame, __expectedType__: 'cc.SpriteFrame' };
            totalReplacements++;
            fileChanges.push(`  SET   ${key} node#${nid}: (empty) → spriteFrame ${target.spriteFrame.slice(0,13)}...`);
          } else if (target.texture) {
            skin.texture = { __uuid__: target.texture, __expectedType__: 'cc.Texture2D' };
            totalReplacements++;
            fileChanges.push(`  SET   ${key} node#${nid}: (empty) → texture ${target.texture.slice(0,13)}...`);
          }
        }
      }
    }
  }

  if (fileChanges.length > 0) {
    const relFile = relative(WISDOM, file).replace(/\\/g, '/');
    report.push({ file: relFile, changes: fileChanges });
    filesChanged++;
    if (APPLY) {
      const ts = Date.now();
      copyFileSync(file, file + '.bak.' + ts);
      const serialized = JSON.stringify(data, null, 2);
      writeFileSync(file, serialized);
    }
  }
}

// ── Step 5: Print report ────────────────────────────────────────────────

console.log('\n=== Match/Change Report ===');
for (const r of report) {
  console.log('\n[' + r.file + ']');
  for (const c of r.changes) console.log(c);
}

console.log('\n=== Summary ===');
console.log('  AI bindings in manifest:  ' + aiBindings.size);
console.log('  Total binding matches:    ' + totalMatches + '  (AssetBindingTag components with bindingKey in AI set)');
console.log('  Total UUID replacements:  ' + totalReplacements);
console.log('  Files changed:            ' + filesChanged);
console.log('  Mode:                     ' + (APPLY ? 'APPLY (wrote changes + .bak backups)' : 'DRY-RUN (nothing written)'));
if (!APPLY) {
  console.log('\n  Re-run with --apply to actually write changes.');
  console.log('  All modified files will get a .bak.<timestamp> sibling for rollback.');
}
