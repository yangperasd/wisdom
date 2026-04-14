import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSaveSnapshot,
  createEmptySave,
  isSnapshotCorrupted,
} from './helpers/save-version-logic.mjs';

test('empty/null input produces empty save', () => {
  assert.deepEqual(normalizeSaveSnapshot(null), createEmptySave());
  assert.deepEqual(normalizeSaveSnapshot(undefined), createEmptySave());
  assert.deepEqual(normalizeSaveSnapshot('not-an-object'), createEmptySave());
});

test('malformed JSON string returns corrupted=true', () => {
  assert.equal(isSnapshotCorrupted('{broken'), true);
  assert.equal(isSnapshotCorrupted(''), true);
  assert.equal(isSnapshotCorrupted(null), true);
});

test('valid JSON string returns corrupted=false', () => {
  assert.equal(isSnapshotCorrupted('{}'), false);
  assert.equal(isSnapshotCorrupted('{"unlockedEchoes":[0]}'), false);
});

test('missing unlockedEchoes defaults to [Box]', () => {
  const result = normalizeSaveSnapshot({});
  assert.deepEqual(result.unlockedEchoes, [0]);
});

test('duplicate echoes are deduplicated', () => {
  const result = normalizeSaveSnapshot({ unlockedEchoes: [0, 1, 1, 2, 2] });
  assert.deepEqual(result.unlockedEchoes, [0, 1, 2]);
});

test('invalid echo IDs are filtered out', () => {
  const result = normalizeSaveSnapshot({ unlockedEchoes: [0, 99, 255, 1] });
  assert.deepEqual(result.unlockedEchoes, [0, 1]);
});

test('selectedEcho reset to Box if not in unlocked set', () => {
  const result = normalizeSaveSnapshot({ unlockedEchoes: [0], selectedEcho: 2 });
  assert.equal(result.selectedEcho, 0);
});

test('bossCleared synced: boolean true adds boss-cleared to shortcuts', () => {
  const result = normalizeSaveSnapshot({ bossCleared: true, unlockedShortcuts: [] });
  assert.equal(result.bossCleared, true);
  assert.ok(result.unlockedShortcuts.indexOf('boss-cleared') !== -1);
});

test('bossCleared synced: boss-cleared in shortcuts sets boolean true', () => {
  const result = normalizeSaveSnapshot({ bossCleared: false, unlockedShortcuts: ['boss-cleared'] });
  assert.equal(result.bossCleared, true);
  assert.ok(result.unlockedShortcuts.indexOf('boss-cleared') !== -1);
});

test('invalid checkpoint with missing fields set to null', () => {
  const result = normalizeSaveSnapshot({
    lastCheckpoint: { sceneName: 'camp', markerId: 'entry' },
  });
  assert.equal(result.lastCheckpoint, null);

  const validResult = normalizeSaveSnapshot({
    lastCheckpoint: {
      sceneName: 'camp',
      markerId: 'entry',
      worldPosition: { x: 10, y: 20, z: 0 },
    },
  });
  assert.deepEqual(validResult.lastCheckpoint, {
    sceneName: 'camp',
    markerId: 'entry',
    worldPosition: { x: 10, y: 20, z: 0 },
  });
});
