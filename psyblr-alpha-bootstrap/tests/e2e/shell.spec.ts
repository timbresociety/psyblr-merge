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
  expect(errors).toEqual([]);
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
