import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import { BASE_LAYOUT } from '../baseLayout';

/** Placeholder geometry deliberately models the machine as presentation, not reward authority. */
export function SpawnMachineWorld() {
  const socket = BASE_LAYOUT.buildingSockets.find((entry) => entry.kind === 'spawn_machine')!;
  const body = useMaterial({ diffuse: '#1e3a5f', emissive: '#0ea5e9', emissiveIntensity: .25, gloss: .65 });
  const metal = useMaterial({ diffuse: '#475569', gloss: .8 }); const locked = useMaterial({ diffuse: '#273449', emissive: '#334155', emissiveIntensity: .2 }); const ball = useMaterial({ diffuse: '#fde68a', emissive: '#f59e0b', emissiveIntensity: .45 });
  return <Entity name="spawn-machine" position={[socket.position[0], 0, socket.position[2]]} rotation={[0, socket.rotationY, 0]}>
    <Entity position={[0, 1.25, 0]} scale={[1.65, 2.5, 1.4]}><Render type="box" material={body} /></Entity>
    <Entity position={[0, 2.65, 0]} scale={[.95, .34, .95]}><Render type="sphere" material={metal} /></Entity>
    <Entity position={[0, 2.2, -.74]} scale={[.28, 1.05, .12]}><Render type="box" material={metal} /></Entity>
    {Array.from({ length: 16 }, (_, index) => <Entity key={`peg-${index}`} position={[-.55 + index % 4 * .37, 1.7 - Math.floor(index / 4) * .28, -.76]} scale={[.07, .07, .07]}><Render type="sphere" material={metal} /></Entity>)}
    {Array.from({ length: 6 }, (_, index) => <Entity key={`bin-${index}`} position={[-.64 + index * .255, .25, -.77]} scale={[.025, .36, .14]}><Render type="box" material={metal} /></Entity>)}
    <Entity position={[-.48, .55, -.8]} scale={[.16, .16, .08]}><Render type="sphere" material={locked} /></Entity><Entity position={[.48, .55, -.8]} scale={[.16, .16, .08]}><Render type="sphere" material={locked} /></Entity>
    <Entity position={[0, 2.1, -.82]} scale={[.09, .09, .09]}><Render type="sphere" material={ball} /></Entity>
  </Entity>;
}
