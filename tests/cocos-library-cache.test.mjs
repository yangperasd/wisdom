import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { PROJECT_ROOT, readMeta } from './helpers/cocos-asset-test-utils.mjs';

const RELEASE_SCENES = [
  'StartCamp',
  'FieldWest',
  'FieldRuins',
  'DungeonHub',
  'DungeonRoomA',
  'DungeonRoomB',
  'DungeonRoomC',
  'BossArena',
];

function relativePath(absolutePath) {
  return path.relative(PROJECT_ROOT, absolutePath).replaceAll(path.sep, '/');
}

function getSceneSourcePath(sceneName) {
  return path.join(PROJECT_ROOT, 'assets', 'scenes', `${sceneName}.scene`);
}

function getLibraryCachePath(uuid) {
  return path.join(PROJECT_ROOT, 'library', uuid.slice(0, 2), `${uuid}.json`);
}

function getSha256(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

async function canReachPreviewServer() {
  const baseURL = process.env.PREVIEW_BASE_URL ?? 'http://127.0.0.1:7456/';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500);

  try {
    const response = await fetch(baseURL, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

test('local Cocos preview scene cache matches release scene sources when preview is available', async () => {
  const previewAvailable = await canReachPreviewServer();
  const checkedScenes = [];
  const missingScenes = [];
  const staleScenes = [];

  for (const sceneName of RELEASE_SCENES) {
    const meta = await readMeta(`assets/scenes/${sceneName}.scene`);
    const sourcePath = getSceneSourcePath(sceneName);
    const cachePath = getLibraryCachePath(meta.uuid);

    if (!existsSync(cachePath)) {
      missingScenes.push(`${sceneName}: ${relativePath(cachePath)}`);
      continue;
    }

    checkedScenes.push(sceneName);

    const [sourceContent, cacheContent] = await Promise.all([
      readFile(sourcePath, 'utf8'),
      readFile(cachePath, 'utf8'),
    ]);

    const sourceJson = JSON.parse(sourceContent);
    const cacheJson = JSON.parse(cacheContent);

    if (!isDeepStrictEqual(cacheJson, sourceJson)) {
      staleScenes.push(
        `${sceneName}: ${relativePath(cachePath)} differs from ${relativePath(sourcePath)} ` +
          `(source ${getSha256(sourceContent)}, cache ${getSha256(cacheContent)})`,
      );
    }
  }

  if (previewAvailable) {
    assert.deepEqual(
      missingScenes,
      [],
      `Cocos preview is reachable, so release scene cache files must exist for source->preview evidence:\n${missingScenes.join('\n')}`,
    );
  }

  if (checkedScenes.length === 0) {
    assert.ok(
      !previewAvailable,
      'No local Cocos library scene cache files were found while Cocos preview is available.',
    );
    return;
  }

  assert.deepEqual(
    staleScenes,
    [],
    `Local Cocos preview cache is stale for release scenes. Sync or refresh the listed library files:\n${staleScenes.join('\n')}`,
  );
});
