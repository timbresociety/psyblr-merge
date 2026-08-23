import fs from 'node:fs'; import path from 'node:path';
const root=process.cwd();
const read=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const summons=read('packages/game-content/summons.json');
const spawn=read('packages/game-content/spawn-machine.json');
const tutorial=read('packages/game-content/tutorial.json');
const origins=read('packages/game-content/origins.json');
const functions=read('packages/game-content/combat-functions.json');
const skills=read('packages/game-content/skills.json');
const creeps=read('packages/game-content/creeps.json');
const probs=spawn.binProbabilities.reduce((a,b)=>a+b,0);
if(probs!==100) throw new Error(`Spawn probabilities total ${probs}, expected 100`);
if(new Set(summons.map(s=>s.id)).size!==summons.length) throw new Error('Duplicate summon ids');
if(new Set(skills.map(s=>s.id)).size!==skills.length) throw new Error('Duplicate skill ids');
if(new Set(creeps.map(c=>c.id)).size!==creeps.length || creeps.length !== 3) throw new Error('Expected three unique creep definitions');
const originIds=new Set(origins.map(origin=>origin.id));
const functionIds=new Set(functions.map(functionDef=>functionDef.id));
const skillIds=new Set(skills.map(skill=>skill.id));
for(const summon of summons){
  if(!originIds.has(summon.originId)) throw new Error(`Unknown origin ${summon.originId} for ${summon.id}`);
  if(!functionIds.has(summon.combatFunctionId)) throw new Error(`Unknown combat function ${summon.combatFunctionId} for ${summon.id}`);
  if(!skillIds.has(summon.skills.basic) || !skillIds.has(summon.skills.skill1)) throw new Error(`Missing starter skill content for ${summon.id}`);
  const skill=skills.find(skill=>skill.id===summon.skills.skill1);
  if(!skill?.mechanics || skill.mechanics.cooldownMs <= 0 || skill.mechanics.initialDelayMs < 0) throw new Error(`Invalid Skill 1 mechanics for ${summon.id}`);
}
const ids=new Set(tutorial.map(s=>s.id));
for(const step of tutorial){if(step.nextStep && !ids.has(step.nextStep))throw new Error(`Unknown tutorial nextStep ${step.nextStep}`)}
console.log(`Validated ${summons.length} summons, ${skills.length} skills, ${creeps.length} creeps, ${tutorial.length} tutorial steps, spawn total ${probs}%`);
