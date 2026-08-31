'use client';

import { Bot, Map } from 'lucide-react';

import { useForge } from '@/components/providers/forge-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function WorldNavigation({ className }: { className?: string }) {
  const { state, executeTool } = useForge();
  const activeQuest = state.player.activeQuestIds[0] ? state.quests[state.player.activeQuestIds[0]] : undefined;

  return (
    <aside className={cn('forge-panel', className)} aria-label="World navigation">
      <div><p className="eyebrow">Ashen Reach</p><h2 className="mt-2 text-xl font-semibold">World atlas</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Greyhaven and the road to the Forgotten Crypt.</p></div>
      <nav className="space-y-1" aria-label="Locations">
        {Object.values(state.locations).map((location) => (
          <button key={location.id} className={`nav-item ${state.player.locationId === location.id ? 'nav-item-active' : ''}`} type="button" onClick={() => { if (state.locations[state.player.locationId].exits.includes(location.id)) executeTool('move_player', { location_id: location.id }); }}>
            <Map /> {location.name}<span>{location.kind}</span>
          </button>
        ))}
      </nav>
      <div className="rounded-xl border border-white/8 bg-white/2 p-3"><div className="flex items-center justify-between text-xs"><span className="font-medium">{state.player.name}</span><span className="text-muted-foreground">Level {state.player.level}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/6"><div className="h-full rounded-full bg-rose-400" style={{ width: `${state.player.health}%` }} /></div><div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>{state.player.health}/{state.player.maxHealth} health</span><span>{state.player.inventory.reduce((sum, entry) => sum + entry.quantity, 0)} items</span></div></div>
      <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-3"><div className="flex items-center gap-2 text-xs font-medium text-amber-100"><Bot className="size-4" /> Permission: {state.permissionMode}</div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">{state.permissionMode === 'observe' ? 'Agents may only inspect and simulate.' : state.permissionMode === 'propose' ? 'Meaningful changes wait for your approval.' : 'Allowed changes execute immediately and remain reversible.'}</p></div>
      {activeQuest ? <div className="mt-auto rounded-xl border border-white/8 bg-black/10 p-3"><p className="eyebrow">Active quest</p><p className="mt-2 text-xs font-medium">{activeQuest.name}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{activeQuest.stages.find((stage) => stage.id === activeQuest.currentStageId)?.description}</p></div> : <Button className="mt-auto" variant="outline" onClick={() => executeTool('interact_npc', { npc_id: 'npc-garrick' })}>Accept Garrick’s quest</Button>}
    </aside>
  );
}
