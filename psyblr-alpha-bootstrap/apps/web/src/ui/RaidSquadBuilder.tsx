import { getSummonDefinition } from '@psyblr/game-content';
import { getRaidRoundDefinition, isRaidDraftComplete, RAID_ROUND_DEFINITIONS } from '@psyblr/game-rules';
import type { RaidRoundId } from '@psyblr/contracts';
import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { SummonPicker } from './summons/SummonPicker';
import { SummonPortrait } from './summons/SummonPortrait';

export function RaidSquadBuilder() {
  const scene = useGameStore((state) => state.scene); const draft = useGameStore((state) => state.raidDraft); const snapshot = useGameStore((state) => state.raidSnapshot); const inventory = useGameStore((state) => state.inventory); const error = useGameStore((state) => state.raidError); const select = useGameStore((state) => state.selectRaidSummon); const remove = useGameStore((state) => state.removeRaidSummon); const start = useGameStore((state) => state.startRaid);
  const [roundId, setRoundId] = useState<RaidRoundId>('round1');
  if (scene !== 'raid') return null;
  const round = getRaidRoundDefinition(roundId); const slots = draft[roundId]; const complete = isRaidDraftComplete(draft); const allSelected = Object.values(draft).flatMap((ids) => ids.filter((id): id is string => id !== null));
  return <section className="raid-builder" data-tutorial-target="raid-squad-builder" data-testid="raid-squad-builder" aria-label="Raid squad builder">
    <header><div><span>RAID STAGING</span><strong>{snapshot ? 'SQUAD LOCKED' : 'ASSEMBLE ATTACK SQUADS'}</strong></div><small>{snapshot ? 'Ready for raid' : 'Reuse across rounds ✓ · One slot per instance within a round'}</small></header>
    <div className="raid-round-tabs" role="tablist" aria-label="Raid rounds">{RAID_ROUND_DEFINITIONS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={roundId === item.id} onClick={() => setRoundId(item.id)}><span>ROUND {item.number} · {item.slotCount}v{item.slotCount}</span><b>{draft[item.id].filter(Boolean).length} / {item.slotCount}</b></button>)}</div>
    <div className="raid-slot-strip" aria-label={`Round ${round.number} slots`}>
      {slots.map((instanceId, index) => { const instance = instanceId ? inventory.find((item) => item.id === instanceId) : null; if (!instance) return <div className="raid-slot empty" key={index}><span>{index + 1}</span><small>EMPTY</small></div>; try { const definition = getSummonDefinition(instance.definitionId); return <button key={index} type="button" className="raid-slot" onClick={() => remove(roundId, index)} disabled={Boolean(snapshot)} aria-label={`Remove ${definition.displayName} from slot ${index + 1}`}><SummonPortrait definition={definition} /><span><strong>{definition.displayName}</strong><b>{instance.tier}</b></span></button>; } catch { return <button key={index} type="button" className="raid-slot" onClick={() => remove(roundId, index)} disabled={Boolean(snapshot)}>Unavailable</button>; } })}
    </div>
    {!snapshot && <SummonPicker mode="raid" inventory={inventory} selectedInstanceIds={slots.filter((id): id is string => id !== null)} onSelect={(instanceId) => select(roundId, instanceId)} selectionLabel={(instanceId) => slots.includes(instanceId) ? 'SELECTED' : allSelected.includes(instanceId) ? 'USED IN ANOTHER ROUND' : undefined} />}
    <footer>{error && <p role="status" aria-live="polite">{error}</p>}<button type="button" className="raid-start" data-testid="raid-start" disabled={Boolean(snapshot) || !complete} onClick={start}>{snapshot ? 'RAID READY' : 'START RAID'}</button></footer>
  </section>;
}
