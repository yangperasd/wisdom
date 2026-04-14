import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchesPressurePlateFilter,
  computePressurePlateAfterContact,
  computePressurePlateReset,
  computeNodeActivationState,
} from './helpers/puzzle-logic.mjs';

test('matchesPressurePlateFilter returns true when name includes filter', () => {
  assert.equal(matchesPressurePlateFilter('PlayerCharacter', 'Player'), true);
});

test('matchesPressurePlateFilter returns true when filter is empty string', () => {
  assert.equal(matchesPressurePlateFilter('AnyNode', ''), true);
  assert.equal(matchesPressurePlateFilter('AnyNode', null), true);
  assert.equal(matchesPressurePlateFilter('AnyNode', undefined), true);
});

test('matchesPressurePlateFilter returns false when name does not include filter', () => {
  assert.equal(matchesPressurePlateFilter('EnemyGoblin', 'Player'), false);
});

test('begin contact adds uuid and sets isPressed true', () => {
  const result = computePressurePlateAfterContact(new Set(), 'uuid-1', true, '', 'Player');
  assert.equal(result.isPressed, true);
  assert.equal(result.activeBodies.has('uuid-1'), true);
  assert.equal(result.changed, true);
});

test('end contact removes uuid and sets isPressed false', () => {
  const initial = new Set(['uuid-1']);
  const result = computePressurePlateAfterContact(initial, 'uuid-1', false, '', 'Player');
  assert.equal(result.isPressed, false);
  assert.equal(result.activeBodies.has('uuid-1'), false);
  assert.equal(result.changed, true);
});

test('multiple bodies: removing one keeps plate pressed', () => {
  const initial = new Set(['uuid-1', 'uuid-2']);
  const result = computePressurePlateAfterContact(initial, 'uuid-1', false, '', 'Player');
  assert.equal(result.isPressed, true);
  assert.equal(result.activeBodies.size, 1);
  assert.equal(result.activeBodies.has('uuid-2'), true);
});

test('removing all bodies sets isPressed false', () => {
  const step1 = computePressurePlateAfterContact(new Set(['uuid-1', 'uuid-2']), 'uuid-1', false, '', 'Node');
  const step2 = computePressurePlateAfterContact(step1.activeBodies, 'uuid-2', false, '', 'Node');
  assert.equal(step2.isPressed, false);
  assert.equal(step2.activeBodies.size, 0);
});

test('non-matching node does not change state', () => {
  const initial = new Set(['uuid-1']);
  const result = computePressurePlateAfterContact(initial, 'uuid-2', true, 'Player', 'EnemyGoblin');
  assert.equal(result.changed, false);
  assert.equal(result.activeBodies.size, 1);
  assert.equal(result.isPressed, true);
});

test('resetState clears activeBodies and uses startsPressed', () => {
  const resetFalse = computePressurePlateReset(false);
  assert.equal(resetFalse.activeBodies.size, 0);
  assert.equal(resetFalse.isPressed, false);

  const resetTrue = computePressurePlateReset(true);
  assert.equal(resetTrue.activeBodies.size, 0);
  assert.equal(resetTrue.isPressed, true);
});

test('startsPressed=true begins in pressed state', () => {
  const state = computePressurePlateReset(true);
  assert.equal(state.isPressed, true);

  const activation = computeNodeActivationState(state.isPressed, ['door-1', 'door-2'], ['trap-1']);
  assert.deepEqual(activation.activated, [
    { id: 'door-1', active: true },
    { id: 'door-2', active: true },
  ]);
  assert.deepEqual(activation.deactivated, [
    { id: 'trap-1', active: false },
  ]);
});
