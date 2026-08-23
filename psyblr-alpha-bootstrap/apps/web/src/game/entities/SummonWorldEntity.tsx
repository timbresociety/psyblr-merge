import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import { getSummonDefinition } from '@psyblr/game-content';
import type { SummonInstance } from '@psyblr/contracts';
import { getSummonPresentation } from '../summonPresentation';

export function SummonWorldEntity({ instance, position, selected = false, protected: isProtected = false, health }: { instance: SummonInstance; position: [number, number, number]; selected?: boolean; protected?: boolean; health?: { hp: number; maxHp: number; shield?: number } }) {
  const definition = getSummonDefinition(instance.definitionId);
  const presentation = getSummonPresentation(definition.id);
  const material = useMaterial({ diffuse: presentation.accent, emissive: presentation.accent, emissiveIntensity: .16, gloss: .7 });
  const ring = useMaterial({ diffuse: '#f8fafc', emissive: isProtected ? '#86efac' : presentation.accent, emissiveIntensity: 1, gloss: .9 });
  const healthMaterial = useMaterial({ diffuse: health && health.hp / health.maxHp > .5 ? '#22c55e' : '#ef4444', emissive: '#22c55e', emissiveIntensity: .3 });
  const healthWidth = health ? Math.max(.03, health.hp / health.maxHp) * .85 : 0;
  return <Entity name={`summon-${instance.id}`} position={position}>
    {(selected || isProtected) && <Entity name={`summon-ring-${instance.id}`} position={[0, -.035, 0]} scale={[isProtected ? .72 : .62, .028, isProtected ? .72 : .62]}><Render type="cylinder" material={ring} /></Entity>}
    {isProtected && <Entity name={`shield-aura-${instance.id}`} position={[0, .72, 0]} scale={[.6, .08, .6]}><Render type="torus" material={ring} /></Entity>}
    <Entity name={`${definition.id}-base`} scale={[.45, .14, .45]}><Render type="cylinder" material={material} /></Entity>
    <Entity name={`${definition.id}-body`} position={[0, .55, 0]} scale={[.45, .98, .45]}><Render type="capsule" material={material} /></Entity>
    {health && <Entity position={[(healthWidth - .85) / 2, 1.2, 0]} scale={[healthWidth, .04, .08]}><Render type="box" material={healthMaterial} /></Entity>}
  </Entity>;
}
