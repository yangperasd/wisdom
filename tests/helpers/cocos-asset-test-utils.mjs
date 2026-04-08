import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..');

export async function readAssetJson(relativePath) {
  const absolutePath = path.join(PROJECT_ROOT, relativePath);
  const content = await readFile(absolutePath, 'utf8');
  return JSON.parse(content);
}

export async function readMeta(relativePath) {
  return readAssetJson(`${relativePath}.meta`);
}

export function compressUuid(uuid) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const source = uuid.replace(/-/g, '');
  let output = source.slice(0, 5);

  for (let index = 5; index < source.length; index += 3) {
    const h1 = Number.parseInt(source[index], 16);
    const h2 = Number.parseInt(source[index + 1], 16);
    const h3 = Number.parseInt(source[index + 2], 16);
    output += chars[(h1 << 2) | (h2 >> 2)];
    output += chars[((h2 & 3) << 4) | h3];
  }

  return output;
}

export async function getScriptTypeId(relativePath) {
  const meta = await readMeta(relativePath);
  return compressUuid(meta.uuid);
}

export function findNodeRecord(items, name) {
  return items.find((item) => item?.__type__ === 'cc.Node' && item._name === name) ?? null;
}

export function findAllNodeRecords(items, name) {
  return items.filter((item) => item?.__type__ === 'cc.Node' && item._name === name);
}

export function getComponentRecordsForNode(items, nodeRecord) {
  const componentRefs = nodeRecord?._components ?? [];
  return componentRefs
    .map((componentRef) => items[componentRef.__id__])
    .filter(Boolean);
}

export function getComponentTypesForNode(items, nodeRecord) {
  return new Set(getComponentRecordsForNode(items, nodeRecord).map((component) => component.__type__));
}

export function assertNodeExists(items, name) {
  const node = findNodeRecord(items, name);
  assert.ok(node, `Expected node "${name}" to exist.`);
  return node;
}

export function assertNodeHasComponent(items, nodeRecord, typeId, label) {
  const types = getComponentTypesForNode(items, nodeRecord);
  assert.ok(
    types.has(typeId),
    `Expected node "${label ?? nodeRecord._name}" to include component type "${typeId}".`,
  );
}

export function assertNodeActiveState(nodeRecord, expected) {
  assert.equal(
    nodeRecord._active,
    expected,
    `Expected node "${nodeRecord._name}" active state to be ${expected}.`,
  );
}
