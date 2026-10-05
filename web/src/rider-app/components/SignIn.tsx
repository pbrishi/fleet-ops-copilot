"use client";

import { Apple } from "lucide-react";
import { useState } from "react";
import { BlurFade } from "@/components/ui/blur-fade";
import { TextAnimate } from "@/components/ui/text-animate";
import { useRide } from "../RideProvider";

export function SignIn() {
  const { dispatch } = useRide();
  const [name, setName] = useState("");
  const go = () => dispatch({ type: "SIGN_IN", name: name.trim() || "Rider" });

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.25),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.18),transparent_60%)] px-7 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[calc(var(--status-bar,env(safe-area-inset-top))+3.5rem)]">
      <BlurFade inView={false}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-2xl shadow-lg shadow-sky-500/30">🚘</div>
      </BlurFade>
      <h1 className="mt-6 text-[32px] font-semibold leading-tight tracking-tight text-white">
        <TextAnimate animation="blurInUp" by="word" once>
          Copilot Rides
        </TextAnimate>
      </h1>
      <TextAnimate animation="fadeIn" by="word" delay={0.4} once className="mt-2 text-[15px] text-slate-400">
        Your ride, no driver. Tap a destination and go.
      </TextAnimate>

      <div className="mt-auto space-y-3">
        <label className="block text-xs text-slate-400" htmlFor="rider-name">
          First name (optional)
        </label>
        <input
          id="rider-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="Rider"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 text-[15px] text-white placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none"
        />
        <button onClick={go} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[15px] font-semibold text-slate-950 transition active:scale-[0.98]">
          <Apple className="h-[18px] w-[18px] fill-current" /> Continue with Apple
        </button>
        <button onClick={go} className="w-full rounded-2xl border border-white/15 py-3.5 text-[15px] font-medium text-white transition active:scale-[0.98]">
          Continue as demo rider
        </button>
        <p className="pt-1 text-center text-[11px] leading-relaxed text-slate-500">
          Demo app with simulated vehicles. Both options sign you in locally; no account is created and nothing is sent to a server.
        </p>
      </div>
    </div>
  );
}
