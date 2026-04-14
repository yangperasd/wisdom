import { test, expect } from '@playwright/test';
import { ensurePreviewServer, openPreviewScene, stepFrames, prepareCleanScreenshot } from './helpers/playwright-cocos-helpers.mjs';

const TOOLBAR_HEIGHT = 37;

test.describe('@visual HUD responsive layout', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  const viewports = [
    { label: 'desktop', width: 1280, height: 720 },
    { label: 'tablet', width: 1024, height: 768 },
    { label: 'mobile', width: 812, height: 375 },
  ];

  const scenes = ['StartCamp', 'MechanicsLab', 'BossArena'];

  for (const { label, width, height } of viewports) {
    for (const scene of scenes) {
      test(`${scene} HUD at ${label} (${width}x${height})`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await openPreviewScene(page, scene, ['Player']);
        await stepFrames(page, 10);
        await prepareCleanScreenshot(page);
        await expect(page).toHaveScreenshot(`${scene}-hud-${label}.png`, {
          clip: { x: 0, y: TOOLBAR_HEIGHT, width, height: height - TOOLBAR_HEIGHT },
        });
      });
    }
  }
});
