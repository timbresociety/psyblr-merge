import { test, expect, type Page } from '@playwright/test';

async function fresh(page: Page) { await page.goto('/'); await page.evaluate(() => localStorage.clear()); await page.reload(); }
async function select(page: Page, id: string) { await page.getByTestId(`summon-card-starter:${id}:001`).click(); }
async function deploy(page: Page, id: string, point: { x: number; y: number }) { await select(page, id); await page.locator('canvas').click({ position: point }); }

test('alpha shell exposes a full-viewport world and locked future navigation', async ({ page }) => {
  await fresh(page);
  await expect(page.getByText('PSYBLR ALPHA', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'SUMMONS', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Camp', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Raid', exact: true })).toBeDisabled();
  await expect(page.locator('canvas')).toBeVisible();
});

test('Campaign onboarding is data driven from any starter through victory', async ({ page }) => {
  test.setTimeout(50_000);
  test.skip(test.info().project.name !== 'desktop-chromium', 'Desktop canvas deployment coordinates');
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await fresh(page);
  await expect(page.getByTestId('tutorial-coach')).toContainText('Choose your first Summon');
  await page.getByRole('button', { name: 'SUMMONS', exact: true }).click();
  await select(page, 'naruto');
  await expect(page.getByTestId('tutorial-coach')).toContainText('Summon identity');
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await page.getByRole('tab', { name: 'STATS' }).click();
  await expect(page.getByTestId('tutorial-coach')).toContainText('Learn their skills');
  await page.getByRole('tab', { name: 'SKILLS' }).click();
  await expect(page.getByText('Clone Snare', { exact: true })).toBeVisible();
  await page.locator('canvas').click({ position: { x: 325, y: 375 } });
  await expect(page.getByTestId('tutorial-coach')).toContainText('Formation synergies');
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  const rest = ['goku', 'luffy', 'eren', 'l', 'lelouch'];
  const points = [{ x: 400, y: 375 }, { x: 475, y: 375 }, { x: 325, y: 450 }, { x: 400, y: 450 }, { x: 475, y: 450 }];
  for (const [index, id] of rest.entries()) await deploy(page, id, points[index]!);
  await expect(page.locator('.synergy-panel div[data-active="true"]')).toHaveCount(6);
  await page.getByTestId('battle-start').click();
  const readySkill = page.locator('[data-testid^="battle-skill-"][data-ready="true"]').first();
  await expect(readySkill).toBeEnabled({ timeout: 8_000 });
  await expect(page.getByTestId('tutorial-coach')).toContainText('Skill ready');
  await readySkill.click();
  await expect(page.getByTestId('tutorial-coach')).toContainText('Auto Cast');
  await page.getByTestId('battle-auto-cast').click();
  await expect(page.getByTestId('battle-result')).toHaveText('VICTORY', { timeout: 18_000 });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('psyblr:tutorial:v1') ?? '{}').currentStepId)).toBe('base_intro');
  await expect(page.getByTestId('base-hud')).toContainText('BATTLE CAMP 6 / 36', { timeout: 4_000 });
  await expect(page.getByTestId('base-hud')).toContainText('ILLUMINATI 0 / 6');
  await expect(page.getByTestId('tutorial-coach')).toContainText('Your Battle Camp');
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await expect(page.getByTestId('tutorial-coach')).toContainText('The Illuminati');
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await expect(page.getByTestId('tutorial-coach')).toContainText('Protect your starters');
  const campCells = await page.evaluate(() => new Promise<Array<{ x: number; y: number; clientX: number; clientY: number }>>((resolve) => {
    window.addEventListener('psyblr:camp-cell-screen-centers', (event) => resolve((event as CustomEvent<Array<{ x: number; y: number; clientX: number; clientY: number }>>).detail), { once: true });
    window.dispatchEvent(new Event('resize'));
  }));
  for (let index = 0; index < 6; index += 1) {
    const source = campCells.find((cell) => cell.x === index && cell.y === 3)!;
    const target = campCells.find((cell) => cell.x === index && cell.y === 0)!;
    await page.mouse.move(source.clientX, source.clientY); await page.mouse.down(); await page.mouse.move(target.clientX, target.clientY); await page.mouse.up();
  }
  await expect(page.getByTestId('base-hud')).toContainText('ILLUMINATI 6 / 6');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('psyblr:tutorial:v1') ?? '{}').currentStepId)).toBe('spawn_open');
  expect(errors).toEqual([]);
});

test('Base onboarding resumes three protected starters after reload', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop-chromium', 'Desktop canvas coordinates');
  const ids = ['goku', 'naruto', 'luffy', 'eren', 'l', 'lelouch'];
  const inventory = ids.map((definitionId) => ({ id: `starter:${definitionId}:001`, definitionId, tier: 'F' }));
  const campPlacements = inventory.map((instance, index) => ({ summonInstanceId: instance.id, cell: { x: index, y: index < 3 ? 0 : 3 } }));
  const checkpoint = { schemaVersion: 2, tutorialVersion: 1, currentStepId: 'base_move_illuminati', completedStepIds: ['campaign_complete', 'base_intro', 'base_camp_explain', 'base_illuminati_explain'], context: {}, inventory, placements: inventory.map((instance, index) => ({ summonInstanceId: instance.id, cell: { x: index, z: 4 } })), campPlacements, battle: null };
  await page.addInitScript((value) => localStorage.setItem('psyblr:tutorial:v1', JSON.stringify(value)), checkpoint);
  await page.goto('/');
  await expect(page.getByText('BASE', { exact: true })).toBeVisible();
  await expect(page.getByTestId('base-hud')).toContainText('ILLUMINATI 3 / 6');
  const campCells = await page.evaluate(() => new Promise<Array<{ x: number; y: number; clientX: number; clientY: number }>>((resolve) => { window.addEventListener('psyblr:camp-cell-screen-centers', (event) => resolve((event as CustomEvent<Array<{ x: number; y: number; clientX: number; clientY: number }>>).detail), { once: true }); window.dispatchEvent(new Event('resize')); }));
  for (let index = 3; index < 6; index += 1) { const source = campCells.find((cell) => cell.x === index && cell.y === 3)!; const target = campCells.find((cell) => cell.x === index && cell.y === 0)!; await page.mouse.move(source.clientX, source.clientY); await page.mouse.down(); await page.mouse.move(target.clientX, target.clientY); await page.mouse.up(); }
  await expect(page.getByTestId('base-hud')).toContainText('ILLUMINATI 6 / 6');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('psyblr:tutorial:v1') ?? '{}').currentStepId)).toBe('spawn_open');
});

test('Base touch fallback selects a summon then a protected cell', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile-landscape', 'Touch fallback coverage');
  const ids = ['goku', 'naruto', 'luffy', 'eren', 'l', 'lelouch'];
  const inventory = ids.map((definitionId) => ({ id: `starter:${definitionId}:001`, definitionId, tier: 'F' }));
  const campPlacements = inventory.map((instance, index) => ({ summonInstanceId: instance.id, cell: { x: index, y: index === 0 ? 0 : 3 } }));
  const checkpoint = { schemaVersion: 2, tutorialVersion: 1, currentStepId: 'base_move_illuminati', completedStepIds: ['campaign_complete', 'base_intro', 'base_camp_explain', 'base_illuminati_explain'], context: {}, inventory, placements: inventory.map((instance, index) => ({ summonInstanceId: instance.id, cell: { x: index, z: 4 } })), campPlacements, battle: null };
  await page.addInitScript((value) => localStorage.setItem('psyblr:tutorial:v1', JSON.stringify(value)), checkpoint); await page.goto('/');
  await expect(page.getByTestId('base-hud')).toContainText('ILLUMINATI 1 / 6');
  const cells = await page.evaluate(() => new Promise<Array<{ x: number; y: number; clientX: number; clientY: number }>>((resolve) => { window.addEventListener('psyblr:camp-cell-screen-centers', (event) => resolve((event as CustomEvent<Array<{ x: number; y: number; clientX: number; clientY: number }>>).detail), { once: true }); window.dispatchEvent(new Event('resize')); }));
  const source = cells.find((cell) => cell.x === 1 && cell.y === 3)!; const target = cells.find((cell) => cell.x === 1 && cell.y === 0)!;
  const canvas = page.locator('canvas'); await canvas.tap({ position: { x: source.clientX, y: source.clientY } }); await canvas.tap({ position: { x: target.clientX, y: target.clientY } });
  await expect(page.getByTestId('base-hud')).toContainText('ILLUMINATI 2 / 6');
});

test('mobile landscape keeps the first inspection flow usable', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile-landscape', 'Mobile landscape coverage');
  await fresh(page); await page.getByRole('button', { name: 'SUMMONS', exact: true }).click(); await select(page, 'goku');
  await page.getByRole('button', { name: 'CONTINUE' }).click(); await page.getByRole('tab', { name: 'STATS' }).click();
  await expect(page.getByText('Attack Speed', { exact: true })).toBeVisible();
});

test.describe('portrait orientation gate', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });
  test('shows only the rotate-device gate', async ({ page }) => { await page.goto('/'); await expect(page.getByRole('dialog', { name: 'Landscape orientation required' })).toBeVisible(); await expect(page.getByRole('button', { name: 'START BATTLE' })).toBeHidden(); });
});
