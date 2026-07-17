"""
Hotel / Stays Search Agent.

Searches for hotel offers using the Duffel Stays API.  Falls back to
realistic mock data when no DUFFEL_API_KEY is set.
"""
from __future__ import annotations

import os
import random
from datetime import date, timedelta
from typing import Any

import httpx

from app.agents.state import TripState

DUFFEL_BASE = "https://api.duffel.com"
DUFFEL_VERSION = "v2"

# Approximate lat/lng for common destinations
_GEO: dict[str, tuple[float, float]] = {
    "GOI": (15.3800, 73.8314),
    "IXZ": (11.6410, 92.7297),
    "DPS": (-8.6500, 115.2167),
    "MLE": (4.1755, 73.5093),
    "DEL": (28.5562, 77.1000),
    "BOM": (19.0896, 72.8656),
    "BLR": (13.1986, 77.7066),
    "CCU": (22.6520, 88.4463),
    "MAA": (12.9941, 80.1709),
    "JAI": (26.8242, 75.8122),
    "UDR": (24.6177, 73.6809),
    "SXR": (33.9871, 74.7742),
    "IXL": (34.1359, 77.5465),
    "KUU": (31.8767, 77.1547),
    "DXB": (25.2532, 55.3657),
    "SIN": (1.3644, 103.9915),
    "BKK": (13.6900, 100.7501),
    "CDG": (49.0097, 2.5479),
    "LHR": (51.4700, -0.4543),
    "NRT": (35.7720, 140.3929),
    "CMB": (7.1808, 79.8843),
    "KTM": (27.6966, 85.3591),
    "HKT": (8.1132, 98.3169),
    "IST": (41.2753, 28.7519),
    "FCO": (41.8003, 12.2389),
    "BCN": (41.2974, 2.0833),
}


async def run_hotel_agent(state: TripState) -> list[dict[str, Any]]:
    """Search hotels and return a list of stay dicts."""
    api_key = os.getenv("DUFFEL_API_KEY", "")
    if not api_key:
        return _mock_hotels(state)

    try:
        return await _duffel_search(state, api_key)
    except Exception:
        return _mock_hotels(state)


async def _duffel_search(state: TripState, api_key: str) -> list[dict[str, Any]]:
    dest_code = state.destination_code or "GOI"
    lat, lng = _GEO.get(dest_code, (15.38, 73.83))

    check_in = (date.today() + timedelta(days=14)).isoformat()
    check_out = (date.today() + timedelta(days=14 + (state.duration_days or 5))).isoformat()

    guests = [{"type": "adult"} for _ in range(state.adults)]
    guests += [{"type": "adult"} for _ in range(state.children)]  # Duffel uses "adult" for kids in some cases

    payload = {
        "data": {
            "location": {
                "radius": 10,
                "geographic_coordinates": {
                    "latitude": lat,
                    "longitude": lng,
                },
            },
            "check_in_date": check_in,
            "check_out_date": check_out,
            "rooms": 1,
            "guests": guests,
        }
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Duffel-Version": DUFFEL_VERSION,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{DUFFEL_BASE}/stays/search",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()

    results_raw = data.get("data", {}).get("results", data.get("data", []))
    if isinstance(results_raw, dict):
        results_raw = results_raw.get("results", [])

    results: list[dict[str, Any]] = []
    for item in results_raw[:6]:
        accommodation = item.get("accommodation", item)
        cheapest = item.get("cheapest_rate_total_amount")
        currency = item.get("cheapest_rate_currency", "INR")

        results.append({
            "id": item.get("id", accommodation.get("id", "")),
            "name": accommodation.get("name", "Hotel"),
            "rating": accommodation.get("rating", random.randint(3, 5)),
            "address": accommodation.get("location", {}).get("address", {}).get("line_one", ""),
            "amenities": accommodation.get("amenities", [])[:5],
            "price": float(cheapest) if cheapest else 0,
            "currency": currency,
            "image": accommodation.get("photos", [{}])[0].get("url", ""),
        })

    return results or _mock_hotels(state)


# ── Mock hotels ───────────────────────────────────────────────────────

_HOTEL_TEMPLATES: dict[str, list[dict[str, Any]]] = {
    "default": [
        {"name": "Grand Seaside Resort & Spa", "rating": 5, "amenities": ["Pool", "Spa", "WiFi", "Restaurant", "Beach Access"]},
        {"name": "Comfort Inn & Suites", "rating": 4, "amenities": ["WiFi", "Breakfast", "Parking", "AC"]},
        {"name": "Traveller's Haven", "rating": 3, "amenities": ["WiFi", "AC", "Room Service"]},
        {"name": "Heritage Palace Hotel", "rating": 5, "amenities": ["Pool", "Spa", "Heritage Tours", "Fine Dining", "Gym"]},
    ],
}


def _mock_hotels(state: TripState) -> list[dict[str, Any]]:
    dest = state.selected_destination or "Beach Resort"
    duration = state.duration_days or 5
    templates = _HOTEL_TEMPLATES["default"]

    results: list[dict[str, Any]] = []
    for i, tmpl in enumerate(templates):
        per_night = random.randint(1800, 8000) if tmpl["rating"] < 5 else random.randint(6000, 15000)
        total = per_night * duration
        results.append({
            "id": f"mock-hotel-{i}",
            "name": tmpl["name"],
            "rating": tmpl["rating"],
            "address": f"Near {dest} Center",
            "amenities": tmpl["amenities"],
            "price": total,
            "pricePerNight": per_night,
            "currency": "INR",
            "image": "",
        })

    results.sort(key=lambda x: x["price"])
    return results
