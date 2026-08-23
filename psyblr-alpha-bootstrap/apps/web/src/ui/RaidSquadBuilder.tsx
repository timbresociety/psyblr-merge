import { RAID_ROUND_DEFINITIONS } from '@psyblr/game-rules';
import { useGameStore } from '../stores/gameStore';
import { SummonPicker } from './summons/SummonPicker';

export function RaidSquadBuilder() {
  const scene = useGameStore((state) => state.scene);
  const inventory = useGameStore((state) => state.inventory);
  const fields = useGameStore((state) => state.raidFieldPlacements);
  const selectedId = useGameStore((state) => state.selectedRaidSummonInstanceId);
  const error = useGameStore((state) => state.raidError);
  const status = useGameStore((state) => state.raidStatus);
  const results = useGameStore((state) => state.raidRoundResults);
  const replayRound = useGameStore((state) => state.raidReplayRoundIndex);
  const replayUnits = useGameStore((state) => state.raidReplayUnits);
  const result = useGameStore((state) => state.raidResult);
  const select = useGameStore((state) => state.selectRaidSummon);
  const start = useGameStore((state) => state.startRaid);
  const retry = useGameStore((state) => state.retryRaid);
  if (scene !== 'raid') return null;
  const current = RAID_ROUND_DEFINITIONS[results.length];
  if (status === 'replaying' || status === 'resolving') {
    const round = results[replayRound];
    return <section className="raid-replay-hud" data-tutorial-target="raid-arena" aria-live="polite"><div><span>OPPONENT</span><strong>{round ? 'Raid Warden' : 'Locking opponent…'}</strong></div><div className="raid-score-strip">{RAID_ROUND_DEFINITIONS.map((entry, index) => <span key={entry.id} className={index === replayRound ? 'active' : ''}>R{entry.number} {results[index]?.outcome?.toUpperCase() ?? '—'}</span>)}</div><div className="raid-replay-status"><strong>{status === 'resolving' ? 'LOCKING FIELD…' : `ROUND ${replayRound + 1} · ${round?.roundSize ?? 0}v${round?.roundSize ?? 0}`}</strong><small>{Object.keys(replayUnits).length ? 'BATTLE REPLAY 4×' : 'PREPARING BATTLE'}</small></div>{error && <p role="status">{error}</p>}</section>;
  }
  if (!current) return <section className="raid-replay-hud" data-tutorial-target="raid-arena" aria-live="polite"><div><span>RAID RESOLVED</span><strong>{result?.opponent.displayName ?? 'Raid Warden'}</strong></div><div className="raid-score-strip">{RAID_ROUND_DEFINITIONS.map((entry, index) => <span key={entry.id} className={results[index]?.outcome === 'win' ? 'active' : ''}>R{entry.number} {results[index]?.outcome?.toUpperCase() ?? '—'}</span>)}</div><div className="raid-replay-status"><strong>{result?.outcome === 'win' ? 'RAID VICTORY' : `RAID ${result?.outcome.toUpperCase() ?? 'COMPLETE'}`}</strong><small>{result?.outcome === 'win' ? 'OPPONENT CAMP HANDOFF NEXT' : 'REBUILD YOUR NEXT FIELD'}</small></div></section>;
  const field = fields[current.id];
  if (selectedId) return null;
  return <section className="raid-builder" data-tutorial-target="raid-squad-builder" data-testid="raid-squad-builder" aria-label="Raid squad builder"><header><div><span>RAID FIELD · ROUND {current.number}</span><strong>PLACE {current.slotCount} SUMMONS ON THE BLUE FIELD</strong></div><small>Pick a card, then tap a blue cell. Origin and Function bonuses use this field only.</small></header><div className="raid-round-tabs" aria-label="Raid progress">{RAID_ROUND_DEFINITIONS.map((entry, index) => <div key={entry.id} data-active={entry.id === current.id} data-complete={index < results.length}><span>ROUND {entry.number} · {entry.slotCount}v{entry.slotCount}</span><b>{index < results.length ? results[index]!.outcome.toUpperCase() : entry.id === current.id ? `${field.length} / ${entry.slotCount} ON FIELD` : 'LOCKED'}</b></div>)}</div><p className="raid-field-help">TAP A SUMMON TO PLACE · {field.length}/{current.slotCount} READY</p><SummonPicker mode="raid" inventory={inventory} selectedInstanceIds={[]} deployedInstanceIds={field.map((placement) => placement.summonInstanceId)} onSelect={(instanceId) => select(current.id, instanceId)} /><footer>{error && <p role="status">{error}</p>}<button type="button" className="raid-start" data-testid="raid-start" disabled={field.length !== current.slotCount} onClick={start}>START ROUND {current.number}</button>{status === 'error' && <button type="button" className="raid-start" onClick={retry}>RETRY</button>}</footer></section>;
}
