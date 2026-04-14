const ALLOWED_ECHOES = [0, 1, 2]; // Box, SpringFlower, BombBug

export function normalizeSaveSnapshot(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return createEmptySave();
  }
  const unlockedEchoes = [0]; // Box always included
  for (const echoId of parsed.unlockedEchoes ?? []) {
    if (ALLOWED_ECHOES.indexOf(echoId) === -1 || unlockedEchoes.indexOf(echoId) !== -1) continue;
    unlockedEchoes.push(echoId);
  }
  const unlockedShortcuts = Array.from(new Set(
    (parsed.unlockedShortcuts ?? []).map(f => `${f}`.trim()).filter(f => f.length > 0),
  ));
  const bossCleared = Boolean(parsed.bossCleared) || unlockedShortcuts.indexOf('boss-cleared') !== -1;
  if (bossCleared && unlockedShortcuts.indexOf('boss-cleared') === -1) {
    unlockedShortcuts.push('boss-cleared');
  }
  const selectedEcho = unlockedEchoes.indexOf(parsed.selectedEcho ?? 0) !== -1 ? (parsed.selectedEcho ?? 0) : unlockedEchoes[0];
  const cp = parsed.lastCheckpoint;
  const lastCheckpoint = cp &&
    typeof cp.sceneName === 'string' &&
    typeof cp.markerId === 'string' &&
    typeof cp.worldPosition?.x === 'number' &&
    typeof cp.worldPosition?.y === 'number' &&
    typeof cp.worldPosition?.z === 'number'
    ? cp : null;
  return { lastCheckpoint, unlockedEchoes, selectedEcho, unlockedShortcuts, bossCleared };
}

export function createEmptySave() {
  return { lastCheckpoint: null, unlockedEchoes: [0], selectedEcho: 0, unlockedShortcuts: [], bossCleared: false };
}

export function isSnapshotCorrupted(raw) {
  if (!raw || typeof raw !== 'string') return true;
  try { JSON.parse(raw); return false; }
  catch { return true; }
}
