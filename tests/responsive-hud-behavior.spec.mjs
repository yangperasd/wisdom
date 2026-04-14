import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer, openPreviewScene, stepFrames,
  readRuntimeState,
} from './helpers/playwright-cocos-helpers.mjs';

test.describe('responsive HUD behavior', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  test('desktop (1280x720): HUD elements positioned correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest']);
    await stepFrames(page, 5);
    const state = await readRuntimeState(page);
    // Joystick should be on the left side
    expect(state.joystickPosition?.x ?? 0).toBeLessThan(-400);
    // Attack button should be on the right side
    expect(state.attackButtonPosition?.x ?? 0).toBeGreaterThan(400);
  });

  test('tablet (1024x768): HUD adapts to compact layout', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest']);
    await stepFrames(page, 5);
    const state = await readRuntimeState(page);
    // Joystick and attack button still on opposite sides
    expect(state.joystickPosition?.x ?? 0).toBeLessThan(-300);
    expect(state.attackButtonPosition?.x ?? 0).toBeGreaterThan(300);
  });

  test('mobile (812x375): HUD handles tight layout', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest']);
    await stepFrames(page, 5);
    const state = await readRuntimeState(page);
    // Basic check: HUD root exists and elements present
    expect(state.hasTouchHudRoot).toBe(true);
    expect(state.hasHudRoot).toBe(true);
  });

  test('pause button exists at default viewport', async ({ page }) => {
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest']);
    await stepFrames(page, 5);
    const state = await readRuntimeState(page);
    expect(state.touchHudNames).toContain('TouchPause');
  });
});
