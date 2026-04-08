import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';

export const projectRoot = process.cwd();
export const defaultWechatAppId = 'wx2a215f964be2b668';
export const wechatBuildOutputName = 'wechatgame';
export const wechatBuildTaskName = 'wechatgame';
export const wechatDevToolsPort = 9420;
export const wechatRecommendedDownloadConcurrency = 8;
export const wechatPackageBudgetBytes = 10 * 1024 * 1024;

const sceneOrder = [
  'StartCamp',
  'FieldWest',
  'FieldRuins',
  'DungeonHub',
  'DungeonRoomA',
  'DungeonRoomB',
  'DungeonRoomC',
  'BossArena',
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
    mainBundleCompressionType: 'none',
    mainBundleIsRemote: false,
    experimentalEraseModules: false,
    bundleCommonChunk: true,
    skipCompressTexture: true,
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
