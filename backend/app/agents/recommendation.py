"""
Recommendation / Synthesis Agent.

Takes the complete TripState (with flights, hotels, itinerary) and
produces a conversational summary with budget breakdown.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

from app.agents.state import TripState


async def run_recommendation_agent(state: TripState) -> str:
    """Return a markdown-formatted recommendation summary string."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return _mock_recommendation(state)

    try:
        import anthropic

        cheapest_flight = min(state.flight_offers, key=lambda f: f.get("price", 999999)) if state.flight_offers else {}
        cheapest_hotel = min(state.hotel_offers, key=lambda h: h.get("price", 999999)) if state.hotel_offers else {}

        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=600,
            system=(
                "You are a travel recommendation agent. Given a trip plan with "
                "flights, hotels, and itinerary details, write a concise but "
                "enthusiastic 3-5 paragraph recommendation summary. Include:\n"
                "- Why the destination is perfect for them\n"
                "- Best flight option (with price)\n"
                "- Best hotel option (with price)\n"
                "- Budget breakdown (flights + hotel + estimated daily expenses)\n"
                "- A warm closing line\n"
                "Use plain text, no markdown headers. Use ₹ for prices."
            ),
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Destination: {state.selected_destination}\n"
                        f"Trip type: {state.trip_type}\n"
                        f"Duration: {state.duration_days} days\n"
                        f"Budget: ₹{state.budget_inr:,}\n"
                        f"Travelers: {state.adults} adults, {state.children} children\n"
                        f"Cheapest flight: {json.dumps(cheapest_flight)}\n"
                        f"Cheapest hotel: {json.dumps(cheapest_hotel)}\n"
                        f"Itinerary highlights: {json.dumps(state.itinerary.get('highlights', []) if state.itinerary else [])}"
                    ),
                }
            ],
        )
        return resp.content[0].text.strip()
    except Exception:
        return _mock_recommendation(state)


def _mock_recommendation(state: TripState) -> str:
    dest = state.selected_destination or "your destination"
    duration = state.duration_days or 5
    budget = state.budget_inr or 60000

    cheapest_flight = min(state.flight_offers, key=lambda f: f.get("price", 999999)) if state.flight_offers else None
    cheapest_hotel = min(state.hotel_offers, key=lambda h: h.get("price", 999999)) if state.hotel_offers else None

    flight_price = cheapest_flight["price"] if cheapest_flight else 5000
    flight_airline = cheapest_flight.get("airline", "IndiGo") if cheapest_flight else "IndiGo"
    hotel_price = cheapest_hotel["price"] if cheapest_hotel else 15000
    hotel_name = cheapest_hotel.get("name", "Comfort Inn") if cheapest_hotel else "Comfort Inn"
    hotel_per_night = cheapest_hotel.get("pricePerNight", hotel_price // duration) if cheapest_hotel else 3000

    daily_expense = 1500 * state.adults + 800 * state.children
    total = flight_price + hotel_price + (daily_expense * duration)

    return (
        f"{dest} is an excellent choice for your {state.trip_type or 'vacation'}! "
        f"With its perfect blend of {', '.join(state.preferences[:2]) if state.preferences else 'experiences'}, "
        f"this {duration}-day trip is going to be unforgettable.\n\n"
        f"Your best flight option is {flight_airline} at ₹{flight_price:,} — "
        f"great value with convenient timings. "
        f"For accommodation, I'd recommend {hotel_name} at ₹{hotel_per_night:,}/night "
        f"(₹{hotel_price:,} total), which has great reviews and all the amenities you need.\n\n"
        f"Here's your budget breakdown:\n"
        f"• Flights: ₹{flight_price:,}\n"
        f"• Hotel ({duration} nights): ₹{hotel_price:,}\n"
        f"• Daily expenses (food, transport, activities): ₹{daily_expense:,}/day × {duration} days = ₹{daily_expense * duration:,}\n"
        f"• Estimated total: ₹{total:,}\n\n"
        f"{'This fits well within your budget of ₹' + f'{budget:,}' + '!' if total <= budget else 'This is slightly over your budget — consider a shorter stay or a different hotel to optimize costs.'} "
        f"Have an amazing trip! 🌴✈️"
    )
