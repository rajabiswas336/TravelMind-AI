"""
Cab Search & Booking Agent.

Generates realistic cab options (Economy, Premium, SUV) for airport-to-hotel
transfers with pricing based on estimated distance. Produces realistic
mock booking confirmations with driver details.
"""
from __future__ import annotations

import random
import string
from datetime import datetime, timedelta
from typing import Any

from app.agents.state import TripState


# ── Driver name pools ─────────────────────────────────────────────────
_FIRST_NAMES = [
    "Rajesh", "Amit", "Sunil", "Vikram", "Deepak",
    "Manoj", "Arun", "Sanjay", "Ravi", "Prakash",
]
_LAST_NAMES = [
    "Kumar", "Singh", "Sharma", "Patel", "Verma",
    "Gupta", "Das", "Reddy", "Nair", "Iyer",
]

_CAR_MODELS = {
    "Economy": [
        ("Maruti Swift Dzire", "Sedan"),
        ("Hyundai Xcent", "Sedan"),
        ("Tata Tigor", "Sedan"),
    ],
    "Premium": [
        ("Honda City", "Sedan"),
        ("Hyundai Verna", "Sedan"),
        ("Maruti Ciaz", "Sedan"),
    ],
    "SUV": [
        ("Toyota Innova Crysta", "SUV"),
        ("Mahindra XUV700", "SUV"),
        ("Kia Carens", "MUV"),
    ],
}

_PLATE_PREFIXES = ["KA", "DL", "MH", "WB", "TN", "AP", "GA", "RJ", "UP"]


def _gen_plate() -> str:
    """Generate a realistic Indian license plate."""
    prefix = random.choice(_PLATE_PREFIXES)
    num1 = random.randint(1, 99)
    letters = "".join(random.choices(string.ascii_uppercase, k=2))
    num2 = random.randint(1000, 9999)
    return f"{prefix} {num1:02d} {letters} {num2}"


def _gen_cab_ref() -> str:
    return f"CAB-{random.randint(100000, 999999)}"


# ── Cab search ────────────────────────────────────────────────────────

async def search_cabs(state: TripState) -> list[dict[str, Any]]:
    """Generate cab options for airport → hotel transfer."""
    dest = state.selected_destination or "Destination"
    origin_code = state.origin_code or "DEL"
    dest_code = state.destination_code or "GOI"

    # Estimate distance (km) — rough heuristic based on typical airport-to-city distances
    base_distance = random.randint(15, 45)

    options: list[dict[str, Any]] = []
    for cab_type, base_rate in [("Economy", 12), ("Premium", 18), ("SUV", 22)]:
        car_model, car_type = random.choice(_CAR_MODELS[cab_type])
        fare = base_distance * base_rate + random.randint(50, 200)
        eta_minutes = random.randint(8, 25)

        options.append({
            "id": f"cab-{cab_type.lower()}",
            "type": cab_type,
            "carModel": car_model,
            "carType": car_type,
            "fare": fare,
            "currency": "INR",
            "distance": f"{base_distance} km",
            "estimatedTime": f"{base_distance * 2 + random.randint(-5, 10)} min",
            "eta": f"{eta_minutes} min",
            "pickup": f"{dest_code} Airport, {dest}",
            "dropoff": f"Hotel, {dest} City Center",
            "seatingCapacity": 4 if cab_type != "SUV" else 6,
        })

    return options


# ── Cab booking ───────────────────────────────────────────────────────

async def book_cab(
    cab_option: dict[str, Any],
    pickup_time: str | None = None,
) -> dict[str, Any]:
    """Book a cab and return confirmation with driver details."""
    driver_first = random.choice(_FIRST_NAMES)
    driver_last = random.choice(_LAST_NAMES)

    return {
        "bookingType": "cab",
        "status": "confirmed",
        "referenceId": _gen_cab_ref(),
        "cabType": cab_option.get("type", "Economy"),
        "carModel": cab_option.get("carModel", "Maruti Swift Dzire"),
        "carType": cab_option.get("carType", "Sedan"),
        "licensePlate": _gen_plate(),
        "driverName": f"{driver_first} {driver_last}",
        "driverPhone": f"+91 {random.randint(70000, 99999)} {random.randint(10000, 99999)}",
        "driverRating": round(random.uniform(4.2, 4.9), 1),
        "pickup": cab_option.get("pickup", "Airport"),
        "dropoff": cab_option.get("dropoff", "Hotel"),
        "pickupTime": pickup_time or (datetime.now() + timedelta(hours=24)).strftime("%Y-%m-%d %H:%M"),
        "eta": cab_option.get("eta", "15 min"),
        "distance": cab_option.get("distance", "25 km"),
        "totalPrice": float(cab_option.get("fare", 400)),
        "currency": cab_option.get("currency", "INR"),
        "otp": str(random.randint(1000, 9999)),
        "bookedAt": datetime.now().isoformat(),
    }
