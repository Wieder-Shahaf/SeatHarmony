"""
Shared constants for SeatHarmony wedding seating optimization.

This module centralizes all category definitions to ensure consistency
across the codebase. Import from here instead of defining locally.
"""

# =============================================================================
# GUEST CATEGORY DEFINITIONS
# =============================================================================

# Family categories
IMMEDIATE_FAMILY_CATEGORIES = {"Groom's Family", "Bride's Family"}
EXTENDED_FAMILY_CATEGORIES = {"Groom's Extended Family", "Bride's Extended Family"}
FAMILY_CATEGORIES = IMMEDIATE_FAMILY_CATEGORIES | EXTENDED_FAMILY_CATEGORIES | {"Family Friends"}

# Social group categories
FRIENDS_CATEGORIES = {"Groom's Friends", "Bride's Friends", "Mutual Friends", "Family Friends"}
PROFESSIONAL_CATEGORIES = {"Groom's Work Colleagues", "Bride's Work Colleagues"}
UNIVERSITY_CATEGORIES = {"Groom's Uni Friends", "Bride's Uni Friends"}
SOCIAL_GROUP_CATEGORIES = FRIENDS_CATEGORIES | PROFESSIONAL_CATEGORIES | UNIVERSITY_CATEGORIES

# Side-based categories (for groom/bride separation logic)
GROOM_SIDE_CATEGORIES = {
    "Groom's Family", "Groom's Extended Family", "Groom's Side",
    "Groom's Work Colleagues", "Groom's Uni Friends", "Groom's Friends"
}

BRIDE_SIDE_CATEGORIES = {
    "Bride's Family", "Bride's Extended Family", "Bride's Side",
    "Bride's Work Colleagues", "Bride's Uni Friends", "Bride's Friends"
}

NEUTRAL_CATEGORIES = {"Mutual Friends", "Family Friends"}

# =============================================================================
# HIERARCHICAL OPTIMIZATION PHASE CATEGORIES
# =============================================================================

# Phase 1: VIPs/Family (highest priority)
PHASE_1_CATEGORIES = IMMEDIATE_FAMILY_CATEGORIES | EXTENDED_FAMILY_CATEGORIES

# Phase 2: Close Friends
PHASE_2_CATEGORIES = {"Groom's Friends", "Bride's Friends", "Mutual Friends"}

# Phase 3: Colleagues & University friends
PHASE_3_CATEGORIES = PROFESSIONAL_CATEGORIES | UNIVERSITY_CATEGORIES

# Phase 4: Remaining guests (implicit - any category not in phases 1-3)

# Family sub-categories for hard constraint (no mixing)
GROOM_FAMILY_CATEGORIES = {"Groom's Family", "Groom's Extended Family"}
BRIDE_FAMILY_CATEGORIES = {"Bride's Family", "Bride's Extended Family"}

# =============================================================================
# OPTIMIZATION WEIGHTS
# =============================================================================

# Weight for penalizing higher-numbered tables (small enough to not override main objectives)
TABLE_ORDER_PENALTY_WEIGHT = 0.01

# Penalty weight for cross-side mixing in phases 2-3
CROSS_SIDE_PENALTY_WEIGHT = 2.0

# Base weight for solution repulsion
BASE_REPULSION_WEIGHT = 1.0

# =============================================================================
# STRATEGY DESCRIPTIONS (for UI/explanations)
# =============================================================================

STRATEGY_DESCRIPTIONS = {
    "baseline": "balanced approach",
    "boost_family": "prioritizing keeping families together",
    "boost_social": "prioritizing keeping friend groups together",
    "max_cohesion": "maximizing group togetherness",
    "max_mingling": "encouraging mixing between bride and groom sides",
    "reduce_social": "flexible social groupings",
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

from typing import Optional


def is_groom_side(category: Optional[str]) -> bool:
    """Check if category belongs to groom's side."""
    return category in GROOM_SIDE_CATEGORIES if category else False


def is_bride_side(category: Optional[str]) -> bool:
    """Check if category belongs to bride's side."""
    return category in BRIDE_SIDE_CATEGORIES if category else False


def is_family_category(category: Optional[str]) -> bool:
    """Check if category is a family category."""
    return category in FAMILY_CATEGORIES if category else False


def is_social_group_category(category: Optional[str]) -> bool:
    """Check if category is a social group category (friends, work, uni)."""
    return category in SOCIAL_GROUP_CATEGORIES if category else False


def get_guest_side(category: Optional[str]) -> str:
    """
    Determine which wedding side a guest belongs to based on their category.
    Returns: "groom's side", "bride's side", or "neutral"
    """
    if not category:
        return "neutral"
    if category in GROOM_SIDE_CATEGORIES:
        return "groom's side"
    if category in BRIDE_SIDE_CATEGORIES:
        return "bride's side"
    return "neutral"
