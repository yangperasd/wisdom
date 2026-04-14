export function computePlayerAttackState(attackTimer, attackDuration, dt) {
  if (attackTimer > 0) {
    const nextTimer = Math.max(0, attackTimer - dt);
    return {
      timer: nextTimer,
      justEnded: attackTimer > 0 && nextTimer === 0,
    };
  }

  return {
    timer: attackDuration,
    justStarted: true,
  };
}

export function computeAttackDecision(isPaused, attackTimer) {
  return { canAttack: !isPaused && attackTimer <= 0 };
}

export function computeForcedMoveStep(velocityX, velocityY, forcedMoveTimer, dt) {
  const step = Math.min(dt, forcedMoveTimer);
  const dx = velocityX * step;
  const dy = velocityY * step;
  const nextTimer = Math.max(0, forcedMoveTimer - dt);
  return {
    dx,
    dy,
    nextTimer,
    velocityCleared: nextTimer === 0,
  };
}

export function computeNormalMoveStep(inputX, inputY, moveSpeed, dt) {
  return {
    dx: inputX * moveSpeed * dt,
    dy: inputY * moveSpeed * dt,
  };
}

export function computeAttackAnchorPosition(facingX, facingY, reach) {
  return {
    x: facingX * reach,
    y: facingY * reach,
  };
}

export function normalizeMoveInput(x, y) {
  const lengthSqr = x * x + y * y;
  if (lengthSqr <= 1) {
    return { x, y };
  }

  const length = Math.sqrt(lengthSqr);
  return { x: x / length, y: y / length };
}
