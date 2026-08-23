import { test, expect } from '@playwright/test';

test('alpha shell exposes a full-viewport world, Summons entry point, and debug sampling', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/');
  await expect(page.getByText('PSYBLR ALPHA', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'SUMMONS', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'START BATTLE' })).toBeDisabled();
  await expect(page.locator('canvas')).toBeVisible();

  const canvasBox = await page.locator('canvas').boundingBox();
  expect(canvasBox?.width).toBeGreaterThanOrEqual(844);
  expect(canvasBox?.height).toBeGreaterThanOrEqual(390);

  await page.keyboard.press('Backquote');
  await expect(page.getByTestId('debug-panel')).toBeVisible();
  await expect(page.getByTestId('debug-fps')).not.toHaveText('sampling…', { timeout: 2_000 });
  await page.screenshot({ path: testInfo.outputPath('landscape-shell.png') });
  expect(consoleErrors).toEqual([]);
});

test('desktop player can inspect and tap-place a starter Summon', async ({ page }, testInfo) => {
  test.skip(test.info().project.name !== 'desktop-chromium', 'Desktop-specific canvas placement coordinates');

  await page.goto('/');
  await page.getByRole('button', { name: 'SUMMONS', exact: true }).click();
  await expect(page.getByLabel('Summon inventory')).toBeVisible();
  await page.getByTestId('summon-card-starter:goku:001').click();
  await expect(page.getByTestId('summon-detail-panel')).toBeVisible();

  await page.getByRole('tab', { name: 'STATS' }).click();
  await expect(page.getByText('Attack Speed', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'SKILLS' }).click();
  await expect(page.getByText('Ki Strike', { exact: true })).toBeVisible();
  await expect(page.getByText('Ki Burst', { exact: true })).toBeVisible();
  await expect(page.getByText('SKILL 2', { exact: true })).toBeVisible();
  await expect(page.getByText('ULTIMATE', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('summon-inspection.png') });

  await page.locator('canvas').click({ position: { x: 325, y: 375 } });
  await expect(page.getByText('1 / 6 DEPLOYED', { exact: true })).toBeVisible();
  await expect(page.getByTestId('summon-card-starter:goku:001')).toContainText('DEPLOYED');
});

test('desktop player can drag a starter card to the battlefield', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop-chromium', 'Desktop-specific canvas placement coordinates');

  await page.goto('/');
  await page.getByRole('button', { name: 'SUMMONS', exact: true }).click();
  const card = page.getByTestId('summon-card-starter:naruto:001');
  const cardBox = await card.boundingBox();
  if (!cardBox) throw new Error('Naruto summon card was not rendered');

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(cardBox.x + cardBox.width / 2 + 16, cardBox.y + cardBox.height / 2, { steps: 2 });
  await page.mouse.move(450, 375, { steps: 8 });
  await page.mouse.up();

  await expect(page.getByText('1 / 6 DEPLOYED', { exact: true })).toBeVisible();
  await expect(card).toContainText('DEPLOYED');
});

test('mobile landscape tray and select placement stay usable', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile-landscape', 'Mobile landscape coverage');

  await page.goto('/');
  await page.getByRole('button', { name: 'SUMMONS', exact: true }).click();
  const tray = page.getByLabel('Summon inventory');
  await expect(tray).toBeVisible();
  const trayBox = await tray.boundingBox();
  expect(trayBox?.height).toBeLessThan(200);

  await page.getByTestId('summon-card-starter:goku:001').click();
  const drawer = page.getByTestId('summon-detail-panel');
  await expect(drawer).toBeVisible();
  const drawerBox = await drawer.boundingBox();
  expect(drawerBox?.width).toBeLessThan(420);

  await page.locator('canvas').click({ position: { x: 295, y: 205 } });
  await expect(page.getByText('1 / 6 DEPLOYED', { exact: true })).toBeVisible();
});

test.describe('portrait orientation gate', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  test('shows only the rotate-device gate', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('dialog', { name: 'Landscape orientation required' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'START BATTLE' })).toBeHidden();
    await expect(page.locator('canvas')).toBeHidden();
  });
});
