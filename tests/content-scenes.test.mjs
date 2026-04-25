import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertComponentNodeReference,
  assertNodeActiveState,
  assertNodeExists,
  assertNodeHasComponent,
  getComponentRecordForNode,
  getScriptTypeId,
  readAssetJson,
} from './helpers/cocos-asset-test-utils.mjs';

test('StartCamp scene includes the first flow nodes', async () => {
  const items = await readAssetJson('assets/scenes/StartCamp.scene');

  const expectedNodes = [
    'Canvas',
    'PersistentRoot',
    'WorldRoot',
    'HudRoot',
    'TouchHudRoot',
    'Player',
    'Checkpoint-Camp',
    'Checkpoint-CampReturn',
    'CampPlate',
    'CampGate-Closed',
    'CampGate-Open',
    'Portal-FieldWest',
    'CampEnemy',
    'TouchPause',
    'PausePanel',
    'PauseContinue',
    'PauseRestart',
    'PauseCamp',
    'CampVictoryBanner',
    'CampVictoryHint',
    'CampVictoryController',
  ];

  for (const nodeName of expectedNodes) {
    assertNodeExists(items, nodeName);
  }
});

test('FieldWest scene includes the flower and ruins flow nodes', async () => {
  const items = await readAssetJson('assets/scenes/FieldWest.scene');

  const expectedNodes = [
    'Canvas',
    'PersistentRoot',
    'WorldRoot',
    'HudRoot',
    'TouchHudRoot',
    'Player',
    'Checkpoint-FieldWest',
    'Checkpoint-FieldWestReturn',
    'Portal-StartCamp',
    'Portal-FieldRuins',
    'EchoPickup-Flower-West',
    'Trap-West',
    'FieldEnemy',
  ];

  for (const nodeName of expectedNodes) {
    assertNodeExists(items, nodeName);
  }
});

test('FieldRuins scene includes the bomb and dungeon flow nodes', async () => {
  const items = await readAssetJson('assets/scenes/FieldRuins.scene');

  const expectedNodes = [
    'Canvas',
    'PersistentRoot',
    'WorldRoot',
    'HudRoot',
    'TouchHudRoot',
    'Player',
    'Checkpoint-FieldRuins',
    'Portal-FieldWestReturn',
    'Portal-DungeonHub',
    'EchoPickup-Bomb-Ruins',
    'RuinsWall-Closed',
    'RuinsWall-Open',
    'RuinsEnemy',
  ];

  for (const nodeName of expectedNodes) {
    assertNodeExists(items, nodeName);
  }
});

test('First-release checkpoint labels do not cover the player spawn', async () => {
  const sceneCheckpoints = [
    ['StartCamp', ['Checkpoint-Camp', 'Checkpoint-CampReturn']],
    ['FieldWest', ['Checkpoint-FieldWest', 'Checkpoint-FieldWestReturn']],
    ['FieldRuins', ['Checkpoint-FieldRuins']],
    ['DungeonHub', ['Checkpoint-DungeonHub']],
    ['DungeonRoomA', ['Checkpoint-DungeonRoomA']],
    ['DungeonRoomB', ['Checkpoint-DungeonRoomB']],
    ['DungeonRoomC', ['Checkpoint-DungeonRoomC']],
    ['BossArena', ['Checkpoint-BossArena']],
  ];

  for (const [sceneName, checkpointNames] of sceneCheckpoints) {
    const items = await readAssetJson(`assets/scenes/${sceneName}.scene`);
    const player = assertNodeExists(items, 'Player');
    const locatorBadge = assertNodeExists(items, 'PlayerLocatorBadge');
    assert.ok(
      player._children.some((child) => child.__id__ === items.indexOf(locatorBadge)),
      `${sceneName} Player should own the first-screen locator badge.`,
    );
    assert.ok(
      locatorBadge._lpos.y >= 48,
      `${sceneName} Player locator badge should sit above the player body for first-screen readability.`,
    );

    for (const checkpointName of checkpointNames) {
      const checkpoint = assertNodeExists(items, checkpointName);
      const visual = assertNodeExists(items, `${checkpointName}-Visual`);
      const label = assertNodeExists(items, `${checkpointName}-Label`);

      assert.ok(checkpoint._children.some((child) => child.__id__ === items.indexOf(visual)), `${checkpointName} should own its visual node.`);
      assert.ok(checkpoint._children.some((child) => child.__id__ === items.indexOf(label)), `${checkpointName} should own its label node.`);
      assert.ok(
        visual._lpos.y >= 52 && label._lpos.y >= 52,
        `${sceneName} ${checkpointName} visual children should sit above the checkpoint sensor so the player spawn stays visible.`,
      );
    }
  }
});

test('Content scenes wire the scene loader, portals, and formal hud', async () => {
  const startCampItems = await readAssetJson('assets/scenes/StartCamp.scene');
  const fieldWestItems = await readAssetJson('assets/scenes/FieldWest.scene');
  const fieldRuinsItems = await readAssetJson('assets/scenes/FieldRuins.scene');

  const sceneLoaderType = await getScriptTypeId('assets/scripts/core/SceneLoader.ts');
  const scenePortalType = await getScriptTypeId('assets/scripts/core/ScenePortal.ts');
  const gameHudType = await getScriptTypeId('assets/scripts/ui/GameHud.ts');
  const flagGateType = await getScriptTypeId('assets/scripts/core/FlagGateController.ts');
  const pauseMenuType = await getScriptTypeId('assets/scripts/ui/PauseMenuController.ts');
  const collectiblePresentationType = await getScriptTypeId('assets/scripts/visual/CollectiblePresentation.ts');
  const breakableTargetType = await getScriptTypeId('assets/scripts/puzzle/BreakableTarget.ts');
  const sceneMusicType = await getScriptTypeId('assets/scripts/audio/SceneMusicController.ts');
  const playerVisualType = await getScriptTypeId('assets/scripts/player/PlayerVisualController.ts');
  const enemyVisualType = await getScriptTypeId('assets/scripts/enemy/EnemyVisualController.ts');
  const checkpointMarkerType = await getScriptTypeId('assets/scripts/core/CheckpointMarker.ts');
  const sceneDressingSkinType = await getScriptTypeId('assets/scripts/visual/SceneDressingSkin.ts');
  const assetBindingTagType = await getScriptTypeId('assets/scripts/core/AssetBindingTag.ts');
  const rectVisualType = await getScriptTypeId('assets/scripts/visual/RectVisual.ts');

  const assertCandidatePreviewBinding = (items, nodeName, bindingKey, selectedPathPattern) => {
    assertNodeHasComponent(items, assertNodeExists(items, `${nodeName}-Visual`), rectVisualType, `${nodeName}-Visual`);
    const binding = getComponentRecordForNode(
      items,
      assertNodeExists(items, nodeName),
      assetBindingTagType,
      `${nodeName} AssetBindingTag`,
    );

    assert.equal(binding.bindingKey, bindingKey);
    assert.equal(binding.bindingStatus, 'candidate_preview');
    assert.match(binding.selectedPath, selectedPathPattern);
    assert.equal(binding.fallbackPath, '');
    assert.match(binding.sourceManifest, /asset_binding_candidate_manifest_image2/);
  };

  const startCanvas = assertNodeExists(startCampItems, 'Canvas');
  const startPersistentRoot = assertNodeExists(startCampItems, 'PersistentRoot');
  const startPortal = assertNodeExists(startCampItems, 'Portal-FieldWest');
  const startHudRoot = assertNodeExists(startCampItems, 'HudRoot');

  const fieldCanvas = assertNodeExists(fieldWestItems, 'Canvas');
  const fieldPersistentRoot = assertNodeExists(fieldWestItems, 'PersistentRoot');
  const fieldPortal = assertNodeExists(fieldWestItems, 'Portal-FieldRuins');
  const fieldHudRoot = assertNodeExists(fieldWestItems, 'HudRoot');

  const ruinsCanvas = assertNodeExists(fieldRuinsItems, 'Canvas');
  const ruinsPersistentRoot = assertNodeExists(fieldRuinsItems, 'PersistentRoot');
  const ruinsPortal = assertNodeExists(fieldRuinsItems, 'Portal-DungeonHub');
  const ruinsHudRoot = assertNodeExists(fieldRuinsItems, 'HudRoot');

  assertNodeHasComponent(startCampItems, startPersistentRoot, sceneLoaderType, 'StartCamp PersistentRoot');
  assertNodeHasComponent(startCampItems, startPersistentRoot, sceneMusicType, 'StartCamp PersistentRoot');
  assertNodeHasComponent(startCampItems, assertNodeExists(startCampItems, 'Player'), playerVisualType, 'StartCamp Player');
  assertNodeHasComponent(startCampItems, assertNodeExists(startCampItems, 'CampEnemy'), enemyVisualType, 'CampEnemy');
  assertNodeHasComponent(startCampItems, startPortal, scenePortalType, 'Portal-FieldWest');
  assertNodeHasComponent(startCampItems, startHudRoot, 'cc.UITransform', 'StartCamp HudRoot');
  assertNodeHasComponent(startCampItems, startHudRoot, 'cc.Widget', 'StartCamp HudRoot');
  assertNodeHasComponent(startCampItems, startHudRoot, 'cc.SafeArea', 'StartCamp HudRoot');
  assertNodeHasComponent(startCampItems, startHudRoot, gameHudType, 'StartCamp HudRoot');
  assertNodeHasComponent(startCampItems, startHudRoot, pauseMenuType, 'StartCamp HudRoot');
  assertNodeHasComponent(
    startCampItems,
    assertNodeExists(startCampItems, 'TouchHudRoot'),
    'cc.SafeArea',
    'StartCamp TouchHudRoot',
  );
  assertNodeHasComponent(startCampItems, assertNodeExists(startCampItems, 'CampVictoryController'), flagGateType, 'CampVictoryController');
  assertNodeHasComponent(startCampItems, assertNodeExists(startCampItems, 'CampBackdrop'), sceneDressingSkinType, 'CampBackdrop');
  assertNodeHasComponent(startCampItems, assertNodeExists(startCampItems, 'CampTopLane'), sceneDressingSkinType, 'CampTopLane');
  assertNodeHasComponent(startCampItems, assertNodeExists(startCampItems, 'CampPath-1'), sceneDressingSkinType, 'CampPath-1');
  assertNodeHasComponent(startCampItems, assertNodeExists(startCampItems, 'CampWall-Lintel'), sceneDressingSkinType, 'CampWall-Lintel');
  const checkpointCamp = getComponentRecordForNode(
    startCampItems,
    assertNodeExists(startCampItems, 'Checkpoint-Camp'),
    checkpointMarkerType,
    'Checkpoint-Camp',
  );
  const startPlayerVisual = getComponentRecordForNode(
    startCampItems,
    assertNodeExists(startCampItems, 'Player'),
    playerVisualType,
    'StartCamp PlayerVisualController',
  );
  const startEnemyVisual = getComponentRecordForNode(
    startCampItems,
    assertNodeExists(startCampItems, 'CampEnemy'),
    enemyVisualType,
    'CampEnemy VisualController',
  );
  assert.equal(checkpointCamp.visualSpriteFrame, null, 'Checkpoint-Camp should currently rely on a texture-backed candidate preview.');
  assert.ok(checkpointCamp.visualTexture?.__uuid__, 'Checkpoint-Camp should bind a texture-backed candidate preview.');
  assertCandidatePreviewBinding(startCampItems, 'Checkpoint-Camp', 'checkpoint', /assets\/art\/generated\/image2-preview\/checkpoint\/checkpoint_v00\.png$/);
  assert.ok(startPlayerVisual.idleTexture?.__uuid__, 'StartCamp player should bind a texture-backed visual.');
  assert.ok(startEnemyVisual.idleTexture?.__uuid__, 'CampEnemy should currently bind a texture-backed candidate preview.');
  assertCandidatePreviewBinding(startCampItems, 'CampEnemy', 'common_enemy', /assets\/art\/generated\/image2-preview\/common_enemy\/common_enemy_v00\.png$/);
  const startPortalRecord = getComponentRecordForNode(startCampItems, startPortal, scenePortalType, 'Portal-FieldWest');
  assert.equal(startPortalRecord.visualSpriteFrame, null, 'Portal-FieldWest should currently rely on a texture-backed candidate preview.');
  assert.ok(startPortalRecord.visualTexture?.__uuid__, 'Portal-FieldWest should bind a texture-backed candidate preview.');
  assertCandidatePreviewBinding(startCampItems, 'Portal-FieldWest', 'portal', /assets\/art\/generated\/image2-preview\/portal\/portal_v00\.png$/);
  const campBackdropBinding = getComponentRecordForNode(
    startCampItems,
    assertNodeExists(startCampItems, 'CampBackdrop'),
    assetBindingTagType,
    'CampBackdrop AssetBindingTag',
  );
  const campBackdropTransform = getComponentRecordForNode(
    startCampItems,
    assertNodeExists(startCampItems, 'CampBackdrop'),
    'cc.UITransform',
    'CampBackdrop UITransform',
  );
  const campPath0Skin = getComponentRecordForNode(
    startCampItems,
    assertNodeExists(startCampItems, 'CampPath-0'),
    sceneDressingSkinType,
    'CampPath-0 SceneDressingSkin',
  );
  const campPath1Skin = getComponentRecordForNode(
    startCampItems,
    assertNodeExists(startCampItems, 'CampPath-1'),
    sceneDressingSkinType,
    'CampPath-1 SceneDressingSkin',
  );
  assert.equal(campBackdropBinding.bindingKey, 'outdoor_ground_flowers');
  assert.ok(campBackdropTransform._contentSize.width >= 2200, 'CampBackdrop should overscan the initial mobile frame instead of revealing the flat clear color at the left edge.');
  assert.equal(campPath0Skin.tiled, true, 'CampPath-0 should stay tiled as a ground surface.');
  assert.equal(campPath0Skin.maskShape, 2, 'CampPath-0 should use the ellipse ground mask.');
  assert.notEqual(assertNodeExists(startCampItems, 'CampPath-0')._euler.z, 0, 'CampPath-0 should tilt so the route enters frame like spread ground, not a straight slab.');
  assert.equal(campPath1Skin.tiled, true, 'CampPath-1 should stay tiled as a ground surface.');
  assert.equal(campPath1Skin.maskShape, 2, 'CampPath-1 should use an ellipse mask so the cobble patch no longer renders as a hard rectangle.');
  assert.notEqual(assertNodeExists(startCampItems, 'CampPath-1')._euler.z, 0, 'CampPath-1 should rotate to break the slab-like read.');

  assertNodeHasComponent(fieldWestItems, fieldPersistentRoot, sceneLoaderType, 'FieldWest PersistentRoot');
  assertNodeHasComponent(fieldWestItems, fieldPersistentRoot, sceneMusicType, 'FieldWest PersistentRoot');
  assertNodeHasComponent(fieldWestItems, assertNodeExists(fieldWestItems, 'Player'), playerVisualType, 'FieldWest Player');
  assertNodeHasComponent(fieldWestItems, assertNodeExists(fieldWestItems, 'FieldEnemy'), enemyVisualType, 'FieldEnemy');
  assertNodeHasComponent(fieldWestItems, fieldPortal, scenePortalType, 'Portal-FieldRuins');
  assertNodeHasComponent(fieldWestItems, fieldHudRoot, 'cc.SafeArea', 'FieldWest HudRoot');
  assertNodeHasComponent(fieldWestItems, fieldHudRoot, gameHudType, 'FieldWest HudRoot');
  assertNodeHasComponent(fieldWestItems, assertNodeExists(fieldWestItems, 'FieldBackdrop'), sceneDressingSkinType, 'FieldBackdrop');
  assertNodeHasComponent(fieldWestItems, assertNodeExists(fieldWestItems, 'FieldTopStrip'), sceneDressingSkinType, 'FieldTopStrip');
  assertNodeHasComponent(fieldWestItems, assertNodeExists(fieldWestItems, 'FieldPath-1'), sceneDressingSkinType, 'FieldPath-1');
  assertNodeHasComponent(fieldWestItems, assertNodeExists(fieldWestItems, 'FieldPath-4'), sceneDressingSkinType, 'FieldPath-4');
  assertNodeHasComponent(fieldWestItems, assertNodeExists(fieldWestItems, 'Trap-West'), sceneDressingSkinType, 'Trap-West');
  assertCandidatePreviewBinding(fieldWestItems, 'Checkpoint-FieldWest', 'checkpoint', /assets\/art\/generated\/image2-preview\/checkpoint\/checkpoint_v00\.png$/);
  assertCandidatePreviewBinding(fieldWestItems, 'Checkpoint-FieldWestReturn', 'checkpoint', /assets\/art\/generated\/image2-preview\/checkpoint\/checkpoint_v00\.png$/);
  assertCandidatePreviewBinding(fieldWestItems, 'Portal-StartCamp', 'portal', /assets\/art\/generated\/image2-preview\/portal\/portal_v00\.png$/);
  assertCandidatePreviewBinding(fieldWestItems, 'Portal-FieldRuins', 'portal', /assets\/art\/generated\/image2-preview\/portal\/portal_v00\.png$/);
  assertNodeHasComponent(
    fieldWestItems,
    assertNodeExists(fieldWestItems, 'EchoPickup-Flower-West'),
    collectiblePresentationType,
    'EchoPickup-Flower-West',
  );
  const fieldBackdropBinding = getComponentRecordForNode(
    fieldWestItems,
    assertNodeExists(fieldWestItems, 'FieldBackdrop'),
    assetBindingTagType,
    'FieldBackdrop AssetBindingTag',
  );
  const fieldBackdropTransform = getComponentRecordForNode(
    fieldWestItems,
    assertNodeExists(fieldWestItems, 'FieldBackdrop'),
    'cc.UITransform',
    'FieldBackdrop UITransform',
  );
  const fieldEnemyVisual = getComponentRecordForNode(
    fieldWestItems,
    assertNodeExists(fieldWestItems, 'FieldEnemy'),
    enemyVisualType,
    'FieldEnemy VisualController',
  );
  const fieldPath0Skin = getComponentRecordForNode(
    fieldWestItems,
    assertNodeExists(fieldWestItems, 'FieldPath-0'),
    sceneDressingSkinType,
    'FieldPath-0 SceneDressingSkin',
  );
  const fieldPath1Skin = getComponentRecordForNode(
    fieldWestItems,
    assertNodeExists(fieldWestItems, 'FieldPath-1'),
    sceneDressingSkinType,
    'FieldPath-1 SceneDressingSkin',
  );
  const trapWestSkin = getComponentRecordForNode(
    fieldWestItems,
    assertNodeExists(fieldWestItems, 'Trap-West'),
    sceneDressingSkinType,
    'Trap-West SceneDressingSkin',
  );
  assert.equal(fieldBackdropBinding.bindingKey, 'outdoor_ground_flowers');
  assert.ok(fieldBackdropTransform._contentSize.width >= 2400, 'FieldBackdrop should overscan the opening mobile view instead of exposing the neutral clear color.');
  assert.equal(fieldEnemyVisual.idleSpriteFrame, null, 'FieldEnemy should currently rely on a texture-backed candidate preview.');
  assert.ok(fieldEnemyVisual.idleTexture?.__uuid__, 'FieldEnemy should currently bind a texture-backed candidate preview.');
  assert.equal(fieldPath0Skin.tiled, true, 'FieldPath-0 should stay tiled as a ground surface.');
  assert.equal(fieldPath0Skin.maskShape, 2, 'FieldPath-0 should use an ellipse mask so the route enters frame as spread ground.');
  assert.notEqual(assertNodeExists(fieldWestItems, 'FieldPath-0')._euler.z, 0, 'FieldPath-0 should rotate to avoid a straight-edged slab read.');
  assert.equal(fieldPath1Skin.tiled, true, 'FieldPath-1 should stay tiled as a ground surface.');
  assert.equal(fieldPath1Skin.maskShape, 2, 'FieldPath-1 should use an ellipse mask so the path reads as spread ground instead of a cropped slab.');
  assert.notEqual(assertNodeExists(fieldWestItems, 'FieldPath-1')._euler.z, 0, 'FieldPath-1 should rotate to avoid a placeholder-like straight-edged panel read.');
  assert.equal(trapWestSkin.tiled, false, 'Trap-West should stay object-like rather than tiled like a floor.');
  assert.equal(trapWestSkin.fitMode, 2, 'Trap-West should cover-crop into its prop footprint.');
  assert.equal(trapWestSkin.verticalAnchor, 1, 'Trap-West should anchor to the bottom so the wall body sits on the ground.');
  assert.equal(trapWestSkin.maskShape ?? 0, 3, 'Trap-West should use a rounded prop mask instead of the ground ellipse or a hard rect crop.');
  assert.ok((trapWestSkin.maskCornerRadius ?? 0) >= 18, 'Trap-West should expose a visible rounded prop silhouette.');
  assertCandidatePreviewBinding(fieldWestItems, 'FieldEnemy', 'common_enemy', /assets\/art\/generated\/image2-preview\/common_enemy\/common_enemy_v00\.png$/);
  assertNodeHasComponent(
    fieldWestItems,
    assertNodeExists(fieldWestItems, 'TouchHudRoot'),
    'cc.SafeArea',
    'FieldWest TouchHudRoot',
  );

  assertNodeHasComponent(fieldRuinsItems, ruinsPersistentRoot, sceneLoaderType, 'FieldRuins PersistentRoot');
  assertNodeHasComponent(fieldRuinsItems, ruinsPersistentRoot, sceneMusicType, 'FieldRuins PersistentRoot');
  assertNodeHasComponent(fieldRuinsItems, assertNodeExists(fieldRuinsItems, 'Player'), playerVisualType, 'FieldRuins Player');
  assertNodeHasComponent(fieldRuinsItems, assertNodeExists(fieldRuinsItems, 'RuinsEnemy'), enemyVisualType, 'RuinsEnemy');
  assertNodeHasComponent(fieldRuinsItems, ruinsPortal, scenePortalType, 'Portal-DungeonPreview');
  assertNodeHasComponent(fieldRuinsItems, ruinsHudRoot, 'cc.SafeArea', 'FieldRuins HudRoot');
  assertNodeHasComponent(fieldRuinsItems, ruinsHudRoot, gameHudType, 'FieldRuins HudRoot');
  const ruinsWallClosed = assertNodeExists(fieldRuinsItems, 'RuinsWall-Closed');
  const ruinsWallOpen = assertNodeExists(fieldRuinsItems, 'RuinsWall-Open');
  assertNodeHasComponent(fieldRuinsItems, assertNodeExists(fieldRuinsItems, 'RuinsBackdrop'), sceneDressingSkinType, 'RuinsBackdrop');
  assertNodeHasComponent(fieldRuinsItems, assertNodeExists(fieldRuinsItems, 'RuinsFlowerGround-1'), sceneDressingSkinType, 'RuinsFlowerGround-1');
  assertNodeHasComponent(fieldRuinsItems, assertNodeExists(fieldRuinsItems, 'RuinsWallCracked-Lintel'), sceneDressingSkinType, 'RuinsWallCracked-Lintel');
  assertNodeHasComponent(fieldRuinsItems, assertNodeExists(fieldRuinsItems, 'RuinsWallBroken-Lintel'), sceneDressingSkinType, 'RuinsWallBroken-Lintel');
  assertNodeHasComponent(fieldRuinsItems, ruinsWallClosed, sceneDressingSkinType, 'RuinsWall-Closed');
  assertCandidatePreviewBinding(fieldRuinsItems, 'Checkpoint-FieldRuins', 'checkpoint', /assets\/art\/generated\/image2-preview\/checkpoint\/checkpoint_v00\.png$/);
  assertCandidatePreviewBinding(fieldRuinsItems, 'Portal-FieldWestReturn', 'portal', /assets\/art\/generated\/image2-preview\/portal\/portal_v00\.png$/);
  assertCandidatePreviewBinding(fieldRuinsItems, 'Portal-DungeonHub', 'portal', /assets\/art\/generated\/image2-preview\/portal\/portal_v00\.png$/);
  assertNodeHasComponent(
    fieldRuinsItems,
    assertNodeExists(fieldRuinsItems, 'EchoPickup-Bomb-Ruins'),
    collectiblePresentationType,
    'EchoPickup-Bomb-Ruins',
  );
  const ruinsBackdropBinding = getComponentRecordForNode(
    fieldRuinsItems,
    assertNodeExists(fieldRuinsItems, 'RuinsBackdrop'),
    assetBindingTagType,
    'RuinsBackdrop AssetBindingTag',
  );
  const ruinsEnemyVisual = getComponentRecordForNode(
    fieldRuinsItems,
    assertNodeExists(fieldRuinsItems, 'RuinsEnemy'),
    enemyVisualType,
    'RuinsEnemy VisualController',
  );
  const ruinsFlowerGround1Skin = getComponentRecordForNode(
    fieldRuinsItems,
    assertNodeExists(fieldRuinsItems, 'RuinsFlowerGround-1'),
    sceneDressingSkinType,
    'RuinsFlowerGround-1 SceneDressingSkin',
  );
  assert.equal(ruinsBackdropBinding.bindingKey, 'outdoor_path_cobble');
  assert.equal(ruinsEnemyVisual.idleSpriteFrame, null, 'RuinsEnemy should currently rely on a texture-backed candidate preview.');
  assert.ok(ruinsEnemyVisual.idleTexture?.__uuid__, 'RuinsEnemy should currently bind a texture-backed candidate preview.');
  assert.equal(ruinsFlowerGround1Skin.maskShape, 2, 'RuinsFlowerGround-1 should use the ellipse ground mask so flower patches read as spread terrain.');
  assert.notEqual(assertNodeExists(fieldRuinsItems, 'RuinsFlowerGround-1')._euler.z, 0, 'RuinsFlowerGround-1 should rotate to avoid a flat rectangular patch read.');
  assertCandidatePreviewBinding(fieldRuinsItems, 'RuinsEnemy', 'common_enemy', /assets\/art\/generated\/image2-preview\/common_enemy\/common_enemy_v00\.png$/);
  const ruinsBreakable = getComponentRecordForNode(fieldRuinsItems, ruinsWallClosed, breakableTargetType, 'RuinsWall-Closed');
  assertComponentNodeReference(fieldRuinsItems, ruinsBreakable, 'intactVisualNode', ruinsWallClosed, 'RuinsWall-Closed BreakableTarget');
  assertComponentNodeReference(fieldRuinsItems, ruinsBreakable, 'brokenVisualNode', ruinsWallOpen, 'RuinsWall-Closed BreakableTarget');
  const campMusic = getComponentRecordForNode(startCampItems, startPersistentRoot, sceneMusicType, 'StartCamp SceneMusicController');
  const fieldMusic = getComponentRecordForNode(fieldWestItems, fieldPersistentRoot, sceneMusicType, 'FieldWest SceneMusicController');
  const ruinsMusic = getComponentRecordForNode(fieldRuinsItems, ruinsPersistentRoot, sceneMusicType, 'FieldRuins SceneMusicController');
  assert.equal(campMusic.musicCueId, 'camp');
  assert.equal(fieldMusic.musicCueId, 'field-west');
  assert.equal(ruinsMusic.musicCueId, 'field-ruins');
  assertNodeHasComponent(
    fieldRuinsItems,
    assertNodeExists(fieldRuinsItems, 'TouchHudRoot'),
    'cc.SafeArea',
    'FieldRuins TouchHudRoot',
  );
});

test('StartCamp gate begins closed and later scenes expose the right open paths', async () => {
  const startCampItems = await readAssetJson('assets/scenes/StartCamp.scene');
  const fieldWestItems = await readAssetJson('assets/scenes/FieldWest.scene');
  const fieldRuinsItems = await readAssetJson('assets/scenes/FieldRuins.scene');

  const campGateClosed = assertNodeExists(startCampItems, 'CampGate-Closed');
  const campGateOpen = assertNodeExists(startCampItems, 'CampGate-Open');
  const campPortal = assertNodeExists(startCampItems, 'Portal-FieldWest');
  const touchPause = assertNodeExists(startCampItems, 'TouchPause');
  const pausePanel = assertNodeExists(startCampItems, 'PausePanel');
  const campVictoryBanner = assertNodeExists(startCampItems, 'CampVictoryBanner');
  const campVictoryHint = assertNodeExists(startCampItems, 'CampVictoryHint');
  const fieldPortalBack = assertNodeExists(fieldWestItems, 'Portal-StartCamp');
  const fieldRuinsPortal = assertNodeExists(fieldWestItems, 'Portal-FieldRuins');
  const ruinsPortalBack = assertNodeExists(fieldRuinsItems, 'Portal-FieldWestReturn');
  const ruinsWallClosed = assertNodeExists(fieldRuinsItems, 'RuinsWall-Closed');
  const ruinsWallOpen = assertNodeExists(fieldRuinsItems, 'RuinsWall-Open');
  const dungeonPortal = assertNodeExists(fieldRuinsItems, 'Portal-DungeonHub');

  assertNodeActiveState(campGateClosed, true);
  assertNodeActiveState(campGateOpen, false);
  assertNodeActiveState(campPortal, false);
  assertNodeActiveState(touchPause, true);
  assertNodeActiveState(pausePanel, false);
  assertNodeActiveState(campVictoryBanner, false);
  assertNodeActiveState(campVictoryHint, false);
  assertNodeActiveState(fieldPortalBack, true);
  assertNodeActiveState(fieldRuinsPortal, true);
  assertNodeActiveState(ruinsPortalBack, true);
  assertNodeActiveState(ruinsWallClosed, true);
  assertNodeActiveState(ruinsWallOpen, false);
  assertNodeActiveState(dungeonPortal, false);

  const campPlayers = startCampItems.filter((item) => item?.__type__ === 'cc.Node' && item._name === 'Player');
  const fieldPlayers = fieldWestItems.filter((item) => item?.__type__ === 'cc.Node' && item._name === 'Player');
  const ruinsPlayers = fieldRuinsItems.filter((item) => item?.__type__ === 'cc.Node' && item._name === 'Player');
  assert.equal(campPlayers.length, 1);
  assert.equal(fieldPlayers.length, 1);
  assert.equal(ruinsPlayers.length, 1);
});
