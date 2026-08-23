type AffinityKind = 'origin' | 'combatFunction';

const ORIGIN_ICONS: Record<string, string> = { ascendant: '✦', rebel: '⚑', mastermind: '◈' };
const FUNCTION_ICONS: Record<string, string> = { striker: '⚔', controller: '◌', disruptor: '✹' };

export function affinityIcon(kind: AffinityKind, id: string) {
  return (kind === 'origin' ? ORIGIN_ICONS : FUNCTION_ICONS)[id] ?? '•';
}

/** Shared affinity language for summon loadouts and formation synergies. */
export function SummonAffinities({ originId, combatFunctionId }: { originId: string; combatFunctionId: string }) {
  return <span className="summon-affinities" aria-label={`Origin ${originId}; Combat Function ${combatFunctionId}`}>
    <i className="affinity-icon origin" title={`Origin: ${originId}`}>{affinityIcon('origin', originId)}</i>
    <i className="affinity-icon function" title={`Combat Function: ${combatFunctionId}`}>{affinityIcon('combatFunction', combatFunctionId)}</i>
  </span>;
}
