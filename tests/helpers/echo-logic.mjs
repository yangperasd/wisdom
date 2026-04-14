export const EchoId = {
  Box: 0,
  SpringFlower: 1,
  BombBug: 2,
};

export function computeEchoUnlock(unlockedSet, echoId) {
  const alreadyUnlocked = unlockedSet.includes(echoId);
  if (alreadyUnlocked) {
    return { changed: false, nextUnlocked: [...unlockedSet] };
  }

  return {
    changed: true,
    nextUnlocked: [...new Set([...unlockedSet, echoId])],
  };
}

export function computeEchoSelect(unlockedSet, currentId, requestedId) {
  if (!unlockedSet.includes(requestedId) || requestedId === currentId) {
    return { changed: false, selectedId: currentId };
  }

  return { changed: true, selectedId: requestedId };
}

export function computeEchoCycle(unlockedArray, currentId, step) {
  const available = Array.from(new Set(unlockedArray));
  if (available.length === 0) {
    return currentId;
  }

  const currentIndex = Math.max(0, available.indexOf(currentId));
  const nextIndex = (currentIndex + step + available.length) % available.length;
  return available[nextIndex];
}

export function computeSpawnDecision(unlockedSet, currentId, activeCount, spawnLimit) {
  const canSpawn = unlockedSet.includes(currentId);
  const shouldReclaim = activeCount >= spawnLimit;
  return { canSpawn, shouldReclaim };
}

export function computeApplySaveState(unlockedEchoes, selectedEcho) {
  let unlockedSet = [...unlockedEchoes];

  if (unlockedSet.length === 0) {
    unlockedSet = [EchoId.Box];
  }

  if (!unlockedSet.includes(EchoId.Box)) {
    unlockedSet = [EchoId.Box, ...unlockedSet];
  }

  const selectedId = unlockedSet.includes(selectedEcho)
    ? selectedEcho
    : unlockedSet[0];

  return { unlockedSet, selectedId };
}
