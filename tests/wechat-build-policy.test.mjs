import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  classifyCreatorExitCode,
  creatorExitCodePolicy,
  resolveLastWechatBuildOutputDir,
  resolveWechatBuildStatusPath,
} from '../tools/wechat-build-utils.mjs';

const projectRoot = process.cwd();
const runWechatBuildScript = fs.readFileSync(path.join(projectRoot, 'tools', 'run-wechat-build.mjs'), 'utf8');

test('creator exit code policy classifies clean, tolerated, and failed states', () => {
  assert.equal(classifyCreatorExitCode(0).status, 'clean');
  assert.equal(classifyCreatorExitCode(36).status, 'tolerated');
  assert.equal(classifyCreatorExitCode(36).toleratedReason, creatorExitCodePolicy[36].reason);
  assert.equal(classifyCreatorExitCode(1).status, 'failed');
  assert.equal(classifyCreatorExitCode(null).status, 'failed');
});

test('wechat build status file uses a stable temp path', () => {
  assert.equal(
    resolveWechatBuildStatusPath(projectRoot),
    path.join(projectRoot, 'temp', 'wechat-build-status.json'),
  );
});

test('last WeChat build output prefers a completed build status over stale directory guesses', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wisdom-wechat-status-'));

  try {
    const defaultOutputDir = path.join(tempRoot, 'build', 'wechatgame');
    const stagingOutputDir = path.join(tempRoot, 'build', 'wechatgame-staging');
    fs.mkdirSync(defaultOutputDir, { recursive: true });
    fs.mkdirSync(stagingOutputDir, { recursive: true });
    fs.mkdirSync(path.join(tempRoot, 'temp'), { recursive: true });
    fs.writeFileSync(
      path.join(tempRoot, 'temp', 'wechatgame.build-config.json'),
      `${JSON.stringify({ outputName: 'wechatgame' }, null, 2)}\n`,
    );
    fs.writeFileSync(
      resolveWechatBuildStatusPath(tempRoot),
      `${JSON.stringify({ status: 'tolerated', outputDir: stagingOutputDir }, null, 2)}\n`,
    );

    assert.equal(await resolveLastWechatBuildOutputDir(tempRoot), stagingOutputDir);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('run-wechat-build relies on policy helpers instead of a silent exit-code set', () => {
  assert.doesNotMatch(runWechatBuildScript, /new Set\(\[0,36\]\)/);
  assert.match(runWechatBuildScript, /classifyCreatorExitCode\(/);
  assert.match(runWechatBuildScript, /resolveWechatBuildStatusPath\(/);
  assert.match(runWechatBuildScript, /persistBuildStatus\(/);
});
