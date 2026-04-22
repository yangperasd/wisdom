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

test('StartCamp scene includes the first flow nodes', async () => {
  const items = await readAssetJson('assets/scenes/StartCamp.scene');

  const expectedNodes = [
    'Canvas',
    'PersistentRoot',
    'WorldRoot',
    'HudRoot',
    'TouchHudRoot',
    'Player',
    'Checkpoint-Camp',
    'Checkpoint-CampReturn',
    'CampPlate',
    'CampGate-Closed',
    'CampGate-Open',
    'Portal-FieldWest',
    'CampEnemy',
    'TouchPause',
    'PausePanel',
    'PauseContinue',
    'PauseRestart',
    'PauseCamp',
    'CampVictoryBanner',
    'CampVictoryHint',
    'CampVictoryController',
  ];

  for (const nodeName of expectedNodes) {
    assertNodeExists(items, nodeName);
  }
});

test('FieldWest scene includes the flower and ruins flow nodes', async () => {
  const items = await readAssetJson('assets/scenes/FieldWest.scene');

  const expectedNodes = [
    'Canvas',
    'PersistentRoot',
    'WorldRoot',
    'HudRoot',
    'TouchHudRoot',
    'Player',
    'Checkpoint-FieldWest',
    'Checkpoint-FieldWestReturn',
    'Portal-StartCamp',
    'Portal-FieldRuins',
    'EchoPickup-Flower-West',
    'Trap-West',
    'FieldEnemy',
  ];

  for (const nodeName of expectedNodes) {
    assertNodeExists(items, nodeName);
  }
});

test('FieldRuins scene includes the bomb and dungeon flow nodes', async () => {
  const items = await readAssetJson('assets/scenes/FieldRuins.scene');

  const expectedNodes = [
    'Canvas',
    'PersistentRoot',
    'WorldRoot',
    'HudRoot',
    'TouchHudRoot',
    'Player',
    'Checkpoint-FieldRuins',
    'Portal-FieldWestReturn',
    'Portal-DungeonHub',
    'EchoPickup-Bomb-Ruins',
    'RuinsWall-Closed',
    'RuinsWall-Open',
    'RuinsEnemy',
  ];

  for (const nodeName of expectedNodes) {
    assertNodeExists(items, nodeName);
  }
});

test('Content scenes wire the scene loader, portals, and formal hud', async () => {
  const startCampItems = await readAssetJson('assets/scenes/StartCamp.scene');
  const fieldWestItems = await readAssetJson('assets/scenes/FieldWest.scene');
  const fieldRuinsItems = await readAssetJson('assets/scenes/FieldRuins.scene');

  const sceneLoaderType = await getScriptTypeId('assets/scripts/core/SceneLoader.ts');
  const scenePortalType = await getScriptTypeId('assets/scripts/core/ScenePortal.ts');
  const gameHudType = await getScriptTypeId('assets/scripts/ui/GameHud.ts');
  const flagGateType = await getScriptTypeId('assets/scripts/core/FlagGateController.ts');
  const pauseMenuType = await getScriptTypeId('assets/scripts/ui/PauseMenuController.ts');
  const collectiblePresentationType = await getScriptTypeId('assets/scripts/visual/CollectiblePresentation.ts');
  const breakableTargetType = await getScriptTypeId('assets/scripts/puzzle/BreakableTarget.ts');
  const sceneMusicType = await getScriptTypeId('assets/scripts/audio/SceneMusicController.ts');
  const playerVisualType = await getScriptTypeId('assets/scripts/player/PlayerVisualController.ts');
  const enemyVisualType = await getScriptTypeId('assets/scripts/enemy/EnemyVisualController.ts');
  const checkpointMarkerType = await getScriptTypeId('assets/scripts/core/CheckpointMarker.ts');
  const sceneDressingSkinType = await getScriptTypeId('assets/scripts/visual/SceneDressingSkin.ts');
  const assetBindingTagType = await getScriptTypeId('assets/scripts/core/AssetBindingTag.ts');
  const rectVisualType = await getScriptTypeId('assets/scripts/visual/RectVisual.ts');

  const assertWarmPlaceholderBinding = (items, nodeName, bindingKey) => {
    assertNodeHasComponent(items, assertNodeExists(items, `${nodeName}-Visual`), rectVisualType, `${nodeName}-Visual`);
    const binding = getComponentRecordForNode(
      items,
      assertNodeExists(items, nodeName),
      assetBindingTagType,
      `${nodeName} AssetBindingTag`,
    );

    assert.equal(binding.bindingKey, bindingKey);
    assert.equal(binding.bindingStatus, 'rect_visual_placeholder');
    assert.equal(binding.selectedPath, '');
    assert.equal(binding.fallbackPath, '');
  };

  const startCanvas = assertNodeExists(startCampItems, 'Canvas');
  const startPersistentRoot = assertNodeExists(startCampItems, 'PersistentRoot');
  const startPortal = assertNodeExists(startCampItems, 'Portal-FieldWest');
  const startHudRoot = assertNodeExists(startCampItems, 'HudRoot');

  const fieldCanvas = assertNodeExists(fieldWestItems, 'Canvas');
  const fieldPersistentRoot = assertNodeExists(fieldWestItems, 'PersistentRoot');
  const fieldPortal = assertNodeExists(fieldWestItems, 'Portal-FieldRuins');
  const fieldHudRoot = assertNodeExists(fieldWestItems, 'HudRoot');

  const ruinsCanvas = assertNodeExists(fieldRuinsItems, 'Canvas');
  const ruinsPersistentRoot = assertNodeExists(fieldRuinsItems, 'PersistentRoot');
  const ruinsPortal = assertNodeExists(fieldRuinsItems, 'Portal-DungeonHub');
  const ruinsHudRoot = assertNodeExists(fieldRuinsItems, 'HudRoot');

  assertNodeHasComponent(startCampItems, startPersistentRoot, sceneLoaderType, 'StartCamp PersistentRoot');
  assertNodeHasComponent(startCampItems, startPersistentRoot, sceneMusicType, 'StartCamp PersistentRoot');
  assertNodeHasComponent(startCampItems, assertNodeExists(startCampItems, 'Player'), playerVisualType, 'StartCamp Player');
  assertNodeHasComponent(startCampItems, assertNodeExists(startCampItems, 'CampEnemy'), enemyVisualType, 'CampEnemy');
  assertNodeHasComponent(startCampItems, startPortal, scenePortalType, 'Portal-FieldWest');
  assertNodeHasComponent(startCampItems, startHudRoot, 'cc.UITransform', 'StartCamp HudRoot');
  assertNodeHasComponent(startCampItems, startHudRoot, 'cc.Widget', 'StartCamp HudRoot');
  assertNodeHasComponent(startCampItems, startHudRoot, 'cc.SafeArea', 'StartCamp HudRoot');
  assertNodeHasComponent(startCampItems, startHudRoot, gameHudType, 'StartCamp HudRoot');
  assertNodeHasComponent(startCampItems, startHudRoot, pauseMenuType, 'StartCamp HudRoot');
  assertNodeHasComponent(
    startCampItems,
    assertNodeExists(startCampItems, 'TouchHudRoot'),
    'cc.SafeArea',
    'StartCamp TouchHudRoot',
  );
  assertNodeHasComponent(startCampItems, assertNodeExists(startCampItems, 'CampVictoryController'), flagGateType, 'CampVictoryController');
  assertNodeHasComponent(startCampItems, assertNodeExists(startCampItems, 'CampBackdrop'), sceneDressingSkinType, 'CampBackdrop');
  assertNodeHasComponent(startCampItems, assertNodeExists(startCampItems, 'CampLeftLane'), sceneDressingSkinType, 'CampLeftLane');
  assertNodeHasComponent(startCampItems, assertNodeExists(startCampItems, 'CampPlateZone'), sceneDressingSkinType, 'CampPlateZone');
  const checkpointCamp = getComponentRecordForNode(
    startCampItems,
    assertNodeExists(startCampItems, 'Checkpoint-Camp'),
    checkpointMarkerType,
    'Checkpoint-Camp',
  );
  const startPlayerVisual = getComponentRecordForNode(
    startCampItems,
    assertNodeExists(startCampItems, 'Player'),
    playerVisualType,
    'StartCamp PlayerVisualController',
  );
  const startEnemyVisual = getComponentRecordForNode(
    startCampItems,
    assertNodeExists(startCampItems, 'CampEnemy'),
    enemyVisualType,
    'CampEnemy VisualController',
  );
  assert.equal(checkpointCamp.visualSpriteFrame, null, 'Checkpoint-Camp should stay image-free during the warm placeholder pass.');
  assertWarmPlaceholderBinding(startCampItems, 'Checkpoint-Camp', 'checkpoint');
  assert.ok(startPlayerVisual.idleTexture?.__uuid__, 'StartCamp player should bind a texture-backed visual.');
  assert.equal(startEnemyVisual.idleTexture, null, 'CampEnemy should stay image-free during the key gameplay placeholder pass.');
  assertWarmPlaceholderBinding(startCampItems, 'CampEnemy', 'common_enemy');
  const startPortalRecord = getComponentRecordForNode(startCampItems, startPortal, scenePortalType, 'Portal-FieldWest');
  assert.equal(startPortalRecord.visualSpriteFrame, null, 'Portal-FieldWest should stay image-free during the warm placeholder pass.');
  assertWarmPlaceholderBinding(startCampItems, 'Portal-FieldWest', 'portal');
  const campBackdropBinding = getComponentRecordForNode(
    startCampItems,
    assertNodeExists(startCampItems, 'CampBackdrop'),
    assetBindingTagType,
    'CampBackdrop AssetBindingTag',
  );
  assert.equal(campBackdropBinding.bindingKey, 'outdoor_ground_green');

  assertNodeHasComponent(fieldWestItems, fieldPersistentRoot, sceneLoaderType, 'FieldWest PersistentRoot');
  assertNodeHasComponent(fieldWestItems, fieldPersistentRoot, sceneMusicType, 'FieldWest PersistentRoot');
  assertNodeHasComponent(fieldWestItems, assertNodeExists(fieldWestItems, 'Player'), playerVisualType, 'FieldWest Player');
  assertNodeHasComponent(fieldWestItems, assertNodeExists(fieldWestItems, 'FieldEnemy'), enemyVisualType, 'FieldEnemy');
  assertNodeHasComponent(fieldWestItems, fieldPortal, scenePortalType, 'Portal-FieldRuins');
  assertNodeHasComponent(fieldWestItems, fieldHudRoot, 'cc.SafeArea', 'FieldWest HudRoot');
  assertNodeHasComponent(fieldWestItems, fieldHudRoot, gameHudType, 'FieldWest HudRoot');
  assertNodeHasComponent(fieldWestItems, assertNodeExists(fieldWestItems, 'FieldBackdrop'), sceneDressingSkinType, 'FieldBackdrop');
  assertNodeHasComponent(fieldWestItems, assertNodeExists(fieldWestItems, 'FieldLane'), sceneDressingSkinType, 'FieldLane');
  assertNodeHasComponent(fieldWestItems, assertNodeExists(fieldWestItems, 'TrapLane'), sceneDressingSkinType, 'TrapLane');
  assertNodeHasComponent(fieldWestItems, assertNodeExists(fieldWestItems, 'Trap-West'), sceneDressingSkinType, 'Trap-West');
  assertWarmPlaceholderBinding(fieldWestItems, 'Checkpoint-FieldWest', 'checkpoint');
  assertWarmPlaceholderBinding(fieldWestItems, 'Checkpoint-FieldWestReturn', 'checkpoint');
  assertWarmPlaceholderBinding(fieldWestItems, 'Portal-StartCamp', 'portal');
  assertWarmPlaceholderBinding(fieldWestItems, 'Portal-FieldRuins', 'portal');
  assertNodeHasComponent(
    fieldWestItems,
    assertNodeExists(fieldWestItems, 'EchoPickup-Flower-West'),
    collectiblePresentationType,
    'EchoPickup-Flower-West',
  );
  const fieldBackdropBinding = getComponentRecordForNode(
    fieldWestItems,
    assertNodeExists(fieldWestItems, 'FieldBackdrop'),
    assetBindingTagType,
    'FieldBackdrop AssetBindingTag',
  );
  const fieldEnemyVisual = getComponentRecordForNode(
    fieldWestItems,
    assertNodeExists(fieldWestItems, 'FieldEnemy'),
    enemyVisualType,
    'FieldEnemy VisualController',
  );
  assert.equal(fieldBackdropBinding.bindingKey, 'outdoor_ground_green');
  assert.equal(fieldEnemyVisual.idleTexture, null, 'FieldEnemy should stay image-free during the key gameplay placeholder pass.');
  assertWarmPlaceholderBinding(fieldWestItems, 'FieldEnemy', 'common_enemy');
  assertNodeHasComponent(
    fieldWestItems,
    assertNodeExists(fieldWestItems, 'TouchHudRoot'),
    'cc.SafeArea',
    'FieldWest TouchHudRoot',
  );

  assertNodeHasComponent(fieldRuinsItems, ruinsPersistentRoot, sceneLoaderType, 'FieldRuins PersistentRoot');
  assertNodeHasComponent(fieldRuinsItems, ruinsPersistentRoot, sceneMusicType, 'FieldRuins PersistentRoot');
  assertNodeHasComponent(fieldRuinsItems, assertNodeExists(fieldRuinsItems, 'Player'), playerVisualType, 'FieldRuins Player');
  assertNodeHasComponent(fieldRuinsItems, assertNodeExists(fieldRuinsItems, 'RuinsEnemy'), enemyVisualType, 'RuinsEnemy');
  assertNodeHasComponent(fieldRuinsItems, ruinsPortal, scenePortalType, 'Portal-DungeonPreview');
  assertNodeHasComponent(fieldRuinsItems, ruinsHudRoot, 'cc.SafeArea', 'FieldRuins HudRoot');
  assertNodeHasComponent(fieldRuinsItems, ruinsHudRoot, gameHudType, 'FieldRuins HudRoot');
  const ruinsWallClosed = assertNodeExists(fieldRuinsItems, 'RuinsWall-Closed');
  const ruinsWallOpen = assertNodeExists(fieldRuinsItems, 'RuinsWall-Open');
  assertNodeHasComponent(fieldRuinsItems, assertNodeExists(fieldRuinsItems, 'RuinsBackdrop'), sceneDressingSkinType, 'RuinsBackdrop');
  assertNodeHasComponent(fieldRuinsItems, assertNodeExists(fieldRuinsItems, 'RuinsLane'), sceneDressingSkinType, 'RuinsLane');
  assertNodeHasComponent(fieldRuinsItems, assertNodeExists(fieldRuinsItems, 'CrackedWallZone'), sceneDressingSkinType, 'CrackedWallZone');
  assertNodeHasComponent(fieldRuinsItems, ruinsWallClosed, sceneDressingSkinType, 'RuinsWall-Closed');
  assertWarmPlaceholderBinding(fieldRuinsItems, 'Checkpoint-FieldRuins', 'checkpoint');
  assertWarmPlaceholderBinding(fieldRuinsItems, 'Portal-FieldWestReturn', 'portal');
  assertWarmPlaceholderBinding(fieldRuinsItems, 'Portal-DungeonHub', 'portal');
  assertNodeHasComponent(
    fieldRuinsItems,
    assertNodeExists(fieldRuinsItems, 'EchoPickup-Bomb-Ruins'),
    collectiblePresentationType,
    'EchoPickup-Bomb-Ruins',
  );
  const ruinsBackdropBinding = getComponentRecordForNode(
    fieldRuinsItems,
    assertNodeExists(fieldRuinsItems, 'RuinsBackdrop'),
    assetBindingTagType,
    'RuinsBackdrop AssetBindingTag',
  );
  const ruinsEnemyVisual = getComponentRecordForNode(
    fieldRuinsItems,
    assertNodeExists(fieldRuinsItems, 'RuinsEnemy'),
    enemyVisualType,
    'RuinsEnemy VisualController',
  );
  assert.equal(ruinsBackdropBinding.bindingKey, 'outdoor_ground_ruins');
  assert.equal(ruinsEnemyVisual.idleTexture, null, 'RuinsEnemy should stay image-free during the key gameplay placeholder pass.');
  assertWarmPlaceholderBinding(fieldRuinsItems, 'RuinsEnemy', 'common_enemy');
  const ruinsBreakable = getComponentRecordForNode(fieldRuinsItems, ruinsWallClosed, breakableTargetType, 'RuinsWall-Closed');
  assertComponentNodeReference(fieldRuinsItems, ruinsBreakable, 'intactVisualNode', ruinsWallClosed, 'RuinsWall-Closed BreakableTarget');
  assertComponentNodeReference(fieldRuinsItems, ruinsBreakable, 'brokenVisualNode', ruinsWallOpen, 'RuinsWall-Closed BreakableTarget');
  const campMusic = getComponentRecordForNode(startCampItems, startPersistentRoot, sceneMusicType, 'StartCamp SceneMusicController');
  const fieldMusic = getComponentRecordForNode(fieldWestItems, fieldPersistentRoot, sceneMusicType, 'FieldWest SceneMusicController');
  const ruinsMusic = getComponentRecordForNode(fieldRuinsItems, ruinsPersistentRoot, sceneMusicType, 'FieldRuins SceneMusicController');
  assert.equal(campMusic.musicCueId, 'camp');
  assert.equal(fieldMusic.musicCueId, 'field-west');
  assert.equal(ruinsMusic.musicCueId, 'field-ruins');
  assertNodeHasComponent(
    fieldRuinsItems,
    assertNodeExists(fieldRuinsItems, 'TouchHudRoot'),
    'cc.SafeArea',
    'FieldRuins TouchHudRoot',
  );
});

test('StartCamp gate begins closed and later scenes expose the right open paths', async () => {
  const startCampItems = await readAssetJson('assets/scenes/StartCamp.scene');
  const fieldWestItems = await readAssetJson('assets/scenes/FieldWest.scene');
  const fieldRuinsItems = await readAssetJson('assets/scenes/FieldRuins.scene');

  const campGateClosed = assertNodeExists(startCampItems, 'CampGate-Closed');
  const campGateOpen = assertNodeExists(startCampItems, 'CampGate-Open');
  const campPortal = assertNodeExists(startCampItems, 'Portal-FieldWest');
  const touchPause = assertNodeExists(startCampItems, 'TouchPause');
  const pausePanel = assertNodeExists(startCampItems, 'PausePanel');
  const campVictoryBanner = assertNodeExists(startCampItems, 'CampVictoryBanner');
  const campVictoryHint = assertNodeExists(startCampItems, 'CampVictoryHint');
  const fieldPortalBack = assertNodeExists(fieldWestItems, 'Portal-StartCamp');
  const fieldRuinsPortal = assertNodeExists(fieldWestItems, 'Portal-FieldRuins');
  const ruinsPortalBack = assertNodeExists(fieldRuinsItems, 'Portal-FieldWestReturn');
  const ruinsWallClosed = assertNodeExists(fieldRuinsItems, 'RuinsWall-Closed');
  const ruinsWallOpen = assertNodeExists(fieldRuinsItems, 'RuinsWall-Open');
  const dungeonPortal = assertNodeExists(fieldRuinsItems, 'Portal-DungeonHub');

  assertNodeActiveState(campGateClosed, true);
  assertNodeActiveState(campGateOpen, false);
  assertNodeActiveState(campPortal, false);
  assertNodeActiveState(touchPause, true);
  assertNodeActiveState(pausePanel, false);
  assertNodeActiveState(campVictoryBanner, false);
  assertNodeActiveState(campVictoryHint, false);
  assertNodeActiveState(fieldPortalBack, true);
  assertNodeActiveState(fieldRuinsPortal, true);
  assertNodeActiveState(ruinsPortalBack, true);
  assertNodeActiveState(ruinsWallClosed, true);
  assertNodeActiveState(ruinsWallOpen, false);
  assertNodeActiveState(dungeonPortal, false);

  const campPlayers = startCampItems.filter((item) => item?.__type__ === 'cc.Node' && item._name === 'Player');
  const fieldPlayers = fieldWestItems.filter((item) => item?.__type__ === 'cc.Node' && item._name === 'Player');
  const ruinsPlayers = fieldRuinsItems.filter((item) => item?.__type__ === 'cc.Node' && item._name === 'Player');
  assert.equal(campPlayers.length, 1);
  assert.equal(fieldPlayers.length, 1);
  assert.equal(ruinsPlayers.length, 1);
});
