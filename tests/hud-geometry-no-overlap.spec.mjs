// Regression guard for the 2026-04-15 attack-vs-summon button overlap bug.
// This test asserts that no two active touch-HUD buttons have AABBs that
// intersect, measured at all three responsive tiers (desktop/tablet/mobile).
//
// Existence reason: three parallel aesthetic-audit agents (2026-04-15 晚)
// did not catch a 20px overlap because they judged screenshots visually
// instead of computing button geometry. A simple AABB intersection check
// in code catches this class of bug deterministically.
import { test, expect } from '@playwright/test';
import { ensurePreviewServer, openPreviewScene, stepFrames } from './helpers/playwright-cocos-helpers.mjs';

test.describe('HUD touch button geometry (no overlap)', () => {
  test.beforeAll(async ({ baseURL }) => { await ensurePreviewServer(baseURL); });

  const viewports = [
    { label: 'desktop', width: 1280, height: 720 },
    { label: 'tablet', width: 1024, height: 768 },
    { label: 'mobile', width: 812, height: 375 },
  ];
  const scenes = ['StartCamp', 'BossArena'];

  for (const { label, width, height } of viewports) {
    for (const scene of scenes) {
      test(`${scene} @ ${label} (${width}x${height}): touch buttons do not overlap`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await openPreviewScene(page, scene, ['Player']);
        await stepFrames(page, 10);

        // Pull world-space AABBs of each active Touch HUD node from the running cocos scene.
        const rects = await page.evaluate(() => {
          const scene = window.cc?.director?.getScene?.();
          const canvas = scene?.getChildByName?.('Canvas');
          const touchHudRoot = canvas?.getChildByName?.('TouchHudRoot');
          if (!touchHudRoot) return [];

          const names = [
            'Joystick', 'TouchAttack', 'TouchPlaceEcho', 'TouchRespawn',
            'TouchEchoBox', 'TouchEchoFlower', 'TouchEchoBomb', 'TouchPause',
          ];
          const out = [];
          for (const n of names) {
            const node = touchHudRoot.getChildByName?.(n);
            if (!node || !node.active) continue;
            const t = node.components?.find((c) => c?.constructor?.name === 'UITransform');
            if (!t) continue;
            const s = node.worldScale;
            const w = t.contentSize.width * Math.abs(s.x);
            const h = t.contentSize.height * Math.abs(s.y);
            const p = node.worldPosition;
            out.push({
              name: n,
              x0: p.x - w / 2, y0: p.y - h / 2,
              x1: p.x + w / 2, y1: p.y + h / 2,
            });
          }
          return out;
        });

        expect(rects.length, 'found active HUD touch buttons').toBeGreaterThan(0);

        const overlaps = [];
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i], b = rects[j];
            const hit = a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
            if (hit) {
              const dx = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
              const dy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
              overlaps.push(`${a.name} ⟷ ${b.name}: dx=${dx.toFixed(1)} dy=${dy.toFixed(1)}`);
            }
          }
        }

        expect(
          overlaps,
          `touch buttons must not overlap in ${scene} @ ${label}. Violations:\n  ${overlaps.join('\n  ')}`,
        ).toEqual([]);
      });
    }
  }
});
