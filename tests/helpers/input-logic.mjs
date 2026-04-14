export const KeyCode = {
  KEY_A: 65, KEY_D: 68, KEY_W: 87, KEY_S: 83,
  ARROW_LEFT: 37, ARROW_RIGHT: 39, ARROW_UP: 38, ARROW_DOWN: 40,
  KEY_J: 74, KEY_K: 75, KEY_Q: 81, KEY_E: 69, KEY_R: 82,
  DIGIT_1: 49, DIGIT_2: 50, DIGIT_3: 51, ESCAPE: 27,
};

export function computeAxesFromPressedKeys(pressedKeys) {
  let h = 0, v = 0;
  const has = (k) => pressedKeys.has(k);
  if (has(KeyCode.KEY_A) || has(KeyCode.ARROW_LEFT)) h -= 1;
  if (has(KeyCode.KEY_D) || has(KeyCode.ARROW_RIGHT)) h += 1;
  if (has(KeyCode.KEY_W) || has(KeyCode.ARROW_UP)) v += 1;
  if (has(KeyCode.KEY_S) || has(KeyCode.ARROW_DOWN)) v -= 1;
  return { horizontal: h, vertical: v };
}

export function computeKeyCommand(keyCode, isPaused) {
  if (keyCode === KeyCode.ESCAPE) return 'togglePause';
  if (isPaused) return null; // all non-ESC suppressed when paused
  switch (keyCode) {
    case KeyCode.KEY_J: return 'attack';
    case KeyCode.KEY_K: return 'placeEcho';
    case KeyCode.KEY_Q: return 'cycleEchoPrev';
    case KeyCode.KEY_E: return 'cycleEchoNext';
    case KeyCode.DIGIT_1: return 'selectEcho0';
    case KeyCode.DIGIT_2: return 'selectEcho1';
    case KeyCode.DIGIT_3: return 'selectEcho2';
    case KeyCode.KEY_R: return 'respawn';
    default: return null;
  }
}

export function computeStaleKeysBug(pressedKeysBefore, disableAndReEnable) {
  // BUG#7: on disable, pressedKeys not cleared. After re-enable, stale keys remain.
  // This simulates the bug: returns true if pressedKeysBefore is non-empty after disable
  return { staleKeys: pressedKeysBefore.size > 0 && disableAndReEnable, bug: 'pressedKeys not cleared on disable' };
}
