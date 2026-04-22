/**
 * Replace 3 prompts (pause_button, touch_echo_button, vfx_arrow_trail) with
 * Codex's new versions from codex_revise_report.md.
 * Backs up the original jsonls first.
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'E:/cv5/wisdom/tools/asset-gen';
const REPORT = join(ROOT, 'audit/codex_revise_report.md');

// Read Codex report and extract the 3 rewritten prompts (first occurrences)
const report = readFileSync(REPORT, 'utf-8');
const extracts = {};
for (const id of ['pause_button', 'touch_echo_button', 'vfx_arrow_trail']) {
  const re = new RegExp(`\\{"id":"${id}"[^\\n]*\\}`);
  const m = report.match(re);
  if (!m) throw new Error('Missing rewrite for ' + id);
  extracts[id] = m[0];
  // Sanity: parse
  JSON.parse(m[0]);
}

console.log('Extracted 3 rewrites, all parse as JSON.');

// File map
const files = {
  pause_button: 'prompts/ui.jsonl',
  touch_echo_button: 'prompts/ui.jsonl',
  vfx_arrow_trail: 'prompts/effects.jsonl'
};

// Backup
const backups = new Set();
for (const f of Object.values(files)) {
  if (backups.has(f)) continue;
  backups.add(f);
  const src = join(ROOT, f);
  const bak = src + '.bak-before-codex-rewrites';
  copyFileSync(src, bak);
  console.log('Backup: ' + bak);
}

// Replace lines
for (const [id, filePath] of Object.entries(files)) {
  const full = join(ROOT, filePath);
  const lines = readFileSync(full, 'utf-8').split('\n');
  let replaced = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`"id": "${id}"`) || lines[i].includes(`"id":"${id}"`)) {
      lines[i] = extracts[id];
      replaced++;
    }
  }
  if (replaced === 0) throw new Error('Could not find line for ' + id + ' in ' + filePath);
  writeFileSync(full, lines.join('\n'));
  console.log('Rewrote ' + id + ' in ' + filePath + ' (' + replaced + ' line)');
}

// Validate all lines still parse
for (const f of backups) {
  const full = join(ROOT, f);
  const lines = readFileSync(full, 'utf-8').split('\n').filter(l => l.trim());
  for (const l of lines) JSON.parse(l);
  console.log('OK ' + f + ': ' + lines.length + ' lines all parse.');
}
