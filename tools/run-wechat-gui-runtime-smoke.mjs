import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
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
const timeoutMs = Number(process.env.WECHAT_GUI_RUNTIME_TIMEOUT_MS || 120_000);
const maxGuiAttempts = Math.max(1, Number(process.env.WECHAT_GUI_ATTEMPTS || 2));
const outDir = path.resolve(process.env.WECHAT_GUI_SMOKE_OUT_DIR ?? 'temp/wechat-gui-runtime-smoke');
const evidencePath = path.join(projectRoot, 'temp', 'wechat-gui-runtime-smoke-evidence.json');
const guiScriptPath = path.join(projectRoot, 'tools', 'run-wechat-gui-touch-smoke.ps1');
const projectPath = process.env.WECHAT_GUI_PROJECT_PATH ? path.resolve(process.env.WECHAT_GUI_PROJECT_PATH) : null;
const preferTitle = process.env.WECHAT_GUI_PREFER_TITLE ?? 'wisdom';
const expectedHarnessProjectName = process.env.WECHAT_GUI_EXPECTED_PROJECT_NAME?.trim() ?? '';

const evidence = {
  generatedAt: new Date().toISOString(),
  source: 'WeChat DevTools real GUI clicks plus runtime snapshots',
  port,
  outDir,
  projectPath,
  status: 'pending',
  messages: [],
  snapshots: {},
  gui: null,
  analysis: null,
  error: null,
};

fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

let server;
let timeout;
let activeSocket = null;
let workflowStarted = false;
const pendingCommands = new Map();

function writeEvidence() {
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

function recordMessage(entry) {
  evidence.messages.push({
    at: new Date().toISOString(),
    ...entry,
  });
  if (evidence.messages.length > 80) {
    evidence.messages.splice(0, evidence.messages.length - 80);
  }
  writeEvidence();
}

function finish(status, error = null) {
  evidence.status = status;
  evidence.error = error;
  writeEvidence();
  clearTimeout(timeout);
  try {
    activeSocket?.close?.();
  } catch {
    // ignore close errors on process shutdown
  }
  try {
    server?.close?.();
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
    return null;
  }

  if (process.env.WECHAT_GUI_SKIP_FRESHNESS !== '1') {
    await assertWechatBuildFreshness(projectRoot);
  }

  const projectConfigPath = path.join(projectPath, 'project.config.json');
  const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
  assertWechatGameProjectConfig(projectConfig, projectConfigPath);

  const cliPath = await resolveWechatDevToolsCli();
  if (process.env.WECHAT_GUI_FORCE_REOPEN === '1') {
    const forceReopenCommand = process.env.WECHAT_GUI_SOFT_CLOSE === '1'
      ? '& $env:WECHAT_DEVTOOLS_CLI close --project $env:WECHAT_GUI_PROJECT_PATH --port $env:WECHAT_DEVTOOLS_PORT --lang zh'
      : '& $env:WECHAT_DEVTOOLS_CLI quit --port $env:WECHAT_DEVTOOLS_PORT --lang zh';
    await runProcess('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      forceReopenCommand,
    ], {
      env: {
        ...process.env,
        WECHAT_DEVTOOLS_CLI: cliPath,
        WECHAT_GUI_PROJECT_PATH: projectPath,
        WECHAT_DEVTOOLS_PORT: String(wechatDevToolsPort),
      },
    });
    await delay(3000);
  }
  const result = await runProcess('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    '& $env:WECHAT_DEVTOOLS_CLI open --project $env:WECHAT_GUI_PROJECT_PATH --port $env:WECHAT_DEVTOOLS_PORT --lang zh',
  ], {
    env: {
      ...process.env,
      WECHAT_DEVTOOLS_CLI: cliPath,
      WECHAT_GUI_PROJECT_PATH: projectPath,
      WECHAT_DEVTOOLS_PORT: String(wechatDevToolsPort),
    },
  });
  recordMessage({
    direction: 'local',
    type: 'devtools-open',
    projectPath,
    code: result.code,
    error: result.error,
  });

  if (process.env.WECHAT_GUI_SKIP_MODAL_DISMISS !== '1') {
    await delay(1500);
    const dismissResult = await runProcess('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      guiScriptPath,
      '-OutDir',
      path.join(outDir, 'modal-dismiss'),
      '-PreferTitle',
      expectedHarnessProjectName || projectConfig.projectname || preferTitle,
      '-AllowUnfocused',
      '-DismissOnly',
    ]);
    recordMessage({
      direction: 'local',
      type: 'devtools-modal-dismiss',
      projectPath,
      code: dismissResult.code,
      error: dismissResult.error,
    });
  }

  return result;
}

function sendCommand(socket, command) {
  return new Promise((resolve, reject) => {
    const id = `${command}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    pendingCommands.set(id, { resolve, reject, command });
    const message = { id, command };
    recordMessage({ direction: 'out', message });
    socket.send(JSON.stringify(message), (error) => {
      if (error) {
        pendingCommands.delete(id);
        reject(error);
      }
    });
  });
}

function isSocketOpen(socket) {
  return socket && socket.readyState === 1;
}

function waitForActiveSocket(waitMs = 12_000) {
  if (isSocketOpen(activeSocket)) {
    return Promise.resolve(activeSocket);
  }

  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (isSocketOpen(activeSocket)) {
        clearInterval(timer);
        resolve(activeSocket);
        return;
      }
      if (Date.now() - startedAt > waitMs) {
        clearInterval(timer);
        reject(new Error(`Runtime probe socket did not reconnect within ${waitMs}ms after GUI input.`));
      }
    }, 250);
  });
}

async function runGuiSmoke() {
  const args = [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    guiScriptPath,
    '-OutDir',
    outDir,
    '-PreferTitle',
    preferTitle,
  ];
  if (process.env.WECHAT_GUI_ALLOW_UNFOCUSED === '1') {
    args.push('-AllowUnfocused');
  }
  if (process.env.WECHAT_GUI_MOVE_TO_PRIMARY === '1') {
    args.push('-MoveToPrimary');
  }
  if (process.env.WECHAT_GUI_USE_POINTER_TOUCH === '1') {
    args.push('-UsePointerTouch');
  }
  if (process.env.WECHAT_GUI_USE_WINDOW_MESSAGES === '1') {
    args.push('-UseWindowMessages');
  }
  return await runProcess('powershell.exe', args);
}

function readNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function distance2d(a, b) {
  const ax = readNumber(a?.x);
  const ay = readNumber(a?.y);
  const bx = readNumber(b?.x);
  const by = readNumber(b?.y);
  if (ax === null || ay === null || bx === null || by === null) {
    return 0;
  }
  return Math.hypot(bx - ax, by - ay);
}

function analyseGuiRuntime(before, after, guiStartedAtMs, guiResult) {
  const beforePosition = before?.player?.position ?? null;
  const afterPosition = after?.player?.position ?? null;
  const movedDistance = distance2d(beforePosition, afterPosition);
  const beforeEchoCount = Number(before?.echoCount ?? 0);
  const afterEchoCount = Number(after?.echoCount ?? 0);
  const echoDelta = afterEchoCount - beforeEchoCount;
  const recentCommands = Array.isArray(after?.qaTouchLog)
    ? after.qaTouchLog.filter((entry) => Number(entry?.at ?? 0) >= guiStartedAtMs - 500)
    : [];
  const recentRuntimeInputEvents = Array.isArray(after?.runtimeInputEvents)
    ? after.runtimeInputEvents.filter((entry) => Number(entry?.at ?? 0) >= guiStartedAtMs - 500)
    : [];
  const executedCommandNames = recentCommands
    .filter((entry) => entry?.status === 'executed')
    .map((entry) => entry?.commandName)
    .filter(Boolean);
  const observedRuntimeInputTypes = recentRuntimeInputEvents
    .map((entry) => entry?.type)
    .filter(Boolean);
  const endedPaused = after?.flowState === 'paused' || after?.flowState === 'Paused';
  const guiExitedCleanly = guiResult.code === 0 && !guiResult.error;
  const playerMovedEnough = movedDistance >= 8;
  const runtimeInputObserved = observedRuntimeInputTypes.length > 0;
  const attackExecuted = executedCommandNames.includes('Attack');
  const echoExecuted = executedCommandNames.includes('PlaceEcho') || echoDelta > 0;
  const pauseExecuted = executedCommandNames.includes('PauseToggle') || endedPaused;
  const passed = guiExitedCleanly && runtimeInputObserved && playerMovedEnough && attackExecuted && echoExecuted && pauseExecuted && endedPaused;

  return {
    guiExitedCleanly,
    runtimeInputObserved,
    observedRuntimeInputTypes,
    movedDistance,
    playerMovedEnough,
    echoDelta,
    endedPaused,
    executedCommandNames,
    recentCommands,
    passed,
    failureReasons: [
      guiExitedCleanly ? null : 'gui-script-failed',
      runtimeInputObserved ? null : 'runtime-input-not-observed',
      playerMovedEnough ? null : 'player-did-not-move-enough',
      attackExecuted ? null : 'attack-command-not-observed',
      echoExecuted ? null : 'echo-command-not-observed',
      pauseExecuted ? null : 'pause-command-not-observed',
      endedPaused ? null : 'final-flow-state-not-paused',
    ].filter(Boolean),
  };
}

async function runWorkflow(socket) {
  try {
    const before = await sendCommand(socket, 'snapshot');
    evidence.snapshots.beforeGui = before;
    writeEvidence();

    const guiAttempts = [];
    let after = null;
    let analysis = null;
    for (let attempt = 1; attempt <= maxGuiAttempts; attempt += 1) {
      const guiStartedAtMs = Date.now();
      const guiResult = await runGuiSmoke();
      await delay(1000);
      const afterSocket = await waitForActiveSocket();
      after = await sendCommand(afterSocket, 'snapshot');
      analysis = analyseGuiRuntime(before, after, guiStartedAtMs, guiResult);
      guiAttempts.push({
        attempt,
        startedAt: new Date(guiStartedAtMs).toISOString(),
        finishedAt: new Date().toISOString(),
        code: guiResult.code,
        signal: guiResult.signal,
        error: guiResult.error,
        stdoutTail: guiResult.stdout.slice(-4000),
        stderrTail: guiResult.stderr.slice(-4000),
        analysis,
      });
      evidence.gui = guiAttempts[guiAttempts.length - 1];
      evidence.guiAttempts = guiAttempts;
      evidence.snapshots.afterGui = after;
      evidence.analysis = analysis;
      writeEvidence();
      if (analysis.passed) {
        break;
      }
      if (!analysis.failureReasons.includes('runtime-input-not-observed')) {
        break;
      }
    }

    finish(evidence.analysis.passed ? 'passed' : 'failed', evidence.analysis.passed ? null : 'GUI clicks did not satisfy runtime smoke assertions.');
  } catch (error) {
    finish('blocked', error instanceof Error ? error.message : String(error));
  }
}

writeEvidence();

server = new WebSocketServer({ host: '127.0.0.1', port });
timeout = setTimeout(() => {
  finish('blocked', `Timed out after ${timeoutMs}ms waiting for WeChat runtime probe workflow.`);
}, timeoutMs);

server.on('connection', (socket) => {
  activeSocket = socket;
  recordMessage({ direction: 'in', type: 'connection' });

  socket.on('message', (buffer) => {
    const raw = buffer.toString('utf8');
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      message = { type: 'invalid-json', raw };
    }
    recordMessage({ direction: 'in', message });

    if (message.type === 'hello') {
      if (expectedHarnessProjectName && message.harnessProjectName !== expectedHarnessProjectName) {
        recordMessage({
          direction: 'in',
          type: 'unexpected-harness-hello-ignored',
          expectedHarnessProjectName,
          actualHarnessProjectName: message.harnessProjectName ?? '',
        });
        return;
      }
      if (workflowStarted) {
        recordMessage({ direction: 'in', type: 'duplicate-hello-ignored' });
        return;
      }
      workflowStarted = true;
      void runWorkflow(socket);
      return;
    }

    if (message.type === 'command-result' && message.id && pendingCommands.has(message.id)) {
      const pending = pendingCommands.get(message.id);
      pendingCommands.delete(message.id);
      pending.resolve(message.result);
      return;
    }

    if (message.type === 'command-error' && message.id && pendingCommands.has(message.id)) {
      const pending = pendingCommands.get(message.id);
      pendingCommands.delete(message.id);
      pending.reject(new Error(message.error ?? 'runtime probe command-error'));
    }
  });

  socket.on('error', (error) => {
    recordMessage({
      direction: 'in',
      type: 'socket-error',
      error: error instanceof Error ? error.message : String(error),
    });
  });

  socket.on('close', () => {
    if (activeSocket === socket) {
      activeSocket = null;
    }
    recordMessage({ direction: 'in', type: 'socket-close' });
  });
});

server.on('listening', async () => {
  console.log(`[wechat-gui-runtime] Listening on ws://127.0.0.1:${port}`);
  console.log(`[wechat-gui-runtime] Evidence: ${evidencePath}`);
  await launchDevToolsIfNeeded();
});

server.on('error', (error) => {
  finish('blocked', error instanceof Error ? error.message : String(error));
});
