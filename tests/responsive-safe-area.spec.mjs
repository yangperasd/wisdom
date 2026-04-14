import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer, openPreviewScene, stepFrames, readRuntimeState,
} from './helpers/playwright-cocos-helpers.mjs';

test.describe('responsive safe area', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  test('desktop: joystick in bottom-left quadrant', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest']);
    await stepFrames(page, 5);
    const state = await readRuntimeState(page);
    expect(state.joystickPosition?.x ?? 0).toBeLessThan(0);
    expect(state.joystickPosition?.y ?? 0).toBeLessThan(0);
  });

  test('desktop: attack button in bottom-right quadrant', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest']);
    await stepFrames(page, 5);
    const state = await readRuntimeState(page);
    expect(state.attackButtonPosition?.x ?? 0).toBeGreaterThan(0);
    expect(state.attackButtonPosition?.y ?? 0).toBeLessThan(0);
  });

  test('tablet: HUD elements remain within viewport bounds', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest']);
    await stepFrames(page, 5);
    const state = await readRuntimeState(page);
    // Elements should be within half-width bounds
    expect(Math.abs(state.joystickPosition?.x ?? 0)).toBeLessThan(512);
    expect(Math.abs(state.attackButtonPosition?.x ?? 0)).toBeLessThan(540);
  });

  test('mobile: touch elements exist at small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest']);
    await stepFrames(page, 5);
    const state = await readRuntimeState(page);
    expect(state.hasTouchHudRoot).toBe(true);
    expect(state.touchHudNames.length).toBeGreaterThan(3);
  });

  test('all viewports have joystick and attack button', async ({ page }) => {
    for (const { w, h } of [{ w: 1280, h: 720 }, { w: 1024, h: 768 }]) {
      await page.setViewportSize({ width: w, height: h });
      await openPreviewScene(page, 'MechanicsLab', ['Player']);
      await stepFrames(page, 5);
      const state = await readRuntimeState(page);
      expect(state.touchHudNames).toContain('Joystick');
      expect(state.touchHudNames).toContain('TouchAttack');
    }
  });
});
