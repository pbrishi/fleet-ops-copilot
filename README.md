# Fleet Ops Copilot

**Live demo: [fleet-ops-copilot.vercel.app](https://fleet-ops-copilot.vercel.app)**

An AI copilot for autonomous vehicle fleet operations, built in public as an AI product management portfolio project. Every capability ships with an eval, so quality is measured, not assumed.

## Portal

A fleet operations console in [`web/`](web/) (Next.js, static export): a simulated 60-vehicle fleet with live map, vehicle health and faults, plus an **incident triage queue of 120 real NHTSA crash reports** showing Gemini's triage next to the human-reviewed label. Triage is precomputed, so the public demo makes no model calls.

## Rider support copilot

A chat assistant for riders of **Copilot Rides**, a fictional robotaxi service (portal page `/rider`). It answers only from a 78-article knowledge base plus the rider's live trip context, cites the articles it used, and picks an escalation level: answered, hand off to an agent, or emergency.

- **Knowledge base:** [`web/src/rider/kb.json`](web/src/rider/kb.json), built by [`scripts/build_rider_kb.py`](scripts/build_rider_kb.py). Question topics were researched from public robotaxi help centers, rider reviews and news coverage; every answer and policy is original and fictional.
- **Design:** the whole knowledge base (~6k tokens) goes in the prompt. At this size that's simpler and more reliable than retrieval. The prompt bundle is shared by the web route and the eval, so the site runs exactly what was evaluated.
- **Eval:** 52 test conversations across knowledge-base questions, trip-context use, emergencies, out-of-scope and adversarial inputs (prompt injection, card numbers, promised credits). Deterministic checks plus a stronger model as judge for faithfulness. Results in [`evals/results/`](evals/results/).
- **Voice:** tap the mic and speak. The recording (16 kHz WAV) goes straight to Gemini, which transcribes and answers in one call; replies are spoken with Gemini TTS (default voice Charon, a professional male voice), requested sentence by sentence so audio starts sooner.
- **Voice eval finding:** on silent or noisy recordings the model invented plausible transcripts from the trip context ("Why are we just sitting here? I have a flight to catch.") in **12 of 20** clips. A stricter prompt cut that to 4/20; adding a silence check in the browser and on the server brought the full pipeline to **1/20** (a synthetic pure tone). Real speech: 4/4 correct. Next step: proper voice-activity detection. Script: [`scripts/run_rider_voice_eval.py`](scripts/run_rider_voice_eval.py).

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
