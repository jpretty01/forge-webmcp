'use client';

import { CheckCircle2, Filter, RotateCcw, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useForge } from '@/components/providers/forge-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const sourceLabel: Record<string, string> = {
  'webmcp-agent': 'Native WebMCP agent',
  'human-ui': 'Human UI',
  'demo-orchestrator': 'Demo helper',
  'human-approval': 'Human approval',
  inspector: 'Registry inspector',
};

export function AuditPanel() {
  const { state, executeTool } = useForge();
  const [filter, setFilter] = useState('');
  const entries = useMemo(() => state.auditLog.filter((entry) => `${entry.toolName} ${entry.category} ${entry.summary}`.toLowerCase().includes(filter.toLowerCase())), [filter, state.auditLog]);
  if (state.auditLog.length === 0) return <section className="empty-state"><Filter className="size-7 text-amber-200" /><h2>No audit entries yet</h2><p>Every human and agent tool execution will be recorded here with permission and approval context.</p></section>;
  return (
    <section className="space-y-4" aria-label="Audit history">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Reversible by design</p><h2 className="mt-2 text-lg font-semibold">Audit history</h2></div><Input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter tool, category, or status" className="w-64" aria-label="Filter audit history" /></div>
      <div className="space-y-2">{entries.map((entry) => { const checkpoint = entry.checkpointId ? state.checkpoints.find((candidate) => candidate.id === entry.checkpointId) : undefined; return <article key={entry.id} className="grid gap-3 rounded-xl border border-white/8 bg-white/2 p-3 sm:grid-cols-[32px_minmax(0,1fr)_auto]"><div className={`grid size-8 place-items-center rounded-lg ${entry.success ? 'bg-emerald-400/8 text-emerald-300' : 'bg-rose-400/8 text-rose-300'}`}>{entry.success ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-[11px] text-zinc-200">{entry.toolName}</p><Badge variant="outline" className="h-4 px-1 text-[8px]">{entry.category}</Badge><Badge variant="outline" className="h-4 px-1 text-[8px]">{sourceLabel[entry.source] ?? entry.source}</Badge><Badge variant="outline" className="h-4 px-1 text-[8px]">{entry.approvalStatus}</Badge></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{entry.summary}</p><p className="mt-1 text-[9px] text-muted-foreground">{new Date(entry.timestamp).toLocaleString()} · {entry.permissionMode}</p></div>{checkpoint && <Button size="sm" variant="outline" onClick={() => executeTool('rollback_change', { checkpoint_id: checkpoint.id, reason: `Human requested rollback from audit entry ${entry.id}.` }, 'human-ui', true)}><RotateCcw /> Roll back</Button>}</article>; })}</div>
    </section>
  );
}
