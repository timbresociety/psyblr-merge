import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { Ground } from '../GameCanvas';
export function RaidScene(){return <Entity name="raid-scene"><Ground/><Entity position={[-2,0.75,0]} scale={[0.75,1.5,0.75]}><Render type="box"/></Entity><Entity position={[2,0.75,0]} scale={[0.75,1.5,0.75]}><Render type="box"/></Entity></Entity>}
