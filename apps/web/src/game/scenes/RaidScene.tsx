import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import { isBattleCellOccupied, isPlayerDeploymentCell, RAID_ROUND_DEFINITIONS } from '@psyblr/game-rules';
import { Ground } from '../GameCanvas';
import { battleCellToWorld } from '../battlefield';
import { useGameStore } from '../../stores/gameStore';
import { getSummonPresentation } from '../summonPresentation';
import { SummonWorldEntity } from '../entities/SummonWorldEntity';

function RaidCombatant({ id, definitionId, side, unit }: { id: string; definitionId: string; side: 'player' | 'enemy'; unit: { hp: number; maxHp: number; x: number; z: number; dead: boolean; shield: number } }) {
  const accent = side === 'player' ? getSummonPresentation(definitionId).accent : '#c084fc';
  const material = useMaterial({ diffuse: unit.dead ? '#293241' : accent, emissive: accent, emissiveIntensity: unit.dead ? 0 : .2, gloss: .65 });
  const health = useMaterial({ diffuse: unit.hp / unit.maxHp > .5 ? '#22c55e' : '#ef4444', emissive: '#22c55e', emissiveIntensity: .25 });
  const [x, , z] = battleCellToWorld({ x: unit.x / 1000, z: unit.z / 1000 }); const width = Math.max(.03, unit.hp / unit.maxHp) * .85;
  return <Entity name={`raid-combatant-${id}`} position={[x, .08, z]} rotation={[0, side === 'enemy' ? 180 : 0, 0]}><Entity scale={[.45, .14, .45]}><Render type="cylinder" material={material} /></Entity><Entity position={[0, .55, 0]} scale={[.45, .98, .45]}><Render type="capsule" material={material} /></Entity><Entity position={[(width - .85) / 2, 1.2, 0]} scale={[width, .04, .08]}><Render type="box" material={health} /></Entity></Entity>;
}

/** Raid setup uses the real player half of the board; the authoritative replay replaces it after start. */
export function RaidScene() {
  const roundResults = useGameStore((state) => state.raidRoundResults); const roundIndex = useGameStore((state) => state.raidReplayRoundIndex); const units = useGameStore((state) => state.raidReplayUnits); const status = useGameStore((state) => state.raidStatus); const fields = useGameStore((state) => state.raidFieldPlacements); const inventory = useGameStore((state) => state.inventory); const selectedId = useGameStore((state) => state.selectedRaidSummonInstanceId); const hovered = useGameStore((state) => state.hoveredRaidCell);
  const currentRound = RAID_ROUND_DEFINITIONS[roundResults.length]; const field = currentRound ? fields[currentRound.id] : [];
  const player = useMaterial({ diffuse: '#162c4a', emissive: '#1d4ed8', emissiveIntensity: .14, gloss: .34 });
  const enemy = useMaterial({ diffuse: '#321d38', emissive: '#7e22ce', emissiveIntensity: .12, gloss: .34 });
  const valid = useMaterial({ diffuse: '#1d4ed8', emissive: '#60a5fa', emissiveIntensity: .5, gloss: .55 });
  const candidate = useMaterial({ diffuse: '#f8fafc', emissive: '#93c5fd', emissiveIntensity: 1, gloss: .8 });
  const occupied = useMaterial({ diffuse: '#315d8e', emissive: '#1d4ed8', emissiveIntensity: .16, gloss: .34 });
  const line = useMaterial({ diffuse: '#fbbf24', emissive: '#fbbf24', emissiveIntensity: .55 });
  const replayRound = roundResults[roundIndex];
  return <Entity name="raid-staging-arena">
    <Ground scale={[16, .22, 16]} />
    {Array.from({ length: 64 }, (_, index) => { const cell = { x: index % 8, z: Math.floor(index / 8) }; const [x, , z] = battleCellToWorld(cell); const taken = isBattleCellOccupied(cell, field); const legal = status === 'setup' && Boolean(selectedId) && isPlayerDeploymentCell(cell) && !taken; const isHovered = legal && hovered?.x === cell.x && hovered.z === cell.z; const material = isHovered ? candidate : taken ? occupied : legal ? valid : isPlayerDeploymentCell(cell) ? player : enemy; return <Entity key={`${cell.x}-${cell.z}`} name={`raid-cell-${cell.x}-${cell.z}`} position={[x, .015, z]} scale={[.92, .035, .92]}><Render type="box" material={material} /></Entity>; })}
    <Entity name="raid-centerline" position={[0, .065, 0]} scale={[8.1, .035, .08]}><Render type="box" material={line} /></Entity>
    {status === 'setup' && field.map((placement) => { const instance = inventory.find((item) => item.id === placement.summonInstanceId); if (!instance) return null; const [x, , z] = battleCellToWorld(placement.cell); return <SummonWorldEntity key={instance.id} instance={instance} position={[x, .08, z]} selected={selectedId === instance.id} />; })}
    {(status === 'replaying' || status === 'resolving') && replayRound?.combatSnapshot.units.map((unit) => units[unit.id] ? <RaidCombatant key={unit.id} id={unit.id} definitionId={unit.definitionId} side={unit.side} unit={units[unit.id]!} /> : null)}
  </Entity>;
}
