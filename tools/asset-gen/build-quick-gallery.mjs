/**
 * build-quick-gallery.mjs
 *
 * Builds a quick-review HTML gallery from auto-selected.json — no agent
 * verdicts required. Shows each candidate at 1x and 4x (nearest-neighbor)
 * along with category, score from auto-select, and Approve/Reject/Deep-Screen
 * buttons. Output: `quick-gallery.html` (self-contained with base64 images).
 *
 * Intended for the "human does first-pass visual review before burning API
 * calls on deep agent screening" workflow.
 */
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = import.meta.dirname;

async function imageToDataUrl(filePath, upscale = null) {
  if (!existsSync(filePath)) return null;
  let img = sharp(filePath).ensureAlpha();
  if (upscale) {
    const meta = await img.metadata();
    img = img.resize(meta.width * upscale, meta.height * upscale, { kernel: 'nearest' });
  }
  const buf = await img.png().toBuffer();
  return `data:image/png;base64,${buf.toString('base64')}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

async function main() {
  const asPath = join(ROOT, 'screened', 'auto-selected.json');
  if (!existsSync(asPath)) {
    console.error('auto-selected.json not found. Run auto-select-top.mjs first.');
    process.exit(1);
  }
  const data = JSON.parse(await readFile(asPath, 'utf-8'));
  console.log(`Building quick gallery for ${data.selected.length} candidates...`);

  const cards = [];
  let idx = 0;
  for (const sel of data.selected) {
    idx++;
    const img1x = await imageToDataUrl(sel.path);
    const img4x = await imageToDataUrl(sel.path, 4);
    if (!img1x) continue;
    cards.push({
      id: sel.promptId,
      file: sel.file,
      category: sel.category,
      score: sel.score,
      analysis: sel.analysis,
      img1x, img4x
    });
    if (idx % 10 === 0) console.log(`  prepared ${idx}/${data.selected.length}`);
  }

  // Group by category for display
  const byCategory = {};
  for (const c of cards) (byCategory[c.category] ||= []).push(c);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Quick Review — AI-generated Echoes Assets (${cards.length})</title>
<style>
  :root { --bg: #f5efe1; --panel: #fffbef; --border: #c9b791; --gold: #cc9933; --text: #3a2e25; --muted: #8a7560; --pass: #4ea84e; --reject: #c4557a; --deep: #5fb3e6; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); }
  header {
    position: sticky; top: 0; z-index: 10; background: var(--panel);
    border-bottom: 2px solid var(--gold); padding: 12px 24px;
    display: flex; align-items: center; gap: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    flex-wrap: wrap;
  }
  h1 { margin: 0; font-size: 18px; }
  .stats { color: var(--muted); font-size: 13px; }
  .toolbar { margin-left: auto; display: flex; gap: 10px; align-items: center; }
  .toolbar button { padding: 6px 14px; border: 1px solid var(--gold); background: var(--gold); color: white; font-weight: 600; border-radius: 6px; cursor: pointer; }
  .toolbar button:hover { background: #b8861d; }
  main { padding: 20px; }
  .category-section { margin-bottom: 32px; }
  .category-title { margin: 0 0 12px 0; padding-bottom: 6px; border-bottom: 1px solid var(--border); font-size: 16px; color: var(--gold); text-transform: uppercase; letter-spacing: 0.5px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  .card {
    background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .card.approved { border-left: 4px solid var(--pass); background: linear-gradient(180deg, #e6f4e6 0%, var(--panel) 60%); }
  .card.rejected { border-left: 4px solid var(--reject); background: linear-gradient(180deg, #fadce4 0%, var(--panel) 60%); opacity: 0.75; }
  .card.deep { border-left: 4px solid var(--deep); }
  .card-header { display: flex; align-items: baseline; gap: 8px; }
  .card-id { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .card-score { background: var(--gold); color: white; padding: 1px 8px; border-radius: 10px; font-weight: 600; font-size: 12px; }
  .sprite-row {
    display: flex; gap: 8px; align-items: center; justify-content: center;
    background: repeating-conic-gradient(#e8e2d0 0% 25%, #f0e9d2 0% 50%) 50% / 10px 10px;
    padding: 12px; border-radius: 6px; border: 1px solid var(--border);
    min-height: 140px;
  }
  .sprite-row img { image-rendering: pixelated; image-rendering: crisp-edges; }
  .sprite-1x { width: 32px; height: 32px; }
  .sprite-4x { max-width: 128px; max-height: 128px; }
  .meta { font-size: 11px; color: var(--muted); line-height: 1.4; }
  .actions { display: flex; gap: 4px; }
  .actions button { flex: 1; padding: 6px 0; border: 1px solid var(--border); background: var(--bg); cursor: pointer; font-weight: 600; border-radius: 5px; font-size: 12px; }
  .actions button.approve { background: var(--pass); color: white; border-color: var(--pass); }
  .actions button.reject  { background: var(--reject); color: white; border-color: var(--reject); }
  .actions button.deep    { background: var(--deep); color: white; border-color: var(--deep); }
  .actions button.selected { box-shadow: 0 0 0 3px #2c7eb5 inset; }
</style>
</head>
<body>
<header>
  <h1>🎨 Quick Review</h1>
  <span class="stats">${cards.length} top candidates (1 per prompt) · ${Object.keys(byCategory).length} categories</span>
  <div class="toolbar">
    <button onclick="exportDecisions()">📥 Export decisions</button>
    <span class="stats" id="decided">0 decided</span>
  </div>
</header>
<main>
${Object.entries(byCategory).sort().map(([cat, items]) => `
  <section class="category-section">
    <h2 class="category-title">${escapeHtml(cat)} <span style="color:var(--muted);font-size:12px;font-weight:normal">(${items.length})</span></h2>
    <div class="grid">
      ${items.map(c => `
        <div class="card" data-id="${escapeHtml(c.id)}">
          <div class="card-header">
            <span class="card-id" title="${escapeHtml(c.id)}">${escapeHtml(c.id)}</span>
            <span class="card-score">${c.score}</span>
          </div>
          <div class="sprite-row">
            <img class="sprite-1x" src="${c.img1x}" alt="1x"/>
            <img class="sprite-4x" src="${c.img4x}" alt="4x"/>
          </div>
          <div class="meta">colors=${c.analysis?.uniqueColors ?? '?'}, opaque=${(c.analysis?.opaqueRatio*100||0).toFixed(0)}%, palette-dist=${(c.analysis?.paletteDistance||0).toFixed(0)}</div>
          <div class="actions">
            <button class="approve" onclick="decide('${c.id}','approve')">✅ Keep</button>
            <button class="reject"  onclick="decide('${c.id}','reject')">❌ Reject</button>
            <button class="deep"    onclick="decide('${c.id}','deep')">🔍 Deep AI</button>
          </div>
        </div>
      `).join('')}
    </div>
  </section>
`).join('')}
</main>

<script>
const decisions = JSON.parse(localStorage.getItem('quick-review-decisions') || '{}');
function apply() {
  document.querySelectorAll('.card').forEach(card => {
    const id = card.dataset.id;
    card.classList.remove('approved','rejected','deep');
    card.querySelectorAll('.actions button').forEach(b => b.classList.remove('selected'));
    const d = decisions[id];
    if (d) {
      card.classList.add(d === 'approve' ? 'approved' : d === 'reject' ? 'rejected' : 'deep');
      const btn = card.querySelector('.actions button.' + d);
      if (btn) btn.classList.add('selected');
    }
  });
  document.getElementById('decided').textContent = Object.keys(decisions).length + ' decided';
}
function decide(id, choice) {
  decisions[id] = choice;
  localStorage.setItem('quick-review-decisions', JSON.stringify(decisions));
  apply();
}
function exportDecisions() {
  const lines = Object.keys(decisions).map(id => JSON.stringify({ id, decision: decisions[id] }));
  const blob = new Blob([lines.join('\\n')], { type: 'application/jsonl' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'quick-review-decisions.jsonl'; a.click();
}
apply();
</script>
</body>
</html>`;

  const outPath = join(ROOT, 'quick-gallery.html');
  await writeFile(outPath, html);
  console.log(`\n✓ Quick gallery: ${outPath}`);
  console.log(`  Open in browser: file://${outPath.replace(/\\/g,'/')}`);
}

main().catch(err => { console.error(err); process.exit(1); });
