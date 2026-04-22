/**
 * WeChat Mini-Game Simulator Automation Tests
 *
 * These tests connect to the WeChat DevTools simulator via miniprogram-automator,
 * and verify the built game runs correctly in the WeChat runtime.
 *
 * Prerequisites:
 *   1. WeChat DevTools installed with Security > Service Port enabled
 *   2. A completed WeChat build recorded in temp/wechat-build-status.json,
 *      or a build output matching temp/wechatgame.build-config.json
 *   3. CLI auto mode running. The exact invocation depends on the DevTools
 *      version and the `WECHAT_AUTO_PORT` env variable below. The auto
 *      sub-command of the bundled cli.bat uses the IDE's port selection; there
 *      is NO `--auto-port` flag in this DevTools version. The websocket port
 *      that miniprogram-automator connects to is chosen by the IDE itself
 *      after auto mode initialises, so `WECHAT_AUTO_PORT` is only a local
 *      hint for this test harness when a known port is available.
 *
 * Previously observed failure (2026-04-15): cli.bat `auto` exited with
 * `code: 10` and a `TypeError: d.on is not a function at openOrCreateWindow`
 * shortly after `fetchAttr for wx2a215f964be2b668`. The matching WeappLog
 * session recorded `start cli server error: [object Object]`, so the actual
 * upstream cause was not recoverable from that log alone. The root cause
 * remains UNDETERMINED.
 *
 * Retracted hypotheses -- do NOT re-introduce without fresh independent
 * evidence from this run's logs:
 *   - "AppID permissions". wx2a215f964be2b668 is Tencent's public 小游戏测试号;
 *     any wechat account can use it without developer binding.
 *   - "DevTools v2.01.2510290 has a version-specific bug". Inferred from the
 *     d.on stack only; never independently reproduced against a different
 *     version.
 *   - "Test-AppID has a special 4 MB source-upload cap that real AppIDs
 *     don't have". Wrong on both counts: (a) the WeappLog session for the
 *     failing cli auto run contains no 80051 / source-size / max-limit
 *     entries; (b) the wechat platform's 4 MB main-package cap applies to
 *     ALL mini-game AppIDs, not test accounts specifically. Switching to a
 *     different AppID would NOT change this limit.
 *
 * Tests skip gracefully when the websocket port cannot be reached unless
 * `REQUIRE_WECHAT_SIMULATOR=1` is set. The first test only records port state
 * and writes it to the evidence file; it is not a runtime smoke gate.
 *
 * Run: node --test tests/wechat-simulator.test.mjs
 */
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { resolveLastWechatBuildOutputDir } from '../tools/wechat-build-utils.mjs';

const projectRoot = process.cwd();

const buildDir = await resolveLastWechatBuildOutputDir(projectRoot);
const buildDirExists = fs.existsSync(buildDir);

// Resolve CLI path
const cliCandidates = [
  process.env.WECHAT_DEVTOOLS_CLI,
  'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat',
  'C:\\Program Files\\Tencent\\微信web开发者工具\\cli.bat',
].filter(Boolean);
const cliPath = cliCandidates.find((p) => fs.existsSync(p));

const autoPort = parseInt(process.env.WECHAT_AUTO_PORT || '9420', 10);
const requireSimulator = ['1', 'true', 'yes'].includes(String(process.env.REQUIRE_WECHAT_SIMULATOR || '').toLowerCase());
const evidencePath = path.join(projectRoot, 'temp', 'wechat-simulator-evidence.json');
const canRun = Boolean(buildDirExists && cliPath);

const evidence = {
  generatedAt: new Date().toISOString(),
  buildDir,
  cliPath: cliPath ?? null,
  cliPathExists: Boolean(cliPath),
  autoPort,
  portOpen: null,
  connected: false,
  requireSimulator,
  status: canRun ? 'pending' : 'blocked',
  blockedReason: canRun ? null : 'build output or CLI not found',
  skippedReason: null,
  runtimeChecks: [],
};

function ensureTempDir() {
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
}

function flushEvidence() {
  ensureTempDir();
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}

function recordCheck(name, status, detail) {
  const existing = evidence.runtimeChecks.find((check) => check.name === name);
  const payload = { name, status, detail: detail ?? null, at: new Date().toISOString() };
  if (existing) {
    Object.assign(existing, payload);
  } else {
    evidence.runtimeChecks.push(payload);
  }
  flushEvidence();
}

function skipOrFailIfDisconnected(t, isConnected, checkName, detail) {
  if (isConnected) {
    return true;
  }

  const reason = detail || 'WeChat simulator auto mode is not connected';
  evidence.status = requireSimulator ? 'blocked' : 'skipped';
  evidence.skippedReason = requireSimulator ? null : reason;
  evidence.blockedReason = requireSimulator ? reason : evidence.blockedReason;
  recordCheck(checkName, requireSimulator ? 'blocked' : 'skipped', reason);

  if (requireSimulator) {
    assert.fail(reason);
  }

  t.skip(reason);
  return false;
}

async function runRuntimeCheck(t, isConnected, checkName, task) {
  if (!skipOrFailIfDisconnected(t, isConnected, checkName, 'WeChat simulator auto mode is not connected')) {
    return;
  }

  try {
    await task();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    evidence.status = 'failed';
    recordCheck(checkName, 'failed', message);
    throw error;
  }
}

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

flushEvidence();

describe('wechat simulator automation', { skip: !canRun && !requireSimulator ? 'build output or CLI not found' : false }, () => {
  let automator;
  let miniProgram;
  let connected = false;

  before(async () => {
    if (!canRun) {
      const reason = 'build output or CLI not found';
      evidence.status = 'blocked';
      evidence.blockedReason = reason;
      recordCheck('environment', 'blocked', reason);
      if (requireSimulator) {
        throw new Error(reason);
      }
      return;
    }

    const portOpen = await isAutoPortOpen();
    evidence.portOpen = portOpen;
    if (!portOpen) {
      evidence.status = requireSimulator ? 'blocked' : 'skipped';
      evidence.blockedReason = requireSimulator ? `auto-mode WebSocket not reachable on port ${autoPort}` : evidence.blockedReason;
      evidence.skippedReason = requireSimulator ? null : `auto-mode WebSocket not reachable on port ${autoPort}`;
      recordCheck('port-open', requireSimulator ? 'blocked' : 'skipped', `auto-mode WebSocket not reachable on port ${autoPort}`);
      console.log(`[wechat-sim] Auto-mode WebSocket not reachable on port ${autoPort}.`);
      console.log('[wechat-sim] If you are running auto mode locally, set WECHAT_AUTO_PORT to the IDE-selected websocket port.');
      if (requireSimulator) {
        throw new Error(`WeChat simulator auto mode is not connected on port ${autoPort}`);
      }
      return;
    }

    const mod = await import('miniprogram-automator');
    automator = mod.default;

    try {
      miniProgram = await tryConnect(automator, 15000);
      connected = true;
      evidence.connected = true;
      evidence.status = 'pending';
      evidence.blockedReason = null;
      evidence.skippedReason = null;
      recordCheck('connection', 'passed', `connected to ws://127.0.0.1:${autoPort}`);
      console.log('[wechat-sim] Connected to WeChat simulator.');
    } catch (e) {
      const reason = `WebSocket port open but connect failed: ${e.message}`;
      evidence.status = requireSimulator ? 'blocked' : 'skipped';
      evidence.blockedReason = requireSimulator ? reason : evidence.blockedReason;
      evidence.skippedReason = requireSimulator ? null : reason;
      recordCheck('connection', requireSimulator ? 'blocked' : 'skipped', reason);
      console.log(`[wechat-sim] ${reason}`);
      console.log('[wechat-sim] Auto mode previously observed a startup failure; root cause remains undetermined.');
      if (requireSimulator) {
        throw new Error(reason);
      }
    }
    flushEvidence();
  }, { timeout: 30000 });

  after(async () => {
    if (miniProgram) {
      try { miniProgram.disconnect(); } catch { /* ignore */ }
    }
    evidence.connected = connected;
    if (!evidence.status || evidence.status === 'pending') {
      evidence.status = connected ? 'passed' : (requireSimulator ? 'blocked' : 'skipped');
    }
    flushEvidence();
  });

  test('auto-mode WebSocket port state is recorded', { timeout: 5000 }, async () => {
    const portOpen = await isAutoPortOpen();
    evidence.portOpen = portOpen;
    const detail = `port ${autoPort} open=${portOpen}`;
    recordCheck('port-state', 'info', detail);
    console.log(`[wechat-sim] Recorded auto-mode port state: ${detail}`);
    assert.equal(typeof portOpen, 'boolean', 'port state should be recorded as a boolean');
  });

  test('simulator connection established', { timeout: 5000 }, async (t) => {
    await runRuntimeCheck(t, connected, 'connection', async () => {
      assert.ok(connected, 'should be connected to WeChat simulator');
      assert.ok(miniProgram, 'miniProgram instance should exist');
    });
  });

  test('system info available', { timeout: 15000 }, async (t) => {
    await runRuntimeCheck(t, connected, 'system-info', async () => {
      const info = await miniProgram.systemInfo();
      assert.ok(info, 'systemInfo should return data');
      assert.ok(info.screenWidth > 0, 'screenWidth should be positive');
      recordCheck('system-info', 'passed', `platform=${info.platform}, screen=${info.screenWidth}x${info.screenHeight}`);
      console.log(`[wechat-sim] Platform: ${info.platform}, Screen: ${info.screenWidth}x${info.screenHeight}`);
    });
  });

  test('game has a current page', { timeout: 15000 }, async (t) => {
    await runRuntimeCheck(t, connected, 'current-page', async () => {
      const page = await miniProgram.currentPage();
      assert.ok(page, 'should have a current page');
      recordCheck('current-page', 'passed', 'current page is available');
    });
  });

  test('screenshot captures game canvas', { timeout: 15000 }, async (t) => {
    await runRuntimeCheck(t, connected, 'screenshot', async () => {
      const screenshotDir = path.join(projectRoot, 'tests', '__screenshots__', 'wechat-simulator');
      fs.mkdirSync(screenshotDir, { recursive: true });
      const ssPath = path.join(screenshotDir, 'wechat-game-initial.png');
      await miniProgram.screenshot({ path: ssPath });
      assert.ok(fs.existsSync(ssPath), 'screenshot file should exist');
      assert.ok(fs.statSync(ssPath).size > 1000, 'screenshot should be > 1KB');
      recordCheck('screenshot', 'passed', `wrote ${ssPath}`);
    });
  });

  test('Cocos engine loaded in WeChat runtime', { timeout: 15000 }, async (t) => {
    await runRuntimeCheck(t, connected, 'cocos-runtime', async () => {
      const result = await miniProgram.evaluate(function () {
        return {
          hasCC: typeof cc !== 'undefined',
          hasScene: typeof cc !== 'undefined' && Boolean(cc.director?.getScene?.()),
          sceneName: typeof cc !== 'undefined' ? cc.director?.getScene?.()?.name ?? null : null,
        };
      });
      assert.ok(result.hasCC, 'cc should be defined');
      assert.ok(result.hasScene, 'a scene should be loaded');
      recordCheck('cocos-runtime', 'passed', `scene=${result.sceneName}`);
      console.log(`[wechat-sim] Scene: ${result.sceneName}`);
    });
  });

  test('Player node exists in scene', { timeout: 15000 }, async (t) => {
    await runRuntimeCheck(t, connected, 'player-node', async () => {
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
      recordCheck('player-node', 'passed', `childCount=${result.childCount}`);
    });
  });

  test('player has full health', { timeout: 15000 }, async (t) => {
    await runRuntimeCheck(t, connected, 'player-health', async () => {
      const result = await miniProgram.evaluate(function () {
        if (typeof cc === 'undefined') return { found: false };
        const player = cc.director?.getScene?.()?.getChildByName?.('Canvas')?.getChildByName?.('WorldRoot')?.getChildByName?.('Player');
        const hp = player?.components?.find(function (c) { return c?.constructor?.name === 'HealthComponent'; });
        return { found: Boolean(hp), current: hp?.getCurrentHealth?.() ?? 0, max: hp?.maxHealth ?? 0 };
      });
      assert.ok(result.found, 'HealthComponent should exist');
      assert.equal(result.current, result.max, 'health should be full');
      recordCheck('player-health', 'passed', `current=${result.current}, max=${result.max}`);
    });
  });

  test('touch HUD present with joystick and buttons', { timeout: 15000 }, async (t) => {
    await runRuntimeCheck(t, connected, 'touch-hud', async () => {
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
      recordCheck('touch-hud', 'passed', `children=${result.names.join(',')}`);
    });
  });

  test('no fatal runtime state', { timeout: 15000 }, async (t) => {
    await runRuntimeCheck(t, connected, 'runtime-health', async () => {
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
      recordCheck('runtime-health', 'passed', result.reason);
    });
  });
});
