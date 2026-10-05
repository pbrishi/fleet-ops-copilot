"use client";

import type { ReactNode } from "react";
import { BlurFade } from "@/components/ui/blur-fade";
import type { VehicleInfo } from "../trip";

// Glassy bottom sheet that sits over the full-screen map.
export function Sheet({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`absolute inset-x-0 bottom-0 z-[500] rounded-t-[28px] border-t border-white/10 bg-slate-950/85 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl ${className}`}>
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
      {children}
    </div>
  );
}

export function StatusBar() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[600] flex h-[var(--status-bar,env(safe-area-inset-top))] items-end justify-between px-7 pb-1.5 text-[13px] font-semibold text-white">
      <span className="tabular-nums">9:41</span>
      <span className="flex items-center gap-1.5 text-[11px]">
        <span className="tracking-tighter">▂▄▆█</span> 5G
        <span className="ml-0.5 inline-block h-2.5 w-5 rounded-[3px] border border-white/70 p-px"><span className="block h-full w-3/4 rounded-[1px] bg-white" /></span>
      </span>
    </div>
  );
}

export function Toast({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="absolute inset-x-4 top-[calc(var(--status-bar,env(safe-area-inset-top))+0.5rem)] z-[700]">
      <BlurFade duration={0.25} direction="down" offset={8} inView={false}>
        <div role="status" className="rounded-2xl border border-white/10 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 shadow-xl backdrop-blur">{text}</div>
      </BlurFade>
    </div>
  );
}

export function VehicleCard({ v, compact = false }: { v: VehicleInfo; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="relative flex h-12 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-slate-700 to-slate-800">
        <span className="absolute -top-1 h-1.5 w-6 rounded-full shadow-[0_0_10px_currentColor]" style={{ background: v.roofLight.hex, color: v.roofLight.hex }} />
        <span className="text-2xl">🚘</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-base font-semibold tracking-tight text-white">{v.id}</div>
        <div className="text-xs text-slate-400">
          {v.color} {v.model}
          {!compact && <> · <span style={{ color: v.roofLight.hex }}>{v.roofLight.name}</span> roof light</>}
        </div>
      </div>
    </div>
  );
}

export function ActionButton({ children, onClick, disabled, tone = "neutral", label }: { children: ReactNode; onClick?: () => void; disabled?: boolean; tone?: "neutral" | "danger"; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-[11px] transition active:scale-95 disabled:opacity-40 ${
        tone === "danger" ? "border-rose-500/40 bg-rose-500/15 text-rose-100" : "border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.08]"
      }`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ children, onClick, disabled, label }: { children: ReactNode; onClick?: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-sky-500/20 transition active:scale-[0.98] disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 disabled:shadow-none"
    >
      {children}
    </button>
  );
}

export const minutes = (m: number) => (m <= 1 ? "1 min" : `${Math.round(m)} min`);
