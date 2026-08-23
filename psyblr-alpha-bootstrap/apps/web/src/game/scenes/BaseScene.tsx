import { Entity } from '@playcanvas/react';
import { Render } from '@playcanvas/react/components';
import { Ground } from '../GameCanvas';
const CELL=1.2;
export function BaseScene(){return <Entity name="base-scene"><Ground scale={[14,0.2,14]}/>
 {Array.from({length:36},(_,i)=>{const x=i%6,y=Math.floor(i/6);return <Entity key={i} name={`camp-${x}-${y}`} position={[(x-2.5)*CELL,0,(y-2.5)*CELL]} scale={[1.0, y===0?0.12:0.06,1.0]}><Render type="box"/></Entity>})}
 <Entity name="spawn-machine" position={[5,1.2,0]} scale={[1.6,2.4,1.4]}><Render type="box"/></Entity>
 <Entity name="raid-gate" position={[-5,1.5,-1]} scale={[1.4,3,0.6]}><Render type="box"/></Entity>
 </Entity>}
