import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertNodeExists,
  assertNodeHasComponent,
  getComponentRecordForNode,
  getScriptTypeId,
  readAssetJson,
} from './helpers/cocos-asset-test-utils.mjs';

test('Echo prefabs contain their visual children', async () => {
  const prefabFiles = [
    ['assets/prefabs/EchoBox.prefab', 'EchoBox', 'DebugLabel'],
    ['assets/prefabs/EchoSpringFlower.prefab', 'EchoSpringFlower', 'DebugLabel'],
    ['assets/prefabs/EchoBombBug.prefab', 'EchoBombBug', 'CountdownOverlay'],
  ];

  for (const [relativePath, rootName, overlayName] of prefabFiles) {
    const items = await readAssetJson(relativePath);
    assertNodeExists(items, rootName);
    assertNodeExists(items, 'Visual');
    assertNodeExists(items, 'Visual-Art');
    assertNodeExists(items, overlayName);
  }
});

test('Echo prefabs keep their unique gameplay scripts', async () => {
  const springItems = await readAssetJson('assets/prefabs/EchoSpringFlower.prefab');
  const bombItems = await readAssetJson('assets/prefabs/EchoBombBug.prefab');

  const springType = await getScriptTypeId('assets/scripts/echo/SpringFlowerBounce.ts');
  const bombType = await getScriptTypeId('assets/scripts/echo/BombBugFuse.ts');

  const springRoot = assertNodeExists(springItems, 'EchoSpringFlower');
  const bombRoot = assertNodeExists(bombItems, 'EchoBombBug');

  assertNodeHasComponent(springItems, springRoot, springType, 'EchoSpringFlower');
  assertNodeHasComponent(bombItems, bombRoot, bombType, 'EchoBombBug');

  const bombFuse = getComponentRecordForNode(bombItems, bombRoot, bombType, 'EchoBombBug');
  const countdownOverlay = assertNodeExists(bombItems, 'CountdownOverlay');
  const countdownLabelComponent = bombItems[countdownOverlay._components.find((componentRef) => bombItems[componentRef.__id__]?.__type__ === 'cc.Label').__id__];

  assert.equal(bombItems[bombFuse.countdownOverlay.__id__], countdownOverlay);
  assert.equal(bombItems[bombFuse.countdownLabel.__id__], countdownLabelComponent);
});
