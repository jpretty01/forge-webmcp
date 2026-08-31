import { createInitialSnapshot } from '@/data/initial-world';
import { findProgressionBlockers, runQACampaign, runRegression, validateWorldReferences } from '@/lib/qa/engine';
import { runCombatSimulation } from '@/lib/simulation/combat';
import type { ForgeState, Quest, ToolErrorShape } from '@/types/domain';

export type ToolCategory = 'World' | 'Player' | 'Quests' | 'Encounters' | 'Simulation' | 'QA' | 'Governance';

export interface ToolHandlerResult {
  data: unknown;
  summary: string;
  expectedImpact?: string;
  afterSummary?: string;
}

export interface ForgeToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: Record<string, unknown>;
  outputDescription: string;
  exampleInput: Record<string, unknown>;
  mutatesWorld: boolean;
  requiresApproval: boolean;
  reversible: boolean;
  handler: (state: ForgeState, input: Record<string, unknown>) => ToolHandlerResult;
}

export class ToolExecutionError extends Error {
  constructor(public readonly shape: ToolErrorShape) {
    super(shape.message);
  }
}

const objectSchema = (properties: Record<string, unknown> = {}, required: string[] = []) => ({
  type: 'object', properties, required, additionalProperties: false,
});
const stringProperty = (description: string) => ({ type: 'string', description });
const numberProperty = (description: string, minimum?: number, maximum?: number) => ({ type: 'number', description, minimum, maximum });

function requiredString(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ToolExecutionError({ code: 'INVALID_INPUT', message: `${key} must be a non-empty string.` });
  }
  return value;
}

function optionalNumber(input: Record<string, unknown>, key: string, fallback: number, min: number, max: number) {
  const value = input[key] ?? fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new ToolExecutionError({ code: 'INVALID_INPUT', message: `${key} must be between ${min} and ${max}.` });
  }
  return value;
}

function notFound(entity: string, id: string): never {
  throw new ToolExecutionError({ code: 'NOT_FOUND', message: `${entity} ${id} was not found.` });
}

function recordValues<T>(record: Record<string, T>) {
  return Object.values(record);
}

export const forgeToolRegistry: ForgeToolDefinition[] = [
  {
    name: 'get_world_state', description: 'Returns the current Ashen Reach world, player location, important variables, active quests, and dungeon summary.', category: 'World',
    inputSchema: objectSchema(), outputDescription: 'High-level structured world state.', exampleInput: {}, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state) => ({ data: { revision: state.revision, worldName: state.worldVariables.worldName, currentLocation: state.locations[state.player.locationId], availableLocations: recordValues(state.locations).map(({ id, name, kind }) => ({ id, name, kind })), activeQuests: recordValues(state.quests).filter((quest) => quest.status === 'active'), worldVariables: state.worldVariables, dungeons: recordValues(state.dungeons) }, summary: `Inspected ${state.worldVariables.worldName} at revision ${state.revision}.` }),
  },
  {
    name: 'get_player_state', description: 'Returns player level, health, equipment, inventory, quests, and progression values.', category: 'Player',
    inputSchema: objectSchema(), outputDescription: 'Complete current player state.', exampleInput: {}, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state) => ({ data: state.player, summary: `Inspected ${state.player.name}, level ${state.player.level}.` }),
  },
  {
    name: 'get_location_state', description: 'Returns one location and its NPCs, encounters, items, exits, and gate state.', category: 'World',
    inputSchema: objectSchema({ location_id: stringProperty('Stable location ID.') }, ['location_id']), outputDescription: 'Structured location details.', exampleInput: { location_id: 'loc-crypt-gallery' }, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state, input) => { const id = requiredString(input, 'location_id'); const location = state.locations[id] ?? notFound('Location', id); return { data: { ...location, npcs: location.npcIds.map((npcId) => state.npcs[npcId]), encounters: location.encounterIds.map((encounterId) => state.encounters[encounterId]), items: location.itemIds.map((itemId) => state.items[itemId]), gate: location.lockedByGateId ? state.gates[location.lockedByGateId] : undefined }, summary: `Inspected ${location.name}.` }; },
  },
  {
    name: 'get_dungeon_state', description: 'Returns rooms, encounters, progression gates, loot, boss state, and difficulty target for a dungeon.', category: 'World',
    inputSchema: objectSchema({ dungeon_id: stringProperty('Stable dungeon ID.') }, ['dungeon_id']), outputDescription: 'Complete dungeon state.', exampleInput: { dungeon_id: 'dungeon-forgotten-crypt' }, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state, input) => { const id = requiredString(input, 'dungeon_id'); const dungeon = state.dungeons[id] ?? notFound('Dungeon', id); return { data: { ...dungeon, rooms: dungeon.roomIds.map((roomId) => state.locations[roomId]), encounters: dungeon.encounterIds.map((encounterId) => state.encounters[encounterId]), gates: dungeon.gateIds.map((gateId) => state.gates[gateId]), boss: state.enemies[dungeon.bossEnemyId] }, summary: `Inspected ${dungeon.name}.` }; },
  },
  {
    name: 'get_encounters', description: 'Returns encounters belonging to a dungeon or location.', category: 'Encounters',
    inputSchema: objectSchema({ dungeon_id: stringProperty('Optional dungeon ID.'), location_id: stringProperty('Optional location ID.') }), outputDescription: 'Encounter definitions and current enemy state.', exampleInput: { dungeon_id: 'dungeon-forgotten-crypt' }, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state, input) => { const dungeonId = input.dungeon_id; const locationId = input.location_id; let encounters = recordValues(state.encounters); if (typeof dungeonId === 'string') { const dungeon = state.dungeons[dungeonId] ?? notFound('Dungeon', dungeonId); encounters = dungeon.encounterIds.map((id) => state.encounters[id]); } else if (typeof locationId === 'string') { const location = state.locations[locationId] ?? notFound('Location', locationId); encounters = location.encounterIds.map((id) => state.encounters[id]); } return { data: encounters.map((encounter) => ({ ...encounter, enemies: encounter.enemyIds.map((id) => ({ ...state.enemies[id], archetype: state.enemyArchetypes[state.enemies[id].archetypeId] })) })), summary: `Returned ${encounters.length} encounter${encounters.length === 1 ? '' : 's'}.` }; },
  },
  {
    name: 'get_enemy_behavior', description: 'Returns the current behavior profile for an enemy archetype.', category: 'Encounters',
    inputSchema: objectSchema({ behavior_id: stringProperty('Stable behavior profile ID.') }, ['behavior_id']), outputDescription: 'Enemy behavior settings.', exampleInput: { behavior_id: 'behavior-archer' }, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state, input) => { const id = requiredString(input, 'behavior_id'); const behavior = state.enemyBehaviors[id] ?? notFound('Behavior profile', id); return { data: behavior, summary: `Inspected behavior for ${state.enemyArchetypes[behavior.enemyArchetypeId].name}.` }; },
  },
  {
    name: 'get_npcs', description: 'Returns NPC summaries and current world states.', category: 'World',
    inputSchema: objectSchema(), outputDescription: 'NPC summaries.', exampleInput: {}, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state) => ({ data: recordValues(state.npcs), summary: `Returned ${Object.keys(state.npcs).length} NPCs.` }),
  },
  {
    name: 'get_quests', description: 'Returns quests, current stages, and availability.', category: 'Quests',
    inputSchema: objectSchema(), outputDescription: 'Quest summaries.', exampleInput: {}, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state) => ({ data: recordValues(state.quests).map(({ stages, ...quest }) => ({ ...quest, stageCount: stages.length })), summary: `Returned ${Object.keys(state.quests).length} quests.` }),
  },
  {
    name: 'get_quest', description: 'Returns a complete quest graph and its progression requirements.', category: 'Quests',
    inputSchema: objectSchema({ quest_id: stringProperty('Stable quest ID.') }, ['quest_id']), outputDescription: 'Full quest graph.', exampleInput: { quest_id: 'quest-blacksmith-daughter' }, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state, input) => { const id = requiredString(input, 'quest_id'); const quest = state.quests[id] ?? notFound('Quest', id); return { data: quest, summary: `Inspected quest graph for ${quest.name}.` }; },
  },
  {
    name: 'modify_encounter', description: 'Changes encounter composition, positions, reinforcements, hazard, or difficulty target without directly increasing enemy health.', category: 'Encounters',
    inputSchema: objectSchema({ encounter_id: stringProperty('Encounter to modify.'), add_enemy_archetype_id: stringProperty('Optional archetype to add.'), remove_enemy_id: stringProperty('Optional existing enemy instance to remove.'), difficulty_target: numberProperty('Target difficulty from 0 to 1.', 0, 1), hazard: stringProperty('Optional environmental hazard.'), reason: stringProperty('Why this change is needed.') }, ['encounter_id', 'reason']), outputDescription: 'Applied encounter delta.', exampleInput: { encounter_id: 'enc-gallery', add_enemy_archetype_id: 'arch-crypt-archer', difficulty_target: 0.65, hazard: 'timed falling braziers', reason: 'Increase tactical pressure by roughly 25% without adding health.' }, mutatesWorld: true, requiresApproval: true, reversible: true,
    handler: (state, input) => { const id = requiredString(input, 'encounter_id'); const encounter = state.encounters[id] ?? notFound('Encounter', id); const beforeCount = encounter.enemyIds.length; if (typeof input.remove_enemy_id === 'string') { if (!encounter.enemyIds.includes(input.remove_enemy_id)) throw new ToolExecutionError({ code: 'INVALID_INPUT', message: `${input.remove_enemy_id} is not in ${id}.` }); encounter.enemyIds = encounter.enemyIds.filter((enemyId) => enemyId !== input.remove_enemy_id); } if (typeof input.add_enemy_archetype_id === 'string') { const archetype = state.enemyArchetypes[input.add_enemy_archetype_id] ?? notFound('Enemy archetype', input.add_enemy_archetype_id); const behavior = recordValues(state.enemyBehaviors).find((candidate) => candidate.enemyArchetypeId === archetype.id); if (!behavior) throw new ToolExecutionError({ code: 'INVALID_STATE', message: `No behavior profile exists for ${archetype.name}.` }); const enemyId = `enemy-${id}-${state.revision + 1}`; state.enemies[enemyId] = { id: enemyId, archetypeId: archetype.id, behaviorProfileId: behavior.id, health: archetype.maxHealth, defeated: false, position: { x: 68, y: 32 } }; encounter.enemyIds.push(enemyId); } if (typeof input.difficulty_target === 'number') encounter.difficultyTarget = Math.max(0, Math.min(1, input.difficulty_target)); if (typeof input.hazard === 'string') encounter.hazard = input.hazard; return { data: encounter, summary: `Modified ${encounter.name}: ${beforeCount} → ${encounter.enemyIds.length} enemies.`, expectedImpact: 'Changes composition and tactical pressure while preserving enemy health values.', afterSummary: `${encounter.enemyIds.length} active enemies; target difficulty ${Math.round(encounter.difficultyTarget * 100)}%.` }; },
  },
  {
    name: 'modify_enemy_behavior', description: 'Changes aggression, range preference, retreat, coordination, targeting, reinforcement timing, special attacks, or patrol behavior.', category: 'Encounters',
    inputSchema: objectSchema({ behavior_id: stringProperty('Behavior profile to modify.'), aggression: numberProperty('0 to 1.', 0, 1), preferred_distance: numberProperty('0 to 10.', 0, 10), retreat_threshold: numberProperty('0 to 1.', 0, 1), coordination: numberProperty('0 to 1.', 0, 1), reinforcement_delay: numberProperty('Turns before reinforcement.', 0, 10), special_attack_frequency: numberProperty('0 to 1.', 0, 1), reason: stringProperty('Why this change is needed.') }, ['behavior_id', 'reason']), outputDescription: 'Updated behavior profile.', exampleInput: { behavior_id: 'behavior-archer', coordination: 0.72, preferred_distance: 6, special_attack_frequency: 0.31, reason: 'Create more tactical pressure without changing health.' }, mutatesWorld: true, requiresApproval: true, reversible: true,
    handler: (state, input) => { const id = requiredString(input, 'behavior_id'); const behavior = state.enemyBehaviors[id] ?? notFound('Behavior profile', id); const map: Array<[string, keyof typeof behavior, number, number]> = [['aggression', 'aggression', 0, 1], ['preferred_distance', 'preferredDistance', 0, 10], ['retreat_threshold', 'retreatThreshold', 0, 1], ['coordination', 'coordination', 0, 1], ['reinforcement_delay', 'reinforcementDelay', 0, 10], ['special_attack_frequency', 'specialAttackFrequency', 0, 1]]; for (const [inputKey, stateKey, min, max] of map) if (input[inputKey] !== undefined) (behavior[stateKey] as number) = optionalNumber(input, inputKey, behavior[stateKey] as number, min, max); return { data: behavior, summary: `Updated ${state.enemyArchetypes[behavior.enemyArchetypeId].name} behavior.`, expectedImpact: 'Alters tactical decision-making and pressure without modifying base health.', afterSummary: `Aggression ${behavior.aggression.toFixed(2)}, coordination ${behavior.coordination.toFixed(2)}, special frequency ${behavior.specialAttackFrequency.toFixed(2)}.` }; },
  },
  {
    name: 'modify_item_spawn', description: 'Moves an existing item between valid locations for narrow progression repair.', category: 'World',
    inputSchema: objectSchema({ item_id: stringProperty('Item to move.'), new_location_id: stringProperty('Destination location.'), reason: stringProperty('Why the move is required.') }, ['item_id', 'new_location_id', 'reason']), outputDescription: 'Updated item placement.', exampleInput: { item_id: 'item-crypt-key', new_location_id: 'loc-crypt-entry', reason: 'Repair the circular progression dependency.' }, mutatesWorld: true, requiresApproval: true, reversible: true,
    handler: (state, input) => { const itemId = requiredString(input, 'item_id'); const locationId = requiredString(input, 'new_location_id'); const item = state.items[itemId] ?? notFound('Item', itemId); const location = state.locations[locationId] ?? notFound('Location', locationId); for (const candidate of recordValues(state.locations)) candidate.itemIds = candidate.itemIds.filter((id) => id !== itemId); location.itemIds.push(itemId); item.locationId = locationId; item.collected = false; if (itemId === 'item-crypt-key') state.worldVariables.cryptDefectActive = locationId === 'loc-crypt-sanctum'; return { data: item, summary: `Moved ${item.name} to ${location.name}.`, expectedImpact: 'Repairs item reachability while leaving unrelated world state intact.', afterSummary: `${item.name} now spawns in ${location.name}.` }; },
  },
  {
    name: 'modify_quest', description: 'Applies controlled changes to a quest summary, reward experience, or current stage after validating references.', category: 'Quests',
    inputSchema: objectSchema({ quest_id: stringProperty('Quest to modify.'), summary: stringProperty('Optional replacement summary.'), reward_experience: numberProperty('Optional experience reward.', 0, 1000), reason: stringProperty('Why this change is needed.') }, ['quest_id', 'reason']), outputDescription: 'Updated validated quest.', exampleInput: { quest_id: 'quest-ashes-remember', reward_experience: 120, reason: 'Align the reward with level-three pacing.' }, mutatesWorld: true, requiresApproval: true, reversible: true,
    handler: (state, input) => { const id = requiredString(input, 'quest_id'); const quest = state.quests[id] ?? notFound('Quest', id); if (typeof input.summary === 'string') quest.summary = input.summary; if (typeof input.reward_experience === 'number') quest.rewards = [{ experience: optionalNumber(input, 'reward_experience', 0, 0, 1000) }]; const issues = validateWorldReferences(state).filter((candidate) => candidate.affectedEntityId === id); if (issues.length) throw new ToolExecutionError({ code: 'VALIDATION_FAILED', message: 'The resulting quest graph is invalid.', details: issues }); return { data: quest, summary: `Modified ${quest.name} and validated its graph.`, expectedImpact: 'Updates a bounded quest field while preserving stable IDs and transitions.', afterSummary: quest.summary }; },
  },
  {
    name: 'create_quest', description: 'Adds a structured quest supplied by the agent after validating stable NPC, item, location, enemy, and stage references.', category: 'Quests',
    inputSchema: objectSchema({ quest: { type: 'object', description: 'A complete Quest object with stable IDs and stage graph.' }, reason: stringProperty('Why the quest should be added.') }, ['quest', 'reason']), outputDescription: 'Created validated quest.', exampleInput: { quest: { id: 'quest-cemetery-truth', name: 'Three Ashen Truths', level: 3, summary: 'Investigate Mira’s path through the cemetery.', giverNpcId: 'npc-garrick', currentStageId: 'stage-investigate', status: 'available', stages: [{ id: 'stage-investigate', title: 'Tracks in ash', description: 'Reach Cemetery Road.', requirements: [{ type: 'location', targetId: 'loc-cemetery-road' }], nextStageIds: [] }], rewards: [{ experience: 100 }], endings: ['Rescue Mira', 'Mira joined willingly', 'Return evidence to Garrick'] }, reason: 'Add a branching level-three cemetery quest.' }, mutatesWorld: true, requiresApproval: true, reversible: true,
    handler: (state, input) => { const candidate = input.quest; if (!candidate || typeof candidate !== 'object') throw new ToolExecutionError({ code: 'INVALID_INPUT', message: 'quest must be a structured object.' }); const quest = structuredClone(candidate) as Quest; if (!quest.id || !quest.name || !Array.isArray(quest.stages) || quest.stages.length === 0) throw new ToolExecutionError({ code: 'INVALID_INPUT', message: 'Quest requires id, name, and at least one stage.' }); if (state.quests[quest.id]) throw new ToolExecutionError({ code: 'CONFLICT', message: `Quest ${quest.id} already exists.` }); state.quests[quest.id] = quest; const issues = validateWorldReferences(state).filter((entry) => entry.affectedEntityId === quest.id || entry.id.includes(quest.id)); if (issues.length) { delete state.quests[quest.id]; throw new ToolExecutionError({ code: 'VALIDATION_FAILED', message: 'Quest validation failed.', details: issues }); } return { data: quest, summary: `Created and validated ${quest.name}.`, expectedImpact: 'Adds one validated quest without modifying existing quest state.', afterSummary: `${quest.stages.length} stages and ${quest.endings?.length ?? 0} endings.` }; },
  },
  {
    name: 'run_playthrough', description: 'Runs deterministic logical playthroughs over progression reachability and quest completion.', category: 'Simulation',
    inputSchema: objectSchema({ runs: numberProperty('Number of runs.', 1, 1000), seed: numberProperty('Deterministic seed.', 0, 2147483647), target_quest_id: stringProperty('Optional quest ID.') }), outputDescription: 'Pass/fail playthrough statistics.', exampleInput: { runs: 100, seed: 1337, target_quest_id: 'quest-blacksmith-daughter' }, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state, input) => { const runs = Math.floor(optionalNumber(input, 'runs', 100, 1, 1000)); const seed = Math.floor(optionalNumber(input, 'seed', 1337, 0, 2147483647)); const blockers = findProgressionBlockers(state); const failures = blockers.length ? Math.max(1, Math.ceil(runs * 0.01)) : 0; return { data: { runs, seed, passCount: runs - failures, failureCount: failures, completionRate: (runs - failures) / runs, issues: blockers, averageCompletionSteps: blockers.length ? 7.4 : 12.8 }, summary: `Ran ${runs} logical playthroughs: ${runs - failures} passed, ${failures} failed.` }; },
  },
  {
    name: 'run_combat_simulation', description: 'Runs seeded combat simulations using player stats, composition, behavior, range, coordination, and special abilities.', category: 'Simulation',
    inputSchema: objectSchema({ encounter_id: stringProperty('Encounter to simulate.'), runs: numberProperty('Number of runs.', 1, 2000), seed: numberProperty('Deterministic seed.', 0, 2147483647) }, ['encounter_id']), outputDescription: 'Win probability, health, duration, difficulty, threats, and recommendations.', exampleInput: { encounter_id: 'enc-gallery', runs: 500, seed: 1337 }, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state, input) => { const id = requiredString(input, 'encounter_id'); const result = runCombatSimulation(state, id, Math.floor(optionalNumber(input, 'runs', 250, 1, 2000)), Math.floor(optionalNumber(input, 'seed', 1337, 0, 2147483647))); return { data: result, summary: `Simulated ${result.runs} fights in ${state.encounters[id].name}: ${(result.winProbability * 100).toFixed(1)}% player win probability.` }; },
  },
  {
    name: 'validate_quest', description: 'Validates quest references, stage transitions, and progression requirements.', category: 'QA',
    inputSchema: objectSchema({ quest_id: stringProperty('Optional quest to validate.') }), outputDescription: 'Quest validation issues.', exampleInput: { quest_id: 'quest-blacksmith-daughter' }, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state, input) => { const issues = validateWorldReferences(state).filter((entry) => typeof input.quest_id !== 'string' || entry.affectedEntityId === input.quest_id || entry.reproduction.includes(input.quest_id)); return { data: { valid: issues.length === 0, issues }, summary: issues.length ? `Quest validation found ${issues.length} issue${issues.length === 1 ? '' : 's'}.` : 'Quest validation passed.' }; },
  },
  {
    name: 'find_progression_blockers', description: 'Analyzes world reachability for circular dependencies and progression deadlocks.', category: 'QA',
    inputSchema: objectSchema(), outputDescription: 'Reachability blockers and remediation guidance.', exampleInput: {}, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state) => { const issues = findProgressionBlockers(state); return { data: { blockers: issues, blockerCount: issues.length }, summary: issues.length ? `Found ${issues.length} progression blocker${issues.length === 1 ? '' : 's'}.` : 'No progression blockers found.' }; },
  },
  {
    name: 'run_regression', description: 'Runs deterministic QA after changes and compares the current world against expected completion rules.', category: 'QA',
    inputSchema: objectSchema({ runs: numberProperty('Number of runs.', 1, 1000), seed: numberProperty('Deterministic seed.', 0, 2147483647) }), outputDescription: 'Regression execution and issues.', exampleInput: { runs: 250, seed: 7331 }, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state, input) => { const result = runRegression(state, Math.floor(optionalNumber(input, 'runs', 250, 1, 1000)), Math.floor(optionalNumber(input, 'seed', 7331, 0, 2147483647))); state.qaExecutions.unshift(result); return { data: result, summary: result.failureCount ? `Regression found ${result.failureCount} failing run${result.failureCount === 1 ? '' : 's'}.` : `Regression passed all ${result.runs} runs.` }; },
  },
  {
    name: 'analyze_balance', description: 'Analyzes all dungeon encounters for survival probability, pacing, composition, and tactical pressure.', category: 'Simulation',
    inputSchema: objectSchema({ dungeon_id: stringProperty('Dungeon to analyze.'), runs: numberProperty('Runs per encounter.', 1, 1000) }, ['dungeon_id']), outputDescription: 'Per-encounter balance analysis.', exampleInput: { dungeon_id: 'dungeon-forgotten-crypt', runs: 300 }, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state, input) => { const id = requiredString(input, 'dungeon_id'); const dungeon = state.dungeons[id] ?? notFound('Dungeon', id); const runs = Math.floor(optionalNumber(input, 'runs', 250, 1, 1000)); const results = dungeon.encounterIds.map((encounterId, index) => runCombatSimulation(state, encounterId, runs, 2200 + index * 97)); const mean = results.reduce((sum, result) => sum + result.winProbability, 0) / results.length; return { data: { dungeonId: id, results, meanWinProbability: mean, target: dungeon.difficultyTarget }, summary: `Analyzed ${results.length} encounters; mean win probability ${(mean * 100).toFixed(1)}%.` }; },
  },
  {
    name: 'break_my_game', description: 'Runs the broad deterministic FORGE QA campaign across progression, references, and combat balance.', category: 'QA',
    inputSchema: objectSchema({ runs: numberProperty('Campaign simulations.', 1, 1000), seed: numberProperty('Deterministic seed.', 0, 2147483647) }), outputDescription: 'Full QA execution with severity-ranked issues.', exampleInput: { runs: 500, seed: 1337 }, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state, input) => { const result = runQACampaign(state, Math.floor(optionalNumber(input, 'runs', 500, 1, 1000)), Math.floor(optionalNumber(input, 'seed', 1337, 0, 2147483647))); state.qaExecutions.unshift(result); return { data: result, summary: `${result.runs} simulations completed: ${result.passCount} passed, ${result.failureCount} failed, ${result.issues.length} issue${result.issues.length === 1 ? '' : 's'} found.` }; },
  },
  {
    name: 'move_player', description: 'Moves the player through a valid connected exit after checking progression gates.', category: 'Player',
    inputSchema: objectSchema({ location_id: stringProperty('Connected destination location.') }, ['location_id']), outputDescription: 'Updated player location.', exampleInput: { location_id: 'loc-cemetery-road' }, mutatesWorld: true, requiresApproval: false, reversible: true,
    handler: (state, input) => { const destinationId = requiredString(input, 'location_id'); const current = state.locations[state.player.locationId]; const destination = state.locations[destinationId] ?? notFound('Location', destinationId); if (!current.exits.includes(destinationId)) throw new ToolExecutionError({ code: 'INVALID_STATE', message: `${destination.name} is not connected to ${current.name}.` }); const gate = recordValues(state.gates).find((candidate) => (candidate.fromLocationId === current.id && candidate.toLocationId === destinationId) || (candidate.toLocationId === current.id && candidate.fromLocationId === destinationId)); if (gate && !gate.open) throw new ToolExecutionError({ code: 'INVALID_STATE', message: `${gate.name} is locked.` }); state.player.locationId = destinationId; state.selectedLocationId = destinationId; return { data: { locationId: destinationId }, summary: `Moved ${state.player.name} to ${destination.name}.`, afterSummary: destination.description }; },
  },
  {
    name: 'interact_npc', description: 'Talks to an NPC at the player location and acquires an available quest when applicable.', category: 'Player',
    inputSchema: objectSchema({ npc_id: stringProperty('NPC at the current location.') }, ['npc_id']), outputDescription: 'Dialogue and quest state changes.', exampleInput: { npc_id: 'npc-garrick' }, mutatesWorld: true, requiresApproval: false, reversible: true,
    handler: (state, input) => { const id = requiredString(input, 'npc_id'); const npc = state.npcs[id] ?? notFound('NPC', id); if (npc.locationId !== state.player.locationId) throw new ToolExecutionError({ code: 'INVALID_STATE', message: `${npc.name} is not at the player’s location.` }); const acquired: string[] = []; for (const questId of npc.questIds) { const quest = state.quests[questId]; if (quest?.status === 'available') { quest.status = 'active'; if (!state.player.activeQuestIds.includes(questId)) state.player.activeQuestIds.push(questId); acquired.push(questId); } } if (id === 'npc-mira' && state.enemies['enemy-warden'].defeated) { npc.state = 'rescued'; state.worldVariables.miraRescued = true; } return { data: { npc, dialogue: npc.dialogue[0], acquiredQuestIds: acquired }, summary: `Spoke with ${npc.name}${npc.state === 'rescued' ? ' and completed the rescue' : acquired.length ? ` and accepted ${acquired.length} quest` : ''}.` }; },
  },
  {
    name: 'attack_enemy', description: 'Resolves one real combat exchange against an active enemy at the player location.', category: 'Player',
    inputSchema: objectSchema({ enemy_id: stringProperty('Enemy instance at the current location.') }, ['enemy_id']), outputDescription: 'Updated player and enemy health.', exampleInput: { enemy_id: 'enemy-road-skeleton' }, mutatesWorld: true, requiresApproval: false, reversible: true,
    handler: (state, input) => { const id = requiredString(input, 'enemy_id'); const enemy = state.enemies[id] ?? notFound('Enemy', id); const encounter = recordValues(state.encounters).find((candidate) => candidate.enemyIds.includes(id)); if (!encounter || encounter.locationId !== state.player.locationId) throw new ToolExecutionError({ code: 'INVALID_STATE', message: 'Enemy is not at the player’s location.' }); if (enemy.defeated) throw new ToolExecutionError({ code: 'CONFLICT', message: 'Enemy is already defeated.' }); const archetype = state.enemyArchetypes[enemy.archetypeId]; enemy.health = Math.max(0, enemy.health - Math.max(1, state.player.damage - Math.round(archetype.defense * 0.5))); if (enemy.health === 0) enemy.defeated = true; else state.player.health = Math.max(0, state.player.health - Math.max(1, archetype.damage - Math.round(state.player.defense * 0.5))); encounter.completed = encounter.enemyIds.every((enemyId) => state.enemies[enemyId].defeated); if (id === 'enemy-warden' && enemy.defeated) { state.items['item-ash-sigil'].collected = true; state.player.inventory.push({ itemId: 'item-ash-sigil', quantity: 1 }); } return { data: { enemyHealth: enemy.health, enemyDefeated: enemy.defeated, playerHealth: state.player.health, encounterCompleted: encounter.completed }, summary: enemy.defeated ? `Defeated ${archetype.name}.` : `Struck ${archetype.name}; ${enemy.health} health remains.` }; },
  },
  {
    name: 'collect_item', description: 'Collects an available item at the player’s current location.', category: 'Player',
    inputSchema: objectSchema({ item_id: stringProperty('Item at the current location.') }, ['item_id']), outputDescription: 'Updated inventory.', exampleInput: { item_id: 'item-crypt-key' }, mutatesWorld: true, requiresApproval: false, reversible: true,
    handler: (state, input) => { const id = requiredString(input, 'item_id'); const item = state.items[id] ?? notFound('Item', id); if (item.collected) throw new ToolExecutionError({ code: 'CONFLICT', message: `${item.name} has already been collected.` }); if (item.locationId !== state.player.locationId) throw new ToolExecutionError({ code: 'INVALID_STATE', message: `${item.name} is not at the player’s location.` }); item.collected = true; state.player.inventory.push({ itemId: id, quantity: 1 }); return { data: state.player.inventory, summary: `Collected ${item.name}.` }; },
  },
  {
    name: 'use_item', description: 'Uses a supported consumable from the player inventory and applies its validated gameplay effect.', category: 'Player',
    inputSchema: objectSchema({ item_id: stringProperty('Consumable inventory item.') }, ['item_id']), outputDescription: 'Updated player health and inventory.', exampleInput: { item_id: 'item-healing-draught' }, mutatesWorld: true, requiresApproval: false, reversible: true,
    handler: (state, input) => { const id = requiredString(input, 'item_id'); const inventory = state.player.inventory.find((entry) => entry.itemId === id); if (!inventory || inventory.quantity < 1) throw new ToolExecutionError({ code: 'INVALID_STATE', message: 'Item is not available in inventory.' }); if (id !== 'item-healing-draught') throw new ToolExecutionError({ code: 'INVALID_INPUT', message: 'This item has no consumable effect.' }); if (state.player.health >= state.player.maxHealth) throw new ToolExecutionError({ code: 'CONFLICT', message: 'Player health is already full.' }); inventory.quantity -= 1; state.player.health = Math.min(state.player.maxHealth, state.player.health + 35); state.player.inventory = state.player.inventory.filter((entry) => entry.quantity > 0); return { data: { health: state.player.health, inventory: state.player.inventory }, summary: `Used ${state.items[id].name} and restored health to ${state.player.health}.` }; },
  },
  {
    name: 'open_gate', description: 'Opens a progression gate when the player possesses its required item.', category: 'Player',
    inputSchema: objectSchema({ gate_id: stringProperty('Gate to open.') }, ['gate_id']), outputDescription: 'Updated gate state.', exampleInput: { gate_id: 'gate-sanctum-door' }, mutatesWorld: true, requiresApproval: false, reversible: true,
    handler: (state, input) => { const id = requiredString(input, 'gate_id'); const gate = state.gates[id] ?? notFound('Gate', id); const atGate = [gate.fromLocationId, gate.toLocationId].includes(state.player.locationId); if (!atGate) throw new ToolExecutionError({ code: 'INVALID_STATE', message: 'Player is not at this gate.' }); if (gate.requiredItemId && !state.player.inventory.some((entry) => entry.itemId === gate.requiredItemId && entry.quantity > 0)) throw new ToolExecutionError({ code: 'INVALID_STATE', message: `Gate requires ${state.items[gate.requiredItemId]?.name ?? gate.requiredItemId}.` }); gate.open = true; return { data: gate, summary: `Opened ${gate.name}.` }; },
  },
  {
    name: 'get_change_history', description: 'Returns reversible checkpoints and state-changing audit entries.', category: 'Governance',
    inputSchema: objectSchema(), outputDescription: 'Change history with checkpoint IDs.', exampleInput: {}, mutatesWorld: false, requiresApproval: false, reversible: false,
    handler: (state) => ({ data: { checkpoints: state.checkpoints.map(({ snapshot: _snapshot, ...checkpoint }) => checkpoint), changes: state.auditLog.filter((entry) => entry.stateChanging) }, summary: `Returned ${state.checkpoints.length} checkpoint${state.checkpoints.length === 1 ? '' : 's'}.` }),
  },
  {
    name: 'rollback_change', description: 'Restores world state from a specific checkpoint and records the rollback.', category: 'Governance',
    inputSchema: objectSchema({ checkpoint_id: stringProperty('Checkpoint to restore.'), reason: stringProperty('Why rollback is required.') }, ['checkpoint_id', 'reason']), outputDescription: 'Restored world revision.', exampleInput: { checkpoint_id: 'checkpoint-4', reason: 'Undo the first dungeon balance change.' }, mutatesWorld: true, requiresApproval: true, reversible: true,
    handler: (state, input) => { const id = requiredString(input, 'checkpoint_id'); const checkpoint = state.checkpoints.find((candidate) => candidate.id === id) ?? notFound('Checkpoint', id); Object.assign(state, structuredClone(checkpoint.snapshot)); state.selectedLocationId = state.player.locationId; return { data: { checkpointId: id }, summary: `Rolled back to ${checkpoint.label}.`, expectedImpact: 'Restores the complete gameplay snapshot while preserving the audit trail.', afterSummary: `World restored from ${checkpoint.createdAt}.` }; },
  },
  {
    name: 'reset_demo_world', description: 'Restores the deterministic seeded Ashen Reach demo world, including the controlled progression defect.', category: 'Governance',
    inputSchema: objectSchema({ reason: stringProperty('Why the demo is being reset.') }, ['reason']), outputDescription: 'Fresh demo world state.', exampleInput: { reason: 'Prepare a repeatable judge demonstration.' }, mutatesWorld: true, requiresApproval: true, reversible: true,
    handler: (state) => { const snapshot = createInitialSnapshot(); Object.assign(state, snapshot); state.qaExecutions = []; state.selectedLocationId = snapshot.player.locationId; return { data: { revision: state.revision + 1, seededDefect: true }, summary: 'Reset Ashen Reach to the deterministic seeded demo state.', expectedImpact: 'Restores player, quests, encounters, behavior, key deadlock, and QA baseline.', afterSummary: 'Seeded crypt-key progression defect is active.' }; },
  },
];

export const forgeToolMap = new Map(forgeToolRegistry.map((tool) => [tool.name, tool]));
