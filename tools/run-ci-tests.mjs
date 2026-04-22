import path from 'node:path';
import { existsSync } from 'node:fs';
import {
  projectRoot,
  isPreviewServerHealthy,
  resolvePreviewBaseUrl,
  runNodeScript,
  runPlaywrightFirstSessionJourney,
  runPlaywrightSmoke,
  runPlaywrightVisualInitial,
  shouldRequirePreviewSmoke,
  shouldRequireWechatVerify,
} from './test-runner-helpers.mjs';
import {
  resolveLastWechatBuildOutputDir,
} from './wechat-build-utils.mjs';

const nodeTestScript = path.join(projectRoot, 'tools', 'run-automation-tests.mjs');
const verifyWechatScript = path.join(projectRoot, 'tools', 'verify-wechat-build-output.mjs');

console.log('[ci-tests] running node-level tests');
await runNodeScript(nodeTestScript, projectRoot);

const wechatOutputDir = await resolveLastWechatBuildOutputDir(projectRoot);
if (existsSync(wechatOutputDir) || shouldRequireWechatVerify()) {
  console.log(`[ci-tests] running WeChat build verification for ${wechatOutputDir}`);
  await runNodeScript(verifyWechatScript, projectRoot);
} else {
  console.log('[ci-tests] WeChat build verification skipped: build output not found');
}

const baseURL = await resolvePreviewBaseUrl(projectRoot);
if (!baseURL) {
  if (shouldRequirePreviewSmoke()) {
    throw new Error('REQUIRE_PREVIEW_SMOKE=1，但没有可用的 PREVIEW_BASE_URL。');
  }

  console.log('[ci-tests] preview smoke skipped: no preview URL configured');
  process.exit(0);
}

const isHealthy = await isPreviewServerHealthy(baseURL);
if (!isHealthy) {
  if (shouldRequirePreviewSmoke()) {
    throw new Error(`REQUIRE_PREVIEW_SMOKE=1，但预览服务不可达：${baseURL}`);
  }

  console.log(`[ci-tests] preview smoke skipped: preview server is not reachable at ${baseURL}`);
  process.exit(0);
}

console.log(`[ci-tests] running preview smoke against ${baseURL}`);
await runPlaywrightSmoke(baseURL, projectRoot);

console.log(`[ci-tests] running first-session journey against ${baseURL}`);
await runPlaywrightFirstSessionJourney(baseURL, projectRoot);

console.log(`[ci-tests] running initial visual snapshots against ${baseURL}`);
await runPlaywrightVisualInitial(baseURL, projectRoot);
