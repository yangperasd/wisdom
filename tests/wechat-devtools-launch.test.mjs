import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const buildDir = path.join(projectRoot, 'build', 'wechatgame');
const buildExists = fs.existsSync(buildDir);

describe('wechat devtools launch readiness', { skip: !buildExists ? 'build/wechatgame not found' : false }, () => {
  test('project.config.json is valid JSON', () => {
    const configPath = path.join(buildDir, 'project.config.json');
    assert.ok(fs.existsSync(configPath), 'project.config.json should exist');
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    assert.ok(parsed, 'project.config.json should parse as valid JSON');
    assert.equal(typeof parsed.appid, 'string', 'appid should be a string');
    assert.ok(parsed.appid.length > 0, 'appid should not be empty');
  });

  test('project.config.json appid matches environment or default', () => {
    const configPath = path.join(buildDir, 'project.config.json');
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const expectedAppId = process.env.WECHATGAME_APPID || 'wx2a215f964be2b668';
    assert.equal(parsed.appid, expectedAppId);
  });

  test('game.json contains required fields for WeChat runtime', () => {
    const gamePath = path.join(buildDir, 'game.json');
    assert.ok(fs.existsSync(gamePath), 'game.json should exist');
    const parsed = JSON.parse(fs.readFileSync(gamePath, 'utf-8'));
    assert.equal(parsed.deviceOrientation, 'landscape', 'deviceOrientation should be landscape');
  });
});
