import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  assertWechatBuildFreshness,
  collectWechatPackageBreakdown,
  resolveLastWechatBuildOutputDir,
  wechatPackageBudgetBytes,
  wechatPackageWarningBytes,
} from '../tools/wechat-build-utils.mjs';

const projectRoot = process.cwd();
const buildDir = await resolveLastWechatBuildOutputDir(projectRoot);
const buildExists = fs.existsSync(buildDir);

function collectRemoteScripts(dir) {
  if (!fs.existsSync(dir)) return [];

  const scripts = [];
  const walk = (currentDir) => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (/\.(?:cjs|mjs|js|wasm)$/i.test(entry.name)) {
        scripts.push(path.relative(buildDir, fullPath));
      }
    }
  };

  walk(dir);
  return scripts;
}

function collectTextFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const files = [];
  const walk = (currentDir) => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (/\.(?:json|js|cjs|mjs|txt)$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  };

  walk(dir);
  return files;
}

function findTextMatches(dir, markers) {
  const matches = [];

  for (const filePath of collectTextFiles(dir)) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const marker of markers) {
      if (content.includes(marker)) {
        matches.push(`${path.relative(dir, filePath)} contains ${marker}`);
      }
    }
  }

  return matches;
}

function collectBuiltAssetJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const files = [];
  const assetRoots = new Set(['assets', 'subpackages']);
  const walk = (currentDir) => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      const relativeParts = path.relative(dir, fullPath).split(path.sep);
      if (entry.name.endsWith('.json') && assetRoots.has(relativeParts[0])) {
        files.push(fullPath);
      }
    }
  };

  walk(dir);
  return files;
}

function findTextMatchesInFiles(files, markers, rootDir) {
  const matches = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const marker of markers) {
      if (content.includes(marker)) {
        matches.push(`${path.relative(rootDir, filePath)} contains ${marker}`);
      }
    }
  }

  return matches;
}

function readRuntimeSettings() {
  const srcDir = path.join(buildDir, 'src');
  const settingsFile = fs
    .readdirSync(srcDir)
    .find(f => f.startsWith('settings.') && f.endsWith('.json'));
  assert.ok(settingsFile, 'settings.HASH.json should exist');
  return JSON.parse(fs.readFileSync(path.join(srcDir, settingsFile), 'utf-8'));
}

test('wechat package breakdown distinguishes main, subpackage, and remote', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wisdom-wechat-breakdown-'));

  try {
    fs.writeFileSync(path.join(tempDir, 'main.txt'), 'main');
    fs.mkdirSync(path.join(tempDir, 'subpackages', 'scene-a'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'subpackages', 'scene-a', 'bundle.txt'), 'scene-a');
    fs.mkdirSync(path.join(tempDir, 'remote', 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'remote', 'scripts', 'entry.js'), 'console.log(1);');
    fs.writeFileSync(path.join(tempDir, 'remote', 'scripts', 'worker.wasm'), 'wasm');

    const breakdown = await collectWechatPackageBreakdown(
      tempDir,
      {},
      { assets: { subpackages: ['scene-a'] } },
    );

    assert.equal(breakdown.mainPackageBytes, Buffer.byteLength('main'));
    assert.equal(breakdown.packageBreakdown.subpackages.length, 1);
    assert.equal(breakdown.packageBreakdown.subpackages[0].bytes, Buffer.byteLength('scene-a'));
    assert.equal(breakdown.packageBreakdown.remote.bytes, Buffer.byteLength('console.log(1);') + Buffer.byteLength('wasm'));
    assert.deepEqual(
      breakdown.packageBreakdown.remote.scripts.sort(),
      ['scripts/entry.js', 'scripts/worker.wasm'].sort(),
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('wechat build output', { skip: !buildExists ? 'build/wechatgame not found' : false }, () => {
  test('build output is fresh for current release source inputs', async () => {
    const freshness = await assertWechatBuildFreshness(projectRoot);
    assert.ok(freshness.inputs.length > 20, 'Freshness gate should cover scenes, scripts, prefabs, configs, tools, art, and audio inputs.');
  });

  test('game.json exists', () => {
    assert.ok(fs.existsSync(path.join(buildDir, 'game.json')), 'game.json should exist');
  });

  test('project.config.json exists', () => {
    assert.ok(fs.existsSync(path.join(buildDir, 'project.config.json')), 'project.config.json should exist');
  });

  test('game.js exists', () => {
    assert.ok(fs.existsSync(path.join(buildDir, 'game.js')), 'game.js should exist');
  });

  test('application hash file exists', () => {
    const files = fs.readdirSync(buildDir);
    const appFile = files.find(f => f.startsWith('application.') && f.endsWith('.js'));
    assert.ok(appFile, 'application.HASH.js should exist');
  });

  test('settings hash file exists in src/', () => {
    const srcDir = path.join(buildDir, 'src');
    if (!fs.existsSync(srcDir)) { assert.fail('src/ directory missing'); return; }
    const files = fs.readdirSync(srcDir);
    const settingsFile = files.find(f => f.startsWith('settings.') && f.endsWith('.json'));
    assert.ok(settingsFile, 'settings.HASH.json should exist');
  });

  test('game.json has landscape orientation', () => {
    const gameJson = JSON.parse(fs.readFileSync(path.join(buildDir, 'game.json'), 'utf-8'));
    assert.equal(gameJson.deviceOrientation, 'landscape');
  });

  test('project.config.json has correct appid', () => {
    const configJson = JSON.parse(fs.readFileSync(path.join(buildDir, 'project.config.json'), 'utf-8'));
    assert.ok(configJson.appid, 'appid should exist');
    assert.equal(configJson.appid, process.env.WECHATGAME_APPID || 'wx2a215f964be2b668');
  });

  test('main package size stays within WeChat 4MB hard cap', async () => {
    const gameJson = JSON.parse(fs.readFileSync(path.join(buildDir, 'game.json'), 'utf-8'));
    const runtimeSettings = readRuntimeSettings();
    const packageBreakdown = await collectWechatPackageBreakdown(buildDir, gameJson, runtimeSettings);
    const size = packageBreakdown.mainPackageBytes;
    const sizeMb = (size / 1024 / 1024).toFixed(2);

    assert.ok(
      size <= wechatPackageBudgetBytes,
      `Main package size ${sizeMb}MB exceeds WeChat 4MB hard cap (${wechatPackageBudgetBytes} bytes)`,
    );

    if (size > wechatPackageWarningBytes) {
      console.warn(
        `[wechat-build] main package size ${sizeMb}MB is above the ${(wechatPackageWarningBytes / 1024 / 1024).toFixed(2)}MB warning line`,
      );
    }
  });

  test('built BossArena payload does not retain removed source-scene hints', () => {
    const staleMarkers = [
      'BossHint',
      'BossReturnHint',
      'TRIAL CLEARED',
      'DANGER: BREAK SHIELD',
      'Defeat the trial core and claim the route forward.',
    ];
    const currentMarkers = findTextMatches(buildDir, ['先破盾，再趁窗口输出；胜利后回营地。']);
    const staleMatches = findTextMatches(buildDir, staleMarkers);

    assert.deepEqual(
      staleMatches,
      [],
      `WeChat build output still contains removed BossArena scene payload:\n${staleMatches.join('\n')}`,
    );
    assert.ok(
      currentMarkers.length > 0,
      'WeChat build output should contain the current BossArena objective text.',
    );
  });

  test('built first-pass scene payload does not retain old visible debug labels', () => {
    const staleVisibleMarkers = [
      'Boss Arena',
      'PLAYER',
      'BombBug is the only echo that can break this wall.',
      '当前回响 箱子',
      '检查点 未激活',
      'ATTACK',
      'SUMMON',
      'PENDING',
      'BOUNDARY',
    ];
    const matches = findTextMatchesInFiles(collectBuiltAssetJsonFiles(buildDir), staleVisibleMarkers, buildDir);

    assert.deepEqual(
      matches,
      [],
      `WeChat build JSON payload still contains old visible debug labels:\n${matches.join('\n')}`,
    );
  });

  test('built first-release payload does not include MechanicsLab internals', () => {
    const mechanicsLabMarkers = [
      'MechanicsLab',
      'Loading HUD...',
      'PLACE FLOWER NEAR TRAP',
      'GATE CLOSED',
      'BOMB PATH CLEAR',
      'UNLOCK FLOWER',
      'CRACKED WALL',
      'WALL OPEN',
    ];
    const matches = findTextMatchesInFiles(collectBuiltAssetJsonFiles(buildDir), mechanicsLabMarkers, buildDir);

    assert.deepEqual(
      matches,
      [],
      `WeChat first-release asset payload should not include MechanicsLab internals:\n${matches.join('\n')}`,
    );
  });

  test('remote payload does not contain scripts', () => {
    const remoteScripts = collectRemoteScripts(path.join(buildDir, 'remote'));
    assert.deepEqual(remoteScripts, [], `Remote resources must not contain script/wasm files: ${remoteScripts.join(', ')}`);
  });
});
