import { useRef } from 'react';
import type { PointerEvent } from 'react';
import type { CombatFunctionDefinition, OriginDefinition, SummonDefinition, SummonInstance } from '@psyblr/contracts';
import { SummonPortrait } from './SummonPortrait';

const DRAG_THRESHOLD_PX = 8;

type SummonCardProps = {
  instance: SummonInstance;
  definition: SummonDefinition;
  origin: OriginDefinition;
  combatFunction: CombatFunctionDefinition;
  deployed?: boolean | undefined;
  selected: boolean;
  onSelect: (instanceId: string) => void;
  onDragStart?: ((instanceId: string) => void) | undefined;
  onDragCancel?: (() => void) | undefined;
  selectionLabel?: string | undefined;
};

export function SummonCard({
  instance,
  definition,
  origin,
  combatFunction,
  deployed,
  selected,
  onSelect,
  onDragStart,
  onDragCancel,
  selectionLabel,
}: SummonCardProps) {
  const gesture = useRef({ pointerId: -1, startX: 0, startY: 0, dragging: false });
  const suppressClick = useRef(false);

  const resetGesture = () => { gesture.current = { pointerId: -1, startX: 0, startY: 0, dragging: false }; };
  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (deployed || !onDragStart) return;
    gesture.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dragging: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (deployed || !onDragStart || current.pointerId !== event.pointerId || current.dragging) return;
    const dx = event.clientX - current.startX; const dy = event.clientY - current.startY;
    // The tray still scrolls horizontally. A deliberate upward gesture lifts the card
    // toward the board rather than accidentally treating a sideways swipe as placement.
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX || Math.abs(dy) <= Math.abs(dx) || dy >= 0) return;
    gesture.current = { ...current, dragging: true };
    onDragStart(instance.id);
  };
  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (gesture.current.pointerId !== event.pointerId) return;
    suppressClick.current = gesture.current.dragging;
    resetGesture();
  };
  const onPointerCancel = () => {
    if (gesture.current.dragging) onDragCancel?.();
    resetGesture();
  };

  return <button
    type="button"
    className="summon-card"
    data-selected={selected}
    data-deployed={deployed}
    data-testid={`summon-card-${instance.id}`}
    title={`Drag ${definition.displayName} onto the battlefield`}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    onPointerCancel={onPointerCancel}
    onLostPointerCapture={onPointerCancel}
    onClick={(event) => {
      if (suppressClick.current) {
        suppressClick.current = false;
        event.preventDefault();
        return;
      }
      onSelect(instance.id);
    }}
  >
    <SummonPortrait definition={definition} />
    <span className="summon-card-copy">
      <strong>{definition.displayName}</strong>
      <span className="summon-card-tags"><b>{instance.tier}</b>{origin.name} · {combatFunction.name}</span>
      {deployed && <em>DEPLOYED</em>}
      {selectionLabel && <em>{selectionLabel}</em>}
    </span>
  </button>;
}
