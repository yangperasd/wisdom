import assert from 'node:assert/strict';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import {
  assertWechatBuildFreshness,
  collectWechatPackageBreakdown,
  defaultWechatAppId,
  projectRoot,
  resolveWechatBuildConfigPath,
  resolveLastWechatBuildOutputDir,
  wechatPackageBudgetBytes,
  wechatPackageWarningBytes,
  wechatRecommendedDownloadConcurrency,
} from './wechat-build-utils.mjs';

async function readJson(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function assertExists(filePath) {
  await access(filePath, fsConstants.F_OK);
}

async function assertPatternExists(directoryPath, matcher, label) {
  const entries = await readdir(directoryPath);
  const matchedEntry = entries.find((entry) => matcher.test(entry));
  assert.ok(matchedEntry, `Expected ${label} to exist in ${directoryPath}.`);
  return path.join(directoryPath, matchedEntry);
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

const outputDir = await resolveLastWechatBuildOutputDir(projectRoot);
const buildFreshness = await assertWechatBuildFreshness(projectRoot);
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
const buildConfigPath = resolveWechatBuildConfigPath(projectRoot);
let buildConfig = null;
try {
  buildConfig = await readJson(buildConfigPath);
} catch {
  // Build-config generation is not required to inspect a raw exported package.
}
let expectsCocosSubpackages = false;
const packageBreakdown = await collectWechatPackageBreakdown(outputDir, gameConfig, runtimeSettings);
const {
  mainPackageBytes,
  totalBytes,
  topLevelBytes,
  mainPackageExclusions,
  packageBreakdown: packageSummary,
} = packageBreakdown;

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

if (buildConfig) {
  assert.equal(
    buildConfig.startSceneAssetBundle,
    true,
    'Expected WeChat build config to keep the start scene in a local start-scene bundle.',
  );

  assert.equal(
    buildConfig.mainBundleIsRemote,
    false,
    'Expected scripts and main startup payload to remain local; remote is for resource payloads only.',
  );

  assert.equal(
    buildConfig.bundleCommonChunk,
    true,
    'Expected common chunking to be explicit so shared startup code is audited.',
  );

  assert.equal(
    buildConfig.mainBundleCompressionType,
    'subpackage',
    'Expected the main bundle to be built as a subpackage so later scenes can move out of the main package.',
  );

  assert.equal(
    buildConfig.skipCompressTexture,
    false,
    'Expected texture compression to stay enabled for release-size pressure.',
  );

  if (buildConfig.mainBundleCompressionType === 'subpackage') {
    expectsCocosSubpackages = true;
  }
}

assert.deepEqual(
  packageSummary.remote.scripts,
  [],
  `Remote payload must not contain script or wasm files: ${packageSummary.remote.scripts.join(', ')}`,
);

const reportPath = path.join(projectRoot, 'temp', 'wechat-size-report.json');
await mkdir(path.dirname(reportPath), { recursive: true });
const sizeReport = {
  outputDir,
  budgetBytes: wechatPackageBudgetBytes,
  warningBytes: wechatPackageWarningBytes,
  mainPackageBytes,
  totalBytes,
  audit: {
    mainPackageWithinBudget: mainPackageBytes <= wechatPackageBudgetBytes,
    mainPackageBelowWarning: mainPackageBytes <= wechatPackageWarningBytes,
    mainPackageBudgetUsagePercent: Number(((mainPackageBytes / wechatPackageBudgetBytes) * 100).toFixed(2)),
    mainPackageWarningUsagePercent: Number(((mainPackageBytes / wechatPackageWarningBytes) * 100).toFixed(2)),
    mainPackageBudgetMarginBytes: wechatPackageBudgetBytes - mainPackageBytes,
    mainPackageWarningMarginBytes: wechatPackageWarningBytes - mainPackageBytes,
    subpackageCount: packageSummary.subpackages.length,
    remoteBytes: packageSummary.remote.bytes,
    remoteScriptsAllowed: false,
    remoteScriptCount: packageSummary.remote.scripts.length,
  },
  topLevelBytes,
  excludedFromMainPackage: mainPackageExclusions,
  cocosSettings: {
    projectBundles: runtimeSettings.assets?.projectBundles ?? [],
    preloadBundles: runtimeSettings.assets?.preloadBundles ?? [],
    subpackages: runtimeSettings.assets?.subpackages ?? [],
    remoteBundles: runtimeSettings.assets?.remoteBundles ?? [],
  },
  packageBreakdown: packageSummary,
};

assert.equal(
  sizeReport.audit.remoteScriptCount,
  0,
  `Remote payload must not contain script or wasm files: ${packageSummary.remote.scripts.join(', ')}`,
);
assert.equal(
  sizeReport.audit.mainPackageWithinBudget,
  true,
  `Expected WeChat main package to stay within ${wechatPackageBudgetBytes} bytes. Actual: ${mainPackageBytes}`,
);

await writeFile(
  reportPath,
  `${JSON.stringify(sizeReport, null, 2)}\n`,
  'utf8',
);

console.log(`[wechat-build] output verified at ${outputDir}`);
console.log(`[wechat-build] freshness covered ${buildFreshness.inputs.length} source inputs`);
console.log(`[wechat-build] main package bytes: ${mainPackageBytes}`);
console.log(`[wechat-build] total output bytes: ${totalBytes}`);
console.log(`[wechat-build] size report: ${reportPath}`);

if (mainPackageBytes > wechatPackageWarningBytes) {
  console.warn(
    `[wechat-build] main package is above warning threshold (${wechatPackageWarningBytes} bytes); keep shrinking before release.`,
  );
}

assert.ok(
  !expectsCocosSubpackages || (runtimeSettings.assets?.subpackages ?? []).length > 0,
  'Expected Cocos runtime settings to declare subpackages when mainBundleCompressionType is subpackage.',
);

assert.ok(
  mainPackageBytes <= wechatPackageBudgetBytes,
  `Expected WeChat main package to stay within ${wechatPackageBudgetBytes} bytes. Actual: ${mainPackageBytes}`,
);
