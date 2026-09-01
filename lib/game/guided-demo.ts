import type { AgentProposal, ForgeState, QAExecution } from '@/types/domain';

export function currentDemoRunId(state: Pick<ForgeState, 'demoRunNumber'>) {
  return `run-${state.demoRunNumber}`;
}

export interface GuidedDemoProgress {
  runId: string;
  nativeInspection: boolean;
  repairProposal?: AgentProposal;
  repairApproved: boolean;
  provingRegression?: QAExecution;
  regressionPassed: boolean;
}

export function getGuidedDemoProgress(state: ForgeState): GuidedDemoProgress {
  const runId = currentDemoRunId(state);
  const nativeInspection = state.auditLog.some(
    (entry) =>
      entry.runId === runId &&
      entry.source === 'webmcp-agent' &&
      entry.toolName === 'find_progression_blockers' &&
      entry.success,
  );
  const repairProposal = state.proposals.find(
    (proposal) =>
      proposal.runId === runId && proposal.toolName === 'modify_item_spawn',
  );
  const repairApproved = repairProposal?.status === 'approved';
  const provingRegression = repairApproved
    ? state.qaExecutions.find(
        (execution) =>
          execution.runId === runId &&
          execution.kind === 'regression' &&
          execution.worldRevision === state.revision &&
          (!repairProposal.approvedAt ||
            execution.createdAt >= repairProposal.approvedAt) &&
          !execution.issues.some(
            (issue) => issue.category === 'Progression deadlock',
          ),
      )
    : undefined;

  return {
    runId,
    nativeInspection,
    repairProposal,
    repairApproved,
    provingRegression,
    regressionPassed: Boolean(provingRegression),
  };
}
