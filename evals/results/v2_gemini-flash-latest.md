# Eval: prompt `v2`, model `gemini-flash-latest`

Reports scored: 120 of 120 (0 API errors)

## Headline

| Metric | Result |
|---|---|
| **Serious-incident recall** (gold S1/S2 predicted S1/S2) | **94%** (34/36) |
| Critical (S1) caught as S1/S2 | 100% (6/6) |
| Over-escalation (gold S3/S4 predicted S1/S2) | 0 reports |
| Owner team correct | 96% (115/120) |

## Field accuracy

| Field | Accuracy |
|---|---|
| severity | 95% (114/120) |
| scenario | 95% (114/120) |
| contributing_party | 97% (116/120) |
| owner | 96% (115/120) |
| secondary teams | precision 99%, recall 91% |

## Severity confusion (rows = gold, columns = predicted)

| gold \ pred | S1 | S2 | S3 | S4 |
|---|---|---|---|---|
| **S1** | 6 | 0 | 0 | 0 |
| **S2** | 0 | 28 | 1 | 1 |
| **S3** | 0 | 0 | 26 | 4 |
| **S4** | 0 | 0 | 0 | 54 |

## Most common contributing_party errors (gold → predicted)

- OTHER_PARTY → UNCLEAR: 2
- UNCLEAR → OTHER_PARTY: 1
- ENVIRONMENT → AV: 1

## Most common scenario errors (gold → predicted)

- REAR_STRUCK → INTERSECTION_TURN: 2
- INTERSECTION_TURN → OTHER: 1
- OTHER → PARKED_OR_DOOR: 1
- REAR_STRUCK → PARKED_OR_DOOR: 1
- SIDESWIPE_MERGE → INTERSECTION_TURN: 1

## Missed serious incidents

- `30413-14938` gold S2, predicted S4: A third-party UTV ran a red light and struck a moving AV at an intersection; no injuries were reported.
- `30270-15667` gold S2, predicted S3: While manually slowing in the right lane, the AV was struck on its rear-left side by an overtaking SUV, causing alleged minor injuries to the test driver.

## Usage

Input tokens: 130,487. Output tokens (incl. thinking): 99,681.
