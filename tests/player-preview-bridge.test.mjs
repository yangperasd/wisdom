import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAssetBindingCatalog, resolveAssetBinding } from '../tools/asset-binding-manifest-utils.mjs';
import {
  PROJECT_ROOT,
  assertNodeExists,
  assertNodeHasComponent,
  getComponentRecordForNode,
  getScriptTypeId,
  readAssetJson,
} from './helpers/cocos-asset-test-utils.mjs';

test('player preview bridge resolves candidate overlay without changing live player binding', async () => {
  const catalog = await loadAssetBindingCatalog(PROJECT_ROOT, { enableImage2CandidatePreview: true });
  const previewBinding = resolveAssetBinding(catalog, 'player_preview');
  const liveManifest = await readAssetJson('assets/configs/asset_binding_manifest_v2.json');
  const previewManifest = await readAssetJson('assets/configs/asset_binding_candidate_manifest_image2.json');
  const items = await readAssetJson('assets/scenes/PlayerPreview.scene');

  const assetBindingTagType = await getScriptTypeId('assets/scripts/core/AssetBindingTag.ts');
  const sceneDressingSkinType = await getScriptTypeId('assets/scripts/visual/SceneDressingSkin.ts');
  const playerNode = assertNodeExists(items, 'Player');
  const worldRootNode = assertNodeExists(items, 'WorldRoot');
  const bindingTag = getComponentRecordForNode(items, playerNode, assetBindingTagType, 'Player AssetBindingTag');
  const dressing = getComponentRecordForNode(items, playerNode, sceneDressingSkinType, 'Player SceneDressingSkin');

  assert.equal(previewBinding?.bindingKey, 'player_preview');
  assert.equal(previewBinding?.selectedPath, 'assets/art/generated/image2-preview/player_preview/player_preview_v00.png');
  assert.equal(previewBinding?.bindingStatus, 'candidate_preview');
  assert.equal(
    previewManifest.worldEntities.player_preview.candidateFile,
    'temp/image2/candidates/player/2026-04-25-player-track-07/player_preview_v00.png',
  );
  assert.equal(
    previewManifest.worldEntities.player_preview.screeningReport,
    'temp/image2/evidence/2026-04-25-player-track-07/review.json',
  );
  assert.equal(bindingTag.bindingKey, 'player_preview');
  assert.equal(bindingTag.bindingStatus, 'candidate_preview');
  assert.equal(bindingTag.selectedPath, previewBinding?.selectedPath);
  assert.equal(bindingTag.sourceManifest, 'asset_binding_candidate_manifest_image2.worldEntities');
  assert.equal(dressing.tiled, false);
  assert.equal(dressing.fitMode, 1);
  assert.equal(dressing.verticalAnchor, 0);
  assert.ok(dressing.texture?.__uuid__, 'PlayerPreview should bind the preview texture directly.');
  assert.ok(worldRootNode._children.some((child) => child.__id__ === items.indexOf(playerNode)));
  assert.equal(
    liveManifest.worldEntities.player.selectedPath,
    'assets/art/characters/player/denzi/paperdoll/doll_male.png',
  );
});
