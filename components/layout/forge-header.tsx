'use client';

import { CircleDot, FlaskConical, History, RotateCcw, ShieldCheck, Swords, Wrench } from 'lucide-react';

import { useForge } from '@/components/providers/forge-provider';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PermissionMode } from '@/types/domain';

export function ForgeHeader() {
  const { state, webMCPStatus, executeTool, setPermissionMode, setSelectedTab } = useForge();
  const statusLabel = webMCPStatus === 'ready' ? 'Native WebMCP ready'
    : webMCPStatus === 'unsupported' ? 'WebMCP preview required'
      : webMCPStatus === 'error' ? 'WebMCP registration error'
        : 'Registering WebMCP';

  function runCampaign() {
    executeTool('break_my_game', { runs: 500, seed: 1337 });
    setSelectedTab('qa');
  }

  return (
    <header className="forge-header">
      <a href="/" className="flex min-w-0 items-center gap-3" aria-label="FORGE home">
        <div className="forge-mark" aria-hidden="true"><Swords className="size-4" /></div>
        <div className="min-w-0">
          <p className="forge-wordmark">FORGE</p>
          <p className="hidden text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:block">Human-Agent World Laboratory</p>
        </div>
      </a>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={webMCPStatus === 'ready' ? 'hidden border-emerald-500/30 bg-emerald-500/8 text-emerald-300 md:flex' : 'hidden border-amber-500/30 bg-amber-500/8 text-amber-200 md:flex'}>
          <CircleDot className="size-3" /> {statusLabel}
        </Badge>
        <Select value={state.permissionMode} onValueChange={(value) => setPermissionMode(value as PermissionMode)}>
          <SelectTrigger size="sm" className="hidden w-[132px] border-white/10 bg-white/3 md:flex" aria-label="Agent permission mode">
            <ShieldCheck className="size-3.5 text-amber-200" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="observe">Observe</SelectItem>
            <SelectItem value="propose">Propose</SelectItem>
            <SelectItem value="autonomous">Autonomous</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" className="hidden lg:flex" onClick={() => setSelectedTab('audit')}><History /> History</Button>
        <a href="/webmcp" className={cn(buttonVariants({ size: 'sm', variant: 'ghost' }), 'hidden lg:flex')}><Wrench /> Tools</a>
        <AlertDialog>
          <AlertDialogTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Reset demo world"><RotateCcw /></Button>} />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset the demo world?</AlertDialogTitle>
              <AlertDialogDescription>This restores the player, dungeon, encounters, quests, seeded crypt-key defect, and QA baseline. A rollback checkpoint will be preserved.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep current world</AlertDialogCancel>
              <AlertDialogAction onClick={() => executeTool('reset_demo_world', { reason: 'Human requested a deterministic demo reset.' }, 'human-ui', true)}>Reset Ashen Reach</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button size="sm" className="forge-primary" onClick={runCampaign}><FlaskConical /> <span className="hidden sm:inline">Break my game</span></Button>
      </div>
    </header>
  );
}
