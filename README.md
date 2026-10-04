# Fleet Ops Copilot

An AI copilot for autonomous vehicle fleet operations, built in public as an AI product management portfolio project. Every capability ships with an eval, so quality is measured, not assumed.

## Portal

A fleet operations console in [`web/`](web/) (Next.js, static export): a simulated 60-vehicle fleet with live map, vehicle health and faults, plus an **incident triage queue of 120 real NHTSA crash reports** showing Gemini's triage next to the human-reviewed label. Triage is precomputed, so the public demo makes no model calls.

## Results so far (M1, development set)

| Metric | Prompt v1 | Prompt v2 |
|---|---|---|
| Serious-incident recall | 92% | **94%** |
| Owner team accuracy | 93% | **96%** |
| Over-escalations | 0 | 0 |

120 PM-reviewed NHTSA reports, `gemini-flash-latest`. A separate 57-report holdout set is labeled for the final, untuned number. Details: [`docs/m1-label-spec.md`](docs/m1-label-spec.md), [`evals/results/`](evals/results/).

## Roadmap

| Milestone | Capability | What the eval measures | Status |
|---|---|---|---|
| M1 | **Incident triage:** classify AV incident reports by severity and root cause, route to the right team, summarize | Classification accuracy against a hand-labeled golden set; summary quality via LLM-as-judge | In progress |
| M2 | **Remote assist:** recommend an action for a stuck vehicle, or escalate to a human | Unsafe-suggestion rate, escalation correctness on adversarial scenarios | Planned |
| M3 | **Ops agent:** answer fleet questions and propose rebalancing using tools | Task success and tool-call correctness vs. a rule-based baseline | Planned |

## Setup

Requires [uv](https://docs.astral.sh/uv/) and a [Gemini API key](https://aistudio.google.com/apikey).

```bash
cp .env.example .env              # then add your GEMINI_API_KEY
uv sync
./scripts/download_data.sh        # NHTSA SGO crash reports
uv run python scripts/run_eval.py --prompt v2
uv run python scripts/export_web_data.py   # refresh the portal's data
cd web && npm install && npm run dev
```

Data: NHTSA Standing General Order 2021-01 incident reports (public). Fleet data in the portal is simulated.
