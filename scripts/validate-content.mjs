import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

const summons = read('packages/game-content/summons.json');
const spawn = read('packages/game-content/spawn-machine.json');
const tutorial = read('packages/game-content/tutorial.json');
const alliances = read('packages/game-content/alliances.json');
const skills = read('packages/game-content/skills.json');
const creeps = read('packages/game-content/creeps.json');

const probs = spawn.binProbabilities.reduce((a, b) => a + b, 0);
if (probs !== 100) throw new Error(`Spawn probabilities total ${probs}, expected 100`);

if (new Set(summons.map((s) => s.id)).size !== summons.length) throw new Error('Duplicate summon ids');
if (new Set(skills.map((s) => s.id)).size !== skills.length) throw new Error('Duplicate skill ids');
if (new Set(alliances.map((a) => a.id)).size !== alliances.length) throw new Error('Duplicate alliance ids');
if (new Set(creeps.map((c) => c.id)).size !== creeps.length || creeps.length !== 3) {
  throw new Error('Expected three unique creep definitions');
}

const allianceIds = new Set(alliances.map((a) => a.id));
const skillIds = new Set(skills.map((s) => s.id));

// Validate Alliances
for (const alliance of alliances) {
  if (!alliance.id || !alliance.name) throw new Error(`Invalid alliance definition ${alliance.id}`);
  const counts = alliance.thresholds.map((t) => t.count);
  if (!counts.includes(2) || !counts.includes(4) || !counts.includes(6)) {
    throw new Error(`Alliance ${alliance.id} must have thresholds for exactly 2, 4, 6`);
  }
}

// Validate Summons
for (const summon of summons) {
  if (!summon.allianceId || !allianceIds.has(summon.allianceId)) {
    throw new Error(`Unknown alliance ${summon.allianceId} for summon ${summon.id}`);
  }
  if (!summon.description) throw new Error(`Missing description for summon ${summon.id}`);
  if (!summon.quote) throw new Error(`Missing quote for summon ${summon.id}`);

  // Skills & Passive
  if (!skillIds.has(summon.skills.basic)) throw new Error(`Missing basic skill for ${summon.id}`);
  if (!skillIds.has(summon.skills.skill1)) throw new Error(`Missing skill 1 for ${summon.id}`);
  if (summon.skills.skill2 && !skillIds.has(summon.skills.skill2)) throw new Error(`Unknown skill 2 for ${summon.id}`);
  if (summon.skills.ultimate && !skillIds.has(summon.skills.ultimate)) throw new Error(`Unknown ultimate for ${summon.id}`);
  if (summon.passiveId && !skillIds.has(summon.passiveId)) throw new Error(`Unknown passive for ${summon.id}`);

  const skill1 = skills.find((s) => s.id === summon.skills.skill1);
  if (!skill1?.mechanics || skill1.mechanics.cooldownMs <= 0 || skill1.mechanics.initialDelayMs < 0) {
    throw new Error(`Invalid Skill 1 mechanics for ${summon.id}`);
  }
}

const ids = new Set(tutorial.map((s) => s.id));
for (const step of tutorial) {
  if (step.nextStep && !ids.has(step.nextStep)) {
    throw new Error(`Unknown tutorial nextStep ${step.nextStep}`);
  }
}

console.log(
  `Validated ${summons.length} summons, ${alliances.length} alliances, ${skills.length} skills, ${creeps.length} creeps, ${tutorial.length} tutorial steps, spawn total ${probs}%`
);
