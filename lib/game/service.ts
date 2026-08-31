import { createInitialForgeState } from '@/data/initial-world';
import { forgeToolMap, ToolExecutionError } from '@/lib/webmcp/registry';
import type { AgentProposal, AuditEntry, ForgeState, ToolResult, WorldSnapshot } from '@/types/domain';

function now() {
  return new Date().toISOString();
}

function snapshot(state: ForgeState): WorldSnapshot {
  return structuredClone({
    player: state.player,
    locations: state.locations,
    npcs: state.npcs,
    items: state.items,
    quests: state.quests,
    enemyArchetypes: state.enemyArchetypes,
    enemyBehaviors: state.enemyBehaviors,
    enemies: state.enemies,
    encounters: state.encounters,
    gates: state.gates,
    dungeons: state.dungeons,
    worldVariables: state.worldVariables,
  });
}

function nextId(state: ForgeState, prefix: string) {
  return `${prefix}-${state.revision + 1}-${state.auditLog.length + state.activities.length + 1}`;
}

function requirementMet(state: ForgeState, requirement: ForgeState['quests'][string]['stages'][number]['requirements'][number]) {
  if (requirement.type === 'location') return state.player.locationId === requirement.targetId;
  if (requirement.type === 'item') return state.player.inventory.some((entry) => entry.itemId === requirement.targetId && entry.quantity > 0);
  if (requirement.type === 'enemy_defeated') return Boolean(state.enemies[requirement.targetId]?.defeated);
  if (requirement.type === 'npc_state') return state.npcs[requirement.targetId]?.state === requirement.value;
  return state.worldVariables[requirement.targetId] === requirement.value;
}

function advanceQuestProgress(state: ForgeState) {
  for (const questId of state.player.activeQuestIds) {
    const quest = state.quests[questId];
    if (!quest || quest.status !== 'active') continue;
    let guard = 0;
    while (guard < quest.stages.length) {
      guard += 1;
      const stage = quest.stages.find((candidate) => candidate.id === quest.currentStageId);
      if (!stage || !stage.requirements.every((requirement) => requirementMet(state, requirement))) break;
      const nextStageId = stage.nextStageIds[0];
      if (nextStageId) {
        quest.currentStageId = nextStageId;
        continue;
      }
      quest.status = 'completed';
      state.player.activeQuestIds = state.player.activeQuestIds.filter((id) => id !== quest.id);
      if (!state.player.completedQuestIds.includes(quest.id)) state.player.completedQuestIds.push(quest.id);
      for (const reward of quest.rewards) {
        if (reward.experience) state.player.experience += reward.experience;
        if (reward.itemId && !state.player.inventory.some((entry) => entry.itemId === reward.itemId)) {
          state.player.inventory.push({ itemId: reward.itemId, quantity: 1 });
          if (state.items[reward.itemId]) state.items[reward.itemId].collected = true;
        }
      }
      break;
    }
  }
}

function appendActivity(state: ForgeState, toolName: string, category: string, status: ForgeState['activities'][number]['status'], summary: string) {
  state.activities.unshift({ id: nextId(state, 'activity'), toolName, category, status, summary, timestamp: now() });
  state.activities = state.activities.slice(0, 40);
}

function appendAudit(state: ForgeState, entry: Omit<AuditEntry, 'id' | 'timestamp'>) {
  const audit: AuditEntry = { ...entry, id: nextId(state, 'audit'), timestamp: now() };
  state.auditLog.unshift(audit);
  return audit;
}

export interface ExecuteOptions {
  source?: string;
  approved?: boolean;
  bypassProposal?: boolean;
}

export function executeForgeTool(
  currentState: ForgeState,
  toolName: string,
  parameters: Record<string, unknown> = {},
  options: ExecuteOptions = {},
): { state: ForgeState; result: ToolResult } {
  const state = structuredClone(currentState);
  const tool = forgeToolMap.get(toolName);
  const source = options.source ?? 'webmcp-agent';

  if (!tool) {
    return { state, result: { ok: false, error: { code: 'NOT_FOUND', message: `Tool ${toolName} is not registered.` }, summary: `Unknown tool ${toolName}.` } };
  }

  if (tool.mutatesWorld && state.permissionMode === 'observe' && !options.approved) {
    const audit = appendAudit(state, { toolName, category: tool.category, source, parameters, reason: typeof parameters.reason === 'string' ? parameters.reason : undefined, permissionMode: state.permissionMode, approvalStatus: 'not_required', success: false, stateChanging: true, summary: 'Denied by OBSERVE mode.' });
    appendActivity(state, toolName, tool.category, 'failed', 'Permission denied in OBSERVE mode.');
    return { state, result: { ok: false, error: { code: 'PERMISSION_DENIED', message: 'OBSERVE mode denies state-changing tools.' }, auditEntryId: audit.id, summary: 'Permission denied in OBSERVE mode.' } };
  }

  if (tool.mutatesWorld && tool.requiresApproval && state.permissionMode === 'propose' && !options.approved && !options.bypassProposal) {
    const proposal: AgentProposal = {
      id: nextId(state, 'proposal'),
      toolName,
      reason: typeof parameters.reason === 'string' ? parameters.reason : 'Agent-requested world change.',
      parameters: structuredClone(parameters),
      expectedImpact: tool.description,
      beforeSummary: `World revision ${state.revision}; ${tool.category.toLowerCase()} state unchanged.`,
      afterSummary: 'Pending validated execution after human approval.',
      reversible: tool.reversible,
      status: 'pending',
      createdAt: now(),
    };
    state.proposals.unshift(proposal);
    const audit = appendAudit(state, { toolName, category: tool.category, source, parameters, reason: proposal.reason, permissionMode: state.permissionMode, approvalStatus: 'pending', success: true, stateChanging: true, summary: 'Proposal created; world state unchanged.' });
    appendActivity(state, toolName, tool.category, 'awaiting_approval', proposal.reason);
    return { state, result: { ok: true, data: proposal, proposalId: proposal.id, auditEntryId: audit.id, summary: `Proposal ${proposal.id} is awaiting human approval.` } };
  }

  let checkpointId: string | undefined;
  if (tool.mutatesWorld && tool.reversible) {
    checkpointId = nextId(state, 'checkpoint');
    state.checkpoints.unshift({ id: checkpointId, createdAt: now(), label: `Before ${toolName}`, toolName, snapshot: snapshot(state) });
    state.checkpoints = state.checkpoints.slice(0, 30);
  }

  try {
    const execution = tool.handler(state, parameters);
    if (tool.mutatesWorld) advanceQuestProgress(state);
    if (tool.mutatesWorld) state.revision += 1;
    const audit = appendAudit(state, { toolName, category: tool.category, source, parameters, reason: typeof parameters.reason === 'string' ? parameters.reason : undefined, permissionMode: state.permissionMode, approvalStatus: options.approved ? 'approved' : 'not_required', success: true, stateChanging: tool.mutatesWorld, checkpointId, summary: execution.summary });
    appendActivity(state, toolName, tool.category, 'completed', execution.summary);
    return { state, result: { ok: true, data: execution.data, auditEntryId: audit.id, summary: execution.summary } };
  } catch (error) {
    if (checkpointId) state.checkpoints = state.checkpoints.filter((checkpoint) => checkpoint.id !== checkpointId);
    const shape = error instanceof ToolExecutionError
      ? error.shape
      : { code: 'INVALID_STATE' as const, message: error instanceof Error ? error.message : 'Tool execution failed.' };
    const audit = appendAudit(state, { toolName, category: tool.category, source, parameters, reason: typeof parameters.reason === 'string' ? parameters.reason : undefined, permissionMode: state.permissionMode, approvalStatus: options.approved ? 'approved' : 'not_required', success: false, stateChanging: tool.mutatesWorld, summary: shape.message });
    appendActivity(state, toolName, tool.category, 'failed', shape.message);
    return { state, result: { ok: false, error: shape, auditEntryId: audit.id, summary: shape.message } };
  }
}

export function approveProposal(currentState: ForgeState, proposalId: string, modifiedParameters?: Record<string, unknown>) {
  const proposal = currentState.proposals.find((candidate) => candidate.id === proposalId);
  if (!proposal || proposal.status !== 'pending') {
    return { state: currentState, result: { ok: false, error: { code: 'NOT_FOUND' as const, message: 'Pending proposal was not found.' }, summary: 'Pending proposal was not found.' } };
  }
  const execution = executeForgeTool(currentState, proposal.toolName, modifiedParameters ?? proposal.parameters, { source: 'human-approval', approved: true });
  execution.state.proposals = execution.state.proposals.map((candidate) => candidate.id === proposalId ? { ...candidate, status: execution.result.ok ? 'approved' : candidate.status } : candidate);
  return execution;
}

export function rejectProposal(currentState: ForgeState, proposalId: string) {
  const state = structuredClone(currentState);
  const proposal = state.proposals.find((candidate) => candidate.id === proposalId);
  if (!proposal || proposal.status !== 'pending') return state;
  proposal.status = 'rejected';
  appendAudit(state, { toolName: proposal.toolName, category: forgeToolMap.get(proposal.toolName)?.category ?? 'Governance', source: 'human-approval', parameters: proposal.parameters, reason: proposal.reason, permissionMode: state.permissionMode, approvalStatus: 'rejected', success: true, stateChanging: true, summary: 'Proposal rejected; world state unchanged.' });
  appendActivity(state, proposal.toolName, forgeToolMap.get(proposal.toolName)?.category ?? 'Governance', 'rejected', 'Human rejected the proposed change.');
  return state;
}

export function updateProposalParameters(currentState: ForgeState, proposalId: string, parameters: Record<string, unknown>) {
  const state = structuredClone(currentState);
  const proposal = state.proposals.find((candidate) => candidate.id === proposalId && candidate.status === 'pending');
  if (proposal) proposal.parameters = structuredClone(parameters);
  return state;
}

export function hydrateForgeState(value: unknown): ForgeState {
  if (!value || typeof value !== 'object') return createInitialForgeState();
  const candidate = value as Partial<ForgeState>;
  if (!candidate.player || !candidate.locations || !candidate.quests || !candidate.revision) return createInitialForgeState();
  return candidate as ForgeState;
}
