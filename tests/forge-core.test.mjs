import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let server;
let createInitialForgeState;
let executeForgeTool;
let approveProposal;
let rejectProposal;
let hydrateForgeState;
let runCombatSimulation;
let calibrateEncounterPressure;
let findProgressionBlockers;
let forgeToolRegistry;

before(async () => {
  server = await createServer({
    root,
    configFile: false,
    appType: 'custom',
    server: { middlewareMode: true },
    resolve: { alias: { '@': root } },
  });
  ({ createInitialForgeState } = await server.ssrLoadModule('/data/initial-world.ts'));
  ({ executeForgeTool, approveProposal, rejectProposal, hydrateForgeState } = await server.ssrLoadModule('/lib/game/service.ts'));
  ({ runCombatSimulation, calibrateEncounterPressure } = await server.ssrLoadModule('/lib/simulation/combat.ts'));
  ({ findProgressionBlockers } = await server.ssrLoadModule('/lib/qa/engine.ts'));
  ({ forgeToolRegistry } = await server.ssrLoadModule('/lib/webmcp/registry.ts'));
});

after(async () => {
  await server?.close();
});

test('seeded Ashen Reach state contains the complete demonstration cast and dungeon', () => {
  const state = createInitialForgeState();
  assert.equal(state.worldVariables.worldName, 'Ashen Reach');
  assert.equal(state.player.level, 3);
  assert.equal(Object.keys(state.npcs).length, 4);
  assert.equal(Object.keys(state.enemyArchetypes).length, 4);
  assert.ok(state.dungeons['dungeon-forgotten-crypt']);
  assert.ok(state.quests['quest-blacksmith-daughter']);
});

test('progression analysis discovers the seeded crypt-key circular dependency', () => {
  const issues = findProgressionBlockers(createInitialForgeState());
  assert.equal(issues.length, 1);
  assert.equal(issues[0].severity, 'critical');
  assert.equal(issues[0].affectedEntityId, 'gate-sanctum-door');
});

test('PROPOSE mode preserves world state until a human approves the repair', () => {
  const initial = createInitialForgeState();
  const proposed = executeForgeTool(initial, 'modify_item_spawn', {
    item_id: 'item-crypt-key', new_location_id: 'loc-crypt-entry', reason: 'Repair circular progression.',
  });
  assert.equal(proposed.result.ok, true);
  assert.ok(proposed.result.proposalId);
  assert.equal(proposed.state.items['item-crypt-key'].locationId, 'loc-crypt-sanctum');
  const approved = approveProposal(proposed.state, proposed.result.proposalId);
  assert.equal(approved.result.ok, true);
  assert.equal(approved.state.items['item-crypt-key'].locationId, 'loc-crypt-entry');
  assert.equal(findProgressionBlockers(approved.state).length, 0);
});

test('OBSERVE mode denies world mutations in the service layer', () => {
  const state = createInitialForgeState();
  state.permissionMode = 'observe';
  const result = executeForgeTool(state, 'modify_enemy_behavior', {
    behavior_id: 'behavior-archer', coordination: 0.9, reason: 'Test denial.',
  });
  assert.equal(result.result.ok, false);
  assert.equal(result.result.error.code, 'PERMISSION_DENIED');
  assert.equal(result.state.enemyBehaviors['behavior-archer'].coordination, 0.55);
});

test('encounter composition change is reversible and does not inflate enemy health', () => {
  const state = createInitialForgeState();
  const originalHealth = state.enemyArchetypes['arch-crypt-archer'].maxHealth;
  const proposed = executeForgeTool(state, 'modify_encounter', {
    encounter_id: 'enc-gallery', add_enemy_archetype_id: 'arch-crypt-archer',
    difficulty_target: 0.65, hazard: 'timed falling braziers', reason: 'Increase tactical pressure.',
  });
  const approved = approveProposal(proposed.state, proposed.result.proposalId);
  assert.equal(approved.state.encounters['enc-gallery'].enemyIds.length, 3);
  assert.equal(approved.state.enemyArchetypes['arch-crypt-archer'].maxHealth, originalHealth);
  assert.ok(approved.state.checkpoints.length > 0);
});

test('proposal rejection changes no gameplay state and is audited', () => {
  const state = createInitialForgeState();
  const proposed = executeForgeTool(state, 'modify_item_spawn', {
    item_id: 'item-crypt-key', new_location_id: 'loc-crypt-entry', reason: 'Candidate fix.',
  });
  const rejected = rejectProposal(proposed.state, proposed.result.proposalId);
  assert.equal(rejected.items['item-crypt-key'].locationId, 'loc-crypt-sanctum');
  assert.equal(rejected.proposals[0].status, 'rejected');
  assert.equal(rejected.auditLog[0].approvalStatus, 'rejected');
});

test('combat simulation is deterministic and behavior-sensitive', () => {
  const state = createInitialForgeState();
  const first = runCombatSimulation(state, 'enc-gallery', 200, 9001);
  const second = runCombatSimulation(state, 'enc-gallery', 200, 9001);
  assert.deepEqual(first, second);
  state.enemyBehaviors['behavior-archer'].coordination = 1;
  state.enemyBehaviors['behavior-archer'].specialAttackFrequency = 0.8;
  const harder = runCombatSimulation(state, 'enc-gallery', 200, 9001);
  assert.ok(harder.winProbability <= first.winProbability);
});

test('pressure calibration searches measured candidates near the requested target', () => {
  const state = createInitialForgeState();
  const calibration = calibrateEncounterPressure(state, 'enc-gallery', 0.25, 2000, 1337);
  assert.ok(Math.abs(calibration.measuredPressureIncrease - 0.25) <= 0.03);
  assert.equal(calibration.baselineWinProbability, 1);
  assert.ok(calibration.projectedWinProbability > 0.7 && calibration.projectedWinProbability < 0.8);
  assert.ok(calibration.parameters.add_reinforcement_archetype_id);
  assert.ok(calibration.parameters.reinforcement_delay);
});

test('deterministic playthrough metrics fail truthfully instead of fabricating partial counts', () => {
  const result = executeForgeTool(createInitialForgeState(), 'run_playthrough', { runs: 100, seed: 1337 });
  assert.equal(result.result.ok, true);
  assert.equal(result.result.data.passCount, 0);
  assert.equal(result.result.data.failureCount, 100);
  assert.match(result.result.data.methodology, /not independent player-behavior samples/);
});

test('regression passes the progression layer after the narrow repair', () => {
  let state = createInitialForgeState();
  state.permissionMode = 'autonomous';
  state = executeForgeTool(state, 'modify_item_spawn', {
    item_id: 'item-crypt-key', new_location_id: 'loc-crypt-entry', reason: 'Repair seeded defect.',
  }).state;
  const regression = executeForgeTool(state, 'run_regression', { runs: 250, seed: 7331 });
  assert.equal(regression.result.ok, true);
  assert.equal(regression.state.qaExecutions[0].failureCount, 0);
  assert.equal(regression.state.qaExecutions[0].issues.some((entry) => entry.category === 'Progression deadlock'), false);
});

test('checkpoint rollback restores the full gameplay snapshot', () => {
  const state = createInitialForgeState();
  state.permissionMode = 'autonomous';
  const moved = executeForgeTool(state, 'move_player', { location_id: 'loc-cemetery-road' });
  assert.equal(moved.state.player.locationId, 'loc-cemetery-road');
  const checkpointId = moved.state.auditLog[0].checkpointId;
  const rolledBack = executeForgeTool(moved.state, 'rollback_change', { checkpoint_id: checkpointId, reason: 'Verify rollback.' }, { approved: true });
  assert.equal(rolledBack.result.ok, true);
  assert.equal(rolledBack.state.player.locationId, 'loc-greyhaven');
});

test('demo reset restores the seeded defect after repairs', () => {
  let state = createInitialForgeState();
  state.permissionMode = 'autonomous';
  state = executeForgeTool(state, 'modify_item_spawn', { item_id: 'item-crypt-key', new_location_id: 'loc-crypt-entry', reason: 'Repair.' }).state;
  const reset = executeForgeTool(state, 'reset_demo_world', { reason: 'Repeat demo.' }, { approved: true });
  assert.equal(reset.state.items['item-crypt-key'].locationId, 'loc-crypt-sanctum');
  assert.equal(findProgressionBlockers(reset.state).length, 1);
});

test('registry exposes unique, described, atomic WebMCP tools', () => {
  assert.ok(forgeToolRegistry.length >= 18);
  assert.ok(forgeToolRegistry.length <= 30);
  assert.equal(new Set(forgeToolRegistry.map((tool) => tool.name)).size, forgeToolRegistry.length);
  for (const tool of forgeToolRegistry) {
    assert.ok(tool.description.length > 20);
    assert.equal(tool.inputSchema.type, 'object');
  }
});

test('closed schemas reject oversized and unexpected agent input before proposal creation', () => {
  const oversized = executeForgeTool(createInitialForgeState(), 'modify_item_spawn', {
    item_id: 'item-crypt-key', new_location_id: 'loc-crypt-entry', reason: 'x'.repeat(501),
  });
  assert.equal(oversized.result.ok, false);
  assert.equal(oversized.result.error.code, 'INVALID_INPUT');
  assert.equal(oversized.state.proposals.length, 0);

  const unexpected = executeForgeTool(createInitialForgeState(), 'create_quest', {
    quest: {
      id: 'quest-invalid', name: 'Invalid', level: 3, summary: 'Invalid nested input.', giverNpcId: 'npc-garrick',
      currentStageId: 'stage-one', status: 'available', stages: [{ id: 'stage-one', title: 'One', description: 'One.', requirements: [], nextStageIds: [], injected: true }], rewards: [],
    },
    reason: 'Verify closed nested schema.',
  });
  assert.equal(unexpected.result.ok, false);
  assert.equal(unexpected.result.error.code, 'INVALID_INPUT');
});

test('revision-zero persisted state hydrates without losing QA or audit evidence', () => {
  const state = createInitialForgeState();
  state.revision = 0;
  state.auditLog.push({ id: 'audit-zero', timestamp: new Date(0).toISOString(), toolName: 'get_world_state', category: 'World', source: 'webmcp-agent', parameters: {}, permissionMode: 'propose', approvalStatus: 'not_required', success: true, stateChanging: false, summary: 'Persisted evidence.' });
  const hydrated = hydrateForgeState(state);
  assert.equal(hydrated.revision, 0);
  assert.equal(hydrated.auditLog[0].id, 'audit-zero');
});

test('activity records preserve native-agent provenance', () => {
  const execution = executeForgeTool(createInitialForgeState(), 'get_world_state', {}, { source: 'webmcp-agent' });
  assert.equal(execution.state.activities[0].source, 'webmcp-agent');
});

test('invalid stable IDs fail closed and create a failed audit record', () => {
  const result = executeForgeTool(createInitialForgeState(), 'get_location_state', { location_id: 'loc-does-not-exist' });
  assert.equal(result.result.ok, false);
  assert.equal(result.result.error.code, 'NOT_FOUND');
  assert.equal(result.state.auditLog[0].success, false);
});

test('primary rescue flow completes through real game services', () => {
  let state = createInitialForgeState();
  state.permissionMode = 'autonomous';
  state = executeForgeTool(state, 'interact_npc', { npc_id: 'npc-garrick' }).state;
  assert.equal(state.quests['quest-blacksmith-daughter'].status, 'active');
  state = executeForgeTool(state, 'modify_item_spawn', { item_id: 'item-crypt-key', new_location_id: 'loc-crypt-entry', reason: 'Repair.' }).state;
  state = executeForgeTool(state, 'move_player', { location_id: 'loc-cemetery-road' }).state;
  state = executeForgeTool(state, 'move_player', { location_id: 'loc-crypt-entry' }).state;
  state = executeForgeTool(state, 'collect_item', { item_id: 'item-crypt-key' }).state;
  state = executeForgeTool(state, 'move_player', { location_id: 'loc-crypt-gallery' }).state;
  state = executeForgeTool(state, 'open_gate', { gate_id: 'gate-sanctum-door' }).state;
  state = executeForgeTool(state, 'move_player', { location_id: 'loc-crypt-sanctum' }).state;
  while (!state.enemies['enemy-warden'].defeated && state.player.health > 0) {
    if (state.player.health < 35 && state.player.inventory.some((entry) => entry.itemId === 'item-healing-draught')) {
      state = executeForgeTool(state, 'use_item', { item_id: 'item-healing-draught' }).state;
    }
    state = executeForgeTool(state, 'attack_enemy', { enemy_id: 'enemy-warden' }).state;
  }
  assert.equal(state.enemies['enemy-warden'].defeated, true);
  state = executeForgeTool(state, 'interact_npc', { npc_id: 'npc-mira' }).state;
  assert.equal(state.worldVariables.miraRescued, true);
  assert.equal(state.quests['quest-blacksmith-daughter'].status, 'completed');
});
