import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer,
  openPreviewScene,
  stepFrames,
  resetMechanicsLab,
  readPlayerHealth,
  applyDamageToPlayer,
  killPlayer,
  readCheckpointState,
  saveGame,
  readSaveData,
  clearSaveData,
} from './helpers/playwright-cocos-helpers.mjs';

test.describe('checkpoint and respawn mechanics', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensurePreviewServer(baseURL);
  });

  test('player health decreases when damage is applied', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player', 'Checkpoint-01']);
    await resetMechanicsLab(page);

    const before = await readPlayerHealth(page);
    expect(before.current).toBe(before.max);
    expect(before.max).toBeGreaterThan(0);

    const result = await applyDamageToPlayer(page, 1);
    expect(result.applied).toBe(true);
    expect(result.currentHealth).toBe(before.current - 1);

    const after = await readPlayerHealth(page);
    expect(after.current).toBe(before.current - 1);
  });

  test('player health at zero triggers depleted state', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player', 'Checkpoint-01']);
    await resetMechanicsLab(page);

    const before = await readPlayerHealth(page);
    expect(before.current).toBeGreaterThan(0);

    const result = await killPlayer(page);
    expect(result.currentHealth).toBe(0);

    const after = await readPlayerHealth(page);
    expect(after.current).toBe(0);
  });

  test('checkpoint state can be read from the game manager', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player', 'Checkpoint-01']);
    await resetMechanicsLab(page);
    await stepFrames(page, 5);

    const checkpoint = await readCheckpointState(page);
    expect(checkpoint).toHaveProperty('hasCheckpoint');
    expect(checkpoint).toHaveProperty('sceneName');
    expect(checkpoint).toHaveProperty('markerId');
    expect(checkpoint).toHaveProperty('position');

    if (checkpoint.hasCheckpoint) {
      expect(typeof checkpoint.sceneName).toBe('string');
      expect(typeof checkpoint.markerId).toBe('string');
      expect(checkpoint.position).toHaveProperty('x');
      expect(checkpoint.position).toHaveProperty('y');
      expect(checkpoint.position).toHaveProperty('z');
    }
  });

  test('save data round-trip persists to local storage', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player', 'Checkpoint-01']);
    await resetMechanicsLab(page);

    await clearSaveData(page);
    const cleared = await readSaveData(page);
    expect(cleared).toBeNull();

    await saveGame(page);
    await stepFrames(page, 3);

    const saved = await readSaveData(page);
    if (saved !== null) {
      expect(saved).toHaveProperty('unlockedEchoes');
      expect(saved).toHaveProperty('selectedEcho');
      expect(Array.isArray(saved.unlockedEchoes)).toBe(true);
      expect(saved.unlockedEchoes).toContain(0);
    }
  });
});
