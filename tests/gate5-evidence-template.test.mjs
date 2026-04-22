import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const templateDir = path.join(projectRoot, 'docs', 'wechat-gate5-evidence-template');
const readmePath = path.join(templateDir, 'README.md');
const currentEvidencePath = path.join(templateDir, 'current-automation-evidence-2026-04-22.md');
const sizeReportPath = path.join(projectRoot, 'temp', 'wechat-size-report.json');

const requiredHumanBlockers = [
  'WeChat DevTools simulator real load',
  'QR / true-device playthrough',
  'final cute-style score',
  'final Chinese copy approval',
  'final monster naming approval',
];

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function escapedPattern(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatBytes(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

test('Gate 5 template keeps automation evidence pending instead of prefilled PASS', () => {
  const readme = readText(readmePath);
  const currentEvidence = readText(currentEvidencePath);

  assert.match(readme, /current-automation-evidence-2026-04-22\.md/);
  assert.match(readme, /AUTOMATION_GREEN_HUMAN_EVIDENCE_PENDING/);
  assert.match(readme, /Do not mark this template as `PASS` from automation alone/);

  assert.match(currentEvidence, /Status: `AUTOMATION_GREEN_HUMAN_EVIDENCE_PENDING`/);
  assert.match(currentEvidence, /does not claim Gate 5 `PASS`/);
  assert.match(currentEvidence, /BLOCKED_BY_HUMAN_ENV/);
  assert.doesNotMatch(currentEvidence, /^Status:\s*`?PASS`?\s*$/m);

  for (const blocker of requiredHumanBlockers) {
    assert.match(readme, new RegExp(escapedPattern(blocker), 'i'));
    assert.match(currentEvidence, new RegExp(escapedPattern(blocker), 'i'));
  }
});

test('Gate 5 automation evidence points at reviewable files and artifacts', () => {
  const currentEvidence = readText(currentEvidencePath);
  const requiredPaths = [
    'docs/loop48-release-chain-evidence-2026-04-22.md',
    'temp/wechat-size-report.json',
    'temp/wechat-build-status.json',
    'temp/wechatgame.build-config.json',
    'docs/loop43-visual-baseline-index-2026-04-22.md',
    'tests/__screenshots__/visual-scene-initial.spec.mjs/',
    'docs/wechat-gate5-human-evidence-checklist-2026-04-22.md',
    'docs/wechat-gate5-evidence-template/issues.md',
  ];

  for (const relativePath of requiredPaths) {
    assert.match(currentEvidence, new RegExp(escapedPattern(relativePath)));
    const absolutePath = path.join(projectRoot, relativePath.replace(/\/$/, ''));
    assert.ok(
      fs.existsSync(absolutePath),
      `Gate 5 evidence index points to a missing file or directory: ${relativePath}`,
    );
  }
});

test('Gate 5 automation evidence package numbers match the current size report', () => {
  const currentEvidence = readText(currentEvidencePath);
  const sizeReport = JSON.parse(readText(sizeReportPath));

  for (const [label, value] of [
    ['Hard cap', sizeReport.budgetBytes],
    ['Warning threshold', sizeReport.warningBytes],
    ['Main package', sizeReport.mainPackageBytes],
    ['Total output', sizeReport.totalBytes],
    ['Budget margin', sizeReport.audit?.mainPackageBudgetMarginBytes],
  ]) {
    assert.ok(
      currentEvidence.includes(`| ${label} | \`${formatBytes(value)}\``),
      `Gate 5 evidence has stale or missing ${label} from size report.`,
    );
  }

  assert.ok(
    currentEvidence.includes(`| Remote script count | \`${sizeReport.audit?.remoteScriptCount}\` |`),
    'Gate 5 evidence has stale or missing remote script count from size report.',
  );
});
