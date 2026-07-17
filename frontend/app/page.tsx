"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AgentBoard } from "@/components/AgentBoard";
import { AgentStep } from "@/lib/types";

const DEMO_SEQUENCE: string[] = [
  "READING TRIP GOAL",
  "SCANNING DESTINATIONS",
  "COMPARING FARES — DUFFEL",
  "CHECKING STAYS",
  "DRAFTING ITINERARY",
  "RANKING RECOMMENDATION",
];

function useDemoAgentBoard(sequence: string[], stepMs = 900) {
  const [steps, setSteps] = useState<AgentStep[]>(
    sequence.map((label, i) => ({
      id: String(i),
      label,
      status: "pending",
    }))
  );

  useEffect(() => {
    let i = 0;
    const tick = () => {
      setSteps((prev) =>
        prev.map((s, idx) => {
          if (idx < i) return { ...s, status: "done" };
          if (idx === i) return { ...s, status: "active" };
          return { ...s, status: "pending" };
        })
      );
      i++;
      if (i > sequence.length) i = 0;
    };
    tick();
    const id = setInterval(tick, stepMs);
    return () => clearInterval(id);
  }, [sequence, stepMs]);

  return steps;
}

export default function LandingPage() {
  const steps = useDemoAgentBoard(DEMO_SEQUENCE);

  return (
    <main className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-medium tracking-tight text-ink">
          TravelMind <span className="text-runway">AI</span>
        </span>
        <Link
          href="/plan"
          className="rounded-full bg-ink px-5 py-2 font-body text-sm font-medium text-paper transition-colors hover:bg-dusk"
        >
          Plan a trip
        </Link>
      </header>

      {/* Hero: the agent board IS the hero, not a stat block */}
      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-8 md:grid-cols-2 md:items-center md:pt-16">
        <div>
          <p className="font-mono text-xs tracking-[0.25em] text-runway">
            AI TRAVEL CONSULTANT
          </p>
          <h1 className="mt-4 font-display text-4xl font-medium leading-[1.1] tracking-tight text-ink md:text-5xl">
            Tell it your trip goal.
            <br />
            Watch the agents work.
          </h1>
          <p className="mt-5 max-w-md font-body text-base leading-relaxed text-ink/70">
            No search form. No filters to fight with. TravelMind AI asks a
            few questions like a consultant would, then a team of
            specialized agents finds, compares, and justifies your trip —
            in the open, on the board to the right.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/plan"
              className="rounded-full bg-runway px-6 py-3 font-body text-sm font-semibold text-ink transition-transform hover:scale-[1.02]"
            >
              Find me a travel plan →
            </Link>
          </div>
        </div>

        <div>
          <AgentBoard steps={steps} title="LIVE DEMO — AGENT BOARD" />
          <p className="mt-3 font-mono text-[11px] tracking-wide text-ink/40">
            This is a simulated loop. Real agent runs look like this on
            the planning screen.
          </p>
        </div>
      </section>

      {/* How it's different, kept minimal — no numbered-step template unless it's a real sequence */}
      <section className="mx-auto max-w-6xl border-t border-ink/10 px-6 py-14">
        <div className="grid gap-8 md:grid-cols-3">
          <Feature
            title="Consultant, not a form"
            body="It opens with your trip goal, budget, and vibe — not an origin/destination grid."
          />
          <Feature
            title="Agents you can watch"
            body="Destination discovery, flights, hotels, and itinerary run as separate agents, visibly."
          />
          <Feature
            title="Real fares, real fast"
            body="Flight and stay search runs against live sandbox data, not mock placeholders."
          />
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 font-mono text-[11px] tracking-wide text-ink/35">
        TravelMind AI — built as a demo of agentic travel planning.
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-display text-base font-medium text-ink">{title}</h3>
      <p className="mt-2 font-body text-sm leading-relaxed text-ink/60">{body}</p>
    </div>
  );
}
