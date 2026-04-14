import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer, openPreviewScene, stepFrames,
  readPlayerHealth, killPlayer, readCheckpointState, readFlowState,
  applyDamageToPlayer, readRuntimeState,
} from './helpers/playwright-cocos-helpers.mjs';

test.describe('error recovery scenarios', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  test('BUG#2: player at 0 HP with no checkpoint does not crash', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await stepFrames(page, 5);
    // Kill player - checkpoint may or may not be set
    await killPlayer(page);
    await stepFrames(page, 20);
    // Game should still be running, not crashed
    const flow = await readFlowState(page);
    expect(flow).not.toBeNull();
    const hp = await readPlayerHealth(page);
    expect(hp.current).toBe(0);
  });

  test('rapid damage does not crash the game', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await stepFrames(page, 5);
    // Apply damage rapidly 10 times
    for (let i = 0; i < 10; i++) {
      await applyDamageToPlayer(page, 1);
    }
    await stepFrames(page, 10);
    // Game should still be running
    const flow = await readFlowState(page);
    expect(flow).not.toBeNull();
  });

  test('game continues running after 100 frames of normal operation', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await stepFrames(page, 100);
    const state = await readRuntimeState(page);
    expect(state.hasCc).toBe(true);
    expect(state.playerPosition).not.toBeNull();
  });
});
