import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import { canMerge, canPlaceCampSummon, getCampPlacementForSummon, isIlluminatiCell } from '@psyblr/game-rules';
import type { CampCell } from '@psyblr/contracts';
import type { StandardMaterial } from 'playcanvas';
import { BASE_LAYOUT, campCellToWorld } from '../baseLayout';
import { SummonWorldEntity } from '../entities/SummonWorldEntity';
import { Ground } from '../GameCanvas';
import { useGameStore } from '../../stores/gameStore';
import { SpawnMachineWorld } from '../entities/SpawnMachineWorld';

function CampCellEntity({ cell, material, protectedMaterial, mergeMaterial, candidate, valid, mergeCandidate }: { cell: CampCell; material: StandardMaterial; protectedMaterial: StandardMaterial; mergeMaterial: StandardMaterial; candidate: boolean; valid: boolean; mergeCandidate: boolean }) {
  const [x, , z] = campCellToWorld(cell); const illuminated = isIlluminatiCell(cell);
  return <Entity name={`camp-${cell.x}-${cell.y}`} position={[x, illuminated ? .12 : 0, z]} scale={[1.08, illuminated ? .15 : .07, 1.08]}>
    <Render type="box" material={mergeCandidate ? mergeMaterial : candidate || illuminated || valid ? protectedMaterial : material} />
    {illuminated && <Entity position={[0, .12, 0]} scale={[.72, .028, .72]}><Render type="cylinder" material={protectedMaterial} /></Entity>}
  </Entity>;
}
export function BaseScene() {
  const campPlacements = useGameStore((state) => state.campPlacements);
  const inventory = useGameStore((state) => state.inventory);
  const selectedId = useGameStore((state) => state.selectedCampSummonInstanceId);
  const tutorialStepId = useGameStore((state) => state.tutorialStepId);
  const mode = useGameStore((state) => state.campInteractionMode);
  const hovered = useGameStore((state) => state.hoveredCampCell);
  const mergePresentation = useGameStore((state) => state.mergePresentation);
  const ordinary = useMaterial({ diffuse: '#233043', gloss: .28 });
  const protectedMaterial = useMaterial({ diffuse: '#1d7a73', emissive: '#3de7c7', emissiveIntensity: .5, gloss: .75 });
  const mergeMaterial = useMaterial({ diffuse: '#7c3aed', emissive: '#d8b4fe', emissiveIntensity: 1.2, gloss: .9 });
  const future = useMaterial({ diffuse: '#293241', emissive: '#334155', emissiveIntensity: .14 });
  const building = useMaterial({ diffuse: '#334155', emissive: '#1d4ed8', emissiveIntensity: .32, gloss: .5 });
  const gate = useMaterial({ diffuse: '#312e81', emissive: '#8b5cf6', emissiveIntensity: .55, gloss: .65 });
  const selectedPlacement = selectedId ? getCampPlacementForSummon(selectedId, campPlacements) : undefined;
  return <Entity name="base-scene">
    <Ground scale={[24, .22, 20]} />
    {Array.from({ length: 36 }, (_, index) => { const cell = { x: index % 6, y: Math.floor(index / 6) }; const occupant = campPlacements.find((placement) => placement.cell.x === cell.x && placement.cell.y === cell.y); const source = inventory.find((entry) => entry.id === selectedId); const target = occupant && inventory.find((entry) => entry.id === occupant.summonInstanceId); const valid = Boolean(selectedPlacement && mode !== 'idle' && canPlaceCampSummon(selectedPlacement.summonInstanceId, cell, campPlacements) && isIlluminatiCell(cell) && !isIlluminatiCell(selectedPlacement.cell)); const mergeCandidate = Boolean(tutorialStepId?.startsWith('merge_') && source && target && source.id !== target.id && canMerge(source, target)); const candidate = hovered?.x === cell.x && hovered.y === cell.y; return <CampCellEntity key={`${cell.x}-${cell.y}`} cell={cell} material={ordinary} protectedMaterial={protectedMaterial} mergeMaterial={mergeMaterial} valid={valid} candidate={candidate} mergeCandidate={mergeCandidate} />; })}
    {campPlacements.map((placement) => { const instance = inventory.find((entry) => entry.id === placement.summonInstanceId); if (!instance) return null; const [x, y, z] = campCellToWorld(placement.cell); return <SummonWorldEntity key={instance.id} instance={instance} position={[x, y + .17, z]} selected={instance.id === selectedId} protected={isIlluminatiCell(placement.cell)} mergePulse={mergePresentation?.upgradedTarget.id === instance.id} />; })}
    {BASE_LAYOUT.buildingSockets.filter((socket) => socket.kind === 'future').map((socket) => <Entity key={socket.id} name={socket.id} position={socket.position} scale={[socket.footprint[0], .08, socket.footprint[1]]}><Render type="cylinder" material={future} /></Entity>)}
    <SpawnMachineWorld />
    <Entity name="raid-gate" position={[-6.4, 1.65, 0]} rotation={[0, 18, 0]} scale={[1.5, 3.25, .55]}><Render type="box" material={gate} /></Entity>
    <Entity name="raid-gate-core" position={[-6.4, 1.65, -.33]} scale={[.68, 1.7, .08]}><Render type="box" material={protectedMaterial} /></Entity>
  </Entity>;
}
