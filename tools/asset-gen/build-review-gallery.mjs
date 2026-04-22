/**
 * build-review-gallery.mjs
 *
 * Reads `screened/final-ranked.json` and produces a self-contained HTML
 * review gallery (`review-gallery.html`) + `review-decisions.jsonl`. The
 * reviewer opens the HTML in a browser, browses ranked candidates with all
 * agent reasoning visible, and clicks Approve/Reject/Revise/Note. Each click
 * downloads an updated `review-decisions.jsonl` that integrate-approved.mjs
 * later reads to move sprites into the project.
 *
 * Pure HTML/JS — no server required. Sprites embedded as base64 data URLs
 * so the gallery is portable.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const ROOT = import.meta.dirname;
const config = JSON.parse(await readFile(join(ROOT, 'config.json'), 'utf-8'));

async function imageToDataUrl(filePath, opts = {}) {
  if (!existsSync(filePath)) return null;
  const { upscale = null } = opts;
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

function verdictBadge(v) {
  if (!v || v.error) return '<span class="badge err">ERR</span>';
  const cls = v.verdict === 'pass' ? 'pass' : v.verdict === 'marginal' ? 'warn' : 'fail';
  const label = v.verdict.toUpperCase();
  return `<span class="badge ${cls}">${label} ${v.score || '-'}/10</span>`;
}

async function main() {
  const finalPath = join(ROOT, 'screened', 'final-ranked.json');
  if (!existsSync(finalPath)) {
    console.error('final-ranked.json not found. Run agent-screen.mjs first.');
    process.exit(1);
  }
  const data = JSON.parse(await readFile(finalPath, 'utf-8'));

  // Build per-candidate cards
  const cards = [];
  for (const result of data.results) {
    if (result.error) continue;
    // Resolve sprite path: prefer explicit `path`, fall back to `generated/{category}/{candidateName}.png`
    const ROOT = import.meta.dirname;
    const spritePath = result.path ||
      (result.category && result.candidateName
        ? `${ROOT}/generated/${result.category}/${result.candidateName}.png`
        : null);
    if (!spritePath) continue;
    const sprite1x = await imageToDataUrl(spritePath);
    const sprite4x = await imageToDataUrl(spritePath, { upscale: 4 });
    if (!sprite1x) continue;

    // Handle both old and new schemas: round1_aesthetic or round1
    const r1 = result.round1_aesthetic || result.round1;
    const r2 = result.round2_ui_context || result.round2;
    const r3 = result.round3_adversarial || result.round3;
    const allVerdicts = [
      ...(r1?.verdicts || []),
      ...(r2?.verdicts || []),
      ...(r3?.verdicts || [])
    ].filter(v => v && !v.error);

    cards.push({
      id: result.candidateName,
      file: result.file,
      category: result.category,
      score: result.synthesis?.finalScore ?? 0,
      passed: result.synthesis?.overallPassed ?? false,
      warnings: result.synthesis?.warningCount ?? 0,
      sprite1x,
      sprite4x,
      verdicts: allVerdicts.map(v => ({
        agent: v.agent,
        score: v.score,
        verdict: v.verdict,
        reasoning: v.reasoning || '',
        issues: v.issues || []
      }))
    });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Asset Review Gallery — Wisdom Project</title>
<style>
  :root {
    --bg: #f5efe1;
    --panel: #fffbef;
    --border: #c9b791;
    --gold: #cc9933;
    --text: #3a2e25;
    --muted: #8a7560;
    --pass: #4ea84e;
    --warn: #ffaa44;
    --fail: #c4557a;
    --err: #888;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
  }
  header {
    position: sticky; top: 0; z-index: 10;
    background: var(--panel);
    border-bottom: 2px solid var(--gold);
    padding: 12px 24px;
    display: flex; align-items: center; gap: 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  h1 { margin: 0; font-size: 18px; }
  .summary { color: var(--muted); font-size: 14px; }
  .toolbar { margin-left: auto; display: flex; gap: 12px; align-items: center; }
  .toolbar input, .toolbar select {
    padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px;
    background: var(--bg); font-size: 14px;
  }
  button.export {
    padding: 8px 16px; border: 1px solid var(--gold); background: var(--gold);
    color: white; font-weight: 600; border-radius: 6px; cursor: pointer;
  }
  button.export:hover { background: #b8861d; }
  main {
    padding: 24px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
    gap: 20px;
  }
  .card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    display: flex; flex-direction: column; gap: 12px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .card.passed { border-left: 4px solid var(--pass); }
  .card.failed { border-left: 4px solid var(--fail); opacity: 0.85; }
  .card.decided.approve { background: linear-gradient(180deg, #e6f4e6 0%, var(--panel) 60%); }
  .card.decided.reject  { background: linear-gradient(180deg, #fadce4 0%, var(--panel) 60%); }
  .card-header {
    display: flex; align-items: baseline; gap: 8px;
  }
  .card-id { font-weight: 600; font-size: 16px; }
  .card-meta { color: var(--muted); font-size: 12px; }
  .score-pill {
    margin-left: auto;
    background: var(--gold); color: white;
    padding: 2px 10px; border-radius: 12px; font-weight: 600; font-size: 14px;
  }
  .sprite-row {
    display: flex; gap: 12px; align-items: flex-end; justify-content: center;
    background: repeating-conic-gradient(#e8e2d0 0% 25%, #f0e9d2 0% 50%) 50% / 12px 12px;
    padding: 16px; border-radius: 8px;
    border: 1px solid var(--border);
  }
  .sprite-row img { image-rendering: pixelated; image-rendering: crisp-edges; }
  .sprite-1x { width: 32px; height: 32px; }
  .sprite-4x { max-width: 256px; max-height: 256px; }
  .verdicts {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;
    font-size: 12px;
  }
  .verdict-cell {
    background: var(--bg); border: 1px solid var(--border);
    padding: 6px 8px; border-radius: 6px;
  }
  .verdict-cell .agent-name {
    font-weight: 600; font-size: 11px; color: var(--muted);
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .verdict-cell .reasoning {
    margin-top: 4px; font-size: 11px; line-height: 1.35; color: var(--text);
    max-height: 4.4em; overflow: hidden; text-overflow: ellipsis;
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  }
  .verdict-cell:hover .reasoning { max-height: 20em; -webkit-line-clamp: unset; }
  .badge {
    display: inline-block; padding: 1px 6px; border-radius: 3px;
    font-size: 10px; font-weight: 700; color: white; vertical-align: middle;
  }
  .badge.pass { background: var(--pass); }
  .badge.warn { background: var(--warn); }
  .badge.fail { background: var(--fail); }
  .badge.err  { background: var(--err); }
  .actions {
    display: flex; gap: 6px; flex-wrap: wrap;
  }
  .actions button {
    flex: 1; padding: 8px 0; font-weight: 600; border-radius: 6px;
    border: 1px solid var(--border); background: var(--bg); cursor: pointer;
    font-size: 13px; transition: all 0.15s;
  }
  .actions button.approve { background: var(--pass); color: white; border-color: var(--pass); }
  .actions button.reject  { background: var(--fail); color: white; border-color: var(--fail); }
  .actions button.revise  { background: var(--warn); color: white; border-color: var(--warn); }
  .actions button.note    { background: var(--muted); color: white; border-color: var(--muted); }
  .actions button:hover   { transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.15); }
  .actions button.selected { outline: 3px solid #2c7eb5; }
  .note-input {
    width: 100%; margin-top: 6px;
    padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px;
    font-size: 12px; font-family: inherit; resize: vertical; min-height: 32px;
    background: var(--bg);
  }
  .filters-info { color: var(--muted); font-size: 12px; margin-left: 8px; }
</style>
</head>
<body>
<header>
  <h1>🍃 Asset Review Gallery</h1>
  <span class="summary">Total: ${data.summary.total} | Passed: ${data.summary.passed} | Failed: ${data.summary.failed}</span>
  <div class="toolbar">
    <select id="filter-cat">
      <option value="">All categories</option>
      ${[...new Set(cards.map(c => c.category))].map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
    </select>
    <select id="filter-status">
      <option value="">All status</option>
      <option value="passed">Passed only</option>
      <option value="failed">Failed only</option>
      <option value="undecided">Undecided</option>
    </select>
    <select id="sort-by">
      <option value="score-desc">Score (high → low)</option>
      <option value="score-asc">Score (low → high)</option>
      <option value="warnings">Warnings (most first)</option>
      <option value="category">Category</option>
    </select>
    <span class="filters-info" id="visible-count"></span>
    <button class="export" onclick="exportDecisions()">📥 Export decisions</button>
  </div>
</header>
<main id="grid"></main>
<script>
const CARDS = ${JSON.stringify(cards)};
const decisions = JSON.parse(localStorage.getItem('asset-review-decisions') || '{}');
const notes = JSON.parse(localStorage.getItem('asset-review-notes') || '{}');

function render() {
  const grid = document.getElementById('grid');
  const filterCat = document.getElementById('filter-cat').value;
  const filterStatus = document.getElementById('filter-status').value;
  const sortBy = document.getElementById('sort-by').value;

  let visible = CARDS.slice();
  if (filterCat) visible = visible.filter(c => c.category === filterCat);
  if (filterStatus === 'passed')   visible = visible.filter(c =>  c.passed);
  if (filterStatus === 'failed')   visible = visible.filter(c => !c.passed);
  if (filterStatus === 'undecided')visible = visible.filter(c => !decisions[c.id]);

  if (sortBy === 'score-desc')   visible.sort((a,b) => b.score - a.score);
  if (sortBy === 'score-asc')    visible.sort((a,b) => a.score - b.score);
  if (sortBy === 'warnings')     visible.sort((a,b) => b.warnings - a.warnings);
  if (sortBy === 'category')     visible.sort((a,b) => a.category.localeCompare(b.category));

  document.getElementById('visible-count').textContent = visible.length + ' shown';

  grid.innerHTML = visible.map(c => {
    const decision = decisions[c.id];
    const note = notes[c.id] || '';
    return \`
      <div class="card \${c.passed ? 'passed' : 'failed'} \${decision ? 'decided ' + decision : ''}">
        <div class="card-header">
          <span class="card-id">\${escapeHtml(c.id)}</span>
          <span class="card-meta">\${escapeHtml(c.category)} | \${c.warnings} warnings</span>
          <span class="score-pill">\${c.score.toFixed(1)}</span>
        </div>
        <div class="sprite-row">
          <img class="sprite-1x" src="\${c.sprite1x}" alt="1x"/>
          <img class="sprite-4x" src="\${c.sprite4x}" alt="4x"/>
        </div>
        <div class="verdicts">
          \${c.verdicts.map(v => \`
            <div class="verdict-cell">
              <div class="agent-name">\${escapeHtml(v.agent.replace(/^(aesthetic|ui|adversarial)_/, '').replace(/_/g, ' '))}</div>
              \${verdictBadgeHtml(v)}
              <div class="reasoning">\${escapeHtml(v.reasoning)}</div>
            </div>\`).join('')}
        </div>
        <div class="actions">
          <button class="approve \${decision === 'approve' ? 'selected' : ''}" onclick="decide('\${c.id}', 'approve')">✅ Approve</button>
          <button class="reject \${decision === 'reject' ? 'selected' : ''}"   onclick="decide('\${c.id}', 'reject')">❌ Reject</button>
          <button class="revise \${decision === 'revise' ? 'selected' : ''}"   onclick="decide('\${c.id}', 'revise')">🔄 Revise</button>
        </div>
        <textarea class="note-input" placeholder="Optional note..." onchange="setNote('\${c.id}', this.value)">\${escapeHtml(note)}</textarea>
      </div>
    \`;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
}

function verdictBadgeHtml(v) {
  const cls = v.verdict === 'pass' ? 'pass' : v.verdict === 'marginal' ? 'warn' : 'fail';
  return \`<span class="badge \${cls}">\${v.verdict.toUpperCase()} \${v.score || '-'}/10</span>\`;
}

function decide(id, choice) {
  decisions[id] = choice;
  localStorage.setItem('asset-review-decisions', JSON.stringify(decisions));
  render();
}

function setNote(id, value) {
  notes[id] = value;
  localStorage.setItem('asset-review-notes', JSON.stringify(notes));
}

function exportDecisions() {
  const lines = Object.keys(decisions).map(id => {
    const card = CARDS.find(c => c.id === id);
    return JSON.stringify({
      id, file: card?.file, category: card?.category,
      decision: decisions[id], note: notes[id] || '',
      score: card?.score, passed: card?.passed
    });
  });
  const blob = new Blob([lines.join('\\n')], { type: 'application/jsonl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'review-decisions.jsonl'; a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('filter-cat').addEventListener('change', render);
document.getElementById('filter-status').addEventListener('change', render);
document.getElementById('sort-by').addEventListener('change', render);
render();
</script>
</body>
</html>`;

  const outPath = join(ROOT, 'review-gallery.html');
  await writeFile(outPath, html);
  console.log(`Built review gallery: ${outPath}`);
  console.log(`Open in browser: file://${outPath.replace(/\\/g, '/')}`);
  console.log(`Cards: ${cards.length} (${data.summary.passed} passed, ${data.summary.failed} failed)`);
}

main().catch(err => { console.error(err); process.exit(1); });
