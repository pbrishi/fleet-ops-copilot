"""Claude's draft labels for the golden set (scenario + contributing party).

Drafted by Claude (Opus 5.5) from reading each narrative, to be reviewed by the PM.
Gemini is the model under test, so it doesn't label its own answer key.
Index = line number in data/golden/sample.jsonl. Notes flag low-confidence or interesting cases.
"""
import json
from pathlib import Path

R, SM, IT, BK, PD, VRU, OBJ, OTH = (
    "REAR_STRUCK", "SIDESWIPE_MERGE", "INTERSECTION_TURN", "BACKING",
    "PARKED_OR_DOOR", "VULNERABLE_ROAD_USER", "OBJECT_OR_INFRA", "OTHER",
)
AV, AVO, OP, ENV, UNC = "AV", "AV_OPERATOR", "OTHER_PARTY", "ENVIRONMENT", "UNCLEAR"

# idx: (scenario, contributing_party, note)
LABELS = {
    0: (BK, OP, ""), 1: (R, OP, "hit-and-run"), 2: (VRU, OP, "car hit cyclist; bike thrown into AV"),
    3: (BK, OP, ""), 4: (OTH, OP, "wrong-way head-on"), 5: (IT, OP, "exiting parking lot"),
    6: (IT, OP, ""), 7: (IT, OP, "red-light runner"), 8: (VRU, OP, "e-scooter"),
    9: (OBJ, AV, "downed utility line already across road; AV proceeded into it (PM review)"), 10: (R, OP, ""), 11: (R, OP, ""),
    12: (R, OP, "other driver on phone"), 13: (IT, OP, ""), 14: (PD, OP, "door opened into passing AV"),
    15: (R, OP, ""), 16: (OBJ, AV, "fallen utility line already in lane; AV drove into it"), 17: (VRU, OP, "motorcycle; second vehicle struck rider"),
    18: (SM, OP, "pulled from curb"), 19: (OBJ, AV, "vegetation in alley"), 20: (R, OP, "pushed into vehicle ahead"),
    21: (VRU, OP, "wrong-way e-bike"), 22: (VRU, OP, "cyclist rear-ended AV"), 23: (IT, AV, "AV turned left from non-turn lane"),
    24: (SM, OP, ""), 25: (R, OP, "AV parked partially in lane"), 26: (OTH, OP, "crossed double yellow, head-on"),
    27: (BK, OP, ""), 28: (R, OP, ""), 29: (OBJ, AV, "speed bump"),
    30: (SM, UNC, "AV stopped across two lanes in front of bus; low confidence"),
    31: (IT, OP, "failed to yield"), 32: (VRU, OP, "passenger exited moving AV; foot run over"),
    33: (BK, OP, ""), 34: (R, OP, ""), 35: (BK, OP, ""), 36: (R, OP, "multi-vehicle chain"),
    37: (R, OP, ""), 38: (SM, UNC, "AV lane change in front of stopped pickup; low confidence"),
    39: (IT, OP, "red-light runner; rollover"), 40: (R, OP, "multi-vehicle intersection chain; low confidence on scenario"),
    41: (IT, OP, "turning SUV crossed double yellow"), 42: (IT, OP, "hit-and-run"), 43: (VRU, OP, "motorcycle rear-ended AV"),
    44: (SM, OP, "truck passing"), 45: (IT, OP, ""), 46: (SM, OP, "SUV swerved right from behind; then hit pole"),
    47: (IT, OP, ""), 48: (SM, UNC, "non-contact: AV lane change, two other vehicles collided"),
    49: (VRU, OP, "scooter against signal"), 50: (SM, OP, ""), 51: (SM, AVO, "test driver in manual mode"),
    52: (R, OP, ""), 53: (BK, OP, "reversing to parallel park"), 54: (IT, OP, ""), 55: (BK, OP, ""),
    56: (IT, OP, "ran stop sign; hit-and-run"), 57: (OBJ, AVO, "teleoperator drove onto curb into fence"),
    58: (OBJ, AVO, "operator took manual control into curb"),
    60: (OBJ, ENV, "debris revealed suddenly; AV chose least-bad option"), 61: (OTH, OP, "wrong-way head-on into parked AV"),
    62: (IT, AVO, "test driver in manual mode; ADS not engaged"), 63: (R, OP, "chain; AV parked"),
    64: (OBJ, AV, "gate track"), 65: (R, OP, ""), 66: (R, OP, ""), 67: (SM, AVO, "operator manual lane change"),
    68: (VRU, OP, "car hit pedestrian then AV"), 69: (IT, OP, "SUV squeezed past turning AV; low confidence on scenario"),
    70: (SM, OP, "low confidence on scenario"), 71: (OBJ, AV, "raised pavement"),
    72: (OBJ, AVO, "operator fell asleep, hand blocked steering"), 73: (IT, OP, "hit-and-run"),
    74: (OBJ, ENV, "basketball rolled into lane"), 75: (OBJ, AV, "AV steered around tree into pothole"), 76: (R, OP, "S3 but narrative never mentions injury"),
    77: (SM, OP, ""), 78: (SM, OP, ""), 79: (R, OP, ""), 80: (IT, OP, ""), 81: (R, OP, ""), 82: (R, OP, ""),
    83: (OBJ, AVO, "drowsy operator disengaged"), 84: (IT, OP, ""), 85: (R, OP, "chain"), 86: (R, OP, ""),
    87: (SM, OP, ""), 88: (BK, OP, ""), 89: (R, OP, "chain"),
    90: (SM, UNC, "AV (safety driver) hit tow truck that cut in and braked"), 91: (R, OP, "vehicle fire"),
    92: (R, OP, ""), 93: (R, OP, ""), 94: (IT, OP, ""), 95: (R, OP, "chain"), 96: (R, OP, "hit-and-run"),
    97: (OTH, OP, "crossed center line, head-on"), 98: (IT, OP, "garbage truck turning"), 99: (SM, OP, ""),
    100: (R, OP, ""), 101: (VRU, OP, "cyclist against signal"), 102: (VRU, OP, "fatal; SUV hit pedestrian"),
    103: (IT, OP, "red-light runner"), 104: (PD, OP, "AV's own passenger opened door into another AV"),
    105: (SM, OP, ""), 106: (SM, OP, "non-contact: vehicles going around stopped AV collided"),
    107: (IT, OP, ""), 108: (BK, OP, ""), 109: (PD, AV, "mirror hit parked tow truck"),
    110: (SM, AV, "AV lane change into pickup"), 111: (OBJ, AV, "pavement at driveway"),
    112: (VRU, OP, "passenger standing at open door struck"), 113: (R, OP, ""),
    114: (OBJ, ENV, "uneven pavement punctured tire"), 115: (R, OP, ""),
    116: (SM, OP, "test driver in manual mode"), 117: (R, OP, ""), 118: (R, OP, ""), 119: (R, OP, ""),
    59: (BK, OP, ""),
}


def main() -> None:
    rows = [json.loads(line) for line in Path("data/golden/sample.jsonl").open()]
    assert set(LABELS) == set(range(len(rows))), "every sampled report needs a label"
    out = Path("data/golden/golden_v1_draft.jsonl")
    with out.open("w") as f:
        for i, r in enumerate(rows):
            scenario, party, note = LABELS[i]
            f.write(json.dumps({**r, "scenario": scenario, "contributing_party": party,
                                "label_note": note, "label_status": "claude_draft"}) + "\n")
    print(f"wrote {len(rows)} labels to {out}")


if __name__ == "__main__":
    main()
