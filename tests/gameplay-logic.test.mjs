import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBossVisualState,
  computeBossPhaseState,
  computeCameraRigPosition,
  computeEchoHudButtonState,
  computeEnemyVisualState,
  computeMobileHudLayoutFrame,
  computeJoystickState,
  computeLaunchPlan,
  computePauseUiState,
  computePlayerVisualState,
  computeProjectileRotationDegrees,
  cycleEcho,
  formatHudCheckpoint,
  normalizeAxis,
} from './helpers/gameplay-logic.mjs';

test('normalizeAxis keeps small vectors and normalizes large ones', () => {
  assert.deepEqual(normalizeAxis(0, 0), { x: 0, y: 0 });
  assert.deepEqual(normalizeAxis(0.3, 0.4), { x: 0.3, y: 0.4 });

  const normalized = normalizeAxis(3, 4);
  assert.ok(Math.abs(normalized.x - 0.6) < 1e-9);
  assert.ok(Math.abs(normalized.y - 0.8) < 1e-9);
});

test('computeLaunchPlan returns expected velocity plan', () => {
  const plan = computeLaunchPlan(3, 4, 200, 0.5);
  assert.ok(plan);
  assert.equal(plan.instant, false);
  assert.ok(Math.abs(plan.direction.x - 0.6) < 1e-9);
  assert.ok(Math.abs(plan.direction.y - 0.8) < 1e-9);
  assert.equal(plan.velocity.x, 240);
  assert.equal(plan.velocity.y, 320);
  assert.equal(computeLaunchPlan(0, 0), null);
});

test('cycleEcho rotates through unlocked echoes in both directions', () => {
  const echoes = ['box', 'flower', 'bomb'];
  assert.equal(cycleEcho(echoes, 'box', 1), 'flower');
  assert.equal(cycleEcho(echoes, 'box', -1), 'bomb');
  assert.equal(cycleEcho([], 'box', 1), 'box');
});

test('computeCameraRigPosition clamps against rig bounds', () => {
  assert.deepEqual(
    computeCameraRigPosition(-500, -20, {
      offsetX: -80,
      offsetY: 0,
      minRigX: -420,
      maxRigX: 260,
      minRigY: -70,
      maxRigY: 80,
    }),
    { x: 260, y: 20 },
  );

  assert.deepEqual(
    computeCameraRigPosition(900, 300, {
      offsetX: -80,
      offsetY: 0,
      minRigX: -420,
      maxRigX: 260,
      minRigY: -70,
      maxRigY: 80,
    }),
    { x: -420, y: -70 },
  );
});

test('computeJoystickState applies deadzone and clamps knob radius', () => {
  const idle = computeJoystickState(0, 0, 56, 10);
  assert.deepEqual(idle.axis, { x: 0, y: 0 });

  const deadzone = computeJoystickState(5, 0, 56, 10);
  assert.deepEqual(deadzone.axis, { x: 0, y: 0 });

  const active = computeJoystickState(100, 0, 56, 10);
  assert.equal(active.knob.x, 56);
  assert.equal(active.knob.y, 0);
  assert.equal(active.axis.x, 1);
  assert.equal(active.axis.y, 0);
});

test('computeBossPhaseState exposes danger and damage windows', () => {
  const danger = computeBossPhaseState({
    bossHealth: 8,
    shieldBroken: false,
    windowTimer: 0,
  });
  assert.equal(danger.danger, true);
  assert.equal(danger.vulnerable, false);
  assert.equal(danger.damageAccepted, false);
  assert.equal(danger.contactDamageEnabled, true);
  assert.equal(danger.moveSpeed, 84);

  const window = computeBossPhaseState({
    bossHealth: 8,
    shieldBroken: true,
    windowTimer: 2.4,
  });
  assert.equal(window.danger, false);
  assert.equal(window.vulnerable, true);
  assert.equal(window.damageAccepted, true);
  assert.equal(window.contactDamageEnabled, false);
  assert.equal(window.moveSpeed, 22);

  const expired = computeBossPhaseState({
    bossHealth: 8,
    shieldBroken: true,
    windowTimer: 0,
  });
  assert.equal(expired.shouldResetShield, true);

  const cleared = computeBossPhaseState({
    bossHealth: 0,
    shieldBroken: true,
    windowTimer: 1,
  });
  assert.equal(cleared.alive, false);
  assert.equal(cleared.danger, false);
  assert.equal(cleared.vulnerable, false);
  assert.equal(cleared.contactDamageEnabled, false);
});

test('formatHudCheckpoint keeps checkpoint names readable', () => {
  assert.equal(formatHudCheckpoint('camp-entry'), '营地');
  assert.equal(formatHudCheckpoint('dungeon-room-b-entry'), '弹花房');
  assert.equal(formatHudCheckpoint(null), '未激活');
  assert.equal(formatHudCheckpoint('custom-marker'), 'custom-marker');
});

test('computeEchoHudButtonState describes selected and locked echo buttons', () => {
  assert.deepEqual(computeEchoHudButtonState('TouchEchoBox', true, false), {
    label: '箱子',
    scale: 1,
    tint: 'unlocked',
  });

  assert.deepEqual(computeEchoHudButtonState('TouchEchoFlower', true, true), {
    label: '弹花 *',
    scale: 1.08,
    tint: 'selected',
  });

  assert.deepEqual(computeEchoHudButtonState('TouchEchoBomb', false, false), {
    label: '炸虫·锁',
    scale: 0.94,
    tint: 'locked',
  });
});

test('computePauseUiState toggles pause panel and gameplay controls', () => {
  assert.deepEqual(computePauseUiState('playing'), {
    paused: false,
    pauseButtonVisible: true,
    gameplayTouchVisible: true,
    panelVisible: false,
  });

  assert.deepEqual(computePauseUiState('paused'), {
    paused: true,
    pauseButtonVisible: false,
    gameplayTouchVisible: false,
    panelVisible: true,
  });
});

test('computeMobileHudLayoutFrame keeps controls inside safe bounds', () => {
  const roomy = computeMobileHudLayoutFrame({
    canvasWidth: 1280,
    canvasHeight: 720,
    safeX: 0,
    safeY: 0,
    safeWidth: 1280,
    safeHeight: 720,
  });

  assert.equal(roomy.compact, false);
  assert.equal(roomy.tight, false);
  assert.equal(roomy.mobile, false);
  assert.equal(roomy.showBottomControls, true);
  assert.ok(roomy.touch.joystick.x < -480);
  assert.ok(roomy.touch.attack.x > 500);
  assert.ok(roomy.hud.pause.x > 540);
  assert.ok(roomy.hud.topBar.width <= 1236);

  const tight = computeMobileHudLayoutFrame({
    canvasWidth: 1280,
    canvasHeight: 673,
    safeX: 0,
    safeY: 0,
    safeWidth: 1180,
    safeHeight: 649,
  });

  assert.equal(tight.compact, true);
  assert.equal(tight.mobile, false);
  assert.equal(tight.showBottomControls, false);
  assert.equal(tight.showCheckpointLabel, false);
  assert.equal(tight.showRespawnButton, false);
  assert.ok(tight.touch.joystick.x < -450);
  assert.ok(tight.touch.attack.x > 420);
  assert.ok(tight.hud.pause.y > 250);

  const ultraTightViewport = {
    canvasWidth: 1280,
    canvasHeight: 640,
    safeX: 44,
    safeY: 0,
    safeWidth: 1036,
    safeHeight: 620,
  };
  const ultraTight = computeMobileHudLayoutFrame(ultraTightViewport);

  assert.equal(ultraTight.tight, true);
  assert.equal(ultraTight.mobile, false);
  assert.equal(ultraTight.showBottomControls, false);
  assert.equal(ultraTight.showCheckpointLabel, false);
  assert.equal(ultraTight.showRespawnButton, false);
  assert.equal(ultraTight.controlScale, 0.88);
  assert.ok(ultraTight.touch.reset.y < ultraTight.touch.attack.y);
  assert.equal(
    ultraTight.touch.reset.y,
    ultraTightViewport.safeY - ultraTightViewport.canvasHeight / 2 + 16,
  );

  const phone = computeMobileHudLayoutFrame({
    canvasWidth: 812,
    canvasHeight: 375,
    safeX: 0,
    safeY: 0,
    safeWidth: 812,
    safeHeight: 375,
  });

  assert.equal(phone.mobile, true);
  assert.equal(phone.controlScale, 1.35);
  assert.equal(phone.showEchoRow, false);
  assert.equal(phone.showRespawnButton, false);
  assert.equal(phone.touch.echoBox.x, -99999);
  assert.equal(phone.touch.summon.y, phone.touch.attack.y);
});

test('computePlayerVisualState keeps hurt and attack above movement states', () => {
  assert.equal(computePlayerVisualState({}), 'idle');
  assert.equal(computePlayerVisualState({ moving: true }), 'move');
  assert.equal(computePlayerVisualState({ forcedMoving: true, moving: true }), 'launch');
  assert.equal(computePlayerVisualState({ attacking: true, forcedMoving: true, moving: true }), 'attack');
  assert.equal(computePlayerVisualState({ hurt: true, attacking: true, forcedMoving: true, moving: true }), 'hurt');
});

test('computeEnemyVisualState keeps defeat and hurt above AI state visuals', () => {
  assert.equal(computeEnemyVisualState({ aiState: 'idle' }), 'idle');
  assert.equal(computeEnemyVisualState({ aiState: 'patrol' }), 'patrol');
  assert.equal(computeEnemyVisualState({ aiState: 'chase' }), 'chase');
  assert.equal(computeEnemyVisualState({ hurt: true, aiState: 'chase' }), 'hurt');
  assert.equal(computeEnemyVisualState({ defeated: true, hurt: true, aiState: 'chase' }), 'defeated');
});

test('computeBossVisualState keeps defeat and hurt above vulnerability', () => {
  assert.equal(computeBossVisualState({}), 'danger');
  assert.equal(computeBossVisualState({ vulnerable: true }), 'vulnerable');
  assert.equal(computeBossVisualState({ hurt: true, vulnerable: true }), 'hurt');
  assert.equal(computeBossVisualState({ defeated: true, hurt: true, vulnerable: true }), 'defeated');
});

test('computeProjectileRotationDegrees matches projectile flight direction', () => {
  assert.equal(computeProjectileRotationDegrees(1, 0), 0);
  assert.equal(computeProjectileRotationDegrees(0, 1), 90);
  assert.equal(computeProjectileRotationDegrees(-1, 0), 180);
  assert.equal(computeProjectileRotationDegrees(0, -1), -90);
  assert.equal(computeProjectileRotationDegrees(0, 0), 0);
});
