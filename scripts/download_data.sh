#!/usr/bin/env bash
# Download NHTSA Standing General Order 2021-01 crash reports for ADS (automated driving system) vehicles.
# Source: https://www.nhtsa.gov/laws-regulations/standing-general-order-crash-reporting
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data/raw
BASE=https://static.nhtsa.gov/odi/ffdd/sgo-2021-01
for f in SGO-2021-01_Incident_Reports_ADS.csv SGO-2021-01_Data_Element_Definitions.pdf; do
  curl -fsSL -A "Mozilla/5.0" -o "data/raw/$f" "$BASE/$f"
  echo "downloaded data/raw/$f"
done
# 2021-2025 archive (used for holdout S1 cases)
curl -fsSL -A "Mozilla/5.0" -o data/raw/archive_SGO-2021-01_Incident_Reports_ADS.csv "$BASE/Archive-2021-2025/SGO-2021-01_Incident_Reports_ADS.csv"
echo "downloaded data/raw/archive_SGO-2021-01_Incident_Reports_ADS.csv"
