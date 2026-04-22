/**
 * Apply the rewire plan produced by _plan_all_rewires.mjs.
 * Backs up every modified scene/prefab with .bak.<timestamp> (placed OUT of assets/ so Cocos doesn't scan).
 *
 * Safety:
 *   - Only touches entries flagged !alreadyCorrect.
 *   - For each touched component, sets component[field].__uuid__ = newUuid (SpriteFrame / Texture2D).
 *   - For AssetBindingTag.selectedPath, demotes old selectedPath to fallbackPath if empty.
 *   - Writes one .bak per file (per run), not per change.
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const WISDOM = 'E:/cv5/wisdom';
const PLAN_JSON = join(WISDOM, 'tools/asset-gen/audit/rewire_plan.json');
const BACKUP_DIR = join(WISDOM, 'tools/asset-gen/backups/scenes');
mkdirSync(BACKUP_DIR, { recursive: true });

const { plan } = JSON.parse(readFileSync(PLAN_JSON, 'utf-8'));
const actionable = plan.filter(p => !p.alreadyCorrect);
console.log('Total actionable entries: ' + actionable.length);

// Group by file
const byFile = new Map();
for (const p of actionable) {
  if (!byFile.has(p.file)) byFile.set(p.file, []);
  byFile.get(p.file).push(p);
}
console.log('Files to modify: ' + byFile.size);
console.log('');

const timestamp = Date.now();
let totalChanges = 0;
let skips = 0;

for (const [relFile, entries] of byFile) {
  const full = join(WISDOM, relFile);
  const data = JSON.parse(readFileSync(full, 'utf-8'));

  let fileChanges = 0;
  for (const p of entries) {
    const comp = data[p.componentIndex];
    if (!comp) { console.log(`  SKIP [${relFile}] ${p.bindingKey}: componentIndex ${p.componentIndex} missing`); skips++; continue; }

    if (p.field === 'selectedPath') {
      // AssetBindingTag path update
      const currPath = comp.selectedPath;
      if (currPath !== p.currentUuid) {
        console.log(`  SKIP [${relFile}] ${p.bindingKey} tag: currentPath mismatch (expected "${p.currentUuid}", found "${currPath}")`);
        skips++;
        continue;
      }
      if (!comp.fallbackPath) comp.fallbackPath = currPath;
      comp.selectedPath = p.newUuid;
      comp.bindingStatus = 'phase_4_ai_rewired';
      fileChanges++;
    } else {
      // Sprite field UUID swap
      const val = comp[p.field];
      if (!val || typeof val !== 'object' || !val.__uuid__) {
        console.log(`  SKIP [${relFile}] ${p.bindingKey} ${p.field}: field missing or no __uuid__ (was ${p.currentUuid})`);
        skips++;
        continue;
      }
      if (val.__uuid__ !== p.currentUuid) {
        console.log(`  SKIP [${relFile}] ${p.bindingKey} ${p.field}: uuid mismatch (expected ${p.currentUuid.slice(0,13)}..., found ${val.__uuid__.slice(0,13)}...)`);
        skips++;
        continue;
      }
      if (!p.newUuid) {
        console.log(`  SKIP [${relFile}] ${p.bindingKey} ${p.field}: no newUuid available`);
        skips++;
        continue;
      }
      val.__uuid__ = p.newUuid;
      fileChanges++;
    }
  }

  if (fileChanges === 0) {
    console.log(`[${relFile}] no effective changes`);
    continue;
  }

  // Backup outside assets/ so Cocos doesn't import the .bak
  const bakPath = join(BACKUP_DIR, relFile.replace(/\//g, '__') + '.bak.' + timestamp);
  copyFileSync(full, bakPath);
  writeFileSync(full, JSON.stringify(data, null, 2));
  totalChanges += fileChanges;
  console.log(`[${relFile}] wrote ${fileChanges} changes  (backup: ${bakPath.replace(WISDOM + '/', '')})`);
}

console.log('');
console.log('=== Summary ===');
console.log('  Plan actionable:  ' + actionable.length);
console.log('  Changes applied:  ' + totalChanges);
console.log('  Skipped:          ' + skips);
console.log('  Backup timestamp: ' + timestamp);
