"""Identity assurance levels — explicit semantics instead of an ambiguous boolean.

self_attested is the candidate's own claim; government_id_verified is a third-party
KYC match. Employer-facing 'verified' filters and badges mean independent verification
only — the two must never be conflated.
"""
from typing import Literal

IdentityLevel = Literal["unverified", "self_attested", "government_id_verified"]

UNVERIFIED: IdentityLevel = "unverified"
SELF_ATTESTED: IdentityLevel = "self_attested"
GOVERNMENT_ID: IdentityLevel = "government_id_verified"


def level_from_method(method: str | None) -> IdentityLevel:
    """Deterministic mapping used both at write time and in the backfill migration."""
    if method is None:
        return UNVERIFIED
    if method.startswith("smile:"):
        return GOVERNMENT_ID
    if method == "attested":
        return SELF_ATTESTED
    return UNVERIFIED


def independently_verified(level: str | None) -> bool:
    return level == GOVERNMENT_ID


def label(level: str | None) -> str:
    """Plain-language evidence label shown to employers."""
    if level == GOVERNMENT_ID:
        return "Government ID verified"
    if level == SELF_ATTESTED:
        return "Self-attested"
    return "Not independently verified"
