import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWechatBuildConfig,
  defaultWechatAppId,
  optimizeWechatRuntimeSettings,
  wechatEngineIncludeModules,
  wechatRecommendedDownloadConcurrency,
  wechatBuildOutputName,
  wechatBuildTaskName,
} from '../tools/wechat-build-utils.mjs';

test('wechat build config uses vertical-slice scenes in order', async () => {
  const config = await createWechatBuildConfig();
  const sceneUrls = config.scenes.map((scene) => scene.url);

  assert.deepEqual(sceneUrls, [
    'db://assets/scenes/StartCamp.scene',
    'db://assets/scenes/FieldWest.scene',
    'db://assets/scenes/FieldRuins.scene',
    'db://assets/scenes/DungeonHub.scene',
    'db://assets/scenes/DungeonRoomA.scene',
    'db://assets/scenes/DungeonRoomB.scene',
    'db://assets/scenes/DungeonRoomC.scene',
    'db://assets/scenes/BossArena.scene',
  ]);
});

test('wechat build config keeps MechanicsLab internal and out of first release', async () => {
  const config = await createWechatBuildConfig();
  const sceneUrls = config.scenes.map((scene) => scene.url);

  assert.equal(
    sceneUrls.includes('db://assets/scenes/MechanicsLab.scene'),
    false,
    'MechanicsLab is an internal test scene and must not enter the first-release WeChat scene list.',
  );
  assert.equal(
    config.startScene,
    config.scenes[0].uuid,
    'Start scene should remain the first release scene, not an internal test scene.',
  );
});

test('wechat build config keeps stable platform and task settings', async () => {
  const config = await createWechatBuildConfig();

  assert.equal(config.platform, 'wechatgame');
  assert.equal(config.taskName, wechatBuildTaskName);
  assert.equal(config.outputName, wechatBuildOutputName);
  assert.equal(config.buildPath, 'project://build');
  assert.equal(config.startScene, config.scenes[0].uuid);
  assert.equal(config.packages.wechatgame.appid, defaultWechatAppId);
  assert.equal(config.debug, false);
  assert.equal(config.packages.wechatgame.orientation, 'landscape');
  assert.equal(config.startSceneAssetBundle, true);
  assert.equal(config.mainBundleCompressionType, 'subpackage');
  assert.equal(config.mainBundleIsRemote, false);
  assert.equal(config.bundleCommonChunk, true);
  assert.equal(config.skipCompressTexture, false);
  assert.equal(config.remoteServerAddress, process.env.WECHATGAME_REMOTE_SERVER || '');
  assert.deepEqual(config.includeModules, wechatEngineIncludeModules);
  assert.ok(!config.includeModules.includes('spine-3.8'), '2D WeChat build must not bundle unused Spine runtime');
  assert.ok(!config.includeModules.includes('dragon-bones'), '2D WeChat build must not bundle unused DragonBones runtime');
  assert.ok(!config.includeModules.includes('3d'), '2D WeChat build must not bundle default 3D runtime');
  assert.equal(config.overwriteProjectSettings.macroConfig.cleanupImageCache, 'on');
  assert.equal(config.overwriteProjectSettings.includeModules.physics, 'physics-builtin');
  assert.equal(config.overwriteProjectSettings.includeModules['physics-2d'], 'physics-2d-box2d');
  assert.equal(config.overwriteProjectSettings.includeModules['gfx-webgl2'], 'off');
});

test('wechat build config accepts a custom output directory name', async () => {
  const config = await createWechatBuildConfig({ outputName: 'wechatgame-staging' });

  assert.equal(config.outputName, 'wechatgame-staging');
});

test('wechat runtime settings optimization keeps the 2D mobile profile stable', () => {
  const runtimeSettings = {
    engine: { debug: true },
    assets: { downloadMaxConcurrency: 15 },
    screen: { exactFitScreen: true },
    physics: { physicsEngine: 'physics-ammo' },
    splashScreen: { watermarkLocation: 'default' },
  };

  const optimized = optimizeWechatRuntimeSettings(runtimeSettings, { debug: false });

  assert.equal(optimized.engine.debug, false);
  assert.equal(optimized.assets.downloadMaxConcurrency, wechatRecommendedDownloadConcurrency);
  assert.equal(optimized.screen.exactFitScreen, false);
  assert.equal(optimized.physics.physicsEngine, 'physics-builtin');
  assert.equal(optimized.splashScreen.watermarkLocation, 'hidden');
});
