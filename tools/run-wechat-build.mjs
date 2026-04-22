import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  classifyCreatorExitCode,
  flattenProjectTsconfigForBuild,
  optimizeWechatRuntimeSettings,
  projectRoot,
  restoreProjectTsconfig,
  resolveCreatorExecutable,
  resolveWechatBuildConfigPath,
  resolveWechatBuildLogPath,
  resolveWechatBuildOutputDir,
  resolveWechatBuildStatusPath,
  resolveNamedWechatBuildOutputDir,
  wechatBuildOutputName,
  writeWechatBuildConfig,
} from './wechat-build-utils.mjs';

function runCreatorBuild(creatorExe, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(creatorExe, args, {
      cwd: projectRoot,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      resolve(code);
    });
  });
}

async function readJson(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function now() {
  return new Date().toISOString();
}

async function optimizeBuildOutput(outputDir, debug) {
  const srcDir = path.join(outputDir, 'src');
  const entries = await readdir(srcDir);
  const settingsFile = entries.find((entry) => /^settings(\.[0-9a-f]+)?\.json$/i.test(entry));

  if (!settingsFile) {
    throw new Error(`Cannot find hashed settings json in ${srcDir}.`);
  }

  const settingsPath = path.join(srcDir, settingsFile);
  const runtimeSettings = await readJson(settingsPath);
  const optimizedSettings = optimizeWechatRuntimeSettings(runtimeSettings, { debug });
  await writeJson(settingsPath, optimizedSettings);

  console.log(`[wechat-build] optimized runtime settings at ${settingsPath}`);
  console.log(`[wechat-build] optimized debug: ${optimizedSettings.engine.debug}`);
  console.log(
    `[wechat-build] optimized downloadMaxConcurrency: ${optimizedSettings.assets.downloadMaxConcurrency}`,
  );
}

const configPath = resolveWechatBuildConfigPath(projectRoot);
const logPath = resolveWechatBuildLogPath(projectRoot);
const statusPath = resolveWechatBuildStatusPath(projectRoot);
const defaultOutputName = process.env.WECHATGAME_OUTPUT_NAME || wechatBuildOutputName;
let outputName = defaultOutputName;
let outputDir = resolveNamedWechatBuildOutputDir(outputName, projectRoot);

await mkdir(path.dirname(logPath), { recursive: true });
await mkdir(path.dirname(statusPath), { recursive: true });

try {
  await rm(outputDir, { recursive: true, force: true });
} catch (error) {
  if (error?.code !== 'EBUSY') {
    throw error;
  }

  outputName = `${defaultOutputName}-staging`;
  outputDir = resolveNamedWechatBuildOutputDir(outputName, projectRoot);
  await rm(outputDir, { recursive: true, force: true });
  console.warn(
    `[wechat-build] ${resolveWechatBuildOutputDir(projectRoot)} is locked by another process, falling back to ${outputDir}.`,
  );
}

const buildStatus = {
  status: 'running',
  creatorExe: process.env.COCOS_CREATOR_EXE || null,
  configPath,
  logPath,
  outputDir,
  outputName,
  exitCode: null,
  creatorExitState: null,
  toleratedReason: null,
  failureReason: null,
  runtimeSettingsOptimized: false,
  timestamps: {
    startedAt: now(),
    creatorFinishedAt: null,
    runtimeSettingsOptimizedAt: null,
    finishedAt: null,
  },
};

async function persistBuildStatus(patch = {}) {
  if (patch.timestamps) {
    buildStatus.timestamps = {
      ...buildStatus.timestamps,
      ...patch.timestamps,
    };
  }

  const nextStatus = { ...patch };
  delete nextStatus.timestamps;
  Object.assign(buildStatus, nextStatus);
  await writeJson(statusPath, buildStatus);
}

await persistBuildStatus();
console.log(`[wechat-build] status: ${statusPath}`);

let tsconfigSnapshot = null;

try {
  const creatorExe = await resolveCreatorExecutable();
  await persistBuildStatus({ creatorExe });

  const { config } = await writeWechatBuildConfig({
    rootDir: projectRoot,
    configPath,
    outputName,
  });

  console.log(`[wechat-build] creator: ${creatorExe}`);
  console.log(`[wechat-build] config: ${configPath}`);
  console.log(`[wechat-build] log: ${logPath}`);
  console.log(`[wechat-build] output: ${outputDir}`);
  console.log(`[wechat-build] appid: ${config.packages.wechatgame.appid}`);

  const buildArg = [
    'stage=build',
    `configPath=${configPath}`,
    `logDest=${logPath}`,
  ].join(';');

  tsconfigSnapshot = await flattenProjectTsconfigForBuild(projectRoot);

  const exitCode = await runCreatorBuild(
    creatorExe,
    ['--project', projectRoot, '--build', buildArg],
  );
  const creatorPolicy = classifyCreatorExitCode(exitCode);

  await persistBuildStatus({
    exitCode,
    creatorExitState: creatorPolicy.status,
    toleratedReason: creatorPolicy.toleratedReason,
    timestamps: { creatorFinishedAt: now() },
  });

  if (creatorPolicy.status === 'failed') {
    const error = new Error(`Cocos Creator build failed with exit code ${exitCode ?? 'unknown'}.`);
    await persistBuildStatus({
      status: 'failed',
      failureReason: error.message,
      timestamps: { finishedAt: now() },
    });
    throw error;
  }

  if (creatorPolicy.status === 'tolerated') {
    console.warn(
      '[wechat-build] Cocos Creator exited with code 36 (tolerated non-zero). ' +
      'Treat this as a warning only; verify:wechat must still pass before the build is green.',
    );
  } else {
    console.log('[wechat-build] Creator finished cleanly with exit code 0');
  }

  await optimizeBuildOutput(outputDir, config.debug);

  await persistBuildStatus({
    status: creatorPolicy.status,
    runtimeSettingsOptimized: true,
    timestamps: {
      runtimeSettingsOptimizedAt: now(),
      finishedAt: now(),
    },
  });
} catch (error) {
  if (buildStatus.status !== 'failed') {
    await persistBuildStatus({
      status: 'failed',
      failureReason: error instanceof Error ? error.message : String(error),
      timestamps: {
        finishedAt: now(),
      },
    });
  } else if (!buildStatus.timestamps.finishedAt) {
    await persistBuildStatus({
      timestamps: {
        finishedAt: now(),
      },
    });
  }

  throw error;
} finally {
  if (tsconfigSnapshot) {
    await restoreProjectTsconfig(tsconfigSnapshot.originalContent, projectRoot);
  }
}
