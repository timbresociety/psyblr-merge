import { useEffect, useState } from 'react';
import { getCombatFunctionDefinition, getOriginDefinition, getSkillDefinition, getSummonDefinition } from '@psyblr/game-content';
import type { SummonDefinition } from '@psyblr/contracts';
import { useGameStore } from '../../stores/gameStore';
import { SummonPortrait } from './SummonPortrait';
import { emitCampaignInteraction } from '../../game/interactionEvents';
import { tutorialAllows } from '../../stores/gameStore';

type DetailTab = 'overview' | 'stats' | 'skills';

const STAT_ROWS: readonly { label: string; value: (stats: SummonDefinition['stats']) => number; format: (value: number) => string }[] = [
  { label: 'HP', value: (stats) => stats.hp, format: (value) => value.toLocaleString() },
  { label: 'ATK', value: (stats) => stats.atk, format: (value) => value.toLocaleString() },
  { label: 'DEF', value: (stats) => stats.def, format: (value) => value.toLocaleString() },
  { label: 'Attack Speed', value: (stats) => stats.attacksPerSecond, format: (value) => `${value.toFixed(2)} APS` },
  { label: 'Range', value: (stats) => stats.range, format: (value) => `${value} tiles` },
  { label: 'Move Speed', value: (stats) => stats.moveSpeed, format: (value) => value.toFixed(1) },
] as const;

export function SummonDetailsDrawer() {
  const [tab, setTab] = useState<DetailTab>('overview');
  const selectedSummonInstanceId = useGameStore((state) => state.selectedSummonInstanceId);
  const inventory = useGameStore((state) => state.inventory);
  const placements = useGameStore((state) => state.placements);
  const open = useGameStore((state) => state.summonDetailsOpen);
  const close = useGameStore((state) => state.closeSummonDetails);
  const beginPlacement = useGameStore((state) => state.beginPlacement);
  const recallSummon = useGameStore((state) => state.recallSummon);
  useEffect(() => { setTab('overview'); }, [selectedSummonInstanceId]);

  const instance = inventory.find((entry) => entry.id === selectedSummonInstanceId);
  if (!open || !instance) return null;

  try {
    const definition = getSummonDefinition(instance.definitionId);
    const origin = getOriginDefinition(definition.originId);
    const combatFunction = getCombatFunctionDefinition(definition.combatFunctionId);
    const basic = getSkillDefinition(definition.skills.basic);
    const skill1 = getSkillDefinition(definition.skills.skill1);
    const placement = placements.find((entry) => entry.summonInstanceId === instance.id);

    return <aside className="summon-details" id="summon-detail-panel" data-tutorial-target="summon-detail-panel" aria-label={`${definition.displayName} details`} data-testid="summon-detail-panel">
      <header className="summon-detail-header" data-tutorial-target="summon-identity-header">
        <SummonPortrait definition={definition} size="drawer" />
        <div><span className="tier-badge">F TIER</span><h2>{definition.displayName}</h2><p>{origin.name} · {combatFunction.name}</p></div>
        <button type="button" className="icon-button" onClick={close} aria-label="Close summon details">×</button>
      </header>
      <div className="detail-chips"><span>{origin.name}</span><span>{combatFunction.name}</span></div>
      <div className="detail-tabs" role="tablist" aria-label="Summon details tabs">
        {(['overview', 'stats', 'skills'] as const).map((item) => <button
          key={item}
          type="button"
          role="tab"
          aria-selected={tab === item}
          data-tutorial-target={item === 'stats' ? 'summon-stats-tab' : item === 'skills' ? 'summon-skills-tab' : 'summon-overview-tab'}
          onClick={() => {
            if (item === 'stats' && !tutorialAllows('VIEW_STATS')) return;
            if (item === 'skills' && !tutorialAllows('VIEW_SKILLS')) return;
            setTab(item);
            if (item === 'stats') emitCampaignInteraction({ type: 'STATS_VIEWED', summonInstanceId: instance.id });
            if (item === 'skills') emitCampaignInteraction({ type: 'SKILLS_VIEWED', summonInstanceId: instance.id });
          }}
        >{item.toUpperCase()}</button>)}
      </div>
      <div className="detail-body">
        {tab === 'overview' && <div className="detail-overview"><p><strong>{origin.name}</strong> origin · <strong>{combatFunction.name}</strong> combat function</p><p>HP {definition.stats.hp.toLocaleString()} · ATK {definition.stats.atk} · {definition.stats.range} tile range</p></div>}
        {tab === 'stats' && <dl className="stat-list">{STAT_ROWS.map(({ label, value, format }) => <div key={label}><dt>{label}</dt><dd>{format(value(definition.stats))}</dd></div>)}</dl>}
        {tab === 'skills' && <div className="skill-list">
          <article><span>BASIC ATTACK</span><strong>{basic.name}</strong><p>{basic.summary}</p></article>
          <article><span>SKILL 1</span><strong>{skill1.name}</strong><p>{skill1.summary}</p></article>
          <article className="skill-locked"><span>SKILL 2</span><strong>LOCKED</strong><p>Unlocks with a future tier upgrade.</p></article>
          <article className="skill-locked"><span>ULTIMATE</span><strong>LOCKED</strong><p>Unlocks with a future tier upgrade.</p></article>
        </div>}
      </div>
      <footer className="summon-detail-actions">
        {placement ? <>
          <span>DEPLOYED · X {placement.cell.x + 1}, Z {placement.cell.z + 1}</span>
          <button type="button" onClick={() => beginPlacement(instance.id)}>REPOSITION</button>
          <button type="button" className="secondary-button" onClick={() => recallSummon(instance.id)}>RECALL</button>
        </> : <button type="button" data-tutorial-target="place-summon-button" onClick={() => beginPlacement(instance.id)}>PLACE SUMMON</button>}
      </footer>
    </aside>;
  } catch {
    return <aside className="summon-details" aria-label="Unavailable summon details">Unavailable summon content.</aside>;
  }
}
