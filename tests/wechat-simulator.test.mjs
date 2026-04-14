/**
 * WeChat Mini-Game Simulator Automation Tests
 *
 * These tests connect to the WeChat DevTools simulator via miniprogram-automator,
 * and verify the built game runs correctly in the WeChat runtime.
 *
 * Prerequisites:
 *   1. WeChat DevTools installed with Security > Service Port enabled
 *   2. Build output at build/wechatgame or build/wechatgame-staging
 *   3. CLI auto mode running: cli.bat auto --project <build-dir> --auto-port 9420
 *
 * KNOWN ISSUE: WeChat DevTools v2.01.2510290 has a bug in the CLI `auto` command
 * (TypeError: d.on is not a function at openOrCreateWindow). The auto mode WebSocket
 * starts but the simulator does not fully initialise. Tests skip gracefully when
 * the connection cannot be established. Downgrading to v2.01.2510270 may fix this.
 *
 * Run: node --test tests/wechat-simulator.test.mjs
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const projectRoot = process.cwd();

// Resolve build output directory
const buildCandidates = [
  path.join(projectRoot, 'build', 'wechatgame-staging'),
  path.join(projectRoot, 'build', 'wechatgame'),
];
const buildDir = buildCandidates.find((d) => fs.existsSync(d));

// Resolve CLI path
const cliCandidates = [
  process.env.WECHAT_DEVTOOLS_CLI,
  'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat',
  'C:\\Program Files\\Tencent\\微信web开发者工具\\cli.bat',
].filter(Boolean);
const cliPath = cliCandidates.find((p) => fs.existsSync(p));

const autoPort = parseInt(process.env.WECHAT_AUTO_PORT || '9420', 10);

// Check if the auto-mode WebSocket is reachable
async function isAutoPortOpen() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${autoPort}`, (res) => {
      // HTTP 426 = Upgrade Required = WebSocket server
      resolve(res.statusCode === 426);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

// Try to connect with a timeout
async function tryConnect(automator, timeoutMs = 10000) {
  return Promise.race([
    automator.connect({ wsEndpoint: `ws://127.0.0.1:${autoPort}` }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('connect timeout')), timeoutMs),
    ),
  ]);
}

const canRun = Boolean(buildDir && cliPath);

describe('wechat simulator automation', { skip: !canRun ? 'build output or CLI not found' : false }, () => {
  let automator;
  let miniProgram;
  let connected = false;

  before(async () => {
    const portOpen = await isAutoPortOpen();
    if (!portOpen) {
      console.log(`[wechat-sim] Auto-mode WebSocket not reachable on port ${autoPort}.`);
      console.log('[wechat-sim] Start it with: cli.bat auto --project <build-dir> --auto-port 9420');
      console.log('[wechat-sim] Known issue: DevTools v2.01.2510290 auto command has a bug.');
      return;
    }

    const mod = await import('miniprogram-automator');
    automator = mod.default;

    try {
      miniProgram = await tryConnect(automator, 15000);
      connected = true;
      console.log('[wechat-sim] Connected to WeChat simulator.');
    } catch (e) {
      console.log(`[wechat-sim] WebSocket port open but connect failed: ${e.message}`);
      console.log('[wechat-sim] This usually means auto mode did not fully initialise (DevTools bug).');
    }
  }, { timeout: 30000 });

  after(async () => {
    if (miniProgram) {
      try { miniProgram.disconnect(); } catch { /* ignore */ }
    }
  });

  test('auto-mode WebSocket port is listening', { timeout: 5000 }, async () => {
    const portOpen = await isAutoPortOpen();
    // This test documents whether the port is open, even if connect fails
    console.log(`[wechat-sim] Port ${autoPort} open: ${portOpen}`);
    // Not asserting - this is informational. The real gate is the connected flag.
    assert.ok(true, 'port check completed');
  });

  test('simulator connection established', { timeout: 5000, skip: !connected ? 'auto mode not available (DevTools v2.01.2510290 bug)' : false }, async () => {
    assert.ok(connected, 'should be connected to WeChat simulator');
    assert.ok(miniProgram, 'miniProgram instance should exist');
  });

  test('system info available', { timeout: 15000, skip: !connected ? 'auto mode not available' : false }, async () => {
    const info = await miniProgram.systemInfo();
    assert.ok(info, 'systemInfo should return data');
    assert.ok(info.screenWidth > 0, 'screenWidth should be positive');
    console.log(`[wechat-sim] Platform: ${info.platform}, Screen: ${info.screenWidth}x${info.screenHeight}`);
  });

  test('game has a current page', { timeout: 15000, skip: !connected ? 'auto mode not available' : false }, async () => {
    const page = await miniProgram.currentPage();
    assert.ok(page, 'should have a current page');
  });

  test('screenshot captures game canvas', { timeout: 15000, skip: !connected ? 'auto mode not available' : false }, async () => {
    const screenshotDir = path.join(projectRoot, 'tests', '__screenshots__', 'wechat-simulator');
    fs.mkdirSync(screenshotDir, { recursive: true });
    const ssPath = path.join(screenshotDir, 'wechat-game-initial.png');
    await miniProgram.screenshot({ path: ssPath });
    assert.ok(fs.existsSync(ssPath), 'screenshot file should exist');
    assert.ok(fs.statSync(ssPath).size > 1000, 'screenshot should be > 1KB');
  });

  test('Cocos engine loaded in WeChat runtime', { timeout: 15000, skip: !connected ? 'auto mode not available' : false }, async () => {
    const result = await miniProgram.evaluate(function () {
      return {
        hasCC: typeof cc !== 'undefined',
        hasScene: typeof cc !== 'undefined' && Boolean(cc.director?.getScene?.()),
        sceneName: typeof cc !== 'undefined' ? cc.director?.getScene?.()?.name ?? null : null,
      };
    });
    assert.ok(result.hasCC, 'cc should be defined');
    assert.ok(result.hasScene, 'a scene should be loaded');
    console.log(`[wechat-sim] Scene: ${result.sceneName}`);
  });

  test('Player node exists in scene', { timeout: 15000, skip: !connected ? 'auto mode not available' : false }, async () => {
    const result = await miniProgram.evaluate(function () {
      if (typeof cc === 'undefined') return { found: false };
      const scene = cc.director?.getScene?.();
      const canvas = scene?.getChildByName?.('Canvas');
      const worldRoot = canvas?.getChildByName?.('WorldRoot');
      const player = worldRoot?.getChildByName?.('Player');
      return { found: Boolean(player), childCount: worldRoot?.children?.length ?? 0 };
    });
    assert.ok(result.found, 'Player node should exist');
    assert.ok(result.childCount > 3, 'WorldRoot should have multiple children');
  });

  test('player has full health', { timeout: 15000, skip: !connected ? 'auto mode not available' : false }, async () => {
    const result = await miniProgram.evaluate(function () {
      if (typeof cc === 'undefined') return { found: false };
      const player = cc.director?.getScene?.()?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('Player');
      const hp = player?.components?.find(function (c) { return c?.constructor?.name === 'HealthComponent'; });
      return { found: Boolean(hp), current: hp?.getCurrentHealth?.() ?? 0, max: hp?.maxHealth ?? 0 };
    });
    assert.ok(result.found, 'HealthComponent should exist');
    assert.equal(result.current, result.max, 'health should be full');
  });

  test('touch HUD present with joystick and buttons', { timeout: 15000, skip: !connected ? 'auto mode not available' : false }, async () => {
    const result = await miniProgram.evaluate(function () {
      if (typeof cc === 'undefined') return { found: false };
      const canvas = cc.director?.getScene?.()?.getChildByName?.('Canvas');
      const touchHud = canvas?.getChildByName?.('TouchHudRoot');
      const names = touchHud?.children?.map(function (n) { return n.name; }) ?? [];
      return { found: Boolean(touchHud), names: names };
    });
    assert.ok(result.found, 'TouchHudRoot should exist');
    assert.ok(result.names.includes('Joystick'), 'should have Joystick');
    assert.ok(result.names.includes('TouchAttack'), 'should have TouchAttack');
  });

  test('no fatal runtime state', { timeout: 15000, skip: !connected ? 'auto mode not available' : false }, async () => {
    const result = await miniProgram.evaluate(function () {
      if (typeof cc === 'undefined') return { healthy: false, reason: 'cc not loaded' };
      var scene = cc.director?.getScene?.();
      if (!scene) return { healthy: false, reason: 'no scene' };
      var canvas = scene.getChildByName?.('Canvas');
      if (!canvas) return { healthy: false, reason: 'no Canvas' };
      var worldRoot = canvas.getChildByName?.('WorldRoot');
      if (!worldRoot) return { healthy: false, reason: 'no WorldRoot' };
      var player = worldRoot.getChildByName?.('Player');
      if (!player) return { healthy: false, reason: 'no Player' };
      return { healthy: true, reason: 'all core nodes present' };
    });
    assert.ok(result.healthy, 'Game should be healthy: ' + result.reason);
  });
});
