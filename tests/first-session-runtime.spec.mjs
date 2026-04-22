import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer,
  openPreviewScene,
  stepFrames,
  readPlayerHealth,
  readRuntimeState,
  killPlayer,
} from './helpers/playwright-cocos-helpers.mjs';

async function readFirstSessionRuntime(page) {
  return page.evaluate(() => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const hudRoot = canvas?.getChildByName?.('HudRoot');
    const touchHudRoot = canvas?.getChildByName?.('TouchHudRoot');
    const playerNode = canvas?.getChildByName?.('WorldRoot')?.getChildByName?.('Player');
    const gameHud = hudRoot?.components?.find((component) => component?.constructor?.name === 'GameHud');
    const pauseMenu = hudRoot?.components?.find((component) => component?.constructor?.name === 'PauseMenuController');

    const findNode = (root, name) => {
      if (!root) {
        return null;
      }

      if (root.name === name) {
        return root;
      }

      for (const child of (root.children ?? [])) {
        const matched = findNode(child, name);
        if (matched) {
          return matched;
        }
      }

      return null;
    };

    const canvasElement = document.querySelector('canvas');
    const canvasRect = canvasElement?.getBoundingClientRect?.();

    const summarizeNode = (node) => {
      const uiTransform = node?.components?.find((component) => component?.constructor?.name === 'UITransform');
      const screenPosition = node && canvasRect
        ? {
            x: canvasRect.x + node.worldPosition.x,
            y: canvasRect.y + canvasRect.height - node.worldPosition.y,
          }
        : null;
      return node
        ? {
            active: node.active ?? false,
            activeInHierarchy: node.activeInHierarchy ?? false,
            position: { x: node.position.x, y: node.position.y, z: node.position.z },
            worldPosition: { x: node.worldPosition.x, y: node.worldPosition.y, z: node.worldPosition.z },
            screenPosition,
            size: uiTransform
              ? { width: uiTransform.contentSize.width, height: uiTransform.contentSize.height }
              : null,
            scale: { x: node.scale.x, y: node.scale.y, z: node.scale.z },
          }
        : null;
    };

    const sceneTitleLabel = gameHud?.sceneTitleLabel;
    const objectiveLabel = gameHud?.objectiveLabel;
    const controlsLabel = gameHud?.controlsLabel;
    const mobileHintText = String(gameHud?.mobileHintText ?? '');
    const objectiveText = String(gameHud?.objectiveText ?? '');
    const sceneTitleText = String(gameHud?.sceneTitle ?? '');

    return {
      sceneName: scene?.name ?? '',
      hasHudRoot: Boolean(hudRoot?.activeInHierarchy),
      hasTouchHudRoot: Boolean(touchHudRoot?.activeInHierarchy),
      player: summarizeNode(playerNode),
      sceneTitleText,
      objectiveText,
      mobileHintText,
      sceneTitleLabelText: String(sceneTitleLabel?.string ?? ''),
      objectiveLabelText: String(objectiveLabel?.string ?? ''),
      controlsLabelText: String(controlsLabel?.string ?? ''),
      hud: {
        sceneTitle: summarizeNode(findNode(hudRoot, 'HudSceneTitle')),
        objectiveCard: summarizeNode(findNode(hudRoot, 'HudObjectiveCard')),
        controlsCard: summarizeNode(findNode(hudRoot, 'HudControlsCard')),
        pausePanel: summarizeNode(findNode(hudRoot, 'PausePanel')),
      },
      touch: {
        joystick: summarizeNode(findNode(touchHudRoot, 'Joystick')),
        attack: summarizeNode(findNode(touchHudRoot, 'TouchAttack')),
        summon: summarizeNode(findNode(touchHudRoot, 'TouchPlaceEcho')),
        respawn: summarizeNode(findNode(touchHudRoot, 'TouchRespawn')),
        pause: summarizeNode(findNode(touchHudRoot, 'TouchPause')),
        echoBox: summarizeNode(findNode(touchHudRoot, 'TouchEchoBox')),
        echoFlower: summarizeNode(findNode(touchHudRoot, 'TouchEchoFlower')),
        echoBomb: summarizeNode(findNode(touchHudRoot, 'TouchEchoBomb')),
      },
      pause: {
        flowState: String(
          canvas
            ?.getChildByName?.('PersistentRoot')
            ?.components?.find((component) => component?.constructor?.name === 'GameManager')
            ?.getFlowState?.() ?? '',
        ),
        pauseMenuActive: Boolean(pauseMenu?.enabled ?? false),
      },
    };
  });
}

async function getRuntimeNodePoint(page, nodeName) {
  return page.evaluate((requestedButtonName) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const canvasElement = document.querySelector('canvas');
    const canvasRect = canvasElement?.getBoundingClientRect?.();

    const findNode = (root, name) => {
      if (!root) {
        return null;
      }

      if (root.name === name) {
        return root;
      }

      for (const child of (root.children ?? [])) {
        const matched = findNode(child, name);
        if (matched) {
          return matched;
        }
      }

      return null;
    };

    const node = findNode(canvas, requestedButtonName);
    const uiTransform = node?.components?.find((component) => component?.constructor?.name === 'UITransform');
    if (!node || !uiTransform || !canvasRect) {
      throw new Error(`Runtime node ${requestedButtonName} is missing a click target.`);
    }

    return {
      name: node.name,
      x: canvasRect.x + node.worldPosition.x,
      y: canvasRect.y + canvasRect.height - node.worldPosition.y,
      active: node.active ?? false,
      activeInHierarchy: node.activeInHierarchy ?? false,
      width: uiTransform.contentSize.width,
      height: uiTransform.contentSize.height,
    };
  }, nodeName);
}

async function clickRuntimeNode(page, nodeName) {
  const commandTarget = await page.evaluate((requestedButtonName) => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');

    const findNode = (root, name) => {
      if (!root) {
        return null;
      }

      if (root.name === name) {
        return root;
      }

      for (const child of (root.children ?? [])) {
        const matched = findNode(child, name);
        if (matched) {
          return matched;
        }
      }

      return null;
    };

    const node = findNode(canvas, requestedButtonName);
    const button = node?.components?.find((component) => component?.constructor?.name === 'TouchCommandButton');
    if (!node || !button) {
      return null;
    }

    const wasActiveInHierarchy = node.activeInHierarchy ?? false;
    const touchId = Math.floor(Math.random() * 10000) + 1;
    const event = {
      getID: () => touchId,
    };

    button.onTouchStart(event);
    button.onTouchEnd(event);

    return {
      name: node.name,
      activeInHierarchy: wasActiveInHierarchy,
      syntheticTouch: true,
    };
  }, nodeName);

  if (commandTarget) {
    expect(commandTarget.activeInHierarchy, `${nodeName} should be visible before synthetic touch`).toBe(true);
    return commandTarget;
  }

  const target = await getRuntimeNodePoint(page, nodeName);
  expect(target.activeInHierarchy, `${nodeName} should be visible before viewport click`).toBe(true);
  await page.mouse.click(target.x, target.y);
  return target;
}

async function clickRuntimeViewportNode(page, nodeName) {
  const target = await getRuntimeNodePoint(page, nodeName);
  expect(target.activeInHierarchy, `${nodeName} should be visible before viewport click`).toBe(true);
  await page.mouse.click(target.x, target.y);
  return target;
}

async function dragRuntimeJoystick(page, { x, y, frames = 18 }) {
  const target = await getRuntimeNodePoint(page, 'Joystick');
  expect(target.activeInHierarchy, 'Joystick should be visible before viewport drag').toBe(true);
  const before = (await readRuntimeState(page)).playerPosition;

  await page.mouse.move(target.x, target.y);
  await page.mouse.down();
  await page.mouse.move(target.x + x, target.y - y, { steps: 5 });
  await stepFrames(page, frames);
  const afterMove = (await readRuntimeState(page)).playerPosition;
  await page.mouse.up();
  await stepFrames(page, 1);

  return { before, afterMove };
}

function assertNearScreen(state, name, bounds) {
  expect(state?.activeInHierarchy, `${name} should be active in hierarchy`).toBe(true);
  expect(state?.size, `${name} should have a UITransform size`).toBeTruthy();
  expect(state?.screenPosition?.x ?? -1, `${name} should remain inside the viewport on X`).toBeGreaterThanOrEqual(0);
  expect(state?.screenPosition?.x ?? 99999, `${name} should remain inside the viewport on X`).toBeLessThanOrEqual(bounds.maxX);
  expect(state?.screenPosition?.y ?? -1, `${name} should remain inside the viewport on Y`).toBeGreaterThanOrEqual(0);
  expect(state?.screenPosition?.y ?? 99999, `${name} should remain inside the viewport on Y`).toBeLessThanOrEqual(bounds.maxY);
}

test.describe('first-session runtime smoke', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensurePreviewServer(baseURL);
  });

  test('StartCamp first-screen runtime smoke keeps the touch-first loop visible and executable', async ({ page }) => {
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest', 'CampGate-Closed']);

    await page.waitForFunction(() => {
      const scene = window.cc?.director?.getScene?.();
      const canvas = scene?.getChildByName?.('Canvas');
      const hudRoot = canvas?.getChildByName?.('HudRoot');
      const touchHudRoot = canvas?.getChildByName?.('TouchHudRoot');
      const gameHud = hudRoot?.components?.find((component) => component?.constructor?.name === 'GameHud');
      return Boolean(
        hudRoot?.activeInHierarchy &&
        touchHudRoot?.activeInHierarchy &&
        gameHud?.sceneTitleLabel?.string?.trim?.() &&
        gameHud?.objectiveLabel?.string?.trim?.() &&
        gameHud?.mobileHintText?.trim?.(),
      );
    }, { timeout: 5_000 });

    const state = await readFirstSessionRuntime(page);
    expect(state.sceneName).toBe('StartCamp');
    expect(state.hasHudRoot).toBe(true);
    expect(state.hasTouchHudRoot).toBe(true);
    expect(state.sceneTitleText.trim()).not.toBe('');
    expect(state.objectiveText.trim()).not.toBe('');
    expect(state.mobileHintText.trim()).not.toBe('');
    expect(state.sceneTitleLabelText.trim()).not.toBe('');
    expect(state.objectiveLabelText.trim()).not.toBe('');
    expect(state.controlsLabelText.trim()).not.toBe('');
    expect(state.sceneTitleLabelText).not.toMatch(/loading|placeholder|todo|fixme|scene/i);
    expect(state.objectiveLabelText).not.toMatch(/loading|placeholder|todo|fixme/i);

    const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
    const bounds = {
      maxX: viewport.width,
      maxY: viewport.height,
    };

    assertNearScreen(state.touch.joystick, 'Touch joystick', bounds);
    assertNearScreen(state.touch.attack, 'TouchAttack', bounds);
    assertNearScreen(state.touch.summon, 'TouchPlaceEcho', bounds);
    assertNearScreen(state.touch.pause, 'TouchPause', bounds);

    expect(state.touch.joystick?.active).toBe(true);
    expect(state.touch.attack?.active).toBe(true);
    expect(state.touch.summon?.active).toBe(true);
    expect(state.touch.pause?.active).toBe(true);
    expect(state.touch.respawn).toBeTruthy();
    expect(state.touch.respawn?.size).toBeTruthy();
  });

  test('StartCamp touch-only actions can move, attack, summon, pause, resume, and respawn', async ({ page }) => {
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest', 'CampGate-Closed']);

    const moveResult = await dragRuntimeJoystick(page, { x: 52, y: 0, frames: 18 });
    expect(moveResult.afterMove.x).toBeGreaterThan(moveResult.before.x + 20);

    await clickRuntimeViewportNode(page, 'TouchAttack');
    let runtime = await readRuntimeState(page);
    expect(runtime.isAttacking).toBe(true);
    await stepFrames(page, 2);

    await clickRuntimeNode(page, 'TouchPlaceEcho');
    await stepFrames(page, 4);
    runtime = await readRuntimeState(page);
    expect(runtime.selectedEcho).toBe(0);
    expect(runtime.echoNames).toContain('Echo-box');

    await clickRuntimeNode(page, 'TouchPause');
    await stepFrames(page, 2);
    const pausedState = await readFirstSessionRuntime(page);
    expect(pausedState.pause.flowState).toBe('paused');
    expect(pausedState.hud.pausePanel?.active).toBe(true);
    expect(pausedState.touch.pause?.active).toBe(false);

    await clickRuntimeNode(page, 'PauseContinue');
    await stepFrames(page, 2);
    runtime = await readRuntimeState(page);
    expect(runtime.flowState).not.toBe('paused');

    await killPlayer(page, { disableAutoRespawn: true });
    const deadHealth = await readPlayerHealth(page);
    expect(deadHealth.current).toBe(0);

    await clickRuntimeNode(page, 'TouchPause');
    await stepFrames(page, 2);
    await clickRuntimeNode(page, 'PauseRestart');
    await stepFrames(page, 4);
    const respawnHealth = await readPlayerHealth(page);
    expect(respawnHealth.current).toBe(respawnHealth.max);
  });
});
