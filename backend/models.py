from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class Guest:
    id: str
    name: str
    group_id: Optional[str] = None
    importance: int = 0
    tags: List[str] = field(default_factory=list)
    must_sit_with: List[str] = field(default_factory=list)
    must_not_sit_with: List[str] = field(default_factory=list)


@dataclass
class Table:
    id: str
    name: str
    capacity: int
    zone: Optional[str] = None
    constraints: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VenueConfig:
    tables: List[Table]
    settings: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ConstraintSummary:
    satisfied_soft: Dict[str, int] = field(default_factory=dict)
    violated_soft: Dict[str, int] = field(default_factory=dict)
    hard_violations: List[str] = field(default_factory=list)


@dataclass
class Layout:
    id: str
    assignments: Dict[str, str]  # guest_id -> table_id
    score: float
    objective_breakdown: Dict[str, float] = field(default_factory=dict)
    variant_label: Optional[str] = None
    variant_id: Optional[str] = None
    summary: Optional[ConstraintSummary] = None


def guests_from_dicts(data: List[Dict[str, Any]]) -> List[Guest]:
    return [Guest(**item) for item in data]


def tables_from_dicts(data: List[Dict[str, Any]]) -> List[Table]:
    return [Table(**item) for item in data]


def layout_to_dict(layout: Layout) -> Dict[str, Any]:
    return {
        "id": layout.id,
        "assignments": layout.assignments,
        "score": layout.score,
        "objective_breakdown": layout.objective_breakdown,
        "variant_label": layout.variant_label,
        "variant_id": layout.variant_id,
        "summary": {
            "satisfied_soft": layout.summary.satisfied_soft if layout.summary else {},
            "violated_soft": layout.summary.violated_soft if layout.summary else {},
            "hard_violations": layout.summary.hard_violations if layout.summary else [],
        },
    }


