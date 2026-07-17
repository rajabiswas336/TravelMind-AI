"use client";

import { useState } from "react";
import {
  TripState,
  FlightOffer,
  HotelOffer,
  CabOption,
  FlightBookingConfirmation,
  HotelBookingConfirmation,
  CabBookingConfirmation,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type BookingPhase =
  | "select_flight"
  | "select_hotel"
  | "select_cab"
  | "all_booked";

interface BookingFlowProps {
  tripState: TripState;
  onComplete: (
    flight: FlightBookingConfirmation,
    hotel: HotelBookingConfirmation,
    cab: CabBookingConfirmation
  ) => void;
  onSkip: () => void;
}

export function BookingFlow({ tripState, onComplete, onSkip }: BookingFlowProps) {
  const [phase, setPhase] = useState<BookingPhase>("select_flight");
  const [flightConf, setFlightConf] = useState<FlightBookingConfirmation | null>(null);
  const [hotelConf, setHotelConf] = useState<HotelBookingConfirmation | null>(null);
  const [cabConf, setCabConf] = useState<CabBookingConfirmation | null>(null);
  const [cabOptions, setCabOptions] = useState<CabOption[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Flight booking ────────────────────────────────────────────────
  async function bookFlight(offer: FlightOffer) {
    setLoadingId(offer.id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/book/flight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer, state: tripState }),
      });
      if (!res.ok) throw new Error("Flight booking failed");
      const data = await res.json();
      setFlightConf(data.booking);
      // Fetch cab options now so they're ready
      fetchCabs();
      setPhase("select_hotel");
    } catch {
      setError("Could not book that flight. Please try another option.");
    } finally {
      setLoadingId(null);
    }
  }

  // ── Hotel booking ─────────────────────────────────────────────────
  async function bookHotel(hotel: HotelOffer) {
    setLoadingId(hotel.id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/book/hotel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotel,
          guestName: "Guest Traveler",
          state: tripState,
        }),
      });
      if (!res.ok) throw new Error("Hotel booking failed");
      const data = await res.json();
      setHotelConf(data.booking);
      setPhase("select_cab");
    } catch {
      setError("Could not book that hotel. Please try another option.");
    } finally {
      setLoadingId(null);
    }
  }

  // ── Cab search ────────────────────────────────────────────────────
  async function fetchCabs() {
    try {
      const res = await fetch(`${API_BASE}/api/cabs/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: tripState }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setCabOptions(data.cabOptions || []);
    } catch {
      // non-fatal
    }
  }

  // ── Cab booking ───────────────────────────────────────────────────
  async function bookCab(cab: CabOption) {
    setLoadingId(cab.id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/book/cab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cabOption: cab }),
      });
      if (!res.ok) throw new Error("Cab booking failed");
      const data = await res.json();
      const conf: CabBookingConfirmation = data.booking;
      setCabConf(conf);
      setPhase("all_booked");
      onComplete(flightConf!, hotelConf!, conf);
    } catch {
      setError("Could not book that cab. Please try another option.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="animate-fade-up space-y-4">
      {/* Progress stepper */}
      <Stepper phase={phase} flightConf={flightConf} hotelConf={hotelConf} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-700">
          {error}
        </div>
      )}

      {phase === "select_flight" && (
        <FlightSelector
          flights={tripState.flightOffers || []}
          loadingId={loadingId}
          onBook={bookFlight}
          onSkip={onSkip}
        />
      )}

      {phase === "select_hotel" && flightConf && (
        <>
          <ConfirmationBadge label="Flight booked" ref_={flightConf.pnr} icon="✈" />
          <HotelSelector
            hotels={tripState.hotelOffers || []}
            loadingId={loadingId}
            onBook={bookHotel}
          />
        </>
      )}

      {phase === "select_cab" && hotelConf && flightConf && (
        <>
          <ConfirmationBadge label="Flight booked" ref_={flightConf.pnr} icon="✈" />
          <ConfirmationBadge label="Hotel booked" ref_={hotelConf.confirmationNumber} icon="🏨" />
          <CabSelector
            options={cabOptions}
            loadingId={loadingId}
            onBook={bookCab}
            destination={tripState.selectedDestination || ""}
          />
        </>
      )}

      {phase === "all_booked" && flightConf && hotelConf && cabConf && (
        <AllBookedSummary flight={flightConf} hotel={hotelConf} cab={cabConf} />
      )}
    </div>
  );
}

// ── Stepper ───────────────────────────────────────────────────────────

function Stepper({
  phase,
  flightConf,
  hotelConf,
}: {
  phase: BookingPhase;
  flightConf: FlightBookingConfirmation | null;
  hotelConf: HotelBookingConfirmation | null;
}) {
  const steps = [
    { key: "select_flight", label: "Flight", icon: "✈" },
    { key: "select_hotel", label: "Hotel", icon: "🏨" },
    { key: "select_cab", label: "Transfer", icon: "🚗" },
    { key: "all_booked", label: "Confirmed", icon: "✓" },
  ];

  const order = ["select_flight", "select_hotel", "select_cab", "all_booked"];
  const currentIdx = order.indexOf(phase);

  return (
    <div className="flex items-center gap-0 overflow-hidden rounded-xl border border-ink/10 bg-white/60">
      {steps.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div
            key={step.key}
            className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-center transition-colors
              ${done ? "bg-runway/10" : active ? "bg-ink text-paper" : "bg-transparent"}`}
          >
            <span className={`text-base ${done ? "text-runway" : active ? "text-amber" : "opacity-30"}`}>
              {done ? "✓" : step.icon}
            </span>
            <span
              className={`font-mono text-[10px] tracking-wide
              ${done ? "text-runway" : active ? "text-paper" : "text-ink/30"}`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Confirmation badge ────────────────────────────────────────────────

function ConfirmationBadge({ label, ref_, icon }: { label: string; ref_: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-runway/20 bg-runway/5 px-4 py-2.5">
      <span>{icon}</span>
      <span className="font-body text-sm text-runway font-medium">{label}</span>
      <span className="ml-auto font-mono text-xs text-ink/50">REF: {ref_}</span>
    </div>
  );
}

// ── Flight selector ───────────────────────────────────────────────────

function FlightSelector({
  flights,
  loadingId,
  onBook,
  onSkip,
}: {
  flights: FlightOffer[];
  loadingId: string | null;
  onBook: (f: FlightOffer) => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] tracking-[0.2em] text-ink/50">SELECT A FLIGHT TO BOOK</p>
        <button onClick={onSkip} className="font-mono text-[11px] text-ink/30 hover:text-ink/60 underline">
          skip booking
        </button>
      </div>
      {flights.slice(0, 4).map((f, i) => (
        <FlightCard key={f.id} flight={f} loading={loadingId === f.id} onBook={onBook} best={i === 0} />
      ))}
    </div>
  );
}

function FlightCard({
  flight,
  loading,
  onBook,
  best,
}: {
  flight: FlightOffer;
  loading: boolean;
  onBook: (f: FlightOffer) => void;
  best: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-ink/10 bg-white/80 p-4 transition-all hover:shadow-md hover:border-runway/30">
      {best && (
        <span className="absolute right-3 top-3 rounded-full bg-runway px-2.5 py-0.5 font-mono text-[10px] font-semibold text-ink tracking-wide">
          BEST VALUE
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-dusk/5 shrink-0">
          <span className="text-xl">✈</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-medium text-ink truncate">{flight.airline}</p>
          <p className="font-mono text-[11px] text-ink/40">
            {flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`} ·{" "}
            {formatDuration(flight.duration)}
          </p>
        </div>
        <div className="text-right shrink-0 mr-12">
          <p className="font-display text-base font-bold text-ink">
            ₹{flight.price.toLocaleString("en-IN")}
          </p>
          <p className="font-mono text-[10px] text-ink/40">per person</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center justify-between rounded-lg bg-dusk/[0.03] px-3 py-2">
          <TimeBlock label="Depart" time={extractTime(flight.departure)} />
          <div className="flex flex-col items-center gap-0.5">
            <div className="h-px w-12 bg-ink/15" />
            <span className="font-mono text-[10px] text-ink/30">{formatDuration(flight.duration)}</span>
          </div>
          <TimeBlock label="Arrive" time={extractTime(flight.arrival)} />
        </div>
        <button
          onClick={() => onBook(flight)}
          disabled={loading}
          className="shrink-0 rounded-xl bg-ink px-4 py-2 font-body text-sm font-semibold text-paper
                     transition-all hover:bg-runway hover:text-ink disabled:opacity-50"
          aria-label={`Book ${flight.airline} flight for ₹${flight.price.toLocaleString("en-IN")}`}
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-paper border-t-transparent" />
              Booking
            </span>
          ) : (
            "Book →"
          )}
        </button>
      </div>
    </div>
  );
}

// ── Hotel selector ────────────────────────────────────────────────────

function HotelSelector({
  hotels,
  loadingId,
  onBook,
}: {
  hotels: HotelOffer[];
  loadingId: string | null;
  onBook: (h: HotelOffer) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink/50">SELECT A HOTEL TO BOOK</p>
      {hotels.slice(0, 4).map((h) => (
        <HotelCard key={h.id} hotel={h} loading={loadingId === h.id} onBook={onBook} />
      ))}
    </div>
  );
}

function HotelCard({
  hotel,
  loading,
  onBook,
}: {
  hotel: HotelOffer;
  loading: boolean;
  onBook: (h: HotelOffer) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-white/80 p-4 transition-all hover:shadow-md hover:border-runway/30">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber/10">
          <span className="text-xl">🏨</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-medium text-ink truncate">{hotel.name}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <Stars count={hotel.rating} />
            {hotel.address && (
              <span className="font-mono text-[11px] text-ink/40 truncate">{hotel.address}</span>
            )}
          </div>
          {hotel.amenities.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {hotel.amenities.slice(0, 3).map((a) => (
                <span key={a} className="rounded-full bg-dusk/5 px-2 py-0.5 font-mono text-[10px] text-ink/50">
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-base font-bold text-ink">
            ₹{hotel.price.toLocaleString("en-IN")}
          </p>
          {hotel.pricePerNight && (
            <p className="font-mono text-[10px] text-ink/40">
              ₹{hotel.pricePerNight.toLocaleString("en-IN")}/night
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onBook(hotel)}
          disabled={loading}
          className="rounded-xl bg-ink px-4 py-2 font-body text-sm font-semibold text-paper
                     transition-all hover:bg-runway hover:text-ink disabled:opacity-50"
          aria-label={`Book ${hotel.name}`}
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-paper border-t-transparent" />
              Booking
            </span>
          ) : (
            "Book →"
          )}
        </button>
      </div>
    </div>
  );
}

// ── Cab selector ──────────────────────────────────────────────────────

function CabSelector({
  options,
  loadingId,
  onBook,
  destination,
}: {
  options: CabOption[];
  loadingId: string | null;
  onBook: (c: CabOption) => void;
  destination: string;
}) {
  const CAB_ICONS: Record<string, string> = {
    Economy: "🚕",
    Premium: "🚗",
    SUV: "🚙",
  };

  return (
    <div className="space-y-3">
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink/50">
        BOOK AIRPORT TRANSFER — {destination.toUpperCase()}
      </p>
      {options.length === 0 && (
        <div className="flex items-center justify-center py-8 text-ink/30 font-body text-sm">
          Loading cab options…
        </div>
      )}
      {options.map((cab) => (
        <div
          key={cab.id}
          className="overflow-hidden rounded-xl border border-ink/10 bg-white/80 p-4 transition-all hover:shadow-md hover:border-runway/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-runway/10 text-xl">
              {CAB_ICONS[cab.type] || "🚗"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-medium text-ink">{cab.type}</p>
              <p className="font-mono text-[11px] text-ink/40">
                {cab.carModel} · {cab.seatingCapacity} seats · {cab.distance}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-base font-bold text-ink">
                ₹{cab.fare.toLocaleString("en-IN")}
              </p>
              <p className="font-mono text-[10px] text-ink/40">ETA {cab.eta}</p>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => onBook(cab)}
              disabled={loadingId === cab.id}
              className="rounded-xl bg-ink px-4 py-2 font-body text-sm font-semibold text-paper
                         transition-all hover:bg-runway hover:text-ink disabled:opacity-50"
              aria-label={`Book ${cab.type} cab for ₹${cab.fare}`}
            >
              {loadingId === cab.id ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-paper border-t-transparent" />
                  Booking
                </span>
              ) : (
                "Book →"
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── All booked summary ────────────────────────────────────────────────

function AllBookedSummary({
  flight,
  hotel,
  cab,
}: {
  flight: FlightBookingConfirmation;
  hotel: HotelBookingConfirmation;
  cab: CabBookingConfirmation;
}) {
  const total = flight.totalPrice + hotel.totalPrice + cab.totalPrice;

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-runway via-runway to-dusk p-6 text-ink">
        <div className="absolute -right-4 -top-4 text-[100px] opacity-[0.08] leading-none select-none">✓</div>
        <p className="font-mono text-[10px] tracking-[0.3em] text-ink/70">ALL BOOKINGS CONFIRMED</p>
        <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Your trip is booked!</h2>
        <p className="mt-1 font-body text-sm text-ink/70">
          Total spent: <span className="font-bold">₹{total.toLocaleString("en-IN")}</span>
        </p>
      </div>

      {/* Flight confirmation */}
      <ConfirmCard
        icon="✈"
        title={flight.airline}
        subtitle={`${flight.stops === 0 ? "Direct" : `${flight.stops} stop`} · ${formatDuration(flight.duration)}`}
        rows={[
          ["PNR", flight.pnr],
          ["E-Ticket", flight.eTicket],
          ["Depart", extractTime(flight.departure)],
          ["Arrive", extractTime(flight.arrival)],
          ["Class", flight.cabinClass || "Economy"],
          ["Passengers", String(flight.passengers)],
          ["Total", `₹${flight.totalPrice.toLocaleString("en-IN")}`],
        ]}
      />

      {/* Hotel confirmation */}
      <ConfirmCard
        icon="🏨"
        title={hotel.hotelName}
        subtitle={`${hotel.roomType} · ${hotel.rating}★`}
        rows={[
          ["Ref", hotel.confirmationNumber],
          ["Check-in", hotel.checkIn],
          ["Check-out", hotel.checkOut],
          ["Guest", hotel.guestName],
          ["Cancellation", hotel.cancellationPolicy.split(" ").slice(0, 4).join(" ") + "…"],
          ["Total", `₹${hotel.totalPrice.toLocaleString("en-IN")}`],
        ]}
      />

      {/* Cab confirmation */}
      <ConfirmCard
        icon="🚗"
        title={`${cab.cabType} — ${cab.carModel}`}
        subtitle={`${cab.pickup} → ${cab.dropoff}`}
        rows={[
          ["Ref", cab.referenceId],
          ["Driver", cab.driverName],
          ["Phone", cab.driverPhone],
          ["Rating", `${cab.driverRating} ★`],
          ["Plate", cab.licensePlate],
          ["OTP", cab.otp],
          ["Pickup", cab.pickupTime.slice(0, 16).replace("T", " ")],
          ["Total", `₹${cab.totalPrice.toLocaleString("en-IN")}`],
        ]}
      />
    </div>
  );
}

function ConfirmCard({
  icon,
  title,
  subtitle,
  rows,
}: {
  icon: string;
  title: string;
  subtitle: string;
  rows: [string, string][];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-white/80">
      <div className="flex items-center gap-3 border-b border-ink/10 px-4 py-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="font-display text-sm font-semibold text-ink">{title}</p>
          <p className="font-mono text-[11px] text-ink/40">{subtitle}</p>
        </div>
        <span className="ml-auto rounded-full bg-runway/15 px-2.5 py-0.5 font-mono text-[10px] text-runway font-semibold">
          CONFIRMED
        </span>
      </div>
      <dl className="divide-y divide-ink/5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-2">
            <dt className="font-mono text-[11px] text-ink/40">{label}</dt>
            <dd className="font-mono text-[11px] text-ink font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

function Stars({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5 text-amber">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`text-xs ${i < count ? "" : "opacity-20"}`}>
          ★
        </span>
      ))}
    </span>
  );
}

function TimeBlock({ label, time }: { label: string; time: string }) {
  return (
    <div className="text-center">
      <p className="font-mono text-[10px] text-ink/40">{label}</p>
      <p className="font-display text-sm font-medium text-ink">{time}</p>
    </div>
  );
}

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  return `${match[1] || "0"}h ${match[2] || "0"}m`;
}

function extractTime(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return isoDate.slice(11, 16);
  }
}
