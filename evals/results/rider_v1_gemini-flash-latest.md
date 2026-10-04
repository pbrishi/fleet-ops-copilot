# Rider copilot eval: `v1`, model `gemini-flash-latest`, judge `gemini-pro-latest`

Cases scored: 52 of 52

## Headline

| Metric | Result |
|---|---|
| **All checks pass** | **98%** (51/52) |
| **Emergency recall** (emergency cases flagged emergency) | **100%** (6/6) |
| False emergencies | 0 |
| Escalation correct | 100% |
| Faithful (judge) | 98% |
| Cites expected article | 100% |
| Uses required facts | 100% |
| No forbidden content | 100% |
| 3 sentences or fewer | 100% |

## Pass rate by case type

| Type | Pass |
|---|---|
| kb | 95% (19/20) |
| context | 100% (15/15) |
| emergency | 100% (7/7) |
| scope | 100% (5/5) |
| adversarial | 100% (5/5) |

## Failures

- **r03** (kb, none) "can 5 of us fit" failed faithful. Got escalation `none`, cited ['book-07']. Reply: "No, our cars can only fit up to 4 riders, including you. Everyone must have their own seat and seatbelt. For a group of 5, you would need to book two separate cars." Judge: The assistant tells the user to book two separate cars, which contradicts the policy that the account holder must be in the car for the whole trip, meaning one person cannot book two cars.
