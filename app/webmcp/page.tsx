'use client';

import { ArrowLeft, CheckCircle2, CircleDot, Copy, LockKeyhole, RotateCcw, Search, ShieldCheck, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useForge } from '@/components/providers/forge-provider';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { forgeToolRegistry } from '@/lib/webmcp/registry';

export default function WebMCPInspectorPage() {
  const { webMCPStatus, executeTool } = useForge();
  const [query, setQuery] = useState('');
  const [selectedName, setSelectedName] = useState('modify_encounter');
  const tools = useMemo(() => forgeToolRegistry.filter((tool) => `${tool.name} ${tool.description} ${tool.category}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const selected = forgeToolRegistry.find((tool) => tool.name === selectedName) ?? tools[0];
  const groups = useMemo(() => [...new Set(tools.map((tool) => tool.category))], [tools]);
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="forge-header"><div className="flex items-center gap-3"><a href="/lab" className={buttonVariants({ size: 'icon-sm', variant: 'ghost' })} aria-label="Back to laboratory"><ArrowLeft /></a><div className="forge-mark"><Wrench className="size-4" /></div><div><p className="forge-wordmark">WEBMCP INSPECTOR</p><p className="hidden text-[10px] uppercase tracking-widest text-muted-foreground sm:block">Registered FORGE capabilities</p></div></div><Badge variant="outline" className={webMCPStatus === 'ready' ? 'border-emerald-400/25 bg-emerald-400/5 text-emerald-200' : 'border-amber-400/25 bg-amber-400/5 text-amber-200'}><CircleDot /> {webMCPStatus === 'ready' ? 'Native tools registered' : 'Registry available · browser preview inactive'}</Badge></header>
      <section className="inspector-shell">
        <aside className="border-r border-white/8 bg-[#0b1012] p-4"><div className="flex items-center justify-between"><div><p className="eyebrow">Tool registry</p><h1 className="mt-2 text-xl font-semibold">{forgeToolRegistry.length} capabilities</h1></div><Badge variant="outline">7 categories</Badge></div><div className="relative mt-4"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-8" placeholder="Search tools" aria-label="Search WebMCP tools" /></div><div className="mt-5 space-y-5">{groups.map((group) => <section key={group}><p className="mb-2 px-2 font-mono text-[9px] uppercase tracking-widest text-amber-200/60">{group}</p><div className="space-y-1">{tools.filter((tool) => tool.category === group).map((tool) => <button type="button" key={tool.name} onClick={() => setSelectedName(tool.name)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-mono text-[11px] transition ${selected?.name === tool.name ? 'border border-amber-300/15 bg-amber-300/8 text-amber-100' : 'text-zinc-400 hover:bg-white/4 hover:text-zinc-200'}`}>{tool.mutatesWorld ? <LockKeyhole className="size-3" /> : <CheckCircle2 className="size-3" />}{tool.name}</button>)}</div></section>)}</div></aside>
        {selected && <article className="min-w-0 p-5 lg:p-8"><div className="mx-auto max-w-4xl"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{selected.category}</Badge><Badge variant="outline" className={selected.mutatesWorld ? 'border-amber-400/25 text-amber-200' : 'border-emerald-400/25 text-emerald-200'}>{selected.mutatesWorld ? 'State changing' : 'Read only'}</Badge>{selected.requiresApproval && <Badge variant="outline"><ShieldCheck /> Human approval</Badge>}{selected.reversible && <Badge variant="outline"><RotateCcw /> Reversible</Badge>}</div><h2 className="mt-5 break-all font-mono text-2xl font-semibold text-zinc-100">{selected.name}</h2><p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{selected.description}</p><div className="mt-7 grid gap-5 lg:grid-cols-2"><InspectorCode title="Input schema" value={selected.inputSchema} /><InspectorCode title="Example input" value={selected.exampleInput} /></div><div className="mt-5 rounded-2xl border border-white/8 bg-white/2 p-5"><p className="eyebrow">Output</p><p className="mt-3 text-sm text-zinc-300">{selected.outputDescription}</p><Button size="sm" className="mt-5" variant="outline" onClick={() => executeTool(selected.name, selected.exampleInput, 'inspector')} disabled={selected.mutatesWorld && selected.requiresApproval}>Run safe example</Button>{selected.mutatesWorld && selected.requiresApproval && <p className="mt-2 text-[10px] text-muted-foreground">Mutation examples are reviewed through the approval workflow in the laboratory.</p>}</div><div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-5"><div className="flex items-center gap-2 text-sm font-medium text-emerald-200"><ShieldCheck className="size-4" /> WebMCP lifecycle</div><p className="mt-3 text-xs leading-5 text-muted-foreground">FORGE registers this capability with <code className="text-zinc-300">document.modelContext.registerTool()</code>, validates input in the shared service layer, records the call, and unregisters it with an AbortSignal when the page lifecycle ends.</p></div></div></article>}
      </section>
    </main>
  );
}

function InspectorCode({ title, value }: { title: string; value: unknown }) {
  return <section className="min-w-0 rounded-2xl border border-white/8 bg-[#0b1012] p-4"><div className="flex items-center justify-between"><p className="eyebrow">{title}</p><Copy className="size-3.5 text-muted-foreground" /></div><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-5 text-zinc-400">{JSON.stringify(value, null, 2)}</pre></section>;
}
