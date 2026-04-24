import { test, expect } from '@playwright/test';
import { ensurePreviewServer, openPreviewScene } from './helpers/playwright-cocos-helpers.mjs';

const layeringExpectations = [
  {
    sceneName: 'StartCamp',
    backgroundNames: ['CampBackdrop', 'CampTopLane', 'CampPath-0', 'CampPath-0B', 'CampPath-1', 'CampPath-2', 'CampPath-3', 'CampPath-4', 'CampWall-Lintel', 'CampWall-LeftPost', 'CampWall-RightPost', 'CampAccent-1', 'CampAccent-2', 'CampAccent-3', 'CampAccent-4', 'CampAccent-5'],
    frontNames: ['Checkpoint-Camp', 'CampGate-Closed'],
  },
  {
    sceneName: 'FieldWest',
    backgroundNames: ['FieldBackdrop', 'FieldTopStrip', 'FieldPath-0', 'FieldPath-0B', 'FieldPath-1', 'FieldPath-2', 'FieldPath-3', 'FieldPath-4', 'FieldAccent-1', 'FieldAccent-2', 'FieldAccent-3', 'FieldAccent-4', 'FieldAccent-5'],
    frontNames: ['Checkpoint-FieldWest', 'Portal-FieldRuins'],
  },
  {
    sceneName: 'DungeonRoomA',
    backgroundNames: ['RoomABackdrop', 'RoomAChallengeZone'],
    frontNames: ['Checkpoint-DungeonRoomA', 'RoomA-GateClosed'],
  },
  {
    sceneName: 'BossArena',
    backgroundNames: ['BossBackdrop'],
    frontNames: ['Checkpoint-BossArena', 'BossShield-Closed'],
  },
];

test.describe('Player visibility and motion regression', () => {
  test.beforeAll(async ({ baseURL }) => {
    await ensurePreviewServer(baseURL);
  });

  test('player stays after background layers without floating above gameplay props', async ({ page }) => {
    for (const expectation of layeringExpectations) {
      await openPreviewScene(page, expectation.sceneName, ['Player']);
      const result = await page.evaluate(({ backgroundNames, frontNames }) => {
        const scene = window.cc?.director?.getScene?.();
        const canvas = scene?.getChildByName?.('Canvas');
        const worldRoot = canvas?.getChildByName?.('WorldRoot');
        const playerNode = worldRoot?.getChildByName?.('Player');
        const worldNames = worldRoot?.children?.map((node) => node.name) ?? [];
        const playerIndex = playerNode?.getSiblingIndex?.() ?? -1;
        const legacyBadge = playerNode?.getChildByName?.('PlayerLocatorBadge');
        const visibilityBadge = playerNode?.getChildByName?.('PlayerVisibilityBadge');
        const visibilityHalo = playerNode?.getChildByName?.('PlayerVisibilityHalo');

        return {
          playerIndex,
          worldNames,
          backgroundIndexes: backgroundNames.map((name) => ({ name, index: worldNames.indexOf(name) })),
          frontIndexes: frontNames.map((name) => ({ name, index: worldNames.indexOf(name) })),
          legacyBadgeActive: legacyBadge?.active ?? null,
          visibilityBadgeActive: visibilityBadge?.active ?? null,
          visibilityHaloActive: visibilityHalo?.active ?? null,
        };
      }, expectation);

      for (const entry of result.backgroundIndexes) {
        expect(entry.index, `${expectation.sceneName} should include ${entry.name}`).toBeGreaterThanOrEqual(0);
        expect(result.playerIndex, `${expectation.sceneName} player should render after ${entry.name}`).toBeGreaterThan(entry.index);
      }

      for (const entry of result.frontIndexes) {
        expect(entry.index, `${expectation.sceneName} should include ${entry.name}`).toBeGreaterThanOrEqual(0);
        expect(result.playerIndex, `${expectation.sceneName} player should stay below ${entry.name}`).toBeLessThan(entry.index);
      }

      expect(result.legacyBadgeActive, `${expectation.sceneName} should retire the legacy locator badge`).toBe(false);
      expect(result.visibilityBadgeActive, `${expectation.sceneName} should not render the temporary visibility badge`).toBe(null);
      expect(result.visibilityHaloActive, `${expectation.sceneName} should not render the temporary visibility halo`).toBe(null);
    }
  });

  test('full input matches full-stick speed while half-stick remains responsive', async ({ page }) => {
    await openPreviewScene(page, 'StartCamp', ['Player']);
    const result = await page.evaluate(() => {
      const cc = window.cc;
      const scene = cc?.director?.getScene?.();
      const canvas = scene?.getChildByName?.('Canvas');
      const worldRoot = canvas?.getChildByName?.('WorldRoot');
      const touchHudRoot = canvas?.getChildByName?.('TouchHudRoot');
      const playerNode = worldRoot?.getChildByName?.('Player');
      const player = playerNode?.components?.find((component) => component?.constructor?.name === 'PlayerController');
      const joystickNode = touchHudRoot?.getChildByName?.('Joystick');
      const joystick = joystickNode?.components?.find((component) => component?.constructor?.name === 'TouchJoystick');
      const uiTransform = joystickNode?.components?.find((component) => component?.constructor?.name === 'UITransform');

      const step = (frames) => {
        for (let index = 0; index < frames; index += 1) {
          cc.game.step();
        }
      };

      const distance2d = (start, end) => Math.hypot(end.x - start.x, end.y - start.y);
      const runDirect = (inputX, inputY, frames) => {
        const before = { x: playerNode.position.x, y: playerNode.position.y };
        player.setMoveInput(inputX, inputY);
        step(frames);
        const after = { x: playerNode.position.x, y: playerNode.position.y };
        player.setMoveInput(0, 0);
        step(2);
        return distance2d(before, after) / (frames / 60);
      };
      const runJoystick = (localX, localY, frames) => {
        const touchId = 700 + Math.round(Math.random() * 1000);
        const startWorld = uiTransform.convertToWorldSpaceAR(new cc.Vec3(0, 0, 0));
        const endWorld = uiTransform.convertToWorldSpaceAR(new cc.Vec3(localX, localY, 0));
        const makeEvent = (worldPosition) => ({
          getID: () => touchId,
          getUILocation: () => ({ x: worldPosition.x, y: worldPosition.y }),
        });
        const before = { x: playerNode.position.x, y: playerNode.position.y };
        joystick.onTouchStart(makeEvent(startWorld));
        joystick.onTouchMove(makeEvent(endWorld));
        step(frames);
        const after = { x: playerNode.position.x, y: playerNode.position.y };
        joystick.onTouchEnd(makeEvent(endWorld));
        step(2);
        return distance2d(before, after) / (frames / 60);
      };
      const runJoystickViaMouse = (localX, localY, frames) => {
        const startWorld = uiTransform.convertToWorldSpaceAR(new cc.Vec3(0, 0, 0));
        const endWorld = uiTransform.convertToWorldSpaceAR(new cc.Vec3(localX, localY, 0));
        const makeMouseEvent = (worldPosition) => ({
          getUILocation: () => ({
            x: worldPosition.x,
            y: worldPosition.y,
          }),
        });
        const before = { x: playerNode.position.x, y: playerNode.position.y };
        joystick.onMouseDown(makeMouseEvent(startWorld));
        joystick.onGlobalMouseMove(makeMouseEvent(endWorld));
        step(frames);
        const after = { x: playerNode.position.x, y: playerNode.position.y };
        joystick.onGlobalMouseUp();
        step(2);
        return distance2d(before, after) / (frames / 60);
      };

      return {
        directUnitsPerSecond: Number(runDirect(1, 0, 90).toFixed(2)),
        fullStickUnitsPerSecond: Number(runJoystick(56, 0, 90).toFixed(2)),
        halfStickUnitsPerSecond: Number(runJoystick(28, 0, 90).toFixed(2)),
        halfStickViaMouseUnitsPerSecond: Number(runJoystickViaMouse(28, 0, 90).toFixed(2)),
      };
    });

    expect(result.directUnitsPerSecond).toBeGreaterThan(200);
    expect(Math.abs(result.fullStickUnitsPerSecond - result.directUnitsPerSecond)).toBeLessThan(6);
    expect(result.halfStickUnitsPerSecond).toBeGreaterThan(100);
    expect(result.halfStickUnitsPerSecond).toBeLessThan(result.fullStickUnitsPerSecond - 60);
    expect(result.halfStickViaMouseUnitsPerSecond).toBeGreaterThan(100);
    expect(Math.abs(result.halfStickViaMouseUnitsPerSecond - result.halfStickUnitsPerSecond)).toBeLessThan(8);
  });
});
