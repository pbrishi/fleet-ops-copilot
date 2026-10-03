# Fleet Ops Copilot

An AI copilot for autonomous vehicle fleet operations, built in public as an AI product management portfolio project. Every capability ships with an eval, so quality is measured, not assumed.

## Roadmap

| Milestone | Capability | What the eval measures | Status |
|---|---|---|---|
| M1 | **Incident triage:** classify AV incident reports by severity and root cause, route to the right team, summarize | Classification accuracy against a hand-labeled golden set; summary quality via LLM-as-judge | In progress |
| M2 | **Remote assist:** recommend an action for a stuck vehicle, or escalate to a human | Unsafe-suggestion rate, escalation correctness on adversarial scenarios | Planned |
| M3 | **Ops agent:** answer fleet questions and propose rebalancing using tools | Task success and tool-call correctness vs. a rule-based baseline | Planned |

## Setup

Requires [uv](https://docs.astral.sh/uv/) and a [Gemini API key](https://aistudio.google.com/apikey).

```bash
cp .env.example .env   # then add your GEMINI_API_KEY
uv sync
uv run python check_gemini.py
```
