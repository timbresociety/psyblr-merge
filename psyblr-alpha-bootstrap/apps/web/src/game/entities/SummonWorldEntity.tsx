import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { useMaterial } from '@playcanvas/react/hooks';
import { getSummonDefinition } from '@psyblr/game-content';
import type { SummonInstance } from '@psyblr/contracts';
import { tierFormBand } from '@psyblr/game-rules';
import { getSummonPresentation } from '../summonPresentation';

export function SummonWorldEntity({ instance, position, selected = false, protected: isProtected = false, health, mergePulse = false }: { instance: SummonInstance; position: [number, number, number]; selected?: boolean; protected?: boolean; health?: { hp: number; maxHp: number; shield?: number }; mergePulse?: boolean }) {
  const definition = getSummonDefinition(instance.definitionId);
  const presentation = getSummonPresentation(definition.id);
  const material = useMaterial({ diffuse: presentation.accent, emissive: presentation.accent, emissiveIntensity: .16, gloss: .7 });
  const ring = useMaterial({ diffuse: '#f8fafc', emissive: isProtected ? '#86efac' : presentation.accent, emissiveIntensity: 1, gloss: .9 });
  const healthMaterial = useMaterial({ diffuse: health && health.hp / health.maxHp > .5 ? '#22c55e' : '#ef4444', emissive: '#22c55e', emissiveIntensity: .3 });
  const healthWidth = health ? Math.max(.03, health.hp / health.maxHp) * .85 : 0;
  const scale = tierFormBand(instance.tier) === 'final' ? 1.22 : tierFormBand(instance.tier) === 'major_2' ? 1.15 : tierFormBand(instance.tier) === 'major_1' ? 1.08 : instance.tier === 'E' ? 1.04 : 1;
  return <Entity name={`summon-${instance.id}`} position={position}>
    {mergePulse && <Entity name={`merge-pulse-${instance.id}`} position={[0, .08, 0]} scale={[1.12, .035, 1.12]}><Render type="torus" material={ring} /></Entity>}
    {(selected || isProtected) && <Entity name={`summon-ring-${instance.id}`} position={[0, -.035, 0]} scale={[isProtected ? .72 : .62, .028, isProtected ? .72 : .62]}><Render type="cylinder" material={ring} /></Entity>}
    {isProtected && <Entity name={`shield-aura-${instance.id}`} position={[0, .72, 0]} scale={[.6, .08, .6]}><Render type="torus" material={ring} /></Entity>}
    <Entity name={`${definition.id}-base`} scale={[.45 * scale, .14, .45 * scale]}><Render type="cylinder" material={material} /></Entity>
    <Entity name={`${definition.id}-body`} position={[0, .55 * scale, 0]} scale={[.45 * scale, .98 * scale, .45 * scale]}><Render type="capsule" material={material} /></Entity>
    {health && <Entity position={[(healthWidth - .85) / 2, 1.2, 0]} scale={[healthWidth, .04, .08]}><Render type="box" material={healthMaterial} /></Entity>}
  </Entity>;
}
