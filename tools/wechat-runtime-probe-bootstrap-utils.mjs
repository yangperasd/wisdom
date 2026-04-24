import fs from 'node:fs';
import path from 'node:path';

export const runtimeProbeBootstrapStart = '// __codexRuntimeProbeBootstrapStart';
export const runtimeProbeBootstrapEnd = '// __codexRuntimeProbeBootstrapEnd';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripRuntimeProbeBootstrap(gameJs) {
  const bootstrapPattern = new RegExp(
    `${escapeRegExp(runtimeProbeBootstrapStart)}[\\s\\S]*?${escapeRegExp(runtimeProbeBootstrapEnd)}\\n?`,
    'm',
  );
  return {
    cleaned: bootstrapPattern.test(gameJs),
    content: gameJs.replace(bootstrapPattern, ''),
  };
}

export function cleanupRuntimeProbeBootstrap(projectDir) {
  const targetDir = String(projectDir ?? '').trim();
  if (!targetDir) {
    return {
      attempted: false,
      cleaned: false,
      reason: 'missing-project-dir',
      error: null,
      gameJsPath: null,
      projectDir: null,
    };
  }

  const resolvedProjectDir = path.resolve(targetDir);
  const gameJsPath = path.join(resolvedProjectDir, 'game.js');
  if (!fs.existsSync(gameJsPath)) {
    return {
      attempted: true,
      cleaned: false,
      reason: 'missing-game-js',
      error: null,
      gameJsPath,
      projectDir: resolvedProjectDir,
    };
  }

  try {
    const gameJs = fs.readFileSync(gameJsPath, 'utf8');
    const stripped = stripRuntimeProbeBootstrap(gameJs);
    if (!stripped.cleaned) {
      return {
        attempted: true,
        cleaned: false,
        reason: 'bootstrap-not-present',
        error: null,
        gameJsPath,
        projectDir: resolvedProjectDir,
      };
    }

    fs.writeFileSync(gameJsPath, stripped.content, 'utf8');
    return {
      attempted: true,
      cleaned: true,
      reason: 'bootstrap-removed',
      error: null,
      gameJsPath,
      projectDir: resolvedProjectDir,
    };
  } catch (error) {
    return {
      attempted: true,
      cleaned: false,
      reason: 'cleanup-failed',
      error: error instanceof Error ? error.message : String(error),
      gameJsPath,
      projectDir: resolvedProjectDir,
    };
  }
}

export function cleanupRuntimeProbeBootstrapInBuildOutputs(rootDir) {
  const resolvedRootDir = path.resolve(rootDir);
  const buildRootDir = path.join(resolvedRootDir, 'build');
  const results = [];

  if (!fs.existsSync(buildRootDir)) {
    return {
      rootDir: resolvedRootDir,
      buildRootDir,
      scannedProjectDirs: [],
      cleanedProjectDirs: [],
      errorProjectDirs: [],
      cleanedCount: 0,
      results,
    };
  }

  const buildEntries = fs.readdirSync(buildRootDir, { withFileTypes: true });
  for (const entry of buildEntries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (!entry.name.startsWith('wechatgame')) {
      continue;
    }
    results.push(cleanupRuntimeProbeBootstrap(path.join(buildRootDir, entry.name)));
  }

  return {
    rootDir: resolvedRootDir,
    buildRootDir,
    scannedProjectDirs: results
      .map((result) => result.projectDir)
      .filter((projectDir) => typeof projectDir === 'string' && projectDir.length > 0),
    cleanedProjectDirs: results
      .filter((result) => result.cleaned)
      .map((result) => result.projectDir),
    errorProjectDirs: results
      .filter((result) => result.reason === 'cleanup-failed')
      .map((result) => result.projectDir),
    cleanedCount: results.filter((result) => result.cleaned).length,
    results,
  };
}
