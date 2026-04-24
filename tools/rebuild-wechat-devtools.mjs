import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import {
  projectRoot,
  resolveLastWechatBuildOutputDir,
  resolveWechatDevToolsCli,
  wechatDevToolsPort,
} from './wechat-build-utils.mjs';

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
    `${action} failed.`,
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

async function maybeCloseCurrentWechatProject() {
  if (process.env.WECHAT_REBUILD_SKIP_CLOSE === '1') {
    console.log('[wechat-devtools] skip close before rebuild (WECHAT_REBUILD_SKIP_CLOSE=1).');
    return;
  }

  const cliPath = await resolveWechatDevToolsCli();
  const port = process.env.WECHAT_DEVTOOLS_PORT || `${wechatDevToolsPort}`;
  const lang = process.env.WECHAT_DEVTOOLS_LANG || 'zh';
  let projectPath = null;

  try {
    projectPath = await resolveLastWechatBuildOutputDir(projectRoot);
  } catch {
    console.warn('[wechat-devtools] no previous WeChat build output found; skipping pre-build close.');
    return;
  }

  console.log(`[wechat-devtools] pre-build close: ${projectPath}`);
  const closeResult = await runWechatDevToolsCli(
    cliPath,
    '& $env:WECHAT_DEVTOOLS_CLI close --project $env:WECHAT_DEVTOOLS_PROJECT --port $env:WECHAT_DEVTOOLS_PORT --lang $env:WECHAT_DEVTOOLS_LANG',
    {
      WECHAT_DEVTOOLS_PROJECT: projectPath,
      WECHAT_DEVTOOLS_PORT: port,
      WECHAT_DEVTOOLS_LANG: lang,
    },
  );
  if (closeResult.error) {
    throw formatFailure('wechat devtools close', closeResult);
  }
  if (closeResult.code !== 0) {
    console.warn(`[wechat-devtools] close returned ${closeResult.code}; continuing with rebuild.`);
  } else {
    await delay(Number(process.env.WECHAT_DEVTOOLS_CLOSE_WAIT_MS || 1500));
  }
}

async function runNodeScript(relativePath, label) {
  console.log(`[wechat-devtools] ${label}: ${relativePath}`);
  const result = await runProcess(process.execPath, [path.join(projectRoot, relativePath)]);
  if (result.error || result.code !== 0) {
    throw formatFailure(label, result);
  }
}

await maybeCloseCurrentWechatProject();
await runNodeScript(path.join('tools', 'run-wechat-build.mjs'), 'build');

if (process.env.WECHAT_REBUILD_SKIP_VERIFY !== '1') {
  await runNodeScript(path.join('tools', 'verify-wechat-build-output.mjs'), 'verify');
}

await runNodeScript(path.join('tools', 'open-wechat-devtools.mjs'), 'open');
