"""
Bookings API endpoints.

POST /api/book/flight  — Book a selected flight offer
POST /api/book/hotel   — Book a selected hotel
POST /api/book/cab     — Book a cab for airport transfer
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.agents.booking import book_flight, book_hotel
from app.agents.cab import book_cab, search_cabs
from app.agents.state import TripState

router = APIRouter(prefix="/api", tags=["bookings"])


# ── Flight Booking ────────────────────────────────────────────────────

class FlightBookRequest(BaseModel):
    offer: dict[str, Any]
    passengers: list[dict[str, Any]] = Field(default_factory=list)
    state: dict[str, Any] = Field(default_factory=dict)


@router.post("/book/flight")
async def api_book_flight(req: FlightBookRequest) -> dict[str, Any]:
    """Book a flight offer and return confirmation."""
    # If no passengers provided, generate from state
    if not req.passengers:
        state = TripState.model_validate(req.state)
        passengers = [{"given_name": f"Traveler", "family_name": f"Guest{i+1}"}
                      for i in range(state.adults + state.children)]
    else:
        passengers = req.passengers

    confirmation = await book_flight(req.offer, passengers)
    return {"booking": confirmation}


# ── Hotel Booking ─────────────────────────────────────────────────────

class HotelBookRequest(BaseModel):
    hotel: dict[str, Any]
    guest_name: str = Field("Guest Traveler", alias="guestName")
    state: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


@router.post("/book/hotel")
async def api_book_hotel(req: HotelBookRequest) -> dict[str, Any]:
    """Book a hotel and return confirmation."""
    state = TripState.model_validate(req.state)
    check_in = (date.today() + timedelta(days=14)).isoformat()
    check_out = (date.today() + timedelta(days=14 + (state.duration_days or 5))).isoformat()

    confirmation = await book_hotel(
        req.hotel,
        req.guest_name,
        check_in,
        check_out,
    )
    return {"booking": confirmation}


# ── Cab Booking ───────────────────────────────────────────────────────

class CabSearchRequest(BaseModel):
    state: dict[str, Any] = Field(default_factory=dict)


@router.post("/cabs/search")
async def api_search_cabs(req: CabSearchRequest) -> dict[str, Any]:
    """Search for available cab options."""
    state = TripState.model_validate(req.state)
    options = await search_cabs(state)
    return {"cabOptions": options}


class CabBookRequest(BaseModel):
    cab_option: dict[str, Any] = Field(alias="cabOption")
    pickup_time: Optional[str] = Field(None, alias="pickupTime")

    model_config = {"populate_by_name": True}


@router.post("/book/cab")
async def api_book_cab(req: CabBookRequest) -> dict[str, Any]:
    """Book a cab and return confirmation with driver details."""
    confirmation = await book_cab(req.cab_option, req.pickup_time)
    return {"booking": confirmation}
