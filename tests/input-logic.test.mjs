import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KeyCode,
  computeAxesFromPressedKeys,
  computeKeyCommand,
  computeStaleKeysBug,
} from './helpers/input-logic.mjs';

test('W key produces vertical=1', () => {
  const axes = computeAxesFromPressedKeys(new Set([KeyCode.KEY_W]));
  assert.equal(axes.vertical, 1);
  assert.equal(axes.horizontal, 0);
});

test('S key produces vertical=-1', () => {
  const axes = computeAxesFromPressedKeys(new Set([KeyCode.KEY_S]));
  assert.equal(axes.vertical, -1);
  assert.equal(axes.horizontal, 0);
});

test('A key produces horizontal=-1', () => {
  const axes = computeAxesFromPressedKeys(new Set([KeyCode.KEY_A]));
  assert.equal(axes.horizontal, -1);
  assert.equal(axes.vertical, 0);
});

test('D key produces horizontal=1', () => {
  const axes = computeAxesFromPressedKeys(new Set([KeyCode.KEY_D]));
  assert.equal(axes.horizontal, 1);
  assert.equal(axes.vertical, 0);
});

test('opposing keys cancel: A+D produces horizontal=0', () => {
  const axes = computeAxesFromPressedKeys(new Set([KeyCode.KEY_A, KeyCode.KEY_D]));
  assert.equal(axes.horizontal, 0);
});

test('arrow keys work same as WASD', () => {
  const wasd = computeAxesFromPressedKeys(new Set([KeyCode.KEY_W, KeyCode.KEY_D]));
  const arrows = computeAxesFromPressedKeys(new Set([KeyCode.ARROW_UP, KeyCode.ARROW_RIGHT]));
  assert.deepEqual(wasd, arrows);
});

test('J key dispatches attack command', () => {
  assert.equal(computeKeyCommand(KeyCode.KEY_J, false), 'attack');
});

test('K key dispatches placeEcho command', () => {
  assert.equal(computeKeyCommand(KeyCode.KEY_K, false), 'placeEcho');
});

test('ESC dispatches togglePause even when paused', () => {
  assert.equal(computeKeyCommand(KeyCode.ESCAPE, false), 'togglePause');
  assert.equal(computeKeyCommand(KeyCode.ESCAPE, true), 'togglePause');
});

test('BUG#7 regression: non-ESC keys suppressed when paused', () => {
  assert.equal(computeKeyCommand(KeyCode.KEY_J, true), null);
  assert.equal(computeKeyCommand(KeyCode.KEY_K, true), null);
  assert.equal(computeKeyCommand(KeyCode.KEY_R, true), null);
  assert.equal(computeKeyCommand(KeyCode.DIGIT_1, true), null);
});
