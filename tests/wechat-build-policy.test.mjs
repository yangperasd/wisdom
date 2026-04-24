import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  classifyCreatorExitCode,
  creatorExitCodePolicy,
  resolveExistingWechatBuildOutputDir,
  resolveLastWechatBuildOutputDir,
  resolveWechatBuildStatusPath,
} from '../tools/wechat-build-utils.mjs';
import {
  cleanupRuntimeProbeBootstrapInBuildOutputs,
  runtimeProbeBootstrapEnd,
  runtimeProbeBootstrapStart,
} from '../tools/wechat-runtime-probe-bootstrap-utils.mjs';

const projectRoot = process.cwd();
const runWechatBuildScript = fs.readFileSync(path.join(projectRoot, 'tools', 'run-wechat-build.mjs'), 'utf8');
const runWechatRuntimePlaythroughScript = fs.readFileSync(path.join(projectRoot, 'tools', 'run-wechat-runtime-playthrough.mjs'), 'utf8');
const runWechatRuntimeProbeScript = fs.readFileSync(path.join(projectRoot, 'tools', 'run-wechat-runtime-probe.mjs'), 'utf8');
const wechatRuntimeProbeScript = fs.readFileSync(path.join(projectRoot, 'assets', 'scripts', 'qa', 'WechatDevtoolsRuntimeProbe.ts'), 'utf8');
const openWechatDevtoolsScript = fs.readFileSync(path.join(projectRoot, 'tools', 'open-wechat-devtools.mjs'), 'utf8');
const rebuildWechatDevtoolsScript = fs.readFileSync(path.join(projectRoot, 'tools', 'rebuild-wechat-devtools.mjs'), 'utf8');
const spriteVisualSkinScript = fs.readFileSync(path.join(projectRoot, 'assets', 'scripts', 'visual', 'SpriteVisualSkin.ts'), 'utf8');
const checkpointMarkerScript = fs.readFileSync(path.join(projectRoot, 'assets', 'scripts', 'core', 'CheckpointMarker.ts'), 'utf8');
const scenePortalScript = fs.readFileSync(path.join(projectRoot, 'assets', 'scripts', 'core', 'ScenePortal.ts'), 'utf8');
const collectiblePresentationScript = fs.readFileSync(path.join(projectRoot, 'assets', 'scripts', 'visual', 'CollectiblePresentation.ts'), 'utf8');
const simpleProjectileScript = fs.readFileSync(path.join(projectRoot, 'assets', 'scripts', 'puzzle', 'SimpleProjectile.ts'), 'utf8');
const generateWeek2ScenesScript = fs.readFileSync(path.join(projectRoot, 'tools', 'generate-week2-scenes.mjs'), 'utf8');
const generateMechanicsLabScript = fs.readFileSync(path.join(projectRoot, 'tools', 'generate-mechanics-lab.mjs'), 'utf8');

test('creator exit code policy classifies clean, tolerated, and failed states', () => {
  assert.equal(classifyCreatorExitCode(0).status, 'clean');
  assert.equal(classifyCreatorExitCode(36).status, 'tolerated');
  assert.equal(classifyCreatorExitCode(36).toleratedReason, creatorExitCodePolicy[36].reason);
  assert.equal(classifyCreatorExitCode(1).status, 'failed');
  assert.equal(classifyCreatorExitCode(null).status, 'failed');
});

test('wechat build status file uses a stable temp path', () => {
  assert.equal(
    resolveWechatBuildStatusPath(projectRoot),
    path.join(projectRoot, 'temp', 'wechat-build-status.json'),
  );
});

test('last WeChat build output prefers a completed build status over stale directory guesses', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wisdom-wechat-status-'));

  try {
    const defaultOutputDir = path.join(tempRoot, 'build', 'wechatgame');
    const stagingOutputDir = path.join(tempRoot, 'build', 'wechatgame-staging');
    fs.mkdirSync(defaultOutputDir, { recursive: true });
    fs.mkdirSync(stagingOutputDir, { recursive: true });
    fs.mkdirSync(path.join(tempRoot, 'temp'), { recursive: true });
    fs.writeFileSync(
      path.join(tempRoot, 'temp', 'wechatgame.build-config.json'),
      `${JSON.stringify({ outputName: 'wechatgame' }, null, 2)}\n`,
    );
    fs.writeFileSync(
      resolveWechatBuildStatusPath(tempRoot),
      `${JSON.stringify({ status: 'tolerated', outputDir: stagingOutputDir }, null, 2)}\n`,
    );

    assert.equal(await resolveLastWechatBuildOutputDir(tempRoot), stagingOutputDir);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('existing WeChat build output falls back to the newest real package when the preferred staging dir is absent', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wisdom-wechat-output-'));

  try {
    const preferredOutputDir = path.join(tempRoot, 'build', 'wechatgame-staging');
    const actualOutputDir = path.join(tempRoot, 'build', 'wechatgame');
    fs.mkdirSync(path.join(actualOutputDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempRoot, 'temp'), { recursive: true });
    fs.writeFileSync(path.join(actualOutputDir, 'game.json'), '{}\n');
    fs.writeFileSync(path.join(actualOutputDir, 'project.config.json'), '{}\n');
    fs.writeFileSync(
      path.join(tempRoot, 'temp', 'wechatgame.build-config.json'),
      `${JSON.stringify({ outputName: 'wechatgame-staging' }, null, 2)}\n`,
    );

    assert.equal(
      await resolveExistingWechatBuildOutputDir(preferredOutputDir, { rootDir: tempRoot }),
      actualOutputDir,
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('run-wechat-build relies on policy helpers instead of a silent exit-code set', () => {
  assert.doesNotMatch(runWechatBuildScript, /new Set\(\[0,36\]\)/);
  assert.match(runWechatBuildScript, /classifyCreatorExitCode\(/);
  assert.match(runWechatBuildScript, /resolveWechatBuildStatusPath\(/);
  assert.match(runWechatBuildScript, /persistBuildStatus\(/);
});

test('runtime playthrough defaults follow the non-reopen WeChat workflow', () => {
  assert.match(runWechatRuntimePlaythroughScript, /WECHAT_RUNTIME_PROBE_PREPARE_FORCE_CLOSE !== '1'/);
  assert.match(runWechatRuntimePlaythroughScript, /WECHAT_RUNTIME_PROBE_IN_PLACE: process\.env\.WECHAT_RUNTIME_PROBE_IN_PLACE \?\? '1'/);
  assert.match(runWechatRuntimePlaythroughScript, /WECHAT_RUNTIME_PROBE_FORCE_REOPEN: process\.env\.WECHAT_RUNTIME_PROBE_FORCE_REOPEN \?\? '1'/);
  assert.match(runWechatRuntimePlaythroughScript, /WECHAT_RUNTIME_PROBE_SOFT_CLOSE: process\.env\.WECHAT_RUNTIME_PROBE_SOFT_CLOSE \?\? '1'/);
  assert.match(runWechatRuntimePlaythroughScript, /bootstrapCleanup = cleanupRuntimeProbeBootstrap\(harnessManifest\.harnessDir\)/);
  assert.match(runWechatRuntimePlaythroughScript, /staleBootstrapCleanup = cleanupRuntimeProbeBootstrapInBuildOutputs\(projectRoot\)/);
  assert.match(runWechatRuntimeProbeScript, /WECHAT_RUNTIME_PROBE_ALLOW_MODAL_DISMISS === '1'/);
  assert.doesNotMatch(runWechatRuntimeProbeScript, /WECHAT_RUNTIME_PROBE_SKIP_MODAL_DISMISS !== '1'/);
  assert.doesNotMatch(runWechatRuntimePlaythroughScript, /x:\s*392,\s*y:\s*-20/);
});

test('WeChat DevTools CLI launch helpers shell out through PowerShell with an env-based cli path', () => {
  assert.match(openWechatDevtoolsScript, /runProcess\('powershell\.exe'/);
  assert.match(openWechatDevtoolsScript, /WECHAT_DEVTOOLS_CLI/);
  assert.match(openWechatDevtoolsScript, /cleanupRuntimeProbeBootstrapInBuildOutputs\(projectRoot\)/);
  assert.doesNotMatch(openWechatDevtoolsScript, /process\.env\.ComSpec/);
  assert.match(rebuildWechatDevtoolsScript, /runProcess\('powershell\.exe'/);
  assert.match(rebuildWechatDevtoolsScript, /WECHAT_DEVTOOLS_CLI/);
  assert.doesNotMatch(rebuildWechatDevtoolsScript, /process\.env\.ComSpec/);
});

test('runtime probe retires its websocket after sending a command result or error', () => {
  assert.match(wechatRuntimeProbeScript, /const PROBE_RETIRE_DELAY_MS = 250;/);
  assert.match(wechatRuntimeProbeScript, /const PROBE_MAX_CONNECT_ATTEMPTS = 4;/);
  assert.match(wechatRuntimeProbeScript, /const PROBE_MAX_CONNECT_WINDOW_MS = 12_000;/);
  assert.match(wechatRuntimeProbeScript, /function retireProbeConnection\(delayMs = PROBE_RETIRE_DELAY_MS\): void/);
  assert.match(wechatRuntimeProbeScript, /function scheduleReconnectOrRetire\(delayMs: number\): void/);
  assert.match(wechatRuntimeProbeScript, /messageType === 'command-result' \|\| messageType === 'command-error'/);
  assert.match(wechatRuntimeProbeScript, /activeProbeUrl = null;/);
  assert.match(wechatRuntimeProbeScript, /__codexQaProbeUrl = ''/);
  assert.match(wechatRuntimeProbeScript, /retireProbeConnection\(0\);/);
});

test('sprite visual skin guards optional component classes before getComponent or addComponent', () => {
  assert.match(spriteVisualSkinScript, /function getComponentSafely</);
  assert.match(spriteVisualSkinScript, /function getOrAddComponentSafely</);
  assert.match(spriteVisualSkinScript, /const mask = getOrAddComponentSafely\(maskNode, Mask\);/);
  assert.match(spriteVisualSkinScript, /const sprite = getOrAddComponentSafely\(artNode, Sprite\);/);
  assert.match(spriteVisualSkinScript, /const rectVisual = getComponentSafely\(visualNode, RectVisual\);/);
  assert.match(spriteVisualSkinScript, /const directLabel = getComponentSafely\(rootNode, Label\);/);
});

test('object placeholder visuals accept texture-backed candidate previews and non-stretch fit rules', () => {
  assert.match(checkpointMarkerScript, /@property\(Texture2D\)/);
  assert.match(checkpointMarkerScript, /resolveTextureBackedSpriteFrame/);
  assert.match(checkpointMarkerScript, /fitMode: PlaceholderSpriteFitMode\.Cover/);
  assert.match(scenePortalScript, /visualTexture: Texture2D \| null = null/);
  assert.match(scenePortalScript, /verticalAnchor: PlaceholderSpriteVerticalAnchor\.Bottom/);
  assert.match(collectiblePresentationScript, /visualTexture: Texture2D \| null = null/);
  assert.match(collectiblePresentationScript, /fitMode: PlaceholderSpriteFitMode\.Cover/);
  assert.match(simpleProjectileScript, /visualTexture: Texture2D \| null = null/);
  assert.match(simpleProjectileScript, /fitMode: PlaceholderSpriteFitMode\.Contain/);
  assert.match(generateWeek2ScenesScript, /visualTexture: checkpointImageBinding\?\.texture \?\? null/);
  assert.match(generateWeek2ScenesScript, /visualTexture: portalImageBinding\?\.texture \?\? null/);
  assert.match(generateWeek2ScenesScript, /visualTexture: imageBinding\?\.texture \?\? null/);
  assert.match(generateMechanicsLabScript, /visualTexture: projectileImageBinding\?\.propertyName === 'texture'/);
});

test('prepare-wechat-runtime-probe-harness uses a fresh temp harness path by default', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wisdom-wechat-harness-root-'));
  const sourceDir = path.join(tempRoot, 'build', 'wechatgame');
  const staleHarnessDir = path.join(
    os.tmpdir(),
    'wisdom-wechat-harnesses',
    `wechatgame-runtime-probe-stale-${Date.now()}-${process.pid}`,
  );
  const scriptPath = path.join(projectRoot, 'tools', 'prepare-wechat-runtime-probe-harness.mjs');

  try {
    fs.mkdirSync(path.join(tempRoot, 'temp'), { recursive: true });
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(staleHarnessDir, { recursive: true });
    fs.writeFileSync(
      path.join(sourceDir, 'project.config.json'),
      `${JSON.stringify({
        compileType: 'game',
        appid: 'wx-test-appid',
        projectname: 'wisdom-source-build',
        miniprogramRoot: './',
        setting: {},
      }, null, 2)}\n`,
    );
    fs.writeFileSync(path.join(sourceDir, 'game.js'), 'console.log("runtime harness source");\n');
    fs.writeFileSync(path.join(staleHarnessDir, 'stale.txt'), 'stale harness marker\n');
    fs.writeFileSync(
      path.join(tempRoot, 'temp', 'wechat-runtime-probe-last-good.json'),
      `${JSON.stringify({
        updatedAt: new Date().toISOString(),
        projectPath: staleHarnessDir,
        projectName: 'wisdom-qa-last-good',
      }, null, 2)}\n`,
    );

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: tempRoot,
      env: {
        ...process.env,
        WECHAT_RUNTIME_PROBE_SKIP_FRESHNESS: '1',
        WECHAT_RUNTIME_PROBE_SOURCE_DIR: sourceDir,
      },
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const manifestPath = path.join(tempRoot, 'temp', 'wechat-runtime-probe-harness.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.contentMode, 'fresh-copy');
    assert.equal(manifest.pathStrategy, 'fresh-temp-dir');
    assert.notEqual(path.resolve(manifest.harnessDir), path.resolve(staleHarnessDir));
    assert.match(manifest.projectName, /^wisdom-qa-\d{17}$/);
    assert.notEqual(manifest.projectName, 'wisdom-qa-last-good');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.rmSync(staleHarnessDir, { recursive: true, force: true });
  }
});

test('cleanupRuntimeProbeBootstrapInBuildOutputs strips stale bootstrap from legacy build directories', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wisdom-wechat-bootstrap-cleanup-'));

  try {
    const staleDir = path.join(tempRoot, 'build', 'wechatgame-staging');
    const cleanDir = path.join(tempRoot, 'build', 'wechatgame-staging-20260424122909');
    fs.mkdirSync(staleDir, { recursive: true });
    fs.mkdirSync(cleanDir, { recursive: true });
    fs.writeFileSync(
      path.join(staleDir, 'game.js'),
      `${runtimeProbeBootstrapStart}\n`
      + `try { globalThis.__codexQaProbeUrl = 'ws://127.0.0.1:37991'; } catch (error) {}\n`
      + `${runtimeProbeBootstrapEnd}\n`
      + 'console.log("stale");\n',
    );
    fs.writeFileSync(path.join(cleanDir, 'game.js'), 'console.log("clean");\n');

    const cleanup = cleanupRuntimeProbeBootstrapInBuildOutputs(tempRoot);

    assert.equal(cleanup.cleanedCount, 1);
    assert.deepEqual(cleanup.cleanedProjectDirs, [staleDir]);
    assert.doesNotMatch(fs.readFileSync(path.join(staleDir, 'game.js'), 'utf8'), /__codexQaProbeUrl/);
    assert.match(fs.readFileSync(path.join(cleanDir, 'game.js'), 'utf8'), /console\.log\("clean"\);/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
