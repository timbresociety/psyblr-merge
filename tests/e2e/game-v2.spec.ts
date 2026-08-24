import { test, expect } from '@playwright/test';

test.describe('PSYBLR V2 Full Experience: Base Camp, Campaign, Dealer, Plinko Gacha, Merge, Defense, 3-Round Raid, & Opponent Steal', () => {
  test('executes complete V2 alpha lifecycle with zero errors', async ({
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

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#game-canvas');

    // Wait for game initialization
    await page.waitForFunction(() => (window as any).__PSYBLR_GAME_APP__ !== undefined, {
      timeout: 8000,
    });

    // Verify zero console errors
    expect(consoleErrors).toEqual([]);

    const isDesktop = testInfo.project.name === 'desktop-chromium';
    const prefix = isDesktop ? 'desktop' : 'mobile';

    // 1. Screenshot Initial Base Camp with 3D buildings, 6 starters & Dock
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-camp-initial.png` });

    // --- PHASE 1: DEALER NPC CLAIM 100 BALLS ---
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.enterDealer();
    });

    await page.waitForTimeout(400); // Wait for camera transition
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-dealer-modal.png` });

    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.dealerHUD.onClaimBalls?.();
      app.enterBase();
    });

    await page.waitForTimeout(400);

    // --- PHASE 2: SPAWN GACHA (PLINKO MACHINE & SHIELD BUMPERS) ---
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.enterPachinko();
    });

    await page.waitForTimeout(400);
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-pachinko-open.png` });

    // Simulate bumper bounce
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.sceneManager.pachinkoWorld.onBumperHit?.('bumper_left');
    });

    const shieldCharges = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.spawnAuthority.getShieldCharges();
    });
    expect(shieldCharges).toBe(1);

    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.enterBase();
    });

    await page.waitForTimeout(400);

    // --- PHASE 3: DIRECT MERGE (Goku #2 onto Goku #1) ---
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const goku1 = app.sceneManager.getSummonById('starter:goku:001');
      const goku2 = app.sceneManager.getSummonById('starter:goku:002');
      if (goku1 && goku2) {
        app.sceneManager.onSummonPlacementCommitted(goku2, goku1.currentCell, goku2.currentCell);
      }
    });

    // Wait for merge upgrade
    await page.waitForFunction(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const gokuTarget = app.sceneManager.getSummonById('starter:goku:001');
      return (
        app.sceneManager.summons.length === 5 &&
        gokuTarget?.instance.tier === 'E' &&
        gokuTarget?.state === 'IDLE'
      );
    }, { timeout: 5000 });

    await page.screenshot({ path: `apps/game/screenshot-${prefix}-camp-after-merge.png` });

    // --- PHASE 4: DEFENSE PODIUM ---
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.enterDefense();
    });

    await page.waitForTimeout(400);
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-defense-podium.png` });

    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.enterBase();
    });

    await page.waitForTimeout(400);

    // --- PHASE 5: CAMPAIGN BATTLE (LEVEL 1) ---
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.enterCampaign();
    });

    await page.waitForTimeout(400);

    const campUnitsCount = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.sceneManager.campaignWorld.unitEntities.size;
    });
    expect(campUnitsCount).toBe(11); // 5 player + 6 creeps

    await page.screenshot({ path: `apps/game/screenshot-${prefix}-campaign-prep.png` });

    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.enterBase();
    });

    await page.waitForTimeout(400);

    // --- PHASE 6: 3-ROUND RAID ARENA MATCH ---
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.enterRaid();
    });

    await page.waitForTimeout(400);
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-raid-arena-open.png` });

    // --- PHASE 7: OPPONENT CAMP & STEAL PRIZE ---
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.enterOpponentCamp();
    });

    await page.waitForTimeout(400);

    // Select exposed Naruto in row 2
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.sceneManager.opponentCampWorld.selectSummon('opp:naruto:03');
    });

    await page.screenshot({ path: `apps/game/screenshot-${prefix}-opponent-camp-selected.png` });

    // Claim steal
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.opponentCampHUD.onClaimSteal?.();
    });

    await page.waitForTimeout(500);

    // Return to base camp
    await page.waitForFunction(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.currentMode === 'base';
    }, { timeout: 4000 });

    await page.screenshot({ path: `apps/game/screenshot-${prefix}-final-base-camp.png` });
  });
});
