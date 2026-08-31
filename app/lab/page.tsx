'use client';

import { Activity, FlaskConical, GitPullRequestArrow, Map, ScrollText } from 'lucide-react';
import { useState } from 'react';

import { AgentGuidePanel } from '@/components/agent/agent-guide-panel';
import { ActivityPanel } from '@/components/agent/activity-panel';
import { GameCanvas } from '@/components/game/game-canvas';
import { WorldNavigation } from '@/components/game/world-navigation';
import { AuditPanel } from '@/components/governance/audit-panel';
import { ProposalsPanel } from '@/components/governance/proposals-panel';
import { ForgeHeader } from '@/components/layout/forge-header';
import { useForge } from '@/components/providers/forge-provider';
import { QADashboard } from '@/components/qa/qa-dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { calibrateEncounterPressure, type EncounterPressureCalibration } from '@/lib/simulation/combat';

const tabs = [
  { id: 'world', label: 'World', icon: Map },
  { id: 'qa', label: 'QA results', icon: FlaskConical },
  { id: 'proposals', label: 'Approvals', icon: GitPullRequestArrow },
  { id: 'audit', label: 'Audit', icon: ScrollText },
] as const;

export default function LabPage() {
  const { state, executeTool, setSelectedTab } = useForge();
  const [mobileEvidence, setMobileEvidence] = useState<'atlas' | 'activity'>('activity');
  const [calibration, setCalibration] = useState<EncounterPressureCalibration>();
  function analyzeDungeon() {
    executeTool('get_dungeon_state', { dungeon_id: 'dungeon-forgotten-crypt' }, 'demo-orchestrator');
    executeTool('get_encounters', { dungeon_id: 'dungeon-forgotten-crypt' }, 'demo-orchestrator');
    executeTool('analyze_balance', { dungeon_id: 'dungeon-forgotten-crypt', runs: 300 }, 'demo-orchestrator');
  }

  function proposeDifficultyChange() {
    const measured = calibrateEncounterPressure(state, 'enc-gallery', 0.25, 2000, 1337);
    setCalibration(measured);
    executeTool('modify_encounter', {
      encounter_id: 'enc-gallery',
      ...measured.parameters,
      spawn_position: { x: 68, y: 32 },
      reason: `Calibration searched one-enemy composition and delayed-reinforcement candidates across ${measured.runs} seeded simulations. This is the closest minimal change to the requested 25-point pressure increase: player win rate ${(measured.baselineWinProbability * 100).toFixed(1)}% → ${(measured.projectedWinProbability * 100).toFixed(1)}% (${(measured.measuredPressureIncrease * 100).toFixed(1)} points).`,
    }, 'demo-orchestrator');
    setSelectedTab('proposals');
  }
  return (
    <main className="min-h-screen bg-background text-foreground">
      <ForgeHeader />
      <section className="forge-shell" aria-label="FORGE world laboratory">
        <WorldNavigation className="forge-nav" />

        <section className="forge-stage">
          <div className="mb-3 flex items-center gap-1 overflow-x-auto rounded-xl border border-white/8 bg-white/2 p-1" role="tablist" aria-label="Laboratory views">{tabs.map((tab) => { const Icon = tab.icon; const badge = tab.id === 'proposals' ? state.proposals.filter((proposal) => proposal.status === 'pending').length : tab.id === 'qa' ? state.qaExecutions[0]?.issues.length : 0; return <Button key={tab.id} size="sm" variant={state.selectedTab === tab.id ? 'secondary' : 'ghost'} role="tab" aria-selected={state.selectedTab === tab.id} onClick={() => setSelectedTab(tab.id)}><Icon /> {tab.label}{Boolean(badge) && <Badge variant="outline" className="ml-1 h-4 px-1 text-[8px]">{badge}</Badge>}</Button>; })}</div>
          <AgentGuidePanel />
          <fieldset className="mb-3 grid grid-cols-2 gap-2 lg:hidden"><legend className="sr-only">Mobile evidence panels</legend><Button size="sm" variant={mobileEvidence === 'atlas' ? 'secondary' : 'outline'} onClick={() => setMobileEvidence('atlas')} aria-pressed={mobileEvidence === 'atlas'}><Map /> World atlas</Button><Button size="sm" variant={mobileEvidence === 'activity' ? 'secondary' : 'outline'} onClick={() => setMobileEvidence('activity')} aria-pressed={mobileEvidence === 'activity'}><Activity /> Agent activity</Button></fieldset>
          <div className="mb-3 lg:hidden">{mobileEvidence === 'atlas' ? <WorldNavigation className="flex flex-col gap-6 rounded-xl border border-white/8" /> : <ActivityPanel className="flex min-h-[420px] flex-col gap-5 rounded-xl border border-white/8" />}</div>
          {state.selectedTab === 'world' && <><div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/12 bg-amber-300/4 p-3"><div><p className="eyebrow">Built-in demo helper</p><p className="mt-1 text-xs text-muted-foreground">These buttons exercise the same services, but activity is explicitly labeled as demo-helper—not native agent traffic.</p>{calibration && <p className="mt-2 text-[11px] text-emerald-200">Measured comparison: {(calibration.baselineWinProbability * 100).toFixed(1)}% → {(calibration.projectedWinProbability * 100).toFixed(1)}% player win rate across {calibration.runs.toLocaleString()} seeded simulations.</p>}</div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={analyzeDungeon}><Activity /> Analyze dungeon</Button><Button size="sm" className="forge-primary" onClick={proposeDifficultyChange}><GitPullRequestArrow /> Calibrate +25% pressure</Button></div></div><GameCanvas /></>}
          {state.selectedTab === 'qa' && <QADashboard />}
          {state.selectedTab === 'proposals' && <ProposalsPanel />}
          {state.selectedTab === 'audit' && <AuditPanel />}
        </section>
        <ActivityPanel className="forge-activity" />
      </section>
    </main>
  );
}
