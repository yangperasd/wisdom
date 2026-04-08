import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertNodeActiveState,
  assertNodeExists,
  assertNodeHasComponent,
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

  const player = assertNodeExists(items, 'Player');
  const worldRoot = assertNodeExists(items, 'WorldRoot');
  const echoRoot = assertNodeExists(items, 'EchoRoot');
  const hudRoot = assertNodeExists(items, 'HudRoot');
  const touchHudRoot = assertNodeExists(items, 'TouchHudRoot');
  const joystick = assertNodeExists(items, 'Joystick');
  const touchAttack = assertNodeExists(items, 'TouchAttack');
  const bombGateRoot = assertNodeExists(items, 'BombGateRoot');

  assertNodeHasComponent(items, player, playerControllerType, 'Player');
  assertNodeHasComponent(items, player, healthType, 'Player');
  assertNodeHasComponent(items, worldRoot, cameraRigType, 'WorldRoot');
  assertNodeHasComponent(items, echoRoot, echoManagerType, 'EchoRoot');
  assertNodeHasComponent(items, hudRoot, 'cc.Widget', 'HudRoot');
  assertNodeHasComponent(items, hudRoot, 'cc.SafeArea', 'HudRoot');
  assertNodeHasComponent(items, touchHudRoot, 'cc.Widget', 'TouchHudRoot');
  assertNodeHasComponent(items, touchHudRoot, 'cc.SafeArea', 'TouchHudRoot');
  assertNodeHasComponent(items, joystick, touchJoystickType, 'Joystick');
  assertNodeHasComponent(items, touchAttack, touchButtonType, 'TouchAttack');
  assertNodeHasComponent(items, bombGateRoot, breakableTargetType, 'BombGateRoot');
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
