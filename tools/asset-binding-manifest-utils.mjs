import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const CANDIDATE_MANIFEST_ENV = 'IMAGE2_CANDIDATE_PREVIEW';
const CANDIDATE_MANIFEST_RELATIVE_PATH = path.join(
  'assets',
  'configs',
  'asset_binding_candidate_manifest_image2.json',
);

export async function loadAssetBindingCatalog(projectRoot = process.cwd(), options = {}) {
  const selectionManifestPath = path.join(projectRoot, 'assets', 'configs', 'asset_selection_manifest.json');
  const bindingManifestPath = path.join(projectRoot, 'assets', 'configs', 'asset_binding_manifest_v2.json');
  const candidateManifestPath = path.join(projectRoot, CANDIDATE_MANIFEST_RELATIVE_PATH);
  const candidatePreviewEnabled = options.enableImage2CandidatePreview ?? process.env[CANDIDATE_MANIFEST_ENV] === '1';

  const [selectionManifest, liveBindingManifest, candidateManifest] = await Promise.all([
    readJson(selectionManifestPath),
    readJson(bindingManifestPath),
    candidatePreviewEnabled ? readOptionalJson(candidateManifestPath) : Promise.resolve(null),
  ]);

  return {
    selectionManifest,
    bindingManifest: overlayCandidateBindingManifest(liveBindingManifest, candidateManifest),
    liveBindingManifest,
    candidateManifest,
    candidatePreviewEnabled,
  };
}

export function resolveAssetBinding(catalog, bindingKey) {
  if (!catalog || !bindingKey) {
    return null;
  }

  const worldEntry = catalog.bindingManifest?.worldEntities?.[bindingKey];
  if (worldEntry) {
    return {
      bindingKey,
      selectedPath: worldEntry.selectedPath ?? '',
      fallbackPath: worldEntry.fallbackPath ?? '',
      sourceManifest: worldEntry.sourceManifest ?? 'asset_binding_manifest_v2.worldEntities',
      bindingStatus: worldEntry.status ?? '',
    };
  }

  const uiEntry = catalog.bindingManifest?.uiEntities?.[bindingKey];
  if (uiEntry) {
    return {
      bindingKey,
      selectedPath: uiEntry.selectedPath ?? uiEntry.selectedBasePath ?? '',
      fallbackPath: uiEntry.fallbackPath ?? uiEntry.selectedIconPath ?? '',
      sourceManifest: uiEntry.sourceManifest ?? 'asset_binding_manifest_v2.uiEntities',
      bindingStatus: uiEntry.status ?? '',
    };
  }

  const audioEntry = catalog.bindingManifest?.audioRoles?.[bindingKey];
  if (audioEntry) {
    return {
      bindingKey,
      selectedPath: audioEntry.selectedPath ?? '',
      fallbackPath: audioEntry.fallbackPath ?? '',
      sourceManifest: audioEntry.sourceManifest ?? 'asset_binding_manifest_v2.audioRoles',
      bindingStatus: audioEntry.status ?? '',
    };
  }

  const selectionEntry = catalog.selectionManifest?.entities?.[bindingKey];
  if (selectionEntry) {
    return {
      bindingKey,
      selectedPath: selectionEntry.path ?? '',
      fallbackPath: selectionEntry.fallbackPath ?? '',
      sourceManifest: 'asset_selection_manifest.entities',
      bindingStatus: selectionEntry.status ?? '',
    };
  }

  return null;
}

export function overlayCandidateBindingManifest(bindingManifest, candidateManifest) {
  if (!candidateManifest || typeof candidateManifest !== 'object') {
    return bindingManifest;
  }

  const nextManifest = structuredClone(bindingManifest);
  for (const categoryName of ['worldEntities', 'uiEntities', 'audioRoles']) {
    const candidateCategory = candidateManifest?.[categoryName];
    if (!candidateCategory || typeof candidateCategory !== 'object') {
      continue;
    }

    nextManifest[categoryName] ??= {};
    for (const [bindingKey, candidateEntry] of Object.entries(candidateCategory)) {
      if (!candidateEntry || typeof candidateEntry !== 'object') {
        continue;
      }

      const liveEntry = nextManifest[categoryName][bindingKey] ?? {};
      nextManifest[categoryName][bindingKey] = {
        ...liveEntry,
        ...candidateEntry,
        sourceManifest: candidateEntry.sourceManifest ?? `asset_binding_candidate_manifest_image2.${categoryName}`,
      };
    }
  }

  return nextManifest;
}

export function resolveImageAssetReference(projectRoot, assetPath) {
  if (!projectRoot || !assetPath || typeof assetPath !== 'string' || !assetPath.endsWith('.png')) {
    return null;
  }

  const metaPath = path.join(projectRoot, `${assetPath}.meta`);
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const subMetas = Object.values(meta.subMetas ?? {});
  const spriteFrameMeta = subMetas.find((entry) => entry?.importer === 'sprite-frame');
  if (spriteFrameMeta?.uuid) {
    return {
      propertyName: 'spriteFrame',
      assetRef: {
        __uuid__: spriteFrameMeta.uuid,
        __expectedType__: 'cc.SpriteFrame',
      },
    };
  }

  const textureMeta = subMetas.find((entry) => entry?.importer === 'texture');
  if (textureMeta?.uuid) {
    return {
      propertyName: 'texture',
      assetRef: {
        __uuid__: textureMeta.uuid,
        __expectedType__: 'cc.Texture2D',
      },
    };
  }

  return null;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readOptionalJson(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}
