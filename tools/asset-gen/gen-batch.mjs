/**
 * gen-batch.mjs
 *
 * Batch-generates candidate sprites by submitting workflow JSONs to a local
 * ComfyUI server (http://127.0.0.1:8188). Each prompt produces N candidates
 * (config.generation.candidates_per_prompt). Generated PNGs land in
 * `generated/{category}/{id}_v{N}.png`. Running ComfyUI server is required;
 * this script does NOT launch it.
 *
 * Usage:
 *   node gen-batch.mjs --category items
 *   node gen-batch.mjs --category echoes --limit 5
 *   node gen-batch.mjs --all
 */
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = import.meta.dirname;
const config = JSON.parse(await readFile(join(ROOT, 'config.json'), 'utf-8'));

const COMFY_URL = config.comfyui.api_url;
const PROMPTS_DIR = join(ROOT, 'prompts');
const WORKFLOWS_DIR = join(ROOT, 'comfyui-workflows');
const REF_DIR = join(ROOT, 'reference-sheets');
const OUT_DIR = join(ROOT, 'generated');

// ── CLI args ────────────────────────────────────────────────────────

function parseArgs() {
  const args = { category: null, limit: null, all: false, dryRun: false };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--category') args.category = process.argv[++i];
    else if (a === '--limit') args.limit = parseInt(process.argv[++i], 10);
  }
  return args;
}

// ── ComfyUI API ─────────────────────────────────────────────────────

async function checkComfyAvailable() {
  try {
    const res = await fetch(`${COMFY_URL}/system_stats`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch { return false; }
}

async function queuePrompt(workflow) {
  const res = await fetch(`${COMFY_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: 'asset-gen' })
  });
  if (!res.ok) throw new Error(`ComfyUI queue failed: ${res.status} ${await res.text()}`);
  return await res.json(); // { prompt_id, number, node_errors }
}

async function waitForCompletion(promptId, timeoutMs = null) {
  const effectiveTimeout = timeoutMs ?? (config.comfyui.timeout_ms || 600000);
  const start = Date.now();
  while (Date.now() - start < effectiveTimeout) {
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(`${COMFY_URL}/history/${promptId}`);
    if (!res.ok) continue;
    const history = await res.json();
    if (history[promptId] && history[promptId].outputs) return history[promptId].outputs;
  }
  // Last-chance check before throwing (sometimes the very last poll lands right at deadline)
  try {
    const finalRes = await fetch(`${COMFY_URL}/history/${promptId}`);
    if (finalRes.ok) {
      const fh = await finalRes.json();
      if (fh[promptId] && fh[promptId].outputs) return fh[promptId].outputs;
    }
  } catch {}
  throw new Error(`Timeout waiting for prompt ${promptId} after ${(effectiveTimeout/1000).toFixed(0)}s`);
}

async function downloadGeneratedImage(filename, subfolder, type, destPath) {
  const url = `${COMFY_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder || '')}&type=${type || 'output'}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
}

// ── Workflow substitution ───────────────────────────────────────────

function substituteWorkflow(template, vars) {
  const json = JSON.stringify(template);
  let out = json;
  for (const [key, val] of Object.entries(vars)) {
    const placeholder = `"{{${key}}}"`;
    const replacement = typeof val === 'number' ? String(val) : JSON.stringify(val);
    out = out.replaceAll(placeholder, replacement);
    // Also handle non-quoted (string interpolation)
    out = out.replaceAll(`{{${key}}}`, String(val));
  }
  return JSON.parse(out);
}

function pickReferenceImage(category) {
  // Map prompt category to category-specific Denzi peer reference sheet.
  // weapons/armor sheets built by build-peer-sheets.mjs from same-class sprites.
  const map = {
    weapon: 'denzi-tech-weapons-ref.png',
    armor: 'denzi-tech-armor-ref.png',
    consumable: 'denzi-tech-items-ref.png',
    key: 'denzi-tech-items-ref.png',
    treasure: 'denzi-tech-items-ref.png',
    accessory: 'denzi-tech-items-ref.png',
    tool: 'denzi-tech-items-ref.png',
    pickup: 'denzi-tech-items-ref.png',
    summon: 'denzi-tech-enemies-ref.png',
    enemy: 'denzi-tech-enemies-ref.png',
    explosion: 'denzi-tech-enemies-ref.png',
    heal: 'denzi-tech-enemies-ref.png',
    impact: 'denzi-tech-enemies-ref.png',
    magic: 'denzi-tech-env-ref.png',
    portal: 'denzi-tech-env-ref.png',
    particle: 'denzi-tech-env-ref.png',
    trail: 'denzi-tech-enemies-ref.png',
    button: 'denzi-tech-env-ref.png',
    panel: 'denzi-tech-env-ref.png',
    bar: 'denzi-tech-env-ref.png',
    icon: 'denzi-tech-items-ref.png',
    tile: 'denzi-tech-env-ref.png',
    marker: 'denzi-tech-env-ref.png'
  };
  return map[category] || 'denzi-tech-items-ref.png';
}

// ── Process a single prompt entry ───────────────────────────────────

async function generateCandidates(promptEntry, workflowTemplate, dryRun = false) {
  const { id, category, prompt, negative } = promptEntry;
  const baseRes = config.generation.base_resolution;
  const numCandidates = config.generation.candidates_per_prompt;
  const batchSize = config.generation.batch_size;

  const categoryOutDir = join(OUT_DIR, category);
  await mkdir(categoryOutDir, { recursive: true });

  const refImage = pickReferenceImage(category);
  // Note: ComfyUI's LoadImage expects images in its `input/` folder.
  // We'll need to copy the reference there once during setup.
  // For now we use the raw filename and assume it's been placed.

  console.log(`\n[${id}] generating ${numCandidates} candidates (batches of ${batchSize})`);

  const totalBatches = Math.ceil(numCandidates / batchSize);
  let candidateIdx = 0;

  for (let b = 0; b < totalBatches; b++) {
    const seed = Math.floor(Math.random() * 0xffffffff);
    const filenamePrefix = `${id}_batch${b}`;
    const wf = substituteWorkflow(workflowTemplate, {
      PROMPT: prompt,
      NEGATIVE: negative,
      SEED: seed,
      REF_IMAGE_PATH: refImage,
      BASE_W: baseRes[0],
      BASE_H: baseRes[1],
      BATCH_SIZE: batchSize,
      FILENAME_PREFIX: filenamePrefix
    });

    if (dryRun) {
      console.log(`  [DRY] would queue batch ${b} (seed=${seed})`);
      candidateIdx += batchSize;
      continue;
    }

    try {
      const { prompt_id } = await queuePrompt(wf);
      console.log(`  batch ${b}: prompt_id=${prompt_id}, waiting...`);
      // First batch of the entire run absorbs model-load latency (~2-3 min cold start)
      const isFirstEverBatch = (candidateIdx === 0 && b === 0);
      const extraMs = isFirstEverBatch ? (config.comfyui.first_prompt_extra_ms || 180000) : 0;
      const outputs = await waitForCompletion(prompt_id, (config.comfyui.timeout_ms || 600000) + extraMs);

      // outputs = { "9": { images: [{ filename, subfolder, type }] } }
      const node9 = outputs['9'];
      if (!node9 || !node9.images) {
        console.warn(`  batch ${b}: no images in output`);
        continue;
      }

      for (const img of node9.images) {
        const destName = `${id}_v${candidateIdx.toString().padStart(2, '0')}.png`;
        const destPath = join(categoryOutDir, destName);
        await downloadGeneratedImage(img.filename, img.subfolder, img.type, destPath);
        console.log(`    saved ${destName}`);
        candidateIdx++;
        if (candidateIdx >= numCandidates) break;
      }
    } catch (err) {
      console.error(`  batch ${b} failed:`, err.message);
    }
  }

  return candidateIdx;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  if (!args.category && !args.all) {
    console.error('Usage: node gen-batch.mjs --category <items|echoes|effects|ui> [--limit N] [--dry-run]');
    console.error('       node gen-batch.mjs --all');
    process.exit(1);
  }

  if (!args.dryRun) {
    console.log('Checking ComfyUI availability...');
    const ok = await checkComfyAvailable();
    if (!ok) {
      console.error(`ComfyUI not reachable at ${COMFY_URL}. Start ComfyUI server first (python main.py --listen).`);
      process.exit(1);
    }
    console.log('ComfyUI is up.');
  }

  // Determine which categories to process
  const allCategories = ['items', 'echoes', 'effects', 'ui', 'tiles'];
  const categories = args.all ? allCategories : [args.category];

  // Pick workflow template (currently shared, can specialize later)
  const workflowPath = join(WORKFLOWS_DIR, 'items-icon.json');
  const workflowTemplate = JSON.parse(await readFile(workflowPath, 'utf-8'));
  delete workflowTemplate._comment;

  let totalGenerated = 0;
  for (const cat of categories) {
    const promptFile = join(PROMPTS_DIR, `${cat}.jsonl`);
    if (!existsSync(promptFile)) {
      console.warn(`Skip ${cat}: ${promptFile} not found`);
      continue;
    }

    const lines = (await readFile(promptFile, 'utf-8')).split('\n').filter(l => l.trim());
    const entries = lines.map(l => JSON.parse(l));
    const sliced = args.limit ? entries.slice(0, args.limit) : entries;

    console.log(`\n=== Category: ${cat} (${sliced.length} prompts) ===`);
    for (const entry of sliced) {
      // Resume-skip: if all N candidates for this prompt already exist on disk, skip.
      // This lets watchdog-initiated restarts pick up where the previous run left off
      // instead of re-doing the first several prompts every time.
      const perPromptCategoryDir = join(OUT_DIR, entry.category);
      const numCandidates = config.generation.candidates_per_prompt;
      let allPresent = existsSync(perPromptCategoryDir);
      if (allPresent) {
        for (let v = 0; v < numCandidates; v++) {
          const fname = join(perPromptCategoryDir, `${entry.id}_v${v.toString().padStart(2,'0')}.png`);
          if (!existsSync(fname)) { allPresent = false; break; }
        }
      }
      if (allPresent) {
        console.log(`[${entry.id}] SKIP (${numCandidates} candidates already present)`);
        continue;
      }

      const n = await generateCandidates(entry, workflowTemplate, args.dryRun);
      totalGenerated += n;
    }
  }

  console.log(`\nDone. Generated ${totalGenerated} candidate images total.`);
}

main().catch(err => { console.error(err); process.exit(1); });
