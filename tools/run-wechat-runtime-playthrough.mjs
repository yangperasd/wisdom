import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { resolveWechatDevToolsCli, wechatDevToolsPort } from './wechat-build-utils.mjs';
import {
  cleanupRuntimeProbeBootstrap,
  cleanupRuntimeProbeBootstrapInBuildOutputs,
} from './wechat-runtime-probe-bootstrap-utils.mjs';

const projectRoot = process.cwd();
const harnessManifestPath = path.join(projectRoot, 'temp', 'wechat-runtime-probe-harness.json');
const probeEvidencePath = path.join(projectRoot, 'temp', 'wechat-runtime-probe-evidence.json');
const playthroughEvidencePath = path.join(projectRoot, 'temp', 'wechat-runtime-playthrough-evidence.json');

function defaultPlaythroughCommand() {
  return {
    id: `playthrough-${Date.now()}`,
    command: 'run-sequence',
    steps: [
      { action: 'snapshot' },
      {
        action: 'move-player-to-world',
        x: 102,
        y: -64,
        durationMs: 3600,
        arrivalThreshold: 8,
        sampleMs: 50,
      },
      { action: 'run-command', kind: 'select-echo', echoId: 0 },
      { action: 'run-command', kind: 'place-echo' },
      { action: 'delay', durationMs: 300 },
      { action: 'snapshot' },
      {
        action: 'run-command',
        kind: 'switch-scene',
        sceneName: 'FieldWest',
        sceneTimeoutMs: 12000,
      },
      {
        action: 'move-player-to-world',
        x: -340,
        y: -20,
        durationMs: 2200,
        arrivalThreshold: 22,
        sampleMs: 50,
      },
      { action: 'delay', durationMs: 400 },
      {
        action: 'set-move-input',
        x: 1,
        y: 0,
        durationMs: 900,
        minMovedDistance: 80,
        minAverageUnitsPerSecond: 120,
        minApproxFps: 20,
      },
      { action: 'run-command', kind: 'attack' },
      { action: 'delay', durationMs: 80 },
      { action: 'run-command', kind: 'place-echo' },
      { action: 'delay', durationMs: 80 },
      { action: 'run-command', kind: 'toggle-pause' },
      { action: 'delay', durationMs: 80 },
      { action: 'run-command', kind: 'toggle-pause' },
      {
        action: 'switch-scene-route',
        sceneTimeoutMs: 15000,
        sceneNames: [
          'FieldWest',
          'FieldRuins',
          'DungeonHub',
          'DungeonRoomA',
          'DungeonRoomB',
          'DungeonRoomC',
          'BossArena',
          'StartCamp',
        ],
      },
      { action: 'snapshot' },
    ],
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function quoteCmdArg(value) {
  const text = String(value);
  if (!/[\s"&|<>^]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function runNodeScript(scriptPath, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [scriptPath],
      {
        cwd: projectRoot,
        shell: false,
        windowsHide: false,
        env: {
          ...process.env,
          ...env,
        },
      },
    );

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(chunk);
    });
    child.on('error', (error) => {
      resolve({
        code: null,
        signal: null,
        stdout,
        stderr,
        error: error instanceof Error ? error.message : String(error),
      });
    });
    child.on('close', (code, signal) => {
      resolve({
        code,
        signal,
        stdout,
        stderr,
        error: null,
      });
    });
  });
}

function runProcess(command, args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      shell: false,
      windowsHide: false,
      env: {
        ...process.env,
        ...env,
      },
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
      resolve({
        code: null,
        signal: null,
        stdout,
        stderr,
        error: error instanceof Error ? error.message : String(error),
      });
    });
    child.on('close', (code, signal) => {
      resolve({
        code,
        signal,
        stdout,
        stderr,
        error: null,
      });
    });
  });
}

async function closeDevToolsForPrepare() {
  if (process.env.WECHAT_RUNTIME_PROBE_PREPARE_FORCE_CLOSE !== '1') {
    return null;
  }

  const cliPath = await resolveWechatDevToolsCli();
  return runProcess('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    '& $env:WECHAT_DEVTOOLS_CLI quit --port $env:WECHAT_DEVTOOLS_PORT --lang zh',
  ], {
    WECHAT_DEVTOOLS_CLI: cliPath,
    WECHAT_DEVTOOLS_PORT: String(wechatDevToolsPort),
  });
}

function resolveRequestedCommand() {
  const raw = process.env.WECHAT_RUNTIME_PLAYTHROUGH_COMMAND_JSON?.trim();
  if (!raw) {
    return defaultPlaythroughCommand();
  }

  const parsed = JSON.parse(raw);
  if (!parsed?.command) {
    throw new Error('WECHAT_RUNTIME_PLAYTHROUGH_COMMAND_JSON must include a command field.');
  }

  return {
    id: parsed.id ?? `playthrough-${Date.now()}`,
    ...parsed,
  };
}

function summarizeProbeResult(result) {
  const steps = Array.isArray(result?.steps) ? result.steps : [];
  const movementStep = steps.find((step) => step?.action === 'set-move-input')
    ?? steps.find((step) => step?.action === 'hold-joystick');
  const sceneRouteStep = steps.find((step) => step?.action === 'switch-scene-route');
  const route = Array.isArray(sceneRouteStep?.route) ? sceneRouteStep.route : [];

  return {
    passed: result?.passed === true,
    stepCount: steps.length,
    movement: movementStep
      ? {
          action: movementStep.action ?? null,
          movedDistance: movementStep.movedDistance ?? null,
          averageUnitsPerSecond: movementStep.averageUnitsPerSecond ?? null,
          approxFps: movementStep.approxFps ?? null,
          passed: movementStep.passed !== false,
        }
      : null,
    route,
    loadedSceneCount: route.filter((entry) => entry?.loaded).length,
    totalSceneCount: route.length,
  };
}

const requestedCommand = resolveRequestedCommand();
const prepareScriptPath = path.join(projectRoot, 'tools', 'prepare-wechat-runtime-probe-harness.mjs');
const probeScriptPath = path.join(projectRoot, 'tools', 'run-wechat-runtime-probe.mjs');

await closeDevToolsForPrepare();

const prepareResult = await runNodeScript(prepareScriptPath, {
  WECHAT_RUNTIME_PROBE_SKIP_FRESHNESS: process.env.WECHAT_RUNTIME_PROBE_SKIP_FRESHNESS ?? '0',
  WECHAT_RUNTIME_PROBE_IN_PLACE: process.env.WECHAT_RUNTIME_PROBE_IN_PLACE ?? '1',
  WECHAT_RUNTIME_PROBE_IN_PLACE_PROJECT_NAME: process.env.WECHAT_RUNTIME_PROBE_IN_PLACE_PROJECT_NAME ?? '',
  ...(process.env.WECHAT_RUNTIME_PROBE_SOURCE_DIR
    ? { WECHAT_RUNTIME_PROBE_SOURCE_DIR: process.env.WECHAT_RUNTIME_PROBE_SOURCE_DIR }
    : {}),
});

if (prepareResult.code !== 0) {
  writeJson(playthroughEvidencePath, {
    generatedAt: new Date().toISOString(),
    status: 'blocked',
    stage: 'prepare-harness',
    requestedCommand,
    prepareResult,
  });
  throw new Error(`Failed to prepare WeChat runtime probe harness. Exit code: ${prepareResult.code ?? 'unknown'}`);
}

if (!fs.existsSync(harnessManifestPath)) {
  throw new Error(`WeChat runtime probe harness manifest missing: ${harnessManifestPath}`);
}

const harnessManifest = readJson(harnessManifestPath);
const timeoutMs = String(process.env.WECHAT_RUNTIME_PLAYTHROUGH_TIMEOUT_MS ?? 180000);
const probeResult = await runNodeScript(probeScriptPath, {
  WECHAT_RUNTIME_PROBE_PROJECT_PATH: harnessManifest.harnessDir,
  WECHAT_RUNTIME_PROBE_EXPECTED_PROJECT_NAME: harnessManifest.projectName,
  WECHAT_RUNTIME_PROBE_FORCE_REOPEN: process.env.WECHAT_RUNTIME_PROBE_FORCE_REOPEN ?? '0',
  WECHAT_RUNTIME_PROBE_SOFT_CLOSE: process.env.WECHAT_RUNTIME_PROBE_SOFT_CLOSE ?? '1',
  WECHAT_RUNTIME_PROBE_AUTO_PREVIEW: process.env.WECHAT_RUNTIME_PROBE_AUTO_PREVIEW ?? '1',
  WECHAT_RUNTIME_PROBE_TIMEOUT_MS: timeoutMs,
  WECHAT_RUNTIME_PROBE_COMMAND_JSON: JSON.stringify(requestedCommand),
});
const bootstrapCleanup = cleanupRuntimeProbeBootstrap(harnessManifest.harnessDir);
const staleBootstrapCleanup = cleanupRuntimeProbeBootstrapInBuildOutputs(projectRoot);

const probeEvidence = fs.existsSync(probeEvidencePath) ? readJson(probeEvidencePath) : null;
const summary = summarizeProbeResult(probeEvidence?.result);
const playthroughEvidence = {
  generatedAt: new Date().toISOString(),
  status: probeEvidence?.status ?? (probeResult.code === 0 ? 'passed' : 'failed'),
  requestedCommand,
  harnessManifest,
  summary,
  probeEvidencePath,
  prepareResult: {
    code: prepareResult.code,
    error: prepareResult.error,
  },
  probeResult: {
    code: probeResult.code,
    error: probeResult.error,
  },
  bootstrapCleanup,
  staleBootstrapCleanup,
  probeError: probeEvidence?.error ?? null,
};

writeJson(playthroughEvidencePath, playthroughEvidence);
console.log(`[wechat-runtime-playthrough] evidence: ${playthroughEvidencePath}`);
console.log(
  `[wechat-runtime-playthrough] movement(${summary.movement?.action ?? 'n/a'}) `
  + `moved=${summary.movement?.movedDistance ?? 'n/a'} `
  + `ups=${summary.movement?.averageUnitsPerSecond ?? 'n/a'} `
  + `fps=${summary.movement?.approxFps ?? 'n/a'}`,
);
console.log(
  `[wechat-runtime-playthrough] scenes loaded=${summary.loadedSceneCount}/${summary.totalSceneCount}`,
);

if (probeResult.code !== 0 || playthroughEvidence.status !== 'passed' || !summary.passed) {
  throw new Error(
    `WeChat runtime playthrough failed. Status=${playthroughEvidence.status}, `
    + `probeExit=${probeResult.code ?? 'unknown'}.`,
  );
}
