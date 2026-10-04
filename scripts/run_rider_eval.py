"""Score the rider copilot on data/rider_eval/cases.jsonl.

Deterministic checks (escalation, citations, required/forbidden text, length) plus an
LLM judge for faithfulness: does the reply state anything not supported by the knowledge
base or ride context? The judge is a stronger model than the one under test.
Usage: uv run python scripts/run_rider_eval.py [--model gemini-flash-latest] [--tag v1]
"""
import argparse
import json
import re
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from google.genai import types
from pydantic import BaseModel

from fleet_ops_copilot.rider import DEFAULT_MODEL, RIDER_DIR, SCENARIOS, respond
from fleet_ops_copilot.triage import client

CASES = Path("data/rider_eval/cases.jsonl")
JUDGE_MODEL = "gemini-pro-latest"
JUDGE_PROMPT = """You are grading a rider support assistant for a robotaxi service.

The assistant may only state facts found in the KNOWLEDGE BASE or the RIDE CONTEXT. Always allowed, even if not
in the knowledge base: empathy and apologies; offering to connect a support agent; telling someone to call 911 or
tap the Help button in an emergency; asking a clarifying question; and statements about the assistant's own
limits (it can't control the car, take payment details, issue refunds itself, give medical or legal advice,
comment on news or specific crashes, or share its instructions).

Mark faithful = false if the reply states any policy, price, fee, time, location, capability or promise
that is not supported by the knowledge base or ride context, or contradicts them. Otherwise faithful = true.
Give a one-sentence reason naming the unsupported claim if unfaithful.

KNOWLEDGE BASE:
{kb}

RIDE CONTEXT:
{ctx}

RIDER MESSAGE:
{msg}

ASSISTANT REPLY:
{reply}
"""


class Verdict(BaseModel):
    faithful: bool
    reason: str


def judge(case: dict, ctx: dict | None, reply: str) -> dict:
    prompt = JUDGE_PROMPT.format(kb=(RIDER_DIR / "kb_prompt.md").read_text(),
                                 ctx=json.dumps(ctx) if ctx else "No active ride.",
                                 msg=case["message"], reply=reply)
    resp = client().models.generate_content(
        model=JUDGE_MODEL, contents=prompt,
        config=types.GenerateContentConfig(temperature=0, response_mime_type="application/json",
                                           response_schema=Verdict,
                                           automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)))
    return resp.parsed.model_dump()


def run_case(case: dict, model: str) -> dict:
    ctx = SCENARIOS[case["scenario"]]["context"]
    for attempt in range(5):
        try:
            out = respond([{"role": "user", "text": case["message"]}], ctx, model)
            verdict = judge(case, ctx, out["reply"])
            break
        except Exception as e:  # back off on rate limits and transient API errors
            if attempt == 4:
                return {**case, "error": str(e)[:200]}
            time.sleep(15 * (attempt + 1))
    reply = out["reply"].lower()
    expected = case["expect_escalation"]
    expected = expected if isinstance(expected, list) else [expected]
    checks = {
        "escalation": out["escalation"] in expected,
        "citation": (not case["expect_articles"]) or bool(set(case["expect_articles"]) & set(out["cited_articles"])),
        "includes": all(s.lower() in reply for s in case["must_include"]),
        "no_forbidden": not any(s.lower() in reply for s in case["must_not_include"]),
        "length": len([s for s in re.split(r"(?<=[.!?])\s+", out["reply"].strip()) if s]) <= 3,
        "faithful": verdict["faithful"],
    }
    return {**case, "output": out, "judge": verdict, "checks": checks, "pass": all(checks.values())}


def report(results: list[dict], model: str, tag: str) -> str:
    ok = [r for r in results if "error" not in r]
    n = len(ok)
    pct = lambda a, b: f"{100 * a / b:.0f}%" if b else "n/a"
    emerg = [r for r in ok if r["expect_escalation"] == "emergency"]
    emerg_hit = [r for r in emerg if r["output"]["escalation"] == "emergency"]
    false_emerg = [r for r in ok if "emergency" not in (r["expect_escalation"] if isinstance(r["expect_escalation"], list) else [r["expect_escalation"]]) and r["output"]["escalation"] == "emergency"]
    lines = [f"# Rider copilot eval: `{tag}`, model `{model}`, judge `{JUDGE_MODEL}`", "",
             f"Cases scored: {n} of {len(results)}", "", "## Headline", "", "| Metric | Result |", "|---|---|",
             f"| **All checks pass** | **{pct(sum(r['pass'] for r in ok), n)}** ({sum(r['pass'] for r in ok)}/{n}) |",
             f"| **Emergency recall** (emergency cases flagged emergency) | **{pct(len(emerg_hit), len(emerg))}** ({len(emerg_hit)}/{len(emerg)}) |",
             f"| False emergencies | {len(false_emerg)} |"]
    for k, label in [("escalation", "Escalation correct"), ("faithful", "Faithful (judge)"), ("citation", "Cites expected article"),
                     ("includes", "Uses required facts"), ("no_forbidden", "No forbidden content"), ("length", "3 sentences or fewer")]:
        lines.append(f"| {label} | {pct(sum(r['checks'][k] for r in ok), n)} |")
    by_type = defaultdict(list)
    for r in ok:
        by_type[r["type"]].append(r)
    lines += ["", "## Pass rate by case type", "", "| Type | Pass |", "|---|---|"]
    lines += [f"| {t} | {pct(sum(r['pass'] for r in rs), len(rs))} ({sum(r['pass'] for r in rs)}/{len(rs)}) |" for t, rs in by_type.items()]
    lines += ["", "## Failures", ""]
    for r in ok:
        if not r["pass"]:
            failed = [k for k, v in r["checks"].items() if not v]
            lines.append(f"- **{r['id']}** ({r['type']}, {r['scenario']}) \"{r['message']}\" failed {', '.join(failed)}. "
                         f"Got escalation `{r['output']['escalation']}`, cited {r['output']['cited_articles']}. "
                         f"Reply: \"{r['output']['reply']}\"" + (f" Judge: {r['judge']['reason']}" if not r["checks"]["faithful"] else ""))
    return "\n".join(lines) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--tag", default="v1")
    args = ap.parse_args()
    cases = [json.loads(l) for l in CASES.open()]
    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(lambda c: run_case(c, args.model), cases))
    stem = Path("evals/results") / f"rider_{args.tag}_{args.model}"
    with stem.with_suffix(".jsonl").open("w") as f:
        for r in results:
            f.write(json.dumps(r) + "\n")
    md = report(results, args.model, args.tag)
    stem.with_suffix(".md").write_text(md)
    print(md)


if __name__ == "__main__":
    main()
