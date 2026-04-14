import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer, openPreviewScene, stepFrames, resetMechanicsLab,
  readRuntimeState, pressTouchButton, dragJoystick, movePlayerNearTarget,
  unlockEcho, triggerPlateContact,
} from './helpers/playwright-cocos-helpers.mjs';

test.beforeAll(async ({ baseURL }) => {
  await ensurePreviewServer(baseURL);
});

test('preview loads StartCamp mobile hud layout', async ({ page }) => {
  await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest', 'CampGate-Closed']);

  const state = await readRuntimeState(page);
  expect(state.title).toContain('Cocos Creator - wisdom');
  expect(state.hasCc).toBeTruthy();
  expect(state.hasHudRoot).toBe(true);
  expect(state.hasTouchHudRoot).toBe(true);
  expect(state.playerPosition?.x ?? 0).toBeLessThan(-450);
  expect(state.worldNames).toEqual(
    expect.arrayContaining([
      'Player',
      'EchoRoot',
      'CampGate-Closed',
      'Portal-FieldWest',
      'CampEnemy',
    ]),
  );
  expect(state.touchHudNames).toEqual(
    expect.arrayContaining([
      'Joystick',
      'TouchAttack',
      'TouchPlaceEcho',
      'TouchRespawn',
      'TouchEchoBox',
      'TouchEchoFlower',
      'TouchEchoBomb',
      'TouchPause',
    ]),
  );
  expect(state.joystickPosition?.x ?? 0).toBeLessThan(-450);
  expect(state.attackButtonPosition?.x ?? 0).toBeGreaterThan(450);
  expect(state.attackButtonPosition?.y ?? 0).toBeGreaterThan(-260);
  expect(state.controlsCardActive).toBe(false);
  expect(state.resetButtonActive).toBe(false);
  expect(state.checkpointLabelActive).toBe(false);
});

test('touch joystick moves player and attack button enters attack state', async ({ page }) => {
  await openPreviewScene(page, 'MechanicsLab', ['Player', 'Plate-01', 'Trap-01', 'BombGateRoot']);
  await resetMechanicsLab(page);

  const moveResult = await dragJoystick(page, { x: 52, y: 0, frames: 20 });
  expect(moveResult.afterMove.x).toBeGreaterThan(moveResult.before.x + 40);
  expect(Math.abs(moveResult.knobPosition?.x ?? 0)).toBeLessThan(1);
  expect(Math.abs(moveResult.knobPosition?.y ?? 0)).toBeLessThan(1);

  await pressTouchButton(page, 'TouchAttack');
  await stepFrames(page, 1);

  const state = await readRuntimeState(page);
  expect(state.isAttacking).toBe(true);
});

test('touch summon button can place a box onto the plate and open the gate', async ({ page }) => {
  await openPreviewScene(page, 'MechanicsLab', ['Player', 'Plate-01', 'Trap-01', 'BombGateRoot']);
  await resetMechanicsLab(page);

  await movePlayerNearTarget(page, 'Plate-01', -18, 0);
  await stepFrames(page, 2);
  await pressTouchButton(page, 'TouchEchoBox');
  await pressTouchButton(page, 'TouchPlaceEcho');
  await stepFrames(page, 4);

  const plateState = await triggerPlateContact(page, 'Plate-01', 'Echo-box');
  expect(plateState.gateOpenActive).toBe(true);
  expect(plateState.gateClosedActive).toBe(false);

  const state = await readRuntimeState(page);
  expect(state.selectedEcho).toBe(0);
  expect(state.echoNames).toContain('Echo-box');
  expect(state.gateOpenActive).toBe(true);
  expect(state.gateClosedActive).toBe(false);
});

test('touch echo selection plus bomb placement can open the cracked wall', async ({ page }) => {
  await openPreviewScene(page, 'MechanicsLab', ['Player', 'Plate-01', 'Trap-01', 'BombGateRoot']);
  await resetMechanicsLab(page);

  const unlocked = await unlockEcho(page, 2);
  expect(unlocked).toEqual(expect.arrayContaining([0, 2]));

  await movePlayerNearTarget(page, 'BombWall-Closed', -18, 0);
  await stepFrames(page, 2);
  await pressTouchButton(page, 'TouchEchoBomb');
  await pressTouchButton(page, 'TouchPlaceEcho');
  await stepFrames(page, 100);

  const state = await readRuntimeState(page);
  expect(state.selectedEcho).toBe(2);
  expect(state.bombWallOpenActive).toBe(true);
  expect(state.bombWallClosedActive).toBe(false);
});
