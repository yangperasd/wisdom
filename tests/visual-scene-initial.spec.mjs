import { test, expect } from '@playwright/test';
import { ensurePreviewServer, openPreviewScene, stepFrames, prepareCleanScreenshot } from './helpers/playwright-cocos-helpers.mjs';

const TOOLBAR_HEIGHT = 37;

test.describe('@visual scene initial states', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  const scenes = [
    { name: 'StartCamp', readyNodes: ['Player', 'Portal-FieldWest'] },
    { name: 'FieldWest', readyNodes: ['Player'] },
    { name: 'FieldRuins', readyNodes: ['Player'] },
    { name: 'DungeonHub', readyNodes: ['Player'] },
    { name: 'DungeonRoomA', readyNodes: ['Player'] },
    { name: 'DungeonRoomB', readyNodes: ['Player'] },
    { name: 'DungeonRoomC', readyNodes: ['Player'] },
    { name: 'BossArena', readyNodes: ['Player'] },
    { name: 'MechanicsLab', readyNodes: ['Player'] },
  ];

  for (const { name, readyNodes } of scenes) {
    test(`${name} initial state`, async ({ page }) => {
      await openPreviewScene(page, name, readyNodes);
      await stepFrames(page, 10);
      await prepareCleanScreenshot(page);
      const vp = page.viewportSize();
      await expect(page).toHaveScreenshot(`${name}-initial.png`, {
        clip: { x: 0, y: TOOLBAR_HEIGHT, width: vp.width, height: vp.height - TOOLBAR_HEIGHT },
      });
    });
  }
});
