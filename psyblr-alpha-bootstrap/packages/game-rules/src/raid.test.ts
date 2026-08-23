import { describe, expect, it } from 'vitest';
import { createEmptyRaidSquadDraft, finalizeRaidRoundDraft, finalizeRaidSquadDraft, isRaidDraftComplete, RAID_ROUND_DEFINITIONS, selectRaidSummon, validateDefenseSnapshot } from './index';

const inventory = [
  { id: 'goku-a', definitionId: 'goku', tier: 'C' as const }, { id: 'goku-b', definitionId: 'goku', tier: 'F' as const },
  { id: 'naruto', definitionId: 'naruto', tier: 'F' as const }, { id: 'luffy', definitionId: 'luffy', tier: 'F' as const },
  { id: 'eren', definitionId: 'eren', tier: 'F' as const }, { id: 'l', definitionId: 'l', tier: 'F' as const }, { id: 'lelouch', definitionId: 'lelouch', tier: 'F' as const },
];
function select(draft = createEmptyRaidSquadDraft(), round: 'round1' | 'round2' | 'round3', id: string) { return selectRaidSummon(draft, round, id, inventory).draft; }
function completeDraft() { let draft = createEmptyRaidSquadDraft(); for (const id of ['goku-a', 'goku-b']) draft = select(draft, 'round1', id); for (const id of ['goku-a', 'goku-b', 'naruto', 'luffy']) draft = select(draft, 'round2', id); for (const id of ['goku-a', 'goku-b', 'naruto', 'luffy', 'eren', 'l']) draft = select(draft, 'round3', id); return draft; }

describe('raid squad rules', () => {
  it('defines exactly the sequential 2/4/6 round sizes', () => expect(RAID_ROUND_DEFINITIONS.map((round) => round.slotCount)).toEqual([2, 4, 6]));
  it('rejects duplicate instances within round 2 and round 3', () => { const round2 = select(createEmptyRaidSquadDraft(), 'round2', 'goku-a'); expect(selectRaidSummon(round2, 'round2', 'goku-a', inventory).error).toMatch(/already/); const round3 = select(createEmptyRaidSquadDraft(), 'round3', 'goku-a'); expect(selectRaidSummon(round3, 'round3', 'goku-a', inventory).error).toMatch(/already/); });
  it('allows a same instance across rounds and locks only the active field', () => { let draft = select(undefined, 'round1', 'goku-a'); draft = select(draft, 'round1', 'goku-b'); draft = select(draft, 'round2', 'goku-a'); expect(finalizeRaidRoundDraft(draft, inventory, 'round1')).toMatchObject({ ok: true, squad: [{ instanceId: 'goku-a' }, { instanceId: 'goku-b' }] }); });
  it('rejects stale ownership and detects completion deterministically', () => { expect(selectRaidSummon(createEmptyRaidSquadDraft(), 'round1', 'gone', inventory).error).toMatch(/owned/); expect(isRaidDraftComplete(completeDraft())).toBe(true); });
  it('rejects incomplete drafts and preserves a detached serializable completed snapshot', () => { expect(finalizeRaidSquadDraft(createEmptyRaidSquadDraft(), inventory, 'a', 'content')).toMatchObject({ ok: false }); const source = inventory.map((item) => ({ ...item })); const result = finalizeRaidSquadDraft(completeDraft(), source, 'raid-1', 'content'); expect(result.ok).toBe(true); if (!result.ok) return; source[0]!.tier = 'SSS'; source[0]!.definitionId = 'changed'; expect(result.snapshot.round1[0]).toEqual({ instanceId: 'goku-a', definitionId: 'goku', tier: 'C' }); expect(JSON.parse(JSON.stringify(result.snapshot))).toEqual(result.snapshot); expect(result.snapshot.round3.map((item) => item.instanceId)).toEqual(['goku-a', 'goku-b', 'naruto', 'luffy', 'eren', 'l']); });
});

describe('defense snapshot rules', () => {
  const field = (roundId: 'round1' | 'round2' | 'round3', count: number) => ({ roundId, placements: Array.from({ length: count }, (_, index) => ({ summon: { instanceId: inventory[index]!.id, definitionId: inventory[index]!.definitionId, tier: inventory[index]!.tier }, cell: { x: index, z: 7 } })) });
  it('accepts 2/4/6 with cross-round reuse but rejects duplicate cells', () => {
    const candidate = { clientActionId: 'defense-a', contentVersion: 'v', fields: [field('round1', 2), field('round2', 4), field('round3', 6)] };
    expect(validateDefenseSnapshot(candidate, inventory).ok).toBe(true);
    expect(validateDefenseSnapshot({ ...candidate, fields: [{ ...field('round1', 2), placements: [field('round1', 2).placements[0]!, field('round1', 2).placements[0]!] }, field('round2', 4), field('round3', 6)] }, inventory).ok).toBe(false);
  });
});
