import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { loadAssetBindingCatalog, resolveAssetBinding } from '../tools/asset-binding-manifest-utils.mjs';

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function createFixtureProject() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wisdom-image2-overlay-'));
  await writeJson(path.join(root, 'assets', 'configs', 'asset_selection_manifest.json'), {
    entities: {
      outdoor_wall_standard: {
        path: '',
        fallbackPath: '',
        status: 'rect_visual_placeholder',
      },
    },
  });
  await writeJson(path.join(root, 'assets', 'configs', 'asset_binding_manifest_v2.json'), {
    worldEntities: {
      outdoor_wall_standard: {
        selectedPath: '',
        fallbackPath: '',
        status: 'rect_visual_placeholder',
      },
    },
    uiEntities: {},
    audioRoles: {},
  });
  return root;
}

test('loadAssetBindingCatalog keeps the live manifest when candidate preview is off', async () => {
  const projectRoot = await createFixtureProject();
  const catalog = await loadAssetBindingCatalog(projectRoot, { enableImage2CandidatePreview: false });
  const resolved = resolveAssetBinding(catalog, 'outdoor_wall_standard');

  assert.equal(catalog.candidatePreviewEnabled, false);
  assert.equal(catalog.candidateManifest, null);
  assert.equal(resolved.selectedPath, '');
  assert.equal(resolved.bindingStatus, 'rect_visual_placeholder');
  assert.equal(resolved.sourceManifest, 'asset_binding_manifest_v2.worldEntities');
});

test('loadAssetBindingCatalog overlays candidate bindings when preview is enabled', async () => {
  const projectRoot = await createFixtureProject();
  await writeJson(path.join(projectRoot, 'assets', 'configs', 'asset_binding_candidate_manifest_image2.json'), {
    worldEntities: {
      outdoor_wall_standard: {
        selectedPath: 'assets/art/generated/outdoor_wall_standard/candidate-a.png',
        fallbackPath: '',
        status: 'candidate_preview',
      },
    },
  });

  const catalog = await loadAssetBindingCatalog(projectRoot, { enableImage2CandidatePreview: true });
  const resolved = resolveAssetBinding(catalog, 'outdoor_wall_standard');

  assert.equal(catalog.candidatePreviewEnabled, true);
  assert.equal(
    resolved.selectedPath,
    'assets/art/generated/outdoor_wall_standard/candidate-a.png',
  );
  assert.equal(resolved.bindingStatus, 'candidate_preview');
  assert.equal(resolved.sourceManifest, 'asset_binding_candidate_manifest_image2.worldEntities');
  assert.equal(catalog.liveBindingManifest.worldEntities.outdoor_wall_standard.selectedPath, '');
});
