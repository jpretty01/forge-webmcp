'use client';

import { Bot, FlaskConical, GitPullRequestArrow, Map, ScrollText } from 'lucide-react';

import { ActivityPanel } from '@/components/agent/activity-panel';
import { GameCanvas } from '@/components/game/game-canvas';
import { AuditPanel } from '@/components/governance/audit-panel';
import { ProposalsPanel } from '@/components/governance/proposals-panel';
import { ForgeHeader } from '@/components/layout/forge-header';
import { useForge } from '@/components/providers/forge-provider';
import { QADashboard } from '@/components/qa/qa-dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const tabs = [
  { id: 'world', label: 'World', icon: Map },
  { id: 'qa', label: 'QA results', icon: FlaskConical },
  { id: 'proposals', label: 'Approvals', icon: GitPullRequestArrow },
  { id: 'audit', label: 'Audit', icon: ScrollText },
] as const;

export default function LabPage() {
  const { state, executeTool, setSelectedTab } = useForge();
  const activeQuest = state.player.activeQuestIds[0] ? state.quests[state.player.activeQuestIds[0]] : undefined;
  function analyzeDungeon() {
    executeTool('get_dungeon_state', { dungeon_id: 'dungeon-forgotten-crypt' }, 'demo-orchestrator');
    executeTool('get_encounters', { dungeon_id: 'dungeon-forgotten-crypt' }, 'demo-orchestrator');
    executeTool('analyze_balance', { dungeon_id: 'dungeon-forgotten-crypt', runs: 300 }, 'demo-orchestrator');
  }

  function proposeDifficultyChange() {
    executeTool('modify_encounter', {
      encounter_id: 'enc-gallery',
      add_enemy_archetype_id: 'arch-crypt-archer',
      difficulty_target: 0.65,
      hazard: 'timed falling braziers',
      reason: 'Increase dungeon tactical pressure by roughly 25% through ranged composition and an environmental timing hazard, without increasing enemy health.',
    }, 'demo-orchestrator');
    setSelectedTab('proposals');
  }
  return (
    <main className="min-h-screen bg-background text-foreground">
      <ForgeHeader />
      <section className="forge-shell" aria-label="FORGE world laboratory">
        <aside className="forge-panel forge-nav" aria-label="World navigation">
          <div><p className="eyebrow">Ashen Reach</p><h2 className="mt-2 text-xl font-semibold">World atlas</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Greyhaven and the road to the Forgotten Crypt.</p></div>
          <nav className="space-y-1" aria-label="Locations">{Object.values(state.locations).map((location) => <button key={location.id} className={`nav-item ${state.player.locationId === location.id ? 'nav-item-active' : ''}`} type="button" onClick={() => { if (state.locations[state.player.locationId].exits.includes(location.id)) executeTool('move_player', { location_id: location.id }); }}><Map /> {location.name}<span>{location.kind}</span></button>)}</nav>
          <div className="rounded-xl border border-white/8 bg-white/2 p-3"><div className="flex items-center justify-between text-xs"><span className="font-medium">{state.player.name}</span><span className="text-muted-foreground">Level {state.player.level}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/6"><div className="h-full rounded-full bg-rose-400" style={{ width: `${state.player.health}%` }} /></div><div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>{state.player.health}/{state.player.maxHealth} health</span><span>{state.player.inventory.reduce((sum, entry) => sum + entry.quantity, 0)} items</span></div></div>
          <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-3"><div className="flex items-center gap-2 text-xs font-medium text-amber-100"><Bot className="size-4" /> Permission: {state.permissionMode}</div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">{state.permissionMode === 'observe' ? 'Agents may only inspect and simulate.' : state.permissionMode === 'propose' ? 'Meaningful changes wait for your approval.' : 'Allowed changes execute immediately and remain reversible.'}</p></div>
          {activeQuest ? <div className="mt-auto rounded-xl border border-white/8 bg-black/10 p-3"><p className="eyebrow">Active quest</p><p className="mt-2 text-xs font-medium">{activeQuest.name}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{activeQuest.stages.find((stage) => stage.id === activeQuest.currentStageId)?.description}</p></div> : <Button className="mt-auto" variant="outline" onClick={() => executeTool('interact_npc', { npc_id: 'npc-garrick' })}>Accept Garrick’s quest</Button>}
        </aside>

        <section className="forge-stage">
          <div className="mb-3 flex items-center gap-1 overflow-x-auto rounded-xl border border-white/8 bg-white/2 p-1" role="tablist" aria-label="Laboratory views">{tabs.map((tab) => { const Icon = tab.icon; const badge = tab.id === 'proposals' ? state.proposals.filter((proposal) => proposal.status === 'pending').length : tab.id === 'qa' ? state.qaExecutions[0]?.issues.length : 0; return <Button key={tab.id} size="sm" variant={state.selectedTab === tab.id ? 'secondary' : 'ghost'} role="tab" aria-selected={state.selectedTab === tab.id} onClick={() => setSelectedTab(tab.id)}><Icon /> {tab.label}{Boolean(badge) && <Badge variant="outline" className="ml-1 h-4 px-1 text-[8px]">{badge}</Badge>}</Button>; })}</div>
          {state.selectedTab === 'world' && <><div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/12 bg-amber-300/4 p-3"><div><p className="eyebrow">Primary demo</p><p className="mt-1 text-xs text-muted-foreground">Let the agent inspect, simulate, and propose a tactical change.</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={analyzeDungeon}><Bot /> Analyze dungeon</Button><Button size="sm" className="forge-primary" onClick={proposeDifficultyChange}><GitPullRequestArrow /> Propose +25% pressure</Button></div></div><GameCanvas /></>}
          {state.selectedTab === 'qa' && <QADashboard />}
          {state.selectedTab === 'proposals' && <ProposalsPanel />}
          {state.selectedTab === 'audit' && <AuditPanel />}
        </section>
        <ActivityPanel />
      </section>
    </main>
  );
}
