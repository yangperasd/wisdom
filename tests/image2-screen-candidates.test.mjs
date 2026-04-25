import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { analyzeImage, buildHardScreen } from '../tools/image2-screen-candidates.mjs';

test('analyzeImage removes bright neutral backdrops for prop assets before scoring', async () => {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'wisdom-image2-screen-'));
  const filePath = path.join(projectRoot, 'projectile_arrow_v00.png');
  const arrowBuffer = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 238, g: 238, b: 238, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 220,
            height: 40,
            channels: 4,
            background: { r: 222, g: 176, b: 104, alpha: 1 },
          },
        }).png().toBuffer(),
        left: 146,
        top: 236,
      },
    ])
    .png()
    .toBuffer();
  await writeFile(filePath, arrowBuffer);

  const tileMetrics = await analyzeImage(filePath, { assetType: 'tile' });
  const propMetrics = await analyzeImage(filePath, { assetType: 'fx' });

  assert.equal(tileMetrics.transparentRatio, 0);
  assert.ok(tileMetrics.brightnessMean > 0.92);
  assert.ok(propMetrics.transparentRatio > 0.5);
  assert.ok(propMetrics.brightnessMean < tileMetrics.brightnessMean);
  assert.equal(buildHardScreen(filePath, tileMetrics, 'tile').passed, false);
  assert.equal(buildHardScreen(filePath, propMetrics, 'fx').passed, true);
});
