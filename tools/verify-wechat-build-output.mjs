import assert from 'node:assert/strict';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import {
  defaultWechatAppId,
  projectRoot,
  resolveWechatBuildConfigPath,
  resolveConfiguredWechatBuildOutputDir,
  wechatPackageBudgetBytes,
  wechatRecommendedDownloadConcurrency,
} from './wechat-build-utils.mjs';

async function assertExists(filePath) {
  await access(filePath, fsConstants.F_OK);
}

async function assertPatternExists(directoryPath, matcher, label) {
  const entries = await readdir(directoryPath);
  const matchedEntry = entries.find((entry) => matcher.test(entry));
  assert.ok(matchedEntry, `Expected ${label} to exist in ${directoryPath}.`);
  return path.join(directoryPath, matchedEntry);
}

async function readJson(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function measureDirectoryBytes(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  let totalBytes = 0;

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      totalBytes += await measureDirectoryBytes(entryPath);
      continue;
    }

    const stats = await stat(entryPath);
    totalBytes += stats.size;
  }

  return totalBytes;
}

async function resolveExpectedWechatAppId() {
  if (process.env.WECHATGAME_APPID) {
    return process.env.WECHATGAME_APPID;
  }

  const buildConfigPath = resolveWechatBuildConfigPath(projectRoot);

  try {
    const buildConfig = await readJson(buildConfigPath);
    return buildConfig.packages?.wechatgame?.appid ?? defaultWechatAppId;
  } catch {
    return defaultWechatAppId;
  }
}

async function resolveExpectedDebugMode() {
  const buildConfigPath = resolveWechatBuildConfigPath(projectRoot);

  try {
    const buildConfig = await readJson(buildConfigPath);
    return buildConfig.debug === true;
  } catch {
    return process.env.WECHATGAME_DEBUG === '1';
  }
}

const outputDir = await resolveConfiguredWechatBuildOutputDir(projectRoot);
const requiredFiles = [
  'game.json',
  'project.config.json',
  'game.js',
];

for (const relativePath of requiredFiles) {
  await assertExists(path.join(outputDir, relativePath));
}

await assertPatternExists(
  outputDir,
  /^application(\.[0-9a-f]+)?\.js$/i,
  'hashed application bootstrap',
);

const gameConfig = await readJson(path.join(outputDir, 'game.json'));
const projectConfig = await readJson(path.join(outputDir, 'project.config.json'));
const settingsPath = await assertPatternExists(
  path.join(outputDir, 'src'),
  /^settings(\.[0-9a-f]+)?\.json$/i,
  'hashed settings file',
);
const runtimeSettings = await readJson(settingsPath);
const expectedAppId = await resolveExpectedWechatAppId();
const expectedDebugMode = await resolveExpectedDebugMode();
const totalBytes = await measureDirectoryBytes(outputDir);

assert.equal(
  gameConfig.deviceOrientation,
  'landscape',
  'Expected WeChat build to use landscape orientation.',
);

assert.equal(
  projectConfig.appid,
  expectedAppId,
  'Expected project.config.json appid to match the configured WeChat appid.',
);

assert.notEqual(
  runtimeSettings.physics?.physicsEngine,
  'physics-ammo',
  'Expected WeChat build to avoid bundling the 3D ammo physics runtime for this 2D project.',
);

assert.equal(
  runtimeSettings.engine?.debug,
  expectedDebugMode,
  'Expected runtime debug mode to match the configured WeChat build profile.',
);

assert.equal(
  runtimeSettings.screen?.exactFitScreen,
  false,
  'Expected WeChat build to disable exact-fit scaling for safer mobile HUD placement.',
);

assert.ok(
  (runtimeSettings.assets?.downloadMaxConcurrency ?? Number.POSITIVE_INFINITY)
  <= wechatRecommendedDownloadConcurrency,
  `Expected WeChat build download concurrency to stay at or below ${wechatRecommendedDownloadConcurrency}.`,
);

assert.ok(
  totalBytes <= wechatPackageBudgetBytes,
  `Expected WeChat build output to stay within ${wechatPackageBudgetBytes} bytes for the first mobile slice.`,
);

console.log(`[wechat-build] output verified at ${outputDir}`);
console.log(`[wechat-build] total bytes: ${totalBytes}`);
