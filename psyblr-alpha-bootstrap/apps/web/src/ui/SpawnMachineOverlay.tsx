import { useEffect, useRef, useState } from 'react';
import { getSummonDefinition } from '@psyblr/game-content';
import { tutorialAllows, useGameStore } from '../stores/gameStore';
import { createTutorialSpawnGateway } from '../spawn/gateway';
import { dispatchTutorialEvent } from '../tutorial/controller';
import './spawn.css';

const HOLD_MS = 260;
const AUTO_DROP_DELAY_MS = 55;

export function SpawnMachineOverlay() {
  const open = useGameStore((state) => state.spawnOpen);
  const spawn = useGameStore((state) => state.spawn);
  const camp = useGameStore((state) => state.campPlacements);
  const step = useGameStore((state) => state.tutorialStepId);
  const error = useGameStore((state) => state.spawnError);
  const [releasing, setReleasing] = useState(false);
  const releasingRef = useRef(false);
  const held = useRef(false);
  const holdTimer = useRef<number | null>(null);
  const sequence = useRef(0);
  const announcedOpen = useRef(false);

  useEffect(() => {
    if (open && step === 'spawn_open' && !announcedOpen.current) {
      announcedOpen.current = true;
      dispatchTutorialEvent({ type: 'SPAWN_UI_OPENED' });
    }
    if (!open) announcedOpen.current = false;
  }, [open, step]);

  const stop = () => {
    held.current = false;
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const release = async (): Promise<boolean> => {
    const state = useGameStore.getState();
    if (releasingRef.current || !tutorialAllows('DROP_BALL') || state.spawn.balls <= 0 || state.campPlacements.length >= 36) return false;
    releasingRef.current = true;
    setReleasing(true);
    const first = state.inventory.find((item) => item.id === state.tutorialContext.firstSummonInstanceId);
    const primaryDefinitionId = first?.definitionId ?? state.spawn.dailyPool[0]!.summonDefinitionId;
    const gateway = createTutorialSpawnGateway(() => {
      const live = useGameStore.getState();
      return { runtime: live.spawn, inventory: live.inventory, campPlacements: live.campPlacements, primaryDefinitionId };
    });
    const clientActionId = `tutorial-release-${state.spawn.tutorialDropIndex + 1}-${++sequence.current}`;
    try {
      state.applySpawnRelease(await gateway.releaseBall({ clientActionId }));
      return true;
    } catch (cause) {
      useGameStore.getState().setSpawnError(cause instanceof Error ? cause.message : 'Release failed. Retry.');
      stop();
      return false;
    } finally {
      releasingRef.current = false;
      setReleasing(false);
    }
  };

  const continueAutoDrop = async () => {
    const state = useGameStore.getState();
    if (!held.current || state.tutorialStepId !== 'spawn_long_press' || state.spawn.balls <= 0 || state.campPlacements.length >= 36) return;
    await release();
    if (held.current && useGameStore.getState().tutorialStepId === 'spawn_long_press') {
      holdTimer.current = window.setTimeout(() => { void continueAutoDrop(); }, AUTO_DROP_DELAY_MS);
    }
  };

  const startHold = () => {
    if (held.current) return;
    held.current = true;
    void release();
    holdTimer.current = window.setTimeout(() => { void continueAutoDrop(); }, HOLD_MS);
  };

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== ' ' && event.key !== 'Enter') || !useGameStore.getState().spawnOpen) return;
      event.preventDefault();
      startHold();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', stop);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', stop);
      window.removeEventListener('blur', stop);
      stop();
    };
  }, []);

  if (!open) return null;
  const disabled = spawn.balls <= 0 || camp.length >= 36 || !tutorialAllows('DROP_BALL');
  return <aside className="spawn-overlay" aria-label="Spawn Machine" data-testid="spawn-overlay">
    <header><span>SPAWN MACHINE</span><strong>{spawn.balls} / {spawn.ballCapacity}</strong><small>BATTLE CAMP {camp.length} / 36</small></header>
    <div className="spawn-meter"><i style={{ width: `${spawn.balls / spawn.ballCapacity * 100}%` }} /></div>
    <div className="spawn-slots">{spawn.dailyPool.map((slot) => {
      const definition = getSummonDefinition(slot.summonDefinitionId);
      return <article key={slot.slotIndex} data-testid={`spawn-slot-${slot.slotIndex}`}><b>{definition.displayName.slice(0, 1)}</b><span>{definition.displayName}</span><em>{slot.probability}%</em></article>;
    })}</div>
    {step === 'spawn_long_press' && <p>HOLD TO AUTO-DROP</p>}
    {error && <div className="spawn-error">{error} <button onClick={() => { useGameStore.getState().setSpawnError(null); void release(); }}>RETRY</button></div>}
    <button className="spawn-drop" type="button" data-tutorial-target="drop-button" data-testid="drop-ball" disabled={disabled} aria-busy={releasing} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); startHold(); }} onPointerUp={stop} onPointerCancel={stop}>DROP BALL</button>
  </aside>;
}
