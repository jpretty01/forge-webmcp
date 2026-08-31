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

    while (playerHealth > 0 && enemyHealth.some((enemy) => enemy.health > 0) && turn < 80) {
      turn += 1;
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
