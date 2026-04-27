import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  assertComponentNodeReference,
  assertNodeActiveState,
  assertNodeExists,
  assertNodeHasComponent,
  getComponentRecordForNode,
  getScriptTypeId,
  readAssetJson,
} from './helpers/cocos-asset-test-utils.mjs';

test('MechanicsLab scene includes core gameplay nodes and mobile HUD', async () => {
  const items = await readAssetJson('assets/scenes/MechanicsLab.scene');

  const expectedNodes = [
    'Canvas',
    'PersistentRoot',
    'WorldRoot',
    'HudRoot',
    'TouchHudRoot',
    'Player',
    'Checkpoint-01',
    'Plate-01',
    'Trap-01',
    'EnemyA',
    'BombGateRoot',
    'Joystick',
    'TouchAttack',
    'TouchPlaceEcho',
    'TouchEchoBox',
    'TouchEchoFlower',
    'TouchEchoBomb',
  ];

  for (const nodeName of expectedNodes) {
    assertNodeExists(items, nodeName);
  }
});

test('MechanicsLab scene wires critical custom components', async () => {
  const items = await readAssetJson('assets/scenes/MechanicsLab.scene');

  const playerControllerType = await getScriptTypeId('assets/scripts/player/PlayerController.ts');
  const healthType = await getScriptTypeId('assets/scripts/combat/HealthComponent.ts');
  const echoManagerType = await getScriptTypeId('assets/scripts/echo/EchoManager.ts');
  const cameraRigType = await getScriptTypeId('assets/scripts/core/WorldCameraRig2D.ts');
  const touchJoystickType = await getScriptTypeId('assets/scripts/input/TouchJoystick.ts');
  const touchButtonType = await getScriptTypeId('assets/scripts/input/TouchCommandButton.ts');
  const breakableTargetType = await getScriptTypeId('assets/scripts/puzzle/BreakableTarget.ts');
  const collectiblePresentationType = await getScriptTypeId('assets/scripts/visual/CollectiblePresentation.ts');
  const sceneMusicType = await getScriptTypeId('assets/scripts/audio/SceneMusicController.ts');
  const checkpointMarkerType = await getScriptTypeId('assets/scripts/core/CheckpointMarker.ts');
  const playerVisualType = await getScriptTypeId('assets/scripts/player/PlayerVisualController.ts');
  const enemyVisualType = await getScriptTypeId('assets/scripts/enemy/EnemyVisualController.ts');
  const projectileTrapType = await getScriptTypeId('assets/scripts/puzzle/ProjectileTrap.ts');
  const sceneDressingSkinType = await getScriptTypeId('assets/scripts/visual/SceneDressingSkin.ts');
  const assetBindingTagType = await getScriptTypeId('assets/scripts/core/AssetBindingTag.ts');

  const player = assertNodeExists(items, 'Player');
  const worldRoot = assertNodeExists(items, 'WorldRoot');
  const echoRoot = assertNodeExists(items, 'EchoRoot');
  const persistentRoot = assertNodeExists(items, 'PersistentRoot');
  const hudRoot = assertNodeExists(items, 'HudRoot');
  const touchHudRoot = assertNodeExists(items, 'TouchHudRoot');
  const joystick = assertNodeExists(items, 'Joystick');
  const touchAttack = assertNodeExists(items, 'TouchAttack');
  const bombGateRoot = assertNodeExists(items, 'BombGateRoot');
  const trapNode = assertNodeExists(items, 'Trap-01');
  const checkpointNode = assertNodeExists(items, 'Checkpoint-01');
  const flowerPickup = assertNodeExists(items, 'EchoPickup-Flower');
  const bombPickup = assertNodeExists(items, 'EchoPickup-Bomb');
  const bombWallClosed = assertNodeExists(items, 'BombWall-Closed');
  const bombWallOpen = assertNodeExists(items, 'BombWall-Open');
  const enemyA = assertNodeExists(items, 'EnemyA');

  assertNodeHasComponent(items, player, playerControllerType, 'Player');
  assertNodeHasComponent(items, player, healthType, 'Player');
  assertNodeHasComponent(items, player, playerVisualType, 'Player');
  assertNodeHasComponent(items, player, assetBindingTagType, 'Player');
  assertNodeHasComponent(items, worldRoot, cameraRigType, 'WorldRoot');
  assertNodeHasComponent(items, echoRoot, echoManagerType, 'EchoRoot');
  assertNodeHasComponent(items, persistentRoot, sceneMusicType, 'PersistentRoot');
  assertNodeHasComponent(items, enemyA, enemyVisualType, 'EnemyA');
  assertNodeHasComponent(items, trapNode, projectileTrapType, 'Trap-01');
  assertNodeHasComponent(items, checkpointNode, checkpointMarkerType, 'Checkpoint-01');
  assertNodeHasComponent(items, checkpointNode, assetBindingTagType, 'Checkpoint-01');
  assertNodeHasComponent(items, flowerPickup, assetBindingTagType, 'EchoPickup-Flower');
  assertNodeHasComponent(items, bombPickup, assetBindingTagType, 'EchoPickup-Bomb');
  assertNodeHasComponent(items, bombGateRoot, assetBindingTagType, 'BombGateRoot');
  assertNodeHasComponent(items, assertNodeExists(items, 'WorldBackdrop'), sceneDressingSkinType, 'WorldBackdrop');
  assertNodeHasComponent(items, assertNodeExists(items, 'PickupStrip'), sceneDressingSkinType, 'PickupStrip');
  assertNodeHasComponent(items, assertNodeExists(items, 'PlateZone'), sceneDressingSkinType, 'PlateZone');
  assertNodeHasComponent(items, assertNodeExists(items, 'TrapZone'), sceneDressingSkinType, 'TrapZone');
  assertNodeHasComponent(items, assertNodeExists(items, 'BombZone'), sceneDressingSkinType, 'BombZone');
  assertNodeHasComponent(items, assertNodeExists(items, 'Gate-Closed'), sceneDressingSkinType, 'Gate-Closed');
  assertNodeHasComponent(items, bombWallClosed, sceneDressingSkinType, 'BombWall-Closed');
  assertNodeHasComponent(items, hudRoot, 'cc.Widget', 'HudRoot');
  assertNodeHasComponent(items, hudRoot, 'cc.SafeArea', 'HudRoot');
  assertNodeHasComponent(items, touchHudRoot, 'cc.Widget', 'TouchHudRoot');
  assertNodeHasComponent(items, touchHudRoot, 'cc.SafeArea', 'TouchHudRoot');
  assertNodeHasComponent(items, joystick, touchJoystickType, 'Joystick');
  assertNodeHasComponent(items, touchAttack, touchButtonType, 'TouchAttack');
  assertNodeHasComponent(items, bombGateRoot, breakableTargetType, 'BombGateRoot');
  assertNodeHasComponent(items, flowerPickup, collectiblePresentationType, 'EchoPickup-Flower');
  assertNodeHasComponent(items, bombPickup, collectiblePresentationType, 'EchoPickup-Bomb');

  const bombGateBreakable = getComponentRecordForNode(items, bombGateRoot, breakableTargetType, 'BombGateRoot');
  const trapComponent = getComponentRecordForNode(items, trapNode, projectileTrapType, 'Trap-01 ProjectileTrap');
  const checkpointMarker = getComponentRecordForNode(items, checkpointNode, checkpointMarkerType, 'Checkpoint-01 CheckpointMarker');
  const checkpointBinding = getComponentRecordForNode(items, checkpointNode, assetBindingTagType, 'Checkpoint-01 AssetBindingTag');
  const playerBinding = getComponentRecordForNode(items, player, assetBindingTagType, 'Player AssetBindingTag');
  const flowerBinding = getComponentRecordForNode(items, flowerPickup, assetBindingTagType, 'EchoPickup-Flower AssetBindingTag');
  const bombBinding = getComponentRecordForNode(items, bombPickup, assetBindingTagType, 'EchoPickup-Bomb AssetBindingTag');
  const flowerPresentation = getComponentRecordForNode(items, flowerPickup, collectiblePresentationType, 'EchoPickup-Flower Presentation');
  const bombPresentation = getComponentRecordForNode(items, bombPickup, collectiblePresentationType, 'EchoPickup-Bomb Presentation');
  const bombGateBinding = getComponentRecordForNode(items, bombGateRoot, assetBindingTagType, 'BombGateRoot AssetBindingTag');
  const worldBackdropBinding = getComponentRecordForNode(items, assertNodeExists(items, 'WorldBackdrop'), assetBindingTagType, 'WorldBackdrop AssetBindingTag');
  const playerVisual = getComponentRecordForNode(items, player, playerVisualType, 'Player VisualController');
  const enemyVisual = getComponentRecordForNode(items, enemyA, enemyVisualType, 'EnemyA VisualController');
  const playerVisualNode = assertNodeExists(items, 'Player-Visual');
  const playerVisualTransform = getComponentRecordForNode(items, playerVisualNode, 'cc.UITransform', 'Player-Visual UITransform');
  const checkpointVisualNode = assertNodeExists(items, 'Checkpoint-01-Visual');
  const checkpointVisualTransform = getComponentRecordForNode(items, checkpointVisualNode, 'cc.UITransform', 'Checkpoint-01-Visual UITransform');
  const flowerVisual = assertNodeExists(items, 'EchoPickup-Flower-Visual');
  const bombVisual = assertNodeExists(items, 'EchoPickup-Bomb-Visual');
  const flowerVisualTransform = getComponentRecordForNode(items, flowerVisual, 'cc.UITransform', 'EchoPickup-Flower Visual');
  const bombVisualTransform = getComponentRecordForNode(items, bombVisual, 'cc.UITransform', 'EchoPickup-Bomb Visual');
  assertComponentNodeReference(items, bombGateBreakable, 'intactVisualNode', bombWallClosed, 'BombGateRoot BreakableTarget');
  assertComponentNodeReference(items, bombGateBreakable, 'brokenVisualNode', bombWallOpen, 'BombGateRoot BreakableTarget');
  assertComponentNodeReference(items, flowerPresentation, 'visualRoot', flowerVisual, 'EchoPickup-Flower Presentation');
  assertComponentNodeReference(items, bombPresentation, 'visualRoot', bombVisual, 'EchoPickup-Bomb Presentation');
  assert.equal(trapComponent.hideLabelWhenSkinned, true);
  assert.ok(checkpointMarker.visualSpriteFrame?.__uuid__, 'Checkpoint-01 should bind a checkpoint sprite-frame preview.');
  assert.equal(checkpointMarker.visualTexture, null, 'Checkpoint-01 should not need a raw texture fallback once sprite-frame preview metadata is available.');
  assert.equal(checkpointVisualTransform._contentSize.width, 148);
  assert.equal(checkpointVisualTransform._contentSize.height, 184);
  assert.equal(checkpointVisualNode._lpos.y, 100);
  assert.equal(checkpointBinding.bindingKey, 'checkpoint');
  assert.equal(checkpointBinding.bindingStatus, 'candidate_preview');
  assert.match(checkpointBinding.selectedPath, /assets\/art\/generated\/image2-preview\/checkpoint\/checkpoint_v00\.png$/);
  assert.equal(playerBinding.bindingKey, 'player_preview');
  assert.equal(playerBinding.bindingStatus, 'candidate_preview');
  assert.match(playerBinding.selectedPath, /assets\/art\/generated\/image2-preview\/player_preview\/player_preview_v00\.png$/);
  assert.equal(worldBackdropBinding.bindingKey, 'outdoor_ground_ruins');
  assert.equal(flowerBinding.bindingKey, 'echo_spring_flower');
  assert.equal(flowerBinding.bindingStatus, 'candidate_preview');
  assert.match(flowerBinding.selectedPath, /assets\/art\/generated\/image2-preview\/echo_spring_flower\/echo_spring_flower_v00\.png$/);
  assert.equal(flowerPresentation.fitMode, 1);
  assert.equal(flowerPresentation.verticalAnchor, 1);
  assert.equal(flowerPresentation.maskShape, 2);
  assert.equal(flowerPresentation.maskEllipseSegments, 56);
  assert.equal(flowerVisualTransform._contentSize.width, 84);
  assert.equal(flowerVisualTransform._contentSize.height, 76);
  assert.equal(flowerVisual._lpos.y, 8);
  assert.equal(bombBinding.bindingKey, 'echo_bomb_bug');
  assert.equal(bombBinding.bindingStatus, 'candidate_preview');
  assert.match(bombBinding.selectedPath, /assets\/art\/generated\/image2-preview\/echo_bomb_bug\/echo_bomb_bug_v00\.png$/);
  assert.equal(bombPresentation.fitMode, 1);
  assert.equal(bombPresentation.verticalAnchor, 1);
  assert.equal(bombPresentation.maskShape, 2);
  assert.equal(bombPresentation.maskEllipseSegments, 56);
  assert.equal(bombVisualTransform._contentSize.width, 92);
  assert.equal(bombVisualTransform._contentSize.height, 72);
  assert.equal(bombVisual._lpos.y, 8);
  assert.equal(bombGateBinding.bindingKey, 'breakable_target');
  assert.ok(playerVisual.idleSpriteFrame?.__uuid__, 'MechanicsLab player should bind a sprite-frame visual.');
  assert.equal(playerVisualTransform._contentSize.width, 76);
  assert.equal(playerVisualTransform._contentSize.height, 104);
  assert.equal(playerVisualNode._lpos.y, 20);
  assert.ok(enemyVisual.idleSpriteFrame?.__uuid__, 'MechanicsLab enemy should bind a sprite-frame visual.');
  const sceneMusic = getComponentRecordForNode(items, persistentRoot, sceneMusicType, 'PersistentRoot SceneMusicController');
  assert.equal(sceneMusic.musicCueId, 'mechanics-lab');
});

test('ArrowProjectile prefab exposes visual and impact-ready structure', async () => {
  const items = await readAssetJson('assets/prefabs/ArrowProjectile.prefab');
  const simpleProjectileType = await getScriptTypeId('assets/scripts/puzzle/SimpleProjectile.ts');
  const assetBindingTagType = await getScriptTypeId('assets/scripts/core/AssetBindingTag.ts');

  const root = assertNodeExists(items, 'ArrowProjectile');
  const visual = assertNodeExists(items, 'Visual');
  const visualArt = assertNodeExists(items, 'Visual-Art');
  const debugLabel = assertNodeExists(items, 'DebugLabel');

  assertNodeHasComponent(items, root, simpleProjectileType, 'ArrowProjectile');
  assertNodeHasComponent(items, root, assetBindingTagType, 'ArrowProjectile');
  assert.equal(visual._children.some((childRef) => items[childRef.__id__] === visualArt), true);
  const projectileComponent = getComponentRecordForNode(items, root, simpleProjectileType, 'ArrowProjectile SimpleProjectile');
  const assetBinding = getComponentRecordForNode(items, root, assetBindingTagType, 'ArrowProjectile AssetBindingTag');
  assert.equal(items[projectileComponent.visualRoot.__id__], visual);
  assert.equal(projectileComponent.rotateToDirection, true);
  assert.equal(assetBinding.bindingKey, 'projectile_arrow');
  assert.equal(assetBinding.bindingStatus, 'candidate_preview');
  assert.match(assetBinding.selectedPath, /assets\/art\/generated\/image2-preview\/projectile_arrow\/projectile_arrow_v00\.png$/);
  // DebugLabel is dev scaffolding ("ARROW" placeholder text). It must spawn
  // inactive so testers never see it; the node stays in the prefab structure
  // so a developer can flip it back on while iterating. setPlaceholderLabelVisible
  // also explicitly skips developer-only labels at runtime.
  assert.equal(debugLabel._active, false);
});

test('MechanicsLab scene keeps initial gate states consistent', async () => {
  const items = await readAssetJson('assets/scenes/MechanicsLab.scene');

  const gateClosed = assertNodeExists(items, 'Gate-Closed');
  const gateOpen = assertNodeExists(items, 'Gate-Open');
  const bombWallClosed = assertNodeExists(items, 'BombWall-Closed');
  const bombWallOpen = assertNodeExists(items, 'BombWall-Open');
  const bombReward = assertNodeExists(items, 'BombReward');

  assertNodeActiveState(gateClosed, true);
  assertNodeActiveState(gateOpen, false);
  assertNodeActiveState(bombWallClosed, true);
  assertNodeActiveState(bombWallOpen, false);
  assertNodeActiveState(bombReward, false);
});

test('MechanicsLab scene still includes exactly one player node', async () => {
  const items = await readAssetJson('assets/scenes/MechanicsLab.scene');
  const players = items.filter((item) => item?.__type__ === 'cc.Node' && item._name === 'Player');
  assert.equal(players.length, 1);
});

test('MechanicsLab echo prefab generator uses tighter object-like framing inputs', async () => {
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
  assert.match(
    mechanicsLabScript,
    /'EchoPickup-Flower'[\s\S]*color\(66, 128, 80, 18\)[\s\S]*color\(203, 255, 215, 32\)[\s\S]*makeCollectiblePresentationProps\(0\.94,\s*\{\s*maskShape: 2,\s*maskEllipseSegments: 56,/s,
  );
  assert.match(
    mechanicsLabScript,
    /'EchoPickup-Bomb'[\s\S]*color\(125, 62, 64, 18\)[\s\S]*color\(255, 208, 198, 32\)[\s\S]*makeCollectiblePresentationProps\(0\.92,\s*\{\s*maskShape: 2,\s*maskEllipseSegments: 56,/s,
  );
});
