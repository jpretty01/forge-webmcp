'use client';

import { Check, Clipboard, ClipboardCheck, Search, ShieldCheck, TestTube2, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useForge } from '@/components/providers/forge-provider';
import { Button } from '@/components/ui/button';

const GOLDEN_PROMPT = 'Find the most serious progression blocker in Ashen Reach. Explain it and propose the narrowest reversible repair. Do not apply anything without my approval.';

export function AgentGuidePanel() {
  const { state } = useForge();
  const [copied, setCopied] = useState(false);
  const nativeInspection = state.auditLog.some((entry) => entry.source === 'webmcp-agent' && entry.toolName === 'find_progression_blockers' && entry.success);
  const repairProposal = state.proposals.find((proposal) => proposal.toolName === 'modify_item_spawn');
  const repairApproved = repairProposal?.status === 'approved';
  const regressionPassed = state.qaExecutions.some((execution) => execution.kind === 'regression' && !execution.issues.some((issue) => issue.category === 'Progression deadlock'));
  const steps = [
    { label: 'Agent inspects', done: nativeInspection, icon: Search },
    { label: 'Repair proposed', done: Boolean(repairProposal), icon: Wrench },
    { label: 'Human approves', done: repairApproved, icon: ShieldCheck },
    { label: 'Regression proves', done: regressionPassed, icon: TestTube2 },
  ];
  const nextPrompt = useMemo(() => {
    if (!nativeInspection) return GOLDEN_PROMPT;
    if (!repairProposal) return 'Propose the narrowest reversible repair for the progression blocker. Do not apply it.';
    if (!repairApproved) return 'Review the proposal in the Approvals tab. Approval must remain a human action.';
    if (!regressionPassed) return 'Run regression now and verify that the progression blocker is gone.';
    return 'Show the audit entry and checkpoint for this repair, then explain how to roll it back.';
  }, [nativeInspection, regressionPassed, repairApproved, repairProposal]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(nextPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="mb-3 rounded-xl border border-emerald-300/15 bg-emerald-300/4 p-4" aria-label="Guided native agent demo">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Judge-ready golden path</p><h2 className="mt-2 text-sm font-semibold">Ask your native WebMCP agent</h2></div><span className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-emerald-200">Human governed</span></div>
      <div className="mt-3 rounded-lg border border-white/8 bg-black/20 p-3"><p className="text-xs leading-5 text-zinc-200">“{nextPrompt}”</p><Button size="sm" variant="outline" className="mt-3" onClick={copyPrompt}>{copied ? <ClipboardCheck /> : <Clipboard />}{copied ? 'Copied' : 'Copy next prompt'}</Button></div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-4">
        {steps.map(({ label, done, icon: Icon }, index) => <li key={label} className={`rounded-lg border p-2.5 ${done ? 'border-emerald-300/20 bg-emerald-300/6' : 'border-white/8 bg-white/2'}`}><div className="flex items-center gap-2 text-[10px]"><span className={`grid size-5 place-items-center rounded-full ${done ? 'bg-emerald-300 text-zinc-950' : 'bg-white/6 text-muted-foreground'}`}>{done ? <Check className="size-3" /> : index + 1}</span><Icon className="size-3 text-amber-200" /><span>{label}</span></div></li>)}
      </ol>
    </section>
  );
}
