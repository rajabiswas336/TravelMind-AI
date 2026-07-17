"""
LangGraph agent orchestration graph.

Runs the multi-agent pipeline:
  destination → flight → hotel → itinerary → recommendation

Each node is an async function that mutates a shared dict (the graph
state) and yields SSE-compatible progress events.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncGenerator

from app.agents.destination import run_destination_agent
from app.agents.flight import run_flight_agent
from app.agents.hotel import run_hotel_agent
from app.agents.itinerary import run_itinerary_agent
from app.agents.recommendation import run_recommendation_agent
from app.agents.state import TripState

# Labels shown on the split-flap board (keep in sync with frontend)
AGENT_LABELS = [
    "DESTINATION AGENT — SCANNING",
    "FLIGHT AGENT — DUFFEL SEARCH",
    "HOTEL AGENT — CHECKING STAYS",
    "ITINERARY AGENT — DRAFTING",
    "RECOMMENDATION AGENT — RANKING",
]


async def run_agent_graph(state: TripState) -> AsyncGenerator[str, None]:
    """Run the full agent pipeline, yielding SSE events as each step progresses.

    Events emitted (one per line, SSE format):
      event: agent_start\ndata: {"index": 0, "label": "..."}\n\n
      event: agent_end\ndata: {"index": 0, "label": "..."}\n\n
      ...
      event: result\ndata: {full TripState as JSON}\n\n
      event: done\ndata: {}\n\n
    """

    # ─── Node 0: Destination ──────────────────────────────────────────
    yield _sse("agent_start", {"index": 0, "label": AGENT_LABELS[0]})
    await asyncio.sleep(0.3)  # small delay for visual effect

    dest_result = await run_destination_agent(state)
    state.candidate_destinations = dest_result["candidates"]
    state.selected_destination = dest_result["selected"]
    state.origin_code = dest_result["originCode"]
    state.destination_code = dest_result["destinationCode"]

    yield _sse("agent_end", {"index": 0, "label": AGENT_LABELS[0], "data": dest_result})

    # ─── Node 1: Flights ──────────────────────────────────────────────
    yield _sse("agent_start", {"index": 1, "label": AGENT_LABELS[1]})
    await asyncio.sleep(0.2)

    flights = await run_flight_agent(state)
    state.flight_offers = flights

    yield _sse("agent_end", {"index": 1, "label": AGENT_LABELS[1], "data": {"count": len(flights)}})

    # ─── Node 2: Hotels ───────────────────────────────────────────────
    yield _sse("agent_start", {"index": 2, "label": AGENT_LABELS[2]})
    await asyncio.sleep(0.2)

    hotels = await run_hotel_agent(state)
    state.hotel_offers = hotels

    yield _sse("agent_end", {"index": 2, "label": AGENT_LABELS[2], "data": {"count": len(hotels)}})

    # ─── Node 3: Itinerary ────────────────────────────────────────────
    yield _sse("agent_start", {"index": 3, "label": AGENT_LABELS[3]})
    await asyncio.sleep(0.2)

    itinerary = await run_itinerary_agent(state)
    state.itinerary = itinerary

    yield _sse("agent_end", {"index": 3, "label": AGENT_LABELS[3], "data": {"days": len(itinerary.get("days", []))}})

    # ─── Node 4: Recommendation ───────────────────────────────────────
    yield _sse("agent_start", {"index": 4, "label": AGENT_LABELS[4]})
    await asyncio.sleep(0.2)

    summary = await run_recommendation_agent(state)
    state.recommendation_summary = summary

    yield _sse("agent_end", {"index": 4, "label": AGENT_LABELS[4]})

    # ─── Final result ─────────────────────────────────────────────────
    yield _sse("result", state.model_dump(by_alias=True))
    yield _sse("done", {})


def _sse(event: str, data: Any) -> str:
    """Format a single SSE message."""
    payload = json.dumps(data, default=str)
    return f"event: {event}\ndata: {payload}\n\n"
