"""Claude's draft labels for the holdout set, for PM review.

Labeled from the label spec only, after prompt v2 was committed, so the prompt
couldn't be shaped by these cases. Index = line number in data/golden/holdout_sample.jsonl.
"""
import csv
import json
from pathlib import Path

from draft_labels import AV, AVO, BK, ENV, IT, OBJ, OP, OTH, PD, R, SM, UNC, VRU
from fleet_ops_copilot.routing import route

LABELS = {
    0: (VRU, OP, "red-light runner hit AV, then pedestrians on sidewalk"),
    1: (R, OP, "van swerved right into rear of parked AV"), 2: (R, OP, ""),
    3: (OTH, OP, "oncoming SUV without headlights crossed into AV lane"), 4: (R, OP, ""),
    5: (SM, OP, "pickup moved left into passing AV"), 6: (R, OP, ""), 7: (R, OP, ""),
    8: (PD, OP, "AV passenger opened door into passing bus"), 9: (R, OP, "5-vehicle chain"),
    10: (SM, OP, "pickup passing on narrow street"), 11: (R, OP, "high-speed chain; fatality"),
    12: (OTH, OP, "first responder struck AV with hand tool"), 13: (R, OP, "S3 but narrative never mentions injury"),
    14: (R, OP, ""), 15: (SM, OP, "turning SUV hit rear corner of parked AV"),
    16: (SM, OP, "car pulling out of parallel spot"),
    17: (VRU, OP, "Cruise: other car hit pedestrian into AV's path; AV then dragged pedestrian while pulling over. Spec gap: AV made harm worse after contact"),
    18: (SM, OP, "SUV veered into AV"), 19: (IT, OP, "stop-sign runner pushed car into AV"),
    20: (IT, UNC, "AV rear-ended pickup that braked when a bus cut it off. Spec gap: no scenario for AV striking a lead vehicle"),
    21: (PD, OP, "AV passenger opened door into passing car"), 22: (R, OP, ""),
    23: (BK, OP, "driverless car rolled backward into AV"), 24: (SM, OP, ""),
    25: (IT, OP, "red-light runner chain"), 26: (VRU, OP, "cyclist ran stop sign"),
    27: (SM, OP, "lane-changing car hit rear corner"), 28: (R, OP, "chain"), 29: (SM, OP, "bus passing"),
    30: (BK, OP, ""), 31: (R, OP, ""), 32: (R, OP, "van hit rear of parked AV"), 33: (BK, OP, ""),
    34: (BK, OP, ""), 35: (BK, OP, ""),
    36: (PD, AVO, "test driver steered into parked SUV while avoiding oncoming van; low confidence (could be OTHER_PARTY)"),
    37: (OBJ, AV, "AV reversing into curb; BACKING also fits"),
    38: (OTH, OP, "out-of-control SUV hit pole, rebounded into AV"),
    39: (SM, OP, "SUV sideswiped AV; then test driver swerved into parked truck"),
    40: (OTH, OP, "car crossed double yellow, pushed SUV into AV"), 41: (IT, OP, "dual left turn lane drift"),
    42: (R, OP, ""), 43: (R, OP, ""), 44: (VRU, OP, "pedestrian emerged from behind SUV; AV hard-braked"),
    45: (BK, OP, ""), 46: (IT, OP, ""), 47: (SM, OP, "car passing in opposing lane cut back in"),
    48: (VRU, OP, "AV passenger's door hit cyclist"), 49: (IT, OP, "turning truck passed AV"),
    50: (SM, OP, ""), 51: (R, OP, ""), 52: (VRU, OP, "jaywalking pedestrian walked into stopped AV"),
    53: (VRU, OP, "scooter rear-ended AV"), 54: (R, OP, "chain"),
    55: (BK, AVO, "test driver in manual let AV roll back into parked SUV"), 56: (IT, OP, ""),
}


def main() -> None:
    rows = [json.loads(line) for line in Path("data/golden/holdout_sample.jsonl").open()]
    assert set(LABELS) == set(range(len(rows)))
    with Path("data/golden/holdout_v1_draft.jsonl").open("w") as f, \
         Path("data/golden/holdout_review_sheet.csv").open("w", newline="") as g:
        w = csv.writer(g)
        w.writerow(["idx", "report_id", "company", "severity", "scenario", "contributing_party",
                    "owner", "secondary", "claude_note", "your_correction", "narrative"])
        for i, r in enumerate(rows):
            scenario, party, note = LABELS[i]
            f.write(json.dumps({**r, "scenario": scenario, "contributing_party": party,
                                "label_note": note, "label_status": "claude_draft"}) + "\n")
            owner, secondary = route(r["severity"], scenario, party)
            w.writerow([i, r["report_id"], r["company"], r["severity"], scenario, party,
                        owner, "; ".join(secondary), note, "", r["narrative"]])
    print(f"wrote {len(rows)} draft labels and review sheet")


if __name__ == "__main__":
    main()
