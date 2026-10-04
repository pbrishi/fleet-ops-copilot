"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { needsAttention } from "@/lib/fleet";
import { useFleet } from "./FleetProvider";

const NAV = [
  { href: "/", label: "Overview", icon: "◎" },
  { href: "/vehicles", label: "Vehicles", icon: "▤" },
  { href: "/incidents", label: "Incident triage", icon: "△" },
  { href: "/rider", label: "Rider support", icon: "◌" },
  { href: "/evals", label: "Evals & method", icon: "✓" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { live, setLive, vehicles } = useFleet();
  const attention = vehicles.filter(needsAttention).length;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="sticky top-0 z-20 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:block md:px-5 md:py-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20">
            FO
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-tight text-slate-50">Fleet Ops Copilot</span>
            <span className="block text-xs text-slate-500">Autonomous fleet console</span>
          </span>
        </Link>
        <button
          onClick={() => setLive(!live)}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300 transition hover:border-white/20 md:mt-5"
          aria-pressed={live}
        >
          <span className="relative flex h-2 w-2">
            {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? "bg-emerald-400" : "bg-slate-500"}`} />
          </span>
          {live ? "Simulating live" : "Paused"}
        </button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                active ? "bg-gradient-to-r from-sky-500/15 to-transparent text-slate-50" : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
              }`}
            >
              {active && <span className="absolute inset-y-1.5 left-0 hidden w-0.5 rounded-full bg-sky-400 md:block" />}
              <span className={`hidden w-4 text-center text-xs md:inline ${active ? "text-sky-300" : "text-slate-600 group-hover:text-slate-400"}`}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.href === "/" && attention > 0 && (
                <span className="rounded-full bg-amber-500/15 px-1.5 text-xs tabular-nums text-amber-300 ring-1 ring-amber-500/30">{attention}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <p className="hidden px-5 pt-4 text-xs leading-relaxed text-slate-500 md:block">
        Fleet data is simulated. Incident reports are real public NHTSA filings, triaged by Gemini.
      </p>
    </aside>
  );
}
