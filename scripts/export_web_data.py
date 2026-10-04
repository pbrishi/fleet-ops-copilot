"""Export triaged incidents and eval metrics as JSON for the web portal.

The portal is a static site: triage results are precomputed here so the public
demo never calls a paid API. Re-run after a new eval to refresh the portal.
Usage: uv run python scripts/export_web_data.py [--prompt v2]
"""
import argparse
import json
import re
from pathlib import Path

MODEL = "gemini-flash-latest"
OUT = Path("web/src/data")
FIELDS = ["severity", "scenario", "contributing_party", "owner"]


def load(prompt: str) -> list[dict]:
    path = Path("evals/results") / f"{prompt}_{MODEL}.jsonl"
    return [r for r in map(json.loads, path.open()) if "error" not in r]


def metrics(rows: list[dict]) -> dict:
    n = len(rows)
    serious = [r for r in rows if r["gold"]["severity"] in ("S1", "S2")]
    caught = [r for r in serious if r["pred"]["severity"] in ("S1", "S2")]
    over = [r for r in rows if r["gold"]["severity"] in ("S3", "S4") and r["pred"]["severity"] in ("S1", "S2")]
    out = {"n": n, "serious_recall": len(caught) / len(serious), "serious_caught": len(caught),
           "serious_total": len(serious), "over_escalations": len(over)}
    for k in FIELDS:
        out[f"{k}_accuracy"] = sum(r["gold"][k] == r["pred"][k] for r in rows) / n
    return out


MOJIBAKE = {"\u00e2\u0080\u0099": "'", "\u00e2\u0080\u009c": '"', "\u00e2\u0080\u009d": '"'}


def clean_narrative(text: str) -> str:
    """Collapse whitespace and repair smart quotes that were double-encoded in the source CSV."""
    for bad, good in MOJIBAKE.items():
        text = text.replace(bad, good)
    text = re.sub("[\u00a2\u00c2\u00c3\u0080-\u009f]+", lambda m: "'" if "\u0099" in m.group() else "", text)
    return re.sub(r"\s+", " ", text).strip()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", default="v2")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    rows = load(args.prompt)
    golden = {json.loads(l)["report_id"]: json.loads(l) for l in Path("data/golden/golden_v1.jsonl").open()}
    incidents = []
    for r in rows:
        p, g = r["pred"], r["gold"]
        incidents.append({
            "id": r["report_id"],
            "company": golden[r["report_id"]]["company"],
            "narrative": clean_narrative(r["narrative"]),
            "triage": {k: p[k] for k in ["severity", "scenario", "contributing_party", "summary", "owner", "secondary"]},
            "gold": {k: g[k] for k in ["severity", "scenario", "contributing_party", "owner"]},
        })
    (OUT / "incidents.json").write_text(json.dumps(incidents, indent=1))

    evals = {"model": MODEL, "dataset": "golden v1 (120 PM-reviewed NHTSA reports)",
             "runs": {v: metrics(load(v)) for v in ["v1", "v2"]}}
    (OUT / "evals.json").write_text(json.dumps(evals, indent=1))
    print(f"wrote {len(incidents)} incidents and eval metrics to {OUT}")


if __name__ == "__main__":
    main()
