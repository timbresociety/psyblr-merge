import { test, expect } from '@playwright/test';

test.describe('PSYBLR V2 Multi-Summon Camp, Battle Camp Dock, 3D Pachinko & Merge Upgrade', () => {
  test('boots cleanly, supports drag swap, authoritative 3D Pachinko spawn, and direct merge tier upgrade', async ({
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

    // Release mouse for Swap (Goku moves to (3,3), Naruto moves to (2,3))
    await page.mouse.up();

    // Wait for landing sequence & settle
    await page.waitForFunction(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const goku = app.sceneManager.getSummonById('starter:goku:001');
      const naruto = app.sceneManager.getSummonById('starter:naruto:002');
      return goku?.state === 'IDLE' && naruto?.state === 'IDLE';
    }, { timeout: 3000 });

    // --- PHASE 2: SPAWN A 2ND GOKU VIA AUTHORITATIVE SPAWN ---
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      // Authoritatively spawn a 2nd Goku [F] at cell (1, 1)
      app.sceneManager.spawnAndTransferSummon(
        { id: 'spawn:goku:dup01', definitionId: 'goku', tier: 'F' },
        { x: 1, y: 1 },
        [6.4, 1.8, 0]
      );
    });

    // Wait for new summon to land in Camp
    await page.waitForFunction(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const dup = app.sceneManager.getSummonById('spawn:goku:dup01');
      return (
        app.sceneManager.summons.length === 5 &&
        dup?.state === 'IDLE' &&
        app.sceneManager.summons.every((s: any) => s.state === 'IDLE')
      );
    }, { timeout: 5000 });

    // Screenshot Camp with 2 Goku summons
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-camp-before-merge.png` });

    // --- PHASE 3: DIRECT MERGE (2nd Goku at (1,1) onto 1st Goku at (3,3)) ---
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const dup = app.sceneManager.getSummonById('spawn:goku:dup01');
      const target = app.sceneManager.getSummonById('starter:goku:001');
      if (dup && target) {
        app.sceneManager.onSummonPlacementCommitted(dup, target.currentCell, dup.currentCell);
      }
    });

    // Wait for merge animation, collapse, silence pocket, and upgrade burst
    await page.waitForFunction(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const gokuTarget = app.sceneManager.getSummonById('starter:goku:001');
      return (
        app.sceneManager.summons.length === 4 &&
        gokuTarget?.instance.tier === 'E' &&
        gokuTarget?.state === 'IDLE'
      );
    }, { timeout: 5000 });

    const postMergeState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const goku = app.sceneManager.getSummonById('starter:goku:001');
      return {
        summonCount: app.sceneManager.summons.length,
        gokuTier: goku?.instance.tier,
      };
    });

    expect(postMergeState.summonCount).toBe(4);
    expect(postMergeState.gokuTier).toBe('E');

    // Screenshot Camp after Successful Merge
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-camp-after-merge.png` });

    // --- PHASE 4: TAP INSPECT UPGRADED GOKU [E] ---
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const goku = app.sceneManager.getSummonById('starter:goku:001');
      if (goku) {
        app.inspector.open(goku.instance);
      }
    });

    await page.waitForFunction(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.inspector.isOpen && app.inspector.activeSummon?.tier === 'E';
    }, { timeout: 3000 });

    // Screenshot Open Inspector showing [E] tier progression rail
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-inspector-tier-e.png` });

    // Close Inspector
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // --- PHASE 5: DEBUG OVERLAY ---
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
