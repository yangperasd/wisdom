import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import wsPkg from 'ws';
import {
  assertWechatBuildFreshness,
  assertWechatGameProjectConfig,
  resolveWechatDevToolsCli,
  wechatDevToolsPort,
} from './wechat-build-utils.mjs';

const WebSocketServer = wsPkg.WebSocketServer ?? wsPkg.Server;

const projectRoot = process.cwd();
const port = Number(process.env.WECHAT_RUNTIME_PROBE_PORT || 37991);
const timeoutMs = Number(process.env.WECHAT_RUNTIME_PROBE_TIMEOUT_MS || 90_000);
const evidencePath = path.join(projectRoot, 'temp', 'wechat-runtime-probe-evidence.json');
const lastGoodPath = path.join(projectRoot, 'temp', 'wechat-runtime-probe-last-good.json');
const projectPath = process.env.WECHAT_RUNTIME_PROBE_PROJECT_PATH
  ? path.resolve(process.env.WECHAT_RUNTIME_PROBE_PROJECT_PATH)
  : null;
const expectedHarnessProjectName = process.env.WECHAT_RUNTIME_PROBE_EXPECTED_PROJECT_NAME?.trim() ?? '';

function resolveRequestedCommand() {
  const rawCommand = process.env.WECHAT_RUNTIME_PROBE_COMMAND_JSON
    ?? process.env.WECHAT_RUNTIME_PROBE_COMMAND
    ?? '';
  const trimmed = rawCommand.trim();

  if (!trimmed) {
    return {
      id: `touch-smoke-${Date.now()}`,
      command: 'run-touch-smoke',
    };
  }

  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    if (!parsed?.command) {
      throw new Error('WECHAT_RUNTIME_PROBE_COMMAND_JSON must include a command field.');
    }
    return {
      id: parsed.id ?? `probe-${Date.now()}`,
      ...parsed,
    };
  }

  return {
    id: `probe-${Date.now()}`,
    command: trimmed,
  };
}

function didCommandPass(result) {
  if (typeof result?.passed === 'boolean') {
    return result.passed;
  }

  return true;
}

const requestedCommand = resolveRequestedCommand();

const evidence = {
  generatedAt: new Date().toISOString(),
  port,
  source: 'WeChat DevTools runtime via wx.connectSocket',
  projectPath,
  requestedCommand,
  status: 'pending',
  messages: [],
  result: null,
  error: null,
};

fs.mkdirSync(path.dirname(evidencePath), { recursive: true });

function writeEvidence() {
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}

function writeLastGoodHarness(projectName) {
  if (!projectPath || !projectName) {
    return;
  }

  fs.mkdirSync(path.dirname(lastGoodPath), { recursive: true });
  fs.writeFileSync(lastGoodPath, `${JSON.stringify({
    updatedAt: new Date().toISOString(),
    projectPath,
    projectName,
  }, null, 2)}\n`);
}

function finish(status, error = null) {
  evidence.status = status;
  evidence.error = error;
  writeEvidence();
  try {
    server.close();
  } catch {
    // ignore close errors on process shutdown
  }
  process.exit(status === 'passed' ? 0 : 1);
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const isWindowsBatch = process.platform === 'win32' && /\.bat$/i.test(command);
    const child = spawn(isWindowsBatch ? (process.env.ComSpec ?? 'cmd.exe') : command, isWindowsBatch ? [
      '/d',
      '/c',
      [quoteCmdArg(command), ...args.map(quoteCmdArg)].join(' '),
    ] : args, {
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

function quoteCmdArg(value) {
  const text = String(value);
  if (!/[\s"&|<>^]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchDevToolsIfNeeded() {
  if (!projectPath) {
    return;
  }

  if (process.env.WECHAT_RUNTIME_PROBE_SKIP_FRESHNESS !== '1') {
    await assertWechatBuildFreshness(projectRoot);
  }

  const projectConfigPath = path.join(projectPath, 'project.config.json');
  const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
  assertWechatGameProjectConfig(projectConfig, projectConfigPath);

  const cliPath = await resolveWechatDevToolsCli();
  if (process.env.WECHAT_RUNTIME_PROBE_FORCE_REOPEN === '1') {
    const forceReopenCommand = process.env.WECHAT_RUNTIME_PROBE_SOFT_CLOSE === '1'
      ? '& $env:WECHAT_DEVTOOLS_CLI close --project $env:WECHAT_RUNTIME_PROBE_PROJECT_PATH --port $env:WECHAT_DEVTOOLS_PORT --lang zh'
      : '& $env:WECHAT_DEVTOOLS_CLI quit --port $env:WECHAT_DEVTOOLS_PORT --lang zh';
    const closeResult = await runProcess('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      forceReopenCommand,
    ], {
      env: {
        ...process.env,
        WECHAT_DEVTOOLS_CLI: cliPath,
        WECHAT_RUNTIME_PROBE_PROJECT_PATH: projectPath,
        WECHAT_DEVTOOLS_PORT: String(wechatDevToolsPort),
      },
    });
    evidence.messages.push({
      at: new Date().toISOString(),
      direction: 'local',
      type: process.env.WECHAT_RUNTIME_PROBE_SOFT_CLOSE === '1' ? 'devtools-close' : 'devtools-quit',
      code: closeResult.code,
      error: closeResult.error,
    });
    writeEvidence();
    await delay(3000);
  }

  const openResult = await runProcess('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    '& $env:WECHAT_DEVTOOLS_CLI open --project $env:WECHAT_RUNTIME_PROBE_PROJECT_PATH --port $env:WECHAT_DEVTOOLS_PORT --lang zh',
  ], {
    env: {
      ...process.env,
      WECHAT_DEVTOOLS_CLI: cliPath,
      WECHAT_RUNTIME_PROBE_PROJECT_PATH: projectPath,
      WECHAT_DEVTOOLS_PORT: String(wechatDevToolsPort),
    },
  });
  evidence.messages.push({
    at: new Date().toISOString(),
    direction: 'local',
    type: 'devtools-open',
    code: openResult.code,
    error: openResult.error,
  });
  writeEvidence();

  if (process.env.WECHAT_RUNTIME_PROBE_ALLOW_MODAL_DISMISS === '1') {
    const dismissOutDir = path.join(projectRoot, 'temp', 'wechat-runtime-probe-modal-dismiss');
    const dismissResult = await runProcess('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.join(projectRoot, 'tools', 'run-wechat-gui-touch-smoke.ps1'),
      '-OutDir',
      dismissOutDir,
      '-PreferTitle',
      expectedHarnessProjectName || projectConfig.projectname || 'wisdom',
      '-AllowUnfocused',
      '-DismissOnly',
    ]);
    evidence.messages.push({
      at: new Date().toISOString(),
      direction: 'local',
      type: 'devtools-modal-dismiss',
      code: dismissResult.code,
      error: dismissResult.error,
    });
    writeEvidence();
  }

  if (process.env.WECHAT_RUNTIME_PROBE_AUTO_PREVIEW !== '0') {
    const previewResult = await runProcess('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      '& $env:WECHAT_DEVTOOLS_CLI auto-preview --project $env:WECHAT_RUNTIME_PROBE_PROJECT_PATH --port $env:WECHAT_DEVTOOLS_PORT --lang zh',
    ], {
      env: {
        ...process.env,
        WECHAT_DEVTOOLS_CLI: cliPath,
        WECHAT_RUNTIME_PROBE_PROJECT_PATH: projectPath,
        WECHAT_DEVTOOLS_PORT: String(wechatDevToolsPort),
      },
    });
    evidence.messages.push({
      at: new Date().toISOString(),
      direction: 'local',
      type: 'devtools-auto-preview',
      code: previewResult.code,
      error: previewResult.error,
    });
    writeEvidence();
  }
}

writeEvidence();

const server = new WebSocketServer({ host: '127.0.0.1', port });
const timeout = setTimeout(() => {
  finish('blocked', `Timed out after ${timeoutMs}ms waiting for WeChat runtime probe connection/result.`);
}, timeoutMs);
let commandDispatched = false;
let commandCompleted = false;

server.on('connection', (socket) => {
  evidence.messages.push({
    at: new Date().toISOString(),
    direction: 'in',
    type: 'connection',
  });
  writeEvidence();

  socket.on('message', (buffer) => {
    const raw = buffer.toString('utf8');
    let message = null;
    try {
      message = JSON.parse(raw);
    } catch {
      message = { type: 'invalid-json', raw };
    }

    evidence.messages.push({
      at: new Date().toISOString(),
      direction: 'in',
      message,
    });

    if (message.type === 'hello') {
      if (expectedHarnessProjectName && message.harnessProjectName !== expectedHarnessProjectName) {
        evidence.messages.push({
          at: new Date().toISOString(),
          direction: 'in',
          type: 'unexpected-harness-hello-ignored',
          expectedHarnessProjectName,
          actualHarnessProjectName: message.harnessProjectName ?? '',
        });
        writeEvidence();
        return;
      }
      if (commandCompleted) {
        evidence.messages.push({
          at: new Date().toISOString(),
          direction: 'in',
          type: 'hello-after-complete-ignored',
        });
        writeEvidence();
        return;
      }
      const resend = commandDispatched;
      commandDispatched = true;
      evidence.messages.push({
        at: new Date().toISOString(),
        direction: 'out',
        type: resend ? 'command-resent' : 'command-dispatched',
        message: requestedCommand,
      });
      writeLastGoodHarness(message.harnessProjectName ?? expectedHarnessProjectName);
      socket.send(JSON.stringify(requestedCommand));
      writeEvidence();
      return;
    }

    if (
      message.type === 'command-result' &&
      (message.id === requestedCommand.id || message.command === requestedCommand.command)
    ) {
      clearTimeout(timeout);
      commandCompleted = true;
      evidence.result = message.result;
      const passed = didCommandPass(message.result);
      finish(
        passed ? 'passed' : 'failed',
        passed ? null : `Runtime probe command ${requestedCommand.command} returned passed=false.`,
      );
      return;
    }

    if (message.type === 'command-error') {
      clearTimeout(timeout);
      commandCompleted = true;
      evidence.result = message;
      finish('failed', message.error ?? 'Runtime probe returned command-error.');
      return;
    }

    writeEvidence();
  });

  socket.on('error', (error) => {
    evidence.messages.push({
      at: new Date().toISOString(),
      direction: 'in',
      type: 'socket-error',
      error: error instanceof Error ? error.message : String(error),
    });
    writeEvidence();
  });
});

server.on('listening', () => {
  console.log(`[wechat-runtime-probe] Listening on ws://127.0.0.1:${port}`);
  console.log(`[wechat-runtime-probe] Evidence: ${evidencePath}`);
  void launchDevToolsIfNeeded();
});

server.on('error', (error) => {
  clearTimeout(timeout);
  finish('blocked', error instanceof Error ? error.message : String(error));
});
