export type PermissionMode = 'observe' | 'propose' | 'autonomous';
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type ActivityStatus =
  | 'running'
  | 'completed'
  | 'awaiting_approval'
  | 'failed'
  | 'rejected';

export interface Location {
  id: string;
  name: string;
  kind: 'town' | 'wilds' | 'dungeon';
  description: string;
  exits: string[];
  npcIds: string[];
  encounterIds: string[];
  itemIds: string[];
  lockedByGateId?: string;
}

export interface Player {
  id: string;
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  damage: number;
  defense: number;
  locationId: string;
  inventory: Array<{ itemId: string; quantity: number }>;
  activeQuestIds: string[];
  completedQuestIds: string[];
  experience: number;
}

export interface NPC {
  id: string;
  name: string;
  role: string;
  locationId: string;
  dialogue: string[];
  questIds: string[];
  state: 'available' | 'missing' | 'rescued';
}

export interface Item {
  id: string;
  name: string;
  kind: 'key' | 'weapon' | 'consumable' | 'quest' | 'loot';
  description: string;
  locationId?: string;
  collected: boolean;
  requiredForGateId?: string;
}

export interface QuestRequirement {
  type: 'item' | 'location' | 'enemy_defeated' | 'npc_state' | 'world_variable';
  targetId: string;
  value?: string | number | boolean;
}

export interface QuestStage {
  id: string;
  title: string;
  description: string;
  requirements: QuestRequirement[];
  nextStageIds: string[];
}

export interface Quest {
  id: string;
  name: string;
  level: number;
  summary: string;
  giverNpcId: string;
  stages: QuestStage[];
  currentStageId: string;
  status: 'available' | 'active' | 'completed';
  rewards: Array<{ itemId?: string; experience?: number }>;
  endings?: string[];
}

export interface EnemyArchetype {
  id: string;
  name: string;
  maxHealth: number;
  damage: number;
  defense: number;
  range: 'melee' | 'ranged';
  ability: string;
}

export interface EnemyBehaviorProfile {
  id: string;
  enemyArchetypeId: string;
  aggression: number;
  preferredDistance: number;
  retreatThreshold: number;
  coordination: number;
  targetPriority: 'nearest' | 'lowest_health' | 'quest_carrier';
  reinforcementDelay: number;
  specialAttackFrequency: number;
  patrol: boolean;
}

export interface EnemyInstance {
  id: string;
  archetypeId: string;
  behaviorProfileId: string;
  health: number;
  defeated: boolean;
  position: { x: number; y: number };
}

export interface Encounter {
  id: string;
  name: string;
  locationId: string;
  enemyIds: string[];
  difficultyTarget: number;
  reinforcementEnemyIds: string[];
  reinforcementDelay?: number;
  hazard?: string;
  completed: boolean;
}

export interface ProgressionGate {
  id: string;
  name: string;
  fromLocationId: string;
  toLocationId: string;
  requiredItemId?: string;
  open: boolean;
}

export interface Dungeon {
  id: string;
  name: string;
  roomIds: string[];
  encounterIds: string[];
  gateIds: string[];
  bossEnemyId: string;
  difficultyTarget: { minWinRate: number; maxWinRate: number };
  completed: boolean;
}

export interface QAIssue {
  id: string;
  severity: Severity;
  category: string;
  affectedEntityId: string;
  title: string;
  description: string;
  reproduction: string[];
  suggestedRemediation: string;
  status: 'open' | 'resolved';
}

export interface QAExecution {
  id: string;
  kind: string;
  seed: number;
  runs: number;
  passCount: number;
  failureCount: number;
  completionRate: number;
  averageCompletionSteps: number;
  issues: QAIssue[];
  createdAt: string;
  methodology?: string;
  simulationRuns?: number;
}

export interface AgentProposal {
  id: string;
  toolName: string;
  reason: string;
  parameters: Record<string, unknown>;
  expectedImpact: string;
  beforeSummary: string;
  afterSummary: string;
  reversible: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  toolName: string;
  category: string;
  source: string;
  parameters: Record<string, unknown>;
  reason?: string;
  permissionMode: PermissionMode;
  approvalStatus: 'not_required' | 'pending' | 'approved' | 'rejected';
  success: boolean;
  stateChanging: boolean;
  checkpointId?: string;
  summary: string;
}

export interface AgentActivity {
  id: string;
  toolName: string;
  category: string;
  source?: string;
  status: ActivityStatus;
  summary: string;
  timestamp: string;
}

export interface WorldSnapshot {
  player: Player;
  locations: Record<string, Location>;
  npcs: Record<string, NPC>;
  items: Record<string, Item>;
  quests: Record<string, Quest>;
  enemyArchetypes: Record<string, EnemyArchetype>;
  enemyBehaviors: Record<string, EnemyBehaviorProfile>;
  enemies: Record<string, EnemyInstance>;
  encounters: Record<string, Encounter>;
  gates: Record<string, ProgressionGate>;
  dungeons: Record<string, Dungeon>;
  worldVariables: Record<string, string | number | boolean>;
}

export interface Checkpoint {
  id: string;
  createdAt: string;
  label: string;
  toolName: string;
  snapshot: WorldSnapshot;
}

export interface ForgeState extends WorldSnapshot {
  revision: number;
  permissionMode: PermissionMode;
  proposals: AgentProposal[];
  auditLog: AuditEntry[];
  checkpoints: Checkpoint[];
  qaExecutions: QAExecution[];
  activities: AgentActivity[];
  selectedLocationId: string;
  selectedTab: 'world' | 'qa' | 'audit' | 'proposals';
}

export interface ToolErrorShape {
  code:
    | 'NOT_FOUND'
    | 'INVALID_INPUT'
    | 'PERMISSION_DENIED'
    | 'APPROVAL_REQUIRED'
    | 'INVALID_STATE'
    | 'VALIDATION_FAILED'
    | 'CONFLICT'
    | 'SIMULATION_FAILED';
  message: string;
  details?: unknown;
}

export interface ToolResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: ToolErrorShape;
  proposalId?: string;
  auditEntryId?: string;
  summary: string;
}
