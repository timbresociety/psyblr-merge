import { test, expect } from '@playwright/test';

test.describe('PSYBLR V2 Multi-Summon Camp, Battle Camp Dock & Drag Swap', () => {
  test('boots cleanly, renders multi-summon roster & dock, supports tap inspect, and executes direct drag swap', async ({
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

    // Check initial multi-summon state
    const initialState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        hasApp: !!app,
        summonCount: app.sceneManager.summons.length,
        rosterCount: app.sceneManager.roster.length,
        placements: app.sceneManager.getPlacements(),
      };
    });

    expect(initialState.hasApp).toBe(true);
    expect(initialState.summonCount).toBe(4);
    expect(initialState.rosterCount).toBe(6);
    expect(initialState.placements.length).toBe(4);

    const isDesktop = testInfo.project.name === 'desktop-chromium';
    const prefix = isDesktop ? 'desktop' : 'mobile';

    // 1. Screenshot Initial Base Camp with multi-summon setup & dock
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-camp-dock-initial.png` });

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

    // --- PHASE 1: TAP TO INSPECT GOKU ---
    // Goku at cell (2, 3) -> world: [-0.625, 0, 0.625]
    const gokuPos = await getWorldScreenPos(-0.625, 0, 0.625);

    // Tap on Goku (< 200ms, stationary)
    await page.mouse.click(gokuPos.x, gokuPos.y);
    await page.waitForTimeout(350);

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
      return Math.abs(camPos.y - 10.8) < 0.1 && !app.inspector.isOpen;
    }, { timeout: 3000 });

    // --- PHASE 2: DIRECT MANIPULATION DRAG SWAP ---
    // Goku is at (2, 3) -> [-0.625, 0, 0.625]
    // Naruto is at (3, 3) -> [0.625, 0, 0.625]
    const currentGokuPos = await getWorldScreenPos(-0.625, 0, 0.625);
    await page.mouse.move(currentGokuPos.x, currentGokuPos.y);
    await page.mouse.down();
    await page.waitForTimeout(100);

    // Drag towards Naruto at (3, 3)
    const narutoPos = await getWorldScreenPos(0.625, 0, 0.625);
    await page.mouse.move(narutoPos.x, narutoPos.y, { steps: 8 });
    await page.waitForTimeout(100);

    const hoverState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        hoveredCell: app.dragController.hoveredTargetCell,
        isDragging: app.dragController.isDragging,
      };
    });
    expect(hoverState.isDragging).toBe(true);
    expect(hoverState.hoveredCell).toEqual({ x: 3, y: 3 });

    // Screenshot Swap Hover
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-drag-swap-hover.png` });

    // Release mouse for Swap
    await page.mouse.up();

    // Wait for landing sequence & settle
    await page.waitForFunction(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const goku = app.sceneManager.getSummonById('starter:goku:001');
      const naruto = app.sceneManager.getSummonById('starter:naruto:002');
      return goku?.state === 'IDLE' && naruto?.state === 'IDLE';
    }, { timeout: 3000 });

    const swappedState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const goku = app.sceneManager.getSummonById('starter:goku:001');
      const naruto = app.sceneManager.getSummonById('starter:naruto:002');
      return {
        gokuCell: goku?.currentCell,
        narutoCell: naruto?.currentCell,
        placements: app.sceneManager.getPlacements(),
      };
    });

    // Verify positions swapped!
    expect(swappedState.gokuCell).toEqual({ x: 3, y: 3 });
    expect(swappedState.narutoCell).toEqual({ x: 2, y: 3 });

    // Screenshot Landed Swap
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-swap-landed.png` });

    // --- PHASE 3: DEBUG OVERLAY ---
    await page.keyboard.press('d');
    await page.waitForTimeout(150);

    const debugState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        debugVisible: app.debug.isVisible,
      };
    });
    expect(debugState.debugVisible).toBe(true);

    await page.screenshot({ path: `apps/game/screenshot-${prefix}-debug-overlay.png` });
  });
});
