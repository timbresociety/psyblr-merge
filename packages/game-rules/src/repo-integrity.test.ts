import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { TIERS, CAMP_CAPACITY } from './index';
import { allianceDefinitions, summonDefinitions } from '@psyblr/game-content';

const ROOT_DIR = path.resolve(__dirname, '../../..');

describe('Repository Architecture & Engineering Constitution Integrity Gate', () => {
  it('ensures forbidden legacy directories and packages do not exist', () => {
    const forbiddenPaths = [
      'apps/web',
      'playwright.game.config.ts',
      'PRODUCT_REQUIREMENTS_DOCUMENT_FINAL_FINAL.md',
      'PRD.md',
      'ARCHITECTURE.md',
    ];

    for (const relPath of forbiddenPaths) {
      const fullPath = path.join(ROOT_DIR, relPath);
      expect(fs.existsSync(fullPath), `Forbidden legacy path exists: ${relPath}`).toBe(false);
    }
  });

  it('ensures root contains exactly the canonical documentation trio', () => {
    expect(fs.existsSync(path.join(ROOT_DIR, 'PRODUCT_FINAL.md'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT_DIR, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT_DIR, 'README.md'))).toBe(true);
  });

  it('verifies 10 canonical tiers, 6 alliances, and 36 camp capacity', () => {
    expect(TIERS).toEqual(['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'X']);
    expect(allianceDefinitions.length).toBe(6);
    expect(CAMP_CAPACITY).toBe(36);
  });

  it('ensures every summon has a valid alliance and complete skill kit', () => {
    const allianceIds = new Set(allianceDefinitions.map((a) => a.id));
    for (const summon of summonDefinitions) {
      expect(allianceIds.has(summon.allianceId)).toBe(true);
      expect(summon.description.length).toBeGreaterThan(0);
      expect(summon.quote.length).toBeGreaterThan(0);
      expect(summon.skills.basic).toBeTruthy();
      expect(summon.skills.skill1).toBeTruthy();
      expect(summon.skills.skill2).toBeTruthy();
      expect(summon.skills.ultimate).toBeTruthy();
      expect(summon.passiveId).toBeTruthy();
    }
  });
});
