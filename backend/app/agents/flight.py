"""
Flight Search Agent.

Searches for flight offers using the Duffel API.  Falls back to
realistic mock data when no DUFFEL_API_KEY is set — the demo always
works.
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


async def run_flight_agent(state: TripState) -> list[dict[str, Any]]:
    """Search flights and return a list of offer dicts."""
    api_key = os.getenv("DUFFEL_API_KEY", "")
    if not api_key:
        return _mock_flights(state)

    try:
        return await _duffel_search(state, api_key)
    except Exception:
        return _mock_flights(state)


async def _duffel_search(state: TripState, api_key: str) -> list[dict[str, Any]]:
    origin = state.origin_code or "DEL"
    destination = state.destination_code or "GOI"
    departure = (date.today() + timedelta(days=14)).isoformat()
    return_date = (date.today() + timedelta(days=14 + (state.duration_days or 5))).isoformat()

    passengers: list[dict[str, Any]] = [{"type": "adult"} for _ in range(state.adults)]
    passengers += [{"age": 8} for _ in range(state.children)]

    payload = {
        "data": {
            "slices": [
                {"origin": origin, "destination": destination, "departure_date": departure},
                {"origin": destination, "destination": origin, "departure_date": return_date},
            ],
            "passengers": passengers,
            "cabin_class": "economy",
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
            f"{DUFFEL_BASE}/air/offer_requests?return_offers=true",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()

    offers = data.get("data", {}).get("offers", [])[:6]
    results: list[dict[str, Any]] = []
    for offer in offers:
        slices = offer.get("slices", [])
        outbound = slices[0] if slices else {}
        segments = outbound.get("segments", [])
        first_seg = segments[0] if segments else {}

        results.append({
            "id": offer.get("id", ""),
            "airline": first_seg.get("operating_carrier", {}).get("name", "Airline"),
            "airlineLogo": f"https://assets.duffel.com/img/airlines/for-light-background/full-color-lockup/{first_seg.get('operating_carrier', {}).get('iata_code', 'XX')}.svg",
            "departure": first_seg.get("departing_at", departure),
            "arrival": first_seg.get("arriving_at", departure),
            "duration": outbound.get("duration", "PT3H"),
            "stops": max(0, len(segments) - 1),
            "price": float(offer.get("total_amount", "0")),
            "currency": offer.get("total_currency", "INR"),
        })
    return results or _mock_flights(state)


# ── Mock flights ──────────────────────────────────────────────────────

_AIRLINES = [
    ("IndiGo", "6E"),
    ("Air India", "AI"),
    ("Vistara", "UK"),
    ("SpiceJet", "SG"),
    ("Go First", "G8"),
    ("AirAsia India", "I5"),
]


def _mock_flights(state: TripState) -> list[dict[str, Any]]:
    origin = state.origin_code or "DEL"
    dest = state.destination_code or "GOI"
    dep_date = date.today() + timedelta(days=14)
    duration_days = state.duration_days or 5
    ret_date = dep_date + timedelta(days=duration_days)

    results: list[dict[str, Any]] = []
    for i, (airline, code) in enumerate(_AIRLINES[:4]):
        dep_hour = 6 + i * 3
        price = random.randint(3500, 12000) * state.adults + random.randint(1500, 6000) * state.children
        stops = 0 if i < 2 else 1
        flight_hrs = random.choice([2, 3]) if stops == 0 else random.choice([4, 5])

        results.append({
            "id": f"mock-flight-{i}",
            "airline": airline,
            "airlineLogo": f"https://assets.duffel.com/img/airlines/for-light-background/full-color-lockup/{code}.svg",
            "departure": f"{dep_date.isoformat()}T{dep_hour:02d}:00:00",
            "arrival": f"{dep_date.isoformat()}T{dep_hour + flight_hrs:02d}:30:00",
            "duration": f"PT{flight_hrs}H30M",
            "stops": stops,
            "price": price,
            "currency": "INR",
            "origin": origin,
            "destination": dest,
            "returnDate": ret_date.isoformat(),
        })

    results.sort(key=lambda x: x["price"])
    return results
