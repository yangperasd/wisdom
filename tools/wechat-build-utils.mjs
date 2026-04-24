import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';

export const projectRoot = process.cwd();
export const defaultWechatAppId = 'wx2a215f964be2b668';
export const wechatBuildOutputName = 'wechatgame';
export const wechatBuildTaskName = 'wechatgame';
export const wechatDevToolsPort = 9420;
export const wechatRecommendedDownloadConcurrency = 8;
export const wechatPackageBudgetBytes = 4 * 1024 * 1024;
export const wechatPackageWarningBytes = Math.floor(3.7 * 1024 * 1024);
export const creatorExitCodePolicy = Object.freeze({
  0: Object.freeze({
    code: 0,
    status: 'clean',
    tolerated: false,
    reason: 'Cocos Creator finished cleanly.',
  }),
  36: Object.freeze({
    code: 36,
    status: 'tolerated',
    tolerated: true,
    reason: 'Cocos Creator returned a known tolerated non-zero exit code; treat it as a build-stage warning until output optimization and verify:wechat pass.',
  }),
});

export const wechatReleaseSceneNames = Object.freeze([
  'StartCamp',
  'FieldWest',
  'FieldRuins',
  'DungeonHub',
  'DungeonRoomA',
  'DungeonRoomB',
  'DungeonRoomC',
  'BossArena',
]);

const sceneOrder = wechatReleaseSceneNames;

const wechatFreshnessFileInputs = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tools/generate-week2-scenes.mjs',
  'tools/run-wechat-build.mjs',
  'tools/verify-wechat-build-output.mjs',
  'tools/wechat-build-utils.mjs',
  'temp/wechatgame.build-config.json',
];

const wechatFreshnessDirectoryInputs = [
  { relativePath: 'assets/scripts', extensions: ['.ts'] },
  { relativePath: 'assets/prefabs', extensions: ['.prefab', '.meta'] },
  { relativePath: 'assets/configs', extensions: ['.json', '.meta'] },
  { relativePath: 'assets/art', extensions: ['.png', '.jpg', '.jpeg', '.webp', '.ttf', '.json', '.meta'] },
  { relativePath: 'assets/audio', extensions: ['.ogg', '.wav', '.mp3', '.meta'] },
];

export const wechatEngineIncludeModules = [
  '2d',
  'affine-transform',
  'animation',
  'audio',
  'base',
  'custom-pipeline',
  'custom-pipeline-builtin-scripts',
  'gfx-webgl',
  'graphics',
  'intersection-2d',
  'physics-2d-box2d',
  'physics-builtin',
  'ui',
];

const knownCreatorPaths = [
  process.env.COCOS_CREATOR_EXE,
  'C:\\Users\\yangp\\Apps\\CocosCreator\\3.8.8\\CocosCreator.exe',
  'C:\\Program Files\\CocosCreator\\CocosCreator.exe',
  'C:\\Program Files\\Cocos\\CocosDashboard\\resources\\.editors\\Creator\\3.8.8\\CocosCreator.exe',
].filter(Boolean);

const knownWechatDevToolsCliPaths = [
  process.env.WECHAT_DEVTOOLS_CLI,
  'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat',
  'C:\\Program Files\\Tencent\\微信web开发者工具\\cli.bat',
].filter(Boolean);

async function readJson(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

export function validateWechatGameProjectConfig(projectConfig, configPath = 'project.config.json') {
  const errors = [];
  if (!projectConfig || typeof projectConfig !== 'object' || Array.isArray(projectConfig)) {
    errors.push('config root must be an object');
  } else {
    if (projectConfig.compileType !== 'game') {
      errors.push('compileType must be "game"');
    }
    if (typeof projectConfig.appid !== 'string' || projectConfig.appid.trim().length === 0) {
      errors.push('appid must be a non-empty string');
    }
    if (typeof projectConfig.projectname !== 'string' || projectConfig.projectname.trim().length === 0) {
      errors.push('projectname must be a non-empty string');
    }
    if (typeof projectConfig.miniprogramRoot !== 'string' || projectConfig.miniprogramRoot.trim().length === 0) {
      errors.push('miniprogramRoot must be a non-empty string');
    }
  }

  return {
    ok: errors.length === 0,
    configPath,
    errors,
  };
}

export function assertWechatGameProjectConfig(projectConfig, configPath = 'project.config.json') {
  const result = validateWechatGameProjectConfig(projectConfig, configPath);
  if (!result.ok) {
    throw new Error(`Invalid WeChat game project config at ${configPath}: ${result.errors.join('; ')}`);
  }
}

export function resolveProjectTsconfigPath(rootDir = projectRoot) {
  return path.join(rootDir, 'tsconfig.json');
}

export function resolveCocosTsconfigPath(rootDir = projectRoot) {
  return path.join(rootDir, 'temp', 'tsconfig.cocos.json');
}

export async function resolveCreatorExecutable() {
  for (const candidate of knownCreatorPaths) {
    try {
      await access(candidate, fsConstants.F_OK);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(
    'Cannot find Cocos Creator executable. Set COCOS_CREATOR_EXE to the full CocosCreator.exe path.',
  );
}

export function classifyCreatorExitCode(exitCode) {
  if (exitCode === null || exitCode === undefined || exitCode === '' || typeof exitCode === 'boolean') {
    return {
      code: exitCode ?? null,
      status: 'failed',
      tolerated: false,
      reason: 'Creator exit code was not numeric.',
      toleratedReason: null,
    };
  }

  const numericExitCode = typeof exitCode === 'number' ? exitCode : Number(exitCode);
  if (!Number.isFinite(numericExitCode)) {
    return {
      code: exitCode,
      status: 'failed',
      tolerated: false,
      reason: 'Creator exit code was not numeric.',
      toleratedReason: null,
    };
  }

  const policy = creatorExitCodePolicy[numericExitCode];
  if (policy) {
    return {
      ...policy,
      toleratedReason: policy.tolerated ? policy.reason : null,
    };
  }

  return {
    code: numericExitCode,
    status: 'failed',
    tolerated: false,
    reason: `Unexpected Creator exit code ${numericExitCode}.`,
    toleratedReason: null,
  };
}

export async function resolveWechatDevToolsCli() {
  for (const candidate of knownWechatDevToolsCliPaths) {
    try {
      await access(candidate, fsConstants.F_OK);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(
    'Cannot find WeChat DevTools CLI. Set WECHAT_DEVTOOLS_CLI to the full cli.bat path.',
  );
}

export async function collectSceneEntries(rootDir = projectRoot) {
  const scenesDir = path.join(rootDir, 'assets', 'scenes');
  const entries = [];

  for (const sceneName of sceneOrder) {
    const metaPath = path.join(scenesDir, `${sceneName}.scene.meta`);
    const meta = await readJson(metaPath);
    entries.push({
      name: sceneName,
      url: `db://assets/scenes/${sceneName}.scene`,
      uuid: meta.uuid,
    });
  }

  return entries;
}

export function createWechatGameProjectConfig(options = {}) {
  const {
    existingConfig = {},
    appId = process.env.WECHATGAME_APPID || defaultWechatAppId,
    projectname = 'wisdom',
    urlCheck = true,
  } = options;
  const safeExistingConfig = existingConfig && typeof existingConfig === 'object' && !Array.isArray(existingConfig)
    ? existingConfig
    : {};
  const defaultCondition = {
    search: { current: -1, list: [] },
    conversation: { current: -1, list: [] },
    game: { currentL: -1, current: -1, list: [] },
    miniprogram: { current: -1, list: [] },
  };
  const defaultSetting = {
    urlCheck,
    postcss: true,
    minified: true,
    minifyWXML: true,
    newFeature: false,
    enhance: true,
    useIsolateContext: true,
  };

  return {
    description: 'Cocos Creator WeChat game project',
    miniprogramRoot: './',
    setting: {
      ...defaultSetting,
      ...(safeExistingConfig.setting && typeof safeExistingConfig.setting === 'object' ? safeExistingConfig.setting : {}),
      urlCheck,
    },
    compileType: 'game',
    libVersion: typeof safeExistingConfig.libVersion === 'string' ? safeExistingConfig.libVersion : 'widelyUsed',
    appid: appId,
    projectname,
    condition: {
      ...defaultCondition,
      ...(safeExistingConfig.condition && typeof safeExistingConfig.condition === 'object' ? safeExistingConfig.condition : {}),
    },
  };
}

function normalisePath(value) {
  return path.resolve(value).toLowerCase();
}

function toPackageRoot(value) {
  const root = `${value}`.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!root) {
    return '';
  }

  const prefixedRoot = root.startsWith('subpackages/') || root.startsWith('subPackages/')
    ? root
    : `subpackages/${root}`;
  return prefixedRoot.replace(/\/+$/, '');
}

function addPackageRoot(target, entry) {
  if (!entry) {
    return;
  }

  const root = typeof entry === 'string'
    ? toPackageRoot(entry)
    : (entry.root ?? entry.name ?? '');
  if (!root) {
    return;
  }

  const name = typeof entry === 'string'
    ? entry
    : (entry.name ?? entry.root ?? root);
  const normalisedRoot = root.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  const key = normalisedRoot.toLowerCase();
  if (target.has(key)) {
    return;
  }

  target.set(key, { name, root: normalisedRoot });
}

export function collectWechatPackageRoots(outputDir, gameConfig = {}, runtimeSettings = {}) {
  const byRoot = new Map();
  const packages = gameConfig.subpackages ?? gameConfig.subPackages ?? [];
  for (const entry of packages) {
    addPackageRoot(byRoot, entry);
  }

  for (const entry of runtimeSettings.assets?.subpackages ?? []) {
    addPackageRoot(byRoot, entry);
  }

  const subpackages = [...byRoot.values()].map((entry) => ({
    ...entry,
    path: path.join(outputDir, entry.root),
  }));

  return {
    outputDir,
    subpackages,
    remoteDir: path.join(outputDir, 'remote'),
    mainPackageExclusions: [
      ...subpackages.map((entry) => normalisePath(entry.path)),
      normalisePath(path.join(outputDir, 'remote')),
    ],
  };
}

export async function measureDirectoryBytes(directoryPath, exclusions = []) {
  const target = normalisePath(directoryPath);
  if (exclusions.some((excluded) => target === excluded || target.startsWith(`${excluded}${path.sep}`))) {
    return 0;
  }

  let entries;
  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch {
    return 0;
  }

  let totalBytes = 0;

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    const normalisedEntryPath = normalisePath(entryPath);
    if (exclusions.some((excluded) => normalisedEntryPath === excluded || normalisedEntryPath.startsWith(`${excluded}${path.sep}`))) {
      continue;
    }

    if (entry.isDirectory()) {
      totalBytes += await measureDirectoryBytes(entryPath, exclusions);
      continue;
    }

    const stats = await stat(entryPath);
    totalBytes += stats.size;
  }

  return totalBytes;
}

export async function measureTopLevelEntries(outputDir) {
  const entries = await readdir(outputDir, { withFileTypes: true });
  const summary = {};

  for (const entry of entries) {
    const entryPath = path.join(outputDir, entry.name);
    summary[entry.name] = entry.isDirectory()
      ? await measureDirectoryBytes(entryPath)
      : (await stat(entryPath)).size;
  }

  return summary;
}

export async function collectRemoteScripts(remoteDir) {
  try {
    await access(remoteDir, fsConstants.F_OK);
  } catch {
    return [];
  }

  const scripts = [];
  const walk = async (currentDir) => {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      if (/\.(?:cjs|mjs|js|wasm)$/i.test(entry.name)) {
        scripts.push(path.relative(remoteDir, entryPath).split(path.sep).join('/'));
      }
    }
  };

  await walk(remoteDir);
  return scripts;
}

export async function collectWechatPackageBreakdown(outputDir, gameConfig = {}, runtimeSettings = {}) {
  const layout = collectWechatPackageRoots(outputDir, gameConfig, runtimeSettings);
  const subpackages = [];

  for (const entry of layout.subpackages) {
    subpackages.push({
      ...entry,
      bytes: await measureDirectoryBytes(entry.path),
    });
  }

  const remoteBytes = await measureDirectoryBytes(layout.remoteDir);
  const remoteScripts = await collectRemoteScripts(layout.remoteDir);
  const mainPackageBytes = await measureDirectoryBytes(outputDir, layout.mainPackageExclusions);
  const totalBytes = await measureDirectoryBytes(outputDir);
  const topLevelBytes = await measureTopLevelEntries(outputDir);

  return {
    outputDir,
    mainPackageBytes,
    totalBytes,
    topLevelBytes,
    mainPackageExclusions: layout.mainPackageExclusions,
    packageBreakdown: {
      main: {
        path: outputDir,
        bytes: mainPackageBytes,
        excludedRoots: layout.mainPackageExclusions,
      },
      subpackages,
      remote: {
        path: layout.remoteDir,
        bytes: remoteBytes,
        scripts: remoteScripts,
      },
    },
  };
}

export async function createWechatBuildConfig(options = {}) {
  const {
    rootDir = projectRoot,
    appId = process.env.WECHATGAME_APPID || defaultWechatAppId,
    debug = process.env.WECHATGAME_DEBUG === '1',
    md5Cache = true,
    orientation = 'landscape',
    outputName = process.env.WECHATGAME_OUTPUT_NAME || wechatBuildOutputName,
  } = options;

  const scenes = await collectSceneEntries(rootDir);
  const startScene = scenes[0];

  return {
    name: 'wisdom',
    taskName: wechatBuildTaskName,
    platform: 'wechatgame',
    buildPath: 'project://build',
    outputName,
    startScene: startScene.uuid,
    scenes: scenes.map(({ url, uuid }) => ({ url, uuid })),
    debug,
    md5Cache,
    sourceMaps: false,
    startSceneAssetBundle: true,
    mainBundleCompressionType: 'subpackage',
    mainBundleIsRemote: false,
    experimentalEraseModules: false,
    bundleCommonChunk: true,
    skipCompressTexture: false,
    remoteServerAddress: process.env.WECHATGAME_REMOTE_SERVER || '',
    overwriteProjectSettings: {
      macroConfig: {
        cleanupImageCache: 'on',
      },
      includeModules: {
        physics: 'physics-builtin',
        'physics-2d': 'physics-2d-box2d',
        'gfx-webgl2': 'off',
      },
    },
    includeModules: wechatEngineIncludeModules,
    packages: {
      wechatgame: {
        appid: appId,
        orientation,
      },
    },
  };
}

export function optimizeWechatRuntimeSettings(runtimeSettings, options = {}) {
  const debug = options.debug === true;
  const nextSettings = structuredClone(runtimeSettings);

  nextSettings.engine ??= {};
  nextSettings.assets ??= {};
  nextSettings.screen ??= {};
  nextSettings.physics ??= {};
  nextSettings.splashScreen ??= {};

  nextSettings.engine.debug = debug;
  nextSettings.assets.downloadMaxConcurrency = Math.min(
    nextSettings.assets.downloadMaxConcurrency ?? wechatRecommendedDownloadConcurrency,
    wechatRecommendedDownloadConcurrency,
  );
  nextSettings.screen.exactFitScreen = false;
  nextSettings.physics.physicsEngine = 'physics-builtin';
  nextSettings.splashScreen.watermarkLocation = 'hidden';

  return nextSettings;
}

export function resolveWechatBuildConfigPath(rootDir = projectRoot) {
  return path.join(rootDir, 'temp', 'wechatgame.build-config.json');
}

export function resolveWechatBuildLogPath(rootDir = projectRoot) {
  return path.join(rootDir, 'temp', 'logs', 'wechat-build.log');
}

export function resolveWechatBuildStatusPath(rootDir = projectRoot) {
  return path.join(rootDir, 'temp', 'wechat-build-status.json');
}

export function resolveWechatBuildOutputDir(rootDir = projectRoot) {
  return path.join(rootDir, 'build', wechatBuildOutputName);
}

export function resolveNamedWechatBuildOutputDir(outputName, rootDir = projectRoot) {
  return path.join(rootDir, 'build', outputName);
}

export async function resolveConfiguredWechatBuildOutputDir(rootDir = projectRoot) {
  const configPath = resolveWechatBuildConfigPath(rootDir);

  try {
    const config = await readJson(configPath);
    const outputName = config.outputName ?? wechatBuildOutputName;
    return resolveNamedWechatBuildOutputDir(outputName, rootDir);
  } catch {
    return resolveWechatBuildOutputDir(rootDir);
  }
}

export async function resolveLastWechatBuildOutputDir(rootDir = projectRoot) {
  const statusPath = resolveWechatBuildStatusPath(rootDir);

  try {
    const status = await readJson(statusPath);
    const outputDir = status?.outputDir;
    const statusName = status?.status;
    const canUseStatusOutput = ['clean', 'tolerated'].includes(statusName)
      && typeof outputDir === 'string'
      && outputDir.trim().length > 0;

    if (canUseStatusOutput) {
      const resolvedOutputDir = path.isAbsolute(outputDir)
        ? outputDir
        : path.resolve(rootDir, outputDir);
      await access(resolvedOutputDir, fsConstants.F_OK);
      return resolvedOutputDir;
    }
  } catch {
    // Fall back to the checked-in/generated build config when no completed build status exists.
  }

  return resolveConfiguredWechatBuildOutputDir(rootDir);
}

export async function resolveExistingWechatBuildOutputDir(preferredOutputDir, options = {}) {
  const rootDir = options.rootDir ?? projectRoot;
  const buildRootDir = path.join(rootDir, 'build');
  const candidateDirs = [];
  const seen = new Set();

  const addCandidateDir = (candidateDir) => {
    if (!candidateDir || typeof candidateDir !== 'string') {
      return;
    }

    const resolvedDir = path.resolve(candidateDir);
    if (seen.has(resolvedDir)) {
      return;
    }

    seen.add(resolvedDir);
    candidateDirs.push(resolvedDir);
  };

  addCandidateDir(preferredOutputDir);
  addCandidateDir(await resolveConfiguredWechatBuildOutputDir(rootDir));
  addCandidateDir(resolveWechatBuildOutputDir(rootDir));

  for (const candidateDir of candidateDirs) {
    if (await isValidWechatBuildOutputDir(candidateDir)) {
      return candidateDir;
    }
  }

  let buildEntries = [];
  try {
    buildEntries = await readdir(buildRootDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const fallbackDirs = [];
  for (const entry of buildEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (!entry.name.startsWith(wechatBuildOutputName)) {
      continue;
    }

    const candidateDir = path.join(buildRootDir, entry.name);
    if (!(await isValidWechatBuildOutputDir(candidateDir))) {
      continue;
    }

    const directoryStat = await stat(candidateDir);
    fallbackDirs.push({
      dir: candidateDir,
      mtimeMs: directoryStat.mtimeMs,
    });
  }

  fallbackDirs.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return fallbackDirs[0]?.dir ?? null;
}

async function pathExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function isValidWechatBuildOutputDir(outputDir) {
  if (!outputDir) {
    return false;
  }

  const requiredPaths = [
    path.join(outputDir, 'src'),
    path.join(outputDir, 'game.json'),
    path.join(outputDir, 'project.config.json'),
  ];

  for (const requiredPath of requiredPaths) {
    if (!(await pathExists(requiredPath))) {
      return false;
    }
  }

  return true;
}

async function collectFilesByExtension(dirPath, extensions) {
  if (!(await pathExists(dirPath))) {
    return [];
  }

  const extensionSet = new Set(extensions.map((extension) => extension.toLowerCase()));
  const files = [];
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = await collectFilesByExtension(entryPath, extensions);
      files.push(...nestedFiles);
      continue;
    }

    if (entry.isFile() && extensionSet.has(path.extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }

  return files;
}

export async function collectWechatBuildFreshnessInputFiles(rootDir = projectRoot) {
  const files = new Set();

  for (const sceneName of wechatReleaseSceneNames) {
    files.add(path.join(rootDir, 'assets', 'scenes', `${sceneName}.scene`));
    files.add(path.join(rootDir, 'assets', 'scenes', `${sceneName}.scene.meta`));
  }

  for (const relativePath of wechatFreshnessFileInputs) {
    const absolutePath = path.join(rootDir, relativePath);
    if (await pathExists(absolutePath)) {
      files.add(absolutePath);
    }
  }

  for (const { relativePath, extensions } of wechatFreshnessDirectoryInputs) {
    const directoryFiles = await collectFilesByExtension(path.join(rootDir, relativePath), extensions);
    for (const filePath of directoryFiles) {
      files.add(filePath);
    }
  }

  return [...files].sort((a, b) => a.localeCompare(b));
}

export async function getWechatBuildFreshness(rootDir = projectRoot) {
  const statusPath = resolveWechatBuildStatusPath(rootDir);
  const status = await readJson(statusPath);
  const finishedAt = Date.parse(status.timestamps?.finishedAt ?? status.timestamps?.runtimeSettingsOptimizedAt ?? '');
  const inputs = await collectWechatBuildFreshnessInputFiles(rootDir);
  const inputStats = [];

  for (const filePath of inputs) {
    const fileStat = await stat(filePath);
    inputStats.push({
      path: filePath,
      mtimeMs: fileStat.mtimeMs,
    });
  }

  const latestInput = inputStats.reduce(
    (latest, input) => (input.mtimeMs > latest.mtimeMs ? input : latest),
    { path: null, mtimeMs: 0 },
  );

  return {
    status,
    finishedAt,
    inputs,
    latestInput,
  };
}

export async function assertWechatBuildFreshness(rootDir = projectRoot, options = {}) {
  const toleranceMs = options.toleranceMs ?? 2000;
  const freshness = await getWechatBuildFreshness(rootDir);
  const statusName = freshness.status?.status;

  if (!['clean', 'tolerated'].includes(statusName)) {
    throw new Error(`WeChat build status must be completed before verification, got: ${statusName}`);
  }

  if (!Number.isFinite(freshness.finishedAt)) {
    throw new Error('WeChat build status should include a parseable finishedAt timestamp.');
  }

  if (freshness.finishedAt + toleranceMs < freshness.latestInput.mtimeMs) {
    const relativeInput = path.relative(rootDir, freshness.latestInput.path);
    throw new Error(
      `WeChat build output is stale. Build finished at ${new Date(freshness.finishedAt).toISOString()}, ` +
      `but ${relativeInput} changed at ${new Date(freshness.latestInput.mtimeMs).toISOString()}. ` +
      'Re-run node tools/run-wechat-build.mjs.',
    );
  }

  return freshness;
}

export async function flattenProjectTsconfigForBuild(rootDir = projectRoot) {
  const projectTsconfigPath = resolveProjectTsconfigPath(rootDir);
  const cocosTsconfigPath = resolveCocosTsconfigPath(rootDir);
  const originalContent = await readFile(projectTsconfigPath, 'utf8');
  const projectConfig = JSON.parse(originalContent);
  const cocosConfig = await readJson(cocosTsconfigPath);

  const flattenedConfig = {
    ...(cocosConfig.$schema ? { $schema: cocosConfig.$schema } : {}),
    compilerOptions: {
      ...(cocosConfig.compilerOptions ?? {}),
      ...(projectConfig.compilerOptions ?? {}),
      baseUrl:
        projectConfig.compilerOptions?.baseUrl
        ?? cocosConfig.compilerOptions?.baseUrl
        ?? '.',
    },
    include: projectConfig.include ?? cocosConfig.include ?? [],
    exclude: projectConfig.exclude ?? cocosConfig.exclude ?? [],
  };

  await writeFile(projectTsconfigPath, `${JSON.stringify(flattenedConfig, null, 2)}\n`, 'utf8');
  return { projectTsconfigPath, originalContent };
}

export async function restoreProjectTsconfig(originalContent, rootDir = projectRoot) {
  const projectTsconfigPath = resolveProjectTsconfigPath(rootDir);
  await writeFile(projectTsconfigPath, originalContent, 'utf8');
}

export async function writeWechatBuildConfig(options = {}) {
  const rootDir = options.rootDir ?? projectRoot;
  const configPath = options.configPath ?? resolveWechatBuildConfigPath(rootDir);
  const config = await createWechatBuildConfig({ ...options, rootDir });

  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  return { configPath, config };
}
