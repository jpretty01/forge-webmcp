'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { createInitialForgeState } from '@/data/initial-world';
import { approveProposal, executeForgeTool, hydrateForgeState, rejectProposal, updateProposalParameters } from '@/lib/game/service';
import { forgeToolRegistry } from '@/lib/webmcp/registry';
import type { ForgeState, PermissionMode, ToolResult } from '@/types/domain';

const STORAGE_KEY = 'forge-world-state-v1';

interface ForgeContextValue {
  state: ForgeState;
  webMCPStatus: 'registering' | 'ready' | 'unsupported' | 'error';
  lastResult?: ToolResult;
  executeTool: (name: string, parameters?: Record<string, unknown>, source?: string, approved?: boolean) => ToolResult;
  approve: (proposalId: string, modifiedParameters?: Record<string, unknown>) => ToolResult;
  reject: (proposalId: string) => void;
  updateProposal: (proposalId: string, parameters: Record<string, unknown>) => void;
  setPermissionMode: (mode: PermissionMode) => void;
  setSelectedLocation: (locationId: string) => void;
  setSelectedTab: (tab: ForgeState['selectedTab']) => void;
}

const ForgeContext = createContext<ForgeContextValue | null>(null);

export function ForgeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ForgeState>(() => createInitialForgeState());
  const stateRef = useRef(state);
  const [lastResult, setLastResult] = useState<ToolResult>();
  const [webMCPStatus, setWebMCPStatus] = useState<ForgeContextValue['webMCPStatus']>('registering');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      setState(hydrateForgeState(JSON.parse(stored)));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    stateRef.current = state;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const executeTool = useCallback((name: string, parameters: Record<string, unknown> = {}, source = 'human-ui', approved = false) => {
    const execution = executeForgeTool(stateRef.current, name, parameters, { source, approved });
    stateRef.current = execution.state;
    setState(execution.state);
    setLastResult(execution.result);
    return execution.result;
  }, []);

  const approve = useCallback((proposalId: string, modifiedParameters?: Record<string, unknown>) => {
    const execution = approveProposal(stateRef.current, proposalId, modifiedParameters);
    stateRef.current = execution.state;
    setState(execution.state);
    setLastResult(execution.result);
    return execution.result;
  }, []);

  const reject = useCallback((proposalId: string) => {
    const next = rejectProposal(stateRef.current, proposalId);
    stateRef.current = next;
    setState(next);
  }, []);

  const updateProposal = useCallback((proposalId: string, parameters: Record<string, unknown>) => {
    const next = updateProposalParameters(stateRef.current, proposalId, parameters);
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    const modelContext = document.modelContext;
    if (!modelContext) {
      setWebMCPStatus('unsupported');
      return;
    }
    const controller = new AbortController();
    let active = true;
    Promise.all(
      forgeToolRegistry.map((tool) => modelContext.registerTool({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: { readOnlyHint: !tool.mutatesWorld },
        async execute(input) {
          const execution = executeForgeTool(stateRef.current, tool.name, input ?? {}, { source: 'webmcp-agent' });
          stateRef.current = execution.state;
          setState(execution.state);
          setLastResult(execution.result);
          return {
            content: [{ type: 'text', text: JSON.stringify(execution.result, null, 2) }],
          };
        },
      }, { signal: controller.signal })),
    ).then(() => {
      if (active) setWebMCPStatus('ready');
    }).catch(() => {
      if (active) setWebMCPStatus('error');
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const value = useMemo<ForgeContextValue>(() => ({
    state,
    webMCPStatus,
    lastResult,
    executeTool,
    approve,
    reject,
    updateProposal,
    setPermissionMode: (permissionMode) => setState((current) => ({ ...current, permissionMode })),
    setSelectedLocation: (selectedLocationId) => setState((current) => ({ ...current, selectedLocationId })),
    setSelectedTab: (selectedTab) => setState((current) => ({ ...current, selectedTab })),
  }), [approve, executeTool, lastResult, reject, state, updateProposal, webMCPStatus]);

  return <ForgeContext.Provider value={value}>{children}</ForgeContext.Provider>;
}

export function useForge() {
  const context = useContext(ForgeContext);
  if (!context) throw new Error('useForge must be used inside ForgeProvider.');
  return context;
}
