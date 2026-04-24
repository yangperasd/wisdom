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
const DEFAULT_PREVIEW_MAX_EDGE = 512;
const DEFAULT_PREVIEW_PNG_QUALITY = 80;
const PREVIEW_TILE_DIMENSIONS = [
  { pattern: /^outdoor_ground_/i, edge: 32 },
  { pattern: /^outdoor_path_/i, edge: 32 },
  { pattern: /^outdoor_wall_/i, edge: 64 },
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

function createTextureMeta(relativeAssetPath) {
  const uuid = randomUUID();
  const displayName = path.basename(relativeAssetPath, '.png');
  return {
    ver: '1.0.27',
    importer: 'image',
    imported: true,
    uuid,
    files: ['.json', '.png'],
    subMetas: {
      [TEXTURE_SUBMETA_ID]: {
        importer: 'texture',
        uuid: `${uuid}@${TEXTURE_SUBMETA_ID}`,
        displayName,
        id: TEXTURE_SUBMETA_ID,
        name: 'texture',
        userData: {
          wrapModeS: 'repeat',
          wrapModeT: 'repeat',
          minfilter: 'linear',
          magfilter: 'linear',
          mipfilter: 'none',
          anisotropy: 0,
          isUuid: true,
          imageUuidOrDatabaseUri: uuid,
          visible: false,
        },
        ver: '1.0.22',
        imported: true,
        files: ['.json'],
        subMetas: {},
      },
    },
    userData: {
      type: 'texture',
      fixAlphaTransparencyArtifacts: false,
      hasAlpha: true,
      redirect: `${uuid}@${TEXTURE_SUBMETA_ID}`,
    },
  };
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

  if (!dryRun) {
    await ensureDirectoryWithMeta(projectRoot, path.dirname(targetAbsolutePath), false);
    await writePreviewCandidateAsset(sourceAbsolutePath, targetAbsolutePath, { bindingKey });

    const metaPath = `${targetAbsolutePath}.meta`;
    if (!(await pathExists(metaPath))) {
      await writeFile(metaPath, `${JSON.stringify(createTextureMeta(targetRelativePath), null, 2)}\n`, 'utf8');
    }
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

  return {
    mode: 'preserve',
    maxEdge: DEFAULT_PREVIEW_MAX_EDGE,
  };
}

async function writePreviewCandidateAsset(sourceAbsolutePath, targetAbsolutePath, options = {}) {
  const extension = path.extname(sourceAbsolutePath).toLowerCase();
  if (extension !== '.png') {
    await copyFile(sourceAbsolutePath, targetAbsolutePath);
    return;
  }

  const rasterPolicy = resolvePreviewRasterPolicy(options.bindingKey ?? '');
  const sourceImage = sharp(sourceAbsolutePath);
  const metadata = await sourceImage.metadata();
  const maxEdge = Math.max(metadata.width ?? 0, metadata.height ?? 0);
  let pipeline = sourceImage;

  if (rasterPolicy.mode === 'tile') {
    const targetEdge = Math.max(1, rasterPolicy.edge);
    pipeline = sourceImage.resize(targetEdge, targetEdge, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    });
  } else if (maxEdge > DEFAULT_PREVIEW_MAX_EDGE) {
    pipeline = sourceImage.resize(DEFAULT_PREVIEW_MAX_EDGE, DEFAULT_PREVIEW_MAX_EDGE, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const outputBuffer = await pipeline
    .png({
      compressionLevel: 9,
      palette: true,
      quality: DEFAULT_PREVIEW_PNG_QUALITY,
      effort: 10,
    })
    .toBuffer();

  await writeFile(targetAbsolutePath, outputBuffer);
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
