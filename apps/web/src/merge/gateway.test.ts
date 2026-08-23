import { describe, expect, it } from 'vitest';
import type { CampPlacement, MergeRuntimeSnapshot, SummonInstance } from '@psyblr/contracts';
import { createTutorialMergeGateway } from './gateway';

function stateFor(inventory: SummonInstance[], campPlacements: CampPlacement[]) {
  return { merge: { appliedActionIds: [] } as MergeRuntimeSnapshot, inventory, campPlacements };
}
const gokuF = (id: string): SummonInstance => ({ id, definitionId: 'goku', tier: 'F' });

describe('tutorial merge authority', () => {
  it('consumes the source while retaining the target id and protected target cell', async () => {
    const state = stateFor([gokuF('source'), gokuF('target')], [{ summonInstanceId: 'source', cell: { x: 1, y: 1 } }, { summonInstanceId: 'target', cell: { x: 2, y: 0 } }]);
    const gateway = createTutorialMergeGateway(() => state);
    const result = await gateway.mergeSummons({ clientActionId: 'merge-1', sourceSummonInstanceId: 'source', targetSummonInstanceId: 'target' });
    expect(result).toMatchObject({ consumedSourceInstanceId: 'source', upgradedTarget: { id: 'target', tier: 'E' }, targetPlacement: { cell: { x: 2, y: 0 } } });
  });
  it('rejects incompatible, stale, and max tier requests', async () => {
    const incompatible = stateFor([gokuF('a'), { id: 'b', definitionId: 'naruto', tier: 'F' }], [{ summonInstanceId: 'a', cell: { x: 0, y: 1 } }, { summonInstanceId: 'b', cell: { x: 1, y: 1 } }]);
    await expect(createTutorialMergeGateway(() => incompatible).mergeSummons({ clientActionId: 'bad', sourceSummonInstanceId: 'a', targetSummonInstanceId: 'b' })).rejects.toThrow('Needs same Summon and tier');
    await expect(createTutorialMergeGateway(() => stateFor([gokuF('a')], [{ summonInstanceId: 'a', cell: { x: 0, y: 1 } }])).mergeSummons({ clientActionId: 'stale', sourceSummonInstanceId: 'a', targetSummonInstanceId: 'gone' })).rejects.toThrow('no longer');
    const maxed = stateFor([{ id: 'a', definitionId: 'goku', tier: 'SSS' }, { id: 'b', definitionId: 'goku', tier: 'SSS' }], [{ summonInstanceId: 'a', cell: { x: 0, y: 1 } }, { summonInstanceId: 'b', cell: { x: 1, y: 1 } }]);
    await expect(createTutorialMergeGateway(() => maxed).mergeSummons({ clientActionId: 'max', sourceSummonInstanceId: 'a', targetSummonInstanceId: 'b' })).rejects.toThrow('Max tier reached');
  });
  it('caches the same action and allows at most one concurrent consumption attempt', async () => {
    const state = stateFor([gokuF('source'), gokuF('target')], [{ summonInstanceId: 'source', cell: { x: 0, y: 1 } }, { summonInstanceId: 'target', cell: { x: 1, y: 1 } }]);
    const gateway = createTutorialMergeGateway(() => state);
    const request = { clientActionId: 'same', sourceSummonInstanceId: 'source', targetSummonInstanceId: 'target' };
    const first = await gateway.mergeSummons(request); expect(await gateway.mergeSummons(request)).toEqual(first);
    const other = gateway.mergeSummons({ ...request, clientActionId: 'other' });
    await expect(other).rejects.toThrow('already merging');
  });
});
