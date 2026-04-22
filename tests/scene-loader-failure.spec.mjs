import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer,
  openPreviewScene,
  readSceneSwitchState,
  simulateSceneSwitchFailure,
  stepFrames,
} from './helpers/playwright-cocos-helpers.mjs';

async function readObjectiveLabelText(page) {
  return page.evaluate(() => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const hudRoot = canvas?.getChildByName?.('HudRoot');
    const gameHud = hudRoot?.components?.find((component) => component?.constructor?.name === 'GameHud');
    return String(gameHud?.objectiveLabel?.string ?? '');
  });
}

test.describe('scene loader loading and fallback state', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensurePreviewServer(baseURL);
  });

  test('preview-injected loadScene failure leaves an observable retryable fallback state', async ({ page }) => {
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest']);

    const result = await simulateSceneSwitchFailure(page, 'DungeonHub', {
      failureMode: 'throw',
      failureMessage: 'Injected preview loadScene failure.',
    });

    expect(result.accepted, 'Injected preview failure should not be accepted as a successful switch').toBe(false);
    expect(result.state).toMatchObject({
      status: 'failed',
      targetScene: 'DungeonHub',
      errorMessage: 'Injected preview loadScene failure.',
      completedAt: 0,
    });
    expect(result.state.requestedAt, 'Failure state should retain the original request timestamp').toBeGreaterThan(0);
    expect(result.state.failedAt, 'Failure state should record when fallback became visible').toBeGreaterThanOrEqual(result.state.requestedAt);
    expect(result.retryTarget, 'Fallback state should retain the target for a retry affordance').toBe('DungeonHub');
    expect(result.retryAvailable, 'Fallback state should expose that retry can be attempted after failure').toBe(true);

    const stateAfterInjection = await readSceneSwitchState(page);
    expect(stateAfterInjection).toMatchObject({
      status: 'failed',
      targetScene: 'DungeonHub',
      errorMessage: 'Injected preview loadScene failure.',
    });

    const visibleFallback = await readObjectiveLabelText(page);
    expect(visibleFallback, 'Injected scene failure should surface a visible fallback/retry notice').toContain('加载');
    expect(visibleFallback).toContain('失败');
    expect(visibleFallback).toContain('重试');
  });

  test('preview-injected pending loadScene exposes a switching state before completion', async ({ page }) => {
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest']);

    const result = await page.evaluate(() => {
      const scene = window.cc?.director?.getScene?.();
      const canvas = scene?.getChildByName?.('Canvas');
      const persistentRoot = canvas?.getChildByName?.('PersistentRoot');
      const sceneLoader = persistentRoot?.components?.find((component) => component?.constructor?.name === 'SceneLoader');
      const director = window.cc?.director;
      if (!sceneLoader || !director?.loadScene) {
        throw new Error('SceneLoader or director.loadScene is missing from the runtime graph.');
      }

      const originalLoadScene = director.loadScene;
      let capturedCallback = null;
      sceneLoader.switchTimeoutSeconds = 0.01;
      director.loadScene = (_sceneName, onLaunched) => {
        capturedCallback = onLaunched;
        return true;
      };

      const accepted = sceneLoader.switchScene('FieldWest');
      const switchingState = sceneLoader.getSwitchState();
      const switchingObjectiveText = String(
        scene
          ?.getChildByName?.('Canvas')
          ?.getChildByName?.('HudRoot')
          ?.components?.find((component) => component?.constructor?.name === 'GameHud')
          ?.objectiveLabel?.string ?? '',
      );
      capturedCallback?.();
      const completedState = sceneLoader.getSwitchState();
      director.loadScene = originalLoadScene;

      return {
        accepted,
        switchingState,
        switchingObjectiveText,
        completedState,
        capturedCallback: Boolean(capturedCallback),
      };
    });

    expect(result.accepted).toBe(true);
    expect(result.capturedCallback).toBe(true);
    expect(result.switchingState).toMatchObject({
      status: 'switching',
      targetScene: 'FieldWest',
      errorMessage: '',
      completedAt: 0,
      failedAt: 0,
    });
    expect(result.switchingState.requestedAt).toBeGreaterThan(0);
    expect(result.switchingObjectiveText, 'Pending scene switch should surface visible loading copy').toContain('正在');
    expect(result.switchingObjectiveText).toContain('FieldWest');
    expect(result.completedState).toMatchObject({
      status: 'idle',
      targetScene: 'FieldWest',
      errorMessage: '',
      failedAt: 0,
    });
    expect(result.completedState.completedAt).toBeGreaterThanOrEqual(result.switchingState.requestedAt);

    await stepFrames(page, 2);
    await stepFrames(page, 10);
    const finalState = await readSceneSwitchState(page);
    expect(finalState.status).toBe('idle');
    expect(finalState.targetScene).toBe('FieldWest');
  });

  test('preview-injected pending loadScene times out into visible retryable fallback state', async ({ page }) => {
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest']);

    const pending = await page.evaluate(() => {
      const scene = window.cc?.director?.getScene?.();
      const canvas = scene?.getChildByName?.('Canvas');
      const persistentRoot = canvas?.getChildByName?.('PersistentRoot');
      const sceneLoader = persistentRoot?.components?.find((component) => component?.constructor?.name === 'SceneLoader');
      const director = window.cc?.director;
      if (!sceneLoader || !director?.loadScene) {
        throw new Error('SceneLoader or director.loadScene is missing from the runtime graph.');
      }

      sceneLoader.switchTimeoutSeconds = 0.01;
      const originalLoadScene = director.loadScene;
      director.loadScene = () => true;
      const accepted = sceneLoader.switchScene('FieldWest');
      director.loadScene = originalLoadScene;

      return {
        accepted,
        state: sceneLoader.getSwitchState(),
      };
    });

    expect(pending.accepted).toBe(true);
    expect(pending.state).toMatchObject({
      status: 'switching',
      targetScene: 'FieldWest',
      errorMessage: '',
    });

    await stepFrames(page, 10);
    const timedOutState = await readSceneSwitchState(page);
    expect(timedOutState).toMatchObject({
      status: 'failed',
      targetScene: 'FieldWest',
      completedAt: 0,
    });
    expect(timedOutState.errorMessage).toContain('timed out');
    expect(timedOutState.errorMessage).toContain('Retry is available');
    expect(timedOutState.failedAt).toBeGreaterThanOrEqual(timedOutState.requestedAt);

    const visibleFallback = await readObjectiveLabelText(page);
    expect(visibleFallback, 'Timed-out scene switch should surface visible retry copy').toContain('加载');
    expect(visibleFallback).toContain('FieldWest');
    expect(visibleFallback).toContain('失败');
    expect(visibleFallback).toContain('可重试');
    expect(visibleFallback).toContain('timed out');

    const retry = await page.evaluate(() => {
      const scene = window.cc?.director?.getScene?.();
      const canvas = scene?.getChildByName?.('Canvas');
      const persistentRoot = canvas?.getChildByName?.('PersistentRoot');
      const sceneLoader = persistentRoot?.components?.find((component) => component?.constructor?.name === 'SceneLoader');
      const director = window.cc?.director;
      const originalLoadScene = director.loadScene;
      let retryTarget = null;
      director.loadScene = (sceneName) => {
        retryTarget = sceneName;
        return true;
      };
      const accepted = sceneLoader.retryLastFailedSwitch();
      const state = sceneLoader.getSwitchState();
      director.loadScene = originalLoadScene;
      return {
        accepted,
        retryTarget,
        state,
      };
    });

    expect(retry.accepted).toBe(true);
    expect(retry.retryTarget).toBe('FieldWest');
    expect(retry.state).toMatchObject({
      status: 'switching',
      targetScene: 'FieldWest',
      errorMessage: '',
    });
  });
});
