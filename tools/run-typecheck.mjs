import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot, runCommand } from './test-runner-helpers.mjs';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildTscPath(creatorRoot) {
  return path.join(
    creatorRoot,
    'resources',
    'app.asar.unpacked',
    'node_modules',
    'typescript',
    'lib',
    'tsc.js',
  );
}

function deriveCreatorRootFromInternalPath(internalPath) {
  if (typeof internalPath !== 'string' || internalPath.length === 0) {
    return null;
  }

  const normalized = internalPath.replace(/\*/g, '');
  const marker = `${path.sep}resources${path.sep}resources${path.sep}`;
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  return normalized.slice(0, markerIndex);
}

async function resolveBundledTscPath() {
  const cocosTsConfigPath = path.join(projectRoot, 'temp', 'tsconfig.cocos.json');
  if (existsSync(cocosTsConfigPath)) {
    const raw = await readFile(cocosTsConfigPath, 'utf8');
    const tsConfig = JSON.parse(raw);
    const internalPaths = toArray(tsConfig?.compilerOptions?.paths?.['db://internal/*']);

    for (const internalPath of internalPaths) {
      const creatorRoot = deriveCreatorRootFromInternalPath(internalPath);
      if (!creatorRoot) {
        continue;
      }

      const tscPath = buildTscPath(creatorRoot);
      if (existsSync(tscPath)) {
        return tscPath;
      }
    }
  }

  const fallbackRoots = [
    path.join(process.env.USERPROFILE ?? '', 'Apps', 'CocosCreator', '3.8.8'),
  ];

  for (const fallbackRoot of fallbackRoots) {
    const tscPath = buildTscPath(fallbackRoot);
    if (existsSync(tscPath)) {
      return tscPath;
    }
  }

  throw new Error('Unable to locate the bundled Cocos Creator TypeScript compiler.');
}

const tscPath = await resolveBundledTscPath();
console.log(`[typecheck] using ${tscPath}`);

await runCommand(process.execPath, [tscPath, '-p', 'tsconfig.json', '--skipLibCheck'], {
  cwd: projectRoot,
});
