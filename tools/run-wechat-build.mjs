import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  flattenProjectTsconfigForBuild,
  optimizeWechatRuntimeSettings,
  projectRoot,
  restoreProjectTsconfig,
  resolveCreatorExecutable,
  resolveWechatBuildConfigPath,
  resolveWechatBuildLogPath,
  resolveWechatBuildOutputDir,
  resolveNamedWechatBuildOutputDir,
  wechatBuildOutputName,
  writeWechatBuildConfig,
} from './wechat-build-utils.mjs';

function runCreatorBuild(creatorExe, args, allowedExitCodes) {
  return new Promise((resolve, reject) => {
    const child = spawn(creatorExe, args, {
      cwd: projectRoot,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (allowedExitCodes.has(code)) {
        resolve(code);
        return;
      }

      reject(new Error(`Cocos Creator build failed with exit code ${code ?? 'unknown'}.`));
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

const creatorExe = await resolveCreatorExecutable();
const configPath = resolveWechatBuildConfigPath(projectRoot);
const logPath = resolveWechatBuildLogPath(projectRoot);
const defaultOutputName = process.env.WECHATGAME_OUTPUT_NAME || wechatBuildOutputName;
let outputName = defaultOutputName;
let outputDir = resolveNamedWechatBuildOutputDir(outputName, projectRoot);

await mkdir(path.dirname(logPath), { recursive: true });

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

const { config } = await writeWechatBuildConfig({
  rootDir: projectRoot,
  configPath,
  outputName,
});

const buildArg = [
  'stage=build',
  `configPath=${configPath}`,
  `logDest=${logPath}`,
].join(';');

console.log(`[wechat-build] creator: ${creatorExe}`);
console.log(`[wechat-build] config: ${configPath}`);
console.log(`[wechat-build] log: ${logPath}`);
console.log(`[wechat-build] output: ${outputDir}`);
console.log(`[wechat-build] appid: ${config.packages.wechatgame.appid}`);

const tsconfigSnapshot = await flattenProjectTsconfigForBuild(projectRoot);

try {
  const exitCode = await runCreatorBuild(
    creatorExe,
    ['--project', projectRoot, '--build', buildArg],
    new Set([0, 36]),
  );

  console.log(`[wechat-build] Creator finished with exit code ${exitCode}`);
  await optimizeBuildOutput(outputDir, config.debug);
} finally {
  await restoreProjectTsconfig(tsconfigSnapshot.originalContent, projectRoot);
}
