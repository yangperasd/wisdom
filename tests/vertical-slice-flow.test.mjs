import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertNodeExists,
  getComponentRecordsForNode,
  getScriptTypeId,
  readAssetJson,
} from './helpers/cocos-asset-test-utils.mjs';

async function findScenePortalComponent(items, nodeName, portalTypeId) {
  const node = assertNodeExists(items, nodeName);
  const component = getComponentRecordsForNode(items, node).find((record) => record?.__type__ === portalTypeId) ?? null;
  assert.ok(component, `Expected node "${nodeName}" to include a ScenePortal component.`);
  return component;
}

test('vertical slice portals connect the full StartCamp to Boss and return loop', async () => {
  const portalTypeId = await getScriptTypeId('assets/scripts/core/ScenePortal.ts');
  const startCamp = await readAssetJson('assets/scenes/StartCamp.scene');
  const fieldWest = await readAssetJson('assets/scenes/FieldWest.scene');
  const fieldRuins = await readAssetJson('assets/scenes/FieldRuins.scene');
  const dungeonHub = await readAssetJson('assets/scenes/DungeonHub.scene');
  const bossArena = await readAssetJson('assets/scenes/BossArena.scene');

  const cases = [
    [startCamp, 'Portal-FieldWest', 'FieldWest', 'field-west-entry'],
    [fieldWest, 'Portal-StartCamp', 'StartCamp', 'camp-return'],
    [fieldWest, 'Portal-FieldRuins', 'FieldRuins', 'field-ruins-entry'],
    [fieldRuins, 'Portal-FieldWestReturn', 'FieldWest', 'field-west-return'],
    [fieldRuins, 'Portal-DungeonHub', 'DungeonHub', 'dungeon-hub-entry'],
    [dungeonHub, 'Portal-BossArena', 'BossArena', 'boss-arena-entry'],
    [bossArena, 'Portal-BossVictory', 'StartCamp', 'camp-entry'],
  ];

  for (const [items, nodeName, targetScene, targetMarkerId] of cases) {
    const component = await findScenePortalComponent(items, nodeName, portalTypeId);
    assert.equal(component.targetScene, targetScene);
    assert.equal(component.targetMarkerId, targetMarkerId);
  }
});
