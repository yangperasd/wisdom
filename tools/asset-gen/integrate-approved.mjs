/**
 * integrate-approved.mjs
 *
 * Reads `review-decisions.jsonl` (exported by review-gallery.html) and:
 *   1. Copies APPROVED sprites from `generated/{cat}/{file}` into the
 *      project's `assets/art/` tree under category-appropriate subdirs.
 *   2. Moves REJECTED sprites to `rejected/manual/`.
 *   3. Moves REVISE sprites to `screened/needs-revision/` for re-generation.
 *   4. Optionally updates `assets/configs/asset_binding_manifest_v2.json`
 *      with new sprite bindings (see --update-manifest flag).
 *
 * Cocos Creator will auto-generate `.meta` files when its IDE next opens the
 * project — the script does not synthesize UUIDs, since those depend on the
 * Cocos runtime.
 *
 * Usage:
 *   node integrate-approved.mjs                        # dry-run preview
 *   node integrate-approved.mjs --apply                # actually copy files
 *   node integrate-approved.mjs --apply --update-manifest
 */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = import.meta.dirname;
const config = JSON.parse(await readFile(join(ROOT, 'config.json'), 'utf-8'));
const ART_ROOT = join(ROOT, '..', '..', 'assets', 'art');
const MANIFEST_PATH = join(ROOT, '..', '..', config.paths.asset_binding_manifest.replace(/^\.\.\/\.\.\//, ''));

// ── CLI ─────────────────────────────────────────────────────────────

function parseArgs() {
  const args = { apply: false, updateManifest: false, decisionsFile: null };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--update-manifest') args.updateManifest = true;
    else if (a === '--decisions') args.decisionsFile = process.argv[++i];
  }
  return args;
}

// ── Category → destination directory ────────────────────────────────

function destForCategory(category, candidateName) {
  const map = {
    weapon:     ['items', 'generated', 'weapon'],
    consumable: ['items', 'generated', 'consumable'],
    key:        ['items', 'generated', 'key'],
    treasure:   ['items', 'generated', 'treasure'],
    accessory:  ['items', 'generated', 'accessory'],
    armor:      ['items', 'generated', 'armor'],
    tool:       ['items', 'generated', 'tool'],
    summon:     ['characters', 'echoes', 'generated'],
    explosion:  ['effects', 'explosion'],
    heal:       ['effects', 'heal'],
    impact:     ['effects', 'impact'],
    portal:     ['effects', 'portal'],
    particle:   ['effects', 'particle'],
    trail:      ['effects', 'trail'],
    magic:      ['effects', 'magic'],
    button:     ['ui', 'skins', 'echoes', 'button'],
    panel:      ['ui', 'skins', 'echoes', 'panel'],
    bar:        ['ui', 'skins', 'echoes', 'bar'],
    icon:       ['ui', 'icons', 'echoes']
  };
  const segments = map[category] || ['generated', category];
  return join(ART_ROOT, ...segments, `${candidateName}.png`);
}

// ── Manifest update ─────────────────────────────────────────────────

// Aliases: some candidate ids don't exactly match a manifest key — map explicitly.
const CANDIDATE_TO_MANIFEST_KEY_ALIAS = {
  echo_box_idle:       'echo_box',
  echo_flower_idle:    'echo_flower',
  echo_bombbug_idle:   'echo_bombbug'
  // _active variants keep their id as the manifest key (echo_box_active etc.)
};

function manifestKeyForCandidate(candidateName, manifest) {
  // Resolve aliases first, then scan both manifest buckets for a literal match.
  const key = CANDIDATE_TO_MANIFEST_KEY_ALIAS[candidateName] || candidateName;
  if (manifest.uiEntities && manifest.uiEntities[key]) return { bucket: 'uiEntities', key };
  if (manifest.worldEntities && manifest.worldEntities[key]) return { bucket: 'worldEntities', key };
  return null; // no matching manifest entry — asset just sits in art tree
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const decisionsFile = args.decisionsFile || join(ROOT, 'review-decisions.jsonl');

  if (!existsSync(decisionsFile)) {
    console.error(`Decisions file not found: ${decisionsFile}`);
    console.error('Open review-gallery.html, click Export, save the JSONL into tools/asset-gen/');
    process.exit(1);
  }

  const lines = (await readFile(decisionsFile, 'utf-8')).split('\n').filter(l => l.trim());
  const decisions = lines.map(l => JSON.parse(l));

  console.log(`Loaded ${decisions.length} decisions from ${decisionsFile}`);
  console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY-RUN (use --apply to actually move files)'}`);

  const stats = { approved: 0, rejected: 0, revise: 0, missing: 0, manifest: 0 };
  const manifestUpdates = [];

  // Load manifest up front (readonly) for key lookup; actual mutation happens below.
  let manifestForLookup = { uiEntities: {}, worldEntities: {} };
  if (existsSync(MANIFEST_PATH)) {
    try {
      manifestForLookup = JSON.parse(await readFile(MANIFEST_PATH, 'utf-8'));
    } catch (e) {
      console.warn('Could not pre-read manifest for lookup: ' + e.message);
    }
  }

  for (const d of decisions) {
    // Skip partial/legacy entries that only have {id, decision, note} without file/category.
    // These come from the review gallery's incremental export format for previously-decided items.
    if (!d.file || !d.category) {
      continue;
    }
    const sourcePath = join(ROOT, 'generated', d.category, basename(d.file));
    if (!existsSync(sourcePath)) {
      console.warn(`  MISSING source: ${sourcePath}`);
      stats.missing++;
      continue;
    }

    const candidateName = basename(d.file, '.png').replace(/_v\d+$/, ''); // strip version suffix

    if (d.decision === 'approve') {
      const dest = destForCategory(d.category, candidateName);
      console.log(`  APPROVE: ${d.id} -> ${dest.replace(ART_ROOT, 'assets/art')}`);
      if (args.apply) {
        await mkdir(dirname(dest), { recursive: true });
        await copyFile(sourcePath, dest);
      }
      stats.approved++;

      const mk = manifestKeyForCandidate(candidateName, manifestForLookup);
      if (mk) manifestUpdates.push({ ...mk, path: dest, candidateName });
    }
    else if (d.decision === 'reject') {
      const dest = join(ROOT, 'rejected', 'manual', d.category, basename(d.file));
      console.log(`  REJECT:  ${d.id} -> ${dest.replace(ROOT, 'tools/asset-gen')}`);
      if (args.apply) {
        await mkdir(dirname(dest), { recursive: true });
        await copyFile(sourcePath, dest);
      }
      stats.rejected++;
    }
    else if (d.decision === 'revise') {
      const dest = join(ROOT, 'screened', 'needs-revision', d.category, basename(d.file));
      console.log(`  REVISE:  ${d.id} -> ${dest.replace(ROOT, 'tools/asset-gen')}  note: ${d.note || ''}`);
      if (args.apply) {
        await mkdir(dirname(dest), { recursive: true });
        await copyFile(sourcePath, dest);
      }
      stats.revise++;
    }
  }

  // Optional manifest update: flip selectedPath/selectedBasePath to the AI asset
  // and demote the previous production path into fallbackPath/fallbackBasePath.
  if (args.updateManifest && args.apply && manifestUpdates.length > 0) {
    if (!existsSync(MANIFEST_PATH)) {
      console.warn(`Manifest not found at ${MANIFEST_PATH}, skipping update.`);
    } else {
      const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf-8'));
      const backup = MANIFEST_PATH + '.bak.' + Date.now();
      await copyFile(MANIFEST_PATH, backup);

      for (const upd of manifestUpdates) {
        const relPath = upd.path.replace(ART_ROOT, 'assets/art').replace(/\\/g, '/');
        manifest[upd.bucket] ||= {};
        const entry = manifest[upd.bucket][upd.key] ||= {};

        if (entry.selectedBasePath !== undefined) {
          // Compound button entry (selectedBasePath + selectedIconPath).
          // Only the base image is AI-produced; icon overlays stay as-is.
          entry.fallbackBasePath ||= entry.selectedBasePath;
          entry.selectedBasePath = relPath;
        } else {
          // Single-path entry (selectedPath).
          entry.fallbackPath ||= entry.selectedPath;
          entry.selectedPath = relPath;
        }
        entry.source = 'ai-generated';
        stats.manifest++;
        console.log(`  MANIFEST: ${upd.bucket}.${upd.key} -> ${relPath}`);
      }

      manifest.generatedAt = new Date().toISOString().slice(0, 10);
      manifest._aiIntegrationNote = 'AI-generated assets wired ' + manifest.generatedAt + '. Original paths demoted to fallbackPath/fallbackBasePath. Field "source":"ai-generated" marks updated entries.';

      await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
      console.log(`\nUpdated manifest (backup: ${backup})`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`  Approved:  ${stats.approved}`);
  console.log(`  Rejected:  ${stats.rejected}`);
  console.log(`  Revise:    ${stats.revise}`);
  console.log(`  Missing:   ${stats.missing}`);
  console.log(`  Manifest updates: ${stats.manifest}`);

  if (!args.apply) {
    console.log('\nDRY RUN — no files were moved. Re-run with --apply to commit.');
  } else {
    console.log('\nDone. Open Cocos Creator to let it scan and generate .meta files.');
    console.log('Then run:  npm run test:visual:update  (to refresh visual baselines)');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
