export function computeHealthAfterDamage(currentHealth, maxHealth, amount, invulnerableTimer, acceptDamage) {
  const invulnerableSeconds = 0.4;

  if (amount <= 0 || !acceptDamage || invulnerableTimer > 0 || currentHealth <= 0) {
    return {
      applied: false,
      nextHealth: currentHealth,
      nextInvulnerableTimer: invulnerableTimer,
      depleted: false,
    };
  }

  const nextHealth = Math.max(0, currentHealth - amount);
  return {
    applied: true,
    nextHealth,
    nextInvulnerableTimer: invulnerableSeconds,
    depleted: nextHealth === 0,
  };
}

export function computeHealthAfterHeal(currentHealth, maxHealth, amount) {
  if (amount <= 0) {
    return { nextHealth: currentHealth };
  }

  return { nextHealth: Math.min(maxHealth, currentHealth + amount) };
}

export function computeInvulnerabilityStep(timer, dt) {
  if (timer <= 0) {
    return 0;
  }

  return Math.max(0, timer - dt);
}

export function computeHealthReset(maxHealth) {
  return { health: maxHealth, invulnerableTimer: 0 };
}
