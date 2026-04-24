import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {
  assertWechatBuildFreshness,
  assertWechatGameProjectConfig,
  resolveLastWechatBuildOutputDir,
} from './wechat-build-utils.mjs';

const projectRoot = process.cwd();
const sourceDirOverride = String(process.env.WECHAT_RUNTIME_PROBE_SOURCE_DIR ?? '').trim();
const sourceDir = path.resolve(
  sourceDirOverride || await resolveLastWechatBuildOutputDir(projectRoot),
);
const port = Number(process.env.WECHAT_RUNTIME_PROBE_PORT || 37991);
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 17);
const uniqueRunId = `${stamp}-${process.pid}`;
const harnessRoot = path.join(os.tmpdir(), 'wisdom-wechat-harnesses');
const manifestPath = path.join(projectRoot, 'temp', 'wechat-runtime-probe-harness.json');
const lastGoodPath = path.join(projectRoot, 'temp', 'wechat-runtime-probe-last-good.json');
const useInPlaceProject = process.env.WECHAT_RUNTIME_PROBE_IN_PLACE === '1';
const inPlaceProjectName = String(process.env.WECHAT_RUNTIME_PROBE_IN_PLACE_PROJECT_NAME ?? '').trim();
const requestedHarnessDir = String(process.env.WECHAT_RUNTIME_PROBE_HARNESS_DIR ?? '').trim();
const reuseLastGoodHarnessPath = process.env.WECHAT_RUNTIME_PROBE_REUSE_LAST_GOOD === '1';
const probeBootstrapStart = '// __codexRuntimeProbeBootstrapStart';
const probeBootstrapEnd = '// __codexRuntimeProbeBootstrapEnd';

function readLastGoodHarness() {
  try {
    const parsed = JSON.parse(fs.readFileSync(lastGoodPath, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function assertSafeHarnessDir(candidate) {
  const resolved = path.resolve(candidate);
  const resolvedSource = path.resolve(sourceDir);
  const allowedRoots = [
    path.resolve(harnessRoot),
    path.resolve(projectRoot, 'build'),
  ];
  const isAllowed = allowedRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));

  if (!isAllowed) {
    throw new Error(`Unsafe WeChat runtime harness directory: ${resolved}`);
  }
  if (resolved === resolvedSource || resolvedSource.startsWith(`${resolved}${path.sep}`)) {
    throw new Error(`Harness directory must not overlap source build output: ${resolved}`);
  }
}

if (!fs.existsSync(sourceDir)) {
  throw new Error(`WeChat build output not found: ${sourceDir}`);
}

if (process.env.WECHAT_RUNTIME_PROBE_SKIP_FRESHNESS !== '1') {
  await assertWechatBuildFreshness(projectRoot);
}

const lastGoodHarness = readLastGoodHarness();
const preferredHarnessDir = reuseLastGoodHarnessPath
  && typeof lastGoodHarness?.projectPath === 'string'
  && lastGoodHarness.projectPath.trim().length > 0
  ? lastGoodHarness.projectPath.trim()
  : null;
const harnessProjectName = reuseLastGoodHarnessPath
  && typeof lastGoodHarness?.projectName === 'string'
  && lastGoodHarness.projectName.trim().length > 0
  ? lastGoodHarness.projectName.trim()
  : `wisdom-qa-${stamp}`;
const harnessDir = path.resolve(
  requestedHarnessDir || (preferredHarnessDir && !useInPlaceProject
    ? preferredHarnessDir
    : path.join(harnessRoot, `wechatgame-runtime-probe-${uniqueRunId}`)),
);

assertSafeHarnessDir(harnessDir);
fs.mkdirSync(harnessRoot, { recursive: true });
let harnessContentMode = useInPlaceProject ? 'in-place' : 'fresh-copy';
const harnessPathStrategy = useInPlaceProject
  ? 'in-place'
  : (requestedHarnessDir
    ? 'explicit-dir'
    : (preferredHarnessDir ? 'last-good-dir' : 'fresh-temp-dir'));
if (!useInPlaceProject) {
  fs.rmSync(harnessDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, harnessDir, { recursive: true });
}

const targetProjectDir = useInPlaceProject ? sourceDir : harnessDir;
const projectConfigPath = path.join(targetProjectDir, 'project.config.json');
const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
assertWechatGameProjectConfig(projectConfig, projectConfigPath);
projectConfig.setting ??= {};
projectConfig.setting.urlCheck = false;
if (!useInPlaceProject) {
  projectConfig.projectname = harnessProjectName;
} else if (inPlaceProjectName.length > 0) {
  projectConfig.projectname = inPlaceProjectName;
}
fs.writeFileSync(projectConfigPath, `${JSON.stringify(projectConfig, null, 2)}\n`, 'utf8');

const effectiveProjectName = projectConfig.projectname?.trim() || (useInPlaceProject ? 'wisdom' : harnessProjectName);
const gameJsPath = path.join(targetProjectDir, 'game.js');
const gameJs = fs.readFileSync(gameJsPath, 'utf8');
const escapedProjectName = JSON.stringify(effectiveProjectName);
const probeBootstrap =
  `${probeBootstrapStart}\n`
  + `try { globalThis.__codexQaProbeUrl = 'ws://127.0.0.1:${port}'; `
  + `globalThis.__codexQaHarnessProjectName = ${escapedProjectName}; } catch (error) {}\n`
  + `${probeBootstrapEnd}\n`;
const existingBootstrapPattern = new RegExp(
  `${probeBootstrapStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?`
  + `${probeBootstrapEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`,
  'm',
);
const normalizedGameJs = existingBootstrapPattern.test(gameJs)
  ? gameJs.replace(existingBootstrapPattern, probeBootstrap)
  : `${probeBootstrap}${gameJs}`;
fs.writeFileSync(gameJsPath, normalizedGameJs, 'utf8');

const manifest = {
  generatedAt: new Date().toISOString(),
  mode: useInPlaceProject ? 'in-place' : 'copied-harness',
  contentMode: harnessContentMode,
  pathStrategy: harnessPathStrategy,
  sourceDir,
  harnessDir: targetProjectDir,
  projectName: effectiveProjectName,
  port,
  urlCheck: projectConfig.setting.urlCheck,
};
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`[wechat-runtime-harness] source=${sourceDir}`);
console.log(`[wechat-runtime-harness] harness=${harnessDir}`);
console.log(`[wechat-runtime-harness] probe=ws://127.0.0.1:${port}`);
console.log(`[wechat-runtime-harness] manifest=${manifestPath}`);
