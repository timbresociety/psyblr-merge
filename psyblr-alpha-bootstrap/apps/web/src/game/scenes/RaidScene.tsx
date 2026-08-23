import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import { Ground } from '../GameCanvas';
import { battleCellToWorld } from '../battlefield';

/** A lightweight staging arena uses the same 8×8 coordinate language as Campaign combat. */
export function RaidScene() {
  const player = useMaterial({ diffuse: '#162c4a', emissive: '#1d4ed8', emissiveIntensity: .14, gloss: .34 });
  const enemy = useMaterial({ diffuse: '#321d38', emissive: '#7e22ce', emissiveIntensity: .12, gloss: .34 });
  const line = useMaterial({ diffuse: '#fbbf24', emissive: '#fbbf24', emissiveIntensity: .55 });
  const plinth = useMaterial({ diffuse: '#1e293b', emissive: '#334155', emissiveIntensity: .35, gloss: .6 });
  return <Entity name="raid-staging-arena">
    <Ground scale={[16, .22, 16]} />
    {Array.from({ length: 64 }, (_, index) => { const cell = { x: index % 8, z: Math.floor(index / 8) }; const [x, , z] = battleCellToWorld(cell); return <Entity key={`${cell.x}-${cell.z}`} name={`raid-cell-${cell.x}-${cell.z}`} position={[x, .015, z]} scale={[.92, .035, .92]}><Render type="box" material={cell.z >= 4 ? player : enemy} /></Entity>; })}
    <Entity name="raid-centerline" position={[0, .065, 0]} scale={[8.1, .035, .08]}><Render type="box" material={line} /></Entity>
    <Entity name="raid-command-plinth" position={[0, .34, 4.9]} scale={[3.2, .56, .75]}><Render type="box" material={plinth} /></Entity>
  </Entity>;
}
