import type { HealthLevel, Status } from "./fleet";

export const STATUS_META: Record<Status, { label: string; dot: string; text: string; hex: string }> = {
  in_trip: { label: "In trip", dot: "bg-emerald-400", text: "text-emerald-300", hex: "#34d399" },
  en_route: { label: "To pickup", dot: "bg-sky-400", text: "text-sky-300", hex: "#38bdf8" },
  idle: { label: "Available", dot: "bg-slate-400", text: "text-slate-300", hex: "#94a3b8" },
  charging: { label: "Charging", dot: "bg-violet-400", text: "text-violet-300", hex: "#a78bfa" },
  remote_assist: { label: "Needs assist", dot: "bg-amber-400", text: "text-amber-300", hex: "#fbbf24" },
  maintenance: { label: "Maintenance", dot: "bg-orange-400", text: "text-orange-300", hex: "#fb923c" },
  offline: { label: "Offline", dot: "bg-rose-500", text: "text-rose-300", hex: "#f43f5e" },
};

export const HEALTH_META: Record<HealthLevel, { label: string; cls: string }> = {
  ok: { label: "OK", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  degraded: { label: "Degraded", cls: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  fault: { label: "Fault", cls: "bg-rose-500/15 text-rose-300 ring-rose-500/30" },
};

export const SEVERITY_META: Record<string, { label: string; cls: string }> = {
  S1: { label: "S1 Critical", cls: "bg-rose-500/20 text-rose-200 ring-rose-500/40" },
  S2: { label: "S2 High", cls: "bg-orange-500/20 text-orange-200 ring-orange-500/40" },
  S3: { label: "S3 Medium", cls: "bg-amber-500/15 text-amber-200 ring-amber-500/30" },
  S4: { label: "S4 Low", cls: "bg-slate-500/15 text-slate-300 ring-slate-500/30" },
};

export const SCENARIO_LABEL: Record<string, string> = {
  REAR_STRUCK: "Rear-ended",
  SIDESWIPE_MERGE: "Sideswipe / merge",
  INTERSECTION_TURN: "Intersection / turn",
  BACKING: "Backing",
  PARKED_OR_DOOR: "Parked car / door",
  VULNERABLE_ROAD_USER: "Pedestrian / cyclist",
  OBJECT_OR_INFRA: "Object / infrastructure",
  OTHER: "Other",
};

export const PARTY_LABEL: Record<string, string> = {
  AV: "AV software",
  AV_OPERATOR: "AV operator",
  OTHER_PARTY: "Other party",
  ENVIRONMENT: "Environment",
  UNCLEAR: "Unclear",
};

export function batteryColor(pct: number) {
  return pct < 20 ? "bg-rose-500" : pct < 40 ? "bg-amber-400" : "bg-emerald-400";
}

export function healthScoreColor(score: number) {
  return score < 60 ? "text-rose-300" : score < 85 ? "text-amber-300" : "text-emerald-300";
}

export function ago(minutes: number) {
  if (minutes < 60) return `${minutes}m ago`;
  const h = Math.floor(minutes / 60);
  return `${h}h ${minutes % 60}m ago`;
}
