import { getCampCounters, tutorialAllows, useGameStore } from '../stores/gameStore';
import { getSkillDefinition, getSummonDefinition } from '@psyblr/game-content';
import { requestManualSkillCast, setBattleAutoCast, startCampaignBattle } from '../game/battleSession';
import { retryTutorialBattle } from '../tutorial/controller';

export function GameHud() {
  const scene = useGameStore((state) => state.scene);
  const setScene = useGameStore((state) => state.setScene);
  const balls = useGameStore((state) => state.balls);
  const ballCapacity = useGameStore((state) => state.ballCapacity);
  const placements = useGameStore((state) => state.placements);
  const battlePhase = useGameStore((state) => state.battlePhase);
  const battleSnapshot = useGameStore((state) => state.battleSnapshot);
  const readySkillActorIds = useGameStore((state) => state.readySkillActorIds);
  const deadUnitIds = useGameStore((state) => state.deadUnitIds);
  const autoCast = useGameStore((state) => state.autoCast);
  const openSummonTray = useGameStore((state) => state.openSummonTray);
  const teamReady = placements.length === 6;
  const tutorialActive = useGameStore((state) => state.tutorialStepId !== null);
  const campPlacements = useGameStore((state) => state.campPlacements);
  const selectedCampSummonInstanceId = useGameStore((state) => state.selectedCampSummonInstanceId);
  const cancelCampInteraction = useGameStore((state) => state.cancelCampInteraction);
  const inventory = useGameStore((state) => state.inventory);
  const tutorialStepId = useGameStore((state) => state.tutorialStepId);
  const camp = getCampCounters(campPlacements);
  const selectedCampSummon = inventory.find((entry) => entry.id === selectedCampSummonInstanceId);

  return <section className="hud" aria-label="Game controls">
    <div className="hud-top">
      <div className="brand">PSYBLR <span>ALPHA</span></div>
      <div className="scene-pill">{scene.toUpperCase()}</div>
      <div className="resource-pill">● {balls} / {ballCapacity}</div>
    </div>
    <nav className="nav-dock" aria-label="World navigation">
      <button onClick={() => setScene('campaign')} data-active={scene === 'campaign'}>Campaign</button>
      <button onClick={() => setScene('base')} data-active={scene === 'base'} disabled={tutorialActive} title={tutorialActive ? 'Complete Campaign onboarding first' : undefined}>Camp</button>
      <button onClick={() => setScene('raid')} data-active={scene === 'raid'} disabled={tutorialActive} title={tutorialActive ? 'Complete Campaign onboarding first' : undefined}>Raid</button>
    </nav>
    {scene === 'base' && <aside className="base-hud" aria-label="Battle Camp status" data-testid="base-hud">
      <strong>BATTLE CAMP <span>{camp.campOccupancy} / {camp.campCapacity}</span></strong>
      <strong>ILLUMINATI <span>{camp.illuminatiOccupancy} / {camp.illuminatiCapacity}</span></strong>
      {(tutorialStepId === 'base_illuminati_explain' || tutorialStepId === 'base_move_illuminati' || camp.illuminatiOccupancy > 0) && <small>◈ Shield = protected from raid steals</small>}
      {selectedCampSummon && <div>{getSummonDefinition(selectedCampSummon.definitionId).displayName} · {selectedCampSummon.tier}<button type="button" onClick={cancelCampInteraction}>CANCEL</button></div>}
    </aside>}
    <div className="action-stack">
      {scene === 'campaign' && battlePhase === 'setup' && <button
        type="button"
        className="summons-action"
        id="summon-inventory-button"
        data-tutorial-target="summon-inventory-button"
        onClick={openSummonTray}
      >SUMMONS</button>}
      {scene === 'campaign' && battlePhase === 'running' && <div className="battle-hud" aria-label="Battle controls">
        <div className="skill-bar">
          {battleSnapshot?.units.filter((unit) => unit.side === 'player').map((unit) => {
            const definition = getSummonDefinition(unit.definitionId);
            const skill = getSkillDefinition(unit.skill1Id ?? '');
            const ready = readySkillActorIds.includes(unit.id);
            const dead = deadUnitIds.includes(unit.id);
            return <button key={unit.id} type="button" className="battle-skill" data-ready={ready} disabled={!ready || dead || !tutorialAllows('CAST_SKILL_1')} data-testid={`battle-skill-${unit.id}`} data-tutorial-target={`battle-skill-${unit.id}`} onClick={() => requestManualSkillCast(unit.id)}>
              <span>{definition.displayName}</span><small>{skill.name}</small><em>{dead ? 'DOWN' : ready ? 'READY' : 'CHARGING'}</em>
            </button>;
          })}
        </div>
        <button type="button" className="auto-cast" data-enabled={autoCast} data-testid="battle-auto-cast" data-tutorial-target="autocast-toggle" disabled={!tutorialAllows('TOGGLE_AUTO_CAST') && !autoCast} onClick={() => setBattleAutoCast(!autoCast)}>AUTO {autoCast ? 'ON' : 'OFF'}</button>
      </div>}
      {scene === 'campaign' && (battlePhase === 'victory' || battlePhase === 'defeat' || battlePhase === 'draw') && <div className="battle-result" data-testid="battle-result">{battlePhase.toUpperCase()}{battlePhase !== 'victory' && <button type="button" onClick={retryTutorialBattle}>RETRY</button>}</div>}
      {scene !== 'base' && battlePhase === 'setup' && <button
        type="button"
        className="primary-action"
        id="start-battle-button"
        data-tutorial-target="start-battle-button"
        data-testid="battle-start"
        disabled={scene === 'campaign' && !teamReady}
        title={scene === 'campaign' && !teamReady ? 'Deploy 6 Summons first' : undefined}
        onClick={scene === 'campaign' ? () => startCampaignBattle() : undefined}
      >{scene === 'campaign' ? 'START BATTLE' : 'SELECT TEAM'}</button>
      }
    </div>
  </section>;
}
