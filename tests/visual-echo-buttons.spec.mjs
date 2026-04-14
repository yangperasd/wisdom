import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer, openPreviewScene, stepFrames,
  resetMechanicsLab, unlockEcho, pressTouchButton, prepareCleanScreenshot,
} from './helpers/playwright-cocos-helpers.mjs';

const TOOLBAR_HEIGHT = 37;

test.describe('@visual echo button states', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  async function cleanShot(page) {
    await prepareCleanScreenshot(page);
    const vp = page.viewportSize();
    return { clip: { x: 0, y: TOOLBAR_HEIGHT, width: vp.width, height: vp.height - TOOLBAR_HEIGHT } };
  }

  test('default state: Box selected, Flower and Bomb locked', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await resetMechanicsLab(page);
    await stepFrames(page, 5);
    await expect(page).toHaveScreenshot('echo-buttons-default.png', await cleanShot(page));
  });

  test('after unlocking Flower: Flower unlocked, Bomb still locked', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await resetMechanicsLab(page);
    await unlockEcho(page, 1);
    await stepFrames(page, 5);
    await expect(page).toHaveScreenshot('echo-buttons-flower-unlocked.png', await cleanShot(page));
  });

  test('after selecting Flower: Flower selected, Box unlocked', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await resetMechanicsLab(page);
    await unlockEcho(page, 1);
    await pressTouchButton(page, 'TouchEchoFlower');
    await stepFrames(page, 5);
    await expect(page).toHaveScreenshot('echo-buttons-flower-selected.png', await cleanShot(page));
  });

  test('all unlocked with Bomb selected', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await resetMechanicsLab(page);
    await unlockEcho(page, 1);
    await unlockEcho(page, 2);
    await pressTouchButton(page, 'TouchEchoBomb');
    await stepFrames(page, 5);
    await expect(page).toHaveScreenshot('echo-buttons-all-unlocked-bomb-selected.png', await cleanShot(page));
  });
});
