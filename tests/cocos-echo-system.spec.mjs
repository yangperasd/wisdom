import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer, openPreviewScene, stepFrames, resetMechanicsLab,
  unlockEcho, readRuntimeState,
} from './helpers/playwright-cocos-helpers.mjs';

test.describe('Cocos EchoManager runtime', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  test('Box echo is unlocked by default', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    const echoes = await page.evaluate(() => {
      const scene = window.cc?.director?.getScene?.();
      const echoRoot = scene?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('EchoRoot');
      const mgr = echoRoot?.components?.find(c => c?.constructor?.name === 'EchoManager');
      return mgr?.getUnlockedEchoes?.() ?? [];
    });
    expect(echoes).toContain(0);
  });

  test('unlockEcho adds echo to unlocked set', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    const before = await unlockEcho(page, 1);
    expect(before).toContain(0);
    expect(before).toContain(1);
  });

  test('selectEcho changes current echo', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await unlockEcho(page, 1);
    await page.evaluate(() => {
      const echoRoot = window.cc?.director?.getScene?.()?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('EchoRoot');
      const mgr = echoRoot?.components?.find(c => c?.constructor?.name === 'EchoManager');
      mgr?.selectEcho?.(1);
    });
    const state = await readRuntimeState(page);
    expect(state.selectedEcho).toBe(1);
  });

  test('cycleSelection wraps around echoes', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await unlockEcho(page, 1);
    await unlockEcho(page, 2);
    const results = await page.evaluate(() => {
      const echoRoot = window.cc?.director?.getScene?.()?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('EchoRoot');
      const mgr = echoRoot?.components?.find(c => c?.constructor?.name === 'EchoManager');
      const ids = [];
      for (let i = 0; i < 4; i++) {
        mgr?.cycleSelection?.(1);
        ids.push(mgr?.getCurrentEchoId?.());
      }
      return ids;
    });
    // Starting at 0 (Box), cycle: 1, 2, 0, 1
    expect(results).toEqual([1, 2, 0, 1]);
  });

  test('spawnCurrentEcho creates a node in the scene', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await resetMechanicsLab(page);
    const beforeCount = await page.evaluate(() => {
      const echoRoot = window.cc?.director?.getScene?.()?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('EchoRoot');
      return echoRoot?.children?.length ?? 0;
    });
    await page.evaluate(() => {
      const echoRoot = window.cc?.director?.getScene?.()?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('EchoRoot');
      const mgr = echoRoot?.components?.find(c => c?.constructor?.name === 'EchoManager');
      mgr?.spawnCurrentEcho?.(new window.cc.Vec3(0, 0, 0));
    });
    const afterCount = await page.evaluate(() => {
      const echoRoot = window.cc?.director?.getScene?.()?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('EchoRoot');
      return echoRoot?.children?.length ?? 0;
    });
    expect(afterCount).toBe(beforeCount + 1);
  });

  test('reclaimAll removes all spawned echoes', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await resetMechanicsLab(page);
    // Spawn 2 echoes
    await page.evaluate(() => {
      const echoRoot = window.cc?.director?.getScene?.()?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('EchoRoot');
      const mgr = echoRoot?.components?.find(c => c?.constructor?.name === 'EchoManager');
      mgr?.spawnCurrentEcho?.(new window.cc.Vec3(0, 0, 0));
      mgr?.spawnCurrentEcho?.(new window.cc.Vec3(50, 0, 0));
    });
    await stepFrames(page, 2);
    await page.evaluate(() => {
      const echoRoot = window.cc?.director?.getScene?.()?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('EchoRoot');
      const mgr = echoRoot?.components?.find(c => c?.constructor?.name === 'EchoManager');
      mgr?.reclaimAll?.();
    });
    await stepFrames(page, 2);
    const state = await readRuntimeState(page);
    expect(state.echoNames.length).toBe(0);
  });
});
