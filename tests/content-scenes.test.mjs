import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertNodeActiveState,
  assertNodeExists,
  assertNodeHasComponent,
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

  assertNodeHasComponent(fieldWestItems, fieldPersistentRoot, sceneLoaderType, 'FieldWest PersistentRoot');
  assertNodeHasComponent(fieldWestItems, fieldPortal, scenePortalType, 'Portal-FieldRuins');
  assertNodeHasComponent(fieldWestItems, fieldHudRoot, 'cc.SafeArea', 'FieldWest HudRoot');
  assertNodeHasComponent(fieldWestItems, fieldHudRoot, gameHudType, 'FieldWest HudRoot');
  assertNodeHasComponent(
    fieldWestItems,
    assertNodeExists(fieldWestItems, 'TouchHudRoot'),
    'cc.SafeArea',
    'FieldWest TouchHudRoot',
  );

  assertNodeHasComponent(fieldRuinsItems, ruinsPersistentRoot, sceneLoaderType, 'FieldRuins PersistentRoot');
  assertNodeHasComponent(fieldRuinsItems, ruinsPortal, scenePortalType, 'Portal-DungeonPreview');
  assertNodeHasComponent(fieldRuinsItems, ruinsHudRoot, 'cc.SafeArea', 'FieldRuins HudRoot');
  assertNodeHasComponent(fieldRuinsItems, ruinsHudRoot, gameHudType, 'FieldRuins HudRoot');
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
