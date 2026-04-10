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

test('DungeonHub scene includes room portals and the locked boss gate', async () => {
  const items = await readAssetJson('assets/scenes/DungeonHub.scene');

  const expectedNodes = [
    'Canvas',
    'PersistentRoot',
    'WorldRoot',
    'HudRoot',
    'TouchHudRoot',
    'Player',
    'Checkpoint-DungeonHub',
    'Portal-FieldRuinsReturn',
    'Portal-DungeonRoomA',
    'Portal-DungeonRoomB',
    'Portal-DungeonRoomC',
    'RoomA-StatusPending',
    'RoomA-StatusDone',
    'RoomB-StatusPending',
    'RoomB-StatusDone',
    'RoomC-StatusPending',
    'RoomC-StatusDone',
    'BossGate-Closed',
    'BossGate-Open',
    'Portal-BossArena',
    'BossGateController',
  ];

  for (const nodeName of expectedNodes) {
    assertNodeExists(items, nodeName);
  }
});

test('Dungeon rooms and boss arena include their key progression nodes', async () => {
  const roomA = await readAssetJson('assets/scenes/DungeonRoomA.scene');
  const roomB = await readAssetJson('assets/scenes/DungeonRoomB.scene');
  const roomC = await readAssetJson('assets/scenes/DungeonRoomC.scene');
  const bossArena = await readAssetJson('assets/scenes/BossArena.scene');

  [
    ['DungeonRoomA', roomA, ['RoomA-Plate', 'RoomA-GateClosed', 'RoomA-GateBarrier', 'RoomA-ClearRelic', 'Portal-DungeonHubReturn-A']],
    ['DungeonRoomB', roomB, ['RoomB-Trap', 'RoomB-GapHazard', 'RoomB-TopBarrier', 'RoomB-BottomBarrier', 'RoomB-ClearRelic', 'Portal-DungeonHubReturn-B']],
    ['DungeonRoomC', roomC, ['RoomC-WallClosed', 'RoomC-WallBarrier', 'RoomC-TopBarrier', 'RoomC-BottomBarrier', 'RoomC-ClearRelic', 'Portal-DungeonHubReturn-C']],
    ['BossArena', bossArena, ['BossEnemy-Core', 'BossShield-Closed', 'BossShield-Open', 'BossWindowBanner', 'BossReturnHint', 'Portal-BossVictory', 'BossEncounterControllerNode', 'BossShieldControllerNode']],
  ].forEach(([, items, nodeNames]) => {
    for (const nodeName of nodeNames) {
      assertNodeExists(items, nodeName);
    }
  });
});

test('Dungeon scenes wire the progress and boss control scripts', async () => {
  const hubItems = await readAssetJson('assets/scenes/DungeonHub.scene');
  const roomAItems = await readAssetJson('assets/scenes/DungeonRoomA.scene');
  const roomBItems = await readAssetJson('assets/scenes/DungeonRoomB.scene');
  const roomCItems = await readAssetJson('assets/scenes/DungeonRoomC.scene');
  const bossArenaItems = await readAssetJson('assets/scenes/BossArena.scene');

  const flagGateType = await getScriptTypeId('assets/scripts/core/FlagGateController.ts');
  const progressPickupType = await getScriptTypeId('assets/scripts/core/ProgressFlagPickup.ts');
  const breakableTargetType = await getScriptTypeId('assets/scripts/puzzle/BreakableTarget.ts');
  const barrierZoneType = await getScriptTypeId('assets/scripts/puzzle/PlayerBarrierZone.ts');
  const respawnZoneType = await getScriptTypeId('assets/scripts/puzzle/PlayerRespawnZone.ts');
  const bossControllerType = await getScriptTypeId('assets/scripts/boss/BossEncounterController.ts');
  const bossShieldType = await getScriptTypeId('assets/scripts/boss/BossShieldPhaseController.ts');
  const collectiblePresentationType = await getScriptTypeId('assets/scripts/visual/CollectiblePresentation.ts');
  const sceneMusicType = await getScriptTypeId('assets/scripts/audio/SceneMusicController.ts');
  const sceneDressingSkinType = await getScriptTypeId('assets/scripts/visual/SceneDressingSkin.ts');
  const playerVisualType = await getScriptTypeId('assets/scripts/player/PlayerVisualController.ts');
  const enemyVisualType = await getScriptTypeId('assets/scripts/enemy/EnemyVisualController.ts');
  const bossVisualType = await getScriptTypeId('assets/scripts/boss/BossVisualController.ts');
  const assetBindingTagType = await getScriptTypeId('assets/scripts/core/AssetBindingTag.ts');

  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'BossGateController'), flagGateType, 'BossGateController');
  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'PersistentRoot'), sceneMusicType, 'DungeonHub PersistentRoot');
  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'Player'), playerVisualType, 'DungeonHub Player');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'PersistentRoot'), sceneMusicType, 'DungeonRoomA PersistentRoot');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'Player'), playerVisualType, 'DungeonRoomA Player');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomABackdrop'), sceneDressingSkinType, 'DungeonRoomA RoomABackdrop');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomAChallengeZone'), sceneDressingSkinType, 'DungeonRoomA RoomAChallengeZone');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomA-GateClosed'), sceneDressingSkinType, 'DungeonRoomA RoomA-GateClosed');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'PersistentRoot'), sceneMusicType, 'DungeonRoomB PersistentRoot');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'Player'), playerVisualType, 'DungeonRoomB Player');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomBBackdrop'), sceneDressingSkinType, 'DungeonRoomB RoomBBackdrop');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomBTrapLane'), sceneDressingSkinType, 'DungeonRoomB RoomBTrapLane');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomBLandingZone'), sceneDressingSkinType, 'DungeonRoomB RoomBLandingZone');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-Trap'), sceneDressingSkinType, 'DungeonRoomB RoomB-Trap');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'PersistentRoot'), sceneMusicType, 'DungeonRoomC PersistentRoot');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'Player'), playerVisualType, 'DungeonRoomC Player');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomCBackdrop'), sceneDressingSkinType, 'DungeonRoomC RoomCBackdrop');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomCBombZone'), sceneDressingSkinType, 'DungeonRoomC RoomCBombZone');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-WallClosed'), sceneDressingSkinType, 'DungeonRoomC RoomC-WallClosed');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'PersistentRoot'), sceneMusicType, 'BossArena PersistentRoot');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'Player'), playerVisualType, 'BossArena Player');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'BossEnemy-Core'), bossVisualType, 'BossArena BossEnemy-Core');
  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'RoomA-StatusController'), flagGateType, 'RoomA-StatusController');
  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'RoomB-StatusController'), flagGateType, 'RoomB-StatusController');
  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'RoomC-StatusController'), flagGateType, 'RoomC-StatusController');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomA-ClearRelic'), progressPickupType, 'RoomA-ClearRelic');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomA-ClearRelic'), collectiblePresentationType, 'RoomA-ClearRelic');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomA-ClearRelic'), assetBindingTagType, 'RoomA-ClearRelic');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomA-Enemy'), enemyVisualType, 'RoomA-Enemy');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomA-GateBarrier'), barrierZoneType, 'RoomA-GateBarrier');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-TopBarrier'), barrierZoneType, 'RoomB-TopBarrier');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-BottomBarrier'), barrierZoneType, 'RoomB-BottomBarrier');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-GapHazard'), respawnZoneType, 'RoomB-GapHazard');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-ClearRelic'), collectiblePresentationType, 'RoomB-ClearRelic');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-ClearRelic'), assetBindingTagType, 'RoomB-ClearRelic');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-Enemy'), enemyVisualType, 'RoomB-Enemy');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-TopBarrier'), barrierZoneType, 'RoomC-TopBarrier');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-BottomBarrier'), barrierZoneType, 'RoomC-BottomBarrier');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-WallBarrier'), barrierZoneType, 'RoomC-WallBarrier');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-WallClosed'), breakableTargetType, 'RoomC-WallClosed');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-ClearRelic'), collectiblePresentationType, 'RoomC-ClearRelic');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-ClearRelic'), assetBindingTagType, 'RoomC-ClearRelic');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-Enemy'), enemyVisualType, 'RoomC-Enemy');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'BossShield-Closed'), breakableTargetType, 'BossShield-Closed');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'BossEnemy-Core'), assetBindingTagType, 'BossEnemy-Core');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'BossShield-Closed'), assetBindingTagType, 'BossShield-Closed');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'BossEncounterControllerNode'), bossControllerType, 'BossEncounterControllerNode');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'BossShieldControllerNode'), bossShieldType, 'BossShieldControllerNode');

  const roomCWallClosed = assertNodeExists(roomCItems, 'RoomC-WallClosed');
  const roomCWallOpen = assertNodeExists(roomCItems, 'RoomC-WallOpen');
  const roomCBreakable = getComponentRecordForNode(roomCItems, roomCWallClosed, breakableTargetType, 'RoomC-WallClosed');
  assertComponentNodeReference(roomCItems, roomCBreakable, 'intactVisualNode', roomCWallClosed, 'RoomC-WallClosed BreakableTarget');
  assertComponentNodeReference(roomCItems, roomCBreakable, 'brokenVisualNode', roomCWallOpen, 'RoomC-WallClosed BreakableTarget');

  const bossShieldClosed = assertNodeExists(bossArenaItems, 'BossShield-Closed');
  const bossShieldOpen = assertNodeExists(bossArenaItems, 'BossShield-Open');
  const bossShieldBreakable = getComponentRecordForNode(bossArenaItems, bossShieldClosed, breakableTargetType, 'BossShield-Closed');
  assertComponentNodeReference(bossArenaItems, bossShieldBreakable, 'intactVisualNode', bossShieldClosed, 'BossShield-Closed BreakableTarget');
  assertComponentNodeReference(bossArenaItems, bossShieldBreakable, 'brokenVisualNode', bossShieldOpen, 'BossShield-Closed BreakableTarget');
  const bossCore = assertNodeExists(bossArenaItems, 'BossEnemy-Core');
  const bossCoreVisual = assertNodeExists(bossArenaItems, 'BossEnemy-Core-Visual');
  const bossVisualController = getComponentRecordForNode(bossArenaItems, bossCore, bossVisualType, 'BossEnemy-Core');
  const roomARelicBinding = getComponentRecordForNode(roomAItems, assertNodeExists(roomAItems, 'RoomA-ClearRelic'), assetBindingTagType, 'RoomA-ClearRelic AssetBindingTag');
  const roomABackdropBinding = getComponentRecordForNode(roomAItems, assertNodeExists(roomAItems, 'RoomABackdrop'), assetBindingTagType, 'RoomABackdrop AssetBindingTag');
  const roomBRelicBinding = getComponentRecordForNode(roomBItems, assertNodeExists(roomBItems, 'RoomB-ClearRelic'), assetBindingTagType, 'RoomB-ClearRelic AssetBindingTag');
  const roomBBackdropBinding = getComponentRecordForNode(roomBItems, assertNodeExists(roomBItems, 'RoomBBackdrop'), assetBindingTagType, 'RoomBBackdrop AssetBindingTag');
  const roomCRelicBinding = getComponentRecordForNode(roomCItems, assertNodeExists(roomCItems, 'RoomC-ClearRelic'), assetBindingTagType, 'RoomC-ClearRelic AssetBindingTag');
  const roomCBackdropBinding = getComponentRecordForNode(roomCItems, assertNodeExists(roomCItems, 'RoomCBackdrop'), assetBindingTagType, 'RoomCBackdrop AssetBindingTag');
  const bossCoreBinding = getComponentRecordForNode(bossArenaItems, bossCore, assetBindingTagType, 'BossEnemy-Core AssetBindingTag');
  const bossShieldBinding = getComponentRecordForNode(bossArenaItems, bossShieldClosed, assetBindingTagType, 'BossShield-Closed AssetBindingTag');
  const bossShieldController = getComponentRecordForNode(bossArenaItems, assertNodeExists(bossArenaItems, 'BossShieldControllerNode'), bossShieldType, 'BossShieldControllerNode');
  assertComponentNodeReference(bossArenaItems, bossVisualController, 'visualRoot', bossCoreVisual, 'BossEnemy-Core BossVisualController');
  assertComponentNodeReference(bossArenaItems, bossVisualController, 'shieldController', bossShieldController, 'BossEnemy-Core BossVisualController');
  assert.ok(bossVisualController.dangerTexture?.__uuid__, 'BossEnemy-Core should bind a texture-backed visual.');
  assert.equal(roomARelicBinding.bindingKey, 'pickup_relic');
  assert.equal(roomABackdropBinding.bindingKey, 'outdoor_ground_green');
  assert.equal(roomBRelicBinding.bindingKey, 'pickup_relic');
  assert.equal(roomBBackdropBinding.bindingKey, 'outdoor_ground_green');
  assert.equal(roomCRelicBinding.bindingKey, 'pickup_relic');
  assert.equal(roomCBackdropBinding.bindingKey, 'outdoor_ground_ruins');
  assert.match(roomARelicBinding.selectedPath, /helmet_enchanted\.png$/);
  assert.equal(bossCoreBinding.bindingKey, 'boss_core');
  assert.match(bossCoreBinding.selectedPath, /seraph\.png$/);
  assert.equal(bossShieldBinding.bindingKey, 'boss_shield_closed');
  assert.equal(
    getComponentRecordForNode(hubItems, assertNodeExists(hubItems, 'PersistentRoot'), sceneMusicType, 'DungeonHub SceneMusicController').musicCueId,
    'dungeon-hub',
  );
  assert.equal(
    getComponentRecordForNode(roomAItems, assertNodeExists(roomAItems, 'PersistentRoot'), sceneMusicType, 'DungeonRoomA SceneMusicController').musicCueId,
    'dungeon-room',
  );
  assert.equal(
    getComponentRecordForNode(roomBItems, assertNodeExists(roomBItems, 'PersistentRoot'), sceneMusicType, 'DungeonRoomB SceneMusicController').musicCueId,
    'dungeon-room',
  );
  assert.equal(
    getComponentRecordForNode(roomCItems, assertNodeExists(roomCItems, 'PersistentRoot'), sceneMusicType, 'DungeonRoomC SceneMusicController').musicCueId,
    'dungeon-room',
  );
  assert.equal(
    getComponentRecordForNode(bossArenaItems, assertNodeExists(bossArenaItems, 'PersistentRoot'), sceneMusicType, 'BossArena SceneMusicController').musicCueId,
    'boss-arena',
  );
});

test('Dungeon initial states keep the boss gate locked and rewards hidden', async () => {
  const hubItems = await readAssetJson('assets/scenes/DungeonHub.scene');
  const roomAItems = await readAssetJson('assets/scenes/DungeonRoomA.scene');
  const roomBItems = await readAssetJson('assets/scenes/DungeonRoomB.scene');
  const roomCItems = await readAssetJson('assets/scenes/DungeonRoomC.scene');
  const bossArenaItems = await readAssetJson('assets/scenes/BossArena.scene');

  assertNodeActiveState(assertNodeExists(hubItems, 'BossGate-Closed'), true);
  assertNodeActiveState(assertNodeExists(hubItems, 'BossGate-Open'), false);
  assertNodeActiveState(assertNodeExists(hubItems, 'Portal-BossArena'), false);
  assertNodeActiveState(assertNodeExists(hubItems, 'RoomA-StatusPending'), true);
  assertNodeActiveState(assertNodeExists(hubItems, 'RoomA-StatusDone'), false);
  assertNodeActiveState(assertNodeExists(hubItems, 'RoomB-StatusPending'), true);
  assertNodeActiveState(assertNodeExists(hubItems, 'RoomB-StatusDone'), false);
  assertNodeActiveState(assertNodeExists(hubItems, 'RoomC-StatusPending'), true);
  assertNodeActiveState(assertNodeExists(hubItems, 'RoomC-StatusDone'), false);

  assertNodeActiveState(assertNodeExists(roomAItems, 'RoomA-ClearRelic'), false);
  assertNodeActiveState(assertNodeExists(roomAItems, 'RoomA-GateBarrier'), true);
  assertNodeActiveState(assertNodeExists(roomBItems, 'RoomB-TopBarrier'), true);
  assertNodeActiveState(assertNodeExists(roomBItems, 'RoomB-BottomBarrier'), true);
  assertNodeActiveState(assertNodeExists(roomBItems, 'RoomB-GapHazard'), true);
  assertNodeActiveState(assertNodeExists(roomCItems, 'RoomC-TopBarrier'), true);
  assertNodeActiveState(assertNodeExists(roomCItems, 'RoomC-BottomBarrier'), true);
  assertNodeActiveState(assertNodeExists(roomCItems, 'RoomC-WallClosed'), true);
  assertNodeActiveState(assertNodeExists(roomCItems, 'RoomC-WallOpen'), false);
  assertNodeActiveState(assertNodeExists(roomCItems, 'RoomC-WallBarrier'), true);
  assertNodeActiveState(assertNodeExists(roomCItems, 'RoomC-ClearRelic'), false);

  assertNodeActiveState(assertNodeExists(bossArenaItems, 'BossShield-Closed'), true);
  assertNodeActiveState(assertNodeExists(bossArenaItems, 'BossShield-Open'), false);
  assertNodeActiveState(assertNodeExists(bossArenaItems, 'Portal-BossVictory'), false);
  assertNodeActiveState(assertNodeExists(bossArenaItems, 'BossVictoryBanner'), false);
  assertNodeActiveState(assertNodeExists(bossArenaItems, 'BossStatusBanner'), true);
  assertNodeActiveState(assertNodeExists(bossArenaItems, 'BossWindowBanner'), false);
  assertNodeActiveState(assertNodeExists(bossArenaItems, 'BossReturnHint'), false);
});
