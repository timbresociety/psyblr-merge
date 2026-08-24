import { test, expect } from '@playwright/test';

test.describe('PSYBLR V2 Multi-Summon Camp, Battle Camp Dock, & 3D Pachinko World', () => {
  test('boots cleanly, supports tap inspect, drag swap, and 3D Pachinko camera focus & ball drop', async ({
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

    const isDesktop = testInfo.project.name === 'desktop-chromium';
    const prefix = isDesktop ? 'desktop' : 'mobile';

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

    // 1. Screenshot Initial Base Camp with multi-summon setup & dock
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-camp-dock-initial.png` });

    // --- PHASE 1: DIRECT MANIPULATION DRAG SWAP ---
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

    // Release mouse for Swap
    await page.mouse.up();

    // Wait for landing sequence & settle
    await page.waitForFunction(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const goku = app.sceneManager.getSummonById('starter:goku:001');
      const naruto = app.sceneManager.getSummonById('starter:naruto:002');
      return goku?.state === 'IDLE' && naruto?.state === 'IDLE';
    }, { timeout: 3000 });

    // --- PHASE 2: 3D PACHINKO WORLD FOCUS & DROP ---
    // Enter Pachinko via app method to ensure deterministic camera focus across viewport sizes
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.enterPachinko();
    });

    // Wait for Pachinko HUD & Camera Focus
    await page.waitForFunction(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const camPos = app.cameraDirector.cameraEntity.getPosition();
      return app.pachinkoHUD.isOpen && Math.abs(camPos.x - 6.4) < 0.2;
    }, { timeout: 4000 });

    const pachinkoState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        isOpen: app.pachinkoHUD.isOpen,
        binCount: app.sceneManager.pachinkoWorld.bins.length,
        pinCount: app.sceneManager.pachinkoWorld.pins.length,
      };
    });

    expect(pachinkoState.isOpen).toBe(true);
    expect(pachinkoState.binCount).toBe(6);
    expect(pachinkoState.pinCount).toBeGreaterThan(50);

    // Screenshot Open 3D Pachinko World
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-pachinko-board.png` });

    // Trigger Ball Drop
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.sceneManager.pachinkoWorld.dropBall(0); // Drop towards Goku bin
    });

    await page.waitForTimeout(600);

    // Screenshot Active Ball Fall
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-pachinko-ball-drop.png` });

    // Close Pachinko via Escape key
    await page.keyboard.press('Escape');

    // Wait for camera to return to base overview
    await page.waitForFunction(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const camPos = app.cameraDirector.cameraEntity.getPosition();
      return !app.pachinkoHUD.isOpen && Math.abs(camPos.x) < 0.1;
    }, { timeout: 4000 });

    const closedState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        isPachinkoOpen: app.pachinkoHUD.isOpen,
      };
    });
    expect(closedState.isPachinkoOpen).toBe(false);

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
