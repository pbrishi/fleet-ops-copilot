"use client";

import { useMemo, useState } from "react";
import { Badge, Card, PageHeader, Reveal, Stat } from "@/components/dashboard";
import incidentsData from "@/data/incidents.json";
import { PARTY_LABEL, SCENARIO_LABEL, SEVERITY_META } from "@/lib/labels";

interface Incident {
  id: string;
  company: string;
  narrative: string;
  triage: { severity: string; scenario: string; contributing_party: string; summary: string; owner: string; secondary: string[] };
  gold: { severity: string; scenario: string; contributing_party: string; owner: string };
}

const incidents = incidentsData as Incident[];
const SEV_RANK: Record<string, number> = { S1: 0, S2: 1, S3: 2, S4: 3 };
const OWNERS = [...new Set(incidents.map((i) => i.triage.owner))].sort();

export default function IncidentsPage() {
  const [severity, setSeverity] = useState("all");
  const [owner, setOwner] = useState("all");
  const [selectedId, setSelectedId] = useState(() => [...incidents].sort((a, b) => SEV_RANK[a.triage.severity] - SEV_RANK[b.triage.severity])[0].id);

  const rows = useMemo(
    () =>
      incidents
        .filter((i) => severity === "all" || i.triage.severity === severity)
        .filter((i) => owner === "all" || i.triage.owner === owner)
        .sort((a, b) => SEV_RANK[a.triage.severity] - SEV_RANK[b.triage.severity]),
    [severity, owner],
  );
  const selected = incidents.find((i) => i.id === selectedId)!;
  const serious = incidents.filter((i) => i.triage.severity === "S1" || i.triage.severity === "S2").length;

  return (
    <>
      <PageHeader
        eyebrow="Real NHTSA crash reports · triaged by Gemini"
        title="Incident triage"
        subtitle="120 real autonomous-vehicle crash reports from NHTSA's public Standing General Order data. Gemini reads each narrative and extracts severity, scenario and contributing party; deterministic rules route it to an owning team."
      />

      <Reveal className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Reports in queue" value={incidents.length} sub="PM-reviewed golden set" />
        <Stat label="Flagged serious (S1/S2)" value={serious} tone="text-orange-300" accent="from-orange-400/80 to-transparent" sub="paged to Safety" />
        <Stat label="Owner team matches reviewer" value={Math.round((incidents.filter((i) => i.triage.owner === i.gold.owner).length / incidents.length) * 100)} suffix="%" accent="from-emerald-400/70 to-transparent" sub="prompt v2 · gemini-flash" />
        <Stat label="Routed to Operator Training" value={incidents.filter((i) => i.triage.owner === "Operator Training & Standards").length} sub="human-operator caused" />
      </Reveal>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <div className="mb-3 flex flex-wrap gap-2">
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100">
              <option value="all">All severities</option>
              {Object.keys(SEVERITY_META).map((s) => <option key={s} value={s}>{SEVERITY_META[s].label}</option>)}
            </select>
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100">
              <option value="all">All owner teams</option>
              {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <span className="ml-auto self-center text-xs text-slate-500">{rows.length} reports</span>
          </div>
          <ul className="-mx-4 max-h-[640px] divide-y divide-slate-800/70 overflow-y-auto">
            {rows.map((i) => (
              <li key={i.id}>
                <button
                  onClick={() => setSelectedId(i.id)}
                  className={`w-full px-4 py-3 text-left ${i.id === selectedId ? "bg-slate-800/60" : "hover:bg-slate-800/30"}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge cls={SEVERITY_META[i.triage.severity].cls}>{i.triage.severity}</Badge>
                    <span className="text-xs text-slate-400">{SCENARIO_LABEL[i.triage.scenario]}</span>
                    <span className="ml-auto text-xs text-slate-500">{i.triage.owner}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-200">{i.triage.summary}</p>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="xl:col-span-2">
          <div className="xl:sticky xl:top-8">
            <IncidentDetail incident={selected} />
          </div>
        </div>
      </div>
    </>
  );
}

function IncidentDetail({ incident: i }: { incident: Incident }) {
  const fields: { label: string; pred: string; gold: string }[] = [
    { label: "Severity", pred: SEVERITY_META[i.triage.severity].label, gold: SEVERITY_META[i.gold.severity].label },
    { label: "Scenario", pred: SCENARIO_LABEL[i.triage.scenario], gold: SCENARIO_LABEL[i.gold.scenario] },
    { label: "Contributing party", pred: PARTY_LABEL[i.triage.contributing_party], gold: PARTY_LABEL[i.gold.contributing_party] },
    { label: "Owner team", pred: i.triage.owner, gold: i.gold.owner },
  ];
  const mismatches = fields.filter((f) => f.pred !== f.gold).length;

  return (
    <Card
      title={`Report ${i.id}`}
      action={<span className="text-xs text-slate-500">{i.company}</span>}
    >
      <p className="text-sm font-medium text-slate-100">{i.triage.summary}</p>

      <table className="mt-4 w-full text-sm">
        <thead className="text-left text-xs text-slate-500">
          <tr>
            <th className="pb-2 font-medium">Field</th>
            <th className="pb-2 font-medium">Gemini</th>
            <th className="pb-2 font-medium">Reviewer label</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.label} className="border-t border-slate-800">
              <td className="py-2 pr-2 text-slate-400">{f.label}</td>
              <td className={`py-2 pr-2 ${f.pred === f.gold ? "text-slate-100" : "text-amber-300"}`}>{f.pred}</td>
              <td className="py-2 text-slate-400">{f.gold}</td>
            </tr>
          ))}
          <tr className="border-t border-slate-800">
            <td className="py-2 pr-2 text-slate-400">Also notify</td>
            <td colSpan={2} className="py-2 text-slate-300">{i.triage.secondary.length ? i.triage.secondary.join(", ") : "none"}</td>
          </tr>
        </tbody>
      </table>
      <p className={`mt-2 text-xs ${mismatches ? "text-amber-300" : "text-emerald-300"}`}>
        {mismatches ? `${mismatches} field${mismatches > 1 ? "s" : ""} differ from the human-reviewed label` : "Matches the human-reviewed label on every field"}
      </p>

      <h3 className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-500">Original narrative</h3>
      <p className="mt-2 max-h-64 overflow-y-auto text-sm leading-relaxed text-slate-300">{i.narrative}</p>
    </Card>
  );
}
