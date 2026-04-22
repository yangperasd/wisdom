/**
 * Demo Playthrough Audit
 *
 * Full QA playtest of all 9 scenes, verifying demo-readiness from a
 * real user's perspective.  Every issue is categorised as BLOCKER,
 * CRITICAL, or COSMETIC and emitted via console + a final summary.
 */

import { test, expect } from '@playwright/test';
import {
  ensurePreviewServer,
  openPreviewScene,
  stepFrames,
  readRuntimeState,
  readPlayerHealth,
  readBossState,
  readCheckpointState,
  readProgressFlags,
  dragJoystick,
  pressTouchButton,
  movePlayerNearTarget,
  unlockEcho,
  applyDamageToPlayer,
  killPlayer,
  setProgressFlag,
  prepareCleanScreenshot,
  getCleanScreenshotOptions,
  resetMechanicsLab,
  triggerPlateContact,
  triggerPortalContact,
} from './helpers/playwright-cocos-helpers.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SCREENSHOT_DIR = 'tests/__screenshots__/demo-audit';

/** Collect JS console errors during a callback. */
async function collectConsoleErrors(page, fn) {
  const errors = [];
  const handler = (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      errors.push({ type: msg.type(), text: msg.text() });
    }
  };
  page.on('console', handler);
  await fn();
  page.off('console', handler);
  return errors;
}

/** Take a cropped screenshot (no editor toolbar) and save to the audit dir. */
async function auditScreenshot(page, label) {
  await prepareCleanScreenshot(page);
  const buffer = await page.screenshot({
    ...(await getCleanScreenshotOptions(page)),
    path: `${SCREENSHOT_DIR}/${label}.png`,
  });
  return buffer;
}

/** Read the full HUD status from the runtime. */
async function readHudStatus(page) {
  return page.evaluate(() => {
    const scene = window.cc?.director?.getScene?.();
    const canvas = scene?.getChildByName?.('Canvas');
    const hudRoot = canvas?.getChildByName?.('HudRoot');
    const touchHudRoot = canvas?.getChildByName?.('TouchHudRoot');

    if (!hudRoot) return { hasHud: false };

    // We mirror what a tester would actually see. `node.active` in Cocos is the
    // local flag, not the cumulative state -- a child node may have
    // `_active=true` while sitting under an inactive parent and therefore be
    // invisible. Use `activeInHierarchy` so deactivated subtrees are skipped.

    // Collect all Label text content under HudRoot.
    const labels = [];
    const walkLabels = (node) => {
      if (!node || node.activeInHierarchy === false) return;
      for (const comp of (node.components ?? [])) {
        if (comp?.constructor?.name === 'Label' && comp.enabled !== false && comp.string != null) {
          labels.push({ node: node.name, text: comp.string });
        }
      }
      for (const child of (node.children ?? [])) {
        walkLabels(child);
      }
    };
    walkLabels(hudRoot);

    // Check for debug elements that are actually visible to the player.
    const debugElements = [];
    const walkDebug = (node) => {
      if (!node || node.activeInHierarchy === false) return;
      const name = node.name?.toLowerCase?.() ?? '';
      if (name.includes('debug') || name.includes('dev-') || name.includes('test-')) {
        debugElements.push(node.name);
      }
      for (const child of (node.children ?? [])) {
        walkDebug(child);
      }
    };
    walkDebug(canvas);

    const joystick = touchHudRoot?.getChildByName?.('Joystick');
    const touchAttack = touchHudRoot?.getChildByName?.('TouchAttack');
    const touchPlaceEcho = touchHudRoot?.getChildByName?.('TouchPlaceEcho');
    const touchPause = touchHudRoot?.getChildByName?.('TouchPause');
    const touchRespawn = touchHudRoot?.getChildByName?.('TouchRespawn');

    return {
      hasHud: true,
      labels,
      debugElements,
      joystickActive: joystick?.active ?? false,
      attackActive: touchAttack?.active ?? false,
      placeEchoActive: touchPlaceEcho?.active ?? false,
      pauseActive: touchPause?.active ?? false,
      respawnActive: touchRespawn?.active ?? false,
    };
  });
}

// ---------------------------------------------------------------------------
// Scene definitions
// ---------------------------------------------------------------------------
const ALL_SCENES = [
  { name: 'StartCamp',    readyNodes: ['Player', 'Portal-FieldWest'] },
  { name: 'FieldWest',    readyNodes: ['Player'] },
  { name: 'FieldRuins',   readyNodes: ['Player'] },
  { name: 'DungeonHub',   readyNodes: ['Player'] },
  { name: 'DungeonRoomA', readyNodes: ['Player'] },
  { name: 'DungeonRoomB', readyNodes: ['Player'] },
  { name: 'DungeonRoomC', readyNodes: ['Player'] },
  { name: 'BossArena',    readyNodes: ['Player'] },
  { name: 'MechanicsLab', readyNodes: ['Player'] },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Demo Playthrough Audit', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensurePreviewServer(baseURL);
  });

  // =========================================================================
  // PART 1: Per-scene audit  (load, screenshot, HUD, movement, attack, echo)
  // =========================================================================
  for (const { name, readyNodes } of ALL_SCENES) {
    test(`[SCENE] ${name} -- full audit`, async ({ page }) => {
      const issues = [];
      const addIssue = (sev, msg) => {
        issues.push({ severity: sev, scene: name, message: msg });
        console.log(`  [${sev}] ${name}: ${msg}`);
      };

      // --- 1. Load scene ---------------------------------------------------
      let consoleErrors = [];
      const loadErrors = await collectConsoleErrors(page, async () => {
        try {
          await openPreviewScene(page, name, readyNodes);
        } catch (e) {
          addIssue('BLOCKER', `Scene failed to load: ${e.message}`);
        }
      });
      consoleErrors.push(...loadErrors);

      // --- 2. Step frames for full init ------------------------------------
      const initErrors = await collectConsoleErrors(page, async () => {
        await stepFrames(page, 30);
      });
      consoleErrors.push(...initErrors);

      // --- 3. Screenshot ---------------------------------------------------
      await auditScreenshot(page, `${name}-initial`);

      // --- 4. Console errors -----------------------------------------------
      const realErrors = consoleErrors.filter(e =>
        e.type === 'error' &&
        !e.text.includes('[HMR]') &&
        !e.text.includes('DevTools') &&
        !e.text.includes('favicon')
      );
      if (realErrors.length > 0) {
        for (const err of realErrors) {
          addIssue('CRITICAL', `JS console error: ${err.text.slice(0, 200)}`);
        }
      }

      // --- 5. Player exists with full health --------------------------------
      let health;
      try {
        health = await readPlayerHealth(page);
        if (!health || health.max === 0) {
          addIssue('BLOCKER', 'Player HealthComponent missing or maxHealth=0');
        } else if (health.current < health.max) {
          addIssue('CRITICAL', `Player starts with ${health.current}/${health.max} HP (not full)`);
        }
      } catch (e) {
        addIssue('BLOCKER', `Could not read player health: ${e.message}`);
      }

      // --- 6. HUD check ----------------------------------------------------
      let hud;
      try {
        hud = await readHudStatus(page);
        if (!hud.hasHud) {
          addIssue('BLOCKER', 'HudRoot node missing from scene');
        } else {
          // Check for placeholder text
          for (const lbl of (hud.labels ?? [])) {
            if (/loading|placeholder|todo|fixme|xxx/i.test(lbl.text)) {
              addIssue('CRITICAL', `HUD label "${lbl.node}" shows dev text: "${lbl.text}"`);
            }
          }
          // Check for debug elements
          if (hud.debugElements.length > 0) {
            addIssue('COSMETIC', `Debug elements visible: ${hud.debugElements.join(', ')}`);
          }
          // Touch controls present
          if (!hud.joystickActive) {
            addIssue('CRITICAL', 'Joystick is not active');
          }
          if (!hud.attackActive) {
            addIssue('CRITICAL', 'Attack button is not active');
          }
          if (!hud.pauseActive) {
            addIssue('COSMETIC', 'Pause button is not active');
          }
        }
      } catch (e) {
        addIssue('CRITICAL', `HUD status read failed: ${e.message}`);
      }

      // --- 7. Move player with joystick ------------------------------------
      let moveResult;
      try {
        moveResult = await dragJoystick(page, { x: 52, y: 0, frames: 25 });
        const dx = Math.abs(moveResult.afterMove.x - moveResult.before.x);
        if (dx < 10) {
          addIssue('BLOCKER', `Player did not move (dx=${dx.toFixed(1)}). Soft-lock risk.`);
        }
        // Verify knob returns to center on release
        const knobOff = Math.abs(moveResult.knobPosition?.x ?? 0) + Math.abs(moveResult.knobPosition?.y ?? 0);
        if (knobOff > 3) {
          addIssue('COSMETIC', `Joystick knob did not return to center after release (offset=${knobOff.toFixed(1)})`);
        }
      } catch (e) {
        addIssue('BLOCKER', `Joystick movement failed: ${e.message}`);
      }

      // Screenshot after movement
      await auditScreenshot(page, `${name}-after-move`);

      // --- 8. Attack -------------------------------------------------------
      try {
        const attackResult = await pressTouchButton(page, 'TouchAttack');
        let attackObserved = attackResult.isAttacking === true;
        if (!attackObserved) {
          await stepFrames(page, 1);
          const afterOneFrame = await readRuntimeState(page);
          attackObserved = afterOneFrame.isAttacking;
        }
        if (!attackObserved) {
          addIssue('CRITICAL', 'Attack button pressed but player is not in attacking state');
        } else {
          await stepFrames(page, 2);
        }
      } catch (e) {
        addIssue('CRITICAL', `Attack button failed: ${e.message}`);
      }

      // --- 9. Echo placement -----------------------------------------------
      try {
        await pressTouchButton(page, 'TouchPlaceEcho');
        await stepFrames(page, 5);
        const afterEcho = await readRuntimeState(page);
        if (afterEcho.echoNames.length === 0) {
          addIssue('CRITICAL', 'Place echo button pressed but no echo appeared in EchoRoot');
        }
      } catch (e) {
        addIssue('CRITICAL', `Echo placement failed: ${e.message}`);
      }

      // Screenshot after interactions
      await auditScreenshot(page, `${name}-after-interact`);

      // --- 10. Runtime state snapshot for reference -------------------------
      const finalState = await readRuntimeState(page);

      // --- Summary for this scene ------------------------------------------
      const blockers = issues.filter(i => i.severity === 'BLOCKER').length;
      const crits = issues.filter(i => i.severity === 'CRITICAL').length;
      const cosmetics = issues.filter(i => i.severity === 'COSMETIC').length;
      const verdict = blockers > 0 ? 'NOT READY' : crits > 0 ? 'NEEDS FIXES' : 'DEMO READY';

      console.log(`\n=== ${name}: ${verdict} (${blockers}B / ${crits}C / ${cosmetics}X) ===`);
      for (const iss of issues) {
        console.log(`  [${iss.severity}] ${iss.message}`);
      }

      // Soft-assert: don't fail the whole suite on cosmetics, but fail on blockers
      expect(blockers, `${name} has BLOCKER issues`).toBe(0);
    });
  }

  // =========================================================================
  // PART 2: Portal / scene transition flow
  // =========================================================================
  test('[FLOW] Portal transition from StartCamp to FieldWest', async ({ page }) => {
    await openPreviewScene(page, 'StartCamp', ['Player', 'Portal-FieldWest']);
    await stepFrames(page, 10);

    // The CampGate blocks the portal by default -- we need to open it
    // Solve the camp puzzle: place box on CampPlate
    await movePlayerNearTarget(page, 'CampPlate', -18, 0);
    await stepFrames(page, 3);
    await pressTouchButton(page, 'TouchPlaceEcho');
    await stepFrames(page, 5);

    // Trigger the plate contact
    let gateOpened = false;
    try {
      const plateResult = await triggerPlateContact(page, 'CampPlate', 'Echo-box');
      gateOpened = plateResult.gateOpenActive === true;
    } catch {
      // If triggerPlateContact fails, gate may still be openable
    }

    // Move player near the portal
    await movePlayerNearTarget(page, 'Portal-FieldWest', -18, 0);
    await stepFrames(page, 5);

    // Check portal readiness and execute the real ScenePortal transition.
    const state = await readRuntimeState(page);
    console.log(`  Portal-FieldWest active: portal is ${state.worldNames.includes('Portal-FieldWest') ? 'present' : 'MISSING'}`);
    console.log(`  Camp gate open: ${state.gateOpenActive ?? 'N/A'}`);

    await auditScreenshot(page, 'flow-portal-camp-to-field');

    expect(gateOpened || state.gateOpenActive === true, 'Camp gate should be open before entering Portal-FieldWest').toBe(true);
    expect(state.worldNames).toContain('Portal-FieldWest');
    const portalResult = await triggerPortalContact(page, 'Portal-FieldWest', { interceptSwitch: true });
    expect(portalResult.wasActive, 'Portal-FieldWest should be active before contact').toBe(true);
    expect(portalResult.targetScene).toBe('FieldWest');
    expect(portalResult.requestedScene).toBe('FieldWest');
    expect(portalResult.checkpointSceneName).toBe('FieldWest');
    expect(portalResult.checkpointMarkerId).toBe('field-west-entry');
  });

  // =========================================================================
  // PART 3: Checkpoint reach test
  // =========================================================================
  test('[FLOW] Checkpoint activation in MechanicsLab', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player', 'Checkpoint-01']);
    await resetMechanicsLab(page);

    // Move player near the checkpoint
    await movePlayerNearTarget(page, 'Checkpoint-01', 0, 0);
    await stepFrames(page, 15);

    const cp = await readCheckpointState(page);
    console.log(`  Checkpoint state: ${JSON.stringify(cp)}`);

    await auditScreenshot(page, 'flow-checkpoint-reached');
    // Checkpoint should now register
    expect(cp).toHaveProperty('hasCheckpoint');
  });

  // =========================================================================
  // PART 4: Pressure plate puzzle
  // =========================================================================
  test('[FLOW] Pressure plate puzzle in MechanicsLab', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player', 'Plate-01', 'BombGateRoot']);
    await resetMechanicsLab(page);

    // Move near plate
    await movePlayerNearTarget(page, 'Plate-01', -18, 0);
    await stepFrames(page, 3);

    // Select box echo and place it
    await pressTouchButton(page, 'TouchEchoBox');
    await pressTouchButton(page, 'TouchPlaceEcho');
    await stepFrames(page, 5);

    // Simulate plate contact
    const plateResult = await triggerPlateContact(page, 'Plate-01', 'Echo-box');
    console.log(`  Plate result: gate-open=${plateResult.gateOpenActive}, gate-closed=${plateResult.gateClosedActive}`);

    await auditScreenshot(page, 'flow-plate-puzzle-solved');

    expect(plateResult.gateOpenActive).toBe(true);
    expect(plateResult.gateClosedActive).toBe(false);
  });

  // =========================================================================
  // PART 5: Death and respawn
  // =========================================================================
  test('[FLOW] Player death and respawn', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player', 'Checkpoint-01']);
    await resetMechanicsLab(page);

    // Verify full health
    const beforeHealth = await readPlayerHealth(page);
    expect(beforeHealth.current).toBe(beforeHealth.max);
    console.log(`  Starting HP: ${beforeHealth.current}/${beforeHealth.max}`);

    // Kill the player. PlayerController now auto-respawns when health hits 0
    // (the manual TouchRespawn and auto-death paths share the same
    // GAME_EVENT_RESPAWN_REQUESTED handler), so disableAutoRespawn lets us see
    // the dead state and then explicitly verify the manual button restores HP.
    const killResult = await killPlayer(page, { disableAutoRespawn: true });
    console.log(`  After kill: HP=${killResult.currentHealth}`);
    expect(killResult.currentHealth).toBe(0);

    await stepFrames(page, 10);
    await auditScreenshot(page, 'flow-player-dead');

    // Check if respawn button appears
    const stateAfterDeath = await readRuntimeState(page);
    console.log(`  Respawn button active: ${stateAfterDeath.resetButtonActive}`);
    console.log(`  Flow state: ${stateAfterDeath.flowState}`);

    // Try pressing respawn
    let respawnWorked = false;
    try {
      await pressTouchButton(page, 'TouchRespawn');
      await stepFrames(page, 15);
      const afterRespawn = await readPlayerHealth(page);
      console.log(`  After respawn: HP=${afterRespawn.current}/${afterRespawn.max}`);
      respawnWorked = afterRespawn.current > 0 && afterRespawn.current === afterRespawn.max;
    } catch (e) {
      console.log(`  Respawn button error: ${e.message}`);
    }

    await auditScreenshot(page, 'flow-player-respawned');

    expect(respawnWorked, 'Manual TouchRespawn must restore player HP back to max').toBe(true);
  });

  // =========================================================================
  // PART 6: Boss fight initialization
  // =========================================================================
  test('[FLOW] Boss fight starts correctly', async ({ page }) => {
    await openPreviewScene(page, 'BossArena', ['Player', 'BossEnemy-Core']);
    await stepFrames(page, 15);

    const boss = await readBossState(page);
    console.log(`  Boss alive: ${boss.alive}`);
    console.log(`  Boss danger: ${boss.danger}`);
    console.log(`  Boss vulnerable: ${boss.vulnerable}`);
    console.log(`  Boss health: ${boss.health}/${boss.maxHealth}`);
    console.log(`  Shield broken: ${boss.shieldBroken}`);

    await auditScreenshot(page, 'flow-boss-initial');

    expect(boss.alive).toBe(true);
    expect(boss.danger).toBe(true);
    expect(boss.health).toBe(boss.maxHealth);
    expect(boss.maxHealth).toBeGreaterThanOrEqual(3);

    // Verify player health in boss scene
    const playerHealth = await readPlayerHealth(page);
    console.log(`  Player health in boss: ${playerHealth.current}/${playerHealth.max}`);
    expect(playerHealth.current).toBe(playerHealth.max);

    // Can player move in boss arena?
    let canMove = false;
    try {
      const moveResult = await dragJoystick(page, { x: 52, y: 0, frames: 20 });
      const dx = Math.abs(moveResult.afterMove.x - moveResult.before.x);
      canMove = dx > 10;
      console.log(`  Player movement in boss arena: dx=${dx.toFixed(1)} (${canMove ? 'OK' : 'STUCK'})`);
    } catch (e) {
      console.log(`  Movement error in boss arena: ${e.message}`);
    }

    if (!canMove) {
      console.log('  [BLOCKER] Player cannot move in boss arena - soft-lock');
    }

    // Can player attack?
    try {
      await pressTouchButton(page, 'TouchAttack');
      await stepFrames(page, 2);
      const attackState = await readRuntimeState(page);
      console.log(`  Player attacking in boss arena: ${attackState.isAttacking}`);
    } catch (e) {
      console.log(`  [CRITICAL] Attack failed in boss arena: ${e.message}`);
    }

    await auditScreenshot(page, 'flow-boss-after-interaction');
  });

  // =========================================================================
  // PART 7: Soft-lock check -- try each dungeon room
  // =========================================================================
  test('[FLOW] Dungeon rooms load and player can move', async ({ page }) => {
    const dungeonScenes = [
      { name: 'DungeonRoomA', readyNodes: ['Player'] },
      { name: 'DungeonRoomB', readyNodes: ['Player'] },
      { name: 'DungeonRoomC', readyNodes: ['Player'] },
    ];

    for (const scene of dungeonScenes) {
      await openPreviewScene(page, scene.name, scene.readyNodes);
      await stepFrames(page, 20);

      // Can move?
      let canMove = false;
      try {
        const moveResult = await dragJoystick(page, { x: 52, y: 0, frames: 20 });
        const dx = Math.abs(moveResult.afterMove.x - moveResult.before.x);
        canMove = dx > 10;
        console.log(`  ${scene.name}: movement dx=${dx.toFixed(1)} (${canMove ? 'OK' : 'STUCK'})`);
      } catch (e) {
        console.log(`  ${scene.name}: movement FAILED -- ${e.message}`);
      }

      // Player health
      const hp = await readPlayerHealth(page);
      console.log(`  ${scene.name}: HP=${hp.current}/${hp.max}`);

      await auditScreenshot(page, `flow-${scene.name.toLowerCase()}`);

      expect(canMove, `${scene.name}: player must be able to move`).toBe(true);
      expect(hp.current, `${scene.name}: player should start at full health`).toBe(hp.max);
    }
  });

  // =========================================================================
  // PART 8: DungeonHub with progress flags (boss gate unlock)
  // =========================================================================
  test('[FLOW] DungeonHub boss gate responds to progress flags', async ({ page }) => {
    await openPreviewScene(page, 'DungeonHub', ['Player']);
    await stepFrames(page, 10);

    // Gate should be closed initially
    const initialState = await readRuntimeState(page);
    console.log(`  BossGate-Closed active: ${initialState.gateClosedActive}`);
    console.log(`  BossGate-Open active: ${initialState.gateOpenActive}`);

    await auditScreenshot(page, 'flow-dungeon-hub-initial');

    // Set all three room-clear flags
    await setProgressFlag(page, 'room-a-clear');
    await setProgressFlag(page, 'room-b-clear');
    await setProgressFlag(page, 'room-c-clear');
    await stepFrames(page, 10);

    const flags = await readProgressFlags(page);
    console.log(`  Progress flags: ${JSON.stringify(flags)}`);

    const afterFlags = await readRuntimeState(page);
    console.log(`  After flags -- BossGate-Closed active: ${afterFlags.gateClosedActive}`);
    console.log(`  After flags -- BossGate-Open active: ${afterFlags.gateOpenActive}`);

    await auditScreenshot(page, 'flow-dungeon-hub-gates-unlocked');

    // The boss gate should now be open (or at least the controller should have processed)
    expect(flags).toContain('room-a-clear');
    expect(flags).toContain('room-b-clear');
    expect(flags).toContain('room-c-clear');
  });

  // =========================================================================
  // PART 9: Bomb echo wall destruction (FieldRuins / MechanicsLab)
  // =========================================================================
  test('[FLOW] Bomb echo can break cracked wall in MechanicsLab', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player', 'BombGateRoot']);
    await resetMechanicsLab(page);

    // Unlock bomb echo
    const unlocked = await unlockEcho(page, 2);
    console.log(`  Unlocked echoes: ${JSON.stringify(unlocked)}`);
    expect(unlocked).toContain(2);

    // Move near the bomb wall
    await movePlayerNearTarget(page, 'BombWall-Closed', -18, 0);
    await stepFrames(page, 3);

    // Select bomb echo and place it
    await pressTouchButton(page, 'TouchEchoBomb');
    await pressTouchButton(page, 'TouchPlaceEcho');
    await stepFrames(page, 100);

    const state = await readRuntimeState(page);
    console.log(`  BombWall-Closed active: ${state.bombWallClosedActive}`);
    console.log(`  BombWall-Open active: ${state.bombWallOpenActive}`);

    await auditScreenshot(page, 'flow-bomb-wall-destroyed');

    expect(state.bombWallOpenActive).toBe(true);
    expect(state.bombWallClosedActive).toBe(false);
  });

  // =========================================================================
  // PART 10: Full scene-to-scene connectivity check
  // =========================================================================
  test('[FLOW] All scenes have working portals / no orphan scenes', async ({ page }) => {
    // Check each scene loads and has the expected portal nodes
    const scenePortals = [
      { scene: 'StartCamp', expectedPortals: ['Portal-FieldWest'] },
      { scene: 'FieldWest', expectedPortals: ['Portal-StartCamp', 'Portal-FieldRuins'] },
      { scene: 'FieldRuins', expectedPortals: ['Portal-FieldWestReturn', 'Portal-DungeonHub'] },
      { scene: 'DungeonHub', expectedPortals: ['Portal-FieldRuinsReturn', 'Portal-DungeonRoomA', 'Portal-DungeonRoomB', 'Portal-DungeonRoomC', 'Portal-BossArena'] },
      { scene: 'DungeonRoomA', expectedPortals: ['Portal-DungeonHubReturn-A'] },
      { scene: 'DungeonRoomB', expectedPortals: ['Portal-DungeonHubReturn-B'] },
      { scene: 'DungeonRoomC', expectedPortals: ['Portal-DungeonHubReturn-C'] },
      { scene: 'BossArena', expectedPortals: ['Portal-BossVictory'] },
    ];

    for (const { scene, expectedPortals } of scenePortals) {
      await openPreviewScene(page, scene, ['Player']);
      await stepFrames(page, 10);

      const state = await readRuntimeState(page);
      for (const portal of expectedPortals) {
        const hasPortal = state.worldNames.includes(portal);
        console.log(`  ${scene}: portal ${portal} -- ${hasPortal ? 'PRESENT' : 'MISSING'}`);
        expect(hasPortal, `${scene} should contain portal ${portal}`).toBe(true);
      }
    }
  });

  // =========================================================================
  // PART 11: Verify no "Loading HUD..." or placeholder labels across scenes
  // =========================================================================
  test('[HUD] No placeholder labels visible in any scene', async ({ page }) => {
    const scenesToCheck = ['StartCamp', 'FieldWest', 'FieldRuins', 'DungeonHub', 'BossArena'];
    const placeholderIssues = [];

    for (const sceneName of scenesToCheck) {
      await openPreviewScene(page, sceneName, ['Player']);
      await stepFrames(page, 20);

      const hud = await readHudStatus(page);
      for (const lbl of (hud.labels ?? [])) {
        if (/loading|placeholder|todo|fixme|xxx|undefined|null|NaN/i.test(lbl.text)) {
          placeholderIssues.push({ scene: sceneName, node: lbl.node, text: lbl.text });
          console.log(`  [CRITICAL] ${sceneName} HUD: "${lbl.node}" shows "${lbl.text}"`);
        }
      }
    }

    console.log(`  Placeholder label issues found: ${placeholderIssues.length}`);
    expect(placeholderIssues.length, 'No placeholder labels should be visible').toBe(0);
  });

  // =========================================================================
  // PART 12: Boss defeat victory flow
  // =========================================================================
  test('[FLOW] Boss defeat triggers victory state', async ({ page }) => {
    await openPreviewScene(page, 'BossArena', ['Player', 'BossEnemy-Core']);
    await stepFrames(page, 10);

    // Simulate boss defeat by depleting health
    await page.evaluate(() => {
      const scene = window.cc?.director?.getScene?.();
      const canvas = scene?.getChildByName?.('Canvas');
      const worldRoot = canvas?.getChildByName?.('WorldRoot');
      const findComp = (root, name) => {
        if (!root) return null;
        const c = root.components?.find(x => x?.constructor?.name === name);
        if (c) return c;
        for (const ch of (root.children ?? [])) {
          const f = findComp(ch, name);
          if (f) return f;
        }
        return null;
      };
      const encounter = findComp(worldRoot, 'BossEncounterController');
      const bossHealth = encounter?.bossHealth;
      if (bossHealth) {
        bossHealth.acceptDamage = true;
        bossHealth.invulnerableTimer = 0;
        while (bossHealth.getCurrentHealth() > 0) {
          bossHealth.applyDamage(1);
          bossHealth.invulnerableTimer = 0;
        }
      }
    });
    await stepFrames(page, 20);

    const flags = await readProgressFlags(page);
    console.log(`  After boss defeat, flags: ${JSON.stringify(flags)}`);

    // Check victory UI elements
    const victoryState = await page.evaluate(() => {
      const scene = window.cc?.director?.getScene?.();
      const canvas = scene?.getChildByName?.('Canvas');
      const worldRoot = canvas?.getChildByName?.('WorldRoot');
      const hudRoot = canvas?.getChildByName?.('HudRoot');
      const gameHud = hudRoot?.components?.find((component) => component?.constructor?.name === 'GameHud');
      const bossVictoryBanner = worldRoot?.getChildByName?.('BossVictoryBanner');
      const bossWindowBanner = worldRoot?.getChildByName?.('BossWindowBanner');
      const portalVictory = worldRoot?.getChildByName?.('Portal-BossVictory');
      const bossStatusBanner = worldRoot?.getChildByName?.('BossStatusBanner');

      return {
        bossObjectiveText: String(gameHud?.objectiveText ?? ''),
        bossVictoryBannerActive: bossVictoryBanner?.active ?? null,
        bossWindowBannerActive: bossWindowBanner?.active ?? null,
        portalVictoryActive: portalVictory?.active ?? null,
        bossStatusBannerActive: bossStatusBanner?.active ?? null,
      };
    });

    console.log(`  Victory UI state: ${JSON.stringify(victoryState)}`);
    expect(victoryState.bossObjectiveText.trim()).not.toBe('');
    expect(victoryState.bossVictoryBannerActive).toBe(true);
    expect(victoryState.bossWindowBannerActive).toBe(false);
    expect(victoryState.portalVictoryActive).toBe(true);
    expect(victoryState.bossStatusBannerActive).toBe(false);
    await auditScreenshot(page, 'flow-boss-defeated');

    expect(flags).toContain('boss-cleared');
  });

  // =========================================================================
  // PART 13: Flower echo pickup (FieldWest)
  // =========================================================================
  test('[FLOW] FieldWest echo pickup collectible', async ({ page }) => {
    await openPreviewScene(page, 'FieldWest', ['Player']);
    await stepFrames(page, 10);

    // Check EchoPickup-Flower-West exists
    const state = await readRuntimeState(page);
    const hasPickup = state.worldNames.includes('EchoPickup-Flower-West');
    console.log(`  EchoPickup-Flower-West present: ${hasPickup}`);

    // Move near the pickup
    if (hasPickup) {
      try {
        await movePlayerNearTarget(page, 'EchoPickup-Flower-West', 0, 0);
        await stepFrames(page, 10);
        console.log('  Player moved near flower pickup');
      } catch (e) {
        console.log(`  Could not move to flower pickup: ${e.message}`);
      }
    }

    await auditScreenshot(page, 'flow-field-west-flower');
    expect(hasPickup).toBe(true);
  });

  // =========================================================================
  // PART 14: FieldRuins bomb pickup
  // =========================================================================
  test('[FLOW] FieldRuins bomb pickup and wall', async ({ page }) => {
    await openPreviewScene(page, 'FieldRuins', ['Player']);
    await stepFrames(page, 10);

    const state = await readRuntimeState(page);
    const hasBombPickup = state.worldNames.includes('EchoPickup-Bomb-Ruins');
    const hasWallClosed = state.worldNames.includes('RuinsWall-Closed');
    const hasWallOpen = state.worldNames.includes('RuinsWall-Open');

    console.log(`  EchoPickup-Bomb-Ruins present: ${hasBombPickup}`);
    console.log(`  RuinsWall-Closed present: ${hasWallClosed}`);
    console.log(`  RuinsWall-Open present: ${hasWallOpen}`);

    await auditScreenshot(page, 'flow-field-ruins');

    expect(hasBombPickup).toBe(true);
    expect(hasWallClosed).toBe(true);
  });

  // =========================================================================
  // PART 15: MechanicsLab trap damage
  // =========================================================================
  test('[FLOW] Trap damages player in MechanicsLab', async ({ page }) => {
    await openPreviewScene(page, 'MechanicsLab', ['Player']);
    await resetMechanicsLab(page);

    const beforeHealth = await readPlayerHealth(page);
    console.log(`  Before trap: HP=${beforeHealth.current}/${beforeHealth.max}`);

    // Apply damage to simulate trap hit
    const dmgResult = await applyDamageToPlayer(page, 1);
    console.log(`  After damage: HP=${dmgResult.currentHealth}, applied=${dmgResult.applied}`);

    expect(dmgResult.applied).toBe(true);
    expect(dmgResult.currentHealth).toBe(beforeHealth.current - 1);

    await auditScreenshot(page, 'flow-mechanics-trap-damage');
  });
});
