'use client';

import { Check, GitPullRequestArrow, Pencil, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';

import { useForge } from '@/components/providers/forge-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export function ProposalsPanel() {
  const { state, approve, reject, updateProposal } = useForge();
  const [editingId, setEditingId] = useState<string>();
  const proposal = state.proposals.find(
    (candidate) => candidate.id === editingId,
  );
  const [draft, setDraft] = useState('');
  const [editError, setEditError] = useState('');
  const currentRunId = `run-${state.demoRunNumber}`;
  const proposals = state.proposals.filter(
    (candidate) => candidate.runId === currentRunId,
  );
  const pending = proposals.filter(
    (candidate) => candidate.status === 'pending',
  );

  function beginEdit(id: string) {
    const candidate = state.proposals.find((item) => item.id === id);
    if (!candidate) return;
    setEditingId(id);
    setDraft(JSON.stringify(candidate.parameters, null, 2));
    setEditError('');
  }

  function saveEdit() {
    if (!editingId) return;
    try {
      updateProposal(editingId, JSON.parse(draft) as Record<string, unknown>);
      setEditingId(undefined);
      setEditError('');
    } catch {
      setEditError(
        'Enter valid JSON before saving. The tool schema will validate field values when you approve.',
      );
    }
  }

  if (proposals.length === 0)
    return (
      <section className="empty-state">
        <GitPullRequestArrow className="size-7 text-amber-200" />
        <h2>No proposals in this run</h2>
        <p>
          In PROPOSE mode, meaningful agent changes appear here before any world
          state changes. Earlier runs remain preserved in Audit.
        </p>
      </section>
    );
  return (
    <section
      id="approval-queue"
      className="scroll-mt-24 space-y-3"
      aria-label="Human approval queue"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Human control</p>
          <h2 className="mt-2 text-lg font-semibold">Approval queue</h2>
        </div>
        <Badge variant="outline">{pending.length} pending</Badge>
      </div>
      {proposals.map((item) => (
        <article
          key={item.id}
          className={`rounded-2xl border p-4 ${item.status === 'pending' ? 'border-amber-300/20 bg-amber-300/5' : 'border-white/8 bg-white/2'}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {item.toolName}
            </Badge>
            <Badge variant="outline">{item.status}</Badge>
            {item.reversible && (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-300">
                <RotateCcw className="size-3" /> Reversible
              </span>
            )}
          </div>
          <h3 className="mt-3 text-sm font-semibold">Requested action</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {item.reason}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/6 bg-black/10 p-3">
              <p className="eyebrow">Before</p>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                {item.beforeSummary}
              </p>
            </div>
            <div className="rounded-lg border border-white/6 bg-black/10 p-3">
              <p className="eyebrow">
                {item.status === 'approved'
                  ? 'Executed result'
                  : 'Proposed after'}
              </p>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                {item.afterSummary}
              </p>
              {item.checkpointId && (
                <p className="mt-2 font-mono text-[9px] text-emerald-300">
                  Checkpoint: {item.checkpointId}
                </p>
              )}
            </div>
          </div>
          <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/6 bg-black/20 p-3 text-[10px] leading-4 text-zinc-400">
            {JSON.stringify(item.parameters, null, 2)}
          </pre>
          {item.status === 'pending' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="forge-primary"
                onClick={() => approve(item.id)}
              >
                <Check /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => beginEdit(item.id)}
              >
                <Pencil /> Modify
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-rose-300"
                onClick={() => reject(item.id)}
              >
                <X /> Reject
              </Button>
            </div>
          )}
        </article>
      ))}
      <Dialog
        open={Boolean(proposal)}
        onOpenChange={(open) => {
          if (!open) setEditingId(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify proposal parameters</DialogTitle>
            <DialogDescription>
              Edit the structured input. The same validation rules run when this
              proposal is approved.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setEditError('');
            }}
            className="min-h-64 font-mono text-xs"
            aria-label="Proposal parameters JSON"
            aria-invalid={Boolean(editError)}
            aria-describedby={editError ? 'proposal-edit-error' : undefined}
          />
          {editError && (
            <p
              id="proposal-edit-error"
              className="text-xs text-rose-300"
              role="alert"
            >
              {editError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(undefined)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save parameters</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
