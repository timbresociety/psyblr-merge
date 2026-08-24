import { test, expect } from '@playwright/test';

test.describe('PSYBLR V2 Native PlayCanvas Foundation & Summon Inspector', () => {
  test('boots cleanly, supports tap-to-inspect with camera focus, and executes direct drag-and-drop', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60000);
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    await page.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#game-canvas');

    // Wait for game initialization
    await page.waitForFunction(() => (window as any).__PSYBLR_GAME_APP__ !== undefined, {
      timeout: 5000,
    });

    // Verify zero console errors
    expect(consoleErrors).toEqual([]);

    // Check initial state
    const initialState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const goku = app.sceneManager.summons[0];
      return {
        hasApp: !!app,
        summonCount: app.sceneManager.summons.length,
        gokuState: goku.state,
        gokuCell: goku.currentCell,
        placementCount: app.sceneManager.getPlacements().length,
      };
    });

    expect(initialState.hasApp).toBe(true);
    expect(initialState.summonCount).toBe(1);
    expect(initialState.gokuState).toBe('IDLE');
    expect(initialState.gokuCell).toEqual({ x: 2, y: 3 });
    expect(initialState.placementCount).toBe(1);

    const isDesktop = testInfo.project.name === 'desktop-chromium';
    const prefix = isDesktop ? 'desktop' : 'mobile';

    // 1. Screenshot Initial Base Camp
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-initial.png` });

    // Helper to get screen position of any world coordinate [x, y, z]
    async function getWorldScreenPos(wx: number, wy: number, wz: number): Promise<{ x: number; y: number }> {
      return page.evaluate(
        ({ x, y, z }) => {
          const gameApp = (window as any).__PSYBLR_GAME_APP__;
          const camera = gameApp.cameraDirector.cameraComponent;
          const canvas = gameApp.app.graphicsDevice.canvas as HTMLCanvasElement;
          const bounds = canvas.getBoundingClientRect();

          const screenPos = { x: 0, y: 0, z: 0 };
          camera.worldToScreen({ x, y, z }, screenPos);

          const clientX = bounds.left + (screenPos.x * bounds.width) / canvas.width;
          const clientY = bounds.top + (screenPos.y * bounds.height) / canvas.height;

          return { x: clientX, y: clientY };
        },
        { x: wx, y: wy, z: wz }
      );
    }

    // --- PHASE 1: TAP TO INSPECT ---
    // Goku at cell (2, 3) -> world: [-0.625, 0, 0.625]
    const gokuPos = await getWorldScreenPos(-0.625, 0, 0.625);

    // Quick tap on Goku (< 200ms, stationary)
    await page.mouse.click(gokuPos.x, gokuPos.y);
    await page.waitForTimeout(350);

    // Verify Inspector Opened & Camera Reframed
    const inspectorState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        isOpen: app.inspector.isOpen,
        activeSummonId: app.inspector.activeSummonId,
      };
    });

    expect(inspectorState.isOpen).toBe(true);
    expect(inspectorState.activeSummonId).toBe('starter:goku:001');

    // Screenshot Open Inspector Panel
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-inspector-open.png` });

    // Close Inspector with Escape key
    await page.keyboard.press('Escape');

    // Wait for camera overview return to complete
    await page.waitForFunction(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const camPos = app.cameraDirector.cameraEntity.getPosition();
      return Math.abs(camPos.y - 10.8) < 0.1 && !app.inspector.isOpen && app.sceneManager.summons[0].state === 'IDLE';
    }, { timeout: 3000 });

    const closedInspectorState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        isOpen: app.inspector.isOpen,
      };
    });
    expect(closedInspectorState.isOpen).toBe(false);

    // --- PHASE 2: DIRECT MANIPULATION DRAG ---
    // Direct grab Goku at (2, 3)
    const currentGokuPos = await getWorldScreenPos(-0.625, 0, 0.625);
    await page.mouse.move(currentGokuPos.x, currentGokuPos.y);
    await page.mouse.down();
    await page.waitForTimeout(100);

    // Drag slightly towards destination to initiate drag threshold
    const stepPos = await getWorldScreenPos(-1.0, 0, -0.5);
    await page.mouse.move(stepPos.x, stepPos.y, { steps: 4 });
    await page.waitForTimeout(100);

    const grabState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        isDragging: app.dragController.isDragging,
        draggedId: app.dragController.draggedSummon?.instance.id,
      };
    });

    expect(grabState.isDragging).toBe(true);
    expect(grabState.draggedId).toBe('starter:goku:001');

    // Drag to valid Camp Cell (1, 1) -> world: [-1.875, 0, -1.875]
    const targetPos = await getWorldScreenPos(-1.875, 0, -1.875);
    await page.mouse.move(targetPos.x, targetPos.y, { steps: 8 });
    await page.waitForTimeout(100);

    const hoverState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        hoveredCell: app.dragController.hoveredTargetCell,
      };
    });
    expect(hoverState.hoveredCell).toEqual({ x: 1, y: 1 });

    // Screenshot Dragging Active
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-drag-active.png` });

    // Release mouse for Landing
    await page.mouse.up();

    // Wait for landing sequence & squash settle
    await page.waitForFunction(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.sceneManager.summons[0].state === 'IDLE';
    }, { timeout: 3000 });

    const landedState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const goku = app.sceneManager.summons[0];
      return {
        cell: goku.currentCell,
        state: goku.state,
        placements: app.sceneManager.getPlacements(),
      };
    });

    expect(landedState.cell).toEqual({ x: 1, y: 1 });
    expect(landedState.state).toBe('IDLE');
    expect(landedState.placements).toEqual([
      { summonInstanceId: 'starter:goku:001', cell: { x: 1, y: 1 } },
    ]);

    // Screenshot Landed
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-landed.png` });

    // --- PHASE 3: INVALID DROP RETURN ---
    const newGokuPos = await getWorldScreenPos(-1.875, 0, -1.875);
    await page.mouse.move(newGokuPos.x, newGokuPos.y);
    await page.mouse.down();
    await page.waitForTimeout(100);

    // Drag outside camp into safe on-screen void area
    const outsidePos = await getWorldScreenPos(5.5, 0, 0);
    await page.mouse.move(outsidePos.x, outsidePos.y, { steps: 6 });
    await page.waitForTimeout(100);

    const outsideDragState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        hoveredCell: app.dragController.hoveredTargetCell,
      };
    });
    expect(outsideDragState.hoveredCell).toBeNull();

    // Release mouse outside -> elastic return
    await page.mouse.up();

    await page.waitForFunction(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.sceneManager.summons[0].state === 'IDLE';
    }, { timeout: 3000 });

    const returnedState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const goku = app.sceneManager.summons[0];
      return {
        cell: goku.currentCell,
        state: goku.state,
      };
    });

    expect(returnedState.cell).toEqual({ x: 1, y: 1 });
    expect(returnedState.state).toBe('IDLE');

    // --- PHASE 4: DEBUG OVERLAY ---
    await page.keyboard.press('d');
    await page.waitForTimeout(150);

    const debugState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        debugVisible: app.debug.isVisible,
      };
    });
    expect(debugState.debugVisible).toBe(true);

    // Screenshot with Debug Overlay
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-debug-overlay.png` });
  });
});
