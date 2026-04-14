import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer, openPreviewScene, stepFrames,
  resetMechanicsLab, dragJoystick,
} from './helpers/playwright-cocos-helpers.mjs';

test.describe('responsive touch input', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  const viewports = [
    { label: 'desktop', width: 1280, height: 720 },
    { label: 'tablet', width: 1024, height: 768 },
    { label: 'mobile', width: 812, height: 375 },
  ];

  for (const { label, width, height } of viewports) {
    test(`joystick moves player at ${label} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await openPreviewScene(page, 'MechanicsLab', ['Player']);
      await resetMechanicsLab(page);
      const result = await dragJoystick(page, { x: 40, y: 0, frames: 15 });
      expect(result.afterMove.x).toBeGreaterThan(result.before.x + 10);
    });

    test(`joystick knob resets after release at ${label}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await openPreviewScene(page, 'MechanicsLab', ['Player']);
      await resetMechanicsLab(page);
      const result = await dragJoystick(page, { x: 40, y: 0, frames: 10 });
      expect(Math.abs(result.knobPosition?.x ?? 0)).toBeLessThan(2);
      expect(Math.abs(result.knobPosition?.y ?? 0)).toBeLessThan(2);
    });
  }
});
