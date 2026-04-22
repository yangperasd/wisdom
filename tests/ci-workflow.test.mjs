import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const workflowPath = path.join(projectRoot, '.github', 'workflows', 'automation-tests.yml');
const runCiScriptPath = path.join(projectRoot, 'tools', 'run-ci-tests.mjs');
const runnerHelpersPath = path.join(projectRoot, 'tools', 'test-runner-helpers.mjs');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const runCiScript = fs.readFileSync(runCiScriptPath, 'utf8');
const runnerHelpers = fs.readFileSync(runnerHelpersPath, 'utf8');

function getJobBlock(jobName) {
  const marker = `\n  ${jobName}:\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `Expected ${jobName} job to exist.`);

  const afterStart = start + marker.length;
  const nextJob = workflow.slice(afterStart).search(/\n  [A-Za-z0-9_-]+:\n/);
  if (nextJob === -1) {
    return workflow.slice(start);
  }

  return workflow.slice(start, afterStart + nextJob);
}

function assertOrdered(haystack, labels) {
  let previousIndex = -1;
  for (const label of labels) {
    const index = haystack.indexOf(label, previousIndex + 1);
    assert.notEqual(index, -1, `Expected workflow to contain: ${label}`);
    assert.ok(index > previousIndex, `Expected ${label} to appear after the previous CI step.`);
    previousIndex = index;
  }
}

test('hosted CI keeps node and preview checks separate from WeChat verification', () => {
  const nodeJob = getJobBlock('node-tests');

  assert.match(nodeJob, /runs-on:\s+windows-latest/);
  assert.match(nodeJob, /PREVIEW_BASE_URL:\s+\$\{\{\s*vars\.PREVIEW_BASE_URL\s*\}\}/);
  assert.match(nodeJob, /REQUIRE_PREVIEW_SMOKE:\s+\$\{\{\s*vars\.REQUIRE_PREVIEW_SMOKE\s*\}\}/);
  assert.match(nodeJob, /run:\s+npm run test:ci/);
  assert.doesNotMatch(nodeJob, /REQUIRE_WECHAT_VERIFY/);
});

test('local CI runner includes initial visual snapshots when preview is available', () => {
  assert.match(runCiScript, /runPlaywrightFirstSessionJourney/);
  assert.match(runCiScript, /runPlaywrightVisualInitial/);
  assertOrdered(runCiScript, [
    'runPlaywrightSmoke(baseURL, projectRoot)',
    'runPlaywrightFirstSessionJourney(baseURL, projectRoot)',
    'runPlaywrightVisualInitial(baseURL, projectRoot)',
  ]);
  assert.match(runnerHelpers, /first-session-journey\.spec\.mjs/);
  assert.match(runnerHelpers, /scene-loader-failure\.spec\.mjs/);
  assert.match(runnerHelpers, /visual-scene-initial\.spec\.mjs/);
});

test('WeChat CI uses a self-hosted Cocos runner and builds before verification', () => {
  const wechatJob = getJobBlock('wechat-build-verify');

  assert.match(wechatJob, /runs-on:\s+\[self-hosted,\s*Windows,\s*cocos\]/);
  assert.match(wechatJob, /REQUIRE_WECHAT_VERIFY:\s+'1'/);
  assert.match(wechatJob, /COCOS_CREATOR_EXE:\s+\$\{\{\s*vars\.COCOS_CREATOR_EXE\s*\}\}/);
  assert.match(wechatJob, /REQUIRE_WECHAT_SIMULATOR:\s+\$\{\{\s*vars\.REQUIRE_WECHAT_SIMULATOR\s*\}\}/);
  assert.match(wechatJob, /WECHAT_AUTO_PORT:\s+\$\{\{\s*vars\.WECHAT_AUTO_PORT\s*\}\}/);

  assertOrdered(wechatJob, [
    'run: npm ci',
    'run: npm run build:wechat:config',
    'run: npm run build:wechat',
    'run: npm run verify:wechat',
    'run: node --test tests/wechat-simulator.test.mjs',
  ]);
});

test('WeChat simulator runtime gate is opt-in and hard when enabled', () => {
  const wechatJob = getJobBlock('wechat-build-verify');

  assert.match(wechatJob, /name:\s+Verify WeChat simulator runtime/);
  assert.match(wechatJob, /if:\s+\$\{\{\s*env\.REQUIRE_WECHAT_SIMULATOR\s*==\s*'1'\s*\}\}/);
  assert.match(wechatJob, /run:\s+node --test tests\/wechat-simulator\.test\.mjs/);
});

test('WeChat CI uploads package evidence for release audit', () => {
  const wechatJob = getJobBlock('wechat-build-verify');

  assert.match(wechatJob, /uses:\s+actions\/upload-artifact@v4/);
  assertOrdered(wechatJob, [
    'temp/wechat-build-status.json',
    'temp/wechat-size-report.json',
    'temp/wechat-simulator-evidence.json',
    'temp/wechatgame.build-config.json',
    'temp/logs/**',
    'build/wechatgame/game.json',
    'build/wechatgame/project.config.json',
    'build/wechatgame/src/settings*.json',
  ]);
  assert.match(wechatJob, /temp\/wechat-size-report\.json/);
  assert.match(wechatJob, /temp\/wechat-build-status\.json/);
  assert.match(wechatJob, /temp\/wechat-simulator-evidence\.json/);
  assert.match(wechatJob, /temp\/wechatgame\.build-config\.json/);
  assert.match(wechatJob, /temp\/logs\/\*\*/);
  assert.match(wechatJob, /build\/wechatgame\/game\.json/);
  assert.match(wechatJob, /build\/wechatgame\/src\/settings\*\.json/);
});
