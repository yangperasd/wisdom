import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSnapshotProgressFlags, normalizeSaveSnapshot } from './helpers/save-logic.mjs';

test('normalizeSaveSnapshot keeps Box unlocked and repairs invalid selected echo', () => {
  const snapshot = normalizeSaveSnapshot({
    unlockedEchoes: [2, 2],
    selectedEcho: 1,
  });

  assert.deepEqual(snapshot.unlockedEchoes, [0, 2]);
  assert.equal(snapshot.selectedEcho, 0);
  assert.equal(snapshot.bossCleared, false);
});

test('normalizeSaveSnapshot aligns boss-cleared boolean with saved flags', () => {
  const snapshot = normalizeSaveSnapshot({
    unlockedShortcuts: ['room-a-clear', 'boss-cleared', 'room-a-clear'],
    bossCleared: false,
    lastCheckpoint: {
      sceneName: 'BossArena',
      markerId: 'boss-arena-entry',
      worldPosition: { x: 12, y: -8, z: 0 },
    },
  });

  assert.equal(snapshot.bossCleared, true);
  assert.deepEqual(snapshot.unlockedShortcuts, ['room-a-clear', 'boss-cleared']);
  assert.equal(snapshot.lastCheckpoint?.sceneName, 'BossArena');
});

test('buildSnapshotProgressFlags keeps boss-cleared in the saved flag list', () => {
  assert.deepEqual(
    buildSnapshotProgressFlags(['room-a-clear', 'room-b-clear'], true),
    ['room-a-clear', 'room-b-clear', 'boss-cleared'],
  );

  assert.deepEqual(
    buildSnapshotProgressFlags(['room-a-clear', 'boss-cleared', 'room-a-clear'], false),
    ['room-a-clear', 'boss-cleared'],
  );
});
