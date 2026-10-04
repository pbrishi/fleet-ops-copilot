import type { ReactNode } from "react";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";

const SPOTLIGHT = { gradientColor: "#1e3a5f", gradientOpacity: 0.55, gradientFrom: "#38bdf8", gradientTo: "#818cf8" };

export function Card({
  title,
  action,
  children,
  className = "",
  beam,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  beam?: { from: string; to: string };
}) {
  return (
    <MagicCard {...SPOTLIGHT} gradientSize={320} className={`rounded-xl ${className}`}>
      <section className="relative h-full">
        {(title || action) && (
          <header className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
            {title && <h2 className="text-sm font-medium tracking-tight text-slate-100">{title}</h2>}
            {action}
          </header>
        )}
        <div className="p-4">{children}</div>
      </section>
      {beam && <BorderBeam size={90} duration={9} colorFrom={beam.from} colorTo={beam.to} borderWidth={1.5} />}
    </MagicCard>
  );
}

// value: a number animates with a ticker; a string renders as-is.
export function Stat({
  label,
  value,
  prefix = "",
  suffix = "",
  sub,
  tone = "text-slate-50",
  accent = "from-sky-400/70 to-indigo-400/0",
}: {
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  sub?: ReactNode;
  tone?: string;
  accent?: string;
}) {
  return (
    <MagicCard {...SPOTLIGHT} gradientSize={220} className="rounded-xl">
      <div className="relative overflow-hidden px-4 py-3">
        <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent}`} />
        <div className="text-xs text-slate-400">{label}</div>
        <div className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${tone}`}>
          {prefix}
          {typeof value === "number" ? <NumberTicker value={value} className={`tabular-nums ${tone}`} /> : value}
          {suffix && <span className="text-lg text-slate-400">{suffix}</span>}
        </div>
        {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
      </div>
    </MagicCard>
  );
}

export function Badge({ children, cls }: { children: ReactNode; cls: string }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, eyebrow, children }: { title: string; subtitle?: ReactNode; eyebrow?: string; children?: ReactNode }) {
  return (
    <BlurFade delay={0.05} inView={false}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <div className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-0.5 text-xs">
              <AnimatedShinyText className="mx-0 max-w-none text-slate-400">{eyebrow}</AnimatedShinyText>
            </div>
          )}
          <h1 className="bg-gradient-to-br from-white to-slate-400 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">{subtitle}</p>}
        </div>
        {children}
      </div>
    </BlurFade>
  );
}

// Staggered entrance for page sections.
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <BlurFade delay={0.1 + delay} inView={false} className={className}>
      {children}
    </BlurFade>
  );
}

export function BatteryBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full transition-[width] duration-700 ${color}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-slate-300">{Math.round(pct)}%</span>
    </div>
  );
}
