'use client';

import { Activity, Bot, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { useState } from 'react';

import { useForge } from '@/components/providers/forge-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const statusIcon = {
  running: Clock3,
  completed: CheckCircle2,
  awaiting_approval: Clock3,
  failed: XCircle,
  rejected: XCircle,
};

const sourceLabel: Record<string, string> = {
  'webmcp-agent': 'Native WebMCP agent',
  'human-ui': 'Human UI',
  'demo-orchestrator': 'Demo helper',
  'human-approval': 'Human approval',
  inspector: 'Registry inspector',
};

export function ActivityPanel({ className }: { className?: string }) {
  const { state, lastResult } = useForge();
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const currentRunId = `run-${state.demoRunNumber}`;
  const activities =
    scope === 'current'
      ? state.activities.filter((event) => event.runId === currentRunId)
      : state.activities;
  return (
    <aside className={cn('forge-panel', className)} aria-label="Agent activity">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Live protocol</p>
          <h2 className="mt-2 text-lg font-semibold">Agent activity</h2>
        </div>
        <Activity className="size-4 text-emerald-300" />
      </div>
      {lastResult && (
        <div
          className={`rounded-xl border p-3 ${lastResult.ok ? 'border-emerald-400/15 bg-emerald-400/5' : 'border-rose-400/15 bg-rose-400/5'}`}
        >
          <div className="flex items-center gap-2 text-xs font-medium">
            <Bot className="size-4" /> Latest result
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {lastResult.summary}
          </p>
        </div>
      )}
      <div
        className="flex rounded-lg border border-white/8 bg-black/10 p-0.5"
        aria-label="Activity scope"
      >
        <Button
          className="flex-1"
          size="sm"
          variant={scope === 'current' ? 'secondary' : 'ghost'}
          onClick={() => setScope('current')}
        >
          Current run
        </Button>
        <Button
          className="flex-1"
          size="sm"
          variant={scope === 'all' ? 'secondary' : 'ghost'}
          onClick={() => setScope('all')}
        >
          All history
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 pr-3">
          {activities.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center">
              <Bot className="mx-auto size-5 text-amber-200/60" />
              <p className="mt-2 text-xs text-muted-foreground">
                Tool calls for this run will appear here in real time.
              </p>
            </div>
          )}
          {activities.map((event) => {
            const Icon = statusIcon[event.status];
            return (
              <div className="activity-row" key={event.id}>
                <div
                  className={`activity-icon ${event.status === 'failed' || event.status === 'rejected' ? 'bg-rose-400/8 text-rose-300' : event.status === 'awaiting_approval' ? 'activity-idle' : ''}`}
                >
                  <Icon />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-mono text-[11px] text-zinc-200">
                      {event.toolName}
                    </p>
                    <Badge
                      variant="outline"
                      className="ml-auto h-4 px-1 text-[8px]"
                    >
                      {event.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[9px] font-medium uppercase tracking-wide text-amber-200/70">
                    {sourceLabel[event.source ?? ''] ??
                      event.source ??
                      'Legacy activity'}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">
                    {event.summary}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-amber-100">
          <Bot className="size-4" /> Shared application state
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Human controls and WebMCP tools use the same validated services.
        </p>
      </div>
    </aside>
  );
}
