"""
Plan API endpoint.

POST /api/plan/stream — accepts a complete TripState and streams SSE
events as each agent in the pipeline runs.  The frontend connects to
this with EventSource / fetch and updates the split-flap board live.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.agents.graph import run_agent_graph
from app.agents.state import TripState

router = APIRouter(prefix="/api", tags=["plan"])


class PlanRequest(BaseModel):
    state: dict[str, Any] = Field(default_factory=dict)


@router.post("/plan/stream")
async def plan_stream(req: PlanRequest) -> StreamingResponse:
    """Stream agent execution progress as Server-Sent Events."""
    state = TripState.model_validate(req.state)

    return StreamingResponse(
        run_agent_graph(state),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
