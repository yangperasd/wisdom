import { test, expect } from '@playwright/test';

async function ensurePreviewServer(baseURL) {
  const response = await fetch(baseURL);
  if (!response.ok) {
    throw new Error(`Preview server is not healthy at ${baseURL} (status ${response.status}).`);
  }
}

async function configurePreviewScene(page, sceneName) {
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

async function openPreviewScene(page, sceneName, readyNodeNames = []) {
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

async function stepFrames(page, frameCount = 1) {
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

async function resetMechanicsLab(page) {
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

async function readRuntimeState(page) {
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
    const gateClosed = worldRoot?.getChildByName?.('Gate-Closed');
    const gateOpen = worldRoot?.getChildByName?.('Gate-Open');
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


async function pressTouchButton(page, buttonName) {
  return page.evaluate((nodeName) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const touchHudRoot = canvas?.getChildByName?.('TouchHudRoot');
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
    };
  }, buttonName);
}

async function dragJoystick(page, { x, y, frames = 20 }) {
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

async function movePlayerNearTarget(page, targetName, offsetX = -18, offsetY = 0) {
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

async function unlockEcho(page, echoId) {
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

async function triggerPlateContact(page, plateName, echoName) {
  return page.evaluate(({ requestedPlateName, requestedEchoName }) => {
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

    plateSwitch.onBeginContact(null, echoCollider, null);

    const gateClosed = worldRoot?.getChildByName?.('Gate-Closed');
    const gateOpen = worldRoot?.getChildByName?.('Gate-Open');
    return {
      gateClosedActive: gateClosed?.active ?? null,
      gateOpenActive: gateOpen?.active ?? null,
    };
  }, { requestedPlateName: plateName, requestedEchoName: echoName });
}


test.beforeAll(async ({ baseURL }) => {
  await ensurePreviewServer(baseURL);
});

test('preview loads StartCamp mobile hud layout', async ({ page }) => {
  await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest', 'CampGate-Closed']);

  const state = await readRuntimeState(page);
  expect(state.title).toContain('Cocos Creator - wisdom');
  expect(state.hasCc).toBeTruthy();
  expect(state.hasHudRoot).toBe(true);
  expect(state.hasTouchHudRoot).toBe(true);
  expect(state.playerPosition?.x ?? 0).toBeLessThan(-450);
  expect(state.worldNames).toEqual(
    expect.arrayContaining([
      'Player',
      'EchoRoot',
      'CampGate-Closed',
      'Portal-FieldWest',
      'CampEnemy',
    ]),
  );
  expect(state.touchHudNames).toEqual(
    expect.arrayContaining([
      'Joystick',
      'TouchAttack',
      'TouchPlaceEcho',
      'TouchRespawn',
      'TouchEchoBox',
      'TouchEchoFlower',
      'TouchEchoBomb',
      'TouchPause',
    ]),
  );
  expect(state.joystickPosition?.x ?? 0).toBeLessThan(-450);
  expect(state.attackButtonPosition?.x ?? 0).toBeGreaterThan(450);
  expect(state.attackButtonPosition?.y ?? 0).toBeGreaterThan(-260);
  expect(state.controlsCardActive).toBe(false);
  expect(state.resetButtonActive).toBe(false);
  expect(state.checkpointLabelActive).toBe(false);
});

test('touch joystick moves player and attack button enters attack state', async ({ page }) => {
  await openPreviewScene(page, 'MechanicsLab', ['Player', 'Plate-01', 'Trap-01', 'BombGateRoot']);
  await resetMechanicsLab(page);

  const moveResult = await dragJoystick(page, { x: 52, y: 0, frames: 20 });
  expect(moveResult.afterMove.x).toBeGreaterThan(moveResult.before.x + 40);
  expect(Math.abs(moveResult.knobPosition?.x ?? 0)).toBeLessThan(1);
  expect(Math.abs(moveResult.knobPosition?.y ?? 0)).toBeLessThan(1);

  await pressTouchButton(page, 'TouchAttack');
  await stepFrames(page, 1);

  const state = await readRuntimeState(page);
  expect(state.isAttacking).toBe(true);
});

test('touch summon button can place a box onto the plate and open the gate', async ({ page }) => {
  await openPreviewScene(page, 'MechanicsLab', ['Player', 'Plate-01', 'Trap-01', 'BombGateRoot']);
  await resetMechanicsLab(page);

  await movePlayerNearTarget(page, 'Plate-01', -18, 0);
  await stepFrames(page, 2);
  await pressTouchButton(page, 'TouchEchoBox');
  await pressTouchButton(page, 'TouchPlaceEcho');
  await stepFrames(page, 4);

  const plateState = await triggerPlateContact(page, 'Plate-01', 'Echo-box');
  expect(plateState.gateOpenActive).toBe(true);
  expect(plateState.gateClosedActive).toBe(false);

  const state = await readRuntimeState(page);
  expect(state.selectedEcho).toBe(0);
  expect(state.echoNames).toContain('Echo-box');
  expect(state.gateOpenActive).toBe(true);
  expect(state.gateClosedActive).toBe(false);
});

test('touch echo selection plus bomb placement can open the cracked wall', async ({ page }) => {
  await openPreviewScene(page, 'MechanicsLab', ['Player', 'Plate-01', 'Trap-01', 'BombGateRoot']);
  await resetMechanicsLab(page);

  const unlocked = await unlockEcho(page, 2);
  expect(unlocked).toEqual(expect.arrayContaining([0, 2]));

  await movePlayerNearTarget(page, 'BombWall-Closed', -18, 0);
  await stepFrames(page, 2);
  await pressTouchButton(page, 'TouchEchoBomb');
  await pressTouchButton(page, 'TouchPlaceEcho');
  await stepFrames(page, 100);

  const state = await readRuntimeState(page);
  expect(state.selectedEcho).toBe(2);
  expect(state.bombWallOpenActive).toBe(true);
  expect(state.bombWallClosedActive).toBe(false);
});
