import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer,
  openPreviewScene,
  readRuntimeState,
  stepFrames,
} from './helpers/playwright-cocos-helpers.mjs';

test.describe('scene transitions', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensurePreviewServer(baseURL);
  });

  test('StartCamp loads with portal and gate nodes', async ({ page }) => {
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest', 'CampGate-Closed']);
    await stepFrames(page, 3);

    const state = await readRuntimeState(page);

    expect(state.hasCc).toBe(true);
    expect(state.sceneName).toBeTruthy();
    expect(state.worldNames).toEqual(
      expect.arrayContaining([
        'Player',
        'EchoRoot',
        'Portal-FieldWest',
        'CampGate-Closed',
        'CampEnemy',
      ]),
    );
    expect(state.playerPosition).not.toBeNull();
    expect(state.hasHudRoot).toBe(true);
    expect(state.hasTouchHudRoot).toBe(true);
  });

  test('FieldWest loads with return and ruins portals', async ({ page }) => {
    await openPreviewScene(page, 'FieldWest', ['Player', 'Portal-StartCamp', 'Portal-FieldRuins']);
    await stepFrames(page, 3);

    const state = await readRuntimeState(page);

    expect(state.hasCc).toBe(true);
    expect(state.sceneName).toBeTruthy();
    expect(state.worldNames).toEqual(
      expect.arrayContaining([
        'Player',
        'EchoRoot',
        'Portal-StartCamp',
        'Portal-FieldRuins',
      ]),
    );
    expect(state.playerPosition).not.toBeNull();
    expect(state.hasHudRoot).toBe(true);
    expect(state.hasTouchHudRoot).toBe(true);
  });

  test('DungeonHub loads with room portals and boss gate', async ({ page }) => {
    await openPreviewScene(page, 'DungeonHub', [
      'Player',
      'Portal-DungeonRoomA',
      'Portal-DungeonRoomB',
      'Portal-DungeonRoomC',
    ]);
    await stepFrames(page, 3);

    const state = await readRuntimeState(page);

    expect(state.hasCc).toBe(true);
    expect(state.sceneName).toBeTruthy();
    expect(state.worldNames).toEqual(
      expect.arrayContaining([
        'Player',
        'EchoRoot',
        'Portal-DungeonRoomA',
        'Portal-DungeonRoomB',
        'Portal-DungeonRoomC',
        'Portal-BossArena',
        'BossGate-Closed',
        'BossGate-Open',
        'BossGateController',
      ]),
    );
    expect(state.playerPosition).not.toBeNull();
    expect(state.hasHudRoot).toBe(true);
  });

  test('BossArena loads with boss encounter nodes', async ({ page }) => {
    await openPreviewScene(page, 'BossArena', [
      'Player',
      'BossEnemy-Core',
      'BossShield-Closed',
      'Portal-BossVictory',
    ]);
    await stepFrames(page, 3);

    const state = await readRuntimeState(page);

    expect(state.hasCc).toBe(true);
    expect(state.sceneName).toBeTruthy();
    expect(state.worldNames).toEqual(
      expect.arrayContaining([
        'Player',
        'EchoRoot',
        'BossEnemy-Core',
        'BossShield-Closed',
        'BossShield-Open',
        'Portal-BossVictory',
        'BossEncounterControllerNode',
        'BossShieldControllerNode',
      ]),
    );
    expect(state.playerPosition).not.toBeNull();
    expect(state.hasHudRoot).toBe(true);
  });
});
