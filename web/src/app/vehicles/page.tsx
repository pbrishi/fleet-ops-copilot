"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFleet } from "@/components/FleetProvider";
import { BatteryBar, Card, PageHeader } from "@/components/ui";
import { SUBSYSTEMS, type Status } from "@/lib/fleet";
import { batteryColor, healthScoreColor, STATUS_META } from "@/lib/labels";

type SortKey = "id" | "battery" | "healthScore";

export default function VehiclesPage() {
  const { vehicles } = useFleet();
  const [status, setStatus] = useState<Status | "all">("all");
  const [query, setQuery] = useState("");
  const [faultsOnly, setFaultsOnly] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "healthScore", dir: 1 });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles
      .filter((v) => status === "all" || v.status === status)
      .filter((v) => !faultsOnly || v.faults.length > 0)
      .filter((v) => !q || v.id.toLowerCase().includes(q) || v.depot.toLowerCase().includes(q))
      .sort((a, b) => (a[sort.key] > b[sort.key] ? 1 : a[sort.key] < b[sort.key] ? -1 : 0) * sort.dir);
  }, [vehicles, status, query, faultsOnly, sort]);

  const header = (key: SortKey, label: string) => (
    <button
      className="flex items-center gap-1 hover:text-slate-200"
      onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : 1 }))}
    >
      {label}
      {sort.key === key && <span aria-hidden>{sort.dir === 1 ? "↑" : "↓"}</span>}
    </button>
  );

  return (
    <>
      <PageHeader title="Vehicles" subtitle="Health and status for every vehicle. Sorted by health score so problems float to the top." />

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ID or depot"
            className="w-48 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status | "all")}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100"
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_META).map(([s, m]) => (
              <option key={s} value={s}>{m.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={faultsOnly} onChange={(e) => setFaultsOnly(e.target.checked)} className="accent-sky-400" />
            Active faults only
          </label>
          <span className="ml-auto text-xs text-slate-500">{rows.length} of {vehicles.length}</span>
        </div>

        <div className="-mx-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="px-4 py-2 font-medium">{header("id", "Vehicle")}</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">{header("battery", "Battery")}</th>
                <th className="px-4 py-2 font-medium">{header("healthScore", "Health")}</th>
                <th className="px-4 py-2 font-medium">Subsystems</th>
                <th className="px-4 py-2 font-medium">Faults</th>
                <th className="px-4 py-2 font-medium">Software</th>
                <th className="px-4 py-2 font-medium">Depot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map((v) => (
                <tr key={v.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-2.5">
                    <Link href={`/vehicles/${v.id}`} className="font-mono text-slate-100 hover:text-sky-300">{v.id}</Link>
                    <div className="text-xs text-slate-500">{v.model}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`flex items-center gap-2 ${STATUS_META[v.status].text}`}>
                      <span className={`h-2 w-2 rounded-full ${STATUS_META[v.status].dot}`} />
                      {STATUS_META[v.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5"><BatteryBar pct={v.battery} color={batteryColor(v.battery)} /></td>
                  <td className={`px-4 py-2.5 font-medium tabular-nums ${healthScoreColor(v.healthScore)}`}>{v.healthScore}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1" aria-label="subsystem health">
                      {SUBSYSTEMS.map((s) => (
                        <span
                          key={s}
                          title={`${s}: ${v.health[s]}`}
                          className={`h-3 w-2 rounded-sm ${v.health[s] === "ok" ? "bg-emerald-500/50" : v.health[s] === "degraded" ? "bg-amber-400" : "bg-rose-500"}`}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-300">
                    {v.faults.length ? v.faults.map((f) => f.code).join(", ") : <span className="text-slate-600">none</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{v.softwareVersion}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{v.depot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
