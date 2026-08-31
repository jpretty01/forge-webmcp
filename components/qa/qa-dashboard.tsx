'use client';

import { AlertTriangle, CheckCircle2, FlaskConical, RotateCw, ShieldAlert } from 'lucide-react';

import { useForge } from '@/components/providers/forge-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const severityStyle = { critical: 'border-rose-400/25 bg-rose-400/8 text-rose-200', high: 'border-orange-400/25 bg-orange-400/8 text-orange-200', medium: 'border-amber-400/25 bg-amber-400/8 text-amber-200', low: 'border-sky-400/25 bg-sky-400/8 text-sky-200' };

export function QADashboard() {
  const { state, executeTool } = useForge();
  const execution = state.qaExecutions[0];
  if (!execution) return <section className="empty-state"><FlaskConical className="size-7 text-amber-200" /><h2>Ready to validate Ashen Reach</h2><p>Prove the current repair with regression, or run the full deterministic reference, progression, and balance campaign.</p><div className="flex flex-wrap justify-center gap-2"><Button className="forge-primary" onClick={() => executeTool('run_regression', { runs: 250, seed: 7331 })}><RotateCw /> Run regression</Button><Button variant="outline" onClick={() => executeTool('break_my_game', { runs: 500, seed: 1337 })}><FlaskConical /> Run full QA campaign</Button></div></section>;
  return (
    <section className="space-y-4" aria-label="QA results">
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Validation checks" value={execution.runs.toLocaleString()} icon={<FlaskConical />} />
        <Metric label="Passed" value={execution.passCount.toLocaleString()} icon={<CheckCircle2 />} tone="emerald" />
        <Metric label="Failed" value={execution.failureCount.toLocaleString()} icon={<AlertTriangle />} tone="rose" />
        <Metric label="Completion" value={`${(execution.completionRate * 100).toFixed(1)}%`} icon={<ShieldAlert />} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/2 p-3">
        <div><p className="text-sm font-medium">{execution.kind === 'regression' ? 'Regression campaign' : 'Break My Game campaign'}</p><p className="mt-1 text-xs text-muted-foreground">Seed {execution.seed} · {execution.simulationRuns?.toLocaleString() ?? 0} seeded combat trials · {execution.averageCompletionSteps.toFixed(1)} reachability passes</p>{execution.methodology && <p className="mt-1 max-w-2xl text-[10px] leading-4 text-muted-foreground">{execution.methodology}</p>}</div>
        <Button size="sm" variant="outline" onClick={() => executeTool('run_regression', { runs: 250, seed: 7331 })}><RotateCw /> Retest current world</Button>
      </div>
      {execution.issues.length === 0 ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6 text-center"><CheckCircle2 className="mx-auto size-8 text-emerald-300" /><h3 className="mt-3 font-semibold">All validation layers passed</h3><p className="mt-2 text-sm text-muted-foreground">No progression, reference, or combat blockers were detected.</p></div>
        : <div className="space-y-3">{execution.issues.map((issue) => <article key={issue.id} className="rounded-2xl border border-white/8 bg-[#0e1416] p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={severityStyle[issue.severity]}>{issue.severity}</Badge><Badge variant="outline">{issue.category}</Badge><span className="ml-auto font-mono text-[9px] text-muted-foreground">{issue.affectedEntityId}</span></div><h3 className="mt-3 text-sm font-semibold">{issue.title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{issue.description}</p><div className="mt-3 rounded-lg border border-white/6 bg-black/15 p-3"><p className="eyebrow">Logical reproduction</p><ol className="mt-2 space-y-1 text-[11px] text-zinc-400">{issue.reproduction.map((step, index) => <li key={`${issue.id}-${step}`}>{index + 1}. {step}</li>)}</ol></div><p className="mt-3 text-xs text-amber-100"><strong>Suggested repair:</strong> {issue.suggestedRemediation}</p>{issue.category === 'Progression deadlock' && <Button size="sm" className="mt-3 forge-primary" onClick={() => executeTool('modify_item_spawn', { item_id: 'item-crypt-key', new_location_id: 'loc-crypt-entry', reason: 'Repair the crypt-key circular progression dependency found by QA.' })}>Propose narrow repair</Button>}</article>)}</div>}
    </section>
  );
}

function Metric({ label, value, icon, tone = 'amber' }: { label: string; value: string; icon: React.ReactNode; tone?: 'amber' | 'emerald' | 'rose' }) {
  const colors = tone === 'emerald' ? 'text-emerald-300' : tone === 'rose' ? 'text-rose-300' : 'text-amber-200';
  return <div className="rounded-xl border border-white/8 bg-white/2 p-4"><div className={`flex items-center gap-2 text-[10px] uppercase tracking-wider ${colors}`}>{icon}{label}</div><p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p></div>;
}
