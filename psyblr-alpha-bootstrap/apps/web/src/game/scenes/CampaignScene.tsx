import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import { getSummonDefinition } from '@psyblr/game-content';
import { canDeploySummon, isBattleCellOccupied, isPlayerDeploymentCell } from '@psyblr/game-rules';
import type { BattleCell, SummonInstance } from '@psyblr/contracts';
import type { StandardMaterial } from 'playcanvas';
import { battleCellToWorld } from '../battlefield';
import { getSummonPresentation } from '../summonPresentation';
import { Ground } from '../GameCanvas';
import { useGameStore } from '../../stores/gameStore';

type TacticalCellProps = {
  cell: BattleCell;
  material: StandardMaterial;
};

function TacticalCell({ cell, material }: TacticalCellProps) {
  const [x, , z] = battleCellToWorld(cell);

  return <Entity
    name={`battle-cell-${cell.x}-${cell.z}`}
    position={[x, 0, z]}
    scale={[1.08, 0.06, 1.08]}
  >
    <Render type="box" material={material} />
  </Entity>;
}

function DeployedSummon({ instance, cell, selected }: { instance: SummonInstance; cell: BattleCell; selected: boolean }) {
  const definition = getSummonDefinition(instance.definitionId);
  const presentation = getSummonPresentation(definition.id);
  const summonMaterial = useMaterial({ diffuse: presentation.accent, emissive: presentation.accent, emissiveIntensity: 0.12, gloss: 0.65 });
  const ringMaterial = useMaterial({ diffuse: '#f8fafc', emissive: presentation.accent, emissiveIntensity: 0.9, gloss: 0.9 });
  const [x, , z] = battleCellToWorld(cell);

  return <Entity
    name={`deployed-summon-${instance.id}`}
    position={[x, 0.08, z]}
  >
    {selected && <Entity name={`selected-ring-${instance.id}`} position={[0, -0.045, 0]} scale={[0.62, 0.03, 0.62]}>
      <Render type="cylinder" material={ringMaterial} />
    </Entity>}
    <Entity name={`${definition.id}-base`} scale={[0.45, 0.14, 0.45]}>
      <Render type="cylinder" material={summonMaterial} />
    </Entity>
    <Entity name={`${definition.id}-body`} position={[0, 0.55, 0]} scale={[0.45, 0.98, 0.45]}>
      <Render type="capsule" material={summonMaterial} />
    </Entity>
  </Entity>;
}

export function CampaignScene() {
  const placements = useGameStore((state) => state.placements);
  const inventory = useGameStore((state) => state.inventory);
  const selectedSummonInstanceId = useGameStore((state) => state.selectedSummonInstanceId);
  const placementMode = useGameStore((state) => state.placementMode);
  const hoveredBattleCell = useGameStore((state) => state.hoveredBattleCell);
  const enemyMaterial = useMaterial({ diffuse: '#16233c', gloss: 0.2 });
  const playerMaterial = useMaterial({ diffuse: '#244b7c', gloss: 0.28 });
  const validMaterial = useMaterial({ diffuse: '#2563eb', emissive: '#2563eb', emissiveIntensity: 0.2, gloss: 0.35 });
  const candidateMaterial = useMaterial({ diffuse: '#f8fafc', emissive: '#60a5fa', emissiveIntensity: 0.95, gloss: 0.8 });
  const occupiedMaterial = useMaterial({ diffuse: '#315d8e', gloss: 0.2 });

  const selectedInstance = selectedSummonInstanceId ? inventory.find((instance) => instance.id === selectedSummonInstanceId) : undefined;
  const placementActive = placementMode === 'selected' || placementMode === 'dragging';
  return <Entity name="campaign-scene">
    <Ground scale={[12, 0.2, 12]} />
    {Array.from({ length: 64 }, (_, index) => {
      const cell = { x: index % 8, z: Math.floor(index / 8) };
      const occupied = isBattleCellOccupied(cell, placements);
      const valid = placementActive && selectedInstance && canDeploySummon(selectedInstance.id, cell, placements);
      const candidate = hoveredBattleCell?.x === cell.x && hoveredBattleCell.z === cell.z && valid;
      const material = candidate ? candidateMaterial : valid ? validMaterial : occupied ? occupiedMaterial : isPlayerDeploymentCell(cell) ? playerMaterial : enemyMaterial;
      return <TacticalCell key={`${cell.x}-${cell.z}`} cell={cell} material={material} />;
    })}
    {placements.map((placement) => {
      const instance = inventory.find((entry) => entry.id === placement.summonInstanceId);
      if (!instance) return null;
      return <DeployedSummon
        key={instance.id}
        instance={instance}
        cell={placement.cell}
        selected={selectedSummonInstanceId === instance.id}
      />;
    })}
  </Entity>;
}
