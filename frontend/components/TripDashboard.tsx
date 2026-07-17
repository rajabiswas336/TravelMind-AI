"use client";

import { useState } from "react";
import { TripState, FlightOffer, HotelOffer, ItineraryDay } from "@/lib/types";

type Tab = "overview" | "flights" | "stays" | "itinerary";

export function TripDashboard({ state }: { state: TripState }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "✦" },
    { id: "flights", label: "Flights", icon: "✈" },
    { id: "stays", label: "Stays", icon: "🏨" },
    { id: "itinerary", label: "Itinerary", icon: "📋" },
  ];

  return (
    <div className="animate-fade-up space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-dusk/5 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-3 py-2.5 font-body text-sm font-medium transition-all duration-200
              ${
                activeTab === tab.id
                  ? "bg-ink text-paper shadow-md"
                  : "text-ink/50 hover:text-ink hover:bg-ink/5"
              }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[300px]">
        {activeTab === "overview" && <OverviewTab state={state} />}
        {activeTab === "flights" && <FlightsTab flights={state.flightOffers || []} />}
        {activeTab === "stays" && <StaysTab hotels={state.hotelOffers || []} />}
        {activeTab === "itinerary" && <ItineraryTab days={state.itinerary?.days || []} highlights={state.itinerary?.highlights || []} />}
      </div>
    </div>
  );
}

/* ─── Overview ────────────────────────────────────────────────────── */

function OverviewTab({ state }: { state: TripState }) {
  const cheapestFlight = state.flightOffers?.length
    ? state.flightOffers.reduce((a, b) => (a.price < b.price ? a : b))
    : null;
  const cheapestHotel = state.hotelOffers?.length
    ? state.hotelOffers.reduce((a, b) => (a.price < b.price ? a : b))
    : null;

  const flightCost = cheapestFlight?.price ?? 0;
  const hotelCost = cheapestHotel?.price ?? 0;
  const dailyExpense = 1500 * (state.adults || 1) + 800 * (state.children || 0);
  const totalExpense = dailyExpense * (state.durationDays || 5);
  const grandTotal = flightCost + hotelCost + totalExpense;
  const budget = state.budgetINR || 60000;
  const underBudget = grandTotal <= budget;

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Destination hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dusk via-ink to-dusk p-6 text-paper">
        <div className="absolute -right-6 -top-6 text-[120px] opacity-[0.06] leading-none select-none">✈</div>
        <p className="font-mono text-[10px] tracking-[0.3em] text-runway">YOUR DESTINATION</p>
        <h2 className="mt-1 font-display text-3xl font-bold tracking-tight">{state.selectedDestination || "—"}</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-paper/10 px-3 py-1 backdrop-blur-sm">{state.durationDays} days</span>
          <span className="rounded-full bg-paper/10 px-3 py-1 backdrop-blur-sm">{state.adults} adults{state.children ? `, ${state.children} child` : ""}</span>
          <span className="rounded-full bg-paper/10 px-3 py-1 backdrop-blur-sm">{state.tripType}</span>
          {state.preferences?.map((p) => (
            <span key={p} className="rounded-full bg-runway/20 px-3 py-1 text-runway">{p}</span>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="rounded-xl border border-ink/10 bg-white/60 p-5">
        <p className="font-mono text-[10px] tracking-[0.2em] text-ink/40">BUDGET BREAKDOWN</p>
        <div className="mt-3 space-y-2">
          <BudgetRow label="Flights" amount={flightCost} />
          <BudgetRow label={`Hotel (${state.durationDays || 5} nights)`} amount={hotelCost} />
          <BudgetRow label="Daily expenses (est.)" amount={totalExpense} />
          <div className="border-t border-ink/10 pt-2 mt-2">
            <BudgetRow label="Estimated total" amount={grandTotal} bold />
          </div>
          <div className={`mt-2 rounded-lg px-3 py-2 text-sm font-medium ${underBudget ? "bg-runway/10 text-runway" : "bg-amber/10 text-amber"}`}>
            {underBudget ? `✓ Within your ₹${budget.toLocaleString("en-IN")} budget` : `⚠ Over budget by ₹${(grandTotal - budget).toLocaleString("en-IN")}`}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {state.recommendationSummary && (
        <div className="rounded-xl border border-runway/20 bg-runway/5 p-5">
          <p className="font-mono text-[10px] tracking-[0.2em] text-runway">AI RECOMMENDATION</p>
          <p className="mt-2 whitespace-pre-line font-body text-sm leading-relaxed text-ink/80">
            {state.recommendationSummary}
          </p>
        </div>
      )}
    </div>
  );
}

function BudgetRow({ label, amount, bold }: { label: string; amount: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between font-body text-sm ${bold ? "font-semibold text-ink" : "text-ink/70"}`}>
      <span>{label}</span>
      <span>₹{amount.toLocaleString("en-IN")}</span>
    </div>
  );
}

/* ─── Flights ─────────────────────────────────────────────────────── */

function FlightsTab({ flights }: { flights: FlightOffer[] }) {
  if (!flights.length) {
    return <EmptyState icon="✈" text="No flight data yet" />;
  }

  return (
    <div className="space-y-3 animate-fade-up">
      {flights.map((f, i) => (
        <div
          key={f.id}
          className="group relative overflow-hidden rounded-xl border border-ink/10 bg-white/70 p-4 transition-all hover:shadow-lg hover:border-runway/30"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          {i === 0 && (
            <span className="absolute right-3 top-3 rounded-full bg-runway px-2.5 py-0.5 font-mono text-[10px] font-semibold text-ink tracking-wide">
              BEST VALUE
            </span>
          )}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-dusk/5">
              <span className="text-2xl">✈</span>
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-medium text-ink">{f.airline}</p>
              <p className="mt-0.5 font-mono text-[11px] text-ink/40">
                {f.stops === 0 ? "Direct" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`} · {formatDuration(f.duration)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg font-bold text-ink">₹{f.price.toLocaleString("en-IN")}</p>
              <p className="font-mono text-[10px] text-ink/40">per person</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-dusk/[0.03] px-3 py-2">
            <TimeBlock label="Depart" time={extractTime(f.departure)} />
            <div className="flex flex-col items-center gap-0.5">
              <div className="h-px w-16 bg-ink/15" />
              <span className="font-mono text-[10px] text-ink/30">{formatDuration(f.duration)}</span>
            </div>
            <TimeBlock label="Arrive" time={extractTime(f.arrival)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TimeBlock({ label, time }: { label: string; time: string }) {
  return (
    <div className="text-center">
      <p className="font-mono text-[10px] text-ink/40">{label}</p>
      <p className="font-display text-base font-medium text-ink">{time}</p>
    </div>
  );
}

/* ─── Stays ───────────────────────────────────────────────────────── */

function StaysTab({ hotels }: { hotels: HotelOffer[] }) {
  if (!hotels.length) {
    return <EmptyState icon="🏨" text="No hotel data yet" />;
  }

  return (
    <div className="space-y-3 animate-fade-up">
      {hotels.map((h, i) => (
        <div
          key={h.id}
          className="group overflow-hidden rounded-xl border border-ink/10 bg-white/70 p-4 transition-all hover:shadow-lg hover:border-runway/30"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber/10">
              <span className="text-2xl">🏨</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-medium text-ink truncate">{h.name}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Stars count={h.rating} />
                {h.address && <span className="font-mono text-[10px] text-ink/40 truncate">· {h.address}</span>}
              </div>
              {h.amenities.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {h.amenities.map((a) => (
                    <span key={a} className="rounded-full bg-dusk/5 px-2 py-0.5 font-mono text-[10px] text-ink/50">
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-lg font-bold text-ink">₹{h.price.toLocaleString("en-IN")}</p>
              {h.pricePerNight && (
                <p className="font-mono text-[10px] text-ink/40">₹{h.pricePerNight.toLocaleString("en-IN")}/night</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5 text-amber">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-xs ${i < count ? "" : "opacity-20"}`}>★</span>
      ))}
    </span>
  );
}

/* ─── Itinerary ───────────────────────────────────────────────────── */

function ItineraryTab({ days, highlights }: { days: ItineraryDay[]; highlights: string[] }) {
  if (!days.length) {
    return <EmptyState icon="📋" text="No itinerary yet" />;
  }

  return (
    <div className="space-y-4 animate-fade-up">
      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {highlights.map((h, i) => (
            <span key={i} className="rounded-full bg-runway/10 px-3 py-1 font-mono text-[11px] text-runway">
              {h}
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-6 bottom-6 w-px bg-ink/10" />

        {days.map((day, i) => (
          <div
            key={day.day}
            className="relative flex gap-4 pb-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Day number circle */}
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-paper shadow-md">
              {day.day}
            </div>

            <div className="flex-1 rounded-xl border border-ink/10 bg-white/70 p-4">
              <h4 className="font-display text-sm font-medium text-ink">{day.title}</h4>
              <ul className="mt-2 space-y-1.5">
                {day.activities.map((act, j) => (
                  <li key={j} className="flex items-start gap-2 font-body text-sm text-ink/70">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-runway" />
                    {act}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Shared ──────────────────────────────────────────────────────── */

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl opacity-30">{icon}</span>
      <p className="mt-3 font-body text-sm text-ink/40">{text}</p>
    </div>
  );
}

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const h = match[1] || "0";
  const m = match[2] || "0";
  return `${h}h ${m}m`;
}

function extractTime(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return isoDate.slice(11, 16);
  }
}
