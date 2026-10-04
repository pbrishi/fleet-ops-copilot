"use client";

import Link from "next/link";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFleet } from "@/components/FleetProvider";
import FleetMap from "@/components/MapPanel";
import { Badge, Card, Stat } from "@/components/dashboard";
import { SUBSYSTEMS } from "@/lib/fleet";
import { ago, HEALTH_META, healthScoreColor, STATUS_META } from "@/lib/labels";

const tooltipStyle = { background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 };

export default function VehicleDetail({ id }: { id: string }) {
  const { vehicles, events } = useFleet();
  const v = vehicles.find((x) => x.id === id);
  if (!v) return <p className="text-slate-400">Vehicle not found.</p>;
  const meta = STATUS_META[v.status];
  const vEvents = events.filter((e) => e.vehicleId === v.id);

  return (
    <>
      <Link href="/vehicles" className="text-sm text-slate-400 hover:text-slate-200">← All vehicles</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-xl font-semibold text-slate-50">{v.id}</h1>
        <span className={`flex items-center gap-2 text-sm ${meta.text}`}>
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        {v.riderOnboard && <Badge cls="bg-sky-500/15 text-sky-300 ring-sky-500/30">Rider onboard</Badge>}
        <span className="text-sm text-slate-500">{v.model} · {v.depot} · {v.softwareVersion}</span>
      </div>

      {v.assistReason && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <span className="font-medium">Remote assist requested:</span> {v.assistReason}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Health score" value={v.healthScore} tone={healthScoreColor(v.healthScore)} sub={`${v.faults.length} active fault${v.faults.length === 1 ? "" : "s"}`} />
        <Stat label="Battery" value={Math.round(v.battery)} suffix="%" sub={`~${Math.round(v.battery * 2.4)} mi range`} />
        <Stat label="Speed" value={Math.round(v.speedMph)} suffix=" mph" sub={v.speedMph ? "moving" : "stationary"} />
        <Stat label="Today" value={v.tripsToday} suffix=" trips" sub={`${v.milesToday} mi`} />
        <Stat label="Odometer" value={`${(v.odometerMi / 1000).toFixed(1)}k mi`} sub={`serviced ${v.lastServiceDays}d ago`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Subsystem health" className="lg:col-span-1">
          <ul className="space-y-2">
            {SUBSYSTEMS.map((s) => (
              <li key={s} className="flex items-center justify-between text-sm">
                <span className="capitalize text-slate-300">{s}</span>
                <Badge cls={HEALTH_META[v.health[s]].cls}>{HEALTH_META[v.health[s]].label}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Location" className="lg:col-span-2">
          <div className="h-72">
            <FleetMap vehicles={[v]} center={[v.lat, v.lng]} zoom={14} height={288} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Battery, last 24h">
          <div className="h-52">
            <ResponsiveContainer>
              <AreaChart data={v.telemetry} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 11 }} interval={3} stroke="#334155" />
                <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} stroke="#334155" unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="battery" name="Battery %" stroke="#34d399" fill="#34d39922" strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Compute temperature, last 24h">
          <div className="h-52">
            <ResponsiveContainer>
              <LineChart data={v.telemetry} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 11 }} interval={3} stroke="#334155" />
                <YAxis domain={[40, 80]} tick={{ fill: "#64748b", fontSize: 11 }} stroke="#334155" unit="°" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="computeTemp" name="Temp °C" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Active faults">
          {v.faults.length === 0 ? (
            <p className="text-sm text-slate-500">No active faults.</p>
          ) : (
            <ul className="space-y-3">
              {v.faults.map((f) => (
                <li key={f.code} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <div className="text-slate-100"><span className="font-mono text-slate-400">{f.code}</span> {f.message}</div>
                    <div className="text-xs text-slate-500"><span className="capitalize">{f.system}</span> · {ago(f.minutesAgo)}</div>
                  </div>
                  <Badge cls={f.severity === "critical" ? HEALTH_META.fault.cls : HEALTH_META.degraded.cls}>{f.severity}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Event log">
          {vEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No recent events.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {vEvents.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="w-20 shrink-0 text-xs tabular-nums text-slate-500">{ago(e.minutesAgo)}</span>
                  <span className="text-slate-300">{e.message}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
