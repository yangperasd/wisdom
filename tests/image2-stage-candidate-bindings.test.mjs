import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import {
  inferCandidateSource,
  resolvePreviewRasterPolicy,
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
      background: { r: 0, g: 0, b: 0, alpha: 0 },
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
});
