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
  await expect(page.getByTestId('tutorial-coach')).toContainText('Summon overview');
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  await page.getByRole('tab', { name: 'STATS' }).click();
  await expect(page.getByTestId('tutorial-coach')).toContainText('Learn their skills');
  await page.getByRole('tab', { name: 'SKILLS' }).click();
  await expect(page.getByText('Clone Snare', { exact: true })).toBeVisible();
  const [coachBox, trayBox] = await Promise.all([page.getByTestId('tutorial-coach').evaluate((element) => element.getBoundingClientRect().toJSON()), page.locator('#summon-tray').evaluate((element) => element.getBoundingClientRect().toJSON())]);
  expect(coachBox.bottom).toBeLessThanOrEqual(trayBox.top);
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

test('Spawn machine opens from the projected world object and releases an authoritative tutorial ball', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop-chromium', 'Desktop projected world target coverage');
  const ids = ['goku', 'naruto', 'luffy', 'eren', 'l', 'lelouch']; const inventory = ids.map((definitionId) => ({ id: `starter:${definitionId}:001`, definitionId, tier: 'F' }));
  const checkpoint = { schemaVersion: 2, tutorialVersion: 1, currentStepId: 'spawn_open', completedStepIds: ['campaign_complete', 'base_intro', 'base_camp_explain', 'base_illuminati_explain', 'base_move_illuminati'], context: { firstSummonInstanceId: 'starter:goku:001' }, inventory, placements: [], campPlacements: inventory.map((instance, x) => ({ summonInstanceId: instance.id, cell: { x, y: 0 } })), battle: null };
  await page.addInitScript((value) => localStorage.setItem('psyblr:tutorial:v1', JSON.stringify(value)), checkpoint); await page.goto('/');
  const target = await page.evaluate(() => new Promise<{ left: number; top: number; width: number; height: number }>((resolve) => { window.addEventListener('psyblr:world-target-rects', (event) => resolve((event as CustomEvent<Record<string, { left: number; top: number; width: number; height: number }>>).detail['spawn-machine']!), { once: true }); window.dispatchEvent(new Event('resize')); }));
  await page.mouse.click(target.left + target.width / 2, target.top + target.height / 2);
  await expect(page.getByTestId('spawn-overlay')).toBeVisible(); await expect(page.getByTestId('spawn-slot-0')).toContainText('Goku'); await expect(page.getByTestId('spawn-slot-5')).toContainText('Lelouch');
  await page.getByTestId('drop-ball').click(); await expect(page.getByTestId('base-hud')).toContainText('BATTLE CAMP 7 / 36'); await expect(page.getByTestId('tutorial-coach')).toContainText('Keep them coming');
});

function mergeCheckpoint(step: 'merge_first' | 'merge_to_c' = 'merge_first') {
  const starters = ['goku', 'naruto', 'luffy', 'eren', 'l', 'lelouch'].map((definitionId) => ({ id: `starter:${definitionId}:001`, definitionId, tier: 'F' }));
  const gokuCopies = Array.from({ length: 7 }, (_, index) => ({ id: `spawn:goku:${index}`, definitionId: 'goku', tier: 'F' }));
  const fillers = Array.from({ length: 23 }, (_, index) => ({ id: `spawn:filler:${index}`, definitionId: index % 2 ? 'naruto' : 'luffy', tier: 'F' }));
  const inventory = [...starters, ...gokuCopies, ...fillers];
  const campPlacements = inventory.map((instance, index) => ({ summonInstanceId: instance.id, cell: index < 6 ? { x: index, y: 0 } : { x: (index - 6) % 6, y: Math.floor((index - 6) / 6) + 1 } }));
  return { schemaVersion: 4, tutorialVersion: 1, currentStepId: step, completedStepIds: ['campaign_complete', 'base_intro', 'base_camp_explain', 'base_illuminati_explain', 'base_move_illuminati', 'spawn_open', 'spawn_drop_one', 'spawn_long_press'], context: { firstSummonInstanceId: 'starter:goku:001' }, inventory, placements: [], campPlacements, spawn: { balls: 70, ballCapacity: 100, dailyPool: [], blobProgress: {}, tutorialDropIndex: 30, appliedActionIds: [] }, merge: { appliedActionIds: [] }, battle: null };
}

test('desktop camp merge chain reaches C with the protected target surviving', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop-chromium', 'Desktop canvas drag coverage');
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((value) => localStorage.setItem('psyblr:tutorial:v1', JSON.stringify(value)), mergeCheckpoint()); await page.goto('/');
  const cells = await page.evaluate(() => new Promise<Array<{ x: number; y: number; clientX: number; clientY: number }>>((resolve) => { window.addEventListener('psyblr:camp-cell-screen-centers', (event) => resolve((event as CustomEvent<Array<{ x: number; y: number; clientX: number; clientY: number }>>).detail), { once: true }); window.dispatchEvent(new Event('resize')); }));
  const cell = (x: number, y: number) => cells.find((entry) => entry.x === x && entry.y === y)!;
  const merge = async (source: [number, number], target: [number, number]) => { const from = cell(...source); const to = cell(...target); await page.mouse.move(from.clientX, from.clientY); await page.mouse.down(); await page.mouse.move(to.clientX, to.clientY); await page.mouse.up(); await page.waitForTimeout(25); };
  await merge([1, 1], [0, 0]);
  await expect(page.getByTestId('base-hud')).toContainText('BATTLE CAMP 35 / 36'); await expect(page.getByTestId('tier-progress')).toContainText('Goku · E');
  await merge([0, 1], [2, 1]); await merge([3, 1], [4, 1]); await merge([5, 1], [0, 2]);
  await merge([2, 1], [0, 0]); await merge([4, 1], [0, 2]); await merge([0, 2], [0, 0]);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('psyblr:tutorial:v1') ?? '{}').currentStepId)).toBe('raid_gate_open');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('psyblr:tutorial:v1') ?? '{}').inventory.find((entry: { id: string }) => entry.id === 'starter:goku:001')?.tier)).toBe('C');
  expect(errors).toEqual([]);
});

test('mobile landscape merges selected source into a compatible target', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile-landscape', 'Touch selection coverage');
  await page.addInitScript((value) => localStorage.setItem('psyblr:tutorial:v1', JSON.stringify(value)), mergeCheckpoint()); await page.goto('/');
  const cells = await page.evaluate(() => new Promise<Array<{ x: number; y: number; clientX: number; clientY: number }>>((resolve) => { window.addEventListener('psyblr:camp-cell-screen-centers', (event) => resolve((event as CustomEvent<Array<{ x: number; y: number; clientX: number; clientY: number }>>).detail), { once: true }); window.dispatchEvent(new Event('resize')); }));
  const source = cells.find((cell) => cell.x === 1 && cell.y === 1)!; const target = cells.find((cell) => cell.x === 0 && cell.y === 0)!; const canvas = page.locator('canvas');
  await canvas.tap({ position: { x: source.clientX, y: source.clientY } }); await canvas.tap({ position: { x: target.clientX, y: target.clientY } });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('psyblr:tutorial:v1') ?? '{}').inventory.find((entry: { id: string }) => entry.id === 'starter:goku:001')?.tier)).toBe('E');
});

test('mobile landscape keeps the first inspection flow usable', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile-landscape', 'Mobile landscape coverage');
  await fresh(page); await page.getByRole('button', { name: 'SUMMONS', exact: true }).click(); await select(page, 'goku');
  await page.getByRole('button', { name: 'CONTINUE' }).click(); await page.getByRole('tab', { name: 'STATS' }).click();
  await expect(page.getByText('Attack Speed', { exact: true })).toBeVisible();
});

function raidCheckpoint(step: 'raid_gate_open' | 'raid_open' = 'raid_gate_open') {
  const ids = ['goku', 'naruto', 'luffy', 'eren', 'l', 'lelouch']; const inventory = ids.map((definitionId) => ({ id: `starter:${definitionId}:001`, definitionId, tier: definitionId === 'goku' ? 'C' : 'F' }));
  return { schemaVersion: 7, tutorialVersion: 1, currentStepId: step, completedStepIds: ['campaign_complete', 'base_intro', 'base_camp_explain', 'base_illuminati_explain', 'base_move_illuminati', 'spawn_open', 'spawn_drop_one', 'spawn_long_press', 'merge_first', 'merge_to_c'], context: {}, inventory, placements: [], campPlacements: [], spawn: { balls: 70, ballCapacity: 100, dailyPool: [], blobProgress: {}, tutorialDropIndex: 30, appliedActionIds: [] }, merge: { appliedActionIds: [] }, raidDraft: { round1: [null, null], round2: [null, null, null, null], round3: [null, null, null, null, null, null] }, raidSnapshot: null, raidResult: null, battle: null };
}
async function enterRaidFromGate(page: Page) {
  const target = await page.evaluate(() => new Promise<{ left: number; top: number; width: number; height: number }>((resolve) => { window.addEventListener('psyblr:world-target-rects', (event) => resolve((event as CustomEvent<Record<string, { left: number; top: number; width: number; height: number }>>).detail['raid-gate']!), { once: true }); window.dispatchEvent(new Event('resize')); }));
  await page.mouse.click(target.left + target.width / 2, target.top + target.height / 2); await expect(page.getByText('RAID', { exact: true })).toBeVisible(); await expect(page.getByTestId('raid-squad-builder')).toBeVisible({ timeout: 4_000 });
}
async function placeRaidSummon(page: Page, id: string, cell: { x: number; z: number }) {
  await page.getByTestId(`summon-card-starter:${id}:001`).click(); await expect(page.getByTestId('raid-squad-builder')).toBeHidden();
  const centers = await page.evaluate(() => new Promise<Array<{ x: number; z: number; clientX: number; clientY: number }>>((resolve) => { window.addEventListener('psyblr:raid-cell-screen-centers', (event) => resolve((event as CustomEvent<Array<{ x: number; z: number; clientX: number; clientY: number }>>).detail), { once: true }); window.dispatchEvent(new Event('resize')); }));
  const point = centers.find((entry) => entry.x === cell.x && entry.z === cell.z)!;
  await page.locator('canvas').click({ position: { x: point.clientX, y: point.clientY } }); await expect(page.getByTestId('raid-squad-builder')).toBeVisible();
}
test('Raid Gate resolves sequential 2/4/6 fields and locks an immutable raid snapshot', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop-chromium', 'Desktop projected world target coverage'); const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((value) => localStorage.setItem('psyblr:tutorial:v1', JSON.stringify(value)), raidCheckpoint()); await page.goto('/'); await enterRaidFromGate(page);
  const builder = page.getByTestId('raid-squad-builder'); await expect(page.getByTestId('raid-start')).toBeDisabled();
  for (const [index, id] of ['goku', 'naruto'].entries()) await placeRaidSummon(page, id, { x: index, z: 4 }); await page.getByTestId('raid-start').click();
  await expect(builder).toContainText('ROUND 2 · 4v4', { timeout: 12_000 });
  for (const [index, id] of ['goku', 'naruto', 'luffy', 'eren'].entries()) await placeRaidSummon(page, id, { x: index, z: 4 }); await page.getByTestId('raid-start').click();
  await expect(builder).toContainText('ROUND 3 · 6v6', { timeout: 12_000 });
  for (const [index, id] of ['goku', 'naruto', 'luffy', 'eren', 'l', 'lelouch'].entries()) await placeRaidSummon(page, id, { x: index, z: 4 }); await page.getByTestId('raid-start').click();
  await expect(page.getByTestId('tutorial-coach')).toContainText('You’re ready', { timeout: 12_000 });
  const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('psyblr:tutorial:v1') ?? '{}')); expect(checkpoint.raidSnapshot.round1).toHaveLength(2); expect(checkpoint.raidSnapshot.round2).toHaveLength(4); expect(checkpoint.raidSnapshot.round3).toHaveLength(6); expect(checkpoint.raidSnapshot.round1[0].instanceId).toBe(checkpoint.raidSnapshot.round2[0].instanceId); expect(new Set(checkpoint.raidSnapshot.round3.map((entry: { instanceId: string }) => entry.instanceId)).size).toBe(6); expect(errors).toEqual([]);
});
test('mobile landscape raid builder selects a field placement without horizontal page overflow', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile-landscape', 'Mobile landscape coverage'); const checkpoint = raidCheckpoint('raid_open');
  await page.addInitScript((value) => localStorage.setItem('psyblr:tutorial:v1', JSON.stringify(value)), checkpoint); await page.goto('/'); const builder = page.getByTestId('raid-squad-builder'); await expect(builder).toBeVisible(); await expect(builder).toContainText('0 / 2'); await page.getByTestId('summon-card-starter:naruto:001').tap(); await expect(builder).toBeHidden(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test.describe('portrait orientation gate', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });
  test('shows only the rotate-device gate', async ({ page }) => { await page.goto('/'); await expect(page.getByRole('dialog', { name: 'Landscape orientation required' })).toBeVisible(); await expect(page.getByRole('button', { name: 'START BATTLE' })).toBeHidden(); });
});
