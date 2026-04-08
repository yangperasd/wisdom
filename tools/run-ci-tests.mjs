import path from 'node:path';
import {
  projectRoot,
  isPreviewServerHealthy,
  resolvePreviewBaseUrl,
  runNodeScript,
  runPlaywrightSmoke,
  shouldRequirePreviewSmoke,
} from './test-runner-helpers.mjs';

const nodeTestScript = path.join(projectRoot, 'tools', 'run-automation-tests.mjs');

console.log('[ci-tests] running node-level tests');
await runNodeScript(nodeTestScript, projectRoot);

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
