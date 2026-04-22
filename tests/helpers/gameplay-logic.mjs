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
    'camp-entry': '营地',
    'field-west-entry': '林间小径',
    'field-ruins-entry': '遗迹',
    'dungeon-hub-entry': '试炼大厅',
    'dungeon-room-a-entry': '箱子房',
    'dungeon-room-b-entry': '弹花房',
    'dungeon-room-c-entry': '炸虫房',
    'boss-arena-entry': '首领门',
  };

  if (!markerId) {
    return '未激活';
  }

  return labels[markerId] ?? markerId;
}

export function computeEchoHudButtonState(buttonName, unlocked, selected) {
  const labels = {
    TouchEchoBox: '箱子',
    TouchEchoFlower: '弹花',
    TouchEchoBomb: '炸虫',
  };

  const baseLabel = labels[buttonName] ?? null;
  if (!baseLabel) {
    return null;
  }

  if (!unlocked) {
    return { label: `${baseLabel}·锁`, scale: 0.94, tint: 'locked' };
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
  const aspect = canvasHeight > 0 ? canvasWidth / canvasHeight : 1;
  const mobile =
    canvasWidth <= 900 ||
    canvasHeight <= 480 ||
    (aspect >= 1.9 && canvasHeight <= 520);
  const controlScale = mobile ? 1.35 : tight ? 0.88 : compact ? 0.94 : 1;
  const joystickInsetX = mobile ? 96 : tight ? 122 : compact ? 128 : 134;
  const joystickInsetY = mobile ? 96 : tight ? 106 : compact ? 114 : 122;
  const attackInsetX = mobile ? 100 : tight ? 108 : compact ? 112 : 118;
  const summonOffsetX = mobile ? 200 : tight ? 150 : compact ? 160 : 170;
  const resetOffsetX = tight ? 12 : 16;
  const echoBaseOffsetX = tight ? 308 : compact ? 320 : 332;
  const echoStepX = tight ? 128 : 136;
  const attackBaseY = safeBottom + (mobile ? 126 : tight ? 100 : compact ? 108 : 116);
  const echoRowY = attackBaseY + (tight ? 110 : compact ? 116 : 122);
  const pauseInsetX = tight ? 70 : 76;
  const pauseInsetY = tight ? 34 : 38;
  const hudWidth = clamp(safeWidth - (tight ? 88 : 116), 700, 1120);
  const objectiveWidth = clamp(safeWidth - (tight ? 120 : 176), 620, 1040);
  const controlsWidth = clamp(safeWidth - 420, 420, 900);
  const topBarY = safeTop - 40;
  const objectiveY = safeTop - (tight ? 92 : 96);

  return {
    compact,
    tight,
    mobile,
    controlScale,
    showBottomControls: !compact,
    showCheckpointLabel: !compact,
    showRespawnButton: !compact && !mobile,
    showEchoRow: !mobile,
    hud: {
      topBar: {
        width: hudWidth,
        height: 76,
        y: topBarY,
      },
      objectiveCard: {
        width: objectiveWidth,
        height: 44,
        y: objectiveY,
      },
      controlsCard: {
        width: controlsWidth,
        y: safeBottom + 30,
      },
      sceneTitle: {
        x: -(hudWidth / 2) + 162,
        y: topBarY,
      },
      health: {
        x: compact ? 30 : 40,
        y: topBarY,
      },
      echo: {
        x: compact ? 206 : 232,
        y: topBarY,
      },
      checkpoint: {
        x: (hudWidth / 2) - (compact ? 126 : 112),
        y: topBarY,
      },
      objective: {
        x: 0,
        y: objectiveY,
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
        y: attackBaseY,
      },
      reset: {
        x: safeRight - attackInsetX + resetOffsetX,
        y: safeBottom + (tight ? 16 : 24),
      },
      echoBox: {
        x: mobile ? -99999 : safeRight - echoBaseOffsetX,
        y: mobile ? -99999 : echoRowY,
      },
      echoFlower: {
        x: mobile ? -99999 : safeRight - echoBaseOffsetX + echoStepX,
        y: mobile ? -99999 : echoRowY,
      },
      echoBomb: {
        x: mobile ? -99999 : safeRight - echoBaseOffsetX + echoStepX * 2,
        y: mobile ? -99999 : echoRowY,
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
