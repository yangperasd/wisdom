import test from 'node:test';
import assert from 'node:assert/strict';
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
  const flowerBinding = getComponentRecordForNode(items, flowerPickup, assetBindingTagType, 'EchoPickup-Flower AssetBindingTag');
  const bombBinding = getComponentRecordForNode(items, bombPickup, assetBindingTagType, 'EchoPickup-Bomb AssetBindingTag');
  const bombGateBinding = getComponentRecordForNode(items, bombGateRoot, assetBindingTagType, 'BombGateRoot AssetBindingTag');
  const worldBackdropBinding = getComponentRecordForNode(items, assertNodeExists(items, 'WorldBackdrop'), assetBindingTagType, 'WorldBackdrop AssetBindingTag');
  const playerVisual = getComponentRecordForNode(items, player, playerVisualType, 'Player VisualController');
  const enemyVisual = getComponentRecordForNode(items, enemyA, enemyVisualType, 'EnemyA VisualController');
  assertComponentNodeReference(items, bombGateBreakable, 'intactVisualNode', bombWallClosed, 'BombGateRoot BreakableTarget');
  assertComponentNodeReference(items, bombGateBreakable, 'brokenVisualNode', bombWallOpen, 'BombGateRoot BreakableTarget');
  assert.equal(trapComponent.hideLabelWhenSkinned, true);
  assert.ok(checkpointMarker.visualSpriteFrame?.__uuid__, 'Checkpoint-01 should bind a checkpoint sprite frame.');
  assert.equal(checkpointBinding.bindingKey, 'checkpoint');
  assert.match(checkpointBinding.selectedPath, /ashenzaris_altar\.png$/);
  assert.equal(worldBackdropBinding.bindingKey, 'outdoor_ground_ruins');
  assert.equal(flowerBinding.bindingKey, 'echo_spring_flower');
  assert.match(flowerBinding.selectedPath, /EchoSpringFlower\.prefab$/);
  assert.equal(bombBinding.bindingKey, 'echo_bomb_bug');
  assert.match(bombBinding.selectedPath, /EchoBombBug\.prefab$/);
  assert.equal(bombGateBinding.bindingKey, 'breakable_target');
  assert.ok(playerVisual.idleTexture?.__uuid__, 'MechanicsLab player should bind a texture-backed visual.');
  assert.ok(enemyVisual.idleTexture?.__uuid__, 'MechanicsLab enemy should bind a texture-backed visual.');
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
  assert.match(assetBinding.selectedPath, /ArrowProjectile\.prefab$/);
  assert.equal(debugLabel._active, true);
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
