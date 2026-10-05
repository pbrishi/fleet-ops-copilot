"use client";

import { MessageCircle, Phone, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { useRide } from "../RideProvider";
import { blockedReason } from "../trip";

// Emergency options during a ride. "Call 911" is deliberately NOT a live tel: link in this public
// demo: anyone clicking around must never place a real emergency call by accident.
export function EmergencySheet({ onClose, onSupport }: { onClose: () => void; onSupport: () => void }) {
  const { state, dispatch } = useRide();
  const [show911, setShow911] = useState(false);
  const canPullOver = !blockedReason(state, { type: "EMERGENCY_STOP" });

  return (
    <div className="absolute inset-0 z-[850] flex items-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full rounded-t-[28px] border-t border-rose-500/30 bg-slate-950 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-200">
            <ShieldAlert className="h-5 w-5" />
            <span className="text-lg font-semibold">Emergency</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-slate-400 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        {show911 ? (
          <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            <div className="font-semibold">In the real app, this calls 911 immediately</div>
            <p className="mt-1 text-rose-100/80">This is a public demo, so it doesn&apos;t place calls. If you have a real emergency, call 911 from your phone now.</p>
            <button onClick={() => setShow911(false)} className="mt-3 text-xs text-rose-200 underline">
              Back
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            <button
              onClick={() => {
                dispatch({ type: "EMERGENCY_STOP" });
                onClose();
              }}
              disabled={!canPullOver}
              className="flex w-full items-center gap-3 rounded-2xl bg-amber-500 px-4 py-4 text-left text-slate-950 transition active:scale-[0.98] disabled:opacity-40"
            >
              <span className="text-2xl">🛑</span>
              <span>
                <span className="block text-[15px] font-semibold">Pull over now</span>
                <span className="block text-xs opacity-80">The car stops at the next safe spot, out of traffic</span>
              </span>
            </button>
            <button onClick={() => setShow911(true)} className="flex w-full items-center gap-3 rounded-2xl bg-rose-600 px-4 py-4 text-left text-white transition active:scale-[0.98]">
              <Phone className="h-6 w-6" />
              <span>
                <span className="block text-[15px] font-semibold">Call 911</span>
                <span className="block text-xs opacity-80">Share your car&apos;s exact location with responders</span>
              </span>
            </button>
            <button
              onClick={() => {
                onClose();
                onSupport();
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/15 px-4 py-4 text-left text-white transition active:scale-[0.98]"
            >
              <MessageCircle className="h-6 w-6" />
              <span>
                <span className="block text-[15px] font-semibold">Talk to support</span>
                <span className="block text-xs text-slate-400">Chat or speak with the support copilot and an agent</span>
              </span>
            </button>
            <p className="pt-1 text-center text-[11px] text-slate-500">Doors stay locked while the car is moving and unlock once it has stopped safely.</p>
          </div>
        )}
      </div>
    </div>
  );
}
