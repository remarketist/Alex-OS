"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const RESETS = [
  { key: "walk", label: "10-minute walk", detail: "Outside. No phone. Just move.", icon: "🚶" },
  { key: "sprint", label: "25-minute work sprint", detail: "Smallest task. Timer on. Nothing else.", icon: "▶" },
  { key: "shower", label: "Shower / reset", detail: "Physical state change. Then back.", icon: "🚿" },
  { key: "write", label: "Write what I'm avoiding", detail: "Name it in one paragraph. That's the block.", icon: "✎" },
  { key: "smallest", label: "Start smallest possible task", detail: "One caption. One application. One rep.", icon: "◦" },
];

export function DerailClient() {
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "committed">("choose");
  const [trigger, setTrigger] = useState("");
  const [chosen, setChosen] = useState<(typeof RESETS)[0] | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [avoiding, setAvoiding] = useState("");

  const choose = async (reset: (typeof RESETS)[0]) => {
    setChosen(reset);
    const res = await fetch("/api/derail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger, reset_choice: reset.label }),
    });
    const j = await res.json();
    setEventId(j.id);
    setStep("committed");
  };

  const complete = async (outcome: string) => {
    if (eventId) {
      await fetch("/api/derail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eventId, outcome: outcome + (avoiding ? ` — avoiding: ${avoiding}` : "") }),
      });
    }
    router.push("/");
  };

  return (
    <div className="fixed inset-0 z-50 flex min-h-dvh flex-col items-center justify-center overflow-y-auto bg-[#05070d] px-5 py-10">
      {/* ambient red glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(244,63,94,0.12),transparent)]" />

      {step === "choose" && (
        <div className="relative w-full max-w-lg text-center fade-up">
          <div className="text-5xl">⚠</div>
          <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">Stop.</h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-mute">
            You are not solving your life right now. You are avoiding the next block.
            Pick one reset. Nothing else exists until it&apos;s done.
          </p>

          <input
            className="field mt-6 text-center"
            placeholder="What triggered this? (one line, optional)"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
          />

          <div className="mt-5 space-y-2.5">
            {RESETS.map((r) => (
              <button
                key={r.key}
                onClick={() => choose(r)}
                className="glass glass-hover flex w-full items-center gap-4 px-4 py-3.5 text-left"
              >
                <span className="text-xl">{r.icon}</span>
                <span>
                  <span className="block text-[15px] font-bold">{r.label}</span>
                  <span className="block text-[12px] text-mute">{r.detail}</span>
                </span>
              </button>
            ))}
          </div>

          <button onClick={() => router.push("/")} className="mt-6 text-[12px] text-faint hover:text-mute">
            ← back to Command Center
          </button>
        </div>
      )}

      {step === "committed" && chosen && (
        <div className="relative w-full max-w-lg text-center fade-up">
          <div className="text-5xl">{chosen.icon}</div>
          <h1 className="mt-5 text-3xl font-black">{chosen.label}.</h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-mute">
            Go now. No negotiation. The day is not lost — shrink the target, execute the next rep.
          </p>

          {chosen.key === "write" && (
            <textarea
              className="field mt-5 min-h-[110px] text-left"
              placeholder="What am I actually avoiding?"
              value={avoiding}
              onChange={(e) => setAvoiding(e.target.value)}
              autoFocus
            />
          )}

          <div className="mt-7 flex flex-col items-center gap-2.5">
            <button onClick={() => complete("Reset completed")} className="btn btn-primary w-full max-w-xs !py-3">
              Done — give me the next action
            </button>
            <button onClick={() => complete("Skipped reset")} className="text-[12px] text-faint hover:text-mute">
              I didn&apos;t do it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
