import sharp from 'sharp';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STYLE_DIMENSIONS = [
  'brightness',
  'warmth',
  'lowNoise',
  'toyLike',
  'roundedSilhouette',
  'routeReadability',
  'hudCompatibility',
  'characterVisibility',
];

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    input: '',
    output: '',
    filter: '',
    batchId: '',
    assetType: '',
    recursive: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--input') args.input = argv[++i] ?? '';
    else if (value === '--output') args.output = argv[++i] ?? '';
    else if (value === '--filter') args.filter = argv[++i] ?? '';
    else if (value === '--batch-id') args.batchId = argv[++i] ?? '';
    else if (value === '--asset-type') args.assetType = argv[++i] ?? '';
    else if (value === '--no-recursive') args.recursive = false;
  }

  if (!args.input) {
    throw new Error('Missing required argument: --input <dir>');
  }

  return args;
}

async function listPngFiles(rootDir, options = {}) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (options.recursive !== false) {
        files.push(...(await listPngFiles(fullPath, options)));
      }
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function stripVariant(fileName) {
  return fileName.replace(/_v\d+$/i, '');
}

function inferBindingKey(filePath) {
  return stripVariant(path.basename(filePath, path.extname(filePath)));
}

function inferVariantId(filePath) {
  return path.basename(filePath, path.extname(filePath)).match(/_v(\d+)$/i)?.[1] ?? '';
}

async function analyzeImage(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const totalPixels = width * height;
  let opaquePixels = 0;
  let transparentPixels = 0;
  let brightnessTotal = 0;
  let warmthTotal = 0;
  let neighborDeltaTotal = 0;
  let neighborSamples = 0;
  let edgeMismatchTotal = 0;
  let edgeSamples = 0;

  const pixelOffset = (x, y) => (y * width + x) * channels;
  const distance = (offsetA, offsetB) => {
    const rDelta = data[offsetA] - data[offsetB];
    const gDelta = data[offsetA + 1] - data[offsetB + 1];
    const bDelta = data[offsetA + 2] - data[offsetB + 2];
    return Math.sqrt(rDelta * rDelta + gDelta * gDelta + bDelta * bDelta) / 441.6729559300637;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = pixelOffset(x, y);
      const alpha = data[offset + 3] / 255;
      if (alpha > 0.02) {
        opaquePixels += 1;
      } else {
        transparentPixels += 1;
      }

      const red = data[offset] / 255;
      const green = data[offset + 1] / 255;
      const blue = data[offset + 2] / 255;
      brightnessTotal += 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      warmthTotal += red - blue;

      if (x < width - 1) {
        neighborDeltaTotal += distance(offset, pixelOffset(x + 1, y));
        neighborSamples += 1;
      }
      if (y < height - 1) {
        neighborDeltaTotal += distance(offset, pixelOffset(x, y + 1));
        neighborSamples += 1;
      }
    }
  }

  for (let x = 0; x < width; x += 1) {
    edgeMismatchTotal += distance(pixelOffset(x, 0), pixelOffset(x, height - 1));
    edgeSamples += 1;
  }
  for (let y = 0; y < height; y += 1) {
    edgeMismatchTotal += distance(pixelOffset(0, y), pixelOffset(width - 1, y));
    edgeSamples += 1;
  }

  return {
    width,
    height,
    channels,
    totalPixels,
    opaqueRatio: opaquePixels / totalPixels,
    transparentRatio: transparentPixels / totalPixels,
    brightnessMean: brightnessTotal / totalPixels,
    warmthMean: warmthTotal / totalPixels,
    noiseProxy: neighborSamples > 0 ? neighborDeltaTotal / neighborSamples : 0,
    edgeMismatch: edgeSamples > 0 ? edgeMismatchTotal / edgeSamples : 0,
  };
}

function scoreBrightness(value) {
  if (value >= 0.58 && value <= 0.85) return 2;
  if (value >= 0.48 && value <= 0.92) return 1;
  return 0;
}

function scoreWarmth(value) {
  if (value >= 0.035) return 2;
  if (value >= 0.005) return 1;
  return 0;
}

function scoreNoise(value) {
  if (value <= 0.12) return 2;
  if (value <= 0.18) return 1;
  return 0;
}

function createManualDimension(note) {
  return {
    score: null,
    autoSuggestion: null,
    note,
    manualReviewRequired: true,
  };
}

function buildStyleScorecard(metrics) {
  const scorecard = {
    brightness: {
      score: null,
      autoSuggestion: scoreBrightness(metrics.brightnessMean),
      note: `auto from mean brightness=${metrics.brightnessMean.toFixed(3)}`,
      manualReviewRequired: true,
    },
    warmth: {
      score: null,
      autoSuggestion: scoreWarmth(metrics.warmthMean),
      note: `auto from warmth delta=${metrics.warmthMean.toFixed(3)}`,
      manualReviewRequired: true,
    },
    lowNoise: {
      score: null,
      autoSuggestion: scoreNoise(metrics.noiseProxy),
      note: `auto from neighbor delta=${metrics.noiseProxy.toFixed(3)}`,
      manualReviewRequired: true,
    },
    toyLike: createManualDimension('manual art review required'),
    roundedSilhouette: createManualDimension('manual art review required'),
    routeReadability: createManualDimension('manual gameplay review required'),
    hudCompatibility: createManualDimension('manual mobile UI review required'),
    characterVisibility: createManualDimension('manual scene review required'),
  };

  const autoSuggestedSubtotal = Object.values(scorecard)
    .reduce((total, dimension) => total + (dimension.autoSuggestion ?? 0), 0);

  return {
    dimensions: scorecard,
    autoSuggestedSubtotal,
    autoSuggestedMax: STYLE_DIMENSIONS.length * 2,
    manualScore: null,
    manualThreshold: 12,
  };
}

function buildHardScreen(filePath, metrics, assetType) {
  const issues = [];
  const extension = path.extname(filePath).toLowerCase();
  const thresholds = {
    brightnessMin: 0.45,
    brightnessMax: 0.92,
    warmthMin: 0.0,
    noiseMax: 0.2,
    transparentMax: assetType === 'tile' ? 0.05 : 0.96,
    edgeMismatchMax: assetType === 'tile' ? 0.18 : 1,
  };

  if (extension !== '.png') {
    issues.push({ check: 'format', detail: `expected png, got ${extension}` });
  }
  if (metrics.width <= 0 || metrics.height <= 0) {
    issues.push({ check: 'dimensions', detail: `invalid size ${metrics.width}x${metrics.height}` });
  }
  if (metrics.brightnessMean < thresholds.brightnessMin || metrics.brightnessMean > thresholds.brightnessMax) {
    issues.push({
      check: 'brightness_range',
      detail: `brightness=${metrics.brightnessMean.toFixed(3)} outside ${thresholds.brightnessMin}-${thresholds.brightnessMax}`,
    });
  }
  if (metrics.warmthMean < thresholds.warmthMin) {
    issues.push({
      check: 'warmth_range',
      detail: `warmth=${metrics.warmthMean.toFixed(3)} below ${thresholds.warmthMin}`,
    });
  }
  if (metrics.noiseProxy > thresholds.noiseMax) {
    issues.push({
      check: 'noise_density',
      detail: `noise=${metrics.noiseProxy.toFixed(3)} exceeds ${thresholds.noiseMax}`,
    });
  }
  if (metrics.transparentRatio > thresholds.transparentMax) {
    issues.push({
      check: 'transparent_ratio',
      detail: `transparent=${metrics.transparentRatio.toFixed(3)} exceeds ${thresholds.transparentMax}`,
    });
  }
  if (assetType === 'tile' && metrics.edgeMismatch > thresholds.edgeMismatchMax) {
    issues.push({
      check: 'edge_repeatability',
      detail: `edgeMismatch=${metrics.edgeMismatch.toFixed(3)} exceeds ${thresholds.edgeMismatchMax}`,
    });
  }

  return {
    passed: issues.length === 0,
    issues,
    metrics,
    thresholds,
    ocrRisk: {
      score: null,
      note: 'placeholder heuristic only; OCR/text-like artifact detection still needs a dedicated pass',
      manualReviewRequired: true,
    },
  };
}

async function main() {
  const args = parseArgs();
  const inputDir = path.resolve(args.input);
  const outputPath = path.resolve(args.output || path.join(inputDir, 'screening-report.json'));
  const filterRegex = args.filter ? new RegExp(args.filter, 'i') : null;
  const assetType = args.assetType || 'tile';
  const files = (await listPngFiles(inputDir, { recursive: args.recursive }))
    .filter((filePath) => (filterRegex ? filterRegex.test(path.basename(filePath)) : true));

  if (files.length === 0) {
    throw new Error(`No PNG files found under ${inputDir}`);
  }

  const results = [];
  for (const filePath of files) {
    const metrics = await analyzeImage(filePath);
    results.push({
      bindingKey: inferBindingKey(filePath),
      variantId: inferVariantId(filePath),
      assetType,
      filePath: path.relative(process.cwd(), filePath).replaceAll('\\', '/'),
      hardScreen: buildHardScreen(filePath, metrics, assetType),
      styleScorecard: buildStyleScorecard(metrics),
      adversarialReview: {
        status: 'pending',
        blockers: [],
        note: 'manual adversarial review not yet recorded',
      },
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    batchId: args.batchId || '',
    inputDir,
    assetType,
    totalCandidates: results.length,
    passedHardScreen: results.filter((item) => item.hardScreen.passed).length,
    bindingKeys: [...new Set(results.map((item) => item.bindingKey))],
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({ summary, results }, null, 2)}\n`, 'utf8');

  console.log(`[image2-screen] wrote ${outputPath}`);
  console.log(`[image2-screen] candidates ${summary.totalCandidates}`);
  console.log(`[image2-screen] hard-screen passed ${summary.passedHardScreen}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
