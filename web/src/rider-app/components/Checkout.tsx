"use client";

import { Check, CreditCard, Star } from "lucide-react";
import { useState } from "react";
import { BlurFade } from "@/components/ui/blur-fade";
import { metersToMiles } from "../geo";
import { fareBreakdown, usd } from "../pricing";
import { useRide } from "../RideProvider";

export function Payment() {
  const { state, dispatch } = useRide();
  const t = state.trip!;
  const [paying, setPaying] = useState(false);
  const miles = t.endedEarly ? metersToMiles(t.tripDistanceM) : t.quote.miles;
  const mins = t.endedEarly ? ((t.tripEndedAt ?? 0) - (t.tripStartedAt ?? 0)) / 60 : t.quote.minutes;
  const b = fareBreakdown(miles, mins);
  const total = t.finalFare ?? t.quote.fare;

  // Placeholder until Stripe test mode is wired up (P5): simulates authorization.
  const pay = () => {
    setPaying(true);
    setTimeout(() => dispatch({ type: "PAID" }), 1400);
  };

  const rows: [string, number][] = t.endedEarly
    ? [["Base fare", b.base], [`Distance · ${miles.toFixed(1)} mi`, b.distance], [`Time · ${Math.max(1, Math.round(mins))} min`, b.time], ...(b.minimumTopUp > 0.004 ? [["Minimum fare adjustment", b.minimumTopUp] as [string, number]] : [])]
    : [["Trip fare (quoted)", total]];

  return (
    <div className="flex h-full flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(var(--status-bar,env(safe-area-inset-top))+1.5rem)]">
      <div className="text-xs uppercase tracking-wider text-slate-400">Trip complete</div>
      <h2 className="mt-1 text-2xl font-semibold text-white">{t.destination.name}</h2>
      {t.endedEarly && <p className="mt-1 text-xs text-amber-200">Ended early after an emergency stop. You&apos;re charged only for the distance travelled.</p>}

      <div className="mt-8 text-center">
        <div className="text-sm text-slate-400">Total</div>
        <BlurFade inView={false} delay={0.1}>
          <div className="mt-1 text-5xl font-semibold tabular-nums text-white">{usd(total)}</div>
        </BlurFade>
      </div>

      <ul className="mt-8 space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
        {rows.map(([label, value]) => (
          <li key={label} className="flex justify-between text-slate-300">
            <span>{label}</span>
            <span className="tabular-nums">{usd(value)}</span>
          </li>
        ))}
        <li className="flex justify-between border-t border-white/10 pt-2 font-semibold text-white">
          <span>Total</span>
          <span className="tabular-nums">{usd(total)}</span>
        </li>
      </ul>

      <div className="mt-auto space-y-2">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300">
          <CreditCard className="h-4 w-4" /> Visa •••• 4242 <span className="ml-auto text-xs text-slate-500">test card</span>
        </div>
        <button onClick={pay} disabled={paying} className="w-full rounded-2xl bg-white py-3.5 text-[15px] font-semibold text-slate-950 transition active:scale-[0.98] disabled:opacity-60">
          {paying ? "Processing…" : `Pay ${usd(total)}`}
        </button>
        <p className="text-center text-[11px] text-slate-500">Demo payment. Stripe test mode (no real money) is coming in the next phase.</p>
      </div>
    </div>
  );
}

export function Complete() {
  const { state, dispatch } = useRide();
  const t = state.trip!;
  const [stars, setStars] = useState(0);
  return (
    <div className="flex h-full flex-col items-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(var(--status-bar,env(safe-area-inset-top))+3rem)] text-center">
      <BlurFade inView={false}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
          <Check className="h-8 w-8" />
        </div>
      </BlurFade>
      <h2 className="mt-5 text-2xl font-semibold text-white">Paid {usd(t.finalFare ?? t.quote.fare)}</h2>
      <p className="mt-1 text-sm text-slate-400">Receipt sent to your email (simulated).</p>

      <div className="mt-10 text-sm text-slate-300">How was your ride with {t.vehicle?.id}?</div>
      <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Rate your ride">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setStars(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-checked={stars === n} role="radio" className="p-1">
            <Star className={`h-8 w-8 transition ${n <= stars ? "fill-amber-400 text-amber-400" : "text-slate-600"}`} />
          </button>
        ))}
      </div>
      {stars > 0 && <p className="mt-2 text-xs text-slate-400">Thanks for the feedback.</p>}

      <button onClick={() => dispatch({ type: "DONE" })} className="mt-auto w-full rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 py-3.5 text-[15px] font-semibold text-white">
        Back to home
      </button>
    </div>
  );
}
