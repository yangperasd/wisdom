import test from 'node:test';
import {
  assertNodeActiveState,
  assertNodeExists,
  assertNodeHasComponent,
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

  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'BossGateController'), flagGateType, 'BossGateController');
  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'RoomA-StatusController'), flagGateType, 'RoomA-StatusController');
  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'RoomB-StatusController'), flagGateType, 'RoomB-StatusController');
  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'RoomC-StatusController'), flagGateType, 'RoomC-StatusController');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomA-ClearRelic'), progressPickupType, 'RoomA-ClearRelic');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomA-GateBarrier'), barrierZoneType, 'RoomA-GateBarrier');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-TopBarrier'), barrierZoneType, 'RoomB-TopBarrier');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-BottomBarrier'), barrierZoneType, 'RoomB-BottomBarrier');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-GapHazard'), respawnZoneType, 'RoomB-GapHazard');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-TopBarrier'), barrierZoneType, 'RoomC-TopBarrier');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-BottomBarrier'), barrierZoneType, 'RoomC-BottomBarrier');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-WallBarrier'), barrierZoneType, 'RoomC-WallBarrier');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-WallClosed'), breakableTargetType, 'RoomC-WallClosed');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'BossEncounterControllerNode'), bossControllerType, 'BossEncounterControllerNode');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'BossShieldControllerNode'), bossShieldType, 'BossShieldControllerNode');
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
