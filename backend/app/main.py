from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import bookings, chat, plan

load_dotenv()

app = FastAPI(title="TravelMind AI API", version="0.3.0")

raw_origins = os.getenv("CORS_ORIGINS", "*").split(",")
origins = [o.strip() for o in raw_origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=False if "*" in origins else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(plan.router)
app.include_router(bookings.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
