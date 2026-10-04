"""Draw the 60-report holdout set. None of these reports are in the dev golden set.

The current SGO file has no S1 reports left after the dev set, so S1 comes from the
2021-2025 archive file, whose injury field ("Serious", "Fatality") maps cleanly to S1.
The archive's "Minor" can't be split into S2 vs S3 (no hospitalization detail), so
S2-S4 come from unused reports in the current file.
"""
import json
from pathlib import Path

import pandas as pd

from build_golden_sample import SEED, load, sample_stratum

ARCHIVE = Path("data/raw/archive_SGO-2021-01_Incident_Reports_ADS.csv")
DEV = Path("data/golden/golden_v1.jsonl")
OUT = Path("data/golden/holdout_sample.jsonl")
TARGETS = {"S2": 15, "S3": 15, "S4": 22}


def load_archive_s1() -> pd.DataFrame:
    df = pd.read_csv(ARCHIVE, low_memory=False, encoding_errors="replace")
    narr = df["Narrative"].fillna("")
    df = df[~narr.str.contains("REDACTED") & (narr.str.len() > 100)]
    # GM files duplicates of Cruise reports whose narrative is only legal boilerplate.
    df = df[~df["Narrative"].str.contains("submitting a duplicate", na=False)]
    df = df.sort_values("Report Version").drop_duplicates("Report ID", keep="last")
    df = df[df["Highest Injury Severity Alleged"].isin(["Serious", "Fatality"])].copy()
    df["severity"] = "S1"
    return df


def main() -> None:
    dev_ids = {json.loads(line)["report_id"] for line in DEV.open()}
    current = load()
    current = current[~current["Report ID"].isin(dev_ids)]
    parts = [load_archive_s1()]
    parts += [sample_stratum(current[current["severity"] == s], n) for s, n in TARGETS.items()]
    sample = pd.concat(parts).sample(frac=1, random_state=SEED)
    assert not set(sample["Report ID"]) & dev_ids
    with OUT.open("w") as f:
        for _, r in sample.iterrows():
            f.write(json.dumps({"report_id": r["Report ID"], "company": r["Reporting Entity"],
                                "narrative": r["Narrative"].strip(), "severity": r["severity"]}) + "\n")
    print(f"wrote {len(sample)} reports to {OUT}")
    print(sample["severity"].value_counts().sort_index().to_string())
    print(sample["Reporting Entity"].value_counts().to_string())


if __name__ == "__main__":
    main()
