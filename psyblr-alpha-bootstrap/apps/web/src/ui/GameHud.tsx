import { useGameStore } from '../stores/gameStore';

export function GameHud() {
  const scene = useGameStore((state) => state.scene);
  const setScene = useGameStore((state) => state.setScene);
  const balls = useGameStore((state) => state.balls);
  const ballCapacity = useGameStore((state) => state.ballCapacity);
  const placements = useGameStore((state) => state.placements);
  const openSummonTray = useGameStore((state) => state.openSummonTray);
  const teamReady = placements.length === 6;

  return <section className="hud" aria-label="Game controls">
    <div className="hud-top">
      <div className="brand">PSYBLR <span>ALPHA</span></div>
      <div className="scene-pill">{scene.toUpperCase()}</div>
      <div className="resource-pill">● {balls} / {ballCapacity}</div>
    </div>
    <nav className="nav-dock" aria-label="World navigation">
      <button onClick={() => setScene('campaign')} data-active={scene === 'campaign'}>Campaign</button>
      <button onClick={() => setScene('base')} data-active={scene === 'base'}>Camp</button>
      <button onClick={() => setScene('raid')} data-active={scene === 'raid'}>Raid</button>
    </nav>
    <div className="action-stack">
      {scene === 'campaign' && <button
        type="button"
        className="summons-action"
        id="summon-inventory-button"
        data-tutorial-target="summon-inventory-button"
        onClick={openSummonTray}
      >SUMMONS</button>}
      <button
        type="button"
        className="primary-action"
        id="start-battle-button"
        data-tutorial-target="start-battle-button"
        disabled={scene === 'campaign' && !teamReady}
        title={scene === 'campaign' && !teamReady ? 'Deploy 6 Summons first' : undefined}
      >{scene === 'campaign' ? 'START BATTLE' : scene === 'base' ? 'SUMMONS' : 'SELECT TEAM'}</button>
    </div>
  </section>;
}
