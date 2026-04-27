import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  assertComponentNodeReference,
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

test('Echo prefabs attach candidate-preview presentation hooks where available', async () => {
  const boxItems = await readAssetJson('assets/prefabs/EchoBox.prefab');
  const springItems = await readAssetJson('assets/prefabs/EchoSpringFlower.prefab');
  const bombItems = await readAssetJson('assets/prefabs/EchoBombBug.prefab');

  const springType = await getScriptTypeId('assets/scripts/echo/SpringFlowerBounce.ts');
  const bombType = await getScriptTypeId('assets/scripts/echo/BombBugFuse.ts');
  const presentationType = await getScriptTypeId('assets/scripts/visual/CollectiblePresentation.ts');
  const assetBindingTagType = await getScriptTypeId('assets/scripts/core/AssetBindingTag.ts');

  const boxRoot = assertNodeExists(boxItems, 'EchoBox');
  const springRoot = assertNodeExists(springItems, 'EchoSpringFlower');
  const bombRoot = assertNodeExists(bombItems, 'EchoBombBug');

  assertNodeHasComponent(boxItems, boxRoot, presentationType, 'EchoBox');
  assertNodeHasComponent(boxItems, boxRoot, assetBindingTagType, 'EchoBox');
  assertNodeHasComponent(springItems, springRoot, springType, 'EchoSpringFlower');
  assertNodeHasComponent(bombItems, bombRoot, bombType, 'EchoBombBug');
  assertNodeHasComponent(springItems, springRoot, presentationType, 'EchoSpringFlower');
  assertNodeHasComponent(bombItems, bombRoot, presentationType, 'EchoBombBug');
  assertNodeHasComponent(springItems, springRoot, assetBindingTagType, 'EchoSpringFlower');
  assertNodeHasComponent(bombItems, bombRoot, assetBindingTagType, 'EchoBombBug');

  const bombFuse = getComponentRecordForNode(bombItems, bombRoot, bombType, 'EchoBombBug');
  const boxPresentation = getComponentRecordForNode(boxItems, boxRoot, presentationType, 'EchoBox');
  const boxBinding = getComponentRecordForNode(boxItems, boxRoot, assetBindingTagType, 'EchoBox');
  const springPresentation = getComponentRecordForNode(springItems, springRoot, presentationType, 'EchoSpringFlower');
  const bombPresentation = getComponentRecordForNode(bombItems, bombRoot, presentationType, 'EchoBombBug');
  const springBinding = getComponentRecordForNode(springItems, springRoot, assetBindingTagType, 'EchoSpringFlower');
  const bombBinding = getComponentRecordForNode(bombItems, bombRoot, assetBindingTagType, 'EchoBombBug');
  const countdownOverlay = assertNodeExists(bombItems, 'CountdownOverlay');
  const countdownLabelComponent = bombItems[countdownOverlay._components.find((componentRef) => bombItems[componentRef.__id__]?.__type__ === 'cc.Label').__id__];
  const boxVisual = assertNodeExists(boxItems, 'Visual');
  const springVisual = assertNodeExists(springItems, 'Visual');
  const bombVisual = assertNodeExists(bombItems, 'Visual');
  const boxVisualTransform = getComponentRecordForNode(boxItems, boxVisual, 'cc.UITransform', 'EchoBox Visual');
  const springVisualTransform = getComponentRecordForNode(springItems, springVisual, 'cc.UITransform', 'EchoSpringFlower Visual');
  const bombVisualTransform = getComponentRecordForNode(bombItems, bombVisual, 'cc.UITransform', 'EchoBombBug Visual');

  assert.equal(bombItems[bombFuse.countdownOverlay.__id__], countdownOverlay);
  assert.equal(bombItems[bombFuse.countdownLabel.__id__], countdownLabelComponent);
  assert.ok(boxPresentation.visualTexture?.__uuid__ || boxPresentation.visualSpriteFrame?.__uuid__);
  assertComponentNodeReference(boxItems, boxPresentation, 'visualRoot', boxVisual, 'EchoBox Presentation');
  assert.equal(boxPresentation.fitMode, 1);
  assert.equal(boxPresentation.verticalAnchor, 1);
  assert.equal(boxPresentation.maskShape, 3);
  assert.equal(boxPresentation.maskCornerRadius, 12);
  assert.equal(boxVisualTransform._contentSize.width, 58);
  assert.equal(boxVisualTransform._contentSize.height, 58);
  assert.equal(boxVisual._lpos.y, 8);
  assert.equal(boxBinding.bindingKey, 'echo_box');
  assert.ok(springPresentation.visualTexture?.__uuid__ || springPresentation.visualSpriteFrame?.__uuid__);
  assertComponentNodeReference(springItems, springPresentation, 'visualRoot', springVisual, 'EchoSpringFlower Presentation');
  assert.equal(springPresentation.fitMode, 1);
  assert.equal(springPresentation.verticalAnchor, 1);
  assert.equal(springPresentation.maskShape, 2);
  assert.equal(springPresentation.maskEllipseSegments, 56);
  assert.equal(springVisualTransform._contentSize.width, 86);
  assert.equal(springVisualTransform._contentSize.height, 76);
  assert.equal(springVisual._lpos.y, 10);
  assert.ok(bombPresentation.visualTexture?.__uuid__ || bombPresentation.visualSpriteFrame?.__uuid__);
  assertComponentNodeReference(bombItems, bombPresentation, 'visualRoot', bombVisual, 'EchoBombBug Presentation');
  assert.equal(bombPresentation.fitMode, 1);
  assert.equal(bombPresentation.verticalAnchor, 1);
  assert.equal(bombPresentation.maskShape, 2);
  assert.equal(bombPresentation.maskEllipseSegments, 56);
  assert.equal(bombVisualTransform._contentSize.width, 84);
  assert.equal(bombVisualTransform._contentSize.height, 72);
  assert.equal(bombVisual._lpos.y, 10);
  assert.equal(springBinding.bindingKey, 'echo_spring_flower');
  assert.equal(bombBinding.bindingKey, 'echo_bomb_bug');
});

test('Echo prefab generators use tighter object-like framing defaults', async () => {
  const mechanicsLabScript = await fs.readFile(
    path.join(process.cwd(), 'tools', 'generate-mechanics-lab.mjs'),
    'utf8',
  );

  assert.match(mechanicsLabScript, /makeCollectiblePresentationProps\(0\.92,\s*\{\s*maskShape: 3,\s*maskCornerRadius: 12,/s);
  assert.match(mechanicsLabScript, /color\(214, 176, 96, 24\)/);
  assert.match(mechanicsLabScript, /makeCollectiblePresentationProps\(0\.94,\s*\{\s*maskShape: 2,\s*maskEllipseSegments: 56,/s);
  assert.match(mechanicsLabScript, /color\(67, 146, 88, 18\)/);
  assert.match(mechanicsLabScript, /makeCollectiblePresentationProps\(0\.92,\s*\{\s*maskShape: 2,\s*maskEllipseSegments: 56,/s);
  assert.match(mechanicsLabScript, /color\(156, 68, 66, 18\)/);
});
