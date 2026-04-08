export function normalizeSaveSnapshot(parsed = {}) {
  const allowedEchoes = [0, 1, 2];
  const unlockedEchoes = [0];

  for (const echoId of parsed.unlockedEchoes ?? []) {
    if (!allowedEchoes.includes(echoId) || unlockedEchoes.includes(echoId)) {
      continue;
    }

    unlockedEchoes.push(echoId);
  }

  const unlockedShortcuts = Array.from(
    new Set(
      (parsed.unlockedShortcuts ?? [])
        .map((flag) => `${flag}`.trim())
        .filter((flag) => flag.length > 0),
    ),
  );
  const bossCleared = Boolean(parsed.bossCleared) || unlockedShortcuts.includes('boss-cleared');

  if (bossCleared && !unlockedShortcuts.includes('boss-cleared')) {
    unlockedShortcuts.push('boss-cleared');
  }

  const selectedEcho = unlockedEchoes.includes(parsed.selectedEcho ?? 0)
    ? (parsed.selectedEcho ?? 0)
    : unlockedEchoes[0];
  const checkpoint = parsed.lastCheckpoint;
  const lastCheckpoint = checkpoint &&
    typeof checkpoint.sceneName === 'string' &&
    typeof checkpoint.markerId === 'string' &&
    typeof checkpoint.worldPosition?.x === 'number' &&
    typeof checkpoint.worldPosition?.y === 'number' &&
    typeof checkpoint.worldPosition?.z === 'number'
    ? checkpoint
    : null;

  return {
    lastCheckpoint,
    unlockedEchoes,
    selectedEcho,
    unlockedShortcuts,
    bossCleared,
  };
}

export function buildSnapshotProgressFlags(progressFlags = [], bossCleared = false) {
  const normalized = Array.from(
    new Set(
      progressFlags
        .map((flag) => `${flag}`.trim())
        .filter((flag) => flag.length > 0),
    ),
  );

  if (bossCleared && !normalized.includes('boss-cleared')) {
    normalized.push('boss-cleared');
  }

  return normalized;
}
