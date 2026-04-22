import { test, expect } from '@playwright/test';
import { ensurePreviewServer, openPreviewScene, stepFrames, prepareCleanScreenshot, getCleanScreenshotOptions } from './helpers/playwright-cocos-helpers.mjs';
const FORBIDDEN_LEGACY_LABELS = [
  'Trial Hub',
  'Boss Arena',
  'BOSS CHECK',
  'ROOM A',
  'ROOM B',
  'ROOM C',
  'PENDING',
  'BACK TO RUINS',
  'SUMMON',
  'ATTACK',
];
const ASCII_WORD_LABEL_PATTERN = /[A-Za-z]{2,}/;

function findRuntimeEnglishLabels(labels) {
  return labels.filter((label) =>
    typeof label === 'string'
    && label.trim().length > 0
    && ASCII_WORD_LABEL_PATTERN.test(label)
  );
}

async function readSceneLabels(page) {
  return page.evaluate(() => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const labels = [];
    const walk = (node) => {
      for (const component of node.components ?? []) {
        if (component.constructor?.name === 'Label') {
          labels.push(component.string);
        }
      }
      for (const child of node.children ?? []) {
        walk(child);
      }
    };

    if (canvas) {
      walk(canvas);
    }

    return labels;
  });
}

test.describe('@visual scene initial states', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  const scenes = [
    { name: 'StartCamp', readyNodes: ['Player', 'Portal-FieldWest'], expectedLabels: ['营地入口'] },
    { name: 'FieldWest', readyNodes: ['Player'], expectedLabels: ['林间小径'] },
    { name: 'FieldRuins', readyNodes: ['Player'], expectedLabels: ['遗迹小径'] },
    { name: 'DungeonHub', readyNodes: ['Player'], expectedLabels: ['试炼大厅', '箱子间', '弹花间', '炸虫间'] },
    { name: 'DungeonRoomA', readyNodes: ['Player'], expectedLabels: ['箱子房'] },
    { name: 'DungeonRoomB', readyNodes: ['Player'], expectedLabels: ['弹花房'] },
    { name: 'DungeonRoomC', readyNodes: ['Player'], expectedLabels: ['炸虫房'] },
    { name: 'BossArena', readyNodes: ['Player'], expectedLabels: ['首领庭院', '首领营火'] },
    { name: 'MechanicsLab', readyNodes: ['Player'], expectedLabels: [], allowLegacyLabels: true },
  ];

  for (const { name, readyNodes, expectedLabels, allowLegacyLabels = false } of scenes) {
    test(`${name} initial state`, async ({ page }) => {
      await openPreviewScene(page, name, readyNodes);
      await stepFrames(page, 10);
      await prepareCleanScreenshot(page);
      const labels = await readSceneLabels(page);
      const labelText = labels.join('\n');
      for (const expectedLabel of expectedLabels) {
        expect(labelText).toContain(expectedLabel);
      }
      if (!allowLegacyLabels) {
        for (const legacyLabel of FORBIDDEN_LEGACY_LABELS) {
          expect(labelText).not.toContain(legacyLabel);
        }
        expect(findRuntimeEnglishLabels(labels)).toEqual([]);
      }
      await expect(page).toHaveScreenshot(`${name}-initial.png`, {
        ...(await getCleanScreenshotOptions(page)),
      });
    });
  }
});
