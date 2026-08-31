import type { ForgeState, QAIssue, QAExecution } from '@/types/domain';
import { runCombatSimulation } from '@/lib/simulation/combat';

function issue(
  id: string,
  severity: QAIssue['severity'],
  category: string,
  affectedEntityId: string,
  title: string,
  description: string,
  reproduction: string[],
  suggestedRemediation: string,
): QAIssue {
  return { id, severity, category, affectedEntityId, title, description, reproduction, suggestedRemediation, status: 'open' };
}

export function analyzeReachability(state: ForgeState) {
  const reachableLocations = new Set<string>([state.player.locationId]);
  const obtainableItems = new Set(
    state.player.inventory.filter((entry) => entry.quantity > 0).map((entry) => entry.itemId),
  );
  let changed = true;
  let steps = 0;

  while (changed && steps < 100) {
    changed = false;
    steps += 1;
    for (const locationId of reachableLocations) {
      const location = state.locations[locationId];
      for (const itemId of location.itemIds) {
        if (!state.items[itemId]?.collected && !obtainableItems.has(itemId)) {
          obtainableItems.add(itemId);
          changed = true;
        }
      }
      for (const destinationId of location.exits) {
        const gate = Object.values(state.gates).find(
          (candidate) =>
            (candidate.fromLocationId === locationId && candidate.toLocationId === destinationId)
            || (candidate.toLocationId === locationId && candidate.fromLocationId === destinationId),
        );
        const canPass = !gate || gate.open || !gate.requiredItemId || obtainableItems.has(gate.requiredItemId);
        if (canPass && !reachableLocations.has(destinationId)) {
          reachableLocations.add(destinationId);
          changed = true;
        }
      }
    }
  }

  return { reachableLocations, obtainableItems, steps };
}

export function validateWorldReferences(state: ForgeState): QAIssue[] {
  const issues: QAIssue[] = [];
  for (const quest of Object.values(state.quests)) {
    if (!state.npcs[quest.giverNpcId]) {
      issues.push(issue(`qa-missing-npc-${quest.id}`, 'high', 'Quest graph', quest.id, 'Missing quest giver', `${quest.name} references an NPC that does not exist.`, [quest.id, quest.giverNpcId], 'Assign an existing NPC as the quest giver.'));
    }
    if (!quest.stages.some((stage) => stage.id === quest.currentStageId)) {
      issues.push(issue(`qa-missing-current-stage-${quest.id}`, 'high', 'Quest graph', quest.id, 'Current quest stage is missing', `${quest.name} points to missing current stage ${quest.currentStageId}.`, [quest.id, quest.currentStageId], 'Set currentStageId to a stage in the quest graph.'));
    }
    for (const reward of quest.rewards) {
      if (reward.itemId && !state.items[reward.itemId]) {
        issues.push(issue(`qa-missing-reward-${quest.id}-${reward.itemId}`, 'high', 'Invalid reference', quest.id, 'Quest reward references a missing item', `${quest.name} rewards ${reward.itemId}, which does not exist.`, [quest.id, reward.itemId], 'Replace the reward with a valid item ID.'));
      }
    }
    for (const stage of quest.stages) {
      for (const requirement of stage.requirements) {
        const exists = requirement.type === 'item' ? Boolean(state.items[requirement.targetId])
          : requirement.type === 'location' ? Boolean(state.locations[requirement.targetId])
            : requirement.type === 'enemy_defeated' ? Boolean(state.enemies[requirement.targetId])
              : requirement.type === 'npc_state' ? Boolean(state.npcs[requirement.targetId])
                : Object.hasOwn(state.worldVariables, requirement.targetId);
        if (!exists) {
          issues.push(issue(`qa-missing-ref-${stage.id}-${requirement.targetId}`, 'high', 'Invalid reference', stage.id, 'Quest requirement references missing state', `${stage.title} cannot be completed because ${requirement.targetId} does not exist.`, [quest.id, stage.id, requirement.targetId], 'Replace the reference with a valid stable entity ID.'));
        }
      }
      for (const nextId of stage.nextStageIds) {
        if (!quest.stages.some((candidate) => candidate.id === nextId)) {
          issues.push(issue(`qa-broken-transition-${stage.id}`, 'high', 'Quest graph', quest.id, 'Broken quest transition', `${stage.title} points to missing stage ${nextId}.`, [quest.id, stage.id, nextId], 'Connect the stage to an existing quest stage.'));
        }
      }
    }
  }
  return issues;
}

export function findProgressionBlockers(state: ForgeState): QAIssue[] {
  const { reachableLocations, obtainableItems } = analyzeReachability(state);
  const issues: QAIssue[] = [];
  for (const gate of Object.values(state.gates)) {
    if (gate.open || !gate.requiredItemId || obtainableItems.has(gate.requiredItemId)) continue;
    const item = state.items[gate.requiredItemId];
    if (!item?.locationId || reachableLocations.has(item.locationId)) continue;
    issues.push(issue(
      `qa-circular-gate-${gate.id}`,
      'critical',
      'Progression deadlock', gate.id,
      'Required key is locked behind its own gate',
      `${item.name} is located in ${state.locations[item.locationId]?.name}, but ${gate.name} requires that key before the location can be reached.`,
      [state.player.locationId, gate.fromLocationId, `${gate.name} requires ${item.name}`, `${item.name} is in ${item.locationId}`],
      `Move ${item.name} to a reachable location before ${gate.name}.`,
    ));
  }
  return issues;
}

export function runQACampaign(state: ForgeState, runs = 500, seed = 1337): QAExecution {
  const referenceIssues = validateWorldReferences(state);
  const blockers = findProgressionBlockers(state);
  const combatIssues: QAIssue[] = [];

  for (const encounterId of state.dungeons['dungeon-forgotten-crypt'].encounterIds) {
    const result = runCombatSimulation(state, encounterId, Math.min(runs, 500), seed + encounterId.length);
    if (result.winProbability < 0.28) {
      combatIssues.push(issue(`qa-combat-brutal-${encounterId}`, 'high', 'Combat balance', encounterId, 'Encounter exceeds intended lethality', `Estimated player win probability is ${(result.winProbability * 100).toFixed(1)}%.`, [encounterId, `${runs} seeded combat simulations`], 'Reduce simultaneous pressure or delay reinforcements.'));
    }
    if (result.winProbability > 0.94) {
      combatIssues.push(issue(`qa-combat-trivial-${encounterId}`, 'medium', 'Combat balance', encounterId, 'Encounter provides little tactical pressure', `Estimated player win probability is ${(result.winProbability * 100).toFixed(1)}%.`, [encounterId, `${runs} seeded combat simulations`], 'Adjust composition or behavior without only increasing health.'));
    }
  }

  const issues = [...blockers, ...referenceIssues, ...combatIssues];
  const referenceCheckCount = Object.values(state.quests).reduce((count, quest) => count
    + 2
    + quest.rewards.filter((reward) => reward.itemId).length
    + quest.stages.reduce((stageCount, stage) => stageCount + stage.requirements.length + stage.nextStageIds.length, 0), 0);
  const progressionCheckCount = Object.keys(state.gates).length;
  const combatCheckCount = state.dungeons['dungeon-forgotten-crypt'].encounterIds.length;
  const checkCount = referenceCheckCount + progressionCheckCount + combatCheckCount;
  const failedCheckCount = new Set(
    issues
      .filter((candidate) => candidate.severity === 'critical' || candidate.severity === 'high')
      .map((candidate) => `${candidate.category}:${candidate.affectedEntityId}`),
  ).size;
  const reachability = analyzeReachability(state);
  return {
    id: `qa-${state.revision}-${seed}-${runs}`,
    kind: 'broad_campaign', seed, runs: checkCount,
    passCount: checkCount - failedCheckCount,
    failureCount: failedCheckCount,
    completionRate: (checkCount - failedCheckCount) / checkCount,
    averageCompletionSteps: reachability.steps,
    issues,
    simulationRuns: Math.min(runs, 500) * combatCheckCount,
    methodology: `${checkCount} deterministic reference, progression, and balance checks; ${Math.min(runs, 500).toLocaleString()} seeded combat trials per encounter. Medium-severity findings are reported as warnings, not failed checks.`,
    createdAt: new Date().toISOString(),
  };
}

export function runRegression(state: ForgeState, runs = 250, seed = 7331): QAExecution {
  const execution = runQACampaign(state, runs, seed);
  return { ...execution, id: `regression-${state.revision}-${seed}`, kind: 'regression' };
}
