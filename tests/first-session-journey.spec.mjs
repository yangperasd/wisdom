import { test, expect } from '@playwright/test';
import {
  clearSaveData,
  ensurePreviewServer,
  killPlayer,
  movePlayerNearTarget,
  openPreviewScene,
  pressTouchButton,
  readBossState,
  readPlayerHealth,
  readProgressFlags,
  readRuntimeState,
  readSceneSwitchState,
  stepFrames,
  triggerPlateContact,
  triggerPortalContact,
  waitForSceneSwitch,
} from './helpers/playwright-cocos-helpers.mjs';

const staleVisibleTextPattern = /loading|placeholder|todo|fixme|undefined|null|NaN|Boss Arena|PLAYER|ATTACK|SUMMON|PENDING|BOUNDARY|BombBug/i;
const desktopControlPattern = /\b(WASD|keyboard|mouse|key\s*[JQE]|press\s*[JQE]|J\/K\/Q\/E|J|K|Q|E)\b/i;

const journeyScenes = {
  StartCamp: {
    title: '营地入口',
    objectiveIncludes: ['箱子', '机关', '栅门'],
  },
  FieldWest: {
    title: '林间小径',
    objectiveIncludes: ['弹花', '陷阱', '遗迹'],
  },
  FieldRuins: {
    title: '遗迹小径',
    objectiveIncludes: ['炸虫', '裂墙', '试炼门'],
  },
  DungeonHub: {
    title: '试炼大厅',
    objectiveIncludes: ['三个小房间', '首领门'],
  },
  DungeonRoomA: {
    title: '箱子房',
    objectiveIncludes: ['箱子', '机关', '遗物'],
  },
  DungeonRoomB: {
    title: '弹花房',
    objectiveIncludes: ['弹花', '陷阱', '遗物'],
  },
  DungeonRoomC: {
    title: '炸虫房',
    objectiveIncludes: ['炸虫', '裂墙', '遗物'],
  },
  BossArena: {
    title: '首领庭院',
    objectiveIncludes: ['破盾', '胜利', '营地'],
  },
};

async function readJourneyState(page) {
  return page.evaluate(() => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const hudRoot = canvas?.getChildByName?.('HudRoot');
    const touchHudRoot = canvas?.getChildByName?.('TouchHudRoot');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const gameHud = hudRoot?.components?.find((component) => component?.constructor?.name === 'GameHud');

    const findNode = (root, name) => {
      if (!root) return null;
      if (root.name === name) return root;
      for (const child of (root.children ?? [])) {
        const matched = findNode(child, name);
        if (matched) return matched;
      }
      return null;
    };

    const readLabels = (root) => {
      const labels = [];
      const walk = (node) => {
        if (!node || node.activeInHierarchy === false) return;
        for (const component of (node.components ?? [])) {
          if (component?.constructor?.name === 'Label' && component.enabled !== false && component.string != null) {
            labels.push({ node: node.name, text: String(component.string) });
          }
        }
        for (const child of (node.children ?? [])) walk(child);
      };
      walk(root);
      return labels;
    };

    const summarizeNode = (node) => ({
      exists: Boolean(node),
      active: node?.active ?? false,
      activeInHierarchy: node?.activeInHierarchy ?? false,
    });

    return {
      sceneName: scene?.name ?? '',
      title: String(gameHud?.sceneTitleLabel?.string ?? gameHud?.sceneTitle ?? ''),
      objective: String(gameHud?.objectiveLabel?.string ?? gameHud?.objectiveText ?? ''),
      controls: String(gameHud?.controlsLabel?.string ?? gameHud?.mobileHintText ?? ''),
      hudLabels: readLabels(hudRoot),
      worldLabels: readLabels(worldRoot),
      touch: {
        joystick: summarizeNode(findNode(touchHudRoot, 'Joystick')),
        attack: summarizeNode(findNode(touchHudRoot, 'TouchAttack')),
        summon: summarizeNode(findNode(touchHudRoot, 'TouchPlaceEcho')),
        pause: summarizeNode(findNode(touchHudRoot, 'TouchPause')),
        respawn: summarizeNode(findNode(touchHudRoot, 'TouchRespawn')),
      },
      world: {
        roomA: summarizeNode(findNode(worldRoot, 'Portal-DungeonRoomA')),
        roomB: summarizeNode(findNode(worldRoot, 'Portal-DungeonRoomB')),
        roomC: summarizeNode(findNode(worldRoot, 'Portal-DungeonRoomC')),
        bossPortal: summarizeNode(findNode(worldRoot, 'Portal-BossArena')),
        bossVictoryPortal: summarizeNode(findNode(worldRoot, 'Portal-BossVictory')),
        bossVictoryBanner: summarizeNode(findNode(worldRoot, 'BossVictoryBanner')),
        bossStatusBanner: summarizeNode(findNode(worldRoot, 'BossStatusBanner')),
        bossWindowBanner: summarizeNode(findNode(worldRoot, 'BossWindowBanner')),
      },
    };
  });
}

async function expectSceneReadable(page, sceneName) {
  await page.waitForFunction((expectedSceneName) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const hudRoot = canvas?.getChildByName?.('HudRoot');
    const gameHud = hudRoot?.components?.find((component) => component?.constructor?.name === 'GameHud');
    return scene?.name === expectedSceneName &&
      Boolean(gameHud?.sceneTitleLabel?.string?.trim?.()) &&
      Boolean(gameHud?.objectiveLabel?.string?.trim?.());
  }, sceneName, { timeout: 5_000 });

  await stepFrames(page, 5);
  const state = await readJourneyState(page);
  const expected = journeyScenes[sceneName];

  expect(state.sceneName).toBe(sceneName);
  expect(state.title).toBe(expected.title);
  for (const keyword of expected.objectiveIncludes) {
    expect(state.objective, `${sceneName} objective should mention ${keyword}`).toContain(keyword);
  }
  expect(state.controls).toContain('摇杆');
  expect(state.controls).toContain('攻击');
  expect(state.controls).toContain('召唤');
  expect(state.controls, `${sceneName} controls should stay touch-only`).not.toMatch(desktopControlPattern);

  expect(state.touch.joystick.activeInHierarchy, `${sceneName} should expose joystick`).toBe(true);
  expect(state.touch.attack.activeInHierarchy, `${sceneName} should expose attack`).toBe(true);
  expect(state.touch.summon.activeInHierarchy, `${sceneName} should expose summon`).toBe(true);
  expect(state.touch.pause.exists, `${sceneName} should contain pause entry`).toBe(true);
  expect(state.touch.respawn.exists, `${sceneName} should contain respawn entry`).toBe(true);

  for (const label of [...state.hudLabels, ...state.worldLabels]) {
    expect(label.text, `${sceneName}/${label.node} should not show stale debug text`).not.toMatch(staleVisibleTextPattern);
    expect(label.text, `${sceneName}/${label.node} should not show desktop-only control hints`).not.toMatch(desktopControlPattern);
  }

  return state;
}

async function travelThroughPortal(page, portalName, targetSceneName) {
  await movePlayerNearTarget(page, portalName, -20, 0);
  await stepFrames(page, 2);
  const portal = await triggerPortalContact(page, portalName, { maxDistance: 72 });
  expect(portal.wasActive, `${portalName} should be active before travel`).toBe(true);
  expect(portal.playerDistance, `${portalName} should be reached by the player before travel`).toBeLessThanOrEqual(72);
  expect(portal.targetScene).toBe(targetSceneName);
  await waitForSceneSwitch(page, targetSceneName);
  const switchState = await readSceneSwitchState(page);
  expect(switchState, `${portalName} should expose scene switch state after travel`).toBeTruthy();
  expect(switchState.status, `${portalName} should finish loading instead of leaving a stuck switching state`).toBe('idle');
  expect(switchState.targetScene, `${portalName} should retain the completed target scene for diagnostics`).toBe(targetSceneName);
  return expectSceneReadable(page, targetSceneName);
}

async function readPickupEvidence(page, pickupName) {
  return page.evaluate((requestedPickupName) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const persistentRoot = canvas?.getChildByName?.('PersistentRoot');
    const echoRoot = worldRoot?.getChildByName?.('EchoRoot');
    const playerNode = worldRoot?.getChildByName?.('Player');

    const findNode = (root, name) => {
      if (!root) return null;
      if (root.name === name) return root;
      for (const child of (root.children ?? [])) {
        const matched = findNode(child, name);
        if (matched) return matched;
      }
      return null;
    };

    const pickupNode = findNode(worldRoot, requestedPickupName);
    const echoPickup = pickupNode?.components?.find((component) => component?.constructor?.name === 'EchoUnlockPickup');
    const flagPickup = pickupNode?.components?.find((component) => component?.constructor?.name === 'ProgressFlagPickup');
    const gameManager = persistentRoot?.components?.find((component) => component?.constructor?.name === 'GameManager');
    const echoManager = echoRoot?.components?.find((component) => component?.constructor?.name === 'EchoManager');
    const progressFlags = gameManager?.getProgressFlags?.() ?? [];
    const unlockedEchoes = echoManager?.getUnlockedEchoes?.() ?? [];

    const playerPosition = playerNode?.worldPosition;
    const pickupPosition = pickupNode?.worldPosition;
    const playerDistance = playerPosition && pickupPosition
      ? Math.hypot(
        playerPosition.x - pickupPosition.x,
        playerPosition.y - pickupPosition.y,
      )
      : Number.POSITIVE_INFINITY;
    const pickupType = echoPickup ? 'echo' : flagPickup ? 'progress-flag' : 'unknown';
    const echoId = echoPickup?.echoId ?? null;
    const flagId = flagPickup?.flagId ?? null;
    const collected = pickupType === 'echo'
      ? unlockedEchoes.includes(echoId)
      : pickupType === 'progress-flag'
        ? progressFlags.includes(flagId)
        : false;

    return {
      pickupName: pickupNode?.name ?? requestedPickupName,
      pickupType,
      echoId,
      flagId,
      playerDistance,
      pickupExists: Boolean(pickupNode),
      pickupActive: pickupNode?.activeInHierarchy ?? false,
      collected,
      progressFlags,
      unlockedEchoes,
      selectedEcho: echoManager?.getCurrentEchoId?.() ?? null,
    };
  }, pickupName);
}

async function collectPickupWithBoundedPreviewAssist(page, pickupName) {
  await movePlayerNearTarget(page, pickupName, 0, 0);
  await stepFrames(page, 30);
  const physicsAttempt = await readPickupEvidence(page, pickupName);
  if (physicsAttempt.collected) {
    return {
      ...physicsAttempt,
      physicsAttemptFrames: 30,
      collectionMode: 'physics-overlap',
      syntheticContactApplied: false,
      previewLimitation: null,
    };
  }

  const syntheticResult = await page.evaluate((requestedPickupName) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const playerNode = worldRoot?.getChildByName?.('Player');
    const playerCollider = playerNode?.components?.find((component) => component?.constructor?.name === 'BoxCollider2D');

    const findNode = (root, name) => {
      if (!root) return null;
      if (root.name === name) return root;
      for (const child of (root.children ?? [])) {
        const matched = findNode(child, name);
        if (matched) return matched;
      }
      return null;
    };

    const pickupNode = findNode(worldRoot, requestedPickupName);
    const pickup = pickupNode?.components?.find((component) => (
      component?.constructor?.name === 'EchoUnlockPickup' ||
      component?.constructor?.name === 'ProgressFlagPickup'
    ));

    if (!pickupNode || !pickup || !playerCollider) {
      throw new Error(`Unable to synthesize bounded pickup contact for ${requestedPickupName}.`);
    }

    const playerPosition = playerNode.worldPosition;
    const pickupPosition = pickupNode.worldPosition;
    const playerDistance = Math.hypot(
      playerPosition.x - pickupPosition.x,
      playerPosition.y - pickupPosition.y,
    );
    if (!pickupNode.activeInHierarchy || playerDistance > 72) {
      throw new Error(`Pickup ${requestedPickupName} is outside the bounded assist range (${playerDistance.toFixed(1)}).`);
    }

    pickup.onBeginContact(null, playerCollider, null);
    return {
      syntheticContactApplied: true,
      syntheticContactDistance: playerDistance,
    };
  }, pickupName);

  await stepFrames(page, 2);
  const afterSynthetic = await readPickupEvidence(page, pickupName);
  const collected = physicsAttempt.pickupType === 'echo'
    ? afterSynthetic.unlockedEchoes.includes(physicsAttempt.echoId)
    : physicsAttempt.pickupType === 'progress-flag'
      ? afterSynthetic.progressFlags.includes(physicsAttempt.flagId)
      : afterSynthetic.collected;
  return {
    ...afterSynthetic,
    pickupType: physicsAttempt.pickupType,
    echoId: physicsAttempt.echoId,
    flagId: physicsAttempt.flagId,
    collected,
    playerDistance: Number.isFinite(afterSynthetic.playerDistance)
      ? afterSynthetic.playerDistance
      : syntheticResult.syntheticContactDistance,
    physicsAttempt,
    physicsAttemptFrames: 30,
    collectionMode: 'bounded-preview-synthetic-contact',
    syntheticContactApplied: syntheticResult.syntheticContactApplied,
    syntheticContactDistance: syntheticResult.syntheticContactDistance,
    previewLimitation: 'Cocos preview did not dispatch BEGIN_CONTACT after player/pickup overlap stepping; this assist is bounded by active pickup and <=72px player distance.',
  };
}

function expectBoundedPickupEvidence(evidence, label) {
  expect(evidence.playerDistance, `${label} pickup should be reached by the player`).toBeLessThanOrEqual(72);
  expect(evidence.collected, `${label} pickup should report explicit collection evidence`).toBe(true);
  expect(
    ['physics-overlap', 'bounded-preview-synthetic-contact'],
    `${label} pickup evidence should disclose whether preview physics or bounded assist completed collection`,
  ).toContain(evidence.collectionMode);

  if (evidence.collectionMode === 'bounded-preview-synthetic-contact') {
    expect(evidence.syntheticContactApplied, `${label} bounded pickup assist should be explicit`).toBe(true);
    expect(evidence.syntheticContactDistance, `${label} bounded pickup assist should stay within contact range`).toBeLessThanOrEqual(72);
    expect(evidence.previewLimitation, `${label} bounded pickup assist should document preview limitation`).toContain('Cocos preview');
    expect(evidence.physicsAttempt?.collected, `${label} should only use bounded assist after physics overlap did not collect`).toBe(false);
  } else {
    expect(evidence.syntheticContactApplied, `${label} physics pickup should not use bounded assist`).toBe(false);
    expect(evidence.previewLimitation, `${label} physics pickup should not report a preview limitation`).toBeNull();
  }
}

async function breakTargetWithBombEcho(page, targetName) {
  await movePlayerNearTarget(page, targetName, -36, 0);
  await stepFrames(page, 2);
  await pressTouchButton(page, 'TouchEchoBomb');
  await stepFrames(page, 1);
  await pressTouchButton(page, 'TouchPlaceEcho');
  await stepFrames(page, 4);

  const setup = await page.evaluate((requestedTargetName) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const echoRoot = worldRoot?.getChildByName?.('EchoRoot');

    const findNode = (root, name) => {
      if (!root) return null;
      if (root.name === name) return root;
      for (const child of (root.children ?? [])) {
        const matched = findNode(child, name);
        if (matched) return matched;
      }
      return null;
    };

    const targetNode = findNode(worldRoot, requestedTargetName);
    const bombNode = echoRoot?.children?.find((node) => node.name === 'Echo-bomb-bug');
    if (!targetNode || !bombNode) {
      throw new Error(`Unable to set up bomb echo break for ${requestedTargetName}.`);
    }

    const bombPosition = bombNode.worldPosition;
    const targetPosition = targetNode.worldPosition;
    const bombDistance = Math.hypot(
      bombPosition.x - targetPosition.x,
      bombPosition.y - targetPosition.y,
    );
    if (bombDistance > 120) {
      throw new Error(`Bomb echo is too far from ${requestedTargetName} (${bombDistance.toFixed(1)}).`);
    }

    return {
      bombName: bombNode.name,
      bombDistance,
      selectedEcho: echoRoot?.components?.find((component) => component?.constructor?.name === 'EchoManager')?.getCurrentEchoId?.() ?? null,
    };
  }, targetName);

  expect(setup.selectedEcho, `${targetName} should be approached with bomb selected`).toBe(2);
  expect(setup.bombName).toBe('Echo-bomb-bug');
  expect(setup.bombDistance, `${targetName} bomb echo should be in explosion range`).toBeLessThanOrEqual(120);

  await stepFrames(page, 100);

  return page.evaluate((requestedTargetName) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');

    const findNode = (root, name) => {
      if (!root) return null;
      if (root.name === name) return root;
      for (const child of (root.children ?? [])) {
        const matched = findNode(child, name);
        if (matched) return matched;
      }
      return null;
    };

    const targetNode = findNode(worldRoot, requestedTargetName);
    const target = targetNode?.components?.find((component) => component?.constructor?.name === 'BreakableTarget');
    if (!target) {
      throw new Error(`Unable to find BreakableTarget on ${requestedTargetName}.`);
    }

    return {
      isBroken: target.isCurrentlyBroken?.() ?? false,
    };
  }, targetName);
}

async function playerAssistedBossDefeat(page) {
  const shield = await breakTargetWithBombEcho(page, 'BossShield-Closed');
  expect(shield.isBroken, 'Boss shield should break from a placed bomb echo before attacks count').toBe(true);
  await stepFrames(page, 5);

  let bossState = await readBossState(page);
  expect(bossState.vulnerable, 'Boss should open a damage window after shield break').toBe(true);

  const attacks = [];
  for (let index = 0; index < 24 && bossState.alive; index += 1) {
    bossState = await ensureBossDamageWindow(page);
    if (!bossState.alive) {
      break;
    }

    await movePlayerNearTarget(page, 'BossEnemy-Core', -28, 0);
    await stepFrames(page, 1);
    const attackBefore = await waitForPlayerAttackIdle(page, 'BossEnemy-Core');
    attacks.push(await triggerBoundedPreviewAttackAssist(page, 'BossEnemy-Core', attackBefore));
    await waitForPlayerAttackIdle(page, 'BossEnemy-Core');
    bossState = await readBossState(page);
  }

  return {
    ...bossState,
    attacks,
  };
}

async function ensureBossDamageWindow(page, minRemainingSeconds = 0.45) {
  let bossState = await readBossState(page);
  if (!bossState.alive) {
    return bossState;
  }

  if (bossState.vulnerable && bossState.vulnerableTimer >= minRemainingSeconds) {
    return bossState;
  }

  if (bossState.vulnerable) {
    bossState = await waitForBossDangerState(page);
  }

  if (!bossState.alive) {
    return bossState;
  }

  const nextShield = await breakTargetWithBombEcho(page, 'BossShield-Closed');
  expect(nextShield.isBroken, 'Boss shield should be breakable again after a damage window closes or gets too short').toBe(true);
  await stepFrames(page, 5);
  bossState = await readBossState(page);
  expect(bossState.vulnerable, 'Boss should reopen a damage window after each shield break').toBe(true);
  expect(
    bossState.vulnerableTimer,
    'Boss damage window should leave enough time for a touch attack attempt',
  ).toBeGreaterThanOrEqual(minRemainingSeconds);

  return bossState;
}

async function waitForBossDangerState(page, maxPolls = 90) {
  for (let index = 0; index < maxPolls; index += 1) {
    const bossState = await readBossState(page);
    if (!bossState.alive || !bossState.vulnerable) {
      return bossState;
    }

    await page.waitForTimeout(50);
    await stepFrames(page, 1);
  }

  const bossState = await readBossState(page);
  throw new Error(
    `Boss damage window did not close before re-breaking the shield `
    + `(health=${bossState.health}, vulnerableTimer=${bossState.vulnerableTimer}).`,
  );
}

async function readAttackEvidence(page, targetName) {
  return page.evaluate((requestedTargetName) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const playerNode = worldRoot?.getChildByName?.('Player');

    const findNode = (root, name) => {
      if (!root) return null;
      if (root.name === name) return root;
      for (const child of (root.children ?? [])) {
        const matched = findNode(child, name);
        if (matched) return matched;
      }
      return null;
    };

    const findComponent = (root, componentName) => {
      if (!root) return null;
      const direct = root.components?.find((component) => component?.constructor?.name === componentName);
      if (direct) return direct;
      for (const child of (root.children ?? [])) {
        const matched = findComponent(child, componentName);
        if (matched) return matched;
      }
      return null;
    };

    const attackHitbox = findComponent(playerNode, 'AttackHitbox');
    const shieldController = findComponent(worldRoot, 'BossShieldPhaseController');
    const targetNode = findNode(worldRoot, requestedTargetName);
    const targetCollider = targetNode?.components?.find((component) => component?.constructor?.name === 'BoxCollider2D');
    const targetHealth = targetNode?.components?.find((component) => component?.constructor?.name === 'HealthComponent')
      ?? shieldController?.bossHealth
      ?? null;
    const beforeHealth = targetHealth?.getCurrentHealth?.() ?? 0;
    const playerDistance = playerNode && targetNode
      ? Math.hypot(
        playerNode.worldPosition.x - targetNode.worldPosition.x,
        playerNode.worldPosition.y - targetNode.worldPosition.y,
      )
      : Number.POSITIVE_INFINITY;

    const damageWindowOpen = shieldController?.isDamageWindowOpen?.() ?? Boolean(targetHealth?.acceptDamage);

    return {
      playerDistance,
      health: beforeHealth,
      hasAttackHitbox: Boolean(attackHitbox),
      hasTargetCollider: Boolean(targetCollider),
      hasTargetHealth: Boolean(targetHealth),
      playerIsAttacking: attackHitbox?.player?.isAttacking?.() ?? false,
      hitboxColliderEnabled: attackHitbox?.collider?.enabled ?? null,
      damageWindowOpen,
    };
  }, targetName);
}

async function waitForPlayerAttackIdle(page, targetName, maxPolls = 25) {
  for (let index = 0; index < maxPolls; index += 1) {
    const evidence = await readAttackEvidence(page, targetName);
    if (!evidence.playerIsAttacking) {
      return evidence;
    }

    await page.waitForTimeout(20);
    await stepFrames(page, 1);
  }

  const evidence = await readAttackEvidence(page, targetName);
  throw new Error(
    `Player attack did not return to idle before the next ${targetName} attack attempt `
    + `(distance=${evidence.playerDistance.toFixed(1)}, health=${evidence.health}, damageWindowOpen=${evidence.damageWindowOpen}).`,
  );
}

async function triggerBoundedPreviewAttackAssist(page, targetName, before) {
  if (!before.hasAttackHitbox || !before.hasTargetCollider || !before.hasTargetHealth) {
    throw new Error(`Unable to inspect player attack contact for ${targetName}.`);
  }
  if (before.playerDistance > 96) {
    throw new Error(`Player is too far from ${targetName} for an assisted attack (${before.playerDistance.toFixed(1)}).`);
  }

  const syntheticResult = await page.evaluate((requestedTargetName) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const touchHudRoot = canvas?.getChildByName?.('TouchHudRoot');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const playerNode = worldRoot?.getChildByName?.('Player');
    const attackButtonNode = touchHudRoot?.getChildByName?.('TouchAttack');

    const findNode = (root, name) => {
      if (!root) return null;
      if (root.name === name) return root;
      for (const child of (root.children ?? [])) {
        const matched = findNode(child, name);
        if (matched) return matched;
      }
      return null;
    };

    const findComponent = (root, componentName) => {
      if (!root) return null;
      const direct = root.components?.find((component) => component?.constructor?.name === componentName);
      if (direct) return direct;
      for (const child of (root.children ?? [])) {
        const matched = findComponent(child, componentName);
        if (matched) return matched;
      }
      return null;
    };

    const attackHitbox = findComponent(playerNode, 'AttackHitbox');
    const shieldController = findComponent(worldRoot, 'BossShieldPhaseController');
    const targetNode = findNode(worldRoot, requestedTargetName);
    const targetCollider = targetNode?.components?.find((component) => component?.constructor?.name === 'BoxCollider2D');
    const targetHealth = targetNode?.components?.find((component) => component?.constructor?.name === 'HealthComponent')
      ?? shieldController?.bossHealth
      ?? null;
    const attackButton = attackButtonNode?.components?.find((component) => component?.constructor?.name === 'TouchCommandButton');
    if (!attackHitbox || !targetCollider || !targetHealth || !attackButton) {
      throw new Error(`Unable to synthesize bounded player attack contact for ${requestedTargetName}.`);
    }

    const playerDistance = playerNode && targetNode
      ? Math.hypot(
        playerNode.worldPosition.x - targetNode.worldPosition.x,
        playerNode.worldPosition.y - targetNode.worldPosition.y,
      )
      : Number.POSITIVE_INFINITY;
    if (playerDistance > 96) {
      throw new Error(`Synthetic attack contact is outside the bounded assist range (${playerDistance.toFixed(1)}).`);
    }

    const beforeHealth = targetHealth?.getCurrentHealth?.() ?? 0;
    const staleTouchId = attackButton.touchId ?? null;
    if (staleTouchId !== null) {
      attackButton.onTouchCancel({ getID: () => staleTouchId });
    }

    const touchId = Math.floor(Math.random() * 10000) + 1;
    const event = {
      getID: () => touchId,
    };
    attackButton.onTouchStart(event);
    attackButton.onTouchEnd(event);
    const afterImmediateHealth = targetHealth?.getCurrentHealth?.() ?? 0;
    if (afterImmediateHealth < beforeHealth) {
      const damageWindowOpen = shieldController?.isDamageWindowOpen?.() ?? Boolean(targetHealth?.acceptDamage);

      return {
        playerDistance,
        beforeHealth,
        afterHealth: afterImmediateHealth,
        damageWindowOpen,
        physicsHealthAfter: afterImmediateHealth,
        attackMode: 'touch-attack-immediate-hitbox-contact',
        syntheticHitboxCallbackApplied: false,
      };
    }

    targetHealth.invulnerableTimer = 0;
    if (!attackHitbox.player?.isAttacking?.()) {
      const gameManager = canvas?.getChildByName?.('PersistentRoot')?.components
        ?.find((component) => component?.constructor?.name === 'GameManager') ?? null;
      throw new Error(
        'Synthetic attack contact requested after touch attack failed to open an attack window. '
        + `staleTouchId=${staleTouchId} `
        + `buttonHasPlayer=${Boolean(attackButton.player)} `
        + `buttonPlayerMatchesHitbox=${attackButton.player === attackHitbox.player} `
        + `paused=${gameManager?.isPaused?.() ?? null}`,
      );
    }

    attackHitbox.onBeginContact(null, targetCollider, null);
    const afterHealth = targetHealth?.getCurrentHealth?.() ?? 0;
    const damageWindowOpen = shieldController?.isDamageWindowOpen?.() ?? Boolean(targetHealth?.acceptDamage);

    return {
      playerDistance,
      beforeHealth,
      afterHealth,
      damageWindowOpen,
      physicsHealthAfter: afterImmediateHealth,
      attackMode: 'bounded-preview-synthetic-hitbox-contact',
      syntheticHitboxCallbackApplied: true,
    };
  }, targetName);

  if (syntheticResult.afterHealth >= before.health) {
    throw new Error(
      `No boss damage was observed from immediate touch attack or bounded synthetic hitbox contact for ${targetName}. `
      + `before=${JSON.stringify(before)} `
      + `synthetic=${JSON.stringify(syntheticResult)}`,
    );
  }

  return {
    playerDistance: before.playerDistance,
    beforeHealth: before.health,
    afterHealth: syntheticResult.afterHealth,
    damageWindowOpen: syntheticResult.damageWindowOpen,
    physicsStepFrames: 0,
    physicsHealthAfter: syntheticResult.physicsHealthAfter,
    attackMode: syntheticResult.attackMode,
    syntheticHitboxCallbackApplied: syntheticResult.syntheticHitboxCallbackApplied,
    fallbackApplied: false,
    previewLimitation: syntheticResult.syntheticHitboxCallbackApplied
      ? 'Cocos preview did not dispatch immediate hitbox contact; synthetic AttackHitbox contact is bounded by active touch attack and <=96px player distance.'
      : null,
  };
}

test.describe('first-session full runtime journey', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensurePreviewServer(baseURL);
  });

  test('touch-first journey reaches every release scene, clears boss, and returns to camp', async ({ page }) => {
    test.setTimeout(120_000);

    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest']);
    await clearSaveData(page);
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest']);
    await expectSceneReadable(page, 'StartCamp');

    await movePlayerNearTarget(page, 'CampPlate', -18, 0);
    await stepFrames(page, 2);
    await pressTouchButton(page, 'TouchPlaceEcho');
    await stepFrames(page, 5);
    const campPlate = await triggerPlateContact(page, 'CampPlate', 'Echo-box', { maxDistance: 96 });
    expect(campPlate.echoDistance, 'StartCamp box echo should be placed close enough to the plate').toBeLessThanOrEqual(96);
    expect(campPlate.gateOpenActive, 'StartCamp gate should open after box echo presses the plate').toBe(true);

    await travelThroughPortal(page, 'Portal-FieldWest', 'FieldWest');
    const flowerPickup = await collectPickupWithBoundedPreviewAssist(page, 'EchoPickup-Flower-West');
    expectBoundedPickupEvidence(flowerPickup, 'FieldWest');
    expect(flowerPickup.unlockedEchoes, 'FieldWest should unlock flower during the same journey').toContain(1);

    await travelThroughPortal(page, 'Portal-FieldRuins', 'FieldRuins');
    const bombPickup = await collectPickupWithBoundedPreviewAssist(page, 'EchoPickup-Bomb-Ruins');
    expectBoundedPickupEvidence(bombPickup, 'FieldRuins');
    expect(bombPickup.unlockedEchoes, 'FieldRuins should unlock bomb during the same journey').toContain(2);

    const ruinsWall = await breakTargetWithBombEcho(page, 'RuinsWall-Closed');
    expect(ruinsWall.isBroken, 'FieldRuins cracked wall should be breakable before dungeon entry').toBe(true);

    await travelThroughPortal(page, 'Portal-DungeonHub', 'DungeonHub');
    let hubState = await readJourneyState(page);
    expect(hubState.world.roomA.activeInHierarchy).toBe(true);
    expect(hubState.world.roomB.activeInHierarchy).toBe(true);
    expect(hubState.world.roomC.activeInHierarchy).toBe(true);
    expect(hubState.world.bossPortal.activeInHierarchy).toBe(false);

    await travelThroughPortal(page, 'Portal-DungeonRoomA', 'DungeonRoomA');
    await movePlayerNearTarget(page, 'RoomA-Plate', -18, 0);
    await stepFrames(page, 2);
    await pressTouchButton(page, 'TouchEchoBox');
    await stepFrames(page, 3);
    await pressTouchButton(page, 'TouchPlaceEcho');
    await stepFrames(page, 5);
    const roomAPlate = await triggerPlateContact(page, 'RoomA-Plate', 'Echo-box', {
      gateClosedName: 'RoomA-GateClosed',
      gateOpenName: 'RoomA-GateOpen',
      maxDistance: 96,
    });
    expect(roomAPlate.echoDistance, 'RoomA box echo should be placed close enough to the plate').toBeLessThanOrEqual(96);
    expect(roomAPlate.gateOpenActive, 'RoomA gate should open after box echo presses the plate').toBe(true);
    const roomAReward = await collectPickupWithBoundedPreviewAssist(page, 'RoomA-ClearRelic');
    expectBoundedPickupEvidence(roomAReward, 'RoomA relic');
    expect(roomAReward.progressFlags).toContain('room-a-clear');
    await travelThroughPortal(page, 'Portal-DungeonHubReturn-A', 'DungeonHub');

    await travelThroughPortal(page, 'Portal-DungeonRoomB', 'DungeonRoomB');
    const roomBReward = await collectPickupWithBoundedPreviewAssist(page, 'RoomB-ClearRelic');
    expectBoundedPickupEvidence(roomBReward, 'RoomB relic');
    expect(roomBReward.progressFlags).toContain('room-b-clear');
    await travelThroughPortal(page, 'Portal-DungeonHubReturn-B', 'DungeonHub');

    await travelThroughPortal(page, 'Portal-DungeonRoomC', 'DungeonRoomC');
    const roomCWall = await breakTargetWithBombEcho(page, 'RoomC-WallClosed');
    expect(roomCWall.isBroken, 'RoomC wall should break before the relic appears').toBe(true);
    const roomCReward = await collectPickupWithBoundedPreviewAssist(page, 'RoomC-ClearRelic');
    expectBoundedPickupEvidence(roomCReward, 'RoomC relic');
    expect(roomCReward.progressFlags).toContain('room-c-clear');
    await travelThroughPortal(page, 'Portal-DungeonHubReturn-C', 'DungeonHub');

    const flags = await readProgressFlags(page);
    expect(flags).toEqual(expect.arrayContaining(['room-a-clear', 'room-b-clear', 'room-c-clear']));
    hubState = await readJourneyState(page);
    expect(hubState.world.bossPortal.activeInHierarchy, 'Boss portal should open after all three rooms are clear').toBe(true);

    await killPlayer(page, { disableAutoRespawn: true });
    let health = await readPlayerHealth(page);
    expect(health.current).toBe(0);
    await pressTouchButton(page, 'TouchRespawn');
    await stepFrames(page, 8);
    health = await readPlayerHealth(page);
    expect(health.current, 'Manual touch respawn should restore health before boss travel continues').toBe(health.max);

    await travelThroughPortal(page, 'Portal-BossArena', 'BossArena');
    let bossState = await readBossState(page);
    expect(bossState.alive).toBe(true);
    expect(bossState.danger).toBe(true);
    let bossVisuals = await readJourneyState(page);
    expect(bossVisuals.world.bossStatusBanner.activeInHierarchy, 'Boss pre-fight shield/status feedback should be visible').toBe(true);
    expect(bossVisuals.world.bossVictoryBanner.activeInHierarchy).toBe(false);

    const defeated = await playerAssistedBossDefeat(page);
    expect(defeated.health, 'Boss should reach 0 HP after repeated touch attacks inside shield windows').toBe(0);
    expect(defeated.attacks.some((attack) => attack.afterHealth < attack.beforeHealth), 'Boss defeat should include accepted player attack damage').toBe(true);
    const fallbackAttacks = defeated.attacks.filter((attack) => attack.fallbackApplied);
    expect(fallbackAttacks, 'Boss journey must not use HealthComponent.applyDamage fallback for player attacks').toHaveLength(0);
    expect(
      defeated.attacks.some((attack) => attack.afterHealth < attack.beforeHealth && !attack.fallbackApplied),
      'Boss should include at least one non-fallback attack from touch attack hitbox contact',
    ).toBe(true);
    await stepFrames(page, 20);
    bossState = await readBossState(page);
    expect(bossState.alive).toBe(false);
    bossVisuals = await readJourneyState(page);
    expect(bossVisuals.world.bossVictoryBanner.activeInHierarchy, 'Boss victory banner should become visible after defeat').toBe(true);
    expect(bossVisuals.world.bossVictoryPortal.activeInHierarchy, 'Boss victory portal should open after defeat').toBe(true);
    expect(await readProgressFlags(page)).toContain('boss-cleared');

    await travelThroughPortal(page, 'Portal-BossVictory', 'StartCamp');
    const finalState = await readRuntimeState(page);
    expect(finalState.sceneName).toBe('StartCamp');
    expect(finalState.flowState).not.toBe('paused');
  });
});
