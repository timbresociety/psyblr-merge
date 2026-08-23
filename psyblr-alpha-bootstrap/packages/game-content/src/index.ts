import {
  CombatFunctionDefinitionSchema,
  CreepDefinitionSchema,
  OriginDefinitionSchema,
  SkillDefinitionSchema,
  SummonDefinitionSchema,
  type CombatFunctionDefinition,
  type CreepDefinition,
  type OriginDefinition,
  type SkillDefinition,
  type SummonDefinition,
  type SummonInstance,
  BaseLayoutDefinitionSchema,
  type BaseLayoutDefinition,
  TutorialStepSchema,
  type TutorialStep,
  SpawnMachineDefinitionSchema,
  type SpawnMachineDefinition,
} from '@psyblr/contracts';
import combatFunctionsJson from '../combat-functions.json';
import originsJson from '../origins.json';
import skillsJson from '../skills.json';
import summonsJson from '../summons.json';
import creepsJson from '../creeps.json';
import tutorialJson from '../tutorial.json';
import baseLayoutJson from '../base-layout.json';
import spawnMachineJson from '../spawn-machine.json';

export const summonDefinitions = SummonDefinitionSchema.array().parse(summonsJson);
export const originDefinitions = OriginDefinitionSchema.array().parse(originsJson);
export const combatFunctionDefinitions = CombatFunctionDefinitionSchema.array().parse(combatFunctionsJson);
export const skillDefinitions = SkillDefinitionSchema.array().parse(skillsJson);
export const creepDefinitions = CreepDefinitionSchema.array().parse(creepsJson);
export const tutorialDefinitions: TutorialStep[] = TutorialStepSchema.array().parse(tutorialJson);
export const baseLayoutDefinition: BaseLayoutDefinition = BaseLayoutDefinitionSchema.parse(baseLayoutJson);
export const spawnMachineDefinition: SpawnMachineDefinition = SpawnMachineDefinitionSchema.parse(spawnMachineJson);

function getById<T extends { id: string }>(collection: readonly T[], id: string, label: string): T {
  const definition = collection.find((entry) => entry.id === id);
  if (!definition) throw new Error(`Unknown ${label} id: ${id}`);
  return definition;
}

export function getSummonDefinition(id: string): SummonDefinition {
  return getById(summonDefinitions, id, 'summon definition');
}

export function getOriginDefinition(id: string): OriginDefinition {
  return getById(originDefinitions, id, 'origin definition');
}

export function getCombatFunctionDefinition(id: string): CombatFunctionDefinition {
  return getById(combatFunctionDefinitions, id, 'combat function definition');
}

export function getSkillDefinition(id: string): SkillDefinition {
  return getById(skillDefinitions, id, 'skill definition');
}

export function getCreepDefinition(id: string): CreepDefinition {
  return getById(creepDefinitions, id, 'creep definition');
}

export function createStarterSummonInstances(): SummonInstance[] {
  return summonDefinitions.map((definition) => ({
    id: `starter:${definition.id}:001`,
    definitionId: definition.id,
    tier: 'F',
  }));
}
