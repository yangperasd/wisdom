import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer,
  openPreviewScene,
  stepFrames,
  saveGame,
  readSaveData,
  clearSaveData,
  unlockEcho,
  setProgressFlag,
  readCheckpointState,
} from './helpers/playwright-cocos-helpers.mjs';

test.describe('save load round trip', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensurePreviewServer(baseURL);
  });

  test('fresh game has empty save data', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await stepFrames(page, 5);

    await clearSaveData(page);
    const data = await readSaveData(page);
    expect(data).toBeNull();
  });

  test('saving game persists echo unlock state', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await stepFrames(page, 5);

    await clearSaveData(page);
    await unlockEcho(page, 2);
    await stepFrames(page, 5);
    await saveGame(page);

    const data = await readSaveData(page);
    expect(data).not.toBeNull();
    expect(data.unlockedEchoes).toEqual(expect.arrayContaining([0, 2]));
  });

  test('saving game persists progress flags', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await stepFrames(page, 5);

    await clearSaveData(page);
    await setProgressFlag(page, 'shortcut-west-ruins');
    await stepFrames(page, 5);
    await saveGame(page);

    const data = await readSaveData(page);
    expect(data).not.toBeNull();
    expect(data.unlockedShortcuts).toContain('shortcut-west-ruins');
  });

  test('save data structure matches expected schema', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await stepFrames(page, 5);

    await clearSaveData(page);
    await saveGame(page);

    const data = await readSaveData(page);
    expect(data).not.toBeNull();
    expect(data).toHaveProperty('lastCheckpoint');
    expect(data).toHaveProperty('unlockedEchoes');
    expect(data).toHaveProperty('selectedEcho');
    expect(data).toHaveProperty('unlockedShortcuts');
    expect(data).toHaveProperty('bossCleared');

    expect(Array.isArray(data.unlockedEchoes)).toBe(true);
    expect(typeof data.selectedEcho).toBe('number');
    expect(Array.isArray(data.unlockedShortcuts)).toBe(true);
    expect(typeof data.bossCleared).toBe('boolean');
  });
});
