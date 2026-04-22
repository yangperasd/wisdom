#!/usr/bin/env node
/**
 * dispatch-screening.mjs
 *
 * Reads agent-tasks.json and fans out one `claude -p` sub-agent per task,
 * 6 in parallel per batch. Each sub-agent reads its candidate images,
 * computes a verdict JSON, and writes it to raw-verdicts/{label}__{agent}.json.
 *
 * Usage:
 *   node tools/asset-gen/dispatch-screening.mjs
 *
 * Resumable: skips tasks whose output file already exists.
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const ROOT = 'E:/cv5/wisdom';
const TASK_FILE = `${ROOT}/tools/asset-gen/screened/agent-tasks.json`;
const OUT_DIR = `${ROOT}/tools/asset-gen/screened/raw-verdicts`;
const LOG_DIR = `${ROOT}/tools/asset-gen/screened/dispatch-logs`;
const BATCH_SIZE = 6;
const TASK_TIMEOUT_MS = 4 * 60 * 1000; // 4 minutes per task

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(LOG_DIR, { recursive: true });

const data = JSON.parse(readFileSync(TASK_FILE, 'utf8'));
const allTasks = data.tasks;
console.log(`[dispatch] Loaded ${allTasks.length} tasks (expected ${data.total_tasks}).`);

// Sort by round then candidate (so round 1 finishes first)
allTasks.sort((a, b) => {
  if (a.round !== b.round) return a.round - b.round;
  return a.candidate_label.localeCompare(b.candidate_label);
});

function outPath(t) {
  return `${OUT_DIR}/${t.candidate_label}__${t.agent_id}.json`;
}

function isDone(t) {
  const p = outPath(t);
  if (!existsSync(p)) return false;
  try {
    const sz = statSync(p).size;
    if (sz < 20) return false;
    JSON.parse(readFileSync(p, 'utf8'));
    return true;
  } catch {
    return false;
  }
}

function buildSubPrompt(task) {
  const out = outPath(task).replace(/\\/g, '/');
  return `${task.prompt}

After computing your verdict JSON, use the Write tool to save it (and ONLY it - no markdown fences, no other text) to this exact file path:
${out}

The file content must be a single valid JSON object matching the schema. Then your final response should be exactly the word: OK

If you encounter an error reading the image or generating verdict, write a placeholder error verdict to the file like:
{"agent":"${task.agent_id}","score":0,"verdict":"fail","issues":["agent_error"],"reasoning":"<short error description>"}
And still return OK. Do NOT abort.`;
}

function runOne(task) {
  return new Promise((resolve) => {
    const startTs = Date.now();
    const prompt = buildSubPrompt(task);
    const logFile = `${LOG_DIR}/${task.candidate_label}__${task.agent_id}.log`;
    const args = [
      '-p',
      '--permission-mode', 'bypassPermissions',
      '--output-format', 'text',
      '--model', 'sonnet',
      '--no-session-persistence',
    ];
    // On Windows the `claude` entry is a .cmd shim — must use shell:true.
    const useShell = process.platform === 'win32';
    const proc = spawn('claude', args, {
      cwd: ROOT,
      shell: useShell,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    // Pipe the prompt via stdin (avoids huge command lines and shell-quoting issues).
    try {
      proc.stdin.write(prompt);
      proc.stdin.end();
    } catch {}

    let stdout = '';
    let stderr = '';
    let done = false;

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      try { proc.kill('SIGKILL'); } catch {}
      resolve({ task, status: 'timeout', durationMs: Date.now() - startTs, stdout, stderr });
    }, TASK_TIMEOUT_MS);

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('error', (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ task, status: 'spawn_error', error: err.message, durationMs: Date.now() - startTs, stdout, stderr });
    });

    proc.on('close', (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      const wrote = isDone(task);
      // best-effort log dump for debugging if it failed
      if (!wrote) {
        try {
          writeFileSync(logFile, `EXIT ${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`, 'utf8');
        } catch {}
      }
      resolve({
        task,
        status: wrote ? 'ok' : (code === 0 ? 'no_output' : `exit_${code}`),
        durationMs: Date.now() - startTs,
        stdout: stdout.slice(0, 500),
        stderr: stderr.slice(0, 500),
      });
    });
  });
}

function fmt(ms) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}m${(s % 60).toString().padStart(2, '0')}s`;
}

(async () => {
  const startedAt = Date.now();
  const queue = allTasks.filter((t) => !isDone(t));
  const skipped = allTasks.length - queue.length;
  console.log(`[dispatch] Already complete: ${skipped}. Queue: ${queue.length}.`);

  let completed = skipped;
  let okCount = 0;
  let errCount = 0;
  const failures = [];

  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE);
    const batchNo = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(queue.length / BATCH_SIZE);
    const batchStart = Date.now();
    process.stdout.write(`[dispatch] batch ${batchNo}/${totalBatches} (${batch.length} tasks): `);

    const results = await Promise.all(batch.map(runOne));
    for (const r of results) {
      completed++;
      if (r.status === 'ok') {
        okCount++;
        process.stdout.write('.');
      } else {
        errCount++;
        process.stdout.write('x');
        failures.push({ task: r.task.task_id, status: r.status, durationMs: r.durationMs, stderr: r.stderr });
      }
    }
    const counts = countOnDisk();
    console.log(` done in ${fmt(Date.now() - batchStart)} | total OK on disk: ${counts.total} (errors: ${counts.errors}) | elapsed ${fmt(Date.now() - startedAt)}`);
  }

  const finalCounts = countOnDisk();
  console.log(`\n[dispatch] === COMPLETE ===`);
  console.log(`Tasks: ${allTasks.length}, Skipped (pre-existing): ${skipped}, OK new: ${okCount}, Errors: ${errCount}`);
  console.log(`On disk: total verdict files=${finalCounts.total}, agent_error placeholders=${finalCounts.errors}`);
  console.log(`Per round on disk:`, finalCounts.byRound);
  console.log(`Total time: ${fmt(Date.now() - startedAt)}`);
  if (failures.length) {
    console.log(`First 10 failures:`);
    for (const f of failures.slice(0, 10)) {
      console.log(`  ${f.task} -> ${f.status} (${fmt(f.durationMs)})`);
    }
  }
})();

function countOnDisk() {
  const files = readdirSync(OUT_DIR).filter((f) => f.endsWith('.json'));
  let errors = 0;
  const byRound = { 1: 0, 2: 0, 3: 0 };
  // Build a quick lookup of agent_id -> round from the original task list.
  const roundByAgent = {};
  for (const t of allTasks) roundByAgent[t.agent_id] = t.round;
  for (const f of files) {
    try {
      const j = JSON.parse(readFileSync(`${OUT_DIR}/${f}`, 'utf8'));
      if (Array.isArray(j.issues) && j.issues.includes('agent_error')) errors++;
      const agentId = f.split('__').slice(1).join('__').replace(/\.json$/, '');
      const r = roundByAgent[agentId];
      if (r) byRound[r]++;
    } catch {}
  }
  return { total: files.length, errors, byRound };
}
