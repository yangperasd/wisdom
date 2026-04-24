import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import {
  assertWechatBuildFreshness,
  assertWechatGameProjectConfig,
  projectRoot,
  resolveLastWechatBuildOutputDir,
  resolveWechatDevToolsCli,
  wechatDevToolsPort,
} from './wechat-build-utils.mjs';
import { cleanupRuntimeProbeBootstrapInBuildOutputs } from './wechat-runtime-probe-bootstrap-utils.mjs';

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      shell: false,
      windowsHide: false,
      ...options,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
      process.stdout.write(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });
    child.on('error', (error) => {
      resolve({ code: null, signal: null, stdout, stderr, error: error.message });
    });
    child.on('close', (code, signal) => {
      resolve({ code, signal, stdout, stderr, error: null });
    });
  });
}

function runWechatDevToolsCli(cliPath, commandText, extraEnv = {}) {
  return runProcess('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    commandText,
  ], {
    env: {
      ...process.env,
      WECHAT_DEVTOOLS_CLI: cliPath,
      ...extraEnv,
    },
  });
}

function formatFailure(action, result) {
  const details = [
    `WeChat DevTools ${action} failed.`,
    `code=${result.code ?? 'null'}`,
    `signal=${result.signal ?? 'null'}`,
  ];
  if (result.error) {
    details.push(`error=${result.error}`);
  }
  if (result.stderr?.trim()) {
    details.push(`stderr=${result.stderr.trim()}`);
  }
  if (result.stdout?.trim()) {
    details.push(`stdout=${result.stdout.trim()}`);
  }
  return new Error(details.join(' '));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const cliPath = await resolveWechatDevToolsCli();
await assertWechatBuildFreshness(projectRoot);
const projectPath = await resolveLastWechatBuildOutputDir(projectRoot);
const port = process.env.WECHAT_DEVTOOLS_PORT || `${wechatDevToolsPort}`;
const lang = process.env.WECHAT_DEVTOOLS_LANG || 'zh';
const bootstrapCleanup = cleanupRuntimeProbeBootstrapInBuildOutputs(projectRoot);
const projectConfigPath = path.join(projectPath, 'project.config.json');
const projectConfig = JSON.parse(await readFile(projectConfigPath, 'utf8'));
assertWechatGameProjectConfig(projectConfig, projectConfigPath);

console.log(`[wechat-devtools] cli: ${cliPath}`);
console.log(`[wechat-devtools] project: ${projectPath}`);
console.log(`[wechat-devtools] port: ${port}`);
console.log(`[wechat-devtools] compileType: ${projectConfig.compileType}`);
console.log(`[wechat-devtools] appid: ${projectConfig.appid}`);
if (bootstrapCleanup.cleanedCount > 0) {
  console.log(
    `[wechat-devtools] cleaned stale runtime probe bootstrap from ${bootstrapCleanup.cleanedProjectDirs.join(', ')}`,
  );
}
console.log(
  `[wechat-devtools] mode: ${process.env.WECHAT_DEVTOOLS_FORCE_REOPEN === '1' ? 'force-reopen' : 'open'}`,
);

if (process.env.WECHAT_DEVTOOLS_FORCE_REOPEN === '1') {
  const closeAction = process.env.WECHAT_DEVTOOLS_SOFT_CLOSE === '1' ? 'close' : 'quit';
  const closeCommand = process.env.WECHAT_DEVTOOLS_SOFT_CLOSE === '1'
    ? '& $env:WECHAT_DEVTOOLS_CLI close --project $env:WECHAT_DEVTOOLS_PROJECT --port $env:WECHAT_DEVTOOLS_PORT --lang $env:WECHAT_DEVTOOLS_LANG'
    : '& $env:WECHAT_DEVTOOLS_CLI quit --port $env:WECHAT_DEVTOOLS_PORT --lang $env:WECHAT_DEVTOOLS_LANG';
  const closeResult = await runWechatDevToolsCli(cliPath, closeCommand, {
    WECHAT_DEVTOOLS_PROJECT: projectPath,
    WECHAT_DEVTOOLS_PORT: port,
    WECHAT_DEVTOOLS_LANG: lang,
  });
  if (closeResult.error) {
    throw formatFailure(closeAction, closeResult);
  }
  if (closeResult.code !== 0) {
    console.warn(
      `[wechat-devtools] ${closeAction} returned ${closeResult.code}; continuing with open anyway.`,
    );
  }
  await delay(3000);
}

const openResult = await runWechatDevToolsCli(
  cliPath,
  '& $env:WECHAT_DEVTOOLS_CLI open --project $env:WECHAT_DEVTOOLS_PROJECT --port $env:WECHAT_DEVTOOLS_PORT --lang $env:WECHAT_DEVTOOLS_LANG',
  {
    WECHAT_DEVTOOLS_PROJECT: projectPath,
    WECHAT_DEVTOOLS_PORT: port,
    WECHAT_DEVTOOLS_LANG: lang,
  },
);
if (openResult.error || openResult.code !== 0) {
  throw formatFailure('open', openResult);
}

console.log('[wechat-devtools] open requested successfully.');
