import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import {
  inferCandidateSource,
  resolvePreviewRasterPolicy,
  syncPreviewLibrarySpriteFrameCache,
  stageCandidateBindings,
} from '../tools/image2-stage-candidate-bindings.mjs';

const ONE_BY_ONE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==';

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writePng(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(ONE_BY_ONE_PNG_BASE64, 'base64'));
}

async function writeSolidPng(filePath, width, height) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 214, g: 196, b: 148, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  await writeFile(filePath, buffer);
}

test('stageCandidateBindings imports external candidates into assets and bootstraps a candidate manifest', async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'wisdom-image2-stage-'));
  const sourcePngPath = path.join(
    projectRoot,
    'temp',
    'image2',
    'candidates',
    'outdoor_wall_standard',
    '2026-04-24-env-batch-01',
    'outdoor_wall_standard_v00.png',
  );
  const reportPath = path.join(projectRoot, 'temp', 'image2', 'screening-report.json');
  const manifestPath = path.join(projectRoot, 'assets', 'configs', 'asset_binding_candidate_manifest_image2.json');

  await writePng(sourcePngPath);
  await writeJson(reportPath, {
    summary: {
      batchId: '2026-04-24-env-batch-01',
    },
    results: [
      {
        bindingKey: 'outdoor_wall_standard',
        variantId: '00',
        filePath: 'temp/image2/candidates/outdoor_wall_standard/2026-04-24-env-batch-01/outdoor_wall_standard_v00.png',
        hardScreen: {
          passed: true,
        },
      },
    ],
  });

  const result = await stageCandidateBindings({
    projectRoot,
    reportPath,
    manifestPath,
    importRoot: 'assets/art/generated/image2-preview',
    policy: 'first-passing',
    dryRun: false,
  });

  assert.equal(result.writtenCount, 1);
  assert.equal(result.imported.length, 1);
  assert.equal(result.skipped.length, 0);

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const stagedEntry = manifest.worldEntities.outdoor_wall_standard;
  assert.equal(
    stagedEntry.selectedPath,
    'assets/art/generated/image2-preview/outdoor_wall_standard/outdoor_wall_standard_v00.png',
  );
  assert.equal(stagedEntry.source, 'image2-candidate');
  assert.equal(stagedEntry.batchId, '2026-04-24-env-batch-01');
  assert.equal(
    stagedEntry.screeningReport,
    'temp/image2/screening-report.json',
  );

  const stagedAssetPath = path.resolve(projectRoot, stagedEntry.selectedPath);
  await access(stagedAssetPath);
  await access(`${stagedAssetPath}.meta`);
  await access(path.join(projectRoot, 'assets', 'art', 'generated', 'image2-preview.meta'));
  await access(path.join(projectRoot, 'assets', 'art', 'generated', 'image2-preview', 'outdoor_wall_standard.meta'));

  const stagedMeta = JSON.parse(await readFile(`${stagedAssetPath}.meta`, 'utf8'));
  assert.equal(stagedMeta.importer, 'image');
  assert.equal(stagedMeta.userData.type, 'texture');
  assert.equal(stagedMeta.userData.redirect.endsWith('@6c48a'), true);
});

test('inferCandidateSource distinguishes image2 candidates from legacy smoke inputs', () => {
  assert.equal(
    inferCandidateSource('temp/image2/candidates/outdoor_wall_standard/outdoor_wall_standard_v00.png'),
    'image2-candidate',
  );
  assert.equal(
    inferCandidateSource('tools/asset-gen/generated/tile/outdoor_wall_standard_v00.png'),
    'legacy-candidate-smoke',
  );
  assert.equal(
    inferCandidateSource('C:/external/scratch/outdoor_wall_standard_v00.png'),
    'external-candidate',
  );
});

test('resolvePreviewRasterPolicy uses runtime-friendly tile sizes for environment surfaces', () => {
  assert.deepEqual(resolvePreviewRasterPolicy('outdoor_ground_flowers'), { mode: 'tile', edge: 32 });
  assert.deepEqual(resolvePreviewRasterPolicy('outdoor_path_cobble'), { mode: 'tile', edge: 32 });
  assert.deepEqual(resolvePreviewRasterPolicy('outdoor_wall_standard'), { mode: 'tile', edge: 64 });
  assert.deepEqual(resolvePreviewRasterPolicy('checkpoint'), { mode: 'object', maxEdge: 384, trimTransparent: true });
  assert.deepEqual(resolvePreviewRasterPolicy('boss_core'), { mode: 'object', maxEdge: 320, trimTransparent: true });
  assert.deepEqual(resolvePreviewRasterPolicy('boss_shield_closed'), { mode: 'object', maxEdge: 384, trimTransparent: true });
  assert.deepEqual(resolvePreviewRasterPolicy('boss_shield_open'), { mode: 'object', maxEdge: 384, trimTransparent: true });
  assert.deepEqual(resolvePreviewRasterPolicy('echo_box'), {
    mode: 'object',
    maxEdge: 320,
    minEdge: 160,
    trimTransparent: true,
    upscaleKernel: 'nearest',
  });
  assert.deepEqual(resolvePreviewRasterPolicy('echo_spring_flower'), { mode: 'object', maxEdge: 320, trimTransparent: true });
  assert.deepEqual(resolvePreviewRasterPolicy('echo_bomb_bug'), { mode: 'object', maxEdge: 320, trimTransparent: true });
  assert.deepEqual(resolvePreviewRasterPolicy('projectile_arrow'), { mode: 'object', maxEdge: 256, trimTransparent: true });
});

test('stageCandidateBindings downsizes runtime tile previews to their semantic tile edge', async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'wisdom-image2-stage-raster-'));
  const sourcePngPath = path.join(
    projectRoot,
    'temp',
    'image2',
    'candidates',
    'outdoor_ground_flowers',
    '2026-04-24-env-batch-02',
    'outdoor_ground_flowers_v01.png',
  );
  const reportPath = path.join(projectRoot, 'temp', 'image2', 'screening-report.json');
  const manifestPath = path.join(projectRoot, 'assets', 'configs', 'asset_binding_candidate_manifest_image2.json');

  await writeSolidPng(sourcePngPath, 512, 512);
  await writeJson(reportPath, {
    summary: {
      batchId: '2026-04-24-env-batch-02',
    },
    results: [
      {
        bindingKey: 'outdoor_ground_flowers',
        variantId: '01',
        filePath: 'temp/image2/candidates/outdoor_ground_flowers/2026-04-24-env-batch-02/outdoor_ground_flowers_v01.png',
        hardScreen: {
          passed: true,
        },
      },
    ],
  });

  const result = await stageCandidateBindings({
    projectRoot,
    reportPath,
    manifestPath,
    importRoot: 'assets/art/generated/image2-preview',
    policy: 'first-passing',
    dryRun: false,
  });

  const stagedEntry = result.manifest.worldEntities.outdoor_ground_flowers;
  assert.deepEqual(stagedEntry.previewRasterPolicy, { mode: 'tile', edge: 32 });

  const stagedAssetPath = path.resolve(projectRoot, stagedEntry.selectedPath);
  const metadata = await sharp(stagedAssetPath).metadata();
  assert.equal(metadata.width, 32);
  assert.equal(metadata.height, 32);
});

test('stageCandidateBindings trims object previews to the asset silhouette before resizing', async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'wisdom-image2-stage-object-'));
  const sourcePngPath = path.join(
    projectRoot,
    'temp',
    'image2',
    'candidates',
    'checkpoint',
    '2026-04-24-prop-batch-01',
    'checkpoint_v00.png',
  );
  const reportPath = path.join(projectRoot, 'temp', 'image2', 'screening-report.json');
  const manifestPath = path.join(projectRoot, 'assets', 'configs', 'asset_binding_candidate_manifest_image2.json');

  await mkdir(path.dirname(sourcePngPath), { recursive: true });
  const paddedObjectBuffer = await sharp({
    create: {
      width: 120,
      height: 120,
      channels: 4,
      background: { r: 236, g: 236, b: 236, alpha: 1 },
    },
  })
    .composite([{
      input: await sharp({
        create: {
          width: 42,
          height: 26,
          channels: 4,
          background: { r: 214, g: 196, b: 148, alpha: 1 },
        },
      }).png().toBuffer(),
      left: 39,
      top: 47,
    }])
    .png()
    .toBuffer();
  await writeFile(sourcePngPath, paddedObjectBuffer);
  await writeJson(reportPath, {
    summary: {
      batchId: '2026-04-24-prop-batch-01',
    },
    results: [
      {
        bindingKey: 'checkpoint',
        variantId: '00',
        filePath: 'temp/image2/candidates/checkpoint/2026-04-24-prop-batch-01/checkpoint_v00.png',
        hardScreen: {
          passed: true,
        },
      },
    ],
  });

  const result = await stageCandidateBindings({
    projectRoot,
    reportPath,
    manifestPath,
    importRoot: 'assets/art/generated/image2-preview',
    policy: 'first-passing',
    dryRun: false,
  });

  const stagedEntry = result.manifest.worldEntities.checkpoint;
  assert.deepEqual(stagedEntry.previewRasterPolicy, { mode: 'object', maxEdge: 384, trimTransparent: true });

  const stagedAssetPath = path.resolve(projectRoot, stagedEntry.selectedPath);
  const metadata = await sharp(stagedAssetPath).metadata();
  assert.equal(metadata.width, 42);
  assert.equal(metadata.height, 26);

  const stagedMeta = JSON.parse(await readFile(`${stagedAssetPath}.meta`, 'utf8'));
  const spriteFrameMeta = Object.values(stagedMeta.subMetas ?? {}).find((entry) => entry?.importer === 'sprite-frame');
  const textureMeta = Object.values(stagedMeta.subMetas ?? {}).find((entry) => entry?.importer === 'texture');
  assert.equal(stagedMeta.userData.type, 'sprite-frame');
  assert.ok(spriteFrameMeta?.uuid?.endsWith('@f9941'));
  assert.ok(textureMeta?.uuid?.endsWith('@6c48a'));
  assert.equal(spriteFrameMeta?.userData?.width, 42);
  assert.equal(spriteFrameMeta?.userData?.height, 26);
  assert.equal(textureMeta?.userData?.wrapModeS, 'clamp-to-edge');
  assert.equal(textureMeta?.userData?.wrapModeT, 'clamp-to-edge');

  const librarySpriteFramePath = path.join(
    projectRoot,
    'library',
    stagedMeta.uuid.slice(0, 2),
    `${spriteFrameMeta.uuid}.json`,
  );
  const libraryAssetsDataPath = path.join(projectRoot, 'library', '.assets-data.json');
  const librarySpriteFrame = JSON.parse(await readFile(librarySpriteFramePath, 'utf8'));
  const libraryAssetsData = JSON.parse(await readFile(libraryAssetsDataPath, 'utf8'));
  assert.equal(librarySpriteFrame.__type__, 'cc.SpriteFrame');
  assert.equal(librarySpriteFrame.content.rect.width, 42);
  assert.equal(librarySpriteFrame.content.rect.height, 26);
  assert.equal(librarySpriteFrame.content.texture, textureMeta.uuid);
  assert.deepEqual(libraryAssetsData[spriteFrameMeta.uuid], {
    url: 'db://assets/art/generated/image2-preview/checkpoint/checkpoint_v00.png@f9941',
    value: {
      depends: [textureMeta.uuid],
    },
    versionCode: 1,
  });
});

test('stageCandidateBindings upscales tiny object previews when the binding policy sets a minimum edge', async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'wisdom-image2-stage-object-min-'));
  const sourcePngPath = path.join(
    projectRoot,
    'temp',
    'image2',
    'batch-inputs',
    '2026-04-25-echo-box-bridge',
    'echo_box_v00.png',
  );
  const reportPath = path.join(projectRoot, 'temp', 'image2', 'screening-report.json');
  const manifestPath = path.join(projectRoot, 'assets', 'configs', 'asset_binding_candidate_manifest_image2.json');

  await mkdir(path.dirname(sourcePngPath), { recursive: true });
  const tinyObjectBuffer = await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 4,
      background: { r: 236, g: 236, b: 236, alpha: 0 },
    },
  })
    .composite([{
      input: await sharp({
        create: {
          width: 10,
          height: 13,
          channels: 4,
          background: { r: 214, g: 176, b: 96, alpha: 1 },
        },
      }).png().toBuffer(),
      left: 11,
      top: 10,
    }])
    .png()
    .toBuffer();
  await writeFile(sourcePngPath, tinyObjectBuffer);
  await writeJson(reportPath, {
    summary: {
      batchId: '2026-04-25-echo-box-bridge',
    },
    results: [
      {
        bindingKey: 'echo_box',
        variantId: '00',
        filePath: 'temp/image2/batch-inputs/2026-04-25-echo-box-bridge/echo_box_v00.png',
        hardScreen: {
          passed: true,
        },
      },
    ],
  });

  const result = await stageCandidateBindings({
    projectRoot,
    reportPath,
    manifestPath,
    importRoot: 'assets/art/generated/image2-preview',
    policy: 'first-passing',
    dryRun: false,
  });

  const stagedEntry = result.manifest.worldEntities.echo_box;
  assert.deepEqual(stagedEntry.previewRasterPolicy, {
    mode: 'object',
    maxEdge: 320,
    minEdge: 160,
    trimTransparent: true,
    upscaleKernel: 'nearest',
  });

  const stagedAssetPath = path.resolve(projectRoot, stagedEntry.selectedPath);
  const metadata = await sharp(stagedAssetPath).metadata();
  assert.equal(Math.max(metadata.width ?? 0, metadata.height ?? 0), 160);
  assert.ok((metadata.width ?? 0) >= 120, 'Echo box preview should no longer stay as a tiny micro-sprite.');
  assert.ok((metadata.height ?? 0) >= 150, 'Echo box preview should honor the minimum object edge policy.');
});

test('syncPreviewLibrarySpriteFrameCache is a no-op for texture-only preview assets', async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'wisdom-image2-stage-library-'));
  const result = await syncPreviewLibrarySpriteFrameCache(projectRoot, 'assets/art/generated/image2-preview/tile/tile_v00.png', {
    uuid: '12345678-1234-1234-1234-1234567890ab',
    subMetas: {
      '6c48a': {
        importer: 'texture',
        uuid: '12345678-1234-1234-1234-1234567890ab@6c48a',
      },
    },
  });

  assert.equal(result, null);
});
