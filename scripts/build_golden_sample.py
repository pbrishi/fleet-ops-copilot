"""Draw the stratified 120-report golden set sample from the NHTSA SGO ADS data.

Strata follow docs/m1-label-spec.md: all S1, 30 S2, 30 S3, 54 S4, with Waymo
capped at ~60% within each stratum so the set covers more than one writing style.
"""
import json
from pathlib import Path

import pandas as pd

RAW = Path("data/raw/SGO-2021-01_Incident_Reports_ADS.csv")
OUT = Path("data/golden/sample.jsonl")
SEED = 42

SEVERITY_MAP = {
    "Fatality": "S1",
    "Serious W/ Hospitalization": "S1",
    "Moderate W/ Hospitalization": "S2",
    "Moderate W/O Hospitalization": "S2",
    "Minor W/ Hospitalization": "S2",
    "Minor W/O Hospitalization": "S3",
    "Property Damage. No Injured Reported": "S4",
    "No Injured Reported": "S4",
}
TARGETS = {"S1": None, "S2": 30, "S3": 30, "S4": 54}  # None = take all
WAYMO_SHARE = 0.6


def load() -> pd.DataFrame:
    df = pd.read_csv(RAW, low_memory=False, encoding_errors="replace")
    narr = df["Narrative"].fillna("")
    df = df[~narr.str.contains("REDACTED") & (narr.str.len() > 100)]
    # Keep the latest version of each report.
    df = df.sort_values("Report Version").drop_duplicates("Report ID", keep="last")
    df["severity"] = df["Highest Injury Severity Alleged"].map(SEVERITY_MAP)
    return df.dropna(subset=["severity"])


def sample_stratum(group: pd.DataFrame, n: int | None) -> pd.DataFrame:
    if n is None or n >= len(group):
        return group
    is_waymo = group["Reporting Entity"].str.startswith("Waymo")
    others = group[~is_waymo]
    n_other = min(len(others), n - int(n * WAYMO_SHARE))
    picked_other = others.sample(n_other, random_state=SEED)
    picked_waymo = group[is_waymo].sample(n - n_other, random_state=SEED)
    return pd.concat([picked_other, picked_waymo])


def main() -> None:
    df = load()
    sample = pd.concat(sample_stratum(df[df["severity"] == s], n) for s, n in TARGETS.items())
    sample = sample.sample(frac=1, random_state=SEED)  # shuffle so labelers don't see severity order
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w") as f:
        for _, r in sample.iterrows():
            f.write(json.dumps({
                "report_id": r["Report ID"],
                "company": r["Reporting Entity"],
                "narrative": r["Narrative"].strip(),
                "severity": r["severity"],
            }) + "\n")
    print(f"wrote {len(sample)} reports to {OUT}")
    print(sample["severity"].value_counts().sort_index().to_string())
    print(sample["Reporting Entity"].value_counts().to_string())


if __name__ == "__main__":
    main()
