export function computeShieldPhaseState(options) {
  const {
    bossHealth = 1,
    shieldBroken = false,
    vulnerableTimer = 0,
    vulnerableSeconds = 3.2,
    dangerMoveSpeed = 84,
    vulnerableMoveSpeed = 22,
  } = options ?? {};

  const alive = bossHealth > 0;
  const vulnerable = alive && shieldBroken && vulnerableTimer > 0;
  const danger = alive && !vulnerable;

  return {
    alive,
    vulnerable,
    danger,
    damageAccepted: vulnerable,
    contactDamageEnabled: danger,
    moveSpeed: vulnerable ? vulnerableMoveSpeed : dangerMoveSpeed,
    aiEnabled: alive,
  };
}

export function computeShieldTimerStep(vulnerableTimer, dt) {
  if (vulnerableTimer <= 0) {
    return { nextTimer: 0, expired: false };
  }

  const nextTimer = Math.max(0, vulnerableTimer - dt);
  return {
    nextTimer,
    expired: nextTimer <= 0,
  };
}

export function computeShieldActionOnExpiry(shieldBroken, bossAlive) {
  return {
    shouldResetShield: shieldBroken && bossAlive,
  };
}

export function computeEncounterState(isCleared) {
  return {
    bossRootActive: !isCleared,
    clearedNodesActive: isCleared,
    nonClearedNodesActive: !isCleared,
  };
}

export function computeEncounterAfterBossDepleted(currentFlags, clearFlagId) {
  const newFlags = Array.from(new Set([...currentFlags, clearFlagId]));
  return {
    newFlags,
    isCleared: true,
  };
}

export function computeRespawnBossState(bossHealthCurrent, bossHealthMax) {
  // BUG#4: boss health is NOT reset to bossHealthMax on respawn.
  // The controller sets vulnerableTimer to 0 but forgets to restore health.
  return {
    health: bossHealthCurrent,
    vulnerableTimer: 0,
  };
}
