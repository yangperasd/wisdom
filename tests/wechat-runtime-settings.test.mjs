import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  optimizeWechatRuntimeSettings,
  wechatPackageBudgetBytes,
  wechatRecommendedDownloadConcurrency,
} from '../tools/wechat-build-utils.mjs';

describe('wechat runtime settings optimization', () => {
  test('budget is 10MB', () => {
    assert.equal(wechatPackageBudgetBytes, 10 * 1024 * 1024);
  });

  test('recommended download concurrency is 8', () => {
    assert.equal(wechatRecommendedDownloadConcurrency, 8);
  });

  test('optimizeWechatRuntimeSettings disables debug mode', () => {
    const settings = { engine: { debug: true }, assets: {}, screen: {}, physics: {}, splashScreen: {} };
    const result = optimizeWechatRuntimeSettings(settings);
    assert.equal(result.engine.debug, false);
  });

  test('optimizeWechatRuntimeSettings caps download concurrency', () => {
    const settings = { engine: {}, assets: { downloadMaxConcurrency: 15 }, screen: {}, physics: {}, splashScreen: {} };
    const result = optimizeWechatRuntimeSettings(settings);
    assert.ok(result.assets.downloadMaxConcurrency <= 8);
  });

  test('optimizeWechatRuntimeSettings enables debug when option set', () => {
    const settings = { engine: { debug: false }, assets: {}, screen: {}, physics: {}, splashScreen: {} };
    const result = optimizeWechatRuntimeSettings(settings, { debug: true });
    assert.equal(result.engine.debug, true);
  });

  test('optimizeWechatRuntimeSettings disables exactFitScreen', () => {
    const settings = { engine: {}, assets: {}, screen: { exactFitScreen: true }, physics: {}, splashScreen: {} };
    const result = optimizeWechatRuntimeSettings(settings);
    assert.equal(result.screen.exactFitScreen, false);
  });

  test('optimizeWechatRuntimeSettings sets builtin physics', () => {
    const settings = { engine: {}, assets: {}, screen: {}, physics: { physicsEngine: 'physics-ammo' }, splashScreen: {} };
    const result = optimizeWechatRuntimeSettings(settings);
    assert.equal(result.physics.physicsEngine, 'physics-builtin');
  });

  test('optimizeWechatRuntimeSettings hides splash watermark', () => {
    const settings = { engine: {}, assets: {}, screen: {}, physics: {}, splashScreen: { watermarkLocation: 'default' } };
    const result = optimizeWechatRuntimeSettings(settings);
    assert.equal(result.splashScreen.watermarkLocation, 'hidden');
  });

  test('optimizeWechatRuntimeSettings does not mutate input', () => {
    const settings = {
      engine: { debug: true },
      assets: { downloadMaxConcurrency: 20 },
      screen: { exactFitScreen: true },
      physics: { physicsEngine: 'physics-ammo' },
      splashScreen: { watermarkLocation: 'default' },
    };
    const snapshot = JSON.stringify(settings);
    optimizeWechatRuntimeSettings(settings);
    assert.equal(JSON.stringify(settings), snapshot, 'original object should not be mutated');
  });

  test('optimizeWechatRuntimeSettings initialises missing keys', () => {
    const result = optimizeWechatRuntimeSettings({});
    assert.ok(result.engine, 'engine key should be initialised');
    assert.ok(result.assets, 'assets key should be initialised');
    assert.ok(result.screen, 'screen key should be initialised');
    assert.ok(result.physics, 'physics key should be initialised');
    assert.ok(result.splashScreen, 'splashScreen key should be initialised');
  });

  test('optimizeWechatRuntimeSettings preserves concurrency within limit', () => {
    const settings = { engine: {}, assets: { downloadMaxConcurrency: 4 }, screen: {}, physics: {}, splashScreen: {} };
    const result = optimizeWechatRuntimeSettings(settings);
    assert.equal(result.assets.downloadMaxConcurrency, 4);
  });
});
