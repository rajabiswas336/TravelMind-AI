"""
Planner Agent.

Handles the guided conversation: accepts the user's free-text message
together with the current TripState, uses Claude to extract structured
fields, and returns a conversational reply + quick-reply suggestions +
updated state.

When no LLM key is configured it falls back to a deterministic
rule-based extractor so the demo remains fully functional.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any

from app.agents.state import TripState

REQUIRED_FIELDS = [
    "trip_type",
    "origin",
    "budget_inr",
    "duration_days",
]


def next_missing_field(state: TripState) -> str | None:
    """Returns the next field the Planner still needs, or None if the
    state is complete enough to hand off to the Destination Agent."""
    for field in REQUIRED_FIELDS:
        if getattr(state, field) is None:
            return field
    if not state.preferences:
        return "preferences"
    return None


def is_ready_for_destination_agent(state: TripState) -> bool:
    return next_missing_field(state) is None


# ── LLM-powered extraction ───────────────────────────────────────────

SYSTEM_PROMPT = """\
You are TravelMind AI, a friendly travel consultant chatbot.

Your job:
1. Read the user's message and the current trip state.
2. Extract any new information (trip type, origin city, budget in INR, \
   number of adults, number of children, duration in days, preference tags).
3. Return a JSON object with exactly these keys:
   - "extracted": object with only the newly extracted fields using these \
     exact keys: tripType, origin, budgetINR, adults, children, \
     durationDays, preferences (array of tags).  Omit fields not mentioned.
   - "reply": a short, warm, conversational response (1-3 sentences).
   - "quickReplies": an array of 3-6 suggested quick-reply strings \
     relevant to whatever you're asking next.
   - "done": boolean — true only when all required fields are filled \
     (tripType, origin, budgetINR, durationDays, and at least one preference).

Valid tripType values: Vacation, Honeymoon, Business, Family, Adventure, \
Religious, Weekend, Medical.
Valid preference tags: Beach, Mountains, City, Nature, Nightlife, Food, \
Shopping, Historical.

Respond ONLY with the JSON object — no markdown fences, no explanation.
"""


async def run_planner_llm(
    message: str,
    state: TripState,
) -> dict[str, Any]:
    """Call Claude to extract fields and produce a reply.

    Returns {"extracted": {...}, "reply": str, "quickReplies": [...], "done": bool}
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return _rule_based_fallback(message, state)

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=600,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Current state: {state.model_dump_json(by_alias=True)}\n\n"
                        f"User message: {message}"
                    ),
                }
            ],
        )
        text = resp.content[0].text.strip()
        # Strip markdown code-fence if the model wraps it
        if text.startswith("```"):
            text = re.sub(r"^```\w*\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        return json.loads(text)
    except Exception:
        return _rule_based_fallback(message, state)


# ── Deterministic fallback (no API key needed) ───────────────────────

_FIELD_ORDER = ["trip_type", "origin", "budget_inr", "duration_days", "preferences"]

_PROMPTS: dict[str, dict[str, Any]] = {
    "trip_type": {
        "reply": "Hi! I'm TravelMind AI. What kind of trip are you looking for?",
        "quickReplies": ["Vacation", "Honeymoon", "Business", "Family", "Adventure", "Religious", "Weekend", "Medical"],
    },
    "origin": {
        "reply": "Great choice! Where are you traveling from?",
        "quickReplies": ["Kolkata", "Delhi", "Mumbai", "Bengaluru"],
    },
    "budget_inr": {
        "reply": "What's your approximate budget for the trip?",
        "quickReplies": ["Under ₹30,000", "₹30k–60k", "₹60k–100k", "Flexible"],
    },
    "duration_days": {
        "reply": "How many days are you thinking?",
        "quickReplies": ["3 days", "5 days", "7 days", "10 days"],
    },
    "preferences": {
        "reply": "Last one — what kind of experience are you after?",
        "quickReplies": ["Beach", "Mountains", "City", "Nature", "Nightlife", "Food", "Shopping", "Historical"],
    },
}

_TRIP_TYPES = {t.lower() for t in ["Vacation", "Honeymoon", "Business", "Family", "Adventure", "Religious", "Weekend", "Medical"]}
_PREF_TAGS = {t.lower(): t for t in ["Beach", "Mountains", "City", "Nature", "Nightlife", "Food", "Shopping", "Historical"]}
_CITIES = {"kolkata", "delhi", "mumbai", "bengaluru", "chennai", "hyderabad", "pune", "jaipur", "goa", "lucknow"}


def _rule_based_fallback(message: str, state: TripState) -> dict[str, Any]:
    extracted: dict[str, Any] = {}
    lower = message.lower().strip()

    missing = next_missing_field(state)

    if missing == "trip_type":
        for tt in _TRIP_TYPES:
            if tt in lower:
                extracted["tripType"] = tt.capitalize()
                break
    elif missing == "origin":
        for city in _CITIES:
            if city in lower:
                extracted["origin"] = city.capitalize()
                break
        if "origin" not in extracted:
            # Accept raw text as city name
            extracted["origin"] = message.strip().title()
    elif missing == "budget_inr":
        nums = re.findall(r"[\d,]+", lower.replace(",", ""))
        if "under" in lower or "30" in lower:
            extracted["budgetINR"] = 30000
        elif "60k" in lower or "60000" in lower:
            extracted["budgetINR"] = 60000
        elif "100k" in lower or "100000" in lower or "lakh" in lower or "1,00" in lower:
            extracted["budgetINR"] = 100000
        elif "flexible" in lower:
            extracted["budgetINR"] = 100000
        elif nums:
            extracted["budgetINR"] = int(nums[0])
    elif missing == "duration_days":
        nums = re.findall(r"\d+", lower)
        if nums:
            extracted["durationDays"] = int(nums[0])
    elif missing == "preferences":
        for tag_lower, tag in _PREF_TAGS.items():
            if tag_lower in lower:
                extracted.setdefault("preferences", []).append(tag)
        if "preferences" not in extracted:
            extracted["preferences"] = [message.strip().title()]

    # Apply extracted to a copy of the state to figure out next step
    test_state = state.model_copy()
    if "tripType" in extracted:
        test_state.trip_type = extracted["tripType"]
    if "origin" in extracted:
        test_state.origin = extracted["origin"]
    if "budgetINR" in extracted:
        test_state.budget_inr = extracted["budgetINR"]
    if "durationDays" in extracted:
        test_state.duration_days = extracted["durationDays"]
    if "preferences" in extracted:
        test_state.preferences = list(set(test_state.preferences + extracted.get("preferences", [])))

    next_field = next_missing_field(test_state)
    done = next_field is None

    if done:
        reply = "Got it — that's everything I need. Let me get the agent team on this!"
        quick_replies: list[str] = []
    elif next_field and next_field in _PROMPTS:
        reply = _PROMPTS[next_field]["reply"]
        quick_replies = _PROMPTS[next_field]["quickReplies"]
    else:
        reply = "Tell me more about your trip!"
        quick_replies = []

    return {
        "extracted": extracted,
        "reply": reply,
        "quickReplies": quick_replies,
        "done": done,
    }
