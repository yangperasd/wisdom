import { readdirSync, readFileSync } from 'node:fs';
import { setTimeout as wait } from 'node:timers/promises';
const PID_FILE = 'C:/Users/yangp/AppData/Local/Temp/dispatcher.pid';
const VERDICT_DIR = 'E:/cv5/wisdom/tools/asset-gen/screened/raw-verdicts';
function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}
function fmt(d) { return d.toISOString().slice(11, 19); }
const start = Date.now();
while (true) {
  const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim(), 10);
  const files = readdirSync(VERDICT_DIR).filter(f => f.endsWith('.json'));
  let errors = 0;
  for (const f of files) {
    try {
      const j = JSON.parse(readFileSync(`${VERDICT_DIR}/${f}`, 'utf8'));
      if (Array.isArray(j.issues) && j.issues.includes('agent_error')) errors++;
    } catch {}
  }
  const elapsedMin = ((Date.now() - start) / 60000).toFixed(1);
  console.log(`[${fmt(new Date())}] +${elapsedMin}m | verdicts=${files.length}/477 errors=${errors} | dispatcher_alive=${pidAlive(pid)}`);
  if (!pidAlive(pid)) { console.log('=== dispatcher exited ==='); break; }
  if (files.length >= 477) { console.log('=== all done ==='); break; }
  await wait(60000);
}
