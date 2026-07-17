# TravelMind AI

An agentic travel planning and booking platform. Describe your trip in plain language — a team of AI agents finds destinations, searches flights and hotels via Duffel, drafts a day-by-day itinerary, then lets you book everything in one flow.

## Live Demo

> 🔗 Coming soon — links will be updated after deployment

---

## What it does

1. **Guided chat** — Claude-powered consultant collects trip type, origin, budget, and preferences
2. **Agent pipeline** — 5 agents run visibly on an airport-style split-flap board:
   - Destination Agent — picks the best destinations for your profile
   - Flight Agent — searches Duffel for real fares
   - Hotel Agent — searches Duffel Stays
   - Itinerary Agent — drafts a day-by-day plan via Claude
   - Recommendation Agent — synthesises and justifies the final recommendation
3. **One-click booking** — select your flight, hotel, and airport cab transfer; get real confirmation numbers, PNR, e-ticket, and driver OTP

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11, SSE streaming |
| AI | Anthropic Claude (claude-sonnet-4) |
| Travel APIs | Duffel (flights + stays) |
| Deploy | Vercel (frontend) + Railway (backend) |

---

## Local development

### Prerequisites
- Node.js 18+
- Python 3.11+
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))
- Duffel API key — optional, falls back to realistic mock data ([app.duffel.com](https://app.duffel.com))

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS/Linux

pip install -r requirements.txt

cp .env.example .env
# Edit .env — add ANTHROPIC_API_KEY and optionally DUFFEL_API_KEY

uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Optional: point at a deployed backend
# echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
```

Open http://localhost:3000

---

## Deploy

### Backend → Railway

1. Create a new project at [railway.app](https://railway.app)
2. Connect your GitHub repo, set root to `backend/`
3. Add environment variables: `ANTHROPIC_API_KEY`, `DUFFEL_API_KEY`, `CORS_ORIGINS`
4. Railway auto-detects `Procfile` and deploys

### Frontend → Vercel

1. Import repo at [vercel.com](https://vercel.com), set root to `frontend/`
2. Add env var: `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`
3. Deploy

---

## Architecture

```
User
 │
 ▼
Next.js (Vercel)
 │  POST /api/chat          ← planner agent, guided Q&A
 │  POST /api/plan/stream   ← SSE: 5 agents run in sequence
 │  POST /api/book/flight   ← Duffel Orders API
 │  POST /api/book/hotel    ← Duffel Stays API
 │  POST /api/book/cab      ← mock (extendable)
 ▼
FastAPI (Railway)
 ├── Planner Agent    → Claude
 ├── Destination Agent → Claude + IATA lookup
 ├── Flight Agent     → Duffel /air/offer_requests
 ├── Hotel Agent      → Duffel /stays/search
 ├── Itinerary Agent  → Claude
 ├── Recommendation Agent → Claude
 └── Booking Agent    → Duffel /air/orders
```
