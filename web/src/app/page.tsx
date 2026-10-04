"use client";

import Link from "next/link";
import { useFleet } from "@/components/FleetProvider";
import FleetMap from "@/components/MapPanel";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { needsAttention, type Status } from "@/lib/fleet";
import { ago, STATUS_META } from "@/lib/labels";

const STATUS_ORDER: Status[] = ["in_trip", "en_route", "idle", "charging", "remote_assist", "maintenance", "offline"];
const EVENT_TONE = { assist: "text-amber-300", fault: "text-rose-300", battery: "text-orange-300", trip: "text-emerald-300", service: "text-slate-300" };

export default function Overview() {
  const { vehicles, events } = useFleet();
  const count = (s: Status) => vehicles.filter((v) => v.status === s).length;
  const active = vehicles.filter((v) => v.status !== "maintenance" && v.status !== "offline");
  const avgBattery = active.reduce((s, v) => s + v.battery, 0) / active.length;
  const utilization = (count("in_trip") + count("en_route")) / active.length;

  const attention = vehicles
    .filter(needsAttention)
    .sort((a, b) => Number(b.status === "remote_assist") - Number(a.status === "remote_assist") || a.healthScore - b.healthScore);

  const rollout = vehicles.filter((v) => v.softwareVersion === "v14.3.0").length;

  return (
    <>
      <PageHeader title="Fleet overview" subtitle="San Francisco service area · 60 vehicles · simulated data" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="In service" value={`${active.length}/${vehicles.length}`} sub={`${count("maintenance")} maintenance · ${count("offline")} offline`} />
        <Stat label="Utilization" value={`${Math.round(utilization * 100)}%`} sub="in trip or heading to pickup" />
        <Stat label="Riders onboard" value={vehicles.filter((v) => v.riderOnboard).length} sub={`${count("idle")} vehicles available`} />
        <Stat label="Avg battery" value={`${Math.round(avgBattery)}%`} sub={`${count("charging")} charging`} />
        <Stat label="Needs attention" value={attention.length} tone={attention.length ? "text-amber-300" : "text-slate-50"} sub={`${count("remote_assist")} waiting for remote assist`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Live map" className="xl:col-span-2" action={<Legend />}>
          <div className="h-[420px]">
            <FleetMap vehicles={vehicles} />
          </div>
        </Card>

        <Card title="Needs attention" action={<span className="text-xs text-slate-500">{attention.length} vehicles</span>}>
          <ul className="-my-2 divide-y divide-slate-800">
            {attention.map((v) => (
              <li key={v.id}>
                <Link href={`/vehicles/${v.id}`} className="flex items-start justify-between gap-3 py-2.5 hover:opacity-80">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-slate-100">
                      <span className={`h-2 w-2 rounded-full ${STATUS_META[v.status].dot}`} />
                      {v.id}
                      {v.riderOnboard && v.status === "remote_assist" && <Badge cls="bg-sky-500/15 text-sky-300 ring-sky-500/30">Rider onboard</Badge>}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-400">
                      {v.assistReason ?? v.faults.find((f) => f.severity === "critical")?.message ?? v.faults[0]?.message ?? `Battery ${Math.round(v.battery)}%`}
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs ${STATUS_META[v.status].text}`}>{STATUS_META[v.status].label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Fleet status">
          <div className="flex h-3 overflow-hidden rounded-full">
            {STATUS_ORDER.map((s) => (
              <div key={s} className={STATUS_META[s].dot} style={{ width: `${(count(s) / vehicles.length) * 100}%` }} title={STATUS_META[s].label} />
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {STATUS_ORDER.map((s) => (
              <li key={s} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
                  {STATUS_META[s].label}
                </span>
                <span className="tabular-nums text-slate-400">{count(s)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent events" className="lg:col-span-2">
          <ul className="-my-1 max-h-64 space-y-2 overflow-y-auto pr-1 text-sm">
            {events.slice(0, 14).map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="w-20 shrink-0 text-xs tabular-nums text-slate-500">{ago(e.minutesAgo)}</span>
                <Link href={`/vehicles/${e.vehicleId}`} className="w-16 shrink-0 font-mono text-xs text-slate-300 hover:text-slate-100">
                  {e.vehicleId}
                </Link>
                <span className={`min-w-0 ${EVENT_TONE[e.kind]}`}>{e.message}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Software rollout" className="mt-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="min-w-56 flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-sky-400" style={{ width: `${(rollout / vehicles.length) * 100}%` }} />
            </div>
          </div>
          <span className="text-slate-300">
            <span className="font-medium text-slate-50">v14.3.0</span> on {rollout} of {vehicles.length} vehicles ({Math.round((rollout / vehicles.length) * 100)}%)
          </span>
          <span className="text-slate-500">remainder on v14.2.1</span>
        </div>
      </Card>
    </>
  );
}

function Legend() {
  return (
    <div className="hidden flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-slate-400 sm:flex">
      {STATUS_ORDER.map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
          {STATUS_META[s].label}
        </span>
      ))}
    </div>
  );
}
