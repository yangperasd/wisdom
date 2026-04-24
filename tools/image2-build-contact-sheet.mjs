import sharp from 'sharp';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    input: '',
    output: '',
    metadataOutput: '',
    filter: '',
    title: '',
    tilePreview: false,
    recursive: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--input') args.input = argv[++i] ?? '';
    else if (value === '--output') args.output = argv[++i] ?? '';
    else if (value === '--metadata-output') args.metadataOutput = argv[++i] ?? '';
    else if (value === '--filter') args.filter = argv[++i] ?? '';
    else if (value === '--title') args.title = argv[++i] ?? '';
    else if (value === '--tile-preview') args.tilePreview = true;
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

function createLabelSvg(text, width, height) {
  const safeText = text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" rx="10" ry="10" fill="#fff9ef" stroke="#d8c8ac" stroke-width="2"/>
      <text
        x="12"
        y="22"
        font-family="Segoe UI, Arial, sans-serif"
        font-size="14"
        fill="#4d4135"
      >${safeText}</text>
    </svg>
  `);
}

async function renderCard(filePath, options) {
  const image = sharp(filePath).ensureAlpha();
  const metadata = await image.metadata();
  const fitWidth = 136;
  const fitHeight = 136;
  const cardWidth = 216;
  const cardHeight = options.tilePreview ? 260 : 188;
  const previewX = 20;
  const previewY = 18;
  const tilePreviewY = 164;
  const labelHeight = 34;
  const labelY = options.tilePreview ? 216 : 142;
  const previewBuffer = await image
    .resize(fitWidth, fitHeight, {
      fit: 'contain',
      kernel: 'nearest',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  const composites = [
    {
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}">
        <rect width="100%" height="100%" rx="16" ry="16" fill="#fff6e8" stroke="#dbc8aa" stroke-width="2"/>
        <rect x="${previewX - 4}" y="${previewY - 4}" width="${fitWidth + 8}" height="${fitHeight + 8}" rx="12" ry="12" fill="#f6eddf" stroke="#e3d5bc" stroke-width="1"/>
      </svg>`),
      top: 0,
      left: 0,
    },
    {
      input: previewBuffer,
      top: previewY,
      left: previewX,
    },
    {
      input: createLabelSvg(path.basename(filePath), cardWidth - 24, labelHeight),
      top: labelY,
      left: 12,
    },
  ];

  if (options.tilePreview) {
    const tileBuffer = await image
      .resize(48, 48, {
        fit: 'fill',
        kernel: 'nearest',
      })
      .png()
      .toBuffer();
    const tileComposite = [
      { input: tileBuffer, top: tilePreviewY, left: 12 },
      { input: tileBuffer, top: tilePreviewY, left: 60 },
      { input: tileBuffer, top: tilePreviewY + 48, left: 12 },
      { input: tileBuffer, top: tilePreviewY + 48, left: 60 },
    ];
    composites.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}">
        <rect x="12" y="${tilePreviewY}" width="96" height="96" rx="8" ry="8" fill="#f2e7d1" stroke="#d5c3a5" stroke-width="1"/>
        <text x="122" y="${tilePreviewY + 18}" font-family="Segoe UI, Arial, sans-serif" font-size="13" fill="#5a4b3c">2x2 repeat</text>
        <text x="122" y="${tilePreviewY + 40}" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="#7b6a57">${metadata.width ?? '?'}x${metadata.height ?? '?'}</text>
      </svg>`),
      top: 0,
      left: 0,
    });
    composites.push(...tileComposite);
  }

  return sharp({
    create: {
      width: cardWidth,
      height: cardHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

async function main() {
  const args = parseArgs();
  const inputDir = path.resolve(args.input);
  const outputPath = path.resolve(args.output || path.join(inputDir, 'contact-sheet.png'));
  const metadataOutputPath = path.resolve(args.metadataOutput || `${outputPath}.json`);
  const filterRegex = args.filter ? new RegExp(args.filter, 'i') : null;
  const files = (await listPngFiles(inputDir, { recursive: args.recursive }))
    .filter((filePath) => (filterRegex ? filterRegex.test(path.basename(filePath)) : true));

  if (files.length === 0) {
    throw new Error(`No PNG files found under ${inputDir}`);
  }

  const cards = [];
  for (const filePath of files) {
    cards.push({
      filePath,
      buffer: await renderCard(filePath, { tilePreview: args.tilePreview }),
    });
  }

  const cardWidth = 216;
  const cardHeight = args.tilePreview ? 260 : 188;
  const titleHeight = args.title ? 52 : 0;
  const gutter = 16;
  const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(cards.length))));
  const rows = Math.ceil(cards.length / columns);
  const sheetWidth = columns * cardWidth + (columns + 1) * gutter;
  const sheetHeight = rows * cardHeight + (rows + 1) * gutter + titleHeight;
  const composites = [];

  for (let index = 0; index < cards.length; index += 1) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    composites.push({
      input: cards[index].buffer,
      left: gutter + column * (cardWidth + gutter),
      top: titleHeight + gutter + row * (cardHeight + gutter),
    });
  }

  if (args.title) {
    const safeTitle = args.title
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
    composites.unshift({
      input: Buffer.from(`
        <svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="${titleHeight}">
          <text x="${gutter}" y="32" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#4d4135">${safeTitle}</text>
        </svg>
      `),
      left: 0,
      top: 0,
    });
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: { r: 248, g: 243, b: 232, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outputPath);

  await writeFile(
    metadataOutputPath,
    `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      inputDir,
      outputPath,
      title: args.title,
      tilePreview: args.tilePreview,
      fileCount: files.length,
      files: files.map((filePath) => path.relative(process.cwd(), filePath).replaceAll('\\', '/')),
    }, null, 2)}\n`,
    'utf8',
  );

  console.log(`[image2-contact-sheet] wrote ${outputPath}`);
  console.log(`[image2-contact-sheet] metadata ${metadataOutputPath}`);
  console.log(`[image2-contact-sheet] cards ${files.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
