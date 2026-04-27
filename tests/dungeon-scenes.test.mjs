import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertComponentNodeReference,
  assertNodeActiveState,
  assertNodeExists,
  assertNodeHasComponent,
  getComponentRecordForNode,
  getComponentTypesForNode,
  getScriptTypeId,
  readAssetJson,
} from './helpers/cocos-asset-test-utils.mjs';

function assertNodeParent(items, nodeRecord, expectedParentRecord, label) {
  assert.ok(
    nodeRecord._parent && typeof nodeRecord._parent.__id__ === 'number',
    `Expected node "${label ?? nodeRecord._name}" to have a parent reference.`,
  );
  assert.equal(
    items[nodeRecord._parent.__id__],
    expectedParentRecord,
    `Expected node "${label ?? nodeRecord._name}" to be parented to "${expectedParentRecord._name}".`,
  );
}

function assertNodeLabelText(items, nodeName, expectedText) {
  const labelNode = assertNodeExists(items, `${nodeName}-Label`);
  const label = getComponentRecordForNode(items, labelNode, 'cc.Label', `${nodeName} Label`);
  assert.equal(label._string, expectedText, `Expected node "${nodeName}" label text to be "${expectedText}".`);
}

function assertComponentReference(items, componentRecord, propertyName, targetComponentRecord, label) {
  const reference = componentRecord?.[propertyName];
  assert.ok(
    reference && typeof reference.__id__ === 'number',
    `Expected component "${label}" to contain a component reference in "${propertyName}".`,
  );
  assert.equal(
    items[reference.__id__],
    targetComponentRecord,
    `Expected component "${label}" property "${propertyName}" to reference "${targetComponentRecord?.__type__}".`,
  );
}

function assertNodeReferenceList(items, componentRecord, propertyName, expectedNodeRecords, label) {
  const references = componentRecord?.[propertyName];
  assert.ok(Array.isArray(references), `Expected component "${label}" property "${propertyName}" to be a node reference array.`);
  assert.deepEqual(
    references.map((reference) => items[reference.__id__]),
    expectedNodeRecords,
    `Expected component "${label}" property "${propertyName}" to reference the expected node list.`,
  );
}

function assertSceneDoesNotContainText(items, text, label) {
  assert.ok(
    !JSON.stringify(items).includes(text),
    `Expected scene to not contain "${text}" (${label}).`,
  );
}

function assertNodeMissing(items, nodeName) {
  assert.throws(() => assertNodeExists(items, nodeName), `Expected scene to not contain node "${nodeName}".`);
}

test('DungeonHub scene includes room portals and the locked boss gate', async () => {
  const items = await readAssetJson('assets/scenes/DungeonHub.scene');

  const expectedNodes = [
    'Canvas',
    'PersistentRoot',
    'WorldRoot',
    'HudRoot',
    'TouchHudRoot',
    'Player',
    'Checkpoint-DungeonHub',
    'Portal-FieldRuinsReturn',
    'Portal-DungeonRoomA',
    'Portal-DungeonRoomB',
    'Portal-DungeonRoomC',
    'RoomA-StatusPending',
    'RoomA-StatusDone',
    'RoomB-StatusPending',
    'RoomB-StatusDone',
    'RoomC-StatusPending',
    'RoomC-StatusDone',
    'BossGate-Closed',
    'BossGate-Open',
    'Portal-BossArena',
    'BossGateController',
  ];

  for (const nodeName of expectedNodes) {
    assertNodeExists(items, nodeName);
  }
});

test('Dungeon rooms and boss arena include their key progression nodes', async () => {
  const roomA = await readAssetJson('assets/scenes/DungeonRoomA.scene');
  const roomB = await readAssetJson('assets/scenes/DungeonRoomB.scene');
  const roomC = await readAssetJson('assets/scenes/DungeonRoomC.scene');
  const bossArena = await readAssetJson('assets/scenes/BossArena.scene');

  [
    ['DungeonRoomA', roomA, ['RoomA-Plate', 'RoomA-GateClosed', 'RoomA-GateBarrier', 'RoomA-ClearRelic', 'Portal-DungeonHubReturn-A']],
    ['DungeonRoomB', roomB, ['RoomB-Trap', 'RoomB-GapHazard', 'RoomB-TopBarrier', 'RoomB-BottomBarrier', 'RoomB-ClearRelic', 'Portal-DungeonHubReturn-B']],
    ['DungeonRoomC', roomC, ['RoomC-WallClosed', 'RoomC-WallBarrier', 'RoomC-TopBarrier', 'RoomC-BottomBarrier', 'RoomC-ClearRelic', 'Portal-DungeonHubReturn-C']],
    ['BossArena', bossArena, ['BossEnemy-Core', 'BossShield-Closed', 'BossShield-Open', 'BossWindowBanner', 'BossVictoryBanner', 'Portal-BossVictory', 'BossEncounterControllerNode', 'BossShieldControllerNode']],
  ].forEach(([, items, nodeNames]) => {
    for (const nodeName of nodeNames) {
      assertNodeExists(items, nodeName);
    }
  });
});

test('Dungeon scenes wire the progress and boss control scripts', async () => {
  const hubItems = await readAssetJson('assets/scenes/DungeonHub.scene');
  const roomAItems = await readAssetJson('assets/scenes/DungeonRoomA.scene');
  const roomBItems = await readAssetJson('assets/scenes/DungeonRoomB.scene');
  const roomCItems = await readAssetJson('assets/scenes/DungeonRoomC.scene');
  const bossArenaItems = await readAssetJson('assets/scenes/BossArena.scene');

  const flagGateType = await getScriptTypeId('assets/scripts/core/FlagGateController.ts');
  const progressPickupType = await getScriptTypeId('assets/scripts/core/ProgressFlagPickup.ts');
  const breakableTargetType = await getScriptTypeId('assets/scripts/puzzle/BreakableTarget.ts');
  const barrierZoneType = await getScriptTypeId('assets/scripts/puzzle/PlayerBarrierZone.ts');
  const respawnZoneType = await getScriptTypeId('assets/scripts/puzzle/PlayerRespawnZone.ts');
  const bossControllerType = await getScriptTypeId('assets/scripts/boss/BossEncounterController.ts');
  const bossShieldType = await getScriptTypeId('assets/scripts/boss/BossShieldPhaseController.ts');
  const collectiblePresentationType = await getScriptTypeId('assets/scripts/visual/CollectiblePresentation.ts');
  const sceneMusicType = await getScriptTypeId('assets/scripts/audio/SceneMusicController.ts');
  const sceneDressingSkinType = await getScriptTypeId('assets/scripts/visual/SceneDressingSkin.ts');
  const rectVisualType = await getScriptTypeId('assets/scripts/visual/RectVisual.ts');
  const playerVisualType = await getScriptTypeId('assets/scripts/player/PlayerVisualController.ts');
  const enemyVisualType = await getScriptTypeId('assets/scripts/enemy/EnemyVisualController.ts');
  const bossVisualType = await getScriptTypeId('assets/scripts/boss/BossVisualController.ts');
  const healthComponentType = await getScriptTypeId('assets/scripts/combat/HealthComponent.ts');
  const enemyAIType = await getScriptTypeId('assets/scripts/enemy/EnemyAI.ts');
  const damageOnContactType = await getScriptTypeId('assets/scripts/combat/DamageOnContact.ts');
  const assetBindingTagType = await getScriptTypeId('assets/scripts/core/AssetBindingTag.ts');

  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'BossGateController'), flagGateType, 'BossGateController');
  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'PersistentRoot'), sceneMusicType, 'DungeonHub PersistentRoot');
  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'Player'), playerVisualType, 'DungeonHub Player');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'PersistentRoot'), sceneMusicType, 'DungeonRoomA PersistentRoot');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'Player'), playerVisualType, 'DungeonRoomA Player');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomABackdrop'), sceneDressingSkinType, 'DungeonRoomA RoomABackdrop');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomAChallengeZone'), sceneDressingSkinType, 'DungeonRoomA RoomAChallengeZone');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomA-GateClosed'), sceneDressingSkinType, 'DungeonRoomA RoomA-GateClosed');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'PersistentRoot'), sceneMusicType, 'DungeonRoomB PersistentRoot');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'Player'), playerVisualType, 'DungeonRoomB Player');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomBBackdrop'), sceneDressingSkinType, 'DungeonRoomB RoomBBackdrop');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomBTrapLane'), sceneDressingSkinType, 'DungeonRoomB RoomBTrapLane');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomBLandingZone'), sceneDressingSkinType, 'DungeonRoomB RoomBLandingZone');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-Trap'), sceneDressingSkinType, 'DungeonRoomB RoomB-Trap');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'PersistentRoot'), sceneMusicType, 'DungeonRoomC PersistentRoot');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'Player'), playerVisualType, 'DungeonRoomC Player');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomCBackdrop'), sceneDressingSkinType, 'DungeonRoomC RoomCBackdrop');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomCBombZone'), sceneDressingSkinType, 'DungeonRoomC RoomCBombZone');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-WallClosed'), sceneDressingSkinType, 'DungeonRoomC RoomC-WallClosed');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'PersistentRoot'), sceneMusicType, 'BossArena PersistentRoot');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'Player'), playerVisualType, 'BossArena Player');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'BossEnemy-Core'), bossVisualType, 'BossArena BossEnemy-Core');
  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'RoomA-StatusController'), flagGateType, 'RoomA-StatusController');
  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'RoomB-StatusController'), flagGateType, 'RoomB-StatusController');
  assertNodeHasComponent(hubItems, assertNodeExists(hubItems, 'RoomC-StatusController'), flagGateType, 'RoomC-StatusController');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomA-ClearRelic'), progressPickupType, 'RoomA-ClearRelic');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomA-ClearRelic'), collectiblePresentationType, 'RoomA-ClearRelic');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomA-ClearRelic'), assetBindingTagType, 'RoomA-ClearRelic');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomA-Enemy'), enemyVisualType, 'RoomA-Enemy');
  assertNodeHasComponent(roomAItems, assertNodeExists(roomAItems, 'RoomA-GateBarrier'), barrierZoneType, 'RoomA-GateBarrier');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-TopBarrier'), barrierZoneType, 'RoomB-TopBarrier');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-BottomBarrier'), barrierZoneType, 'RoomB-BottomBarrier');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-GapHazard'), respawnZoneType, 'RoomB-GapHazard');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-ClearRelic'), collectiblePresentationType, 'RoomB-ClearRelic');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-ClearRelic'), assetBindingTagType, 'RoomB-ClearRelic');
  assertNodeHasComponent(roomBItems, assertNodeExists(roomBItems, 'RoomB-Enemy'), enemyVisualType, 'RoomB-Enemy');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-TopBarrier'), barrierZoneType, 'RoomC-TopBarrier');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-BottomBarrier'), barrierZoneType, 'RoomC-BottomBarrier');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-WallBarrier'), barrierZoneType, 'RoomC-WallBarrier');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-WallClosed'), breakableTargetType, 'RoomC-WallClosed');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-ClearRelic'), collectiblePresentationType, 'RoomC-ClearRelic');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-ClearRelic'), assetBindingTagType, 'RoomC-ClearRelic');
  assertNodeHasComponent(roomCItems, assertNodeExists(roomCItems, 'RoomC-Enemy'), enemyVisualType, 'RoomC-Enemy');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'BossShield-Closed'), breakableTargetType, 'BossShield-Closed');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'BossEnemy-Core'), assetBindingTagType, 'BossEnemy-Core');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'BossShield-Closed'), assetBindingTagType, 'BossShield-Closed');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'BossEncounterControllerNode'), bossControllerType, 'BossEncounterControllerNode');
  assertNodeHasComponent(bossArenaItems, assertNodeExists(bossArenaItems, 'BossShieldControllerNode'), bossShieldType, 'BossShieldControllerNode');

  const roomCWallClosed = assertNodeExists(roomCItems, 'RoomC-WallClosed');
  const roomCWallOpen = assertNodeExists(roomCItems, 'RoomC-WallOpen');
  const roomCBreakable = getComponentRecordForNode(roomCItems, roomCWallClosed, breakableTargetType, 'RoomC-WallClosed');
  assertComponentNodeReference(roomCItems, roomCBreakable, 'intactVisualNode', roomCWallClosed, 'RoomC-WallClosed BreakableTarget');
  assertComponentNodeReference(roomCItems, roomCBreakable, 'brokenVisualNode', roomCWallOpen, 'RoomC-WallClosed BreakableTarget');

  const bossShieldClosed = assertNodeExists(bossArenaItems, 'BossShield-Closed');
  const bossShieldOpen = assertNodeExists(bossArenaItems, 'BossShield-Open');
  const bossShieldBreakable = getComponentRecordForNode(bossArenaItems, bossShieldClosed, breakableTargetType, 'BossShield-Closed');
  assertComponentNodeReference(bossArenaItems, bossShieldBreakable, 'intactVisualNode', bossShieldClosed, 'BossShield-Closed BreakableTarget');
  assertComponentNodeReference(bossArenaItems, bossShieldBreakable, 'brokenVisualNode', bossShieldOpen, 'BossShield-Closed BreakableTarget');
  const bossCore = assertNodeExists(bossArenaItems, 'BossEnemy-Core');
  const bossCoreVisual = assertNodeExists(bossArenaItems, 'BossEnemy-Core-Visual');
  const bossCoreInner = assertNodeExists(bossArenaItems, 'BossEnemy-Core-Inner');
  const bossCoreOrb = assertNodeExists(bossArenaItems, 'BossEnemy-Core-Orb');
  const bossCoreBase = assertNodeExists(bossArenaItems, 'BossEnemy-Core-Base');
  const bossCoreEyeLeft = assertNodeExists(bossArenaItems, 'BossEnemy-Core-EyeLeft');
  const bossCoreEyeRight = assertNodeExists(bossArenaItems, 'BossEnemy-Core-EyeRight');
  const bossCoreShine = assertNodeExists(bossArenaItems, 'BossEnemy-Core-Shine');
  const bossExitPortal = assertNodeExists(bossArenaItems, 'Portal-BossVictory');
  const bossStatusBanner = assertNodeExists(bossArenaItems, 'BossStatusBanner');
  const bossWindowBanner = assertNodeExists(bossArenaItems, 'BossWindowBanner');
  const bossVictoryBanner = assertNodeExists(bossArenaItems, 'BossVictoryBanner');
  const bossVisualController = getComponentRecordForNode(bossArenaItems, bossCore, bossVisualType, 'BossEnemy-Core');
  const bossHealth = getComponentRecordForNode(bossArenaItems, bossCore, healthComponentType, 'BossEnemy-Core HealthComponent');
  const bossAi = getComponentRecordForNode(bossArenaItems, bossCore, enemyAIType, 'BossEnemy-Core EnemyAI');
  const bossContactDamage = getComponentRecordForNode(bossArenaItems, bossCore, damageOnContactType, 'BossEnemy-Core DamageOnContact');
  const bossCoreCollider = getComponentRecordForNode(bossArenaItems, bossCore, 'cc.BoxCollider2D', 'BossEnemy-Core BoxCollider2D');
  const roomARelicBinding = getComponentRecordForNode(roomAItems, assertNodeExists(roomAItems, 'RoomA-ClearRelic'), assetBindingTagType, 'RoomA-ClearRelic AssetBindingTag');
  const roomABackdropBinding = getComponentRecordForNode(roomAItems, assertNodeExists(roomAItems, 'RoomABackdrop'), assetBindingTagType, 'RoomABackdrop AssetBindingTag');
  const roomBRelicBinding = getComponentRecordForNode(roomBItems, assertNodeExists(roomBItems, 'RoomB-ClearRelic'), assetBindingTagType, 'RoomB-ClearRelic AssetBindingTag');
  const roomBBackdropBinding = getComponentRecordForNode(roomBItems, assertNodeExists(roomBItems, 'RoomBBackdrop'), assetBindingTagType, 'RoomBBackdrop AssetBindingTag');
  const roomCRelicBinding = getComponentRecordForNode(roomCItems, assertNodeExists(roomCItems, 'RoomC-ClearRelic'), assetBindingTagType, 'RoomC-ClearRelic AssetBindingTag');
  const roomCBackdropBinding = getComponentRecordForNode(roomCItems, assertNodeExists(roomCItems, 'RoomCBackdrop'), assetBindingTagType, 'RoomCBackdrop AssetBindingTag');
  const bossCoreBinding = getComponentRecordForNode(bossArenaItems, bossCore, assetBindingTagType, 'BossEnemy-Core AssetBindingTag');
  const bossShieldBinding = getComponentRecordForNode(bossArenaItems, bossShieldClosed, assetBindingTagType, 'BossShield-Closed AssetBindingTag');
  const bossShieldOpenBinding = getComponentRecordForNode(bossArenaItems, bossShieldOpen, assetBindingTagType, 'BossShield-Open AssetBindingTag');
  const bossController = getComponentRecordForNode(bossArenaItems, assertNodeExists(bossArenaItems, 'BossEncounterControllerNode'), bossControllerType, 'BossEncounterControllerNode');
  const bossShieldController = getComponentRecordForNode(bossArenaItems, assertNodeExists(bossArenaItems, 'BossShieldControllerNode'), bossShieldType, 'BossShieldControllerNode');
  assertComponentNodeReference(bossArenaItems, bossVisualController, 'visualRoot', bossCoreVisual, 'BossEnemy-Core BossVisualController');
  assertComponentNodeReference(bossArenaItems, bossVisualController, 'shieldController', bossShieldController, 'BossEnemy-Core BossVisualController');
  assertComponentReference(bossArenaItems, bossController, 'bossHealth', bossHealth, 'BossEncounterController');
  assertComponentNodeReference(bossArenaItems, bossController, 'bossRoot', bossCore, 'BossEncounterController');
  assertNodeReferenceList(bossArenaItems, bossController, 'activateOnCleared', [bossExitPortal, bossVictoryBanner], 'BossEncounterController');
  assertNodeReferenceList(bossArenaItems, bossController, 'deactivateOnCleared', [bossStatusBanner, bossWindowBanner, bossShieldClosed, bossShieldOpen], 'BossEncounterController');
  assertComponentReference(bossArenaItems, bossShieldController, 'shieldTarget', bossShieldBreakable, 'BossShieldPhaseController');
  assertComponentReference(bossArenaItems, bossShieldController, 'bossHealth', bossHealth, 'BossShieldPhaseController');
  assertComponentReference(bossArenaItems, bossShieldController, 'bossAI', bossAi, 'BossShieldPhaseController');
  assertComponentReference(bossArenaItems, bossShieldController, 'bossContactDamage', bossContactDamage, 'BossShieldPhaseController');
  assertNodeReferenceList(bossArenaItems, bossShieldController, 'activateWhenShieldBroken', [bossShieldOpen], 'BossShieldPhaseController');
  assertNodeReferenceList(bossArenaItems, bossShieldController, 'deactivateWhenShieldBroken', [bossShieldClosed], 'BossShieldPhaseController');
  assertNodeReferenceList(bossArenaItems, bossShieldController, 'activateWhenDanger', [bossStatusBanner], 'BossShieldPhaseController');
  assertNodeReferenceList(bossArenaItems, bossShieldController, 'activateWhenVulnerable', [bossWindowBanner], 'BossShieldPhaseController');
  assert.equal(bossShieldController.vulnerableSeconds, 3.2, 'BossShieldPhaseController vulnerable window should stay readable and stable.');
  assert.equal(bossShieldController.dangerMoveSpeed, 84, 'BossShieldPhaseController danger speed should not drift during visual-only shield work.');
  assert.equal(bossShieldController.vulnerableMoveSpeed, 22, 'BossShieldPhaseController vulnerable speed should not drift during visual-only shield work.');
  assert.equal(roomARelicBinding.bindingKey, 'pickup_relic');
  assert.equal(roomABackdropBinding.bindingKey, 'outdoor_ground_green');
  assert.equal(roomBRelicBinding.bindingKey, 'pickup_relic');
  assert.equal(roomBBackdropBinding.bindingKey, 'outdoor_ground_green');
  assert.equal(roomCRelicBinding.bindingKey, 'pickup_relic');
  assert.equal(roomCBackdropBinding.bindingKey, 'outdoor_ground_ruins');
  assert.match(roomARelicBinding.selectedPath, /assets\/art\/generated\/image2-preview\/pickup_relic\/pickup_relic_v00\.png$/, 'RoomA relic should bind the staged pickup candidate preview.');
  assert.match(roomBRelicBinding.selectedPath, /assets\/art\/generated\/image2-preview\/pickup_relic\/pickup_relic_v00\.png$/, 'RoomB relic should bind the staged pickup candidate preview.');
  assert.match(roomCRelicBinding.selectedPath, /assets\/art\/generated\/image2-preview\/pickup_relic\/pickup_relic_v00\.png$/, 'RoomC relic should bind the staged pickup candidate preview.');
  assert.equal(roomARelicBinding.bindingStatus, 'candidate_preview');
  assert.equal(roomBRelicBinding.bindingStatus, 'candidate_preview');
  assert.equal(roomCRelicBinding.bindingStatus, 'candidate_preview');
  assert.equal(bossCoreBinding.bindingKey, 'boss_core');
  assert.match(bossCoreBinding.selectedPath, /assets\/art\/generated\/image2-preview\/boss_core\/boss_core_v00\.png$/, 'BossEnemy-Core should bind the staged boss core candidate preview.');
  assert.equal(bossCoreBinding.fallbackPath, '', 'BossEnemy-Core should not fall back to dark dungeon boss art.');
  assert.equal(bossCoreBinding.bindingStatus, 'candidate_preview');
  assert.ok(bossVisualController.dangerSpriteFrame?.__uuid__, 'BossEnemy-Core should bind a staged boss_core sprite frame in danger state.');
  assert.ok(bossVisualController.vulnerableSpriteFrame?.__uuid__, 'BossEnemy-Core vulnerable state should keep the staged boss_core sprite frame wired.');
  assert.ok(bossVisualController.hurtSpriteFrame?.__uuid__, 'BossEnemy-Core hurt state should keep the staged boss_core sprite frame wired.');
  assert.ok(bossVisualController.defeatedSpriteFrame?.__uuid__, 'BossEnemy-Core defeated state should keep the staged boss_core sprite frame wired.');
  assert.equal(bossVisualController.dangerTexture ?? null, null, 'BossEnemy-Core should not bind generated boss_core texture while using procedural placeholder art.');
  assert.equal(bossVisualController.vulnerableTexture ?? null, null, 'BossEnemy-Core vulnerable state should not reintroduce generated boss_core texture.');
  assert.equal(bossVisualController.hurtTexture ?? null, null, 'BossEnemy-Core hurt state should not reintroduce generated boss_core texture.');
  assert.equal(bossVisualController.defeatedTexture ?? null, null, 'BossEnemy-Core defeated state should not reintroduce generated boss_core texture.');
  assert.equal(bossCoreCollider._size.width, 150, 'BossEnemy-Core collider width should stay gameplay-stable while visual shape changes.');
  assert.equal(bossCoreCollider._size.height, 60, 'BossEnemy-Core collider height should stay gameplay-stable while visual shape changes.');
  assert.ok(!getComponentTypesForNode(bossArenaItems, bossCore).has('cc.Sprite'), 'BossEnemy-Core should still route staged preview art through its visual subtree, not a root Sprite.');
  assertNodeParent(bossArenaItems, bossCoreVisual, bossCore, 'BossEnemy-Core-Visual');
  assertNodeParent(bossArenaItems, bossCoreInner, bossCore, 'BossEnemy-Core-Inner');
  assertNodeParent(bossArenaItems, bossCoreShine, bossCore, 'BossEnemy-Core-Shine');
  assertNodeParent(bossArenaItems, bossCoreOrb, bossCoreVisual, 'BossEnemy-Core-Orb');
  assertNodeParent(bossArenaItems, bossCoreBase, bossCoreVisual, 'BossEnemy-Core-Base');
  assertNodeParent(bossArenaItems, bossCoreEyeLeft, bossCoreVisual, 'BossEnemy-Core-EyeLeft');
  assertNodeParent(bossArenaItems, bossCoreEyeRight, bossCoreVisual, 'BossEnemy-Core-EyeRight');
  assertNodeHasComponent(bossArenaItems, bossCoreVisual, rectVisualType, 'BossEnemy-Core-Visual');
  assertNodeHasComponent(bossArenaItems, bossCoreInner, rectVisualType, 'BossEnemy-Core-Inner');
  assertNodeHasComponent(bossArenaItems, bossCoreOrb, rectVisualType, 'BossEnemy-Core-Orb');
  assertNodeHasComponent(bossArenaItems, bossCoreBase, rectVisualType, 'BossEnemy-Core-Base');
  assertNodeHasComponent(bossArenaItems, bossCoreEyeLeft, rectVisualType, 'BossEnemy-Core-EyeLeft');
  assertNodeHasComponent(bossArenaItems, bossCoreEyeRight, rectVisualType, 'BossEnemy-Core-EyeRight');
  assertNodeHasComponent(bossArenaItems, bossCoreShine, rectVisualType, 'BossEnemy-Core-Shine');
  assert.equal(bossShieldBinding.bindingKey, 'boss_shield_closed');
  assert.equal(bossShieldOpenBinding.bindingKey, 'boss_shield_open');

  const shieldChildSuffixes = ['ShellLobe', 'HingeFin', 'CharmCore', 'Counterweight', 'Latch', 'Spark', 'Anchor'];
  const shieldOldSuffixes = ['PetalNorth', 'PetalWest', 'PetalEast', 'CharmSpark'];

  for (const [nodeName, binding] of [
    ['BossShield-Closed', bossShieldBinding],
    ['BossShield-Open', bossShieldOpenBinding],
  ]) {
    const nodeRecord = assertNodeExists(bossArenaItems, nodeName);
    const nodeTypes = getComponentTypesForNode(bossArenaItems, nodeRecord);

    assertNodeHasComponent(bossArenaItems, nodeRecord, 'cc.UITransform', nodeName);
    assert.ok(!nodeTypes.has(rectVisualType), `${nodeName} should not use a root RectVisual card.`);
    assert.match(binding.selectedPath, new RegExp(`assets/art/generated/image2-preview/${binding.bindingKey}/${binding.bindingKey}_v00\\.png$`), `${nodeName} should bind the staged shield candidate preview.`);
    assert.equal(binding.fallbackPath, '', `${nodeName} should not fall back to HUD or dungeon image skins.`);
    assert.equal(binding.bindingStatus, 'candidate_preview', `${nodeName} should stay marked as a non-final candidate preview.`);
    assert.ok(!nodeTypes.has('cc.Label'), `${nodeName} should not use a text label card.`);
    assert.ok(!nodeTypes.has(sceneDressingSkinType), `${nodeName} should not use SceneDressingSkin while the shield art is still placeholder-only.`);
    assert.ok(!nodeTypes.has('cc.Sprite'), `${nodeName} should not own a root Sprite that can override the RectVisual shield.`);
    assertNodeMissing(bossArenaItems, `${nodeName}-Visual`);

    for (const suffix of shieldChildSuffixes) {
      const childNode = assertNodeExists(bossArenaItems, `${nodeName}-${suffix}`);
      const childTypes = getComponentTypesForNode(bossArenaItems, childNode);
      assertNodeParent(bossArenaItems, childNode, nodeRecord, `${nodeName}-${suffix}`);
      assertNodeHasComponent(bossArenaItems, childNode, rectVisualType, `${nodeName}-${suffix}`);
      assert.ok(!childTypes.has('cc.Label'), `${nodeName}-${suffix} should not use text labels while the shield remains a world mechanism placeholder.`);
    }

    for (const suffix of shieldOldSuffixes) {
      assertNodeMissing(bossArenaItems, `${nodeName}-${suffix}`);
    }
  }
  assertNodeMissing(bossArenaItems, 'BossReturnHint');
  assertNodeMissing(bossArenaItems, 'BossHint');
  assertNodeLabelText(bossArenaItems, 'BossStatusBanner', '破盾');
  assertNodeLabelText(bossArenaItems, 'BossWindowBanner', '快打');
  assertNodeLabelText(bossArenaItems, 'BossVictoryBanner', '回营地');
  for (const removedDenseNode of ['RoomBLaunchHint', 'RoomBLanding', 'RoomCBombHint']) {
    assertNodeMissing(roomBItems, removedDenseNode);
    assertNodeMissing(roomCItems, removedDenseNode);
  }
  for (const phrase of [
    'TRIAL CLEARED',
    'DANGER: BREAK SHIELD',
    'WINDOW: ATTACK NOW',
    'Take the exit and return the relic to camp.',
    'Break the shield with BombBug, then use the short attack window before it reforms.',
    'RETURN TO CAMP',
    '炸虫破盾，趁隙输出。',
  ]) {
    assertSceneDoesNotContainText(bossArenaItems, phrase, 'BossArena English banner regression');
  }
  assert.equal(
    getComponentRecordForNode(hubItems, assertNodeExists(hubItems, 'PersistentRoot'), sceneMusicType, 'DungeonHub SceneMusicController').musicCueId,
    'dungeon-hub',
  );
  assert.equal(
    getComponentRecordForNode(roomAItems, assertNodeExists(roomAItems, 'PersistentRoot'), sceneMusicType, 'DungeonRoomA SceneMusicController').musicCueId,
    'dungeon-room',
  );
  assert.equal(
    getComponentRecordForNode(roomBItems, assertNodeExists(roomBItems, 'PersistentRoot'), sceneMusicType, 'DungeonRoomB SceneMusicController').musicCueId,
    'dungeon-room',
  );
  assert.equal(
    getComponentRecordForNode(roomCItems, assertNodeExists(roomCItems, 'PersistentRoot'), sceneMusicType, 'DungeonRoomC SceneMusicController').musicCueId,
    'dungeon-room',
  );
  assert.equal(
    getComponentRecordForNode(bossArenaItems, assertNodeExists(bossArenaItems, 'PersistentRoot'), sceneMusicType, 'BossArena SceneMusicController').musicCueId,
    'boss-arena',
  );
});

test('Dungeon initial states keep the boss gate locked and rewards hidden', async () => {
  const hubItems = await readAssetJson('assets/scenes/DungeonHub.scene');
  const roomAItems = await readAssetJson('assets/scenes/DungeonRoomA.scene');
  const roomBItems = await readAssetJson('assets/scenes/DungeonRoomB.scene');
  const roomCItems = await readAssetJson('assets/scenes/DungeonRoomC.scene');
  const bossArenaItems = await readAssetJson('assets/scenes/BossArena.scene');

  assertNodeActiveState(assertNodeExists(hubItems, 'BossGate-Closed'), true);
  assertNodeActiveState(assertNodeExists(hubItems, 'BossGate-Open'), false);
  assertNodeActiveState(assertNodeExists(hubItems, 'Portal-BossArena'), false);
  assertNodeActiveState(assertNodeExists(hubItems, 'RoomA-StatusPending'), true);
  assertNodeActiveState(assertNodeExists(hubItems, 'RoomA-StatusDone'), false);
  assertNodeActiveState(assertNodeExists(hubItems, 'RoomB-StatusPending'), true);
  assertNodeActiveState(assertNodeExists(hubItems, 'RoomB-StatusDone'), false);
  assertNodeActiveState(assertNodeExists(hubItems, 'RoomC-StatusPending'), true);
  assertNodeActiveState(assertNodeExists(hubItems, 'RoomC-StatusDone'), false);

  assertNodeActiveState(assertNodeExists(roomAItems, 'RoomA-ClearRelic'), false);
  assertNodeActiveState(assertNodeExists(roomAItems, 'RoomA-GateBarrier'), true);
  assertNodeActiveState(assertNodeExists(roomBItems, 'RoomB-TopBarrier'), true);
  assertNodeActiveState(assertNodeExists(roomBItems, 'RoomB-BottomBarrier'), true);
  assertNodeActiveState(assertNodeExists(roomBItems, 'RoomB-GapHazard'), true);
  assertNodeActiveState(assertNodeExists(roomCItems, 'RoomC-TopBarrier'), true);
  assertNodeActiveState(assertNodeExists(roomCItems, 'RoomC-BottomBarrier'), true);
  assertNodeActiveState(assertNodeExists(roomCItems, 'RoomC-WallClosed'), true);
  assertNodeActiveState(assertNodeExists(roomCItems, 'RoomC-WallOpen'), false);
  assertNodeActiveState(assertNodeExists(roomCItems, 'RoomC-WallBarrier'), true);
  assertNodeActiveState(assertNodeExists(roomCItems, 'RoomC-ClearRelic'), false);

  assertNodeActiveState(assertNodeExists(bossArenaItems, 'BossShield-Closed'), true);
  assertNodeActiveState(assertNodeExists(bossArenaItems, 'BossShield-Open'), false);
  assertNodeActiveState(assertNodeExists(bossArenaItems, 'Portal-BossVictory'), false);
  assertNodeActiveState(assertNodeExists(bossArenaItems, 'BossVictoryBanner'), false);
  assertNodeActiveState(assertNodeExists(bossArenaItems, 'BossStatusBanner'), true);
  assertNodeActiveState(assertNodeExists(bossArenaItems, 'BossWindowBanner'), false);
});
