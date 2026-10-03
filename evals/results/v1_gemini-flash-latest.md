# Eval: prompt `v1`, model `gemini-flash-latest`

Reports scored: 120 of 120 (0 API errors)

## Headline

| Metric | Result |
|---|---|
| **Serious-incident recall** (gold S1/S2 predicted S1/S2) | **92%** (33/36) |
| Critical (S1) caught as S1/S2 | 100% (6/6) |
| Over-escalation (gold S3/S4 predicted S1/S2) | 0 reports |
| Owner team correct | 93% (112/120) |

## Field accuracy

| Field | Accuracy |
|---|---|
| severity | 94% (113/120) |
| scenario | 91% (109/120) |
| contributing_party | 93% (112/120) |
| owner | 93% (112/120) |
| secondary teams | precision 97%, recall 90% |

## Severity confusion (rows = gold, columns = predicted)

| gold \ pred | S1 | S2 | S3 | S4 |
|---|---|---|---|---|
| **S1** | 6 | 0 | 0 | 0 |
| **S2** | 0 | 27 | 2 | 1 |
| **S3** | 0 | 0 | 26 | 4 |
| **S4** | 0 | 0 | 0 | 54 |

## Most common contributing_party errors (gold → predicted)

- UNCLEAR → OTHER_PARTY: 4
- AV → ENVIRONMENT: 3
- ENVIRONMENT → AV: 1

## Most common scenario errors (gold → predicted)

- SIDESWIPE_MERGE → REAR_STRUCK: 4
- VULNERABLE_ROAD_USER → REAR_STRUCK: 2
- SIDESWIPE_MERGE → OTHER: 2
- OTHER → PARKED_OR_DOOR: 1
- REAR_STRUCK → PARKED_OR_DOOR: 1
- REAR_STRUCK → INTERSECTION_TURN: 1

## Missed serious incidents

- `30413-14938` gold S2, predicted S4: A third-party utility vehicle ran a red light and struck a moving AV at an intersection, resulting in vehicle damage but no reported injuries.
- `13781-11375` gold S2, predicted S3: While creeping forward at 2 mph yielding to traffic, the AV was rear-ended by an SUV, causing minor pain reported by the safety monitor.
- `30270-15667` gold S2, predicted S3: While slowing in manual mode, the Waymo AV was struck on its rear left side by an approaching SUV, causing alleged minor injuries to the test driver.

## Usage

Input tokens: 71,807. Output tokens (incl. thinking): 64,486.
