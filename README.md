# Fleet Ops Copilot

**Live demo:** ops console [fleet-ops-copilot.vercel.app](https://fleet-ops-copilot.vercel.app) · rider app [fleet-ops-copilot.vercel.app/ride](https://fleet-ops-copilot.vercel.app/ride)

An AI copilot for autonomous vehicle fleet operations, built in public as an AI product management portfolio project. Every capability ships with an eval, so quality is measured, not assumed.

## Portal

A fleet operations console in [`web/`](web/) (Next.js, static export): a simulated 60-vehicle fleet with live map, vehicle health and faults, plus an **incident triage queue of 120 real NHTSA crash reports** showing Gemini's triage next to the human-reviewed label. Triage is precomputed, so the public demo makes no model calls.

## Copilot Rides rider app

An iPhone-style rider app at [`/ride`](https://fleet-ops-copilot.vercel.app/ride) (Magic UI iPhone frame on desktop, full screen on a phone), riding the same simulated fleet the console monitors. Plan and decisions: [`docs/rider-app-plan.md`](docs/rider-app-plan.md).

- **Flow:** sign in → home with nearby cars and one-tap priced destinations → matching → live ETA as the car drives a real street route → unlock at pickup → seatbelt check → start (doors close and lock) → in-trip progress → arrive → pay → rate → home.
- **Safety rules in one pure state machine** ([`web/src/rider-app/trip.ts`](web/src/rider-app/trip.ts)) with 18 unit tests: doors never unlock while moving; pickup unlock needs the rider at the car; start needs a fastened seatbelt; emergency stop decelerates to a safe stop; ending early is prorated; cancellation is free for 2 minutes.
- **Emergency sheet:** pull over now, call 911 (deliberately not a live call in the public demo), talk to support.
- **Seat sensors and seatbelts:** a seat map shows who's aboard; Start stays visible but disabled until every occupied seat is buckled.
- **Turn-by-turn and arrival:** navigation banner from the router's maneuvers ("Turn right onto California Street"), a follow view on the final approach, and an exit guide: curb side recommended, left doors held locked while the (simulated) cameras see traffic approaching.
- **In-car voice:** pre-recorded Gemini TTS announcements with captions ("Welcome to Auto-Drive", seatbelt reminder, arriving, traffic warning).
- **Remembers you across rides:** cabin temperature learned from past rides ("Set based on your past rides"), Spotify playlist and position resume when you get in (connection simulated), ratings with optional Comfort / Time to arrive / Ride quality.
- **Support copilot in the app** (chat + voice) gets live trip context: vehicle, ETA, doors, speed.
- **Simulated for now:** vehicles, payment (Stripe test mode next), music (simulated player next). Native iOS build via Capacitor is planned.

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
