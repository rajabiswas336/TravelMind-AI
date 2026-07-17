"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChatBubble } from "@/components/ChatBubble";
import { QuickReplyChips } from "@/components/QuickReplyChips";
import { AgentBoard } from "@/components/AgentBoard";
import { TripDashboard } from "@/components/TripDashboard";
import { BookingFlow } from "@/components/BookingFlow";
import {
  AgentStep,
  ChatMessage,
  TripState,
  FlightBookingConfirmation,
  HotelBookingConfirmation,
  CabBookingConfirmation,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const AGENT_SEQUENCE = [
  "DESTINATION AGENT — SCANNING",
  "FLIGHT AGENT — DUFFEL SEARCH",
  "HOTEL AGENT — CHECKING STAYS",
  "ITINERARY AGENT — DRAFTING",
  "RECOMMENDATION AGENT — RANKING",
];

let idCounter = 0;
const nextId = () => `m${idCounter++}`;

export default function PlanPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tripState, setTripState] = useState<TripState>({});
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>(
    AGENT_SEQUENCE.map((label, i) => ({ id: String(i), label, status: "pending" }))
  );
  const [phase, setPhase] = useState<"chat" | "searching" | "done" | "booking" | "booked">("chat");
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [bookingData, setBookingData] = useState<{
    flight: FlightBookingConfirmation;
    hotel: HotelBookingConfirmation;
    cab: CabBookingConfirmation;
  } | null>(null);

  // Ask the first question on mount
  useEffect(() => {
    sendMessage("Hi", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string, isInitial = false) {
    if (!isInitial) {
      setMessages((prev) => [...prev, { id: nextId(), role: "user", text }]);
    }
    setIsLoading(true);
    setQuickReplies([]);
    setInputText("");

    try {
      const resp = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, state: tripState }),
      });

      if (!resp.ok) throw new Error(`Chat API error: ${resp.status}`);

      const data = await resp.json();
      setTripState(data.state);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", text: data.reply, quickReplies: data.quickReplies },
      ]);
      setQuickReplies(data.quickReplies || []);

      if (data.done) {
        setTimeout(() => startAgentPipeline(data.state), 600);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text: "Sorry, I had trouble connecting. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function startAgentPipeline(stateSnapshot: TripState) {
    setPhase("searching");
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: "assistant",
        text: "All set! I'm launching the agent team now. Watch the board →",
      },
    ]);

    try {
      const resp = await fetch(`${API_BASE}/api/plan/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: stateSnapshot }),
      });

      if (!resp.ok || !resp.body) throw new Error("Stream error");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.trim().split("\n");
          let event = "";
          let data = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7);
            else if (line.startsWith("data: ")) data = line.slice(6);
          }

          if (!event || !data) continue;

          try {
            const parsed = JSON.parse(data);

            if (event === "agent_start") {
              setAgentSteps((prev) =>
                prev.map((s, idx) => {
                  if (idx < parsed.index) return { ...s, status: "done" };
                  if (idx === parsed.index) return { ...s, status: "active" };
                  return s;
                })
              );
            } else if (event === "agent_end") {
              setAgentSteps((prev) =>
                prev.map((s, idx) =>
                  idx <= parsed.index ? { ...s, status: "done" } : s
                )
              );
            } else if (event === "result") {
              setTripState(parsed);
            } else if (event === "done") {
              setPhase("done");
              setAgentSteps((prev) => prev.map((s) => ({ ...s, status: "done" })));
              setMessages((prev) => [
                ...prev,
                {
                  id: nextId(),
                  role: "assistant",
                  text: "Done! Your complete trip plan is ready. Check out the dashboard — or hit **Book this trip** to lock in your flight, hotel, and airport transfer right now 🎉",
                },
              ]);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      console.error("Pipeline error:", err);
      setPhase("done");
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text: "Had trouble running the agents. The results may be incomplete.",
        },
      ]);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || isLoading || phase !== "chat") return;
    sendMessage(inputText.trim());
  }

  function handleChipSelect(value: string) {
    if (isLoading || phase !== "chat") return;
    sendMessage(value);
  }

  function handleStartBooking() {
    setPhase("booking");
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: "assistant",
        text: "Great! Let's lock it in. Pick your flight first, then hotel, then airport transfer.",
      },
    ]);
  }

  function handleBookingComplete(
    flight: FlightBookingConfirmation,
    hotel: HotelBookingConfirmation,
    cab: CabBookingConfirmation
  ) {
    setBookingData({ flight, hotel, cab });
    setPhase("booked");
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: "assistant",
        text: `All done! ✈ Flight ${flight.pnr} · 🏨 ${hotel.hotelName} ${hotel.confirmationNumber} · 🚗 Cab ${cab.referenceId} (OTP: ${cab.otp}). Your full itinerary and confirmations are on the right.`,
      },
    ]);
  }

  return (
    <main className="flex min-h-screen flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
        <Link href="/" className="font-display text-base font-medium tracking-tight text-ink">
          TravelMind <span className="text-runway">AI</span>
        </Link>
        <span className="font-mono text-[11px] tracking-widest text-ink/40">
          {phase === "searching" ? "AGENTS RUNNING" : phase === "done" ? "TRIP READY" : phase === "booking" ? "BOOKING" : phase === "booked" ? "ALL BOOKED ✓" : "PLANNING"}
        </span>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-6 py-6 md:grid-cols-[1.3fr_1fr]">
        {/* Conversation column */}
        <div className="flex min-h-[70vh] flex-col rounded-2xl border border-ink/10 bg-white/40 shadow-sm">
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
            {messages.map((m) => (
              <div key={m.id} className="space-y-2 animate-fade-up" style={{ animationDuration: "300ms" }}>
                <ChatBubble message={m} />
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-1.5 rounded-2xl rounded-tl-sm border border-ink/8 bg-white px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-runway animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-runway animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-runway animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          {quickReplies.length > 0 && phase === "chat" && !isLoading && (
            <div className="border-t border-ink/10 px-4 py-3">
              <QuickReplyChips options={quickReplies} onSelect={handleChipSelect} />
            </div>
          )}

          {/* Text input */}
          {phase === "chat" && (
            <form onSubmit={handleSubmit} className="border-t border-ink/10 px-4 py-3">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type your answer…"
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-ink/15 bg-white px-4 py-2.5 font-body text-sm text-ink
                             placeholder:text-ink/30 transition-colors
                             focus:border-runway focus:outline-none focus:ring-2 focus:ring-runway/20
                             disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputText.trim()}
                  className="rounded-xl bg-ink px-5 py-2.5 font-body text-sm font-medium text-paper
                             transition-all hover:bg-dusk disabled:opacity-30"
                >
                  Send
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right column — agent board + state / dashboard */}
        <div className="space-y-4">
          <AgentBoard steps={agentSteps} />
          {phase === "done" ? (
            <>
              <TripDashboard state={tripState} />
              <button
                onClick={handleStartBooking}
                className="w-full rounded-xl bg-runway px-6 py-3.5 font-body text-base font-semibold text-ink
                           transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
              >
                Book this trip →
              </button>
            </>
          ) : phase === "booking" ? (
            <BookingFlow
              tripState={tripState}
              onComplete={handleBookingComplete}
              onSkip={() => setPhase("done")}
            />
          ) : phase === "booked" ? (
            <BookingFlow
              tripState={tripState}
              onComplete={handleBookingComplete}
              onSkip={() => {}}
            />
          ) : (
            <TripStateCard state={tripState} />
          )}
        </div>
      </div>
    </main>
  );
}

function TripStateCard({ state }: { state: TripState }) {
  const displayEntries = [
    state.tripType && ["Trip Type", state.tripType],
    state.origin && ["Origin", state.origin],
    state.budgetINR && ["Budget", `₹${state.budgetINR.toLocaleString("en-IN")}`],
    state.adults && ["Adults", String(state.adults)],
    state.children && ["Children", String(state.children)],
    state.durationDays && ["Duration", `${state.durationDays} days`],
    state.preferences?.length && ["Preferences", state.preferences.join(", ")],
    state.selectedDestination && ["Destination", state.selectedDestination],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="rounded-xl border border-ink/10 bg-white/60 px-4 py-3 shadow-sm">
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink/40">TRIP STATE</p>
      {displayEntries.length === 0 ? (
        <p className="mt-2 font-body text-sm text-ink/40">Filling in as you answer…</p>
      ) : (
        <dl className="mt-2 space-y-1.5">
          {displayEntries.map(([key, value]) => (
            <div key={key} className="flex justify-between font-mono text-[12px]">
              <dt className="text-ink/45">{key}</dt>
              <dd className="text-ink font-medium text-right max-w-[60%] truncate">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
