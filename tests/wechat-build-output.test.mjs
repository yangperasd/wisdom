import { describe, test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const buildDir = path.join(projectRoot, 'build', 'wechatgame');
const buildExists = fs.existsSync(buildDir);

describe('wechat build output', { skip: !buildExists ? 'build/wechatgame not found' : false }, () => {
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

  test('total package size within 10MB budget', () => {
    function dirSize(dir) {
      let total = 0;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) total += dirSize(fullPath);
        else total += fs.statSync(fullPath).size;
      }
      return total;
    }
    const size = dirSize(buildDir);
    const budgetBytes = 10 * 1024 * 1024;
    assert.ok(size <= budgetBytes, `Package size ${(size / 1024 / 1024).toFixed(2)}MB exceeds 10MB budget`);
  });
});
