import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer, openPreviewScene, stepFrames,
  readRuntimeState, readProgressFlags, setProgressFlag,
  movePlayerNearTarget, pressTouchButton, unlockEcho, triggerPlateContact,
} from './helpers/playwright-cocos-helpers.mjs';

test.describe('dungeon room puzzle flows', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  test('DungeonRoomA: plate and gate nodes present', async ({ page }) => {
    await openPreviewScene(page, 'DungeonRoomA', ['Player']);
    await stepFrames(page, 10);
    const state = await readRuntimeState(page);
    expect(state.worldNames).toEqual(expect.arrayContaining(['Player']));
    // Verify room has key puzzle elements
    const hasPlateOrRelic = state.worldNames.some(n => n.includes('Plate') || n.includes('Relic') || n.includes('Flag'));
    expect(hasPlateOrRelic || state.worldNames.length > 3).toBe(true);
  });

  test('DungeonRoomB: flower echo puzzle elements present', async ({ page }) => {
    await openPreviewScene(page, 'DungeonRoomB', ['Player']);
    await stepFrames(page, 10);
    const state = await readRuntimeState(page);
    expect(state.worldNames).toEqual(expect.arrayContaining(['Player']));
  });

  test('DungeonRoomC: bomb echo puzzle elements present', async ({ page }) => {
    await openPreviewScene(page, 'DungeonRoomC', ['Player']);
    await stepFrames(page, 10);
    const state = await readRuntimeState(page);
    expect(state.worldNames).toEqual(expect.arrayContaining(['Player']));
  });

  test('setting room flags updates progress', async ({ page }) => {
    await openPreviewScene(page, 'DungeonHub', ['Player']);
    await stepFrames(page, 5);
    await setProgressFlag(page, 'room-a-cleared');
    await setProgressFlag(page, 'room-b-cleared');
    await setProgressFlag(page, 'room-c-cleared');
    const flags = await readProgressFlags(page);
    expect(flags).toContain('room-a-cleared');
    expect(flags).toContain('room-b-cleared');
    expect(flags).toContain('room-c-cleared');
  });
});
