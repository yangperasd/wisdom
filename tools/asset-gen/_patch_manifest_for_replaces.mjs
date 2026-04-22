/**
 * Patch manifest for the 2 REPLACE-derived assets that already sit in assets/art/
 * but weren't touched by integrate-approved.mjs's review-decisions loop:
 *   - touch_attack_button (REPLACE v02 -> v04)
 *   - system_pause_icon   (REPLACE v00 -> v01)
 *
 * Same update semantics as integrate-approved --update-manifest:
 *   - selectedBasePath or selectedPath flipped to new AI path
 *   - previous path demoted to fallback* (only set if not already present)
 *   - source: 'ai-generated'
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';

const MANIFEST = 'E:/cv5/wisdom/assets/configs/asset_binding_manifest_v2.json';

const replacementAssets = [
  { key: 'touch_attack_button', bucket: 'uiEntities',    path: 'assets/art/ui/skins/echoes/button/touch_attack_button.png' },
  { key: 'system_pause_icon',   bucket: 'uiEntities',    path: 'assets/art/ui/icons/echoes/system_pause_icon.png' }
];

// Sanity: art files exist
for (const r of replacementAssets) {
  const abs = 'E:/cv5/wisdom/' + r.path;
  if (!existsSync(abs)) throw new Error('Missing: ' + abs);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8'));
const backup = MANIFEST + '.bak.' + Date.now();
copyFileSync(MANIFEST, backup);
console.log('Backup: ' + backup);

for (const r of replacementAssets) {
  const entry = manifest[r.bucket]?.[r.key];
  if (!entry) { console.log('  SKIP ' + r.key + ' — not in manifest'); continue; }

  if (entry.source === 'ai-generated' && (entry.selectedPath === r.path || entry.selectedBasePath === r.path)) {
    console.log('  ALREADY ' + r.key + ' — no change');
    continue;
  }

  if (entry.selectedBasePath !== undefined) {
    entry.fallbackBasePath ||= entry.selectedBasePath;
    entry.selectedBasePath = r.path;
  } else {
    entry.fallbackPath ||= entry.selectedPath;
    entry.selectedPath = r.path;
  }
  entry.source = 'ai-generated';
  console.log('  PATCHED ' + r.bucket + '.' + r.key + ' -> ' + r.path);
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
console.log('\nManifest saved.');
