# Centralized config for user tiers and account types
# Edit this file to adjust feature access and thresholds for each tier/type

TIERS = {
    "free": {
        "max_ideas": 50,
        "deep_dive": False,
        "market_snapshot": False,
        "lenses": False,
        "export_tools": False,
        "team": False,
        "priority_support": False,
    },
    "premium": {
        "max_ideas": 1000,
        "deep_dive": True,
        "market_snapshot": True,
        "lenses": True,
        "export_tools": True,
        "team": True,
        "priority_support": True,
    }
}

ACCOUNT_TYPES = {
    "solo": {
        "max_team_members": 1,
        "collaboration": False,
    },
    "team": {
        "max_team_members": 10,
        "collaboration": True,
    }
}

def get_tier_config(tier: str) -> dict:
    return TIERS.get(tier, TIERS["free"])

def get_account_type_config(account_type: str) -> dict:
    return ACCOUNT_TYPES.get(account_type, ACCOUNT_TYPES["solo"]) 