"""Conservative scoring for static indicators.

Repeated files/pattern hits do not multiply the threat score. Scores are
aggregated by behavior category, with a small correlation bonus for multiple
independent high-signal behaviors.
"""
from .detection_rules import DetectionRule, Severity

CATEGORY_CAPS = {
    "Credential Theft": 38.0,
    "Data Exfiltration": 25.0,
    "Execution": 28.0,
    "Obfuscation": 12.0,
    "Collection": 18.0,
    "Discovery": 8.0,
    "Persistence": 18.0,
    "Command and Control": 18.0,
    "Malware Signature": 45.0,
    "Defense Evasion": 10.0,
}

# Rules that are specific enough to materially raise confidence on their own.
HIGH_SIGNAL_PREFIXES = ("CRED-001", "CRED-003", "EXFIL-001", "PERSIST-001", "PERSIST-002", "SIG-001")


def calculate_risk_score(matched_rules: list[DetectionRule]) -> float:
    """Return a 0–100 threat score, deduplicated and capped per category."""
    unique = {rule.id: rule for rule in matched_rules}
    if not unique:
        return 0.0

    category_totals: dict[str, float] = {}
    high_signal = 0
    for rule in unique.values():
        # Generic APIs, encoders, reflection and filesystem references are weak
        # indicators in isolation; keep their contribution deliberately small.
        weight = rule.score_weight
        if rule.id in {"EXEC-003", "OBFS-001", "OBFS-002", "OBFS-003", "FS-003", "HYPE-002", "JAVA-002", "JAVA-003"}:
            weight = min(weight, 4.0)
        category_totals[rule.category] = category_totals.get(rule.category, 0.0) + weight
        if rule.id.startswith(HIGH_SIGNAL_PREFIXES):
            high_signal += 1

    score = sum(min(total, CATEGORY_CAPS.get(category, 12.0)) for category, total in category_totals.items())

    # Correlation bonus only when distinct, high-signal behaviors coexist.
    if high_signal >= 2:
        score += min(12.0, (high_signal - 1) * 4.0)
    elif len(unique) >= 5:
        score += 2.0

    return min(round(score, 1), 100.0)


def calculate_confidence(matched_rules: list) -> int:
    """Estimate confidence in the interpretation, not probability of infection."""
    ids = {getattr(item, "rule_id", None) or getattr(item, "id", None) or getattr(getattr(item, "rule", None), "id", None) for item in matched_rules}
    ids.discard(None)
    if not ids:
        return 0
    strong = sum(1 for rule_id in ids if rule_id.startswith(HIGH_SIGNAL_PREFIXES))
    generic_only = {"EXEC-003", "OBFS-001", "OBFS-002", "OBFS-003", "FS-003", "HYPE-002", "JAVA-002", "JAVA-003"}
    if ids.issubset(generic_only):
        return 25
    return min(95, 35 + strong * 20 + min(20, max(0, len(ids) - strong - 1) * 5))


def score_to_severity(score: float) -> str:
    if score >= 75:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "medium"
    return "low"
