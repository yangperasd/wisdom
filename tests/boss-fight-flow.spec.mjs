import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer,
  openPreviewScene,
  stepFrames,
  readBossState,
  readProgressFlags,
  setProgressFlag,
} from './helpers/playwright-cocos-helpers.mjs';

test.describe('boss fight flow', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensurePreviewServer(baseURL);
  });

  test('boss starts alive in danger state', async ({ page }) => {
    await openPreviewScene(page, 'BossArena', ['Player', 'BossEnemy-Core']);
    await stepFrames(page, 10);

    const boss = await readBossState(page);
    expect(boss.alive).toBe(true);
    expect(boss.danger).toBe(true);
    expect(boss.vulnerable).toBe(false);
  });

  test('boss shield phase state is correct at spawn', async ({ page }) => {
    await openPreviewScene(page, 'BossArena', ['Player', 'BossEnemy-Core', 'BossShield-Closed']);
    await stepFrames(page, 10);

    const boss = await readBossState(page);

    // Boss should be alive and in danger (shielded) mode, not vulnerable
    expect(boss.alive).toBe(true);
    expect(boss.danger).toBe(true);
    expect(boss.vulnerable).toBe(false);

    // Shield is intact at spawn so the boss HealthComponent rejects damage
    // (BossShieldPhaseController sets acceptDamage=false when not vulnerable)
    expect(boss.health).toBe(boss.maxHealth);
  });

  test('setting boss-cleared flag deactivates boss', async ({ page }) => {
    await openPreviewScene(page, 'BossArena', ['Player', 'BossEnemy-Core']);
    await stepFrames(page, 10);

    const before = await readBossState(page);
    expect(before.alive).toBe(true);

    // Simulate what happens when the boss is actually defeated:
    // BossEncounterController.onBossDepleted calls setProgressFlag AND applyState(true).
    // We call the encounter controller's method directly to avoid event-dispatch timing issues.
    await page.evaluate(() => {
      const scene = window.cc?.director?.getScene?.();
      const canvas = scene?.getChildByName?.('Canvas');
      const worldRoot = canvas?.getChildByName?.('WorldRoot');
      const findComp = (root, name) => {
        if (!root) return null;
        const c = root.components?.find(x => x?.constructor?.name === name);
        if (c) return c;
        for (const ch of (root.children ?? [])) { const f = findComp(ch, name); if (f) return f; }
        return null;
      };
      const encounter = findComp(worldRoot, 'BossEncounterController');
      const bossHealth = encounter?.bossHealth;
      // Deplete boss health to trigger onBossDepleted
      if (bossHealth) {
        bossHealth.acceptDamage = true;
        bossHealth.invulnerableTimer = 0;
        while (bossHealth.getCurrentHealth() > 0) {
          bossHealth.applyDamage(1);
          bossHealth.invulnerableTimer = 0;
        }
      }
    });
    await stepFrames(page, 15);

    // After the flag fires, BossEncounterController.applyState(true) sets
    // bossRoot.active = false. The boss health data stays at max (it is
    // deactivated, not depleted), so we check the flag and node state.
    const flags = await readProgressFlags(page);
    expect(flags).toContain('boss-cleared');

    // Verify the boss root node is deactivated via runtime check
    const bossRootActive = await page.evaluate(() => {
      const scene = window.cc?.director?.getScene?.();
      const canvas = scene?.getChildByName?.('Canvas');
      const worldRoot = canvas?.getChildByName?.('WorldRoot');
      const findComp = (root, name) => {
        if (!root) return null;
        const c = root.components?.find(x => x?.constructor?.name === name);
        if (c) return c;
        for (const ch of (root.children ?? [])) { const f = findComp(ch, name); if (f) return f; }
        return null;
      };
      const encounter = findComp(worldRoot, 'BossEncounterController');
      return encounter?.bossRoot?.active ?? null;
    });
    expect(bossRootActive).toBe(false);
  });

  test('BUG#4: boss health starts at max', async ({ page }) => {
    await openPreviewScene(page, 'BossArena', ['Player', 'BossEnemy-Core']);
    await stepFrames(page, 10);

    const boss = await readBossState(page);

    // The HealthComponent.onLoad sets currentHealth = maxHealth.
    // BossArena scene configures maxHealth = 8 on BossEnemy-Core.
    expect(boss.health).toBe(boss.maxHealth);
    expect(boss.maxHealth).toBeGreaterThanOrEqual(3);
  });
});
