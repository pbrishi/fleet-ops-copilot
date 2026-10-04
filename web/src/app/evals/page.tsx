import { Card, PageHeader } from "@/components/ui";
import evals from "@/data/evals.json";

const pct = (x: number) => `${Math.round(x * 100)}%`;

const ROWS: { key: keyof typeof evals.runs.v1; label: string; note?: string }[] = [
  { key: "serious_recall", label: "Serious-incident recall", note: "Gold S1/S2 predicted S1/S2. The headline metric: missing a serious incident costs far more than over-escalating." },
  { key: "severity_accuracy", label: "Severity accuracy" },
  { key: "scenario_accuracy", label: "Scenario accuracy" },
  { key: "contributing_party_accuracy", label: "Contributing party accuracy" },
  { key: "owner_accuracy", label: "Owner team accuracy" },
];

const ROUTING = [
  ["Severity S1/S2, or a pedestrian/cyclist is involved", "Safety Incident Response"],
  ["AV software caused contact", "Autonomy Behavior Review"],
  ["AV company's human operator caused contact", "Operator Training & Standards"],
  ["Environment caused contact", "Field Ops & Mapping"],
  ["Severity S3", "Safety Incident Response"],
  ["Everything else", "Claims & Recovery"],
];

export default function EvalsPage() {
  const { v1, v2 } = evals.runs;
  return (
    <>
      <PageHeader
        title="Evals & method"
        subtitle={`How triage quality is measured. ${evals.dataset}, model ${evals.model}.`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Prompt v1 vs v2" className="lg:col-span-2">
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-2 font-medium">Metric</th>
                  <th className="px-4 py-2 text-right font-medium">v1 (definitions only)</th>
                  <th className="px-4 py-2 text-right font-medium">v2 (+ labeling rules)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {ROWS.map((r) => (
                  <tr key={r.key}>
                    <td className="px-4 py-2.5 text-slate-200">
                      {r.label}
                      {r.note && <div className="mt-0.5 max-w-md text-xs text-slate-500">{r.note}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-400">{pct(v1[r.key])}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-emerald-300">{pct(v2[r.key])}</td>
                  </tr>
                ))}
                <tr>
                  <td className="px-4 py-2.5 text-slate-200">Over-escalations (gold S3/S4 predicted S1/S2)</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-400">{v1.over_escalations}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-emerald-300">{v2.over_escalations}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            The 2 serious incidents v2 still misses have no hospital detail in the narrative text, so they can&apos;t be
            recovered from the input. Scores are on the development set; a separate holdout set is labeled for the final,
            untuned number.
          </p>
        </Card>

        <Card title="What's real, what's simulated">
          <ul className="space-y-3 text-sm text-slate-300">
            <li><span className="font-medium text-slate-100">Real:</span> incident narratives (NHTSA Standing General Order 2021-01, public data), Gemini triage outputs, human-reviewed labels, eval scores.</li>
            <li><span className="font-medium text-slate-100">Simulated:</span> the 60-vehicle fleet, its locations, health telemetry, faults and events.</li>
            <li><span className="font-medium text-slate-100">Static:</span> triage is precomputed, so this public demo makes no live model calls.</li>
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="How the golden set was built">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>Stratified sample of 120 reports so rare severe cases are represented (all critical cases, 30 high, 30 medium, 54 low).</li>
            <li>Severity labels come free from NHTSA&apos;s injury field. Scenario and contributing party were drafted by a different model than the one under test, then reviewed by a PM.</li>
            <li>Review changed the taxonomy: 7 of 18 &quot;AV-caused&quot; incidents were human-operator error, so an <span className="font-mono text-xs">AV_OPERATOR</span> party and an Operator Training team were added.</li>
            <li>Edge-case rules from labeling (e.g., &quot;could a careful driver have avoided it?&quot;) became prompt v2.</li>
          </ol>
        </Card>
        <Card title="Routing rules (first match wins)">
          <p className="mb-3 text-sm text-slate-400">The model extracts facts. Routing is business policy, so it lives in auditable code, not in the prompt.</p>
          <ol className="space-y-2 text-sm">
            {ROUTING.map(([rule, team], i) => (
              <li key={rule} className="flex gap-3">
                <span className="w-4 shrink-0 tabular-nums text-slate-500">{i + 1}</span>
                <span className="flex-1 text-slate-300">{rule}</span>
                <span className="text-right text-slate-100">{team}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
