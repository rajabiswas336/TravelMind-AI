"""
Chat API endpoint.

POST /api/chat — accepts a message + current state, runs the Planner
agent (LLM or fallback), and returns the reply, quick-reply options,
updated state, and a "done" flag indicating readiness for the agent
pipeline.
"""
from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Any, Optional

from fastapi import APIRouter

from app.agents.planner import is_ready_for_destination_agent, next_missing_field, run_planner_llm
from app.agents.state import TripState

router = APIRouter(prefix="/api", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    state: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str
    quick_replies: list[str] = Field(alias="quickReplies", default_factory=list)
    state: dict[str, Any]
    done: bool = False

    model_config = {"populate_by_name": True}


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    """Conversational turn: message in → reply + updated state out."""
    # Build TripState from the incoming dict (accepts camelCase)
    state = TripState.model_validate(req.state)

    result = await run_planner_llm(req.message, state)

    # Apply extracted fields to the state
    extracted = result.get("extracted", {})
    if "tripType" in extracted:
        state.trip_type = extracted["tripType"]
    if "origin" in extracted:
        state.origin = extracted["origin"]
    if "budgetINR" in extracted:
        state.budget_inr = extracted["budgetINR"]
    if "adults" in extracted:
        state.adults = extracted["adults"]
    if "children" in extracted:
        state.children = extracted["children"]
    if "durationDays" in extracted:
        state.duration_days = extracted["durationDays"]
    if "preferences" in extracted:
        new_prefs = extracted["preferences"]
        if isinstance(new_prefs, list):
            state.preferences = list(set(state.preferences + new_prefs))
        else:
            state.preferences = list(set(state.preferences + [new_prefs]))

    return ChatResponse(
        reply=result.get("reply", "Tell me more about your trip!"),
        quickReplies=result.get("quickReplies", []),
        state=state.model_dump(by_alias=True),
        done=result.get("done", False),
    )


@router.post("/trip-state/check")
def check_trip_state(state: TripState) -> dict:
    """
    Day 1 stub: given a partial TripState, report what's still missing.
    Day 2 replaces this with the real Planner Agent node inside a
    LangGraph graph, and adds /api/chat for the full conversational
    turn (message in, agent reply + updated state out).
    """
    missing = next_missing_field(state)
    return {
        "ready_for_destination_agent": is_ready_for_destination_agent(state),
        "next_missing_field": missing,
        "state": state.model_dump(by_alias=True),
    }
