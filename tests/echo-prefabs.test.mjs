import test from 'node:test';
import {
  assertNodeExists,
  assertNodeHasComponent,
  getScriptTypeId,
  readAssetJson,
} from './helpers/cocos-asset-test-utils.mjs';

test('Echo prefabs contain their visual children', async () => {
  const prefabFiles = [
    ['assets/prefabs/EchoBox.prefab', 'EchoBox'],
    ['assets/prefabs/EchoSpringFlower.prefab', 'EchoSpringFlower'],
    ['assets/prefabs/EchoBombBug.prefab', 'EchoBombBug'],
  ];

  for (const [relativePath, rootName] of prefabFiles) {
    const items = await readAssetJson(relativePath);
    assertNodeExists(items, rootName);
    assertNodeExists(items, 'Visual');
    assertNodeExists(items, 'Label');
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
});
