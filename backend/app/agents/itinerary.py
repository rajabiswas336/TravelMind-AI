"""
Itinerary Agent.

Drafts a day-by-day itinerary using Claude.  Falls back to a
template-based itinerary when no API key is set.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

from app.agents.state import TripState


async def run_itinerary_agent(state: TripState) -> dict[str, Any]:
    """Return {"days": [{"day": 1, "title": "...", "activities": [...]}], "highlights": [...]}"""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return _mock_itinerary(state)

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1200,
            system=(
                "You are a travel itinerary planner. Given the trip details, "
                "create a day-by-day itinerary.\n"
                "Return ONLY a JSON object with:\n"
                '- "days": array of objects, each with "day" (number), '
                '"title" (string, catchy name for the day), '
                '"activities" (array of 3-4 activity strings)\n'
                '- "highlights": array of 3-5 trip highlight strings\n'
                "No markdown fences."
            ),
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Destination: {state.selected_destination}\n"
                        f"Duration: {state.duration_days} days\n"
                        f"Trip type: {state.trip_type}\n"
                        f"Travelers: {state.adults} adults, {state.children} children\n"
                        f"Preferences: {', '.join(state.preferences)}\n"
                        f"Budget: ₹{state.budget_inr:,}"
                    ),
                }
            ],
        )
        text = resp.content[0].text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```\w*\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        return json.loads(text)
    except Exception:
        return _mock_itinerary(state)


def _mock_itinerary(state: TripState) -> dict[str, Any]:
    dest = state.selected_destination or "your destination"
    days_count = state.duration_days or 5
    prefs = state.preferences or ["City"]

    _ACTIVITY_POOL: dict[str, list[str]] = {
        "Beach": [
            "Morning beach walk and sunrise yoga",
            "Water sports — jet ski, parasailing",
            "Seafood lunch at a beachside shack",
            "Sunset cruise along the coast",
            "Visit a local spice market",
        ],
        "Mountains": [
            "Early morning trek to viewpoint",
            "Visit a monastery or temple",
            "Hot springs and nature walk",
            "Local cuisine tasting",
            "Campfire evening with stargazing",
        ],
        "City": [
            "Heritage walking tour of old quarter",
            "Visit the iconic landmarks and museums",
            "Street food crawl",
            "Shopping at local markets",
            "Evening rooftop dinner with city views",
        ],
        "Nature": [
            "Early morning birdwatching",
            "Guided jungle safari",
            "Waterfall hike and picnic",
            "Tea/coffee plantation visit",
            "Scenic drive through the countryside",
        ],
    }

    pref = prefs[0] if prefs[0] in _ACTIVITY_POOL else "City"
    activities_pool = _ACTIVITY_POOL[pref]

    days: list[dict[str, Any]] = []
    for d in range(1, days_count + 1):
        if d == 1:
            title = f"Arrival in {dest}"
            acts = [
                f"Arrive at {dest} and transfer to hotel",
                "Check-in and freshen up",
                f"Explore the neighborhood of your hotel in {dest}",
                "Welcome dinner at a popular local restaurant",
            ]
        elif d == days_count:
            title = "Departure Day"
            acts = [
                "Leisurely breakfast at the hotel",
                "Last-minute souvenir shopping",
                "Check-out and transfer to airport",
                "Depart with wonderful memories!",
            ]
        else:
            title = f"Day {d} — Exploring {dest}"
            start = (d - 1) % len(activities_pool)
            acts = [
                activities_pool[start % len(activities_pool)],
                activities_pool[(start + 1) % len(activities_pool)],
                activities_pool[(start + 2) % len(activities_pool)],
                "Free evening — explore on your own",
            ]

        days.append({"day": d, "title": title, "activities": acts})

    highlights = [
        f"Experience the best of {dest}",
        f"Curated {prefs[0].lower()} activities",
        f"{days_count}-day immersive experience",
        f"Designed for {state.trip_type or 'vacation'} travelers",
    ]

    return {"days": days, "highlights": highlights}
