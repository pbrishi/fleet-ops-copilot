# Rider copilot eval: `v2`, model `gemini-flash-latest`, judge `gemini-pro-latest`

Cases scored: 52 of 52

## Headline

| Metric | Result |
|---|---|
| **All checks pass** | **98%** (51/52) |
| **Emergency recall** (emergency cases flagged emergency) | **100%** (6/6) |
| False emergencies | 0 |
| Escalation correct | 98% |
| Faithful (judge) | 100% |
| Cites expected article | 100% |
| Uses required facts | 100% |
| No forbidden content | 100% |
| 3 sentences or fewer | 100% |

## Pass rate by case type

| Type | Pass |
|---|---|
| kb | 100% (20/20) |
| context | 100% (15/15) |
| emergency | 100% (7/7) |
| scope | 80% (4/5) |
| adversarial | 100% (5/5) |

## Failures

- **r45** (scope, none) "did one of your cars crash on the news last week? whose fault was it" failed escalation. Got escalation `human`, cited []. Reply: "I can't comment on news stories or the cause of a specific crash. I'm connecting you with a support agent now."
