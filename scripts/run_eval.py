"""Run triage over the golden set and score it against PM-reviewed labels.

Usage: uv run python scripts/run_eval.py --prompt v1 [--model gemini-flash-latest]
Writes evals/results/<prompt>_<model>.jsonl (per-report) and .md (report).
"""
import argparse
import json
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fleet_ops_copilot.routing import route
from fleet_ops_copilot.triage import DEFAULT_MODEL, triage

GOLDEN = Path("data/golden/golden_v1.jsonl")
SEVERITIES = ["S1", "S2", "S3", "S4"]


def run_one(row: dict, prompt: str, model: str) -> dict:
    for attempt in range(3):
        try:
            pred = triage(row["narrative"], prompt, model)
            break
        except Exception as e:  # retry transient API errors
            if attempt == 2:
                return {"report_id": row["report_id"], "error": str(e)[:200]}
    owner, secondary = route(row["severity"], row["scenario"], row["contributing_party"])
    return {
        "report_id": row["report_id"],
        "gold": {"severity": row["severity"], "scenario": row["scenario"],
                 "contributing_party": row["contributing_party"], "owner": owner, "secondary": secondary},
        "pred": pred,
        "narrative": row["narrative"],
    }


def pct(n, d):
    return f"{100 * n / d:.0f}%" if d else "n/a"


def report(results: list[dict], prompt: str, model: str) -> str:
    ok = [r for r in results if "error" not in r]
    n = len(ok)
    g = lambda r, k: r["gold"][k]
    p = lambda r, k: r["pred"][k]
    lines = [f"# Eval: prompt `{prompt}`, model `{model}`", "",
             f"Reports scored: {n} of {len(results)} ({len(results) - n} API errors)", ""]

    # Headline: did we catch the serious incidents?
    serious = [r for r in ok if g(r, "severity") in ("S1", "S2")]
    caught = [r for r in serious if p(r, "severity") in ("S1", "S2")]
    s1 = [r for r in ok if g(r, "severity") == "S1"]
    s1_caught = [r for r in s1 if p(r, "severity") in ("S1", "S2")]
    over = [r for r in ok if g(r, "severity") in ("S3", "S4") and p(r, "severity") in ("S1", "S2")]
    owner_ok = sum(g(r, "owner") == p(r, "owner") for r in ok)
    lines += ["## Headline", "", "| Metric | Result |", "|---|---|",
              f"| **Serious-incident recall** (gold S1/S2 predicted S1/S2) | **{pct(len(caught), len(serious))}** ({len(caught)}/{len(serious)}) |",
              f"| Critical (S1) caught as S1/S2 | {pct(len(s1_caught), len(s1))} ({len(s1_caught)}/{len(s1)}) |",
              f"| Over-escalation (gold S3/S4 predicted S1/S2) | {len(over)} reports |",
              f"| Owner team correct | {pct(owner_ok, n)} ({owner_ok}/{n}) |", ""]

    # Per-field accuracy
    lines += ["## Field accuracy", "", "| Field | Accuracy |", "|---|---|"]
    for k in ["severity", "scenario", "contributing_party", "owner"]:
        c = sum(g(r, k) == p(r, k) for r in ok)
        lines.append(f"| {k} | {pct(c, n)} ({c}/{n}) |")
    tp = sum(len(set(g(r, "secondary")) & set(p(r, "secondary"))) for r in ok)
    n_pred = sum(len(p(r, "secondary")) for r in ok)
    n_gold = sum(len(g(r, "secondary")) for r in ok)
    lines += [f"| secondary teams | precision {pct(tp, n_pred)}, recall {pct(tp, n_gold)} |", ""]

    # Severity confusion matrix
    lines += ["## Severity confusion (rows = gold, columns = predicted)", "",
              "| gold \\ pred | " + " | ".join(SEVERITIES) + " |", "|---" * 5 + "|"]
    for gs in SEVERITIES:
        cells = [str(sum(g(r, "severity") == gs and p(r, "severity") == ps for r in ok)) for ps in SEVERITIES]
        lines.append(f"| **{gs}** | " + " | ".join(cells) + " |")
    lines.append("")

    # Contributing party confusion: most common mistakes
    for k in ["contributing_party", "scenario"]:
        errs = Counter((g(r, k), p(r, k)) for r in ok if g(r, k) != p(r, k))
        lines += [f"## Most common {k} errors (gold → predicted)", ""]
        lines += [f"- {a} → {b}: {c}" for (a, b), c in errs.most_common(6)] or ["- none"]
        lines.append("")

    # Missed serious incidents, the ones that matter most
    missed = [r for r in serious if r not in caught]
    lines += ["## Missed serious incidents", ""]
    for r in missed:
        lines.append(f"- `{r['report_id']}` gold {g(r, 'severity')}, predicted {p(r, 'severity')}: {r['pred']['summary']}")
    if not missed:
        lines.append("- none")

    tin = sum(r["pred"]["input_tokens"] for r in ok)
    tout = sum(r["pred"]["output_tokens"] for r in ok)
    lines += ["", "## Usage", "", f"Input tokens: {tin:,}. Output tokens (incl. thinking): {tout:,}."]
    return "\n".join(lines) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", default="v1")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    args = ap.parse_args()

    rows = [json.loads(line) for line in GOLDEN.open()]
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda r: run_one(r, args.prompt, args.model), rows))

    stem = Path("evals/results") / f"{args.prompt}_{args.model}"
    stem.parent.mkdir(parents=True, exist_ok=True)
    with stem.with_suffix(".jsonl").open("w") as f:
        for r in results:
            f.write(json.dumps(r) + "\n")
    md = report(results, args.prompt, args.model)
    stem.with_suffix(".md").write_text(md)
    print(md)


if __name__ == "__main__":
    main()
