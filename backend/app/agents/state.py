"""
Shared state schema for the agent graph. This mirrors
frontend/lib/types.ts:TripState — keep the two in sync as fields are
added.
"""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


TripType = Literal[
    "Vacation", "Honeymoon", "Business", "Family",
    "Adventure", "Religious", "Weekend", "Medical",
]

PreferenceTag = Literal[
    "Beach", "Mountains", "City", "Nature",
    "Nightlife", "Food", "Shopping", "Historical",
]


class BookingConfirmation(BaseModel):
    """A confirmed booking (flight, hotel, or cab)."""
    booking_type: str = Field(alias="bookingType")  # "flight" | "hotel" | "cab"
    status: str = "confirmed"  # "confirmed" | "pending" | "failed"
    reference_id: str = Field(alias="referenceId")
    details: dict[str, Any] = Field(default_factory=dict)
    total_price: float = Field(0, alias="totalPrice")
    currency: str = "INR"

    model_config = {"populate_by_name": True}


class TripState(BaseModel):
    """Full trip state exchanged between frontend ↔ backend."""

    model_config = {"populate_by_name": True}

    # --- filled during guided conversation ---
    trip_type: Optional[TripType] = Field(None, alias="tripType")
    origin: Optional[str] = None
    budget_inr: Optional[int] = Field(None, alias="budgetINR")
    adults: int = 1
    children: int = 0
    duration_days: Optional[int] = Field(None, alias="durationDays")
    preferences: list[PreferenceTag] = Field(default_factory=list)

    # --- filled by agents ---
    origin_code: Optional[str] = Field(None, alias="originCode")
    destination_code: Optional[str] = Field(None, alias="destinationCode")
    candidate_destinations: list[str] = Field(default_factory=list, alias="candidateDestinations")
    selected_destination: Optional[str] = Field(None, alias="selectedDestination")
    flight_offers: list[dict[str, Any]] = Field(default_factory=list, alias="flightOffers")
    hotel_offers: list[dict[str, Any]] = Field(default_factory=list, alias="hotelOffers")
    cab_options: list[dict[str, Any]] = Field(default_factory=list, alias="cabOptions")
    itinerary: Optional[dict[str, Any]] = None
    recommendation_summary: Optional[str] = Field(None, alias="recommendationSummary")

    # --- booking confirmations ---
    flight_booking: Optional[dict[str, Any]] = Field(None, alias="flightBooking")
    hotel_booking: Optional[dict[str, Any]] = Field(None, alias="hotelBooking")
    cab_booking: Optional[dict[str, Any]] = Field(None, alias="cabBooking")
