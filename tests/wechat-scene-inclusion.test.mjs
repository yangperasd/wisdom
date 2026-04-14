import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectSceneEntries,
  createWechatBuildConfig,
} from '../tools/wechat-build-utils.mjs';

const expectedScenes = [
  'StartCamp',
  'FieldWest',
  'FieldRuins',
  'DungeonHub',
  'DungeonRoomA',
  'DungeonRoomB',
  'DungeonRoomC',
  'BossArena',
];

describe('wechat scene inclusion', () => {
  test('build config includes all 8 game scenes', async () => {
    const scenes = await collectSceneEntries();
    const names = scenes.map(s => s.url.replace('db://assets/scenes/', '').replace('.scene', ''));
    for (const expected of expectedScenes) {
      assert.ok(names.includes(expected), `Missing scene: ${expected}`);
    }
  });

  test('StartCamp is the first (start) scene', async () => {
    const scenes = await collectSceneEntries();
    assert.ok(scenes[0].url.includes('StartCamp'), 'StartCamp should be first scene');
  });

  test('no duplicate scene UUIDs', async () => {
    const scenes = await collectSceneEntries();
    const uuids = scenes.map(s => s.uuid);
    assert.equal(uuids.length, new Set(uuids).size, 'Scene UUIDs should be unique');
  });

  test('build config startScene matches first collected scene UUID', async () => {
    const config = await createWechatBuildConfig();
    const scenes = await collectSceneEntries();
    assert.equal(config.startScene, scenes[0].uuid);
  });

  test('every scene entry has both url and uuid', async () => {
    const scenes = await collectSceneEntries();
    for (const scene of scenes) {
      assert.ok(scene.url, `scene ${scene.name} missing url`);
      assert.ok(scene.uuid, `scene ${scene.name} missing uuid`);
    }
  });
});
