import {
  projectRoot,
  resolvePreviewBaseUrl,
  isPreviewServerHealthy,
  runPlaywrightSmoke,
} from './test-runner-helpers.mjs';

const baseURL = await resolvePreviewBaseUrl(projectRoot);
if (!baseURL) {
  throw new Error(
    '未找到 Cocos 预览地址。请先在 Creator 里启动预览，或设置 PREVIEW_BASE_URL 环境变量。',
  );
}

const isHealthy = await isPreviewServerHealthy(baseURL);
if (!isHealthy) {
  throw new Error(
    `预览服务不可用：${baseURL}。请确认 Creator 预览窗口已启动，或把 PREVIEW_BASE_URL 指向可访问的预览地址。`,
  );
}

console.log(`[preview-smoke] using ${baseURL}`);
await runPlaywrightSmoke(baseURL, projectRoot);
