import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer, openPreviewScene, stepFrames, resetMechanicsLab,
  movePlayerNearTarget, pressTouchButton, triggerPlateContact, unlockEcho,
  prepareCleanScreenshot, getCleanScreenshotOptions,
} from './helpers/playwright-cocos-helpers.mjs';

test.describe('@visual gate states', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  async function cleanShot(page) {
    await prepareCleanScreenshot(page);
    return getCleanScreenshotOptions(page);
  }

  test('gate closed initial state', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player', 'Plate-01', 'BombGateRoot']);
    await resetMechanicsLab(page);
    await stepFrames(page, 5);
    await expect(page).toHaveScreenshot('gate-closed-initial.png', await cleanShot(page));
  });

  test('gate opened after plate activation', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player', 'Plate-01', 'BombGateRoot']);
    await resetMechanicsLab(page);
    await movePlayerNearTarget(page, 'Plate-01', -18, 0);
    await stepFrames(page, 2);
    await pressTouchButton(page, 'TouchPlaceEcho');
    await stepFrames(page, 4);
    await triggerPlateContact(page, 'Plate-01', 'Echo-box');
    await stepFrames(page, 5);
    await expect(page).toHaveScreenshot('gate-opened-plate.png', await cleanShot(page));
  });

  test('bomb wall closed initial state', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player', 'BombGateRoot']);
    await resetMechanicsLab(page);
    await stepFrames(page, 5);
    await expect(page).toHaveScreenshot('bomb-wall-closed.png', await cleanShot(page));
  });

  test('bomb wall opened after explosion', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player', 'BombGateRoot']);
    await resetMechanicsLab(page);
    await unlockEcho(page, 2);
    await movePlayerNearTarget(page, 'BombWall-Closed', -18, 0);
    await stepFrames(page, 2);
    await pressTouchButton(page, 'TouchEchoBomb');
    await pressTouchButton(page, 'TouchPlaceEcho');
    await stepFrames(page, 100);
    await expect(page).toHaveScreenshot('bomb-wall-opened.png', await cleanShot(page));
  });
});
