import { randomUUID } from 'node:crypto';
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const DEFAULT_MANIFEST_PATH = path.join(
  process.cwd(),
  'assets',
  'configs',
  'asset_binding_candidate_manifest_image2.json',
);
const DEFAULT_IMPORT_ROOT = '';
const TEXTURE_SUBMETA_ID = '6c48a';
const SPRITE_FRAME_SUBMETA_ID = 'f9941';
const DEFAULT_PREVIEW_MAX_EDGE = 512;
const DEFAULT_PREVIEW_PNG_QUALITY = 80;
const PREVIEW_TILE_DIMENSIONS = [
  { pattern: /^outdoor_ground_/i, edge: 32 },
  { pattern: /^outdoor_path_/i, edge: 32 },
  { pattern: /^outdoor_wall_/i, edge: 64 },
];
const PREVIEW_OBJECT_DIMENSIONS = [
  { pattern: /^checkpoint$/i, maxEdge: 384 },
  { pattern: /^portal$/i, maxEdge: 384 },
  { pattern: /^barrier_(closed|open)$/i, maxEdge: 384 },
  { pattern: /^breakable_target$/i, maxEdge: 384 },
  { pattern: /^pickup_relic$/i, maxEdge: 320 },
  { pattern: /^boss_core$/i, maxEdge: 320 },
  { pattern: /^boss_shield_(closed|open)$/i, maxEdge: 384 },
  { pattern: /^echo_box$/i, maxEdge: 320, minEdge: 160, upscaleKernel: 'nearest' },
  { pattern: /^echo_(spring_flower|bomb_bug)$/i, maxEdge: 320 },
  { pattern: /^common_enemy$/i, maxEdge: 384 },
  { pattern: /^projectile_arrow$/i, maxEdge: 256 },
];
const DEFAULT_NOTES = [
  'This manifest is a staging-only overlay for Image 2.0 candidates.',
  'Do not copy approved candidate paths back into asset_binding_manifest_v2.json until screening, preview, package, and runtime validation pass.',
];

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    report: '',
    manifest: DEFAULT_MANIFEST_PATH,
    importRoot: DEFAULT_IMPORT_ROOT,
    policy: 'first-passing',
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--report') args.report = argv[++i] ?? '';
    else if (value === '--manifest') args.manifest = argv[++i] ?? '';
    else if (value === '--import-root') args.importRoot = argv[++i] ?? '';
    else if (value === '--policy') args.policy = argv[++i] ?? '';
    else if (value === '--dry-run') args.dryRun = true;
  }

  if (!args.report) {
    throw new Error('Missing required argument: --report <screening-report.json>');
  }

  return args;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readJsonOrDefault(filePath, fallbackFactory) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return fallbackFactory();
    }
    throw error;
  }
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export function createEmptyCandidateManifest(now = new Date().toISOString()) {
  return {
    version: 1,
    generatedAt: now,
    status: 'candidate-preview-only',
    selectionPolicy: 'manual-review-required',
    notes: [...DEFAULT_NOTES],
    worldEntities: {},
    uiEntities: {},
    audioRoles: {},
  };
}

export function toPosixRelative(projectRoot, inputPath) {
  return path.relative(projectRoot, inputPath).replaceAll('\\', '/');
}

export function pickSelections(report, policy) {
  if (!Array.isArray(report?.results)) {
    return [];
  }

  const byBindingKey = new Map();
  for (const candidate of report.results) {
    if (!byBindingKey.has(candidate.bindingKey)) {
      byBindingKey.set(candidate.bindingKey, []);
    }
    byBindingKey.get(candidate.bindingKey).push(candidate);
  }

  const selections = [];
  for (const [bindingKey, candidates] of byBindingKey.entries()) {
    let selected = null;
    if (policy === 'first-passing') {
      selected = candidates.find((candidate) => candidate?.hardScreen?.passed);
    }
    if (!selected) {
      continue;
    }
    selections.push({
      bindingKey,
      selected,
    });
  }

  return selections;
}

export function inferCandidateSource(candidateFile) {
  if (typeof candidateFile !== 'string' || !candidateFile) {
    return 'unknown-candidate';
  }

  const normalizedPath = candidateFile.replaceAll('\\', '/');
  if (normalizedPath.startsWith('temp/image2/candidates/')) {
    return 'image2-candidate';
  }
  if (normalizedPath.startsWith('tools/asset-gen/generated/')) {
    return 'legacy-candidate-smoke';
  }
  return 'external-candidate';
}

function assertAssetsRelativePath(relativePath, sourceLabel) {
  if (!relativePath.startsWith('assets/')) {
    throw new Error(`${sourceLabel} must resolve under assets/: ${relativePath}`);
  }
}

function createDirectoryMeta() {
  return {
    ver: '1.2.0',
    importer: 'directory',
    imported: true,
    uuid: randomUUID(),
    files: [],
    subMetas: {},
    userData: {},
  };
}

function createTextureSubMeta(rootUuid, displayName, wrapMode = 'repeat') {
  return {
    importer: 'texture',
    uuid: `${rootUuid}@${TEXTURE_SUBMETA_ID}`,
    displayName,
    id: TEXTURE_SUBMETA_ID,
    name: 'texture',
    userData: {
      wrapModeS: wrapMode,
      wrapModeT: wrapMode,
      minfilter: 'linear',
      magfilter: 'linear',
      mipfilter: 'none',
      anisotropy: 0,
      isUuid: true,
      imageUuidOrDatabaseUri: rootUuid,
      visible: false,
    },
    ver: '1.0.22',
    imported: true,
    files: ['.json'],
    subMetas: {},
  };
}

function createSpriteFrameSubMeta(rootUuid, displayName, width, height) {
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  return {
    importer: 'sprite-frame',
    uuid: `${rootUuid}@${SPRITE_FRAME_SUBMETA_ID}`,
    displayName,
    id: SPRITE_FRAME_SUBMETA_ID,
    name: 'spriteFrame',
    userData: {
      trimThreshold: 1,
      rotated: false,
      offsetX: 0,
      offsetY: 0,
      trimX: 0,
      trimY: 0,
      width,
      height,
      rawWidth: width,
      rawHeight: height,
      borderTop: 0,
      borderBottom: 0,
      borderLeft: 0,
      borderRight: 0,
      packable: true,
      pixelsToUnit: 100,
      pivotX: 0.5,
      pivotY: 0.5,
      meshType: 0,
      isUuid: true,
      imageUuidOrDatabaseUri: `${rootUuid}@${TEXTURE_SUBMETA_ID}`,
      atlasUuid: '',
      trimType: 'none',
      vertices: {
        rawPosition: [
          -halfWidth,
          -halfHeight,
          0,
          halfWidth,
          -halfHeight,
          0,
          -halfWidth,
          halfHeight,
          0,
          halfWidth,
          halfHeight,
          0,
        ],
        indexes: [0, 1, 2, 2, 1, 3],
        uv: [0, height, width, height, 0, 0, width, 0],
        nuv: [0, 0, 1, 0, 0, 1, 1, 1],
        minPos: [-halfWidth, -halfHeight, 0],
        maxPos: [halfWidth, halfHeight, 0],
      },
    },
    ver: '1.0.12',
    imported: true,
    files: ['.json'],
    subMetas: {},
  };
}

export function createPreviewImageMeta(relativeAssetPath, rasterPolicy, imageInfo, existingMeta = null) {
  const uuid = existingMeta?.uuid ?? randomUUID();
  const displayName = path.basename(relativeAssetPath, '.png');
  const textureSubMeta = createTextureSubMeta(
    uuid,
    displayName,
    rasterPolicy.mode === 'tile' ? 'repeat' : 'clamp-to-edge',
  );

  if (rasterPolicy.mode === 'tile') {
    return {
      ver: '1.0.27',
      importer: 'image',
      imported: true,
      uuid,
      files: ['.json', '.png'],
      subMetas: {
        [TEXTURE_SUBMETA_ID]: textureSubMeta,
      },
      userData: {
        type: 'texture',
        fixAlphaTransparencyArtifacts: false,
        hasAlpha: true,
        redirect: `${uuid}@${TEXTURE_SUBMETA_ID}`,
      },
    };
  }

  const width = Math.max(1, Math.round(imageInfo?.width ?? 1));
  const height = Math.max(1, Math.round(imageInfo?.height ?? 1));
  return {
    ver: '1.0.27',
    importer: 'image',
    imported: true,
    uuid,
    files: ['.json', '.png'],
    subMetas: {
      [SPRITE_FRAME_SUBMETA_ID]: createSpriteFrameSubMeta(uuid, displayName, width, height),
      [TEXTURE_SUBMETA_ID]: textureSubMeta,
    },
    userData: {
      type: 'sprite-frame',
      fixAlphaTransparencyArtifacts: false,
      hasAlpha: true,
      redirect: `${uuid}@${TEXTURE_SUBMETA_ID}`,
    },
  };
}

function createLibrarySpriteFrameJson(spriteFrameMeta) {
  const spriteFrameData = spriteFrameMeta?.userData ?? {};
  const vertices = spriteFrameData.vertices ?? {};
  const rawPosition = vertices.rawPosition ?? [];
  const minPos = Array.isArray(vertices.minPos)
    ? { x: vertices.minPos[0] ?? 0, y: vertices.minPos[1] ?? 0, z: vertices.minPos[2] ?? 0 }
    : { x: vertices.minPos?.x ?? 0, y: vertices.minPos?.y ?? 0, z: vertices.minPos?.z ?? 0 };
  const maxPos = Array.isArray(vertices.maxPos)
    ? { x: vertices.maxPos[0] ?? 0, y: vertices.maxPos[1] ?? 0, z: vertices.maxPos[2] ?? 0 }
    : { x: vertices.maxPos?.x ?? 0, y: vertices.maxPos?.y ?? 0, z: vertices.maxPos?.z ?? 0 };

  return {
    __type__: 'cc.SpriteFrame',
    content: {
      name: spriteFrameMeta.displayName ?? 'spriteFrame',
      atlas: '',
      rect: {
        x: spriteFrameData.trimX ?? 0,
        y: spriteFrameData.trimY ?? 0,
        width: spriteFrameData.width ?? 1,
        height: spriteFrameData.height ?? 1,
      },
      offset: {
        x: spriteFrameData.offsetX ?? 0,
        y: spriteFrameData.offsetY ?? 0,
      },
      originalSize: {
        width: spriteFrameData.rawWidth ?? spriteFrameData.width ?? 1,
        height: spriteFrameData.rawHeight ?? spriteFrameData.height ?? 1,
      },
      rotated: !!spriteFrameData.rotated,
      capInsets: [
        spriteFrameData.borderTop ?? 0,
        spriteFrameData.borderBottom ?? 0,
        spriteFrameData.borderLeft ?? 0,
        spriteFrameData.borderRight ?? 0,
      ],
      vertices: {
        rawPosition,
        indexes: vertices.indexes ?? [0, 1, 2, 2, 1, 3],
        uv: vertices.uv ?? [0, spriteFrameData.height ?? 1, spriteFrameData.width ?? 1, spriteFrameData.height ?? 1, 0, 0, spriteFrameData.width ?? 1, 0],
        nuv: vertices.nuv ?? [0, 0, 1, 0, 0, 1, 1, 1],
        minPos,
        maxPos,
      },
      texture: spriteFrameData.imageUuidOrDatabaseUri ?? '',
      packable: spriteFrameData.packable ?? true,
      pixelsToUnit: spriteFrameData.pixelsToUnit ?? 100,
      pivot: {
        x: spriteFrameData.pivotX ?? 0.5,
        y: spriteFrameData.pivotY ?? 0.5,
      },
      meshType: spriteFrameData.meshType ?? 0,
    },
  };
}

function createEmptyLibraryAssetsData() {
  return {};
}

export async function syncPreviewLibrarySpriteFrameCache(projectRoot, relativeAssetPath, imageMeta) {
  const spriteFrameMeta = imageMeta?.subMetas?.[SPRITE_FRAME_SUBMETA_ID];
  const textureMeta = imageMeta?.subMetas?.[TEXTURE_SUBMETA_ID];
  if (!spriteFrameMeta?.uuid || !textureMeta?.uuid || !imageMeta?.uuid) {
    return null;
  }

  const libraryRoot = path.join(projectRoot, 'library');
  const libraryDirectory = path.join(libraryRoot, imageMeta.uuid.slice(0, 2));
  const librarySpriteFramePath = path.join(libraryDirectory, `${spriteFrameMeta.uuid}.json`);
  const assetsDataPath = path.join(libraryRoot, '.assets-data.json');
  const spriteFrameUrl = `db://${relativeAssetPath.replaceAll('\\', '/')}@${SPRITE_FRAME_SUBMETA_ID}`;

  await mkdir(libraryDirectory, { recursive: true });
  await writeFile(
    librarySpriteFramePath,
    `${JSON.stringify(createLibrarySpriteFrameJson(spriteFrameMeta), null, 2)}\n`,
    'utf8',
  );

  const assetsData = await readJsonOrDefault(assetsDataPath, createEmptyLibraryAssetsData);
  assetsData[spriteFrameMeta.uuid] = {
    url: spriteFrameUrl,
    value: {
      depends: [textureMeta.uuid],
    },
    versionCode: 1,
  };
  await writeFile(assetsDataPath, `${JSON.stringify(assetsData, null, 2)}\n`, 'utf8');

  return {
    librarySpriteFramePath,
    spriteFrameUuid: spriteFrameMeta.uuid,
  };
}

function readRawPixel(data, offset) {
  return {
    r: data[offset],
    g: data[offset + 1],
    b: data[offset + 2],
    a: data[offset + 3],
  };
}

function rgbDistanceToSample(pixel, sample) {
  const rDelta = pixel.r - sample.r;
  const gDelta = pixel.g - sample.g;
  const bDelta = pixel.b - sample.b;
  return Math.sqrt((rDelta * rDelta) + (gDelta * gDelta) + (bDelta * bDelta));
}

async function removeObjectBackdrop(sourceAbsolutePath) {
  const { data, info } = await sharp(sourceAbsolutePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const pixelOffset = (x, y) => (y * width + x) * channels;
  const cornerSamples = [
    readRawPixel(data, pixelOffset(0, 0)),
    readRawPixel(data, pixelOffset(width - 1, 0)),
    readRawPixel(data, pixelOffset(0, height - 1)),
    readRawPixel(data, pixelOffset(width - 1, height - 1)),
  ];
  const visited = new Uint8Array(width * height);
  const queue = [];

  const matchesBackdrop = (x, y) => {
    const offset = pixelOffset(x, y);
    const pixel = readRawPixel(data, offset);
    if (pixel.a <= 0) {
      return false;
    }

    const brightness = (pixel.r + pixel.g + pixel.b) / (255 * 3);
    const channelSpread = Math.max(pixel.r, pixel.g, pixel.b) - Math.min(pixel.r, pixel.g, pixel.b);
    if (brightness < 0.84 || channelSpread > 24) {
      return false;
    }

    return cornerSamples.some((sample) => rgbDistanceToSample(pixel, sample) <= 34);
  };

  const enqueue = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }

    const index = (y * width) + x;
    if (visited[index]) {
      return;
    }

    visited[index] = 1;
    if (matchesBackdrop(x, y)) {
      queue.push([x, y]);
    }
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const offset = pixelOffset(x, y);
    data[offset + 3] = 0;

    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }

  return sharp(data, {
    raw: {
      width,
      height,
      channels,
    },
  });
}

async function ensureDirectoryWithMeta(projectRoot, absoluteDirectoryPath, dryRun) {
  const relativeDirectoryPath = path.relative(projectRoot, absoluteDirectoryPath);
  if (!relativeDirectoryPath || relativeDirectoryPath.startsWith('..')) {
    throw new Error(`Directory for candidate staging must stay within project root: ${absoluteDirectoryPath}`);
  }

  const segments = relativeDirectoryPath.split(path.sep).filter(Boolean);
  let currentPath = projectRoot;
  for (const segment of segments) {
    currentPath = path.join(currentPath, segment);
    const metaPath = `${currentPath}.meta`;
    if (!dryRun) {
      await mkdir(currentPath, { recursive: true });
      if (!(await pathExists(metaPath))) {
        await writeFile(metaPath, `${JSON.stringify(createDirectoryMeta(), null, 2)}\n`, 'utf8');
      }
    }
  }
}

function planImportedCandidatePath(projectRoot, importRoot, bindingKey, selectedFilePath) {
  const resolvedImportRoot = path.resolve(projectRoot, importRoot);
  const relativeImportRoot = toPosixRelative(projectRoot, resolvedImportRoot);
  assertAssetsRelativePath(relativeImportRoot, '--import-root');

  const fileName = path.basename(selectedFilePath);
  const targetAbsolutePath = path.join(resolvedImportRoot, bindingKey, fileName);
  const targetRelativePath = toPosixRelative(projectRoot, targetAbsolutePath);
  assertAssetsRelativePath(targetRelativePath, 'Imported candidate path');
  if (path.extname(targetRelativePath).toLowerCase() !== '.png') {
    throw new Error(`Imported candidate must stay a .png asset: ${targetRelativePath}`);
  }

  return {
    targetAbsolutePath,
    targetRelativePath,
  };
}

async function materializeCandidateIntoAssets(projectRoot, importRoot, bindingKey, selectedFilePath, dryRun) {
  const sourceAbsolutePath = path.resolve(projectRoot, selectedFilePath);
  const { targetAbsolutePath, targetRelativePath } = planImportedCandidatePath(
    projectRoot,
    importRoot,
    bindingKey,
    selectedFilePath,
  );
  const rasterPolicy = resolvePreviewRasterPolicy(bindingKey);

  if (!dryRun) {
    await ensureDirectoryWithMeta(projectRoot, path.dirname(targetAbsolutePath), false);
    const outputInfo = await writePreviewCandidateAsset(sourceAbsolutePath, targetAbsolutePath, { bindingKey });
    const metaPath = `${targetAbsolutePath}.meta`;
    const existingMeta = await readJsonOrDefault(metaPath, () => null);
    const imageMeta = createPreviewImageMeta(targetRelativePath, rasterPolicy, outputInfo, existingMeta);
    await writeFile(metaPath, `${JSON.stringify(imageMeta, null, 2)}\n`, 'utf8');
    await syncPreviewLibrarySpriteFrameCache(projectRoot, targetRelativePath, imageMeta);
  }

  return targetRelativePath;
}

export function resolvePreviewRasterPolicy(bindingKey) {
  const matchedRule = PREVIEW_TILE_DIMENSIONS.find((rule) => rule.pattern.test(bindingKey));
  if (matchedRule) {
    return {
      mode: 'tile',
      edge: matchedRule.edge,
    };
  }

  const matchedObjectRule = PREVIEW_OBJECT_DIMENSIONS.find((rule) => rule.pattern.test(bindingKey));
  if (matchedObjectRule) {
    const policy = {
      mode: 'object',
      maxEdge: matchedObjectRule.maxEdge,
      trimTransparent: true,
    };
    if (matchedObjectRule.minEdge != null) {
      policy.minEdge = matchedObjectRule.minEdge;
    }
    if (matchedObjectRule.upscaleKernel) {
      policy.upscaleKernel = matchedObjectRule.upscaleKernel;
    }
    return policy;
  }

  return {
    mode: 'preserve',
    maxEdge: DEFAULT_PREVIEW_MAX_EDGE,
  };
}

async function writePreviewCandidateAsset(sourceAbsolutePath, targetAbsolutePath, options = {}) {
  const extension = path.extname(sourceAbsolutePath).toLowerCase();
  if (extension !== '.png') {
    await copyFile(sourceAbsolutePath, targetAbsolutePath);
    const metadata = await sharp(targetAbsolutePath).metadata();
    return {
      width: metadata.width ?? 1,
      height: metadata.height ?? 1,
    };
  }

  const rasterPolicy = resolvePreviewRasterPolicy(options.bindingKey ?? '');
  const sourceImage = rasterPolicy.mode === 'object'
    ? await removeObjectBackdrop(sourceAbsolutePath)
    : sharp(sourceAbsolutePath);
  const objectSource = rasterPolicy.mode === 'object'
    ? sourceImage.trim()
    : sourceImage;
  const metadata = await objectSource.metadata();
  const maxEdge = Math.max(metadata.width ?? 0, metadata.height ?? 0);
  let pipeline = objectSource;

  if (rasterPolicy.mode === 'tile') {
    const targetEdge = Math.max(1, rasterPolicy.edge);
    pipeline = sourceImage.resize(targetEdge, targetEdge, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    });
  } else if (rasterPolicy.mode === 'object') {
    const maxTargetEdge = Math.max(1, rasterPolicy.maxEdge ?? DEFAULT_PREVIEW_MAX_EDGE);
    const minTargetEdge = Math.max(0, rasterPolicy.minEdge ?? 0);
    const shouldDownscale = maxEdge > maxTargetEdge;
    const shouldUpscale = minTargetEdge > 0 && maxEdge > 0 && maxEdge < minTargetEdge;
    if (shouldDownscale || shouldUpscale) {
      const targetEdge = shouldUpscale ? minTargetEdge : maxTargetEdge;
      const kernel = shouldUpscale && rasterPolicy.upscaleKernel === 'nearest'
        ? sharp.kernel.nearest
        : sharp.kernel.lanczos3;
      pipeline = objectSource.resize(targetEdge, targetEdge, {
        fit: 'inside',
        kernel,
        withoutEnlargement: !shouldUpscale,
      });
    }
  } else if (maxEdge > DEFAULT_PREVIEW_MAX_EDGE) {
    pipeline = sourceImage.resize(DEFAULT_PREVIEW_MAX_EDGE, DEFAULT_PREVIEW_MAX_EDGE, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const { data, info } = await pipeline
    .png({
      compressionLevel: 9,
      palette: true,
      quality: DEFAULT_PREVIEW_PNG_QUALITY,
      effort: 10,
    })
    .toBuffer({ resolveWithObject: true });

  await writeFile(targetAbsolutePath, data);
  return {
    width: info.width ?? metadata.width ?? 1,
    height: info.height ?? metadata.height ?? 1,
  };
}

export async function stageCandidateBindings({
  projectRoot = process.cwd(),
  reportPath,
  manifestPath = DEFAULT_MANIFEST_PATH,
  importRoot = DEFAULT_IMPORT_ROOT,
  policy = 'first-passing',
  dryRun = false,
} = {}) {
  if (!reportPath) {
    throw new Error('stageCandidateBindings requires reportPath');
  }

  const absoluteReportPath = path.resolve(projectRoot, reportPath);
  const absoluteManifestPath = path.resolve(projectRoot, manifestPath);
  const report = await readJson(absoluteReportPath);
  const manifest = await readJsonOrDefault(absoluteManifestPath, () => createEmptyCandidateManifest());
  const selections = pickSelections(report, policy);
  const imported = [];
  const skipped = [];

  manifest.worldEntities ??= {};
  manifest.uiEntities ??= {};
  manifest.audioRoles ??= {};

  for (const { bindingKey, selected } of selections) {
    const absoluteCandidatePath = path.resolve(projectRoot, selected.filePath);
    const relativeCandidatePath = toPosixRelative(projectRoot, absoluteCandidatePath);
    let selectedPath = relativeCandidatePath;

    if (!relativeCandidatePath.startsWith('assets/')) {
      if (!importRoot) {
        skipped.push({
          bindingKey,
          candidateFile: relativeCandidatePath,
          reason: 'outside-assets-without-import-root',
        });
        continue;
      }

      selectedPath = await materializeCandidateIntoAssets(
        projectRoot,
        importRoot,
        bindingKey,
        selected.filePath,
        dryRun,
      );
      imported.push({
        bindingKey,
        sourceFile: relativeCandidatePath,
        importedPath: selectedPath,
      });
    }

    manifest.worldEntities[bindingKey] = {
      selectedPath,
      fallbackPath: '',
      status: 'candidate_preview',
      previewRasterPolicy: resolvePreviewRasterPolicy(bindingKey),
      source: inferCandidateSource(selected.filePath),
      sourceManifest: 'asset_binding_candidate_manifest_image2.worldEntities',
      batchId: report.summary?.batchId ?? '',
      candidateFile: selected.filePath,
      screeningReport: toPosixRelative(projectRoot, absoluteReportPath),
    };
  }

  manifest.generatedAt = new Date().toISOString();
  manifest.selectionPolicy = policy;

  if (!dryRun) {
    await mkdir(path.dirname(absoluteManifestPath), { recursive: true });
    await writeFile(absoluteManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  return {
    manifest,
    manifestPath: absoluteManifestPath,
    selections,
    imported,
    skipped,
    writtenCount: Object.keys(manifest.worldEntities).length,
  };
}

async function main() {
  const args = parseArgs();
  const result = await stageCandidateBindings({
    reportPath: args.report,
    manifestPath: args.manifest,
    importRoot: args.importRoot,
    policy: args.policy,
    dryRun: args.dryRun,
  });

  for (const skipped of result.skipped) {
    console.warn(
      `[image2-stage] skip ${skipped.bindingKey}: ${skipped.candidateFile} is outside assets/ and cannot be preview-bound without --import-root.`,
    );
  }
  for (const imported of result.imported) {
    console.log(`[image2-stage] import ${imported.bindingKey}: ${imported.sourceFile} -> ${imported.importedPath}`);
  }

  if (args.dryRun) {
    console.log(`[image2-stage] dry run selections: ${result.writtenCount}`);
    console.log(JSON.stringify(result.manifest, null, 2));
    return;
  }

  console.log(`[image2-stage] wrote ${result.manifestPath}`);
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
