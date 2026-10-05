"use client";

import { Mic, Send, Square, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BlurFade } from "@/components/ui/blur-fade";
import { useRiderChat } from "@/rider/useRiderChat";
import { useRide } from "../RideProvider";
import { CRUISE_MPS, remainingM, type State } from "../trip";

// What the copilot knows about the ride, in the same shape as the console's demo scenarios.
function rideContext(state: State) {
  const t = state.trip;
  if (!t) return null;
  const eta = Math.round(remainingM(state) / CRUISE_MPS / 60);
  const status: Record<string, string> = {
    matching: "finding_car",
    en_route: "car_on_the_way",
    arrived_pickup: "car_waiting_at_pickup",
    boarding: "rider_boarding",
    in_trip: "in_trip",
    pulling_over: "pulling_over_after_emergency_stop",
    stopped_safe: "stopped_safely_after_emergency_stop",
    arrived_destination: "arrived_at_destination",
    payment: "trip_ended",
    complete: "trip_ended",
  };
  return {
    trip_status: status[state.phase] ?? state.phase,
    vehicle_id: t.vehicle?.id ?? null,
    vehicle_description: t.vehicle ? `${t.vehicle.color} ${t.vehicle.model} with a ${t.vehicle.roofLight.name} roof light` : null,
    pickup: t.pickup.name,
    destination: t.destination.name,
    pickup_eta_minutes: state.phase === "en_route" ? eta : null,
    arrival_eta_minutes: ["in_trip", "pulling_over"].includes(state.phase) ? eta : null,
    doors: t.doors,
    speed_mph: Math.round(t.speedMps * 2.237),
    quoted_fare: `$${t.quote.fare.toFixed(2)}`,
  };
}

export function ChatSheet({ onClose, opener }: { onClose: () => void; opener?: string }) {
  const { state } = useRide();
  const chat = useRiderChat(rideContext(state));
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const sentOpener = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chat.messages, chat.sending]);

  // Emergency "Talk to support" opens the chat with the rider's situation already sent.
  useEffect(() => {
    if (opener && !sentOpener.current) {
      sentOpener.current = true;
      chat.send({ text: opener });
    }
  }, [opener, chat]);

  return (
    <div className="absolute inset-0 z-[800] flex flex-col bg-slate-950/98 pt-[var(--status-bar,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-sm font-bold text-slate-950">AI</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">Rider support</div>
          <div className="truncate text-[11px] text-slate-400">Knows your trip · hands off to a person when needed</div>
        </div>
        <button onClick={() => chat.setSpeakReplies(!chat.speakReplies)} aria-label={chat.speakReplies ? "Turn off spoken replies" : "Turn on spoken replies"} className="rounded-full p-2 text-slate-300 hover:bg-white/10">
          {chat.speakReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <button onClick={onClose} aria-label="Close chat" className="rounded-full p-2 text-slate-300 hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>

      {chat.lastEscalation && chat.lastEscalation !== "none" && (
        <div className={`mx-4 mt-3 rounded-xl px-3 py-2 text-xs ${chat.lastEscalation === "emergency" ? "bg-rose-500/15 text-rose-100" : "bg-sky-500/15 text-sky-100"}`}>
          {chat.lastEscalation === "emergency" ? "Emergency flagged. A support agent is being connected now (simulated)." : "A support agent will join this chat shortly (simulated)."}
        </div>
      )}

      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3" aria-live="polite">
        {chat.messages.length === 0 && (
          <div className="mt-10 text-center text-sm text-slate-500">
            Ask anything about your ride.
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {["Where's my car?", "How long until we arrive?", "Can I change my destination?"].map((q) => (
                <button key={q} onClick={() => chat.send({ text: q })} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {chat.messages.map((m, i) => (
          <BlurFade key={i} duration={0.25} inView={false} offset={6} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug ${m.role === "user" ? "rounded-br-md bg-gradient-to-br from-sky-500 to-indigo-500 text-white" : m.error ? "rounded-bl-md bg-slate-800 text-amber-200" : "rounded-bl-md bg-slate-800 text-slate-100"}`}>
              {m.voice && <Mic className="mr-1 inline h-3 w-3 -translate-y-px opacity-80" />}
              <span className={m.pending ? "italic opacity-80" : ""}>{m.text}</span>
              {m.role === "assistant" && !m.error && (
                <button onClick={() => (chat.speakingIndex === i ? chat.stopSpeaking() : chat.playReply(i, m.text))} className="ml-2 inline-flex translate-y-0.5 text-slate-400 hover:text-sky-300" aria-label={chat.speakingIndex === i ? "Stop speaking" : "Play reply"}>
                  {chat.speakingIndex === i ? <Square className="h-3 w-3 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          </BlurFade>
        ))}
        {chat.sending && (
          <div className="flex gap-1.5 px-1">
            {[0, 150, 300].map((d) => (
              <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {chat.micError && <p className="px-4 pb-1 text-xs text-amber-300">{chat.micError}</p>}
      <form
        className="flex items-center gap-2 border-t border-white/10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          chat.send({ text: input });
          setInput("");
        }}
      >
        <button
          type="button"
          onClick={chat.toggleRecording}
          disabled={chat.sending}
          aria-label={chat.recording ? "Stop recording and send" : "Speak to support"}
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${chat.recording ? "bg-rose-500 text-white" : "bg-white/10 text-slate-200"}`}
        >
          {chat.recording && <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/40" />}
          {chat.recording ? <Square className="relative h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
        </button>
        {chat.recording ? (
          <div className="flex flex-1 items-center gap-2 text-sm text-rose-100">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" /> Listening… {chat.recordSecs}s
            <button type="button" onClick={chat.cancelRecording} className="ml-auto text-xs text-rose-200/80">
              Cancel
            </button>
          </div>
        ) : (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            placeholder="Message support"
            aria-label="Message"
            className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-[14px] text-white placeholder:text-slate-500 focus:border-sky-400/50 focus:outline-none"
          />
        )}
        {!chat.recording && (
          <button type="submit" disabled={chat.sending || !input.trim()} aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500 text-white disabled:bg-white/10 disabled:text-slate-500">
            <Send className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}
