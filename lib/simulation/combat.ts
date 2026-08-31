import type { ForgeState } from '@/types/domain';
import { createSeededRandom } from './random';

export interface CombatSimulationResult {
  encounterId: string;
  runs: number;
  seed: number;
  winProbability: number;
  averagePlayerHealthRemaining: number;
  averageCombatDuration: number;
  deathProbability: number;
  difficulty: 'trivial' | 'easy' | 'balanced' | 'hard' | 'brutal';
  problematicEnemies: string[];
  recommendations: string[];
}

export interface EncounterPressureCalibration {
  encounterId: string;
  requestedPressureIncrease: number;
  baselineWinProbability: number;
  projectedWinProbability: number;
  measuredPressureIncrease: number;
  parameters: Record<string, unknown>;
  runs: number;
  seed: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function runCombatSimulation(
  state: ForgeState,
  encounterId: string,
  runs = 250,
  seed = Number(state.worldVariables.demoSeed) || 1337,
): CombatSimulationResult {
  const encounter = state.encounters[encounterId];
  if (!encounter) throw new Error(`Encounter ${encounterId} was not found.`);
  if (!Number.isInteger(runs) || runs < 1 || runs > 2000) {
    throw new Error('Runs must be an integer between 1 and 2000.');
  }

  let wins = 0;
  let healthRemaining = 0;
  let totalTurns = 0;
  const threatScores = new Map<string, number>();

  for (let run = 0; run < runs; run += 1) {
    const random = createSeededRandom(seed + run * 7919);
    let playerHealth = state.player.maxHealth;
    let draughts = state.player.inventory.find((entry) => entry.itemId === 'item-healing-draught')?.quantity ?? 0;
    const enemyHealth = encounter.enemyIds
      .filter((enemyId) => !state.enemies[enemyId]?.defeated)
      .map((enemyId) => ({ enemyId, health: state.enemies[enemyId].health }));
    let turn = 0;

    let reinforcementsAdded = false;
    while (playerHealth > 0 && (enemyHealth.some((enemy) => enemy.health > 0) || (!reinforcementsAdded && encounter.reinforcementEnemyIds.length > 0)) && turn < 80) {
      turn += 1;
      if (!reinforcementsAdded && turn >= (encounter.reinforcementDelay ?? 3)) {
        for (const enemyId of encounter.reinforcementEnemyIds) {
          const enemy = state.enemies[enemyId];
          if (enemy && !enemy.defeated) enemyHealth.push({ enemyId, health: enemy.health });
        }
        reinforcementsAdded = true;
      }
      if (playerHealth < state.player.maxHealth * 0.33 && draughts > 0) {
        playerHealth = Math.min(state.player.maxHealth, playerHealth + 35);
        draughts -= 1;
      } else {
        const target = enemyHealth.find((enemy) => enemy.health > 0);
        if (target) {
          const archetype = state.enemyArchetypes[state.enemies[target.enemyId].archetypeId];
          const variance = 0.82 + random() * 0.36;
          target.health -= Math.max(1, Math.round((state.player.damage - archetype.defense * 0.55) * variance));
        }
      }

      for (const active of enemyHealth.filter((enemy) => enemy.health > 0)) {
        const instance = state.enemies[active.enemyId];
        const archetype = state.enemyArchetypes[instance.archetypeId];
        const behavior = state.enemyBehaviors[instance.behaviorProfileId];
        const accuracy = clamp(0.56 + behavior.aggression * 0.2 + behavior.coordination * 0.13, 0.4, 0.92);
        if (random() <= accuracy) {
          const special = random() < behavior.specialAttackFrequency;
          const rangedPressure = archetype.range === 'ranged' ? 1.08 : 1;
          const coordination = 1 + behavior.coordination * Math.max(0, enemyHealth.filter((enemy) => enemy.health > 0).length - 1) * 0.08;
          const damage = Math.max(1, (archetype.damage * (special ? 1.45 : 1) * rangedPressure * coordination) - state.player.defense * 0.62);
          playerHealth -= Math.round(damage * (0.84 + random() * 0.3));
          threatScores.set(archetype.name, (threatScores.get(archetype.name) ?? 0) + damage);
        }
      }
    }

    const playerWon = playerHealth > 0 && enemyHealth.every((enemy) => enemy.health <= 0);
    if (playerWon) wins += 1;
    healthRemaining += Math.max(0, playerHealth);
    totalTurns += turn;
  }

  const winProbability = wins / runs;
  const difficulty = winProbability >= 0.92 ? 'trivial'
    : winProbability >= 0.78 ? 'easy'
      : winProbability >= 0.55 ? 'balanced'
        : winProbability >= 0.3 ? 'hard'
          : 'brutal';
  const problematicEnemies = [...threatScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name]) => name);
  const recommendations: string[] = [];
  if (winProbability > 0.72) recommendations.push('Increase tactical pressure through composition, positioning, or reinforcement timing.');
  if (winProbability < 0.5) recommendations.push('Reduce simultaneous pressure or provide a clearer counterplay window.');
  if (problematicEnemies.some((name) => name.includes('Archer'))) recommendations.push('Preserve line-of-sight counterplay when adding ranged pressure.');
  if (recommendations.length === 0) recommendations.push('Encounter performance is inside the target difficulty band.');

  return {
    encounterId,
    runs,
    seed,
    winProbability,
    averagePlayerHealthRemaining: healthRemaining / runs,
    averageCombatDuration: totalTurns / runs,
    deathProbability: 1 - winProbability,
    difficulty,
    problematicEnemies,
    recommendations,
  };
}

export function calibrateEncounterPressure(
  state: ForgeState,
  encounterId: string,
  requestedPressureIncrease = 0.25,
  runs = 1000,
  seed = 1337,
): EncounterPressureCalibration {
  const encounter = state.encounters[encounterId];
  if (!encounter) throw new Error(`Encounter ${encounterId} was not found.`);
  const baseline = runCombatSimulation(state, encounterId, runs, seed).winProbability;
  const candidates: EncounterPressureCalibration[] = [];

  for (const archetype of Object.values(state.enemyArchetypes)) {
    const behavior = Object.values(state.enemyBehaviors).find((candidate) => candidate.enemyArchetypeId === archetype.id);
    if (!behavior) continue;
    for (const mode of ['primary', 'reinforcement'] as const) {
      const delays = mode === 'reinforcement' ? [2, 3, 4, 5, 6, 8, 10] : [0];
      for (const delay of delays) {
        const candidateState = structuredClone(state);
        const candidateEncounter = candidateState.encounters[encounterId];
        const enemyId = `calibration-${mode}-${archetype.id}-${delay}`;
        candidateState.enemies[enemyId] = {
          id: enemyId,
          archetypeId: archetype.id,
          behaviorProfileId: behavior.id,
          health: archetype.maxHealth,
          defeated: false,
          position: { x: 68, y: 32 },
        };
        if (mode === 'primary') candidateEncounter.enemyIds.push(enemyId);
        else {
          candidateEncounter.reinforcementEnemyIds.push(enemyId);
          candidateEncounter.reinforcementDelay = delay;
        }
        const projected = runCombatSimulation(candidateState, encounterId, runs, seed).winProbability;
        const parameters: Record<string, unknown> = mode === 'primary'
          ? { add_enemy_archetype_id: archetype.id }
          : { add_reinforcement_archetype_id: archetype.id, reinforcement_delay: delay };
        candidates.push({
          encounterId,
          requestedPressureIncrease,
          baselineWinProbability: baseline,
          projectedWinProbability: projected,
          measuredPressureIncrease: baseline - projected,
          parameters,
          runs,
          seed,
        });
      }
    }
  }

  const best = candidates.sort((left, right) => {
    const leftError = Math.abs(left.measuredPressureIncrease - requestedPressureIncrease);
    const rightError = Math.abs(right.measuredPressureIncrease - requestedPressureIncrease);
    return leftError - rightError || Object.keys(left.parameters).length - Object.keys(right.parameters).length;
  })[0];
  if (!best) throw new Error(`No safe calibration candidate exists for ${encounter.name}.`);
  return best;
}
