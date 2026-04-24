import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {
  assertWechatGameProjectConfig,
  createWechatGameProjectConfig,
  defaultWechatAppId,
  projectRoot,
} from './wechat-build-utils.mjs';

const buildRoot = path.join(projectRoot, 'build');
const harnessRoot = path.join(os.tmpdir(), 'wisdom-wechat-harnesses');
const reportPath = path.join(projectRoot, 'temp', 'wechat-project-config-repair-report.json');
const appId = process.env.WECHATGAME_APPID || defaultWechatAppId;

function collectProjectConfigPaths(rootDir) {
  const files = [];
  if (!fs.existsSync(rootDir)) {
    return files;
  }

  const walk = (currentDir) => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name === 'project.config.json') {
        files.push(entryPath);
      }
    }
  };

  walk(rootDir);
  return files;
}

function shouldRepairConfigPath(configPath) {
  const parts = configPath.split(path.sep);
  return parts.some((part) => /^wechatgame(?:-|$)/i.test(part));
}

function readExistingConfig(configPath) {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

function validateConfig(projectConfig, configPath) {
  try {
    assertWechatGameProjectConfig(projectConfig, configPath);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

const configPaths = [
  ...collectProjectConfigPaths(buildRoot),
  ...collectProjectConfigPaths(harnessRoot),
].filter(shouldRepairConfigPath);

const results = [];

for (const configPath of configPaths) {
  const existingConfig = readExistingConfig(configPath);
  const beforeError = validateConfig(existingConfig, configPath);
  const normalizedConfig = createWechatGameProjectConfig({
    existingConfig,
    appId,
    urlCheck: existingConfig?.setting?.urlCheck === false ? false : true,
  });
  const existingText = JSON.stringify(existingConfig);
  const normalizedText = JSON.stringify(normalizedConfig);
  const needsRewrite = Boolean(beforeError) || existingText !== normalizedText;

  if (!needsRewrite) {
    results.push({ configPath, status: 'valid' });
    continue;
  }

  fs.writeFileSync(configPath, `${JSON.stringify(normalizedConfig, null, 2)}\n`, 'utf8');
  const afterError = validateConfig(normalizedConfig, configPath);
  results.push({
    configPath,
    status: afterError ? 'failed' : (beforeError ? 'repaired' : 'normalized'),
    beforeError,
    afterError,
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  roots: [buildRoot, harnessRoot],
  scanned: results.length,
  repaired: results.filter((entry) => entry.status === 'repaired').length,
  normalized: results.filter((entry) => entry.status === 'normalized').length,
  failed: results.filter((entry) => entry.status === 'failed').length,
  results,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`[wechat-project-config] scanned: ${report.scanned}`);
console.log(`[wechat-project-config] repaired: ${report.repaired}`);
console.log(`[wechat-project-config] normalized: ${report.normalized}`);
console.log(`[wechat-project-config] failed: ${report.failed}`);
console.log(`[wechat-project-config] report: ${reportPath}`);

if (report.failed > 0) {
  process.exitCode = 1;
}
