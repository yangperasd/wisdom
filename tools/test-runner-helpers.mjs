import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const projectRoot = process.cwd();

function isTruthy(value) {
  if (!value) {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function shouldRequirePreviewSmoke() {
  return isTruthy(process.env.REQUIRE_PREVIEW_SMOKE);
}

export function shouldRequireWechatVerify() {
  return isTruthy(process.env.REQUIRE_WECHAT_VERIFY);
}

export function normalizeBaseUrl(baseURL) {
  return baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
}

export async function resolvePreviewBaseUrl(rootDir = projectRoot) {
  if (process.env.PREVIEW_BASE_URL) {
    return normalizeBaseUrl(process.env.PREVIEW_BASE_URL);
  }

  const serverConfigPath = path.join(rootDir, 'profiles', 'v2', 'packages', 'server.json');
  if (!existsSync(serverConfigPath)) {
    return null;
  }

  const raw = await readFile(serverConfigPath, 'utf8');
  const serverConfig = JSON.parse(raw);
  if (!serverConfig?.server_port) {
    return null;
  }

  return `http://127.0.0.1:${serverConfig.server_port}/`;
}

export async function isPreviewServerHealthy(baseURL, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(baseURL, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function getPlaywrightCliEntry(rootDir = projectRoot) {
  return path.join(rootDir, 'node_modules', 'playwright', 'cli.js');
}

export function runCommand(command, args, options = {}) {
  const {
    cwd = projectRoot,
    env = process.env,
  } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed with exit code ${code ?? 'unknown'}: ${command}`));
    });
  });
}

export async function runNodeScript(scriptPath, rootDir = projectRoot) {
  await runCommand(process.execPath, [scriptPath], { cwd: rootDir });
}

export async function runPlaywrightSmoke(baseURL, rootDir = projectRoot) {
  const playwrightCliEntry = getPlaywrightCliEntry(rootDir);
  const env = {
    ...process.env,
    PREVIEW_BASE_URL: normalizeBaseUrl(baseURL),
  };

  await runCommand(
    process.execPath,
    [
      playwrightCliEntry,
      'test',
      '-c',
      './playwright.config.mjs',
      './tests/preview-smoke.spec.mjs',
      './tests/first-session-runtime.spec.mjs',
      './tests/scene-loader-failure.spec.mjs',
    ],
    { cwd: rootDir, env },
  );
}

export async function runPlaywrightFirstSessionJourney(baseURL, rootDir = projectRoot) {
  const playwrightCliEntry = getPlaywrightCliEntry(rootDir);
  const env = {
    ...process.env,
    PREVIEW_BASE_URL: normalizeBaseUrl(baseURL),
  };

  await runCommand(
    process.execPath,
    [
      playwrightCliEntry,
      'test',
      '-c',
      './playwright.config.mjs',
      './tests/first-session-journey.spec.mjs',
    ],
    { cwd: rootDir, env },
  );
}

export async function runPlaywrightVisualInitial(baseURL, rootDir = projectRoot) {
  const playwrightCliEntry = getPlaywrightCliEntry(rootDir);
  const env = {
    ...process.env,
    PREVIEW_BASE_URL: normalizeBaseUrl(baseURL),
  };

  await runCommand(
    process.execPath,
    [
      playwrightCliEntry,
      'test',
      '-c',
      './playwright.config.mjs',
      './tests/visual-scene-initial.spec.mjs',
    ],
    { cwd: rootDir, env },
  );
}
