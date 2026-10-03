# M1 Label Spec: Incident Triage

**Status:** v0.3, labeling rules added from first labeling pass (2026-10-03)
**Data:** NHTSA SGO 2021-01 ADS incident reports, 1,429 usable reports after removing redacted narratives and duplicate versions

## What the triage model does

Input: one incident narrative (free text, as written by the AV company).
Output: four fields.

| Field | Who decides | Ground truth source |
|---|---|---|
| 1. Severity | LLM | **Free:** NHTSA's `Highest Injury Severity Alleged` field |
| 2. Scenario | LLM | Human-reviewed labels |
| 3. Contributing party | LLM | Human-reviewed labels |
| 4. Routing | **Rules, not the LLM** | Derived from fields 1-3 |
| 5. Summary | LLM | LLM-as-judge rubric |

**Design choice:** the LLM extracts facts; deterministic rules route. Routing is business policy, so it should be auditable and changeable without re-prompting or re-running evals on the model.

---

## 1. Severity (4 levels)

| Level | Meaning | NHTSA values mapped | Count |
|---|---|---|---:|
| **S1 Critical** | Death or serious injury | Fatality; Serious W/ Hospitalization | 6 |
| **S2 High** | Injury needing hospital care, or moderate injury | Moderate W/ Hospitalization; Moderate W/O Hospitalization; Minor W/ Hospitalization | 48 |
| **S3 Medium** | Minor injury, no hospital | Minor W/O Hospitalization | 84 |
| **S4 Low** | No injury | Property Damage. No Injured Reported; No Injured Reported | 1,269 |
| _excluded_ | | Unknown | 22 |

**Feasibility check:** 183 of 193 injury reports mention injury in the narrative, so severity is inferable from text alone.

**Known label noise:** 147 "no injury" reports also mention injury words (e.g., "no injuries were reported"). Good test of whether the model reads negation correctly.

**Primary metric:** recall on S1+S2. Missing a serious incident is far worse than over-escalating a fender bender. An "always S4" model would score ~90% accuracy, so plain accuracy is not the headline number.

## 2. Scenario (8 categories, pick one)

What physically happened. Derived from reading samples plus keyword and structured-field counts across the dataset.

| Code | Definition | Example | Rough frequency signal |
|---|---|---|---|
| `REAR_STRUCK` | Another road user hit the AV from behind while it was stopped or slowing | SUV rolls forward into the AV at a red light | ~400 narratives describe a stopped AV hit from behind |
| `SIDESWIPE_MERGE` | Contact while a vehicle was passing, changing lanes, merging or squeezing by | Truck changes lanes into the AV's side | Passing 170, lane change 94 (other party) |
| `INTERSECTION_TURN` | Conflict while either party was turning, crossing, or entering from a driveway/lot | Car exits a driveway into the AV's side | Turning ~140, entering traffic 49 |
| `BACKING` | Either party reversing | Delivery truck reverses into the AV | Other party backing 160, AV backing 20 |
| `PARKED_OR_DOOR` | Contact with a parked vehicle or an opening door | Parked car's door opens into the passing AV | ~70 door mentions |
| `VULNERABLE_ROAD_USER` | Contact involving a pedestrian, cyclist, scooter or similar | AV and cyclist make contact at low speed | ~100 mentions |
| `OBJECT_OR_INFRA` | Fixed object, debris, animal, gate, pole, curb, cone, utility line | AV contacts a fallen utility line | ~300 object mentions |
| `OTHER` | None of the above, including vandalism and multi-vehicle chains | Person kicks the AV | small |

**Tie-break rule:** if two fit, choose the one that describes the *first contact*. If a VRU is involved at all, choose `VULNERABLE_ROAD_USER` (safety priority).

## 3. Contributing party (pick one)

Whose action most directly led to contact, **according to the narrative**.

| Code | Definition |
|---|---|
| `AV` | The AV's own motion or decision led to contact (e.g., AV proceeds and contacts a pole, AV turns into a car's path) |
| `OTHER_PARTY` | Another road user's action led to contact (e.g., rear-ended while stopped) |
| `ENVIRONMENT` | Road conditions, debris, infrastructure, or animals |
| `UNCLEAR` | The narrative doesn't give enough to decide |

**Important caveat for the write-up:** narratives are written by the AV company itself, so they describe events from that company's point of view. We're labeling *what the narrative says*, not legal fault. The label is named "contributing party," not "fault," on purpose.

## 4. Routing (rules applied to fields 1-3)

Each incident gets **one owning team** plus **zero or more secondary teams**. The owner is accountable for closing the incident; secondaries are looped in for their part.

**Owner:** rules run top to bottom; first match wins.

| # | Rule | Owner |
|---|---|---|
| 1 | Severity is S1 or S2, **or** scenario is `VULNERABLE_ROAD_USER` (any severity) | **Safety Incident Response** (page within 1 hour) |
| 2 | Contributing party is `AV` | **Autonomy Behavior Review** (driving behavior triage) |
| 3 | Contributing party is `ENVIRONMENT` | **Field Ops & Mapping** (check map, report hazard) |
| 4 | Severity S3 | **Safety Incident Response** (next business day) |
| 5 | Everything else (S4, other party, unclear) | **Claims & Recovery** (insurance, repair) |

**Secondary teams:** add each team below whose condition is true, unless it's already the owner.

| Condition | Secondary team | Why |
|---|---|---|
| Contributing party is `AV` | Autonomy Behavior Review | Every AV-caused contact gets a behavior review, even when Safety owns it |
| Contributing party is `ENVIRONMENT`, or scenario is `OBJECT_OR_INFRA` | Field Ops & Mapping | Hazards and infrastructure need a field check |
| Contributing party is `OTHER_PARTY` | Claims & Recovery | Recover repair costs from the other party |
| Severity is S3 | Safety Incident Response | Any injury gets a Safety look |

**Eval:** owner is scored as exact match; secondaries are scored as set precision/recall. Because routing is computed from fields 1-3, routing errors trace back to a specific upstream field error.

## 5. Summary

One sentence, max 30 words, for an ops lead skimming a queue. Must state: what hit what, the AV's state (stopped / moving / turning), and injuries if any.

**Judge rubric (each pass/fail):** faithful (no facts absent from the narrative), complete (has the three required elements), concise (≤ 30 words).

---

## Labeling rules (added after labeling 120 reports)

Edge cases that came up while drafting the golden set, and how they were resolved.

**Scenario**
- **Rear vs. sideswipe:** a vehicle squarely following the AV that hits its rear is `REAR_STRUCK`. A vehicle that was swerving, passing or changing lanes when it hit the AV's rear corner is `SIDESWIPE_MERGE`.
- **Chain reactions:** label by how the AV itself was contacted. A car pushed into the AV's rear is `REAR_STRUCK`.
- **Head-on / wrong-way:** `OTHER`. Only 4 of 120, so no new category yet.
- **Motorcycles count as vulnerable road users,** as do riders' passengers and people standing outside the AV (e.g., a rider at an open door).
- **Non-contact events** (the AV's maneuver led to a crash between other vehicles): label the maneuver; usually `SIDESWIPE_MERGE`.

**Contributing party**
- **Objects:** if the AV hit a normal, designed feature (curb, speed bump, gate track, pole, vegetation, raised pavement), the party is `AV`. If it hit a defect or unexpected hazard (pothole, debris, downed line, rolling ball), the party is `ENVIRONMENT`.
- **AV changing lanes into an occupied space, with no blame stated:** `UNCLEAR`.
- **The AV's own human operator** (test driver in manual mode, remote operator, safety driver who was drowsy or intervened) caused the contact: currently `AV`. **Open question, see below.**
- **The AV's own passenger** (e.g., opening a door while moving): `OTHER_PARTY`.

**Severity**
- Severity comes from NHTSA's field and isn't relabeled, even when the narrative doesn't mention the injury (1 case in the golden set). These are kept as known label noise.

## Open questions from labeling

5. **Operator-caused incidents.** 7 of the 15 `AV` labels were caused by the company's own human operators, not the driving software. Routing them to Autonomy Behavior Review sends them to the wrong team. Options: (a) add an `AV_OPERATOR` party that routes to a new **Operator Training & Standards** team, (b) keep `AV` and accept the misroute, (c) keep `AV` and add Operator Training as a secondary.

## Golden set plan

- **Size:** 120 reports, stratified so rare classes are represented
  - Severity: all 6 S1, 30 S2, 30 S3, 54 S4
  - Company mix: cap Waymo at ~60% so the model isn't only tested on one writing style
- **Labeling:** Claude drafts scenario + contributing party; PM reviews every label (est. 2 hours). The model under test is Gemini, so a different model drafts the labels to avoid grading a model against its own opinions.
- **Holdout:** the remaining ~1,300 reports stay unlabeled for spot-checks and a later larger run.

## Decision log

| # | Question | Decision (2026-10-03) |
|---|---|---|
| 1 | 4 severity levels, or merge S2 and S3? | Keep 4 levels |
| 2 | Pedestrian/cyclist incidents always to Safety, even with no injury? | Yes |
| 3 | 8 scenario codes the right granularity? | Yes |
| 4 | Allow secondary teams? | Yes: one owner plus optional secondaries |
