# Fleet Ops Copilot: web portal

Fleet operations console for a simulated 60-vehicle robotaxi fleet, plus an incident triage queue of real NHTSA crash reports triaged by Gemini.

- **Overview:** live map, KPIs, vehicles needing attention, event feed, software rollout
- **Vehicles:** sortable health table; per-vehicle subsystem health, faults, 24h telemetry
- **Incident triage:** 120 real NHTSA reports with Gemini's triage next to the human-reviewed label
- **Evals & method:** prompt v1 vs v2 scores and how the golden set was built

Fleet data is simulated in the browser (`src/lib/fleet.ts`). Triage results are precomputed by `scripts/export_web_data.py`, so the site is fully static and makes no model calls.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to out/
```
