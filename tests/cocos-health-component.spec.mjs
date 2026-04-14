import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer, openPreviewScene, stepFrames, resetMechanicsLab,
  readPlayerHealth, applyDamageToPlayer,
} from './helpers/playwright-cocos-helpers.mjs';

test.describe('Cocos HealthComponent runtime', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  test('player starts with full health', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    const hp = await readPlayerHealth(page);
    expect(hp.current).toBe(hp.max);
    expect(hp.max).toBeGreaterThanOrEqual(3);
  });

  test('applyDamage reduces health by 1', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    const before = await readPlayerHealth(page);
    await applyDamageToPlayer(page, 1);
    const after = await readPlayerHealth(page);
    expect(after.current).toBe(before.current - 1);
  });

  test('invulnerability blocks rapid damage', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    const before = await readPlayerHealth(page);
    const r1 = await applyDamageToPlayer(page, 1);
    expect(r1.applied).toBe(true);
    // Second immediate damage should be blocked by invulnerability
    const r2 = await applyDamageToPlayer(page, 1);
    expect(r2.applied).toBe(false);
    expect(r2.currentHealth).toBe(before.current - 1);
  });

  test('invulnerability expires after stepping frames', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await applyDamageToPlayer(page, 1);
    // Step enough frames for invulnerability to expire (0.4s at 60fps = ~24 frames)
    await stepFrames(page, 30);
    const r = await applyDamageToPlayer(page, 1);
    expect(r.applied).toBe(true);
  });

  test('heal restores health via runtime', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await applyDamageToPlayer(page, 1);
    await stepFrames(page, 30);
    const healed = await page.evaluate(() => {
      const scene = window.cc?.director?.getScene?.();
      const player = scene?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('Player');
      const health = player?.components?.find(c => c?.constructor?.name === 'HealthComponent');
      health?.heal?.(1);
      return health?.getCurrentHealth?.() ?? 0;
    });
    const hp = await readPlayerHealth(page);
    expect(hp.current).toBe(hp.max); // should be back to full after heal
  });

  test('resetFull restores max health', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await applyDamageToPlayer(page, 1);
    await page.evaluate(() => {
      const scene = window.cc?.director?.getScene?.();
      const player = scene?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('Player');
      const health = player?.components?.find(c => c?.constructor?.name === 'HealthComponent');
      health?.resetFull?.();
    });
    const hp = await readPlayerHealth(page);
    expect(hp.current).toBe(hp.max);
  });
});
