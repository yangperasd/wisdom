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

const TOUCH_COMMAND = {
  Attack: 0,
  PlaceEcho: 1,
  Respawn: 2,
  EchoBox: 3,
  EchoFlower: 4,
  EchoBomb: 5,
  PauseToggle: 8,
  Resume: 9,
  ReturnToCamp: 10,
};

function assertNonEmptyString(value, label) {
  assert.equal(typeof value, 'string', `${label} must be a string.`);
  assert.ok(value.trim().length > 0, `${label} must not be empty.`);
}

function assertComponentReference(items, componentRecord, propertyName, targetComponentRecord, label) {
  const reference = componentRecord?.[propertyName];
  assert.ok(
    reference && typeof reference.__id__ === 'number',
    `Expected component "${label}" to contain a component reference in "${propertyName}".`,
  );
  assert.equal(
    items[reference.__id__],
    targetComponentRecord,
    `Expected component "${label}" property "${propertyName}" to reference the target component.`,
  );
}

function assertEnabled(componentRecord, label) {
  assert.notEqual(componentRecord?._enabled, false, `${label} component must be enabled.`);
}

function assertDirectParent(items, childNode, parentNode, label) {
  assert.equal(
    items[childNode?._parent?.__id__],
    parentNode,
    `${label} should be parented under ${parentNode?._name}.`,
  );
}

async function assertScenePortal(items, nodeName, portalTypeId, targetScene, targetMarkerId) {
  const node = assertNodeExists(items, nodeName);
  const portal = getComponentRecordForNode(items, node, portalTypeId, nodeName);
  assert.equal(portal.targetScene, targetScene, `${nodeName} should target ${targetScene}.`);
  assert.equal(portal.targetMarkerId, targetMarkerId, `${nodeName} should target ${targetMarkerId}.`);
}

function assertTouchButtonCommand(items, sceneName, nodeName, touchButtonType, expectedCommand, playerController) {
  const buttonNode = assertNodeExists(items, nodeName);
  assertNodeActiveState(buttonNode, true);
  const button = getComponentRecordForNode(items, buttonNode, touchButtonType, `${sceneName} ${nodeName}`);
  assertEnabled(button, `${sceneName} ${nodeName}`);
  assert.equal(button.command, expectedCommand, `${sceneName} ${nodeName} should execute command ${expectedCommand}.`);
  assertComponentReference(items, button, 'player', playerController, `${sceneName} ${nodeName}`);
  return buttonNode;
}

async function assertLaunchHud(items, sceneName, scriptTypes) {
  const { gameHudType, pauseMenuType, playerControllerType, touchJoystickType, touchButtonType } = scriptTypes;
  const canvas = assertNodeExists(items, 'Canvas');
  const hudRoot = assertNodeExists(items, 'HudRoot');
  const touchHudRoot = assertNodeExists(items, 'TouchHudRoot');
  const playerNode = assertNodeExists(items, 'Player');
  assertNodeActiveState(hudRoot, true);
  assertNodeActiveState(touchHudRoot, true);
  assertDirectParent(items, hudRoot, canvas, `${sceneName} HudRoot`);
  assertDirectParent(items, touchHudRoot, canvas, `${sceneName} TouchHudRoot`);
  const playerController = getComponentRecordForNode(items, playerNode, playerControllerType, `${sceneName} Player`);
  const gameHud = getComponentRecordForNode(items, hudRoot, gameHudType, `${sceneName} HudRoot GameHud`);
  const pauseMenu = getComponentRecordForNode(items, hudRoot, pauseMenuType, `${sceneName} HudRoot PauseMenuController`);
  const joystickNode = assertNodeExists(items, 'Joystick');
  assertNodeActiveState(joystickNode, true);
  const joystick = getComponentRecordForNode(items, joystickNode, touchJoystickType, `${sceneName} Joystick`);
  const attackNode = assertTouchButtonCommand(items, sceneName, 'TouchAttack', touchButtonType, TOUCH_COMMAND.Attack, playerController);
  const summonNode = assertTouchButtonCommand(items, sceneName, 'TouchPlaceEcho', touchButtonType, TOUCH_COMMAND.PlaceEcho, playerController);
  const respawnNode = assertTouchButtonCommand(items, sceneName, 'TouchRespawn', touchButtonType, TOUCH_COMMAND.Respawn, playerController);
  const echoBoxNode = assertTouchButtonCommand(items, sceneName, 'TouchEchoBox', touchButtonType, TOUCH_COMMAND.EchoBox, playerController);
  const echoFlowerNode = assertTouchButtonCommand(items, sceneName, 'TouchEchoFlower', touchButtonType, TOUCH_COMMAND.EchoFlower, playerController);
  const echoBombNode = assertTouchButtonCommand(items, sceneName, 'TouchEchoBomb', touchButtonType, TOUCH_COMMAND.EchoBomb, playerController);
  const pauseNode = assertTouchButtonCommand(items, sceneName, 'TouchPause', touchButtonType, TOUCH_COMMAND.PauseToggle, playerController);

  assertNodeHasComponent(items, touchHudRoot, 'cc.SafeArea', `${sceneName} TouchHudRoot`);
  assertEnabled(playerController, `${sceneName} PlayerController`);
  assertEnabled(gameHud, `${sceneName} GameHud`);
  assertEnabled(pauseMenu, `${sceneName} PauseMenuController`);
  assertEnabled(joystick, `${sceneName} Joystick`);
  assertComponentReference(items, joystick, 'player', playerController, `${sceneName} Joystick`);
  assertComponentNodeReference(items, gameHud, 'joystick', joystickNode, `${sceneName} GameHud`);
  assertComponentNodeReference(items, gameHud, 'attackButton', attackNode, `${sceneName} GameHud`);
  assertComponentNodeReference(items, gameHud, 'summonButton', summonNode, `${sceneName} GameHud`);
  assertComponentNodeReference(items, gameHud, 'resetButton', respawnNode, `${sceneName} GameHud`);
  assertComponentNodeReference(items, gameHud, 'pauseButton', pauseNode, `${sceneName} GameHud`);
  assertComponentNodeReference(items, gameHud, 'echoBoxButton', echoBoxNode, `${sceneName} GameHud`);
  assertComponentNodeReference(items, gameHud, 'echoFlowerButton', echoFlowerNode, `${sceneName} GameHud`);
  assertComponentNodeReference(items, gameHud, 'echoBombButton', echoBombNode, `${sceneName} GameHud`);

  const pausePanel = assertNodeExists(items, 'PausePanel');
  assertDirectParent(items, joystickNode, touchHudRoot, `${sceneName} Joystick`);
  assertDirectParent(items, attackNode, touchHudRoot, `${sceneName} TouchAttack`);
  assertDirectParent(items, summonNode, touchHudRoot, `${sceneName} TouchPlaceEcho`);
  assertDirectParent(items, respawnNode, touchHudRoot, `${sceneName} TouchRespawn`);
  assertDirectParent(items, echoBoxNode, touchHudRoot, `${sceneName} TouchEchoBox`);
  assertDirectParent(items, echoFlowerNode, touchHudRoot, `${sceneName} TouchEchoFlower`);
  assertDirectParent(items, echoBombNode, touchHudRoot, `${sceneName} TouchEchoBomb`);
  assertDirectParent(items, pauseNode, touchHudRoot, `${sceneName} TouchPause`);
  assertDirectParent(items, pausePanel, hudRoot, `${sceneName} PausePanel`);
  assertNodeActiveState(pausePanel, false);
  assertComponentNodeReference(items, pauseMenu, 'panelRoot', pausePanel, `${sceneName} PauseMenuController`);
  assertComponentNodeReference(items, pauseMenu, 'pauseButton', pauseNode, `${sceneName} PauseMenuController`);
  const pauseTouchNames = new Set(
    (pauseMenu.gameplayTouchNodes ?? [])
      .map((nodeRef) => items[nodeRef.__id__]?._name)
      .filter(Boolean),
  );
  for (const touchNodeName of [
    'Joystick',
    'TouchAttack',
    'TouchPlaceEcho',
    'TouchRespawn',
    'TouchEchoBox',
    'TouchEchoFlower',
    'TouchEchoBomb',
  ]) {
    assert.ok(
      pauseTouchNames.has(touchNodeName),
      `${sceneName} PauseMenuController should manage ${touchNodeName} during pause.`,
    );
  }

  const pauseContinueNode = assertTouchButtonCommand(
    items,
    sceneName,
    'PauseContinue',
    touchButtonType,
    TOUCH_COMMAND.Resume,
    playerController,
  );
  const pauseRestartNode = assertTouchButtonCommand(
    items,
    sceneName,
    'PauseRestart',
    touchButtonType,
    TOUCH_COMMAND.Respawn,
    playerController,
  );
  const pauseCampNode = assertTouchButtonCommand(
    items,
    sceneName,
    'PauseCamp',
    touchButtonType,
    TOUCH_COMMAND.ReturnToCamp,
    playerController,
  );
  assertDirectParent(items, pauseContinueNode, pausePanel, `${sceneName} PauseContinue`);
  assertDirectParent(items, pauseRestartNode, pausePanel, `${sceneName} PauseRestart`);
  assertDirectParent(items, pauseCampNode, pausePanel, `${sceneName} PauseCamp`);

  assertNonEmptyString(gameHud.sceneTitle, `${sceneName} GameHud.sceneTitle`);
  assertNonEmptyString(gameHud.objectiveText, `${sceneName} GameHud.objectiveText`);
  assertNonEmptyString(gameHud.mobileHintText, `${sceneName} GameHud.mobileHintText`);
  assert.match(gameHud.mobileHintText, /摇杆|Touch/i, `${sceneName} mobile hint should mention touch movement.`);
  assert.match(gameHud.mobileHintText, /按钮|button|攻击|召唤/i, `${sceneName} mobile hint should mention tappable actions.`);
  assert.ok(gameHud.sceneTitleLabel?.__id__ != null, `${sceneName} GameHud.sceneTitleLabel must be bound.`);
  assert.ok(gameHud.objectiveLabel?.__id__ != null, `${sceneName} GameHud.objectiveLabel must be bound.`);
}

test('first-session structural gate keeps the touch-only MVP loop connected', async () => {
  // Structural gate only: this proves the first-session touch flow is wired,
  // but it does not claim a real continuous playthrough is already release-green.
  const portalTypeId = await getScriptTypeId('assets/scripts/core/ScenePortal.ts');
  const gameHudType = await getScriptTypeId('assets/scripts/ui/GameHud.ts');
  const scriptTypes = {
    gameHudType,
    pauseMenuType: await getScriptTypeId('assets/scripts/ui/PauseMenuController.ts'),
    playerControllerType: await getScriptTypeId('assets/scripts/player/PlayerController.ts'),
    touchJoystickType: await getScriptTypeId('assets/scripts/input/TouchJoystick.ts'),
    touchButtonType: await getScriptTypeId('assets/scripts/input/TouchCommandButton.ts'),
  };

  const startCamp = await readAssetJson('assets/scenes/StartCamp.scene');
  const fieldWest = await readAssetJson('assets/scenes/FieldWest.scene');
  const fieldRuins = await readAssetJson('assets/scenes/FieldRuins.scene');
  const dungeonHub = await readAssetJson('assets/scenes/DungeonHub.scene');
  const dungeonRoomA = await readAssetJson('assets/scenes/DungeonRoomA.scene');
  const dungeonRoomB = await readAssetJson('assets/scenes/DungeonRoomB.scene');
  const dungeonRoomC = await readAssetJson('assets/scenes/DungeonRoomC.scene');
  const bossArena = await readAssetJson('assets/scenes/BossArena.scene');

  await assertLaunchHud(startCamp, 'StartCamp', scriptTypes);
  await assertLaunchHud(fieldWest, 'FieldWest', scriptTypes);
  await assertLaunchHud(fieldRuins, 'FieldRuins', scriptTypes);
  await assertLaunchHud(dungeonHub, 'DungeonHub', scriptTypes);
  await assertLaunchHud(dungeonRoomA, 'DungeonRoomA', scriptTypes);
  await assertLaunchHud(dungeonRoomB, 'DungeonRoomB', scriptTypes);
  await assertLaunchHud(dungeonRoomC, 'DungeonRoomC', scriptTypes);
  await assertLaunchHud(bossArena, 'BossArena', scriptTypes);

  const startCampHud = getComponentRecordForNode(
    startCamp,
    assertNodeExists(startCamp, 'HudRoot'),
    gameHudType,
    'StartCamp HudRoot GameHud',
  );
  assert.match(startCampHud.sceneTitle, /营地|Camp/i, 'StartCamp should explain where the player is.');
  assert.match(startCampHud.objectiveText, /西侧|FieldWest|栅门|机关/i, 'StartCamp should point the player toward the route.');
  assert.match(startCampHud.objectiveText, /召唤|箱子|机关/i, 'StartCamp should expose the first tappable action goal.');

  await assertScenePortal(startCamp, 'Portal-FieldWest', portalTypeId, 'FieldWest', 'field-west-entry');
  await assertScenePortal(fieldWest, 'Portal-StartCamp', portalTypeId, 'StartCamp', 'camp-return');
  await assertScenePortal(fieldWest, 'Portal-FieldRuins', portalTypeId, 'FieldRuins', 'field-ruins-entry');
  await assertScenePortal(fieldRuins, 'Portal-FieldWestReturn', portalTypeId, 'FieldWest', 'field-west-return');
  await assertScenePortal(fieldRuins, 'Portal-DungeonHub', portalTypeId, 'DungeonHub', 'dungeon-hub-entry');
  await assertScenePortal(dungeonHub, 'Portal-DungeonRoomA', portalTypeId, 'DungeonRoomA', 'dungeon-room-a-entry');
  await assertScenePortal(dungeonHub, 'Portal-DungeonRoomB', portalTypeId, 'DungeonRoomB', 'dungeon-room-b-entry');
  await assertScenePortal(dungeonHub, 'Portal-DungeonRoomC', portalTypeId, 'DungeonRoomC', 'dungeon-room-c-entry');
  await assertScenePortal(dungeonHub, 'Portal-BossArena', portalTypeId, 'BossArena', 'boss-arena-entry');
  await assertScenePortal(dungeonRoomA, 'Portal-DungeonHubReturn-A', portalTypeId, 'DungeonHub', 'dungeon-hub-entry');
  await assertScenePortal(dungeonRoomB, 'Portal-DungeonHubReturn-B', portalTypeId, 'DungeonHub', 'dungeon-hub-entry');
  await assertScenePortal(dungeonRoomC, 'Portal-DungeonHubReturn-C', portalTypeId, 'DungeonHub', 'dungeon-hub-entry');
  await assertScenePortal(bossArena, 'Portal-BossVictory', portalTypeId, 'StartCamp', 'camp-entry');

  assertNodeExists(dungeonRoomA, 'RoomABackdrop');
  assertNodeExists(dungeonRoomA, 'RoomAChallengeZone');
  assertNodeExists(dungeonRoomA, 'RoomA-Plate');
  assertNodeExists(dungeonRoomA, 'RoomA-ClearRelic');
  assertNodeExists(dungeonRoomA, 'RoomAHint');

  assertNodeExists(dungeonRoomB, 'RoomBBackdrop');
  assertNodeExists(dungeonRoomB, 'RoomBTrapLane');
  assertNodeExists(dungeonRoomB, 'RoomB-Trap');
  assertNodeExists(dungeonRoomB, 'RoomB-GapHazard');
  assertNodeExists(dungeonRoomB, 'RoomBHint');
  assertNodeExists(dungeonRoomB, 'RoomB-ClearRelic');

  assertNodeExists(dungeonRoomC, 'RoomCBackdrop');
  assertNodeExists(dungeonRoomC, 'RoomCBombZone');
  assertNodeExists(dungeonRoomC, 'RoomC-WallClosed');
  assertNodeExists(dungeonRoomC, 'RoomCHint');
  assertNodeExists(dungeonRoomC, 'RoomC-ClearRelic');

  assertNodeExists(bossArena, 'BossEnemy-Core');
  assertNodeExists(bossArena, 'BossShield-Closed');
  assertNodeExists(bossArena, 'BossShield-Open');
  assertNodeExists(bossArena, 'BossEncounterControllerNode');
  assertNodeExists(bossArena, 'BossShieldControllerNode');
  assertNodeExists(bossArena, 'BossStatusBanner');
  assertNodeExists(bossArena, 'BossWindowBanner');
  assertNodeExists(bossArena, 'BossVictoryBanner');

  const bossArenaHud = getComponentRecordForNode(
    bossArena,
    assertNodeExists(bossArena, 'HudRoot'),
    gameHudType,
    'BossArena HudRoot GameHud',
  );
  assert.match(bossArenaHud.objectiveText, /破盾|输出/, 'BossArena should surface the short boss phase cues in the HUD objective.');
  assert.match(bossArenaHud.objectiveText, /回营地/, 'BossArena should keep the return instruction in the HUD objective instead of a second world-space hint.');
});
