import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer, openPreviewScene, stepFrames, setProgressFlag, prepareCleanScreenshot,
} from './helpers/playwright-cocos-helpers.mjs';

const TOOLBAR_HEIGHT = 37;

test.describe('@visual boss states', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  async function cleanShot(page) {
    await prepareCleanScreenshot(page);
    const vp = page.viewportSize();
    return { clip: { x: 0, y: TOOLBAR_HEIGHT, width: vp.width, height: vp.height - TOOLBAR_HEIGHT } };
  }

  test('BossArena with boss-cleared flag shows victory state', async ({ page }) => {
    await openPreviewScene(page, 'BossArena', ['Player']);
    await setProgressFlag(page, 'boss-cleared');
    await stepFrames(page, 20);
    await expect(page).toHaveScreenshot('boss-arena-cleared.png', await cleanShot(page));
  });

  test('DungeonHub with all room flags shows boss gate state', async ({ page }) => {
    await openPreviewScene(page, 'DungeonHub', ['Player']);
    await setProgressFlag(page, 'room-a-cleared');
    await setProgressFlag(page, 'room-b-cleared');
    await setProgressFlag(page, 'room-c-cleared');
    await stepFrames(page, 20);
    await expect(page).toHaveScreenshot('dungeon-hub-all-rooms-cleared.png', await cleanShot(page));
  });

  test('DungeonHub without flags shows initial state', async ({ page }) => {
    await openPreviewScene(page, 'DungeonHub', ['Player']);
    await stepFrames(page, 10);
    await expect(page).toHaveScreenshot('dungeon-hub-initial.png', await cleanShot(page));
  });
});
