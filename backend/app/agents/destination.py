"""
Destination Discovery Agent.

Given a completed TripState (trip type, origin, budget, duration,
preferences), recommends 3 candidate destinations, picks the best one,
and resolves IATA codes for both origin and destination.

Uses Claude when an API key is set; otherwise returns curated mock
destinations so the demo always works.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

from app.agents.state import TripState

# ── IATA lookup table (common Indian cities + popular destinations) ───
IATA_MAP: dict[str, str] = {
    "kolkata": "CCU", "delhi": "DEL", "new delhi": "DEL",
    "mumbai": "BOM", "bengaluru": "BLR", "bangalore": "BLR",
    "chennai": "MAA", "hyderabad": "HYD", "pune": "PNQ",
    "jaipur": "JAI", "lucknow": "LKO", "ahmedabad": "AMD",
    "goa": "GOI", "kochi": "COK", "cochin": "COK",
    "thiruvananthapuram": "TRV", "trivandrum": "TRV",
    "varanasi": "VNS", "amritsar": "ATQ", "udaipur": "UDR",
    "srinagar": "SXR", "leh": "IXL", "manali": "KUU",
    "shimla": "SLV", "darjeeling": "IXB", "siliguri": "IXB",
    "pondicherry": "PNY", "andaman": "IXZ", "port blair": "IXZ",
    # International popular
    "dubai": "DXB", "singapore": "SIN", "bangkok": "BKK",
    "paris": "CDG", "london": "LHR", "new york": "JFK",
    "tokyo": "NRT", "bali": "DPS", "maldives": "MLE",
    "male": "MLE", "colombo": "CMB", "sri lanka": "CMB",
    "kathmandu": "KTM", "nepal": "KTM", "phuket": "HKT",
    "kuala lumpur": "KUL", "hong kong": "HKG",
    "rome": "FCO", "barcelona": "BCN", "istanbul": "IST",
    "sydney": "SYD", "melbourne": "MEL",
}


def resolve_iata(city: str) -> str:
    """Best-effort city → IATA code resolution."""
    key = city.strip().lower()
    return IATA_MAP.get(key, key[:3].upper())


# ── Mock destination sets keyed by preference ─────────────────────────
_MOCK_DESTINATIONS: dict[str, list[str]] = {
    "Beach": ["Goa", "Andaman", "Maldives"],
    "Mountains": ["Manali", "Leh", "Darjeeling"],
    "City": ["Dubai", "Singapore", "Bangkok"],
    "Nature": ["Munnar", "Coorg", "Meghalaya"],
    "Nightlife": ["Goa", "Bangkok", "Dubai"],
    "Food": ["Delhi", "Bangkok", "Istanbul"],
    "Shopping": ["Dubai", "Singapore", "Bangkok"],
    "Historical": ["Jaipur", "Varanasi", "Rome"],
}


async def run_destination_agent(state: TripState) -> dict[str, Any]:
    """Return {"candidates": [...], "selected": str, "originCode": str, "destinationCode": str}"""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return _mock_destination(state)

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=400,
            system=(
                "You are a travel destination expert. Given a traveler's profile, "
                "suggest exactly 3 destinations. Return ONLY a JSON object with:\n"
                '- "candidates": array of 3 city/region names\n'
                '- "selected": the single best pick from the 3\n'
                "No markdown fences."
            ),
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Trip type: {state.trip_type}\n"
                        f"Origin: {state.origin}\n"
                        f"Budget: ₹{state.budget_inr:,}\n"
                        f"Duration: {state.duration_days} days\n"
                        f"Travelers: {state.adults} adults, {state.children} children\n"
                        f"Preferences: {', '.join(state.preferences)}"
                    ),
                }
            ],
        )
        text = resp.content[0].text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```\w*\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        data = json.loads(text)
        selected = data.get("selected", data["candidates"][0])
        return {
            "candidates": data["candidates"],
            "selected": selected,
            "originCode": resolve_iata(state.origin or "DEL"),
            "destinationCode": resolve_iata(selected),
        }
    except Exception:
        return _mock_destination(state)


def _mock_destination(state: TripState) -> dict[str, Any]:
    pref = state.preferences[0] if state.preferences else "City"
    candidates = _MOCK_DESTINATIONS.get(pref, ["Goa", "Dubai", "Bangkok"])
    # Filter out origin if it matches a candidate
    origin_lower = (state.origin or "").lower()
    candidates = [c for c in candidates if c.lower() != origin_lower] or candidates
    selected = candidates[0]
    return {
        "candidates": candidates[:3],
        "selected": selected,
        "originCode": resolve_iata(state.origin or "Delhi"),
        "destinationCode": resolve_iata(selected),
    }
