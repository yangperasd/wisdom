export async function ensurePreviewServer(baseURL) {
  const response = await fetch(baseURL);
  if (!response.ok) {
    throw new Error(`Preview server is not healthy at ${baseURL} (status ${response.status}).`);
  }
}

export async function configurePreviewScene(page, sceneName) {
  await page.route('**/settings.js?scene=current_scene', async (route) => {
    const targetUrl = new URL(route.request().url());
    const sceneRef = sceneName.startsWith('db://') ? sceneName : `db://assets/scenes/${sceneName}.scene`;

    targetUrl.searchParams.set('scene', sceneRef);
    targetUrl.searchParams.set('_codex_scene', `${Date.now()}`);

    const response = await page.context().request.get(targetUrl.toString(), {
      headers: {
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
    });

    const headers = response.headers();
    delete headers['content-length'];
    delete headers['etag'];

    await route.fulfill({
      status: response.status(),
      contentType: 'application/javascript; charset=utf-8',
      headers: {
        ...headers,
        'cache-control': 'no-store',
      },
      body: await response.text(),
    });
  });
}

export async function openPreviewScene(page, sceneName, readyNodeNames = []) {
  await configurePreviewScene(page, sceneName);
  await page.goto('/');
  await page.waitForFunction(() => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const player = worldRoot?.getChildByName?.('Player');
    return Boolean(window.cc && canvas && worldRoot && player);
  });
  await page.waitForFunction((requestedReadyNodeNames) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');

    if (!canvas || !worldRoot) {
      return false;
    }

    return requestedReadyNodeNames.every((nodeName) => {
      return Boolean(worldRoot.getChildByName?.(nodeName) ?? canvas.getChildByName?.(nodeName));
    });
  }, readyNodeNames);
  await stepFrames(page, 5);
}

export async function stepFrames(page, frameCount = 1) {
  return page.evaluate((count) => {
    if (!window.cc?.game?.step) {
      throw new Error('Cocos runtime does not expose cc.game.step().');
    }

    for (let index = 0; index < count; index += 1) {
      window.cc.game.step();
    }

    return window.cc.director?.getTotalFrames?.() ?? 0;
  }, frameCount);
}

export async function resetMechanicsLab(page) {
  await page.evaluate(() => {
    const cc = window.cc;
    const scene = cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const persistentRoot = canvas?.getChildByName?.('PersistentRoot');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const echoRoot = worldRoot?.getChildByName?.('EchoRoot');
    const playerNode = worldRoot?.getChildByName?.('Player');
    const player = playerNode?.components?.find((component) => component?.constructor?.name === 'PlayerController');
    const echoManager = echoRoot?.components?.find((component) => component?.constructor?.name === 'EchoManager');
    const gameManager = persistentRoot?.components?.find((component) => component?.constructor?.name === 'GameManager');

    echoManager?.reclaimAll?.();
    echoManager?.selectEcho?.(0);
    gameManager?.requestRespawn?.();

    playerNode?.setPosition?.(-500, -20, 0);
    player?.setMoveInput?.(1, 0);
    player?.setMoveInput?.(0, 0);
  });

  await stepFrames(page, 8);
}

export async function readRuntimeState(page) {
  return page.evaluate(() => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const echoRoot = worldRoot?.getChildByName?.('EchoRoot');
    const touchHudRoot = canvas?.getChildByName?.('TouchHudRoot');
    const hudRoot = canvas?.getChildByName?.('HudRoot');
    const playerNode = worldRoot?.getChildByName?.('Player');
    const player = playerNode?.components?.find((component) => component?.constructor?.name === 'PlayerController');
    const echoManager = echoRoot?.components?.find((component) => component?.constructor?.name === 'EchoManager');
    const persistentRoot = canvas?.getChildByName?.('PersistentRoot');
    const gameManager = persistentRoot?.components?.find((component) => component?.constructor?.name === 'GameManager');
    const gateClosed = worldRoot?.getChildByName?.('Gate-Closed') ?? worldRoot?.getChildByName?.('CampGate-Closed');
    const gateOpen = worldRoot?.getChildByName?.('Gate-Open') ?? worldRoot?.getChildByName?.('CampGate-Open');
    const bombGateRoot = worldRoot?.getChildByName?.('BombGateRoot');
    const bombWallClosed = bombGateRoot?.getChildByName?.('BombWall-Closed');
    const bombWallOpen = bombGateRoot?.getChildByName?.('BombWall-Open');
    const touchAttack = touchHudRoot?.getChildByName?.('TouchAttack');
    const touchPause = touchHudRoot?.getChildByName?.('TouchPause');
    const touchRespawn = touchHudRoot?.getChildByName?.('TouchRespawn');
    const joystick = touchHudRoot?.getChildByName?.('Joystick');
    const controlsCard = hudRoot?.getChildByName?.('HudControlsCard');
    const checkpointLabel = hudRoot?.getChildByName?.('HudCheckpoint');

    return {
      title: document.title,
      hasCc: Boolean(window.cc),
      sceneName: scene?.name ?? '',
      playerPosition: playerNode
        ? { x: playerNode.position.x, y: playerNode.position.y, z: playerNode.position.z }
        : null,
      isAttacking: player?.isAttacking?.() ?? false,
      selectedEcho: echoManager?.getCurrentEchoId?.() ?? null,
      echoNames: echoRoot?.children?.map((node) => node.name) ?? [],
      worldNames: worldRoot?.children?.map((node) => node.name) ?? [],
      touchHudNames: touchHudRoot?.children?.map((node) => node.name) ?? [],
      hasHudRoot: Boolean(hudRoot),
      hasTouchHudRoot: Boolean(touchHudRoot),
      joystickPosition: joystick
        ? { x: joystick.position.x, y: joystick.position.y, z: joystick.position.z }
        : null,
      attackButtonPosition: touchAttack
        ? { x: touchAttack.position.x, y: touchAttack.position.y, z: touchAttack.position.z }
        : null,
      pauseButtonPosition: touchPause
        ? { x: touchPause.position.x, y: touchPause.position.y, z: touchPause.position.z }
        : null,
      resetButtonActive: touchRespawn?.active ?? null,
      checkpointLabelActive: checkpointLabel?.active ?? null,
      controlsCardActive: controlsCard?.active ?? null,
      gateClosedActive: gateClosed?.active ?? null,
      gateOpenActive: gateOpen?.active ?? null,
      bombWallClosedActive: bombWallClosed?.active ?? null,
      bombWallOpenActive: bombWallOpen?.active ?? null,
      flowState: gameManager?.getFlowState?.() ?? null,
    };
  });
}

export async function readSceneSwitchState(page) {
  return page.evaluate(() => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const persistentRoot = canvas?.getChildByName?.('PersistentRoot');
    const sceneLoader = persistentRoot?.components?.find((component) => component?.constructor?.name === 'SceneLoader')
      ?? window.SceneLoader?.instance
      ?? null;

    return sceneLoader?.getSwitchState?.() ?? null;
  });
}

export async function simulateSceneSwitchFailure(page, targetSceneName, options = {}) {
  return page.evaluate(({ requestedTargetSceneName, failureMode, failureMessage }) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const persistentRoot = canvas?.getChildByName?.('PersistentRoot');
    const sceneLoader = persistentRoot?.components?.find((component) => component?.constructor?.name === 'SceneLoader');
    const director = window.cc?.director;
    if (!sceneLoader || !director?.loadScene) {
      throw new Error('SceneLoader or director.loadScene is missing from the runtime graph.');
    }

    const originalLoadScene = director.loadScene;
    director.loadScene = (...args) => {
      if (failureMode === 'throw') {
        throw new Error(failureMessage);
      }

      return false;
    };

    const accepted = sceneLoader.switchScene(requestedTargetSceneName);
    const state = sceneLoader.getSwitchState?.() ?? null;
    const retryTarget = state?.targetScene ?? null;
    const retryAvailable = Boolean(state?.status === 'failed' && retryTarget && sceneLoader.retryLastFailedSwitch);
    director.loadScene = originalLoadScene;

    return {
      accepted,
      state,
      retryTarget,
      retryAvailable,
    };
  }, {
    requestedTargetSceneName: targetSceneName,
    failureMode: options.failureMode ?? 'return-false',
    failureMessage: options.failureMessage ?? `Injected preview loadScene failure for ${targetSceneName}.`,
  });
}


export async function pressTouchButton(page, buttonName) {
  return page.evaluate((nodeName) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const touchHudRoot = canvas?.getChildByName?.('TouchHudRoot');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const playerNode = worldRoot?.getChildByName?.('Player');
    const player = playerNode?.components?.find((component) => component?.constructor?.name === 'PlayerController');
    const buttonNode = touchHudRoot?.getChildByName?.(nodeName);
    const button = buttonNode?.components?.find((component) => component?.constructor?.name === 'TouchCommandButton');
    if (!buttonNode || !button) {
      throw new Error(`Touch button ${nodeName} is missing from the runtime graph.`);
    }

    const touchId = Math.floor(Math.random() * 10000) + 1;
    const event = {
      getID: () => touchId,
    };

    button.onTouchStart(event);
    button.onTouchEnd(event);

    return {
      buttonName: buttonNode.name,
      isAttacking: player?.isAttacking?.() ?? null,
    };
  }, buttonName);
}

export async function dragJoystick(page, { x, y, frames = 20 }) {
  return page.evaluate(({ x: localX, y: localY, frames: frameCount }) => {
    const cc = window.cc;
    const scene = cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const playerNode = worldRoot?.getChildByName?.('Player');
    const touchHudRoot = canvas?.getChildByName?.('TouchHudRoot');
    const joystickNode = touchHudRoot?.getChildByName?.('Joystick');
    const joystick = joystickNode?.components?.find((component) => component?.constructor?.name === 'TouchJoystick');
    const uiTransform = joystickNode?.components?.find((component) => component?.constructor?.name === 'UITransform');
    const knobNode = joystickNode?.getChildByName?.('Joystick-Knob');
    if (!playerNode || !joystickNode || !joystick || !uiTransform) {
      throw new Error('Joystick runtime graph is incomplete.');
    }

    const touchId = 101;
    const startWorld = uiTransform.convertToWorldSpaceAR(new cc.Vec3(0, 0, 0));
    const endWorld = uiTransform.convertToWorldSpaceAR(new cc.Vec3(localX, localY, 0));
    const makeEvent = (worldPosition) => ({
      getID: () => touchId,
      getUILocation: () => ({
        x: worldPosition.x,
        y: worldPosition.y,
      }),
    });

    const before = {
      x: playerNode.position.x,
      y: playerNode.position.y,
      z: playerNode.position.z,
    };

    joystick.onTouchStart(makeEvent(startWorld));
    joystick.onTouchMove(makeEvent(endWorld));

    for (let index = 0; index < frameCount; index += 1) {
      cc.game.step();
    }

    const afterMove = {
      x: playerNode.position.x,
      y: playerNode.position.y,
      z: playerNode.position.z,
    };

    joystick.onTouchEnd(makeEvent(endWorld));
    cc.game.step();

    return {
      before,
      afterMove,
      afterRelease: {
        x: playerNode.position.x,
        y: playerNode.position.y,
        z: playerNode.position.z,
      },
      knobPosition: knobNode
        ? { x: knobNode.position.x, y: knobNode.position.y, z: knobNode.position.z }
        : null,
    };
  }, { x, y, frames });
}

export async function movePlayerNearTarget(page, targetName, offsetX = -18, offsetY = 0) {
  return page.evaluate(
    ({ targetName: requestedTargetName, offsetX: requestedOffsetX, offsetY: requestedOffsetY }) => {
      const scene = window.cc?.director?.getScene?.();
      const canvas = scene?.getChildByName?.('Canvas');
      const worldRoot = canvas?.getChildByName?.('WorldRoot');
      const playerNode = worldRoot?.getChildByName?.('Player');
      const player = playerNode?.components?.find((component) => component?.constructor?.name === 'PlayerController');

      const findNodeByName = (root, name) => {
        if (!root) {
          return null;
        }

        if (root.name === name) {
          return root;
        }

        for (const child of root.children) {
          const matched = findNodeByName(child, name);
          if (matched) {
            return matched;
          }
        }

        return null;
      };

      const target = findNodeByName(worldRoot, requestedTargetName);
      if (!playerNode || !player || !target) {
        throw new Error(`Unable to reposition player near ${requestedTargetName}.`);
      }

      playerNode.setWorldPosition(
        target.worldPosition.x + requestedOffsetX,
        target.worldPosition.y + requestedOffsetY,
        playerNode.worldPosition.z,
      );
      player.setMoveInput(1, 0);
      player.setMoveInput(0, 0);

      return {
        playerPosition: {
          x: playerNode.position.x,
          y: playerNode.position.y,
          z: playerNode.position.z,
        },
        targetPosition: {
          x: target.worldPosition.x,
          y: target.worldPosition.y,
          z: target.worldPosition.z,
        },
      };
    },
    { targetName, offsetX, offsetY },
  );
}

export async function unlockEcho(page, echoId) {
  return page.evaluate((requestedEchoId) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const echoRoot = worldRoot?.getChildByName?.('EchoRoot');
    const echoManager = echoRoot?.components?.find((component) => component?.constructor?.name === 'EchoManager');
    echoManager?.unlockEcho?.(requestedEchoId);
    return echoManager?.getUnlockedEchoes?.() ?? [];
  }, echoId);
}

export async function triggerPlateContact(page, plateName, echoName, options = {}) {
  return page.evaluate(({ requestedPlateName, requestedEchoName, gateClosedName, gateOpenName, maxDistance }) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const echoRoot = worldRoot?.getChildByName?.('EchoRoot');
    const plateNode = worldRoot?.getChildByName?.(requestedPlateName);
    const echoNode = echoRoot?.children?.find((node) => node.name === requestedEchoName);
    const plateSwitch = plateNode?.components?.find((component) => component?.constructor?.name === 'PressurePlateSwitch');
    const echoCollider = echoNode?.components?.find((component) => component?.constructor?.name === 'BoxCollider2D');
    if (!plateSwitch || !echoCollider) {
      throw new Error(`Unable to trigger pressure plate contact for ${requestedPlateName} with ${requestedEchoName}.`);
    }

    const echoPosition = echoNode.worldPosition;
    const platePosition = plateNode.worldPosition;
    const echoDistance = Math.hypot(
      echoPosition.x - platePosition.x,
      echoPosition.y - platePosition.y,
    );
    if (Number.isFinite(maxDistance) && echoDistance > maxDistance) {
      throw new Error(`${requestedEchoName} is too far from ${requestedPlateName} (${echoDistance.toFixed(1)}).`);
    }

    plateSwitch.onBeginContact(null, echoCollider, null);

    const gateClosed = (gateClosedName ? worldRoot?.getChildByName?.(gateClosedName) : null)
      ?? worldRoot?.getChildByName?.('Gate-Closed')
      ?? worldRoot?.getChildByName?.('CampGate-Closed');
    const gateOpen = (gateOpenName ? worldRoot?.getChildByName?.(gateOpenName) : null)
      ?? worldRoot?.getChildByName?.('Gate-Open')
      ?? worldRoot?.getChildByName?.('CampGate-Open');
    return {
      echoDistance,
      gateClosedActive: gateClosed?.active ?? null,
      gateOpenActive: gateOpen?.active ?? null,
    };
  }, {
    requestedPlateName: plateName,
    requestedEchoName: echoName,
    gateClosedName: options.gateClosedName ?? null,
    gateOpenName: options.gateOpenName ?? null,
    maxDistance: options.maxDistance ?? null,
  });
}

export async function triggerPortalContact(page, portalName, options = {}) {
  return page.evaluate(({ requestedPortalName, interceptSwitch, maxDistance }) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const persistentRoot = canvas?.getChildByName?.('PersistentRoot');
    const portalNode = worldRoot?.getChildByName?.(requestedPortalName);
    const playerNode = worldRoot?.getChildByName?.('Player');
    const portal = portalNode?.components?.find((component) => component?.constructor?.name === 'ScenePortal');
    const playerCollider = playerNode?.components?.find((component) => component?.constructor?.name === 'BoxCollider2D');
    const sceneLoader = portal?.sceneLoader
      ?? persistentRoot?.components?.find((component) => component?.constructor?.name === 'SceneLoader')
      ?? null;
    const gameManager = persistentRoot?.components?.find((component) => component?.constructor?.name === 'GameManager');

    if (!portalNode || !portal || !playerCollider || !sceneLoader) {
      throw new Error(`Unable to trigger portal contact for ${requestedPortalName}.`);
    }

    const wasActive = portalNode.activeInHierarchy ?? false;
    const playerPosition = playerNode.worldPosition;
    const portalPosition = portalNode.worldPosition;
    const playerDistance = Math.hypot(
      playerPosition.x - portalPosition.x,
      playerPosition.y - portalPosition.y,
    );
    if (Number.isFinite(maxDistance) && playerDistance > maxDistance) {
      throw new Error(`Player is too far from ${requestedPortalName} (${playerDistance.toFixed(1)}).`);
    }

    const targetScene = portal.targetScene ?? '';
    let requestedScene = null;
    const originalSwitchScene = sceneLoader.switchScene;
    if (interceptSwitch) {
      sceneLoader.switchScene = (sceneName) => {
        requestedScene = sceneName;
      };
    }

    portal.onBeginContact(null, playerCollider, null);
    if (interceptSwitch) {
      sceneLoader.switchScene = originalSwitchScene;
    }

    const checkpoint = gameManager?.getCheckpoint?.() ?? null;

    return {
      portalName: portalNode.name,
      wasActive,
      playerDistance,
      targetScene,
      requestedScene,
      checkpointSceneName: checkpoint?.sceneName ?? null,
      checkpointMarkerId: checkpoint?.markerId ?? null,
    };
  }, {
    requestedPortalName: portalName,
    interceptSwitch: options.interceptSwitch ?? false,
    maxDistance: options.maxDistance ?? null,
  });
}

export async function readPlayerHealth(page) {
  return page.evaluate(() => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const playerNode = worldRoot?.getChildByName?.('Player');
    const health = playerNode?.components?.find(c => c?.constructor?.name === 'HealthComponent');
    return {
      current: health?.getCurrentHealth?.() ?? 0,
      max: health?.maxHealth ?? 0,
    };
  });
}

export async function readBossState(page) {
  return page.evaluate(() => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    // Find boss nodes - look for BossRoot or similar
    const findComp = (root, compName) => {
      if (!root) return null;
      const comp = root.components?.find(c => c?.constructor?.name === compName);
      if (comp) return comp;
      for (const child of (root.children ?? [])) {
        const found = findComp(child, compName);
        if (found) return found;
      }
      return null;
    };
    const encounter = findComp(worldRoot, 'BossEncounterController');
    const shield = findComp(worldRoot, 'BossShieldPhaseController');
    const bossHealth = shield?.bossHealth;

    // Read raw fields instead of calling methods that chain into
    // shieldTarget.isCurrentlyBroken() -- that method name gets mangled
    // or the serialized reference points to a Node, not the component.
    const health = bossHealth?.getCurrentHealth?.() ?? 0;
    const maxHealth = bossHealth?.maxHealth ?? 0;
    const alive = health > 0;
    const vulnerableTimer = shield?.vulnerableTimer ?? 0;

    // BreakableTarget.isBroken is the private backing field; it is
    // accessible at runtime in JS even though TS marks it private.
    // shieldTarget may be the component or a node reference -- handle both.
    const target = shield?.shieldTarget;
    let shieldBroken = false;
    if (target != null) {
      if (typeof target.isBroken === 'boolean') {
        // Direct component reference -- read backing field
        shieldBroken = target.isBroken;
      } else if (typeof target.isCurrentlyBroken === 'function') {
        // Component with intact method -- safe to call
        shieldBroken = target.isCurrentlyBroken();
      } else {
        // Fallback: resolve BreakableTarget component from the node
        const breakable = target.components?.find(
          c => c?.constructor?.name === 'BreakableTarget',
        );
        shieldBroken = breakable?.isBroken ?? false;
      }
    }

    const vulnerable = alive && shieldBroken && vulnerableTimer > 0;
    const danger = alive && !vulnerable;

    return {
      alive,
      vulnerable,
      danger,
      health,
      maxHealth,
      vulnerableTimer,
      shieldBroken,
    };
  });
}

export async function readCheckpointState(page) {
  return page.evaluate(() => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const persistentRoot = canvas?.getChildByName?.('PersistentRoot');
    const gm = persistentRoot?.components?.find(c => c?.constructor?.name === 'GameManager');
    const cp = gm?.getCheckpoint?.();
    return {
      hasCheckpoint: cp !== null && cp !== undefined,
      sceneName: cp?.sceneName ?? null,
      markerId: cp?.markerId ?? null,
      position: cp?.worldPosition ? { x: cp.worldPosition.x, y: cp.worldPosition.y, z: cp.worldPosition.z } : null,
    };
  });
}

export async function readProgressFlags(page) {
  return page.evaluate(() => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const persistentRoot = canvas?.getChildByName?.('PersistentRoot');
    const gm = persistentRoot?.components?.find(c => c?.constructor?.name === 'GameManager');
    return gm?.getProgressFlags?.() ?? [];
  });
}

export async function applyDamageToPlayer(page, amount = 1) {
  return page.evaluate((dmg) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const playerNode = worldRoot?.getChildByName?.('Player');
    const health = playerNode?.components?.find(c => c?.constructor?.name === 'HealthComponent');
    const applied = health?.applyDamage?.(dmg) ?? false;
    return { applied, currentHealth: health?.getCurrentHealth?.() ?? 0 };
  }, amount);
}

export async function killPlayer(page, options = {}) {
  const { disableAutoRespawn = false } = options;
  return page.evaluate((opts) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const worldRoot = canvas?.getChildByName?.('WorldRoot');
    const playerNode = worldRoot?.getChildByName?.('Player');
    const persistentRoot = canvas?.getChildByName?.('PersistentRoot');
    const health = playerNode?.components?.find(c => c?.constructor?.name === 'HealthComponent');
    const playerCtrl = playerNode?.components?.find(c => c?.constructor?.name === 'PlayerController');
    const gameManager = persistentRoot?.components?.find(c => c?.constructor?.name === 'GameManager');
    const max = health?.maxHealth ?? 3;

    // The PlayerController now reacts to GAME_EVENT_RESPAWN_REQUESTED by calling
    // respawnAt(), which fully resets HP. That is the correct product behavior
    // (manual TouchRespawn and auto-death both restore HP through the same
    // event), but it prevents "deplete HP and observe HP=0" tests unless the
    // helper temporarily detaches the listener for the duration of the kill.
    const detached = opts.disableAutoRespawn && health && playerCtrl && gameManager;
    if (detached) {
      health.events?.off?.('health-depleted', playerCtrl.onHealthDepleted, playerCtrl);
      gameManager.events?.off?.('respawn-requested', playerCtrl.onRespawnRequested, playerCtrl);
    }

    // Apply enough damage to deplete, stepping between each to clear invulnerability.
    for (let i = 0; i < max + 5; i++) {
      health?.applyDamage?.(1);
      if (health) health.invulnerableTimer = 0;
    }

    // Restore the production wiring before the rest of the test runs.
    if (detached) {
      health.events?.on?.('health-depleted', playerCtrl.onHealthDepleted, playerCtrl);
      gameManager.events?.on?.('respawn-requested', playerCtrl.onRespawnRequested, playerCtrl);
    }

    return { currentHealth: health?.getCurrentHealth?.() ?? 0 };
  }, { disableAutoRespawn });
}

export async function saveGame(page) {
  return page.evaluate(() => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const persistentRoot = canvas?.getChildByName?.('PersistentRoot');
    const session = persistentRoot?.components?.find(c => c?.constructor?.name === 'GameSession');
    session?.saveNow?.();
    return true;
  });
}

export async function readSaveData(page) {
  return page.evaluate(() => {
    const raw = window.cc?.sys?.localStorage?.getItem?.('wisdom-mvp-save');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  });
}

export async function clearSaveData(page) {
  return page.evaluate(() => {
    window.cc?.sys?.localStorage?.removeItem?.('wisdom-mvp-save');
    return true;
  });
}

export async function waitForSceneSwitch(page, targetSceneName, timeoutMs = 5000) {
  await page.waitForFunction((name) => {
    const scene = window.cc?.director?.getScene?.();
    return scene?.name === name;
  }, targetSceneName, { timeout: timeoutMs });
}

/**
 * Prepare the page for a clean visual screenshot:
 * - Hide Cocos Creator preview toolbar
 * - Disable FPS / debug stats overlay
 * - Disable DebugHud component if present
 */
export async function prepareCleanScreenshot(page) {
  await page.evaluate(() => {
    // 1. Hide FPS stats panel
    if (window.cc?.debug?.setDisplayStats) {
      window.cc.debug.setDisplayStats(false);
    }
    // Alternative: profiler API
    if (window.cc?.profiler?.hideStats) {
      window.cc.profiler.hideStats();
    }

    // 2. Disable DebugHud component
    const scene = window.cc?.director?.getScene?.();
    if (!scene) return;
    const findComp = (root, name) => {
      if (!root) return null;
      const c = root.components?.find((x) => x?.constructor?.name === name);
      if (c) return c;
      for (const ch of root.children ?? []) {
        const f = findComp(ch, name);
        if (f) return f;
      }
      return null;
    };
    const debugHud = findComp(scene, 'DebugHud');
    if (debugHud) {
      debugHud.enabled = false;
      if (debugHud.node) debugHud.node.active = false;
    }

    // 3. Hide the Cocos preview toolbar (injected iframe/div at top)
    const toolbar = document.querySelector('#toolbar') ||
      document.querySelector('.toolbar') ||
      document.querySelector('[id*="cocostools"]');
    if (toolbar) toolbar.style.display = 'none';
  });
  // Step a frame to apply changes
  await stepFrames(page, 2);
}

export async function getCleanScreenshotOptions(page, options = {}) {
  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error('Viewport size is unavailable for clean screenshot capture.');
  }

  const cropTopPx = options.cropTopPx ?? 0;
  if (cropTopPx < 0 || cropTopPx > viewport.height) {
    throw new Error(`Invalid cropTopPx value: ${cropTopPx}`);
  }

  return {
    clip: {
      x: 0,
      y: cropTopPx,
      width: viewport.width,
      height: viewport.height - cropTopPx,
    },
  };
}

/**
 * Take a clean screenshot after the preview toolbar and debug overlays are hidden.
 * By default the full viewport is preserved so top HUD/title pixels are not lost.
 */
export async function takeCleanScreenshot(page, options = {}) {
  await prepareCleanScreenshot(page);
  return page.screenshot(await getCleanScreenshotOptions(page, options));
}

export async function readFlowState(page) {
  return page.evaluate(() => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const persistentRoot = canvas?.getChildByName?.('PersistentRoot');
    const gm = persistentRoot?.components?.find(c => c?.constructor?.name === 'GameManager');
    return gm?.getFlowState?.() ?? null;
  });
}

export async function setProgressFlag(page, flagId) {
  return page.evaluate((flag) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const persistentRoot = canvas?.getChildByName?.('PersistentRoot');
    const gm = persistentRoot?.components?.find(c => c?.constructor?.name === 'GameManager');
    return gm?.setProgressFlag?.(flag) ?? false;
  }, flagId);
}
