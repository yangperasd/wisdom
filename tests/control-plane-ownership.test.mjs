import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertNodeExists,
  getComponentRecordForNode,
  getComponentTypesForNode,
  getScriptTypeId,
  readAssetJson,
} from './helpers/cocos-asset-test-utils.mjs';

const launchScenes = [
  'StartCamp',
  'FieldWest',
  'FieldRuins',
  'DungeonHub',
  'DungeonRoomA',
  'DungeonRoomB',
  'DungeonRoomC',
  'BossArena',
  'MechanicsLab',
];

const hudScenes = launchScenes.filter((sceneName) => sceneName !== 'MechanicsLab');
const bindingAuditAssets = [
  ...launchScenes.map((sceneName) => ({
    label: sceneName,
    path: `assets/scenes/${sceneName}.scene`,
  })),
  {
    label: 'ArrowProjectile.prefab',
    path: 'assets/prefabs/ArrowProjectile.prefab',
  },
];

const hudPanels = ['HudTopBar', 'HudObjectiveCard', 'HudControlsCard'];
const allowedLegacySelectionKeys = new Set([
  'echo_spring_flower',
  'echo_bomb_bug',
  'boss_shield_closed',
  'boss_shield_open',
]);

function getBindingCategory(bindingManifest, bindingKey) {
  for (const categoryName of ['worldEntities', 'uiEntities', 'audioRoles']) {
    if (bindingManifest?.[categoryName]?.[bindingKey]) {
      return {
        manifestLocation: `asset_binding_manifest_v2.${categoryName}`,
        entry: bindingManifest[categoryName][bindingKey],
      };
    }
  }

  return null;
}

function getCurrentBindingPaths(entry) {
  return [
    entry?.selectedPath,
    entry?.selectedBasePath,
  ].filter((value) => typeof value === 'string' && value.length > 0);
}

function collectActiveAssetBindingTags(items, assetBindingTagType) {
  const tags = [];

  for (const node of items) {
    if (node?.__type__ !== 'cc.Node' || node._active === false) {
      continue;
    }

    for (const componentRef of node._components ?? []) {
      const component = items[componentRef.__id__];
      if (component?.__type__ === assetBindingTagType) {
        tags.push({ node, component });
      }
    }
  }

  return tags;
}

test('launch scenes stay registered in the control-plane manifest', async () => {
  const bindingManifest = await readAssetJson('assets/configs/asset_binding_manifest_v2.json');

  for (const sceneName of launchScenes) {
    assert.ok(
      bindingManifest.sceneBindings?.[sceneName],
      `Expected scene binding metadata for launch scene: ${sceneName}`,
    );
  }
});

test('HUD panels keep RectVisual as the single renderer owner during the cute placeholder pass', async () => {
  const gameHudType = await getScriptTypeId('assets/scripts/ui/GameHud.ts');
  const hudPanelSkinType = await getScriptTypeId('assets/scripts/visual/HudPanelSkin.ts');
  const rectVisualType = await getScriptTypeId('assets/scripts/visual/RectVisual.ts');

  for (const sceneName of hudScenes) {
    const items = await readAssetJson(`assets/scenes/${sceneName}.scene`);
    const hudRoot = assertNodeExists(items, 'HudRoot');
    const gameHud = getComponentRecordForNode(items, hudRoot, gameHudType, `${sceneName} HudRoot`);

    for (const panelName of hudPanels) {
      const panelNode = assertNodeExists(items, panelName);
      const panelTypes = getComponentTypesForNode(items, panelNode);

      assert.ok(panelTypes.has(rectVisualType), `Expected ${sceneName} ${panelName} to use RectVisual as the renderer owner.`);
      assert.ok(
        !panelTypes.has('cc.Sprite'),
        `Expected ${sceneName} ${panelName} not to own a root cc.Sprite during the placeholder pass.`,
      );
      assert.ok(
        !panelTypes.has(hudPanelSkinType),
        `Expected ${sceneName} ${panelName} not to also use HudPanelSkin; one HUD region must have one renderer owner.`,
      );
    }

    assert.ok(gameHud.hudTopBar?.__id__ != null, `${sceneName} GameHud should reference HudTopBar`);
    assert.ok(gameHud.hudObjectiveCard?.__id__ != null, `${sceneName} GameHud should reference HudObjectiveCard`);
    assert.ok(gameHud.hudControlsCard?.__id__ != null, `${sceneName} GameHud should reference HudControlsCard`);
    assert.equal(gameHud.hudTopBarSpriteFrame ?? null, null, `${sceneName} GameHud must not rebind hudTopBarSpriteFrame`);
    assert.equal(
      gameHud.hudObjectiveCardSpriteFrame ?? null,
      null,
      `${sceneName} GameHud must not rebind hudObjectiveCardSpriteFrame`,
    );
    assert.equal(
      gameHud.hudControlsCardSpriteFrame ?? null,
      null,
      `${sceneName} GameHud must not rebind hudControlsCardSpriteFrame`,
    );
  }
});

test('AssetBindingTag keys stay on binding manifest entries or explicit legacy transitions', async () => {
  const bindingManifest = await readAssetJson('assets/configs/asset_binding_manifest_v2.json');
  const selectionManifest = await readAssetJson('assets/configs/asset_selection_manifest.json');
  const assetBindingTagType = await getScriptTypeId('assets/scripts/core/AssetBindingTag.ts');

  const activeBindingKeys = new Set();
  const activeSelectionKeys = new Set();

  for (const { label, path } of bindingAuditAssets) {
    const items = await readAssetJson(path);
    for (const { node, component } of collectActiveAssetBindingTags(items, assetBindingTagType)) {
      const bindingKey = component.bindingKey;
      assert.equal(typeof bindingKey, 'string', `${label} ${node._name} should expose a string bindingKey`);
      assert.ok(bindingKey.length > 0, `${label} ${node._name} should not use an empty bindingKey`);

      const sourceManifest = component.sourceManifest ?? '';
      const bindingCoverage = getBindingCategory(bindingManifest, bindingKey);
      const selectionEntry = selectionManifest.entities?.[bindingKey];

      activeBindingKeys.add(bindingKey);

      if (bindingCoverage) {
        assert.equal(
          sourceManifest,
          bindingCoverage.manifestLocation,
          `${label} ${node._name} should reference the current binding manifest for ${bindingKey}`,
        );

        const currentPaths = getCurrentBindingPaths(bindingCoverage.entry);
        if (currentPaths.length > 0 && component.selectedPath) {
          assert.ok(
            currentPaths.includes(component.selectedPath),
            `${label} ${node._name} selectedPath must match ${bindingKey} in asset_binding_manifest_v2`,
          );
        }
        continue;
      }

      if (sourceManifest === 'asset_selection_manifest.entities') {
        activeSelectionKeys.add(bindingKey);
        assert.ok(
          allowedLegacySelectionKeys.has(bindingKey),
          `Unexpected selection-manifest-only binding key in ${label}: ${bindingKey}`,
        );
        assert.ok(
          selectionEntry,
          `Legacy selection-manifest key must still exist in asset_selection_manifest.entities: ${bindingKey}`,
        );
        continue;
      }

      assert.fail(
        `Binding key is not covered by asset_binding_manifest_v2 or an explicit legacy selection transition: ${label}.${node._name} -> ${bindingKey} (${sourceManifest || 'missing sourceManifest'})`,
      );
    }
  }

  for (const key of ['echo_spring_flower', 'echo_bomb_bug', 'boss_shield_closed', 'boss_shield_open']) {
    assert.ok(getBindingCategory(bindingManifest, key), `Expected binding manifest coverage for ${key}`);
  }

  assert.ok(activeBindingKeys.size > 0, 'Expected at least one active AssetBindingTag across launch scenes');
  for (const key of activeSelectionKeys) {
    assert.ok(allowedLegacySelectionKeys.has(key), `Unexpected legacy selection key: ${key}`);
  }
});
