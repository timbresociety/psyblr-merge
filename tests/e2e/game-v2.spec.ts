import { test, expect } from '@playwright/test';

test.describe('PSYBLR V2 Native PlayCanvas Foundation', () => {
  test('boots cleanly, renders Base & Goku, executes golden drag-and-drop, and handles invalid drop return', async ({
    page,
  }, testInfo) => {
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

    // 1. Screenshot Initial State
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-initial.png` });

    // Helper to get screen position of any world coordinate [x, y, z]
    async function getWorldScreenPos(wx: number, wy: number, wz: number): Promise<{ x: number; y: number }> {
      return page.evaluate(
        ({ x, y, z }) => {
          const gameApp = (window as any).__PSYBLR_GAME_APP__;
          const camera = gameApp.cameraDirector.cameraComponent;
          const canvas = gameApp.app.graphicsDevice.canvas as HTMLCanvasElement;
          const bounds = canvas.getBoundingClientRect();

          // Camera worldToScreen gives canvas buffer coordinates
          const screenPos = { x: 0, y: 0, z: 0 };
          camera.worldToScreen({ x, y, z }, screenPos);

          // Convert canvas coordinate to client coordinate
          const clientX = bounds.left + (screenPos.x * bounds.width) / canvas.width;
          const clientY = bounds.top + (screenPos.y * bounds.height) / canvas.height;

          return { x: clientX, y: clientY };
        },
        { x: wx, y: wy, z: wz }
      );
    }

    // Get screen coordinates of Goku at (2, 3) -> world: [-0.625, 0, 0.625]
    const gokuPos = await getWorldScreenPos(-0.625, 0.5, 0.625);

    // 2. Direct Grab
    await page.mouse.move(gokuPos.x, gokuPos.y);
    await page.mouse.down();
    await page.waitForTimeout(120);

    const grabState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        isDragging: app.dragController.isDragging,
        draggedId: app.dragController.draggedSummon?.instance.id,
        hoveredCell: app.dragController.hoveredTargetCell,
      };
    });

    expect(grabState.isDragging).toBe(true);
    expect(grabState.draggedId).toBe('starter:goku:001');

    // 3. Drag to valid Camp Cell (1, 1) -> world: [-1.875, 0, -1.875]
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

    // 4. Release mouse for Landing
    await page.mouse.up();

    // Wait for authored landing & settle squash animation to complete
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

    // 5. Test Immediate Repositioning & Invalid Drop Return
    // Grab Goku again at (1, 1)
    const newGokuPos = await getWorldScreenPos(-1.875, 0.5, -1.875);
    await page.mouse.move(newGokuPos.x, newGokuPos.y);
    await page.mouse.down();
    await page.waitForTimeout(120);

    // Drag far outside the camp into the abyss
    const outsidePos = await getWorldScreenPos(12, 0, 12);
    await page.mouse.move(outsidePos.x, outsidePos.y, { steps: 5 });
    await page.waitForTimeout(100);

    const outsideDragState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        hoveredCell: app.dragController.hoveredTargetCell,
      };
    });
    expect(outsideDragState.hoveredCell).toBeNull();

    // Release mouse outside -> should perform elastic spring return
    await page.mouse.up();

    // Wait for return animation to complete
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

    // 6. Test Debug Overlay Toggle
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
