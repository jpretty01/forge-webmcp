import Image from 'next/image';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FlaskConical,
  RadioTower,
  Route,
  ShieldCheck,
  Swords,
  Users,
  Wrench,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const proof = [
  {
    icon: Bot,
    label: '30 structured tools',
    copy: 'Inspection, simulation, repair, and governance.',
  },
  {
    icon: ShieldCheck,
    label: 'Human approval',
    copy: 'Observe, propose, or autonomous permission modes.',
  },
  {
    icon: FlaskConical,
    label: 'Deterministic QA',
    copy: 'Real graph analysis and seeded combat simulations.',
  },
];

const studioRoles = [
  {
    icon: Route,
    title: 'Quest designers',
    copy: 'Find broken progression from the real world graph and propose the smallest repair.',
  },
  {
    icon: FlaskConical,
    title: 'QA teams',
    copy: 'Reproduce defects and prove fixes with revision-specific deterministic validation.',
  },
  {
    icon: RadioTower,
    title: 'Live operations',
    copy: 'Review bounded changes with attribution, checkpoints, and rollback.',
  },
];

export default function HomePage() {
  return (
    <main className="landing-page min-h-screen overflow-hidden bg-background text-foreground">
      <header className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="forge-mark">
            <Swords className="size-4" />
          </div>
          <span className="forge-wordmark">FORGE</span>
        </div>
        <nav className="flex items-center gap-2">
          <a
            href="/webmcp"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <Wrench /> Tools
          </a>
          <a
            href="/lab"
            className={cn(buttonVariants({ size: 'sm' }), 'forge-primary')}
          >
            Enter FORGE <ArrowRight />
          </a>
        </nav>
      </header>
      <section className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-7xl items-center gap-10 px-5 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div className="relative z-10">
          <Badge
            variant="outline"
            className="border-emerald-400/20 bg-emerald-400/5 text-emerald-200"
          >
            <CheckCircle2 /> WebMCP-first architecture
          </Badge>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-amber-200/70">
            Human-Agent World Laboratory
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em] text-zinc-50 sm:text-6xl lg:text-7xl">
            Build worlds
            <br />
            <span className="text-amber-200">together.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
            Inspect, modify, test, repair, and evolve a playable medieval world
            through structured browser-native agent tools—while every meaningful
            change remains visible, auditable, and reversible.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/lab"
              className={cn(buttonVariants({ size: 'lg' }), 'forge-primary')}
            >
              Run the live demo <ArrowRight />
            </a>
            <a
              href="/webmcp"
              className={cn(
                buttonVariants({ size: 'lg', variant: 'outline' }),
                'border-white/10 bg-white/3',
              )}
            >
              View WebMCP tools <Wrench />
            </a>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {proof.map(({ icon: Icon, label, copy }) => (
              <div
                key={label}
                className="rounded-xl border border-white/8 bg-white/2 p-3"
              >
                <Icon className="size-4 text-amber-200" />
                <p className="mt-3 text-xs font-medium">{label}</p>
                <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                  {copy}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-20 bg-[radial-gradient(circle,rgba(244,194,100,.12),transparent_63%)]" />
          <div className="relative overflow-hidden rounded-3xl border border-amber-200/15 bg-[#0d1112] p-2 shadow-[0_30px_90px_rgb(0_0_0/55%)]">
            <Image
              src="/og.png"
              alt="FORGE laboratory with a miniature crypt, illuminated world map, and agent instrumentation"
              width={1200}
              height={630}
              priority
              className="aspect-[1200/630] w-full rounded-2xl object-cover"
            />
            <div className="absolute inset-x-5 bottom-5 flex items-center justify-between rounded-xl border border-white/10 bg-black/65 px-4 py-3 backdrop-blur-md">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-emerald-300">
                  Live demo world
                </p>
                <p className="mt-1 text-sm font-medium">
                  Ashen Reach · Forgotten Crypt
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-amber-300/25 bg-amber-300/8 text-amber-100"
              >
                Seeded QA defect
              </Badge>
            </div>
          </div>
        </div>
      </section>
      <section
        className="border-t border-white/6 bg-[#090d0e] px-5 py-16 lg:px-8"
        aria-labelledby="studio-impact"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="eyebrow">Why studios care</p>
              <h2
                id="studio-impact"
                className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50"
              >
                One governed workflow instead of disconnected debug tools.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                FORGE demonstrates a reusable control plane for stateful
                products: structured inspection → bounded proposal → human
                approval → measured execution → validation → audit and rollback.
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs text-emerald-200">
                <Users className="size-4" /> Built for real game-production
                roles, demonstrated through a playable RPG.
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {studioRoles.map(({ icon: Icon, title, copy }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-white/8 bg-white/2 p-5"
                >
                  <Icon className="size-5 text-amber-200" />
                  <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {copy}
                  </p>
                </article>
              ))}
            </div>
          </div>
          <p className="mt-8 border-l-2 border-emerald-300/40 pl-4 text-xs leading-5 text-zinc-400">
            The same inspect, approve, verify, and reverse pattern applies to
            CMS operations, commerce configuration, support diagnostics, and
            other agent-operated web applications.
          </p>
        </div>
      </section>
    </main>
  );
}
