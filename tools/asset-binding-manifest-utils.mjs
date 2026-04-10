import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function loadAssetBindingCatalog(projectRoot = process.cwd()) {
  const selectionManifestPath = path.join(projectRoot, 'assets', 'configs', 'asset_selection_manifest.json');
  const bindingManifestPath = path.join(projectRoot, 'assets', 'configs', 'asset_binding_manifest_v2.json');

  const [selectionManifest, bindingManifest] = await Promise.all([
    readJson(selectionManifestPath),
    readJson(bindingManifestPath),
  ]);

  return {
    selectionManifest,
    bindingManifest,
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
      sourceManifest: 'asset_binding_manifest_v2.worldEntities',
      bindingStatus: worldEntry.status ?? '',
    };
  }

  const uiEntry = catalog.bindingManifest?.uiEntities?.[bindingKey];
  if (uiEntry) {
    return {
      bindingKey,
      selectedPath: uiEntry.selectedPath ?? uiEntry.selectedBasePath ?? '',
      fallbackPath: uiEntry.fallbackPath ?? uiEntry.selectedIconPath ?? '',
      sourceManifest: 'asset_binding_manifest_v2.uiEntities',
      bindingStatus: uiEntry.status ?? '',
    };
  }

  const audioEntry = catalog.bindingManifest?.audioRoles?.[bindingKey];
  if (audioEntry) {
    return {
      bindingKey,
      selectedPath: audioEntry.selectedPath ?? '',
      fallbackPath: audioEntry.fallbackPath ?? '',
      sourceManifest: 'asset_binding_manifest_v2.audioRoles',
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
