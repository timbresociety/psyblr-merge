import { test, expect } from '@playwright/test';

test.describe('Guided Onboarding Full Flow (Campaign -> Camp & Illuminati -> Dealer 100 Medals -> Spawn -> Merge to Tier C -> Raid -> Opponent Steal)', () => {
  test('progresses smoothly through all 7 onboarding steps to completion', async ({ page }) => {
    test.setTimeout(60000);
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('ERR_CONNECTION_REFUSED')) {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    await page.goto('/?reset=true', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#game-canvas');

    await page.waitForFunction(() => (window as any).__PSYBLR_GAME_APP__ !== undefined, {
      timeout: 8000,
    });

    expect(consoleErrors).toEqual([]);

    // Step 1: CAMPAIGN
    const initialPhase = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return { phase: app.onboarding.phase, mode: app.currentMode };
    });
    expect(initialPhase.phase).toBe('CAMPAIGN');
    expect(initialPhase.mode).toBe('campaign');

    // Simulate winning Campaign Level 1
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.onboarding.advanceTo('BATTLE_CAMP');
      app.enterBase();
    });
    await page.waitForTimeout(200);

    // Step 2: BATTLE_CAMP
    const step2Phase = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return { phase: app.onboarding.phase, mode: app.currentMode };
    });
    expect(step2Phase.phase).toBe('BATTLE_CAMP');
    expect(step2Phase.mode).toBe('base');

    // Continue to Step 3: ILLUMINATI
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.onboarding.handleContinueAction();
    });
    await page.waitForTimeout(200);

    const step3Phase = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.onboarding.phase;
    });
    expect(step3Phase).toBe('ILLUMINATI');

    // Move summon to Row 0 -> triggers Step 4: DEALER
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      const goku = app.sceneManager.getSummonById('starter:goku:001');
      if (goku) {
        app.sceneManager.moveSummon(goku.instance.id, { x: 0, y: 0 });
      }
    });
    await page.waitForTimeout(200);

    const step4Phase = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.onboarding.phase;
    });
    expect(step4Phase).toBe('DEALER');

    // Step 4: Collect 100 Dealer Medals -> triggers Step 5: SPAWN_MACHINE
    await page.evaluate(async () => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.enterDealer();
      await app.dealerHUD.onClaimBalls?.();
    });
    await page.waitForTimeout(200);

    const step5State = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return {
        phase: app.onboarding.phase,
        medals: app.spawnAuthority.getMedalsRemaining(),
      };
    });
    expect(step5State.phase).toBe('SPAWN_MACHINE');
    expect(step5State.medals).toBeGreaterThanOrEqual(100);

    // Step 5: Spawn hero -> triggers Step 6: MERGE_HEROES
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.events.emit('spawnLanded', {
        summonId: 'spawn:test:001',
        definitionId: 'goku',
        cell: { x: 1, y: 1 },
      });
    });
    await page.waitForTimeout(200);

    const step6Phase = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.onboarding.phase;
    });
    expect(step6Phase).toBe('MERGE_HEROES');

    // Step 6: Merge heroes until reaching Tier C
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      // Upgrade a summon to Tier C
      const goku = app.sceneManager.getSummonById('starter:goku:001');
      if (goku) {
        goku.upgradeTier('C');
      }
      app.events.emit('mergeCompleted', {
        sourceId: 'src',
        targetId: 'starter:goku:001',
        upgradedTier: 'C',
        worldPosition: [0, 0, 0],
      });
    });
    await page.waitForFunction(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.onboarding.phase === 'RAID_BATTLE';
    }, { timeout: 5000 });

    const step7Phase = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.onboarding.phase;
    });
    expect(step7Phase).toBe('RAID_BATTLE');

    // Step 7: Win Raid Battle -> triggers OPPONENT_CAMP_STEAL
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.events.emit('raidWon', {});
    });
    await page.waitForTimeout(200);

    const stealPhase = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.onboarding.phase;
    });
    expect(stealPhase).toBe('OPPONENT_CAMP_STEAL');

    // Complete Steal -> triggers COMPLETED
    await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      app.events.emit('stealCompleted', { summonId: 'stolen:001' });
    });
    await page.waitForTimeout(200);

    const completedPhase = await page.evaluate(() => {
      const app = (window as any).__PSYBLR_GAME_APP__;
      return app.onboarding.phase;
    });
    expect(completedPhase).toBe('COMPLETED');
  });
});
