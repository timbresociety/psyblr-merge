import { getCombatFunctionDefinition, getOriginDefinition, getSummonDefinition } from '@psyblr/game-content';
import type { SummonInstance } from '@psyblr/contracts';
import { SummonCard } from './SummonCard';

type SummonPickerProps = {
  mode: 'campaign' | 'raid'; inventory: readonly SummonInstance[]; selectedInstanceIds: readonly string[];
  deployedInstanceIds?: readonly string[]; onSelect: (instanceId: string) => void; onDragStart?: (instanceId: string) => void; onDragCancel?: () => void;
  selectionLabel?: (instanceId: string) => string | undefined;
};

const tierRank: Record<SummonInstance['tier'], number> = { SSS: 8, SS: 7, S: 6, A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };

/** Shared inventory card row. Modes change behavior, never the card/content presentation. */
export function SummonPicker({ mode, inventory, selectedInstanceIds, deployedInstanceIds = [], onSelect, onDragStart, onDragCancel, selectionLabel }: SummonPickerProps) {
  const instances = mode === 'raid' ? [...inventory].sort((a, b) => tierRank[b.tier] - tierRank[a.tier] || a.definitionId.localeCompare(b.definitionId) || a.id.localeCompare(b.id)) : inventory;
  if (instances.length === 0) return <p className="picker-empty">No owned Summons available.</p>;
  return <div className="summon-card-row" aria-label={`${mode === 'raid' ? 'Raid' : 'Campaign'} Summons`}>
    {instances.map((instance) => {
      try {
        const definition = getSummonDefinition(instance.definitionId);
        return <SummonCard key={instance.id} instance={instance} definition={definition} origin={getOriginDefinition(definition.originId)} combatFunction={getCombatFunctionDefinition(definition.combatFunctionId)} deployed={deployedInstanceIds.includes(instance.id)} selected={selectedInstanceIds.includes(instance.id)} onSelect={onSelect} onDragStart={mode === 'campaign' ? onDragStart : undefined} onDragCancel={onDragCancel} selectionLabel={selectionLabel?.(instance.id)} />;
      } catch { return <div className="summon-card summon-card-unavailable" key={instance.id}>Unavailable summon content</div>; }
    })}
  </div>;
}
