"use client";

import { AgentStep } from "@/lib/types";

/**
 * The signature element of TravelMind AI: an airport split-flap
 * departure board, repurposed to show what the agent team is doing
 * right now instead of gate numbers. Ties the "multiple AI agents
 * collaborating" idea directly back to the travel domain instead of
 * a generic spinner or progress bar.
 */
export function AgentBoard({ steps, title = "AGENT BOARD" }: { steps: AgentStep[]; title?: string }) {
  return (
    <div className="rounded-lg bg-dusk text-paper border border-line overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <span className="font-mono text-xs tracking-[0.2em] text-amber">{title}</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-runway">
          <span className="h-1.5 w-1.5 rounded-full bg-runway animate-pulse" />
          LIVE
        </span>
      </div>
      <ul className="divide-y divide-line">
        {steps.map((step, i) => (
          <li
            key={step.id}
            className="flex items-center gap-3 px-4 py-2.5 animate-flip-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <StatusGlyph status={step.status} />
            <span
              className={`font-mono text-[13px] tracking-wide uppercase ${
                step.status === "pending" ? "text-paper/35" : "text-paper"
              }`}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusGlyph({ status }: { status: AgentStep["status"] }) {
  if (status === "done") {
    return <span className="font-mono text-runway text-sm w-4 shrink-0">✓</span>;
  }
  if (status === "active") {
    return (
      <span className="w-4 shrink-0 flex justify-center">
        <span className="h-2 w-2 rounded-full bg-amber animate-pulse" />
      </span>
    );
  }
  return <span className="font-mono text-paper/25 text-sm w-4 shrink-0">·</span>;
}
