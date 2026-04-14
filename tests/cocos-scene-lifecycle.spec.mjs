import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer, openPreviewScene, stepFrames,
  readFlowState, readProgressFlags, setProgressFlag,
  saveGame, readSaveData, clearSaveData, readCheckpointState,
} from './helpers/playwright-cocos-helpers.mjs';

test.describe('Cocos scene lifecycle runtime', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  test('GameManager starts in Playing flow state', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await stepFrames(page, 5);
    const flow = await readFlowState(page);
    expect(flow).toBe('playing');
  });

  test('setProgressFlag persists flags', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await setProgressFlag(page, 'test-flag');
    const flags = await readProgressFlags(page);
    expect(flags).toContain('test-flag');
  });

  test('SaveSystem clear removes save data', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await saveGame(page);
    await clearSaveData(page);
    const data = await readSaveData(page);
    expect(data).toBeNull();
  });

  test('SaveSystem save creates valid snapshot', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await clearSaveData(page);
    await saveGame(page);
    const data = await readSaveData(page);
    expect(data).not.toBeNull();
    expect(Array.isArray(data.unlockedEchoes)).toBe(true);
    expect(typeof data.selectedEcho).toBe('number');
    expect(typeof data.bossCleared).toBe('boolean');
  });

  test('checkpoint state readable after scene load', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await stepFrames(page, 10);
    const cp = await readCheckpointState(page);
    expect(typeof cp.hasCheckpoint).toBe('boolean');
  });
});
