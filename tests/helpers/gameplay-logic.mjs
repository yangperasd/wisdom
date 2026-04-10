export function normalizeAxis(x, y) {
  const length = Math.hypot(x, y);
  if (length <= 0) {
    return { x: 0, y: 0 };
  }

  if (length <= 1) {
    return { x, y };
  }

  return { x: x / length, y: y / length };
}

export function computeLaunchPlan(directionX, directionY, distance = 180, duration = 0.2) {
  if (distance <= 0) {
    return null;
  }

  const normalized = normalizeAxis(directionX, directionY);
  if (normalized.x === 0 && normalized.y === 0) {
    return null;
  }

  if (duration <= 0) {
    return {
      direction: normalized,
      distance,
      duration: 0,
      velocity: { x: 0, y: 0 },
      instant: true,
    };
  }

  return {
    direction: normalized,
    distance,
    duration,
    velocity: {
      x: normalized.x * distance / duration,
      y: normalized.y * distance / duration,
    },
    instant: false,
  };
}

export function cycleEcho(unlockedEchoes, currentEcho, step = 1) {
  const available = Array.from(new Set(unlockedEchoes));
  if (available.length === 0) {
    return currentEcho;
  }

  const currentIndex = Math.max(0, available.indexOf(currentEcho));
  const nextIndex = (currentIndex + step + available.length) % available.length;
  return available[nextIndex];
}

export function computeCameraRigPosition(targetX, targetY, options) {
  const {
    offsetX = 0,
    offsetY = 0,
    minRigX = Number.NEGATIVE_INFINITY,
    maxRigX = Number.POSITIVE_INFINITY,
    minRigY = Number.NEGATIVE_INFINITY,
    maxRigY = Number.POSITIVE_INFINITY,
  } = options ?? {};

  const rigX = clamp(-targetX + offsetX, minRigX, maxRigX);
  const rigY = clamp(-targetY + offsetY, minRigY, maxRigY);
  return { x: rigX, y: rigY };
}

export function clamp(value, min, max) {
  if (min > max) {
    return value;
  }

  return Math.max(min, Math.min(max, value));
}

export function computeJoystickState(localX, localY, maxRadius = 56, deadzone = 10) {
  const distance = Math.hypot(localX, localY);
  if (distance <= 0) {
    return {
      knob: { x: 0, y: 0 },
      axis: { x: 0, y: 0 },
      distance: 0,
      clampedDistance: 0,
    };
  }

  const direction = { x: localX / distance, y: localY / distance };
  const clampedDistance = Math.min(distance, maxRadius);
  const knob = {
    x: direction.x * clampedDistance,
    y: direction.y * clampedDistance,
  };

  if (clampedDistance <= deadzone) {
    return {
      knob,
      axis: { x: 0, y: 0 },
      distance,
      clampedDistance,
    };
  }

  const normalizedStrength = (clampedDistance - deadzone) / Math.max(1, maxRadius - deadzone);
  return {
    knob,
    axis: {
      x: direction.x * normalizedStrength,
      y: direction.y * normalizedStrength,
    },
    distance,
    clampedDistance,
  };
}

export function computeBossPhaseState(options) {
  const {
    bossHealth = 1,
    shieldBroken = false,
    windowTimer = 0,
    dangerMoveSpeed = 84,
    vulnerableMoveSpeed = 22,
  } = options ?? {};

  const alive = bossHealth > 0;
  const vulnerable = alive && shieldBroken && windowTimer > 0;
  return {
    alive,
    vulnerable,
    danger: alive && !vulnerable,
    damageAccepted: vulnerable,
    contactDamageEnabled: alive && !vulnerable,
    moveSpeed: vulnerable ? vulnerableMoveSpeed : dangerMoveSpeed,
    shouldResetShield: alive && shieldBroken && windowTimer <= 0,
  };
}

export function formatHudCheckpoint(markerId) {
  const labels = {
    'camp-entry': 'Camp',
    'field-west-entry': 'West Path',
    'field-ruins-entry': 'Ruins',
    'dungeon-hub-entry': 'Trial Hub',
    'dungeon-room-a-entry': 'Room A',
    'dungeon-room-b-entry': 'Room B',
    'dungeon-room-c-entry': 'Room C',
    'boss-arena-entry': 'Boss Gate',
  };

  if (!markerId) {
    return 'None';
  }

  return labels[markerId] ?? markerId;
}

export function computeEchoHudButtonState(buttonName, unlocked, selected) {
  const labels = {
    TouchEchoBox: 'BOX',
    TouchEchoFlower: 'FLOWER',
    TouchEchoBomb: 'BOMB',
  };

  const baseLabel = labels[buttonName] ?? null;
  if (!baseLabel) {
    return null;
  }

  if (!unlocked) {
    return { label: 'LOCK', scale: 0.94, tint: 'locked' };
  }

  if (selected) {
    return { label: `${baseLabel} *`, scale: 1.08, tint: 'selected' };
  }

  return { label: baseLabel, scale: 1, tint: 'unlocked' };
}

export function computePauseUiState(flowState) {
  const paused = flowState === 'paused';
  return {
    paused,
    pauseButtonVisible: !paused,
    gameplayTouchVisible: !paused,
    panelVisible: paused,
  };
}

export function computeMobileHudLayoutFrame(options = {}) {
  const {
    canvasWidth = 1280,
    canvasHeight = 720,
    safeX = 0,
    safeY = 0,
    safeWidth = canvasWidth,
    safeHeight = canvasHeight,
  } = options;

  const halfWidth = canvasWidth / 2;
  const halfHeight = canvasHeight / 2;
  const safeLeft = safeX - halfWidth;
  const safeRight = safeX + safeWidth - halfWidth;
  const safeBottom = safeY - halfHeight;
  const safeTop = safeY + safeHeight - halfHeight;
  const compact = safeWidth <= 1180 || safeHeight <= 690;
  const tight = safeWidth <= 1060 || safeHeight <= 620;
  const controlScale = tight ? 0.88 : compact ? 0.94 : 1;
  const joystickInsetX = tight ? 122 : compact ? 128 : 134;
  const joystickInsetY = tight ? 106 : compact ? 114 : 122;
  const attackInsetX = tight ? 108 : compact ? 112 : 118;
  const summonOffsetX = tight ? 132 : compact ? 138 : 144;
  const resetOffsetX = tight ? 12 : 16;
  const echoBaseOffsetX = tight ? 308 : compact ? 320 : 332;
  const echoStepX = tight ? 96 : 102;
  const attackBaseY = safeBottom + (tight ? 100 : compact ? 108 : 116);
  const echoRowY = attackBaseY + (tight ? 76 : compact ? 82 : 88);
  const pauseInsetX = tight ? 70 : 76;
  const pauseInsetY = tight ? 34 : 38;
  const hudWidth = clamp(safeWidth - (tight ? 44 : 56), 760, 1236);
  const objectiveWidth = clamp(safeWidth - (tight ? 64 : 88), 700, 1190);
  const controlsWidth = clamp(safeWidth - 420, 420, 900);

  return {
    compact,
    tight,
    controlScale,
    showBottomControls: !compact,
    showCheckpointLabel: !compact,
    showRespawnButton: !compact,
    hud: {
      topBar: {
        width: hudWidth,
        y: safeTop - 42,
      },
      objectiveCard: {
        width: objectiveWidth,
        y: safeTop - 100,
      },
      controlsCard: {
        width: controlsWidth,
        y: safeBottom + 30,
      },
      sceneTitle: {
        x: -(hudWidth / 2) + 162,
        y: safeTop - 42,
      },
      health: {
        x: compact ? 30 : 40,
        y: safeTop - 42,
      },
      echo: {
        x: compact ? 206 : 232,
        y: safeTop - 42,
      },
      checkpoint: {
        x: (hudWidth / 2) - (compact ? 126 : 112),
        y: safeTop - 42,
      },
      objective: {
        x: 0,
        y: safeTop - 100,
      },
      controls: {
        x: 0,
        y: safeBottom + 30,
      },
      pause: {
        x: safeRight - pauseInsetX,
        y: safeTop - pauseInsetY,
      },
    },
    touch: {
      joystick: {
        x: safeLeft + joystickInsetX,
        y: safeBottom + joystickInsetY,
      },
      attack: {
        x: safeRight - attackInsetX,
        y: attackBaseY,
      },
      summon: {
        x: safeRight - attackInsetX - summonOffsetX,
        y: attackBaseY - (tight ? 44 : 48),
      },
      reset: {
        x: safeRight - attackInsetX + resetOffsetX,
        y: safeBottom + (tight ? 46 : 54),
      },
      echoBox: {
        x: safeRight - echoBaseOffsetX,
        y: echoRowY,
      },
      echoFlower: {
        x: safeRight - echoBaseOffsetX + echoStepX,
        y: echoRowY,
      },
      echoBomb: {
        x: safeRight - echoBaseOffsetX + echoStepX * 2,
        y: echoRowY,
      },
    },
  };
}

export function computePlayerVisualState(options = {}) {
  const {
    hurt = false,
    attacking = false,
    forcedMoving = false,
    moving = false,
  } = options;

  if (hurt) {
    return 'hurt';
  }

  if (attacking) {
    return 'attack';
  }

  if (forcedMoving) {
    return 'launch';
  }

  if (moving) {
    return 'move';
  }

  return 'idle';
}

export function computeEnemyVisualState(options = {}) {
  const {
    defeated = false,
    hurt = false,
    aiState = 'idle',
  } = options;

  if (defeated) {
    return 'defeated';
  }

  if (hurt) {
    return 'hurt';
  }

  if (aiState === 'chase') {
    return 'chase';
  }

  if (aiState === 'patrol') {
    return 'patrol';
  }

  return 'idle';
}

export function computeBossVisualState(options = {}) {
  const {
    defeated = false,
    hurt = false,
    vulnerable = false,
  } = options;

  if (defeated) {
    return 'defeated';
  }

  if (hurt) {
    return 'hurt';
  }

  if (vulnerable) {
    return 'vulnerable';
  }

  return 'danger';
}

export function computeProjectileRotationDegrees(directionX, directionY) {
  if (!directionX && !directionY) {
    return 0;
  }

  return Math.atan2(directionY, directionX) * 180 / Math.PI;
}
