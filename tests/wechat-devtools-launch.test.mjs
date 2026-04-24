import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertWechatGameProjectConfig } from '../tools/wechat-build-utils.mjs';

const projectRoot = process.cwd();
const buildDir = path.join(projectRoot, 'build', 'wechatgame');
const harnessRoot = path.join(os.tmpdir(), 'wisdom-wechat-harnesses');
const buildExists = fs.existsSync(buildDir);

function collectProjectConfigPaths(rootDir) {
  const files = [];
  if (!fs.existsSync(rootDir)) {
    return files;
  }

  const walk = (currentDir) => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name === 'project.config.json') {
        files.push(entryPath);
      }
    }
  };

  walk(rootDir);
  return files.filter((filePath) => filePath.split(path.sep).some((part) => /^wechatgame(?:-|$)/i.test(part)));
}

describe('wechat devtools launch readiness', { skip: !buildExists ? 'build/wechatgame not found' : false }, () => {
  test('project.config.json is valid JSON', () => {
    const configPath = path.join(buildDir, 'project.config.json');
    assert.ok(fs.existsSync(configPath), 'project.config.json should exist');
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    assert.ok(parsed, 'project.config.json should parse as valid JSON');
    assertWechatGameProjectConfig(parsed, configPath);
  });

  test('project.config.json appid matches environment or default', () => {
    const configPath = path.join(buildDir, 'project.config.json');
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const expectedAppId = process.env.WECHATGAME_APPID || 'wx2a215f964be2b668';
    assert.equal(parsed.appid, expectedAppId);
  });

  test('project.config.json keeps launch-critical minifyWXML enabled', () => {
    const configPath = path.join(buildDir, 'project.config.json');
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.equal(parsed.setting?.minifyWXML, true);
  });

  test('game.json contains required fields for WeChat runtime', () => {
    const gamePath = path.join(buildDir, 'game.json');
    assert.ok(fs.existsSync(gamePath), 'game.json should exist');
    const parsed = JSON.parse(fs.readFileSync(gamePath, 'utf-8'));
    assert.equal(parsed.deviceOrientation, 'landscape', 'deviceOrientation should be landscape');
  });

  test('package scripts expose non-GUI WeChat workflows', () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    assert.match(packageJson.scripts['open:wechat'], /open-wechat-devtools\.mjs/);
    assert.match(packageJson.scripts['reload:wechat'], /open-wechat-devtools\.mjs/);
    assert.match(packageJson.scripts['rebuild:wechat'], /rebuild-wechat-devtools\.mjs/);
  });

  test('all generated WeChat project configs are launchable', () => {
    const configPaths = [
      ...collectProjectConfigPaths(path.join(projectRoot, 'build')),
      ...collectProjectConfigPaths(harnessRoot),
    ];
    assert.ok(configPaths.length > 0, 'expected at least one generated WeChat project config');
    for (const configPath of configPaths) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      assertWechatGameProjectConfig(parsed, configPath);
    }
  });
});
