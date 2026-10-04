"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { needsAttention } from "@/lib/fleet";
import { useFleet } from "./FleetProvider";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/incidents", label: "Incident triage" },
  { href: "/rider", label: "Rider support" },
  { href: "/evals", label: "Evals & method" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { live, setLive, vehicles } = useFleet();
  const attention = vehicles.filter(needsAttention).length;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:block md:px-5 md:py-5">
        <Link href="/" className="block">
          <div className="text-sm font-semibold tracking-tight text-slate-50">Fleet Ops Copilot</div>
          <div className="text-xs text-slate-500">Autonomous fleet console</div>
        </Link>
        <button
          onClick={() => setLive(!live)}
          className="flex items-center gap-2 rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-500 md:mt-4"
          aria-pressed={live}
        >
          <span className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-emerald-400" : "bg-slate-500"}`} />
          {live ? "Simulating live" : "Paused"}
        </button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
              isActive(item.href) ? "bg-slate-800 text-slate-50" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            {item.label}
            {item.href === "/" && attention > 0 && (
              <span className="ml-2 rounded-full bg-amber-500/20 px-1.5 text-xs text-amber-300">{attention}</span>
            )}
          </Link>
        ))}
      </nav>
      <p className="hidden px-5 pt-4 text-xs leading-relaxed text-slate-500 md:block">
        Fleet data is simulated. Incident reports are real public NHTSA filings, triaged by Gemini.
      </p>
    </aside>
  );
}
