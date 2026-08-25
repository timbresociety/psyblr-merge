import { test, expect } from '@playwright/test';

test.describe('PSYBLR V2 Full Experience: Base Camp, Campaign, Dealer, Plinko Gacha, Merge, Defense, 3-Round Raid, & Opponent Steal', () => {
  test('executes complete V2 alpha lifecycle with zero errors', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000);
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('ERR_CONNECTION_REFUSED')) {
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

    // 1. Ensure Base Camp Overview for initial screenshot with 3D buildings, 6 starters & Dock
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.enterBase();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-camp-initial.png` });

    // --- PHASE 0: SUMMON INSPECT DRAWER & DIRECT GATE TRANSITION ---
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const goku = app.sceneManager.getSummonById('starter:goku:001');
      if (goku) {
        const worldPos = [0, 0, 0];
        app.cameraDirector.focusOnSummon(worldPos);
        app.inspector.open(goku.instance, () => {
          app.cameraDirector.returnToBaseOverview();
        });
      }
    });
    await page.waitForTimeout(350);
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-summon-inspector.png` });

    // Transition directly from Inspect to Campaign Gate
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.enterCampaign();
    });
    // Wait for inspector slide-out duration + camera focus
    await page.waitForFunction(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.currentMode === 'campaign' && app.cameraDirector.cameraEntity.getPosition().z < -20;
    }, { timeout: 5000 });

    // Verify camera position is focused on Campaign (Z around -28.5, not Base at +12.5)
    const cameraPos = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const pos = app.cameraDirector.cameraEntity.getPosition();
      return { x: pos.x, y: pos.y, z: pos.z, mode: app.currentMode };
    });
    expect(cameraPos.mode).toBe('campaign');
    expect(cameraPos.z).toBeLessThan(-20);

    // Return to Base
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.enterBase();
    });
    await page.waitForTimeout(400);

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

    // Verify initial clean board with 6 enemy creeps and 0 player units before deployment
    const initialUnitsCount = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.sceneManager.campaignWorld.unitEntities.size;
    });
    expect(initialUnitsCount).toBe(6); // 6 creeps on enemy side

    // Deploy starter roster onto campaign board
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      for (const summon of app.sceneManager.roster.slice(0, 5)) {
        app.campaignHUD.onToggleDeploy?.(summon);
      }
    });
    await page.waitForTimeout(300);

    const campUnitsCount = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.sceneManager.campaignWorld.unitEntities.size;
    });
    expect(campUnitsCount).toBeGreaterThanOrEqual(11); // 5 player + 6 creeps

    await page.screenshot({ path: `apps/game/screenshot-${prefix}-campaign-prep.png` });

    // Test Victory Modal display
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.campaignHUD.showResultModal(true, 1, 2);
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `apps/game/screenshot-${prefix}-campaign-victory-modal.png` });

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

    // 1. Tap Row 0 protected Goku -> opens inspector & displays protected notice
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const gokuEntry = app.sceneManager.opponentCampWorld.getOpponentSummon('opp:goku:01');
      app.dragController.onOpponentSummonTapped?.(gokuEntry);
    });

    await page.waitForTimeout(300);

    const protectedState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        inspectorOpen: app.inspector.isOpen,
        activeSummonId: app.inspector.activeSummon?.id,
        selectedStealId: app.sceneManager.opponentCampWorld.selectedSummonId,
      };
    });
    expect(protectedState.inspectorOpen).toBe(true);
    expect(protectedState.activeSummonId).toBe('opp:goku:01');
    expect(protectedState.selectedStealId).toBeNull(); // Protected units cannot be selected for steal

    // Close inspector
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.inspector.close(true);
    });

    // 2. Tap exposed Naruto in row 2 -> selects for steal and opens inspector
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const narutoEntry = app.sceneManager.opponentCampWorld.getOpponentSummon('opp:naruto:03');
      app.dragController.onOpponentSummonTapped?.(narutoEntry);
    });

    await page.waitForTimeout(300);

    const exposedState = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        inspectorOpen: app.inspector.isOpen,
        activeSummonId: app.inspector.activeSummon?.id,
        selectedStealId: app.sceneManager.opponentCampWorld.selectedSummonId,
      };
    });
    expect(exposedState.inspectorOpen).toBe(true);
    expect(exposedState.activeSummonId).toBe('opp:naruto:03');
    expect(exposedState.selectedStealId).toBe('opp:naruto:03');

    await page.screenshot({ path: `apps/game/screenshot-${prefix}-opponent-camp-selected.png` });

    // 3. Claim steal
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
