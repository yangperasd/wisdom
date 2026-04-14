export function evaluateFlagGate(requiredFlags, currentFlags) {
  const flagSet = new Set(currentFlags);
  const isReady = requiredFlags.every(flag => flagSet.has(flag));
  return { isReady };
}

export function computeCheckpointFromPortal(targetScene, targetMarkerId, x, y, z) {
  return {
    sceneName: targetScene,
    markerId: targetMarkerId,
    worldPosition: { x, y, z: z ?? 0 },
  };
}

export function computeCheckpointOverwrite(currentCheckpoint, newCheckpoint) {
  return {
    overwritten: currentCheckpoint !== null,
    previousScene: currentCheckpoint?.sceneName ?? null,
    newScene: newCheckpoint.sceneName,
  };
}

export function computeProgressFlagSet(existingFlags, newFlag) {
  const trimmed = (newFlag ?? '').trim();
  if (!trimmed) return { flags: [...existingFlags], changed: false };
  const set = new Set(existingFlags);
  if (set.has(trimmed)) return { flags: [...existingFlags], changed: false };
  set.add(trimmed);
  return { flags: Array.from(set), changed: true };
}
