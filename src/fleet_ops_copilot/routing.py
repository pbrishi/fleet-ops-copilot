"""Deterministic routing rules from docs/m1-label-spec.md (section 4).

Routing is business policy, so it lives in code, not in the prompt.
"""
SAFETY = "Safety Incident Response"
AUTONOMY = "Autonomy Behavior Review"
FIELD_OPS = "Field Ops & Mapping"
CLAIMS = "Claims & Recovery"
OPERATOR = "Operator Training & Standards"


def route(severity: str, scenario: str, party: str) -> tuple[str, list[str]]:
    """Return (owner, secondary_teams) for one incident."""
    if severity in ("S1", "S2") or scenario == "VULNERABLE_ROAD_USER":
        owner = SAFETY
    elif party == "AV":
        owner = AUTONOMY
    elif party == "AV_OPERATOR":
        owner = OPERATOR
    elif party == "ENVIRONMENT":
        owner = FIELD_OPS
    elif severity == "S3":
        owner = SAFETY
    else:
        owner = CLAIMS

    secondary = []
    if party == "AV":
        secondary.append(AUTONOMY)
    if party == "AV_OPERATOR":
        secondary.append(OPERATOR)
    if party == "ENVIRONMENT" or scenario == "OBJECT_OR_INFRA":
        secondary.append(FIELD_OPS)
    if party == "OTHER_PARTY":
        secondary.append(CLAIMS)
    if severity == "S3":
        secondary.append(SAFETY)
    return owner, [t for t in secondary if t != owner]
