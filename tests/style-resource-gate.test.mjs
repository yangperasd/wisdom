import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const gateConfigPath = path.join(projectRoot, 'assets', 'configs', 'style_resource_gate.json');
const bindingManifestPath = path.join(projectRoot, 'assets', 'configs', 'asset_binding_manifest_v2.json');
const gameHudPath = path.join(projectRoot, 'assets', 'scripts', 'ui', 'GameHud.ts');

const gateConfig = JSON.parse(fs.readFileSync(gateConfigPath, 'utf-8'));
const bindingManifest = JSON.parse(fs.readFileSync(bindingManifestPath, 'utf-8'));

const requiredNorthStar = ['bright', 'warm', 'cute', 'round', 'toy-like'];
const forbiddenNorthStar = [
  'dark',
  'gray-heavy',
  'dirty-green-noise',
  'realistic-cracks',
  'sharp-gothic',
  'bloody-pressure',
  'cold-hard-metal',
  'heavy-gold-trim',
  'mixed-ui-systems',
  'mixed-pixel-handpainted-realistic',
];

const protectedKeys = ['player'];

const referenceKeys = [
  'echo_box',
  'echo_spring_flower',
  'echo_bomb_bug',
  'environment_dungeon_floor_family',
  'environment_dungeon_wall_family',
  'environment_dungeon_prop_family',
];

const mustRedoKeys = [
  'outdoor_wall_standard',
  'outdoor_wall_broken',
  'outdoor_wall_cracked',
  'outdoor_path_cobble',
  'outdoor_ground_flowers',
];

const transitionKeys = [
  'hud_top_bar',
  'objective_card',
  'controls_card',
  'touch_attack_button',
  'touch_summon_button',
  'touch_respawn_button',
  'touch_echo_button',
  'pause_button',
  'portal',
  'outdoor_ground_green',
  'outdoor_ground_ruins',
  'boss_shield_closed',
  'boss_shield_open',
  'projectile_arrow',
  'checkpoint',
  'common_enemy',
  'barrier_closed',
  'barrier_open',
  'breakable_target',
  'pickup_relic',
];

const accentKeys = [
  'system_pause_icon',
  'system_confirm_icon',
  'boss_core',
];

const firstPassScenes = [
  'assets/scenes/StartCamp.scene',
  'assets/scenes/FieldWest.scene',
  'assets/scenes/FieldRuins.scene',
  'assets/scenes/DungeonHub.scene',
  'assets/scenes/DungeonRoomA.scene',
  'assets/scenes/DungeonRoomB.scene',
  'assets/scenes/DungeonRoomC.scene',
  'assets/scenes/BossArena.scene',
];

const worldLabelBudgetByScene = {
  StartCamp: 13,
  FieldWest: 11,
  FieldRuins: 11,
  DungeonHub: 17,
  DungeonRoomA: 10,
  DungeonRoomB: 8,
  DungeonRoomC: 9,
  BossArena: 6,
};
const nonWorldLabelRootNames = new Set(['HudRoot', 'TouchHudRoot', 'PausePanel']);
const maxWorldLabelCharacters = 10;
const forbiddenWorldBehaviorLabels = ['巡逻', '守卫', '看守'];

const forbiddenVisibleDebugLabels = [
  'ATTACK',
  'SUMMON',
  'RESET',
  'PAUSE',
  'CONTINUE',
  'RESTART',
  'RETURN CAMP',
  'BOX TRAINING',
  'TRIAL COMPLETE',
  'PRESS PLATE',
  'WEST GATE',
  'WEST OPEN',
  'SAFE LANDING',
  'RUINS GATE CHECK',
  'RUINS CHECK',
  'BACK TO WEST',
  'UNLOCK BOMB',
  'PLACE BOMB BUG BY THE WALL',
  'THE TRIAL GATE OPENS AFTER THE BLAST',
  'TRIAL PATH',
  'CRACKED WALL',
  'WALL OPEN',
  'ENTER DUNGEON',
  'Trial Hub',
  'Clear the three chambers to unlock the boss gate.',
  'HUB CHECK',
  'BACK TO RUINS',
  'ROOM A',
  'ROOM B',
  'ROOM C',
  'PENDING',
  'DONE',
  'BOSS LOCKED',
  'BOSS OPEN',
  'ENTER BOSS',
  'ROOM A CHECK',
  'ROOM B CHECK',
  'ROOM C CHECK',
  'BACK TO HUB',
  'Room A - Box',
  'Room B - Flower',
  'Room C - Bomb',
  'CLAIM BOX RELIC',
  'CLAIM FLOWER RELIC',
  'CLAIM BOMB RELIC',
  'FLOWER SPOT',
  'BOMB SPOT',
  'BOUNDARY',
  'LANDING',
  'BOSS CHECK',
  'Boss Arena',
  'PLAYER',
  'BombBug is the only echo that can break this wall.',
  '当前回响 箱子',
  '检查点 未激活',
];

const darkFamilyRegex = /(sarcophagus|ashenzaris_altar|darkgreen|cinder)/i;
const darkFallbackRegex =
  /(sarcophagus|ashenzaris_altar|darkgreen|cinder|deepdwarf|trap_unidentified|shield_deep|wall_compound)/i;
const asciiWordLabelRegex = /[A-Za-z]{2,}/;
const primaryHudKeys = [
  'hud_top_bar',
  'objective_card',
  'controls_card',
  'touch_attack_button',
  'touch_summon_button',
  'touch_respawn_button',
  'touch_echo_button',
  'pause_button',
];
const keyGameplayPlaceholderKeys = ['common_enemy', 'barrier_closed', 'barrier_open', 'breakable_target', 'pickup_relic'];

function getBindingEntry(key) {
  return bindingManifest.worldEntities?.[key]
    ?? bindingManifest.uiEntities?.[key]
    ?? bindingManifest.audioRoles?.[key]
    ?? null;
}

function getEntryPaths(entry) {
  if (!entry || typeof entry !== 'object') {
    return [];
  }

  return [
    entry.selectedPath,
    entry.selectedBasePath,
    entry.selectedIconPath,
    entry.fallbackPath,
    entry.fallbackBasePath,
    ...(Array.isArray(entry.fallbackPaths) ? entry.fallbackPaths : []),
  ].filter((value) => typeof value === 'string' && value.length > 0);
}

function hasGeneratedPathPrefix(assetPath, prefixes) {
  return prefixes.some((prefix) => assetPath.startsWith(prefix));
}

function getVisualKeyExemptions() {
  const exemptions = gateConfig.visualKeyExemptions ?? [];
  const map = new Map();

  for (const exemption of exemptions) {
    assert.ok(exemption && typeof exemption === 'object', 'Visual key exemption must be an object');
    assert.equal(typeof exemption.key, 'string', 'Visual key exemption requires a string key');
    assert.equal(typeof exemption.reason, 'string', 'Visual key exemption requires a string reason');
    map.set(exemption.key, exemption.reason);
  }

  return map;
}

function getSceneLabelStrings(sceneRelPath) {
  const sceneAbsPath = path.join(projectRoot, sceneRelPath);
  const scene = JSON.parse(fs.readFileSync(sceneAbsPath, 'utf-8'));

  return scene
    .filter((item) => item?.__type__ === 'cc.Label' && typeof item._string === 'string')
    .map((item) => item._string)
    .filter((label) => label.trim().length > 0);
}

function getSceneWorldLabels(sceneRelPath) {
  const sceneAbsPath = path.join(projectRoot, sceneRelPath);
  const scene = JSON.parse(fs.readFileSync(sceneAbsPath, 'utf-8'));
  const nodes = new Map();

  scene.forEach((item, index) => {
    if (item?.__type__ === 'cc.Node') {
      nodes.set(index, item);
    }
  });

  function getNodePathNames(nodeId) {
    const names = [];
    let currentId = nodeId;

    for (let guard = 0; Number.isInteger(currentId) && nodes.has(currentId) && guard < 64; guard += 1) {
      const node = nodes.get(currentId);
      names.push(node._name ?? '');
      currentId = node._parent?.__id__;
    }

    return names.reverse();
  }

  return scene
    .filter((item) => item?.__type__ === 'cc.Label' && typeof item._string === 'string')
    .map((label) => {
      const nodePathNames = getNodePathNames(label.node?.__id__);
      return {
        text: label._string.trim(),
        nodePath: nodePathNames.join('/'),
        nodePathNames,
      };
    })
    .filter((label) => label.text.length > 0)
    .filter((label) => !label.nodePathNames.some((name) => nonWorldLabelRootNames.has(name)));
}

test('style gate config keeps the cute north star and forbidden list explicit', () => {
  assert.deepEqual(gateConfig.northStar.mustKeep, requiredNorthStar);
  assert.deepEqual(gateConfig.northStar.mustNotSlipInto, forbiddenNorthStar);
});

test('style gate config marks must-redo, transition, accent, protected, and reference keys explicitly', () => {
  const policy = gateConfig.keys;

  for (const key of mustRedoKeys) {
    assert.ok(policy[key], `Missing must-redo key in style gate config: ${key}`);
    assert.equal(policy[key].role, 'must-redo');
    assert.equal(policy[key].finalGateState, 'blocked-final');
  }

  for (const key of transitionKeys) {
    assert.ok(policy[key], `Missing transition key in style gate config: ${key}`);
    assert.equal(policy[key].role, 'transition');
    assert.equal(policy[key].finalGateState, 'temporary-transition');
  }

  for (const key of accentKeys) {
    assert.ok(policy[key], `Missing accent key in style gate config: ${key}`);
    assert.equal(policy[key].role, 'accent');
    assert.equal(policy[key].finalGateState, 'candidate-accent');
  }

  for (const key of protectedKeys) {
    assert.ok(policy[key], `Missing protected key in style gate config: ${key}`);
    assert.equal(policy[key].role, 'protected');
    assert.equal(policy[key].finalGateState, 'reference-locked');
  }

  for (const key of referenceKeys) {
    assert.ok(policy[key], `Missing reference key in style gate config: ${key}`);
    assert.equal(policy[key].role, 'reference');
    assert.equal(policy[key].finalGateState, 'reference-bound');
  }
});

test('every visual binding key has a style gate strategy or explicit exemption', () => {
  const policy = gateConfig.keys;
  const exemptions = getVisualKeyExemptions();
  const visualKeySet = new Set([
    ...Object.keys(bindingManifest.worldEntities ?? {}),
    ...Object.keys(bindingManifest.uiEntities ?? {}),
  ]);

  for (const key of visualKeySet) {
    assert.ok(
      policy[key] || exemptions.has(key),
      `Missing style gate strategy or exemption for visual key: ${key}`,
    );
  }

  for (const key of Object.keys(policy)) {
    assert.ok(
      visualKeySet.has(key) || exemptions.has(key),
      `Style gate config key is not covered by the visual manifest or an exemption: ${key}`,
    );
  }
});

test('AI-generated assets remain non-final unless explicitly whitelisted', () => {
  const policy = gateConfig.keys;
  const finalSafeWhitelist = new Set(gateConfig.aiAssetBoundary.finalSafeWhitelist ?? []);
  const generatedPathPrefixes = gateConfig.aiAssetBoundary.generatedPathPrefixes ?? [];
  const sourceMarker = gateConfig.aiAssetBoundary.sourceMarker;

  for (const [categoryName, category] of Object.entries({
    worldEntities: bindingManifest.worldEntities ?? {},
    uiEntities: bindingManifest.uiEntities ?? {},
    audioRoles: bindingManifest.audioRoles ?? {},
  })) {
    for (const [key, entry] of Object.entries(category)) {
      const paths = getEntryPaths(entry);
      const isAiGenerated = entry?.source === sourceMarker;
      const isGeneratedPath = paths.some((assetPath) => hasGeneratedPathPrefix(assetPath, generatedPathPrefixes));

      if (!isAiGenerated && !isGeneratedPath) {
        continue;
      }

      assert.ok(
        policy[key],
        `AI-generated asset must be covered by style gate config: ${categoryName}.${key} (${paths.join(', ')})`,
      );

      const gateState = policy[key].finalGateState;
      if (finalSafeWhitelist.has(key)) {
        assert.notEqual(gateState, 'blocked-final', `Whitelisted key cannot be blocked: ${key}`);
      } else {
        assert.notEqual(
          gateState,
          'final-approved',
          `AI-generated asset cannot bypass review into final-approved state: ${key}`,
        );
      }
    }
  }
});

test('BossArena visual anchors stay explicit about placeholder versus generated-candidate status', () => {
  const bossCore = getBindingEntry('boss_core');
  const portal = getBindingEntry('portal');
  const checkpoint = getBindingEntry('checkpoint');

  assert.ok(bossCore, 'Binding manifest is missing boss_core');
  assert.ok(portal, 'Binding manifest is missing portal');
  assert.ok(checkpoint, 'Binding manifest is missing checkpoint');
  assert.equal(bossCore.status, 'rect_visual_placeholder');
  assert.deepEqual(getEntryPaths(bossCore), [], 'boss_core should not point at generated or dark fallback art while it is procedural.');
  assert.equal(gateConfig.keys.boss_core.finalGateState, 'candidate-accent');

  assert.equal(portal.status, 'rect_visual_placeholder');
  assert.equal(portal.selectedPath, '');
  assert.equal(portal.fallbackPath, '');
  assert.deepEqual(getEntryPaths(portal), [], 'portal should stay image-free while it is a procedural placeholder.');
  assert.equal(gateConfig.keys.portal.finalGateState, 'temporary-transition');

  assert.equal(checkpoint.status, 'rect_visual_placeholder');
  assert.equal(checkpoint.selectedPath, '');
  assert.equal(checkpoint.fallbackPath, '');
  assert.equal(gateConfig.keys.checkpoint.finalGateState, 'temporary-transition');
  assert.deepEqual(getEntryPaths(checkpoint), [], 'checkpoint should stay image-free while it is a procedural placeholder.');
});

test('main HUD and touch controls stay image-free while the cute HUD is not final-approved', () => {
  for (const key of primaryHudKeys) {
    const entry = getBindingEntry(key);
    assert.ok(entry, `Binding manifest is missing primary HUD key: ${key}`);

    assert.equal(entry.source, 'runtime-transition');
    assert.equal(entry.status, 'rect_visual_placeholder');
    assert.equal(gateConfig.keys[key].finalGateState, 'temporary-transition');
    assert.deepEqual(getEntryPaths(entry), [], `Primary HUD key should not point at generated or fallback art: ${key}`);
  }
});

test('key gameplay objects do not use generated art as first-release anchors', () => {
  for (const key of keyGameplayPlaceholderKeys) {
    const entry = getBindingEntry(key);
    assert.ok(entry, `Binding manifest is missing key gameplay object: ${key}`);

    assert.equal(entry.source, 'runtime-transition');
    assert.equal(entry.status, 'rect_visual_placeholder');
    assert.equal(gateConfig.keys[key].finalGateState, 'temporary-transition');
    assert.deepEqual(getEntryPaths(entry), [], `Key gameplay object should stay image-free until final cute art lands: ${key}`);
  }
});

test('portal, checkpoint, and outdoor ground bindings do not retain dark fallback families', () => {
  const darkFamilies = /(sarcophagus|ashenzaris_altar|darkgreen|cinder)/i;
  const watchedKeys = [
    'portal',
    'checkpoint',
    'outdoor_ground_green',
    'outdoor_ground_ruins',
    'outdoor_ground_flowers',
    'outdoor_path_cobble',
    'outdoor_wall_standard',
    'outdoor_wall_broken',
    'outdoor_wall_cracked',
  ];

  for (const key of watchedKeys) {
    const entry = getBindingEntry(key);
    assert.ok(entry, `Binding manifest is missing watched key: ${key}`);

    for (const assetPath of getEntryPaths(entry)) {
      assert.doesNotMatch(assetPath, darkFamilies, `Watched key should not fall back to dark dungeon families: ${key}`);
    }
  }
});

test('non-reference visual bindings do not retain dark dungeon fallback families', () => {
  const policy = gateConfig.keys;
  const visualEntries = {
    ...bindingManifest.worldEntities,
    ...bindingManifest.uiEntities,
  };

  for (const [key, entry] of Object.entries(visualEntries)) {
    const role = policy[key]?.role;
    if (role === 'reference' || role === 'protected') {
      continue;
    }

    for (const assetPath of getEntryPaths(entry)) {
      assert.doesNotMatch(assetPath, darkFallbackRegex, `Visual binding should not retain a dark fallback path: ${key}`);
    }
  }
});

test('first-release scene binding targets do not use dungeon-family reference anchors', () => {
  const dungeonFamilyKeys = new Set(referenceKeys.filter((key) => key.startsWith('environment_dungeon_')));

  for (const [sceneName, binding] of Object.entries(bindingManifest.sceneBindings ?? {})) {
    for (const key of binding.worldTargets ?? []) {
      assert.equal(
        dungeonFamilyKeys.has(key),
        false,
        `${sceneName} should not keep dungeon-family reference key as a first-release world target: ${key}`,
      );
    }
  }
});

test('first-pass scenes do not hardcode banned dark-family texture strings', () => {
  for (const sceneRelPath of firstPassScenes) {
    const sceneAbsPath = path.join(projectRoot, sceneRelPath);
    const sceneText = fs.readFileSync(sceneAbsPath, 'utf-8');

    assert.doesNotMatch(
      sceneText,
      darkFamilyRegex,
      `First-pass scene should not include dark-family fallback identifiers: ${sceneRelPath}`,
    );
  }
});

test('first-pass scenes use a warm camera clear color instead of black letterbox fallback', () => {
  for (const sceneRelPath of firstPassScenes) {
    const sceneAbsPath = path.join(projectRoot, sceneRelPath);
    const scene = JSON.parse(fs.readFileSync(sceneAbsPath, 'utf-8'));
    const camera = scene.find((item) => item?.__type__ === 'cc.Camera');

    assert.ok(camera, `First-pass scene is missing a camera: ${sceneRelPath}`);
    assert.equal(camera._clearFlags, 7, `First-pass scene should clear color/depth/stencil: ${sceneRelPath}`);
    assert.deepEqual(
      camera._color,
      { __type__: 'cc.Color', r: 247, g: 242, b: 221, a: 255 },
      `First-pass scene should clear to warm cream, not black: ${sceneRelPath}`,
    );
  }
});

test('first-pass scenes do not show old all-caps debug labels as visible copy', () => {
  for (const sceneRelPath of firstPassScenes) {
    const sceneAbsPath = path.join(projectRoot, sceneRelPath);
    const sceneText = fs.readFileSync(sceneAbsPath, 'utf-8');

    for (const forbiddenLabel of forbiddenVisibleDebugLabels) {
      assert.equal(
        sceneText.includes(forbiddenLabel),
        false,
        `First-pass scene should not show old debug label "${forbiddenLabel}": ${sceneRelPath}`,
      );
    }
  }
});

test('first-pass scene labels stay localized instead of English debug copy', () => {
  for (const sceneRelPath of firstPassScenes) {
    for (const label of getSceneLabelStrings(sceneRelPath)) {
      assert.doesNotMatch(
        label,
        asciiWordLabelRegex,
        `First-pass scene label should not contain English/debug copy "${label}": ${sceneRelPath}`,
      );
    }
  }
});

test('first-pass world labels stay short and sparse like cute signposts, not debug instructions', () => {
  for (const sceneRelPath of firstPassScenes) {
    const sceneName = path.basename(sceneRelPath, '.scene');
    const worldLabels = getSceneWorldLabels(sceneRelPath);
    const budget = worldLabelBudgetByScene[sceneName];

    assert.equal(typeof budget, 'number', `Missing world label budget for first-pass scene: ${sceneName}`);
    assert.ok(
      worldLabels.length <= budget,
      `${sceneName} has ${worldLabels.length} world labels, over budget ${budget}: `
        + worldLabels.map((label) => `${label.nodePath}="${label.text}"`).join(', '),
    );

    for (const label of worldLabels) {
      assert.ok(
        [...label.text].length <= maxWorldLabelCharacters,
        `${sceneName} world label is too long for a cute signpost: ${label.nodePath}="${label.text}"`,
      );
    }
  }
});

test('first-pass world labels do not expose enemy AI behavior states as player-facing copy', () => {
  for (const sceneRelPath of firstPassScenes) {
    for (const label of getSceneWorldLabels(sceneRelPath)) {
      assert.equal(
        forbiddenWorldBehaviorLabels.includes(label.text),
        false,
        `Enemy/world label should describe a toy-like object or creature, not an AI behavior state: `
          + `${sceneRelPath} ${label.nodePath}="${label.text}"`,
      );
    }
  }
});

test('runtime HUD source does not rewrite cute labels back to old English debug copy', () => {
  const gameHudSource = fs.readFileSync(gameHudPath, 'utf-8');

  for (const forbiddenSnippet of [
    "[EchoId.Box]: 'Box'",
    "[EchoId.SpringFlower]: 'Flower'",
    "[EchoId.BombBug]: 'Bomb'",
    "[EchoId.Box]: 'BOX'",
    "[EchoId.SpringFlower]: 'FLOWER'",
    "[EchoId.BombBug]: 'BOMB'",
    'this.healthLabel.string = `HP ',
    'this.echoLabel.string = `Echo ',
    'this.checkpointLabel.string = `Check ',
    ": 'None'",
  ]) {
    assert.equal(
      gameHudSource.includes(forbiddenSnippet),
      false,
      `GameHud should not reintroduce old English debug HUD copy: ${forbiddenSnippet}`,
    );
  }
});

test('must-redo keys are not final-approved and do not rely on generated-path shortcuts', () => {
  const policy = gateConfig.keys;

  for (const key of mustRedoKeys) {
    const entry = getBindingEntry(key);
    assert.ok(entry, `Binding manifest is missing must-redo key: ${key}`);

    const paths = getEntryPaths(entry);
    const hasGeneratedPath = paths.some((assetPath) =>
      hasGeneratedPathPrefix(assetPath, gateConfig.aiAssetBoundary.generatedPathPrefixes ?? []),
    );

    assert.equal(policy[key].finalGateState, 'blocked-final');
    assert.equal(hasGeneratedPath, false, `Must-redo key should not hide behind a generated path: ${key}`);
  }
});

test('must-redo keys stay image-free until a reviewed cute sample is approved', () => {
  const sourceMarker = gateConfig.aiAssetBoundary.sourceMarker;

  for (const key of mustRedoKeys) {
    const entry = getBindingEntry(key);
    assert.ok(entry, `Binding manifest is missing must-redo key: ${key}`);

    assert.equal(entry.status, 'rect_visual_placeholder', `Must-redo key should remain a procedural placeholder before approval: ${key}`);
    assert.notEqual(entry.source, sourceMarker, `Must-redo key cannot be marked as AI-generated before approval: ${key}`);
    assert.equal(entry.selectedPath ?? '', '', `Must-redo key cannot bind candidate art before approval: ${key}`);
    assert.equal(entry.fallbackPath ?? '', '', `Must-redo key cannot fall back to candidate art before approval: ${key}`);
    assert.deepEqual(getEntryPaths(entry), [], `Must-redo key must stay image-free before reviewed cute art lands: ${key}`);
  }
});

test('protected and reference visual keys do not silently switch to generated assets', () => {
  const policy = gateConfig.keys;
  const generatedPathPrefixes = gateConfig.aiAssetBoundary.generatedPathPrefixes ?? [];
  const sourceMarker = gateConfig.aiAssetBoundary.sourceMarker;

  for (const key of [...protectedKeys, ...referenceKeys]) {
    const entry = getBindingEntry(key);
    assert.ok(entry, `Binding manifest is missing protected/reference key: ${key}`);

    const paths = getEntryPaths(entry);
    const hasGeneratedPath = paths.some((assetPath) => hasGeneratedPathPrefix(assetPath, generatedPathPrefixes));

    assert.ok(policy[key], `Style gate config is missing protected/reference key: ${key}`);
    assert.notEqual(entry?.source, sourceMarker, `Protected/reference key cannot be marked ai-generated: ${key}`);
    assert.equal(hasGeneratedPath, false, `Protected/reference key should not point at generated assets: ${key}`);
    assert.notEqual(
      policy[key].finalGateState,
      'final-approved',
      `Protected/reference key must never be treated as final-approved without review: ${key}`,
    );
  }
});
