import { director, EventMouse, EventTouch, input, Input, Node, UITransform, Vec2, Vec3, view } from 'cc';
import {
  dispatchNativeTouchForQa,
  getNativeChangedTouches,
  getNativeMouseUILocation,
  getNativeTouchId,
  NativeMouseEventLike,
  NativeTouchEventLike,
  NativeTouchEventType,
  NativeTouchLike,
} from '../input/NativeTouchUtils';
import { EchoId, GameFlowState } from '../core/GameTypes';
import { SceneLoader } from '../core/SceneLoader';

interface WechatSocketTask {
  onOpen?: (handler: () => void) => void;
  onMessage?: (handler: (event: { data?: string | ArrayBuffer }) => void) => void;
  onClose?: (handler: () => void) => void;
  onError?: (handler: (event: unknown) => void) => void;
  send?: (options: { data: string; fail?: () => void }) => void;
  close?: () => void;
}

interface WechatRuntimeApi {
  connectSocket?: (options: { url: string }) => WechatSocketTask;
  onTouchStart?: (handler: (event: NativeTouchEventLike) => void) => void;
  onTouchMove?: (handler: (event: NativeTouchEventLike) => void) => void;
  onTouchEnd?: (handler: (event: NativeTouchEventLike) => void) => void;
  onTouchCancel?: (handler: (event: NativeTouchEventLike) => void) => void;
  onMouseDown?: (handler: (event: NativeMouseEventLike) => void) => void;
  onMouseMove?: (handler: (event: NativeMouseEventLike) => void) => void;
  onMouseUp?: (handler: (event: NativeMouseEventLike) => void) => void;
  getSystemInfoSync?: () => {
    platform?: string;
    pixelRatio?: number;
    windowHeight?: number;
  };
  getStorageSync?: (key: string) => string;
  removeStorageSync?: (key: string) => void;
  setStorageSync?: (key: string, value: string) => void;
}

interface RuntimeProbeGlobal {
  __codexQaProbeUrl?: string;
  __codexQaHarnessProjectName?: string;
}

interface RuntimeProbeCommand {
  id?: string;
  command?: string;
  action?: string;
  kind?: string;
  nodeName?: string;
  sceneName?: string;
  expectedScene?: string;
  sceneNames?: string[];
  sceneTimeoutMs?: number;
  x?: number;
  y?: number;
  localX?: number;
  localY?: number;
  durationMs?: number;
  distance?: number;
  arrivalThreshold?: number;
  sampleMs?: number;
  echoId?: number | string;
  releaseAfter?: boolean;
  minMovedDistance?: number;
  maxMovedDistance?: number;
  minAverageUnitsPerSecond?: number;
  maxAverageUnitsPerSecond?: number;
  minApproxFps?: number;
  maxApproxFps?: number;
  steps?: RuntimeProbeStep[];
  [key: string]: unknown;
}

interface RuntimeProbeStep extends RuntimeProbeCommand {}

const DEFAULT_PROBE_URL = 'ws://127.0.0.1:37991';
const PROBE_STORAGE_KEY = '__codexQaProbeUrl';
const PROBE_RETIRE_DELAY_MS = 250;
const PROBE_MAX_CONNECT_ATTEMPTS = 4;
const PROBE_MAX_CONNECT_WINDOW_MS = 12_000;

let started = false;
let socketTask: WechatSocketTask | null = null;
let socketOpen = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retireTimer: ReturnType<typeof setTimeout> | null = null;
let qaTouchIdentifier = 900;
let activeProbeUrl: string | null = null;
let connectAttemptCount = 0;
let firstConnectAttemptAt = 0;
let inputDiagnosticsInstalled = false;
const runtimeInputEvents: Array<Record<string, unknown>> = [];
const completedCommandResults = new Map<string, Record<string, unknown>>();

export function startWechatDevtoolsRuntimeProbe(): void {
  if (started) {
    return;
  }

  const wxApi = getWechatRuntimeApi();
  if (!wxApi?.connectSocket) {
    return;
  }

  activeProbeUrl = readConfiguredProbeUrl(wxApi);
  if (!activeProbeUrl) {
    return;
  }

  started = true;
  installRuntimeInputDiagnostics(wxApi);
  scheduleConnect(200);
}

function getWechatRuntimeApi(): WechatRuntimeApi | null {
  return (globalThis as { wx?: WechatRuntimeApi }).wx ?? null;
}

function scheduleConnect(delayMs: number): void {
  clearRetryTimer();
  retryTimer = setTimeout(connectProbeSocket, delayMs);
}

function clearRetryTimer(): void {
  if (!retryTimer) {
    return;
  }

  clearTimeout(retryTimer);
  retryTimer = null;
}

function clearRetireTimer(): void {
  if (!retireTimer) {
    return;
  }

  clearTimeout(retireTimer);
  retireTimer = null;
}

function resetConnectAttemptBudget(): void {
  connectAttemptCount = 0;
  firstConnectAttemptAt = 0;
}

function noteConnectAttempt(): void {
  if (firstConnectAttemptAt <= 0) {
    firstConnectAttemptAt = Date.now();
  }
  connectAttemptCount += 1;
}

function shouldRetryProbeConnection(): boolean {
  if (!activeProbeUrl) {
    return false;
  }
  if (connectAttemptCount < PROBE_MAX_CONNECT_ATTEMPTS) {
    return true;
  }
  if (firstConnectAttemptAt <= 0) {
    return false;
  }
  return Date.now() - firstConnectAttemptAt < PROBE_MAX_CONNECT_WINDOW_MS;
}

function scheduleReconnectOrRetire(delayMs: number): void {
  if (shouldRetryProbeConnection()) {
    scheduleConnect(delayMs);
    return;
  }

  retireProbeConnection(0);
}

function retireProbeConnection(delayMs = PROBE_RETIRE_DELAY_MS): void {
  clearRetryTimer();
  clearRetireTimer();
  resetConnectAttemptBudget();
  activeProbeUrl = null;
  (globalThis as RuntimeProbeGlobal).__codexQaProbeUrl = '';

  const wxApi = getWechatRuntimeApi();
  wxApi?.removeStorageSync?.(PROBE_STORAGE_KEY);
  wxApi?.setStorageSync?.(PROBE_STORAGE_KEY, '');

  retireTimer = setTimeout(() => {
    clearRetireTimer();
    socketOpen = false;
    try {
      socketTask?.close?.();
    } catch {
      // Probe shutdown is diagnostic-only.
    }
    socketTask = null;
  }, delayMs);
}

function connectProbeSocket(): void {
  const wxApi = getWechatRuntimeApi();
  if (!wxApi?.connectSocket) {
    return;
  }

  const url = readConfiguredProbeUrl(wxApi) ?? activeProbeUrl ?? DEFAULT_PROBE_URL;
  noteConnectAttempt();
  try {
    socketTask = wxApi.connectSocket({ url });
  } catch {
    scheduleReconnectOrRetire(1500);
    return;
  }

  socketTask.onOpen?.(() => {
    socketOpen = true;
    resetConnectAttemptBudget();
    sendProbeMessage({
      type: 'hello',
      source: 'wechat-devtools-runtime',
      url,
      harnessProjectName: readHarnessProjectName(),
      snapshot: collectRuntimeSnapshot(),
    });
  });
  socketTask.onMessage?.((event) => {
    if (typeof event.data !== 'string') {
      return;
    }
    void handleProbeCommand(event.data);
  });
  socketTask.onClose?.(() => {
    socketOpen = false;
    socketTask = null;
    if (activeProbeUrl) {
      scheduleReconnectOrRetire(1500);
    }
  });
  socketTask.onError?.(() => {
    socketOpen = false;
    if (activeProbeUrl) {
      scheduleReconnectOrRetire(1500);
    }
  });
}

function readHarnessProjectName(): string {
  const harnessProjectName = (globalThis as RuntimeProbeGlobal).__codexQaHarnessProjectName;
  return harnessProjectName?.trim?.() ?? '';
}

function readConfiguredProbeUrl(wxApi: WechatRuntimeApi): string | null {
  const globalProbeUrl = (globalThis as RuntimeProbeGlobal).__codexQaProbeUrl;
  const trimmedGlobalUrl = globalProbeUrl?.trim?.() ?? '';
  if (trimmedGlobalUrl.length > 0) {
    return trimmedGlobalUrl;
  }

  const configuredUrl = wxApi.getStorageSync?.(PROBE_STORAGE_KEY);
  const trimmed = configuredUrl?.trim?.() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

async function handleProbeCommand(rawData: string): Promise<void> {
  let command: RuntimeProbeCommand;
  try {
    command = JSON.parse(rawData) as RuntimeProbeCommand;
  } catch {
    sendProbeMessage({ type: 'command-error', error: 'invalid-json', rawData });
    return;
  }

  const cachedResult = readCachedCommandResult(command);
  if (cachedResult) {
    sendProbeMessage({
      type: 'command-result',
      id: command.id,
      command: command.command,
      result: cachedResult,
      replayed: true,
    });
    return;
  }

  try {
    if (command.command === 'snapshot') {
      emitCommandResult(command, collectRuntimeSnapshot());
      return;
    }

    if (command.command === 'run-touch-smoke') {
      const result = await runTouchSmoke();
      emitCommandResult(command, result);
      return;
    }

    if (command.command === 'set-move-input') {
      const result = await setMoveInputForQa(command);
      emitCommandResult(command, result);
      return;
    }

    if (command.command === 'hold-joystick') {
      const result = await holdJoystickForQa(command);
      emitCommandResult(command, result);
      return;
    }

    if (command.command === 'move-player-to-world') {
      const result = await movePlayerToWorldForQa(command);
      emitCommandResult(command, result);
      return;
    }

    if (command.command === 'move-until-scene') {
      const result = await moveUntilSceneForQa(command);
      emitCommandResult(command, result);
      return;
    }

    if (command.command === 'run-command') {
      const result = await runDirectCommandForQa(command);
      emitCommandResult(command, result);
      return;
    }

    if (command.command === 'run-sequence') {
      const result = await runSequenceForQa(command);
      emitCommandResult(command, result);
      return;
    }

    sendProbeMessage({
      type: 'command-error',
      id: command.id,
      command: command.command,
      error: 'unknown-command',
    });
  } catch (error) {
    sendProbeMessage({
      type: 'command-error',
      id: command.id,
      command: command.command,
      error: error instanceof Error ? error.message : String(error),
      snapshot: collectRuntimeSnapshot(),
    });
  }
}

function emitCommandResult(command: RuntimeProbeCommand, result: Record<string, unknown>): void {
  rememberCommandResult(command, result);
  sendProbeMessage({
    type: 'command-result',
    id: command.id,
    command: command.command,
    result,
  });
}

function readCachedCommandResult(command: RuntimeProbeCommand): Record<string, unknown> | null {
  const cacheKey = getCommandCacheKey(command);
  if (!cacheKey) {
    return null;
  }

  return completedCommandResults.get(cacheKey) ?? null;
}

function rememberCommandResult(command: RuntimeProbeCommand, result: Record<string, unknown>): void {
  const cacheKey = getCommandCacheKey(command);
  if (!cacheKey) {
    return;
  }

  completedCommandResults.set(cacheKey, result);
  while (completedCommandResults.size > 16) {
    const firstKey = completedCommandResults.keys().next().value;
    if (!firstKey) {
      break;
    }
    completedCommandResults.delete(firstKey);
  }
}

function getCommandCacheKey(command: RuntimeProbeCommand): string {
  const id = String(command.id ?? '').trim();
  return id.length > 0 ? id : '';
}

async function runTouchSmoke(): Promise<Record<string, unknown>> {
  resetQaTouchLog();
  const before = collectRuntimeSnapshot();
  const beforePosition = readPlayerPosition();

  await dragJoystickForQa(56, 0, 450);
  const afterMove = collectRuntimeSnapshot();
  const afterMovePosition = readPlayerPosition();

  const movedDistance = beforePosition && afterMovePosition
    ? Math.hypot(afterMovePosition.x - beforePosition.x, afterMovePosition.y - beforePosition.y)
    : 0;

  await tapNodeForQa('TouchAttack');
  const afterAttack = collectRuntimeSnapshot();
  const attackStateObserved = Boolean((afterAttack.player as { isAttacking?: boolean } | undefined)?.isAttacking);
  const attackCommandExecuted = readQaTouchLog().some((entry) =>
    entry.commandName === 'Attack' && entry.status === 'executed',
  );

  await delay(80);
  const echoesBefore = readEchoCount();
  await tapNodeForQa('TouchPlaceEcho');
  await delay(80);
  const echoesAfter = readEchoCount();
  const afterEcho = collectRuntimeSnapshot();

  await tapNodeForQa('TouchPause');
  const afterPause = collectRuntimeSnapshot();
  await tapNodeForQa('PauseContinue');
  const afterResume = collectRuntimeSnapshot();

  const sceneRoute = await switchSceneRouteForQa(['FieldWest', 'FieldRuins', 'DungeonHub', 'StartCamp']);

  return {
    before,
    afterMove,
    afterAttack,
    afterEcho,
    afterPause,
    afterResume,
    movedDistance,
    movedEnough: movedDistance >= 12,
    attackStarted: attackStateObserved || attackCommandExecuted,
    attackStateObserved,
    attackCommandExecuted,
    echoSpawned: echoesAfter > echoesBefore,
    pauseEntered: (afterPause.flowState as string | null) === GameFlowState.Paused,
    pauseResumed: (afterResume.flowState as string | null) === GameFlowState.Playing,
    sceneRoute,
    qaTouchLog: readQaTouchLog(),
    passed: movedDistance >= 12 &&
      (attackStateObserved || attackCommandExecuted) &&
      echoesAfter > echoesBefore &&
      (afterPause.flowState as string | null) === GameFlowState.Paused &&
      (afterResume.flowState as string | null) === GameFlowState.Playing &&
      sceneRoute.every((entry) => entry.loaded),
  };
}

async function setMoveInputForQa(command: RuntimeProbeCommand): Promise<Record<string, unknown>> {
  const player = resolvePlayerController();
  if (!player) {
    throw new Error('PlayerController is missing from the runtime graph.');
  }

  const requestedX = toFiniteNumber(command.x, 0);
  const requestedY = toFiniteNumber(command.y, 0);
  const durationMs = sanitizeDurationMs(command.durationMs, 900);
  const releaseAfter = command.releaseAfter !== false;
  const before = collectRuntimeSnapshot();
  const beforePosition = readPlayerPosition();
  const beforeFrames = director.getTotalFrames?.() ?? 0;
  const holdStartedAt = Date.now();

  player.setMoveInput(requestedX, requestedY);
  await delay(durationMs);
  const afterHoldPosition = readPlayerPosition();
  const afterHoldFrames = director.getTotalFrames?.() ?? beforeFrames;
  const holdFinishedAt = Date.now();

  if (releaseAfter) {
    player.setMoveInput(0, 0);
    await delay(60);
  }

  const after = collectRuntimeSnapshot();
  const afterPosition = readPlayerPosition();
  const movedDistance = calculateDistance(beforePosition, afterHoldPosition ?? afterPosition);
  const elapsedMs = Math.max(1, holdFinishedAt - holdStartedAt);
  const framesElapsed = Math.max(0, afterHoldFrames - beforeFrames);
  const averageUnitsPerSecond = Number(((movedDistance / elapsedMs) * 1000).toFixed(2));
  const approxFps = Number(((framesElapsed / elapsedMs) * 1000).toFixed(2));
  const expectation = evaluateMotionExpectations(command, {
    movedDistance,
    averageUnitsPerSecond,
    approxFps,
  });

  return {
    command: 'set-move-input',
    requestedInput: { x: requestedX, y: requestedY },
    releaseAfter,
    durationMs,
    movedDistance,
    averageUnitsPerSecond,
    approxFps,
    framesElapsed,
    before,
    after,
    beforePosition,
    afterHoldPosition,
    afterPosition,
    expectation,
    passed: expectation.passed,
  };
}

async function holdJoystickForQa(command: RuntimeProbeCommand): Promise<Record<string, unknown>> {
  const localX = toFiniteNumber(command.localX, 56);
  const localY = toFiniteNumber(command.localY, 0);
  const durationMs = sanitizeDurationMs(command.durationMs, 900);
  const before = collectRuntimeSnapshot();
  const beforePosition = readPlayerPosition();
  const beforeFrames = director.getTotalFrames?.() ?? 0;
  const timing = await dragJoystickForQa(localX, localY, durationMs);

  const after = collectRuntimeSnapshot();
  const afterPosition = readPlayerPosition();
  const framesElapsed = Math.max(0, timing.holdFinishedFrames - beforeFrames);
  const elapsedMs = Math.max(1, timing.holdFinishedAt - timing.holdStartedAt);
  const movedDistance = calculateDistance(beforePosition, afterPosition);
  const averageUnitsPerSecond = Number(((movedDistance / elapsedMs) * 1000).toFixed(2));
  const approxFps = Number(((framesElapsed / elapsedMs) * 1000).toFixed(2));
  const expectation = evaluateMotionExpectations(command, {
    movedDistance,
    averageUnitsPerSecond,
    approxFps,
  });

  return {
    command: 'hold-joystick',
    requestedOffset: { x: localX, y: localY },
    durationMs,
    movedDistance,
    averageUnitsPerSecond,
    approxFps,
    framesElapsed,
    before,
    after,
    beforePosition,
    afterPosition,
    expectation,
    passed: expectation.passed,
  };
}

async function movePlayerToWorldForQa(command: RuntimeProbeCommand): Promise<Record<string, unknown>> {
  if (!resolvePlayerController()) {
    throw new Error('PlayerController is missing from the runtime graph.');
  }

  const targetX = toFiniteNumber(command.x, 0);
  const targetY = toFiniteNumber(command.y, 0);
  const durationMs = sanitizeDurationMs(command.durationMs, 2_000);
  const arrivalThreshold = Math.max(4, toFiniteNumber(command.arrivalThreshold, 18));
  const sampleMs = Math.max(16, sanitizeDurationMs(command.sampleMs, 50));
  const before = collectRuntimeSnapshot();
  const beforePosition = readPlayerPosition();
  const beforeFrames = director.getTotalFrames?.() ?? 0;
  const startedAt = Date.now();
  const startSceneName = director.getScene()?.name ?? '';

  let reached = false;
  let iterations = 0;
  while (Date.now() - startedAt < durationMs) {
    const player = resolvePlayerController();
    const current = readPlayerPosition();
    if (!player || !current) {
      if ((director.getScene()?.name ?? '') !== startSceneName) {
        break;
      }
      break;
    }

    const deltaX = targetX - current.x;
    const deltaY = targetY - current.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance <= arrivalThreshold) {
      reached = true;
      break;
    }

    const safeDistance = Math.max(1, distance);
    player.setMoveInput(deltaX / safeDistance, deltaY / safeDistance);
    iterations += 1;
    await delay(sampleMs);
  }

  resolvePlayerController()?.setMoveInput(0, 0);
  await delay(80);

  const after = collectRuntimeSnapshot();
  const afterPosition = readPlayerPosition();
  const afterFrames = director.getTotalFrames?.() ?? beforeFrames;
  const movedDistance = calculateDistance(beforePosition, afterPosition);
  const finalDistance = afterPosition
    ? Math.hypot(targetX - afterPosition.x, targetY - afterPosition.y)
    : null;
  const elapsedMs = Math.max(1, Date.now() - startedAt);
  const framesElapsed = Math.max(0, afterFrames - beforeFrames);
  const averageUnitsPerSecond = Number(((movedDistance / elapsedMs) * 1000).toFixed(2));
  const approxFps = Number(((framesElapsed / elapsedMs) * 1000).toFixed(2));

  return {
    command: 'move-player-to-world',
    target: { x: targetX, y: targetY },
    durationMs,
    arrivalThreshold,
    sampleMs,
    reached,
    movedDistance,
    finalDistance,
    averageUnitsPerSecond,
    approxFps,
    framesElapsed,
    iterations,
    before,
    after,
    beforePosition,
    afterPosition,
    passed: reached,
  };
}

async function moveUntilSceneForQa(command: RuntimeProbeCommand): Promise<Record<string, unknown>> {
  if (!resolvePlayerController()) {
    throw new Error('PlayerController is missing from the runtime graph.');
  }

  const targetScene = String(command.sceneName ?? command.expectedScene ?? '').trim();
  if (!targetScene) {
    throw new Error('move-until-scene requires sceneName or expectedScene.');
  }

  const requestedX = toFiniteNumber(command.x, 1);
  const requestedY = toFiniteNumber(command.y, 0);
  const durationMs = sanitizeDurationMs(command.durationMs, 2_500);
  const sampleMs = Math.max(16, sanitizeDurationMs(command.sampleMs, 50));
  const before = collectRuntimeSnapshot();
  const beforePosition = readPlayerPosition();
  const beforeFrames = director.getTotalFrames?.() ?? 0;
  const startedAt = Date.now();
  const startSceneName = director.getScene()?.name ?? '';

  let loaded = false;
  let iterations = 0;
  while (Date.now() - startedAt < durationMs) {
    const currentSceneName = director.getScene()?.name ?? '';
    if (currentSceneName === targetScene) {
      loaded = true;
      break;
    }

    const player = resolvePlayerController();
    if (player) {
      player.setMoveInput(requestedX, requestedY);
      iterations += 1;
    } else if (currentSceneName !== startSceneName) {
      break;
    }

    await delay(sampleMs);
  }

  resolvePlayerController()?.setMoveInput(0, 0);
  await delay(80);

  const after = collectRuntimeSnapshot();
  const afterPosition = readPlayerPosition();
  const afterFrames = director.getTotalFrames?.() ?? beforeFrames;
  const movedDistance = calculateDistance(beforePosition, afterPosition);
  const elapsedMs = Math.max(1, Date.now() - startedAt);
  const framesElapsed = Math.max(0, afterFrames - beforeFrames);
  const averageUnitsPerSecond = Number(((movedDistance / elapsedMs) * 1000).toFixed(2));
  const approxFps = Number(((framesElapsed / elapsedMs) * 1000).toFixed(2));

  return {
    command: 'move-until-scene',
    targetScene,
    requestedInput: { x: requestedX, y: requestedY },
    durationMs,
    sampleMs,
    loaded,
    movedDistance,
    averageUnitsPerSecond,
    approxFps,
    framesElapsed,
    iterations,
    before,
    after,
    beforePosition,
    afterPosition,
    passed: loaded,
  };
}

async function runDirectCommandForQa(command: RuntimeProbeCommand): Promise<Record<string, unknown>> {
  const manager = readGameManager();
  const player = resolvePlayerController();
  const echoManager = resolveEchoManager();
  const kind = normalizeCommandName(command.kind ?? command.action ?? '');
  const before = collectRuntimeSnapshot();
  const flowBefore = manager?.getFlowState?.() ?? null;
  let executed = false;
  let extra: Record<string, unknown> = {};

  switch (kind) {
    case 'attack':
      executed = player?.attack() ?? false;
      break;
    case 'placeecho':
    case 'place-echo':
      executed = player?.tryPlaceCurrentEcho() ?? false;
      break;
    case 'respawn':
      manager?.resumeGame?.();
      manager?.requestRespawn?.();
      executed = manager?.getFlowState?.() === GameFlowState.Playing;
      break;
    case 'pause':
      manager?.pauseGame?.();
      executed = manager?.getFlowState?.() === GameFlowState.Paused;
      break;
    case 'resume':
      manager?.resumeGame?.();
      executed = manager?.getFlowState?.() === GameFlowState.Playing;
      break;
    case 'togglepause':
    case 'toggle-pause':
      manager?.togglePause?.();
      executed = manager?.getFlowState?.() !== flowBefore;
      break;
    case 'returntocamp':
    case 'return-to-camp':
      manager?.resumeGame?.();
      executed = Boolean(SceneLoader.instance?.switchScene('StartCamp'));
      if (executed) {
        const sceneTimeoutMs = sanitizeDurationMs(command.sceneTimeoutMs, 15_000);
        const loaded = await waitForScene('StartCamp', sceneTimeoutMs);
        executed = loaded;
        extra = {
          targetScene: 'StartCamp',
          loaded,
        };
      }
      break;
    case 'switchscene':
    case 'switch-scene': {
      const sceneName = String(command.sceneName ?? '').trim();
      if (!sceneName) {
        throw new Error('run-command switch-scene requires sceneName.');
      }
      const sceneTimeoutMs = sanitizeDurationMs(command.sceneTimeoutMs, 15_000);
      const accepted = SceneLoader.instance?.switchScene(sceneName) ?? false;
      const loaded = accepted ? await waitForScene(sceneName, sceneTimeoutMs) : false;
      executed = accepted && loaded;
      extra = { targetScene: sceneName, accepted, loaded };
      break;
    }
    case 'selectecho':
    case 'select-echo': {
      const echoId = resolveEchoId(command.echoId);
      if (echoId === null || !echoManager) {
        throw new Error('run-command select-echo requires a valid echoId and EchoManager.');
      }
      echoManager.selectEcho(echoId);
      executed = echoManager.getCurrentEchoId() === echoId;
      extra = { echoId };
      break;
    }
    case 'unlockecho':
    case 'unlock-echo': {
      const echoId = resolveEchoId(command.echoId);
      if (echoId === null || !echoManager) {
        throw new Error('run-command unlock-echo requires a valid echoId and EchoManager.');
      }
      echoManager.unlockEcho(echoId);
      executed = echoManager.getUnlockedEchoes().indexOf(echoId) >= 0;
      extra = { echoId };
      break;
    }
    case 'launch': {
      const x = toFiniteNumber(command.x, 1);
      const y = toFiniteNumber(command.y, 0);
      const distance = toFiniteNumber(command.distance, 180);
      const durationMs = sanitizeDurationMs(command.durationMs, 220);
      executed = player?.launch(new Vec3(x, y, 0), distance, durationMs / 1000) ?? false;
      extra = { distance, durationMs };
      break;
    }
    default:
      throw new Error(`Unsupported run-command kind: ${String(command.kind ?? command.action ?? '')}`);
  }

  await delay(80);
  const after = collectRuntimeSnapshot();

  return {
    command: 'run-command',
    kind,
    executed,
    before,
    after,
    ...extra,
    passed: executed,
  };
}

async function runSequenceForQa(command: RuntimeProbeCommand): Promise<Record<string, unknown>> {
  const steps = Array.isArray(command.steps) ? command.steps : [];
  const before = collectRuntimeSnapshot();
  const results: Array<Record<string, unknown>> = [];

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index] ?? {};
    const action = normalizeCommandName(step.action ?? step.command ?? '');

    if (!action) {
      throw new Error(`Sequence step ${index} is missing action.`);
    }

    if (action === 'delay') {
      const durationMs = sanitizeDurationMs(step.durationMs, 120);
      await delay(durationMs);
      results.push({ index, action, durationMs, passed: true });
      continue;
    }

    if (action === 'snapshot') {
      results.push({ index, action, result: collectRuntimeSnapshot(), passed: true });
      continue;
    }

    if (action === 'tapnode' || action === 'tap-node') {
      const nodeName = String(step.nodeName ?? '').trim();
      if (!nodeName) {
        throw new Error(`Sequence step ${index} tap-node requires nodeName.`);
      }
      await tapNodeForQa(nodeName);
      results.push({
        index,
        action: 'tap-node',
        nodeName,
        snapshot: collectRuntimeSnapshot(),
        passed: true,
      });
      continue;
    }

    if (action === 'switchsceneroute' || action === 'switch-scene-route') {
      const sceneNames = Array.isArray(step.sceneNames)
        ? step.sceneNames.map((sceneName) => String(sceneName).trim()).filter((sceneName) => sceneName.length > 0)
        : [];
      if (sceneNames.length === 0) {
        throw new Error(`Sequence step ${index} switch-scene-route requires sceneNames.`);
      }
      const sceneTimeoutMs = sanitizeDurationMs(step.sceneTimeoutMs, 15_000);
      const route = await switchSceneRouteForQa(sceneNames, sceneTimeoutMs);
      results.push({
        index,
        action: 'switch-scene-route',
        route,
        passed: route.every((entry) => entry.loaded),
      });
      continue;
    }

    if (action === 'setmoveinput' || action === 'set-move-input') {
      results.push({
        index,
        action: 'set-move-input',
        ...(await setMoveInputForQa(step)),
      });
      continue;
    }

    if (action === 'holdjoystick' || action === 'hold-joystick') {
      results.push({
        index,
        action: 'hold-joystick',
        ...(await holdJoystickForQa(step)),
      });
      continue;
    }

    if (action === 'moveplayertoworld' || action === 'move-player-to-world') {
      results.push({
        index,
        action: 'move-player-to-world',
        ...(await movePlayerToWorldForQa(step)),
      });
      continue;
    }

    if (action === 'moveuntilscene' || action === 'move-until-scene') {
      results.push({
        index,
        action: 'move-until-scene',
        ...(await moveUntilSceneForQa(step)),
      });
      continue;
    }

    if (action === 'runcommand' || action === 'run-command' || step.kind) {
      results.push({
        index,
        action: 'run-command',
        ...(await runDirectCommandForQa(step)),
      });
      continue;
    }

    throw new Error(`Unsupported sequence step ${index}: ${String(step.action ?? step.command ?? '')}`);
  }

  const after = collectRuntimeSnapshot();
  return {
    command: 'run-sequence',
    before,
    after,
    stepCount: results.length,
    steps: results,
    passed: results.every((result) => result.passed !== false),
  };
}

function resolvePlayerController(): {
  attack: () => boolean;
  tryPlaceCurrentEcho: () => boolean;
  setMoveInput: (x: number, y: number) => void;
  launch: (direction: Readonly<Vec3>, distance?: number, duration?: number) => boolean;
} | null {
  const player = findNodeByName(getWorldRoot(), 'Player');
  return findComponentByName(player, 'PlayerController') as {
    attack: () => boolean;
    tryPlaceCurrentEcho: () => boolean;
    setMoveInput: (x: number, y: number) => void;
    launch: (direction: Readonly<Vec3>, distance?: number, duration?: number) => boolean;
  } | null;
}

function resolveEchoManager(): {
  getCurrentEchoId: () => EchoId;
  getUnlockedEchoes: () => EchoId[];
  selectEcho: (echoId: EchoId) => void;
  unlockEcho: (echoId: EchoId) => void;
} | null {
  const echoRoot = findNodeByName(getWorldRoot(), 'EchoRoot');
  return findComponentByName(echoRoot, 'EchoManager') as {
    getCurrentEchoId: () => EchoId;
    getUnlockedEchoes: () => EchoId[];
    selectEcho: (echoId: EchoId) => void;
    unlockEcho: (echoId: EchoId) => void;
  } | null;
}

function normalizeCommandName(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function sanitizeDurationMs(value: unknown, fallback: number): number {
  return Math.max(16, Math.round(toFiniteNumber(value, fallback)));
}

function calculateDistance(
  before: { x: number; y: number; z: number } | null,
  after: { x: number; y: number; z: number } | null,
): number {
  if (!before || !after) {
    return 0;
  }

  return Math.hypot(after.x - before.x, after.y - before.y);
}

function resolveEchoId(value: unknown): EchoId | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= EchoId.Box && value <= EchoId.BombBug) {
    return value as EchoId;
  }

  const normalized = normalizeCommandName(value);
  if (!normalized) {
    return null;
  }

  if (normalized === 'box' || normalized === 'echobox' || normalized === 'echo-box') {
    return EchoId.Box;
  }

  if (
    normalized === 'springflower' ||
    normalized === 'spring-flower' ||
    normalized === 'flower' ||
    normalized === 'echoflower' ||
    normalized === 'echo-flower'
  ) {
    return EchoId.SpringFlower;
  }

  if (
    normalized === 'bombbug' ||
    normalized === 'bomb-bug' ||
    normalized === 'bomb' ||
    normalized === 'echobomb' ||
    normalized === 'echo-bomb'
  ) {
    return EchoId.BombBug;
  }

  return null;
}

function evaluateMotionExpectations(
  command: RuntimeProbeCommand,
  metrics: {
    movedDistance: number;
    averageUnitsPerSecond: number;
    approxFps: number;
  },
): { passed: boolean; thresholds: Record<string, number> } {
  const thresholds: Record<string, number> = {
    minMovedDistance: toFiniteNumber(command.minMovedDistance, 12),
  };
  let passed = metrics.movedDistance >= thresholds.minMovedDistance;

  if (command.maxMovedDistance !== undefined) {
    thresholds.maxMovedDistance = toFiniteNumber(command.maxMovedDistance, metrics.movedDistance);
    passed &&= metrics.movedDistance <= thresholds.maxMovedDistance;
  }

  if (command.minAverageUnitsPerSecond !== undefined) {
    thresholds.minAverageUnitsPerSecond = toFiniteNumber(command.minAverageUnitsPerSecond, 0);
    passed &&= metrics.averageUnitsPerSecond >= thresholds.minAverageUnitsPerSecond;
  }

  if (command.maxAverageUnitsPerSecond !== undefined) {
    thresholds.maxAverageUnitsPerSecond = toFiniteNumber(command.maxAverageUnitsPerSecond, metrics.averageUnitsPerSecond);
    passed &&= metrics.averageUnitsPerSecond <= thresholds.maxAverageUnitsPerSecond;
  }

  if (command.minApproxFps !== undefined) {
    thresholds.minApproxFps = toFiniteNumber(command.minApproxFps, 0);
    passed &&= metrics.approxFps >= thresholds.minApproxFps;
  }

  if (command.maxApproxFps !== undefined) {
    thresholds.maxApproxFps = toFiniteNumber(command.maxApproxFps, metrics.approxFps);
    passed &&= metrics.approxFps <= thresholds.maxApproxFps;
  }

  return { passed, thresholds };
}

function collectRuntimeSnapshot(): Record<string, unknown> {
  const scene = director.getScene();
  const canvas = scene?.getChildByName('Canvas') ?? null;
  const worldRoot = canvas?.getChildByName('WorldRoot') ?? null;
  const touchHudRoot = canvas?.getChildByName('TouchHudRoot') ?? null;
  const hudRoot = canvas?.getChildByName('HudRoot') ?? null;
  const player = findNodeByName(worldRoot, 'Player');
  const worldBoundsFrame = findNodeByName(worldRoot, 'WorldBoundsFrame');
  const playerController = findComponentByName(player, 'PlayerController') as {
    isAttacking?: () => boolean;
    getMoveInput?: () => Vec3;
  } | null;
  const health = findComponentByName(player, 'HealthComponent') as {
    getCurrentHealth?: () => number;
    maxHealth?: number;
  } | null;
  const locatorBadge = findNodeByName(player, 'PlayerLocatorBadge');
  const visibilityBadge = findNodeByName(player, 'PlayerVisibilityBadge');
  const systemInfo = getWechatRuntimeApi()?.getSystemInfoSync?.();

  return {
    generatedAt: Date.now(),
    frame: {
      totalFrames: director.getTotalFrames?.() ?? null,
    },
    runtime: {
      platform: systemInfo?.platform ?? null,
      pixelRatio: systemInfo?.pixelRatio ?? null,
      windowHeight: systemInfo?.windowHeight ?? null,
    },
    sceneName: scene?.name ?? '',
    flowState: readGameManager()?.getFlowState?.() ?? null,
    switchState: SceneLoader.instance?.getSwitchState?.() ?? null,
    roots: {
      canvas: summarizeNode(canvas),
      worldRoot: summarizeNode(worldRoot),
      touchHudRoot: summarizeNode(touchHudRoot),
      hudRoot: summarizeNode(hudRoot),
      worldBoundsFrame: {
        ...summarizeNode(worldBoundsFrame),
        bounds: getNodeUiBounds(worldBoundsFrame),
      },
    },
    player: {
      ...summarizeNode(player),
      position: player ? { x: player.position.x, y: player.position.y, z: player.position.z } : null,
      worldPosition: player ? { x: player.worldPosition.x, y: player.worldPosition.y, z: player.worldPosition.z } : null,
      isAttacking: playerController?.isAttacking?.() ?? false,
      moveInput: serializeVec3(playerController?.getMoveInput?.() ?? null),
      health: health
        ? { current: health.getCurrentHealth?.() ?? 0, max: health.maxHealth ?? 0 }
        : null,
      locatorBadge: summarizeNode(locatorBadge),
      visibilityBadge: {
        ...summarizeNode(visibilityBadge),
        position: visibilityBadge
          ? { x: visibilityBadge.position.x, y: visibilityBadge.position.y, z: visibilityBadge.position.z }
          : null,
        bounds: getNodeUiBounds(visibilityBadge),
      },
    },
    echoCount: readEchoCount(),
    touchNodes: {
      joystick: summarizeTouchNode('Joystick'),
      attack: summarizeTouchNode('TouchAttack'),
      placeEcho: summarizeTouchNode('TouchPlaceEcho'),
      pause: summarizeTouchNode('TouchPause'),
      respawn: summarizeTouchNode('TouchRespawn'),
    },
    pauseNodes: {
      panel: summarizeCanvasNode('PausePanel'),
      continue: summarizeCanvasNode('PauseContinue'),
      restart: summarizeCanvasNode('PauseRestart'),
      camp: summarizeCanvasNode('PauseCamp'),
    },
    activeWorldHints: collectActiveHintNodeNames(worldRoot),
    activePlaceholderBindings: collectActivePlaceholderBindings(worldRoot),
    qaTouchLog: readQaTouchLog(),
    runtimeInputEvents: [...runtimeInputEvents],
  };
}

function installRuntimeInputDiagnostics(wxApi: WechatRuntimeApi): void {
  if (inputDiagnosticsInstalled) {
    return;
  }

  inputDiagnosticsInstalled = true;
  wxApi.onTouchStart?.((event) => recordRuntimeInputEvent('wx-touch-start', event));
  wxApi.onTouchMove?.((event) => recordRuntimeInputEvent('wx-touch-move', event));
  wxApi.onTouchEnd?.((event) => recordRuntimeInputEvent('wx-touch-end', event));
  wxApi.onTouchCancel?.((event) => recordRuntimeInputEvent('wx-touch-cancel', event));
  wxApi.onMouseDown?.((event) => recordRuntimeMouseInputEvent('wx-mouse-down', event));
  wxApi.onMouseMove?.((event) => recordRuntimeMouseInputEvent('wx-mouse-move', event));
  wxApi.onMouseUp?.((event) => recordRuntimeMouseInputEvent('wx-mouse-up', event));
  input.on(Input.EventType.TOUCH_START, (event: EventTouch) => recordCocosTouchInputEvent('cocos-touch-start', event));
  input.on(Input.EventType.TOUCH_MOVE, (event: EventTouch) => recordCocosTouchInputEvent('cocos-touch-move', event));
  input.on(Input.EventType.TOUCH_END, (event: EventTouch) => recordCocosTouchInputEvent('cocos-touch-end', event));
  input.on(Input.EventType.TOUCH_CANCEL, (event: EventTouch) => recordCocosTouchInputEvent('cocos-touch-cancel', event));
  input.on(Input.EventType.MOUSE_DOWN, (event: EventMouse) => recordCocosMouseInputEvent('cocos-mouse-down', event));
  input.on(Input.EventType.MOUSE_MOVE, (event: EventMouse) => recordCocosMouseInputEvent('cocos-mouse-move', event));
  input.on(Input.EventType.MOUSE_UP, (event: EventMouse) => recordCocosMouseInputEvent('cocos-mouse-up', event));
}

function recordRuntimeInputEvent(type: string, event: NativeTouchEventLike): void {
  pushRuntimeInputEvent({
    type,
    touches: getNativeChangedTouches(event).map((touch, index) => ({
      id: getNativeTouchId(touch, index),
      clientX: touch.clientX ?? null,
      clientY: touch.clientY ?? null,
      pageX: touch.pageX ?? null,
      pageY: touch.pageY ?? null,
      ui: serializeVec2(getNativeTouchUILocationForProbe(touch)),
    })),
  });
}

function recordCocosTouchInputEvent(type: string, event: EventTouch): void {
  const location = event.getUILocation();
  pushRuntimeInputEvent({
    type,
    id: event.getID(),
    ui: { x: location.x, y: location.y },
  });
}

function recordRuntimeMouseInputEvent(type: string, event: NativeMouseEventLike): void {
  const location = getNativeMouseUILocation(event, getWechatRuntimeApi());
  pushRuntimeInputEvent({
    type,
    button: event.button ?? null,
    clientX: event.clientX ?? event.x ?? null,
    clientY: event.clientY ?? event.y ?? null,
    pageX: event.pageX ?? null,
    pageY: event.pageY ?? null,
    ui: serializeVec2(location),
  });
}

function recordCocosMouseInputEvent(type: string, event: EventMouse): void {
  const location = event.getUILocation();
  pushRuntimeInputEvent({
    type,
    ui: { x: location.x, y: location.y },
  });
}

function pushRuntimeInputEvent(entry: Record<string, unknown>): void {
  runtimeInputEvents.push({
    at: Date.now(),
    ...entry,
  });
  if (runtimeInputEvents.length > 60) {
    runtimeInputEvents.splice(0, runtimeInputEvents.length - 60);
  }
}

function getNativeTouchUILocationForProbe(touch: NativeTouchLike): Vec2 {
  const wxApi = getWechatRuntimeApi();
  const systemInfo = wxApi?.getSystemInfoSync?.();
  const devicePixelRatio = systemInfo?.pixelRatio ?? view.getDevicePixelRatio?.() ?? 1;
  const frameSize = view.getFrameSize();
  const windowHeightCss = systemInfo?.windowHeight ?? frameSize.height;
  const rawX = (touch.clientX ?? touch.pageX ?? 0) * devicePixelRatio;
  const rawY = windowHeightCss * devicePixelRatio - (touch.clientY ?? touch.pageY ?? 0) * devicePixelRatio;
  const viewport = view.getViewportRect();

  return new Vec2(
    (rawX - viewport.x) / view.getScaleX(),
    (rawY - viewport.y) / view.getScaleY(),
  );
}

function serializeVec2(value: Vec2): Record<string, number> {
  return { x: value.x, y: value.y };
}

function summarizeNode(node: Node | null): Record<string, unknown> {
  return {
    exists: Boolean(node),
    active: node?.active ?? false,
    activeInHierarchy: node?.activeInHierarchy ?? false,
    childCount: node?.children?.length ?? 0,
    siblingIndex: node?.isValid ? node.getSiblingIndex() : -1,
  };
}

function summarizeTouchNode(name: string): Record<string, unknown> {
  const touchHudRoot = getTouchHudRoot();
  const node = findNodeByName(touchHudRoot, name);
  const bounds = getNodeUiBounds(node);
  return {
    ...summarizeNode(node),
    position: node ? { x: node.position.x, y: node.position.y, z: node.position.z } : null,
    bounds,
  };
}

function summarizeCanvasNode(name: string): Record<string, unknown> {
  const canvas = director.getScene()?.getChildByName('Canvas') ?? null;
  const node = findNodeByName(canvas, name);
  const bounds = getNodeUiBounds(node);
  return {
    ...summarizeNode(node),
    position: node ? { x: node.position.x, y: node.position.y, z: node.position.z } : null,
    bounds,
  };
}

function collectActiveHintNodeNames(root: Node | null): string[] {
  if (!root) {
    return [];
  }

  const names: string[] = [];
  const visit = (node: Node): void => {
    if (!node?.isValid || !node.activeInHierarchy) {
      return;
    }

    if (/Hint/i.test(node.name)) {
      names.push(node.name);
    }

    for (const child of node.children) {
      visit(child);
    }
  };

  visit(root);
  return names;
}

function collectActivePlaceholderBindings(root: Node | null): Array<Record<string, unknown>> {
  if (!root) {
    return [];
  }

  const entries: Array<Record<string, unknown>> = [];
  const visit = (node: Node): void => {
    if (!node?.isValid || !node.activeInHierarchy) {
      return;
    }

    const binding = findComponentByName(node, 'AssetBindingTag') as {
      bindingKey?: string;
      bindingStatus?: string;
      selectedPath?: string;
    } | null;
    if (binding) {
      const bindingStatus = String(binding.bindingStatus ?? '').trim();
      if (bindingStatus.length > 0) {
        entries.push({
          nodeName: node.name,
          bindingKey: binding.bindingKey ?? '',
          bindingStatus,
          selectedPath: binding.selectedPath ?? '',
          bounds: getNodeUiBounds(node),
        });
      }
    }

    for (const child of node.children) {
      visit(child);
    }
  };

  visit(root);
  return entries;
}

function serializeVec3(value: Vec3 | null): Record<string, number> | null {
  return value ? { x: value.x, y: value.y, z: value.z } : null;
}

function getTouchHudRoot(): Node | null {
  return director.getScene()?.getChildByName('Canvas')?.getChildByName('TouchHudRoot') ?? null;
}

function getWorldRoot(): Node | null {
  return director.getScene()?.getChildByName('Canvas')?.getChildByName('WorldRoot') ?? null;
}

function readGameManager(): {
  getFlowState?: () => string;
  isPaused?: () => boolean;
  pauseGame?: () => void;
  resumeGame?: () => void;
  togglePause?: () => string;
  requestRespawn?: () => void;
} | null {
  const scene = director.getScene();
  return findComponentByNameDeep(scene, 'GameManager') as {
    getFlowState?: () => string;
    isPaused?: () => boolean;
    pauseGame?: () => void;
    resumeGame?: () => void;
    togglePause?: () => string;
    requestRespawn?: () => void;
  } | null;
}

function findNodeByName(root: Node | null, name: string): Node | null {
  if (!root) {
    return null;
  }
  if (root.name === name) {
    return root;
  }
  for (const child of root.children) {
    const matched = findNodeByName(child, name);
    if (matched) {
      return matched;
    }
  }
  return null;
}

function findComponentByName(node: Node | null, componentName: string): unknown | null {
  if (!node) {
    return null;
  }

  const stringLookup = (node as unknown as { getComponent?: (name: string) => unknown | null }).getComponent?.(componentName);
  if (stringLookup) {
    return stringLookup;
  }

  return node.components.find((component) => {
    const constructorLike = component?.constructor as { name?: string; __classname__?: string } | undefined;
    const className = constructorLike?.__classname__ ?? constructorLike?.name ?? '';
    return className === componentName || className.endsWith(`.${componentName}`);
  }) ?? null;
}

function findComponentByNameDeep(node: Node | null, componentName: string): unknown | null {
  const direct = findComponentByName(node, componentName);
  if (direct) {
    return direct;
  }
  if (!node) {
    return null;
  }
  for (const child of node.children) {
    const matched = findComponentByNameDeep(child, componentName);
    if (matched) {
      return matched;
    }
  }
  return null;
}

function getNodeUiBounds(node: Node | null): { centerX: number; centerY: number; width: number; height: number } | null {
  const transform = node?.getComponent(UITransform);
  if (!node || !transform || !node.activeInHierarchy) {
    return null;
  }

  const bounds = transform.getBoundingBoxToWorld();
  return {
    centerX: bounds.x + bounds.width / 2,
    centerY: bounds.y + bounds.height / 2,
    width: bounds.width,
    height: bounds.height,
  };
}

async function tapNodeForQa(nodeName: string): Promise<void> {
  const canvas = director.getScene()?.getChildByName('Canvas') ?? null;
  const node = findNodeByName(canvas, nodeName);
  const bounds = getNodeUiBounds(node);
  if (!bounds) {
    throw new Error(`Runtime node ${nodeName} is not hittable.`);
  }

  const point = new Vec2(bounds.centerX, bounds.centerY);
  const identifier = nextQaTouchIdentifier();
  dispatchQaNativeTouch('start', point, identifier);
  await delay(20);
  dispatchQaNativeTouch('end', point, identifier);
  await delay(20);
}

async function dragJoystickForQa(
  localX: number,
  localY: number,
  holdMs: number,
): Promise<{ holdStartedAt: number; holdFinishedAt: number; holdFinishedFrames: number }> {
  const joystick = findNodeByName(getTouchHudRoot(), 'Joystick');
  const bounds = getNodeUiBounds(joystick);
  if (!bounds) {
    throw new Error('Joystick is not hittable.');
  }

  const start = new Vec2(bounds.centerX, bounds.centerY);
  const end = new Vec2(bounds.centerX + localX, bounds.centerY + localY);
  const identifier = nextQaTouchIdentifier();
  dispatchQaNativeTouch('start', start, identifier);
  await delay(20);
  dispatchQaNativeTouch('move', end, identifier);
  const holdStartedAt = Date.now();
  await delay(holdMs);
  const holdFinishedAt = Date.now();
  const holdFinishedFrames = director.getTotalFrames?.() ?? 0;
  dispatchQaNativeTouch('end', end, identifier);
  await delay(50);
  return { holdStartedAt, holdFinishedAt, holdFinishedFrames };
}

function nextQaTouchIdentifier(): number {
  qaTouchIdentifier += 1;
  if (qaTouchIdentifier > 10_000) {
    qaTouchIdentifier = 901;
  }
  return qaTouchIdentifier;
}

function dispatchQaNativeTouch(type: NativeTouchEventType, uiPoint: Vec2, identifier: number): void {
  const touch = uiPointToNativeTouch(uiPoint, identifier);
  const activeTouches = type === 'end' || type === 'cancel' ? [] : [touch];
  dispatchNativeTouchForQa(type, {
    changedTouches: [touch],
    touches: activeTouches,
  });
}

function uiPointToNativeTouch(uiPoint: Vec2, identifier: number): NativeTouchLike {
  const wxApi = getWechatRuntimeApi();
  const systemInfo = wxApi?.getSystemInfoSync?.();
  const devicePixelRatio = systemInfo?.pixelRatio ?? view.getDevicePixelRatio?.() ?? 1;
  const frameSize = view.getFrameSize();
  const windowHeightCss = systemInfo?.windowHeight ?? frameSize.height;
  const viewport = view.getViewportRect();
  const rawX = uiPoint.x * view.getScaleX() + viewport.x;
  const rawY = uiPoint.y * view.getScaleY() + viewport.y;

  return {
    identifier,
    clientX: rawX / devicePixelRatio,
    clientY: windowHeightCss - rawY / devicePixelRatio,
  };
}

function readPlayerPosition(): { x: number; y: number; z: number } | null {
  const player = findNodeByName(getWorldRoot(), 'Player');
  return player ? { x: player.position.x, y: player.position.y, z: player.position.z } : null;
}

function readEchoCount(): number {
  const echoRoot = findNodeByName(getWorldRoot(), 'EchoRoot');
  return echoRoot?.children?.length ?? 0;
}

async function switchSceneRouteForQa(
  sceneNames: string[],
  timeoutMs = 15_000,
): Promise<Array<{ sceneName: string; loaded: boolean; switchState: unknown }>> {
  const route: Array<{ sceneName: string; loaded: boolean; switchState: unknown }> = [];
  for (const sceneName of sceneNames) {
    const accepted = SceneLoader.instance?.switchScene(sceneName) ?? false;
    if (!accepted) {
      route.push({ sceneName, loaded: false, switchState: SceneLoader.instance?.getSwitchState?.() ?? null });
      continue;
    }
    const loaded = await waitForScene(sceneName, timeoutMs);
    route.push({ sceneName, loaded, switchState: SceneLoader.instance?.getSwitchState?.() ?? null });
  }
  return route;
}

async function waitForScene(sceneName: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (director.getScene()?.name === sceneName) {
      await delay(120);
      return true;
    }
    await delay(120);
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resetQaTouchLog(): void {
  (globalThis as unknown as { __wisdomQaTouchLog?: Array<Record<string, unknown>> }).__wisdomQaTouchLog = [];
}

function readQaTouchLog(): Array<Record<string, unknown>> {
  return [
    ...((globalThis as unknown as { __wisdomQaTouchLog?: Array<Record<string, unknown>> }).__wisdomQaTouchLog ?? []),
  ];
}

function sendProbeMessage(payload: Record<string, unknown>): void {
  if (!socketTask || !socketOpen) {
    return;
  }

  try {
    socketTask.send?.({
      data: JSON.stringify(payload),
      fail: () => {
        socketOpen = false;
      },
    });
    const messageType = typeof payload.type === 'string' ? payload.type : '';
    if (messageType === 'command-result' || messageType === 'command-error') {
      retireProbeConnection();
    }
  } catch {
    // Runtime probe is diagnostic-only; gameplay should not depend on it.
    socketOpen = false;
  }
}
