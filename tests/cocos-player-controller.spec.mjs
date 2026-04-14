import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer, openPreviewScene, stepFrames, resetMechanicsLab,
  pressTouchButton, readRuntimeState,
} from './helpers/playwright-cocos-helpers.mjs';

test.describe('Cocos PlayerController runtime', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  test('setMoveInput moves player position', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await resetMechanicsLab(page);
    const before = await page.evaluate(() => {
      const p = window.cc?.director?.getScene?.()?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('Player');
      return { x: p?.position?.x ?? 0, y: p?.position?.y ?? 0 };
    });
    await page.evaluate(() => {
      const p = window.cc?.director?.getScene?.()?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('Player');
      const ctrl = p?.components?.find(c => c?.constructor?.name === 'PlayerController');
      ctrl?.setMoveInput?.(1, 0);
    });
    await stepFrames(page, 20);
    const after = await page.evaluate(() => {
      const p = window.cc?.director?.getScene?.()?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('Player');
      return { x: p?.position?.x ?? 0, y: p?.position?.y ?? 0 };
    });
    expect(after.x).toBeGreaterThan(before.x + 20);
  });

  test('attack sets isAttacking true', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await resetMechanicsLab(page);
    const result = await page.evaluate(() => {
      const p = window.cc?.director?.getScene?.()?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('Player');
      const ctrl = p?.components?.find(c => c?.constructor?.name === 'PlayerController');
      const success = ctrl?.attack?.() ?? false;
      return { success, isAttacking: ctrl?.isAttacking?.() ?? false };
    });
    expect(result.success).toBe(true);
    expect(result.isAttacking).toBe(true);
  });

  test('attack timer expires after frames', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await resetMechanicsLab(page);
    await page.evaluate(() => {
      const p = window.cc?.director?.getScene?.()?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('Player');
      const ctrl = p?.components?.find(c => c?.constructor?.name === 'PlayerController');
      ctrl?.attack?.();
    });
    // attackDuration = 0.18s, at 60fps = ~11 frames
    await stepFrames(page, 15);
    const state = await readRuntimeState(page);
    expect(state.isAttacking).toBe(false);
  });

  test('respawnAt resets position and health', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    // Combine damage + respawn + read in one evaluate to avoid drift from Cocos game loop
    const result = await page.evaluate(() => {
      const p = window.cc?.director?.getScene?.()?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('Player');
      const ctrl = p?.components?.find(c => c?.constructor?.name === 'PlayerController');
      const hp = p?.components?.find(c => c?.constructor?.name === 'HealthComponent');
      hp?.applyDamage?.(1);
      ctrl?.respawnAt?.(new window.cc.Vec3(100, 200, 0));
      return { x: p?.worldPosition?.x, y: p?.worldPosition?.y, health: hp?.getCurrentHealth?.(), max: hp?.maxHealth };
    });
    expect(result.x).toBeCloseTo(100, 0);
    expect(result.y).toBeCloseTo(200, 0);
    expect(result.health).toBe(result.max);
  });
});
