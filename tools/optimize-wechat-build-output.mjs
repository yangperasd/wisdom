import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  optimizeWechatRuntimeSettings,
  projectRoot,
  resolveLastWechatBuildOutputDir,
} from './wechat-build-utils.mjs';

async function readJson(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function resolveRuntimeSettingsPath(outputDir) {
  const srcDir = path.join(outputDir, 'src');
  const entries = await readdir(srcDir);
  const settingsFile = entries.find((entry) => /^settings(\.[0-9a-f]+)?\.json$/i.test(entry));

  if (!settingsFile) {
    throw new Error(`Cannot find hashed settings json in ${srcDir}.`);
  }

  return path.join(srcDir, settingsFile);
}

const outputDir = await resolveLastWechatBuildOutputDir(projectRoot);
const settingsPath = await resolveRuntimeSettingsPath(outputDir);
const runtimeSettings = await readJson(settingsPath);
const optimizedSettings = optimizeWechatRuntimeSettings(runtimeSettings, {
  debug: process.env.WECHATGAME_DEBUG === '1',
});

await writeJson(settingsPath, optimizedSettings);

console.log(`[wechat-build] runtime settings optimized at ${settingsPath}`);
console.log(`[wechat-build] debug: ${optimizedSettings.engine.debug}`);
console.log(`[wechat-build] physics: ${optimizedSettings.physics.physicsEngine}`);
console.log(`[wechat-build] exactFitScreen: ${optimizedSettings.screen.exactFitScreen}`);
console.log(
  `[wechat-build] downloadMaxConcurrency: ${optimizedSettings.assets.downloadMaxConcurrency}`,
);
