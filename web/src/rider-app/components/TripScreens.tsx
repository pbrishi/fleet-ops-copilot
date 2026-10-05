"use client";

import { Bell, Car, Check, Lightbulb, Lock, LockOpen, MessageCircle, Music2, ShieldAlert, X } from "lucide-react";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { Confetti } from "@/components/ui/confetti";
import { PulsatingButton } from "@/components/ui/pulsating-button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Ripple } from "@/components/ui/ripple";
import { usd } from "../pricing";
import { useRide } from "../RideProvider";
import { CRUISE_MPS, FREE_CANCEL_SECONDS, blockedReason, remainingM, type State } from "../trip";
import { ActionButton, PrimaryButton, Sheet, VehicleCard, minutes } from "./kit";
import RideMap from "./RideMapPanel";

const etaMin = (state: State) => remainingM(state) / CRUISE_MPS / 60;

// Map for every in-trip phase: the active leg plus the car's live position.
export function TripMap({ bottom = 330 }: { bottom?: number }) {
  const { state } = useRide();
  const t = state.trip;
  if (!t) return null;
  const toPickup = ["matching", "en_route"].includes(state.phase);
  const atPickup = ["arrived_pickup", "boarding"].includes(state.phase);
  // Once the car has arrived, zoom in on the rider and the parked car instead of the old route.
  const route = atPickup ? undefined : (toPickup ? t.pickupRoute : t.tripRoute)?.points;
  const riderPos: [number, number] = atPickup && !t.riderAtCar ? [t.pickup.pos[0] - 0.00035, t.pickup.pos[1] - 0.00012] : t.pickup.pos;
  const fit = atPickup ? [riderPos, t.carPos ?? t.pickup.pos] : (route ?? [t.pickup.pos, t.destination.pos]);
  return (
    <div className="absolute inset-0">
      <RideMap
        rider={toPickup || (atPickup && !t.riderInside) ? riderPos : undefined}
        route={route}
        cars={t.carPos && t.vehicle ? [{ id: t.vehicle.id, pos: t.carPos, color: t.vehicle.roofLight.hex, highlight: true }] : []}
        fit={fit}
        bottomPadding={bottom}
      />
    </div>
  );
}

export function Matching() {
  const { state, dispatch } = useRide();
  const t = state.trip!;
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-slate-950 px-6 text-center">
      <Ripple mainCircleSize={140} numCircles={6} className="opacity-70" />
      <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-3xl shadow-xl shadow-sky-500/30">🚘</div>
      <h2 className="relative z-10 mt-8 text-xl font-semibold text-white">Finding the nearest car</h2>
      <p className="relative z-10 mt-1 text-sm text-slate-400">
        To {t.destination.name} · {usd(t.quote.fare)} fare locked
      </p>
      <button onClick={() => dispatch({ type: "CANCEL" })} className="relative z-10 mt-10 rounded-full border border-white/15 px-5 py-2 text-sm text-slate-300">
        Cancel request
      </button>
    </div>
  );
}

export function EnRoute({ onChat }: { onChat: () => void }) {
  const { state, dispatch } = useRide();
  const t = state.trip!;
  const total = t.pickupRoute?.lengthM ?? 1;
  const progress = Math.min(100, Math.round((t.travelledM / total) * 100));
  const freeCancelLeft = Math.max(0, FREE_CANCEL_SECONDS - (state.simTime - t.requestedAt));
  return (
    <div className="relative h-full">
      <TripMap bottom={360} />
      <Sheet>
        <div className="flex items-center gap-4">
          <div className="relative size-20 shrink-0">
            <AnimatedCircularProgressBar value={progress} max={100} min={0} gaugePrimaryColor="#38bdf8" gaugeSecondaryColor="rgba(255,255,255,0.08)" className="size-20 text-transparent" />
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none text-white">
              <span className="text-xl font-semibold tabular-nums">{Math.max(1, Math.round(etaMin(state)))}</span>
              <span className="mt-0.5 text-[10px] text-slate-400">min</span>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-sky-300">Your car is on the way</div>
            <div className="text-2xl font-semibold text-white">Arrives in {minutes(etaMin(state))}</div>
            <div className="text-xs text-slate-400">Pickup at {t.pickup.name}</div>
          </div>
        </div>
        <div className="mt-4">{t.vehicle && <VehicleCard v={t.vehicle} />}</div>
        <div className="mt-3 flex gap-2">
          <ActionButton label="Honk" onClick={() => dispatch({ type: "NOTIFY", text: `${t.vehicle?.id ?? "Your car"} will give a short honk when it's close.` })}>
            <Bell className="h-4 w-4" /> Honk
          </ActionButton>
          <ActionButton label="Flash lights" onClick={() => dispatch({ type: "NOTIFY", text: `${t.vehicle?.id ?? "Your car"} will flash its ${t.vehicle?.roofLight.name ?? ""} roof light as it arrives.` })}>
            <Lightbulb className="h-4 w-4" /> Flash
          </ActionButton>
          <ActionButton label="Chat with support" onClick={onChat}>
            <MessageCircle className="h-4 w-4" /> Chat
          </ActionButton>
          <ActionButton label="Cancel trip" onClick={() => dispatch({ type: "CANCEL" })}>
            <X className="h-4 w-4" /> Cancel
          </ActionButton>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          {freeCancelLeft > 0 ? `Free cancellation for ${Math.ceil(freeCancelLeft / 60)} more min` : "Cancelling now has a $5 fee"}
        </p>
      </Sheet>
    </div>
  );
}

export function ArrivedPickup({ onChat }: { onChat: () => void }) {
  const { state, dispatch } = useRide();
  const t = state.trip!;
  const unlockBlocked = blockedReason(state, { type: "UNLOCK" });
  const unlocked = t.doors === "unlocked";
  return (
    <div className="relative h-full">
      <TripMap bottom={400} />
      <Sheet>
        <div className="text-xs uppercase tracking-wider text-emerald-300">Your car is here</div>
        <div className="text-2xl font-semibold text-white">{t.riderAtCar ? "You're at the car" : "Walk to your car · ~40 m"}</div>
        <p className="mt-1 text-xs text-slate-400">Parked at {t.pickup.name}. Look for the {t.vehicle?.roofLight.name} roof light.</p>
        <div className="mt-4">{t.vehicle && <VehicleCard v={t.vehicle} />}</div>

        <div className="mt-4">
          {!unlocked ? (
            unlockBlocked ? (
              <button disabled className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 py-3.5 text-[15px] text-slate-400">
                <Lock className="h-4 w-4" /> {unlockBlocked}
              </button>
            ) : (
              <PulsatingButton onClick={() => dispatch({ type: "UNLOCK" })} pulseColor="#38bdf8" className="w-full rounded-2xl bg-sky-500 py-3.5 text-[15px] font-semibold text-white">
                <span className="flex items-center justify-center gap-2">
                  <LockOpen className="h-4 w-4" /> Unlock doors
                </span>
              </PulsatingButton>
            )
          ) : (
            <PrimaryButton onClick={() => dispatch({ type: "BOARD" })} label="Get in">
              Doors unlocked · Get in
            </PrimaryButton>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          {!t.riderAtCar && (
            <ActionButton onClick={() => dispatch({ type: "RIDER_AT_CAR" })} label="I'm at the car">
              <Car className="h-4 w-4" /> I&apos;m at the car
            </ActionButton>
          )}
          <ActionButton label="Chat with support" onClick={onChat}>
            <MessageCircle className="h-4 w-4" /> Chat
          </ActionButton>
          <ActionButton label="Cancel trip" onClick={() => dispatch({ type: "CANCEL" })}>
            <X className="h-4 w-4" /> Cancel
          </ActionButton>
        </div>
      </Sheet>
    </div>
  );
}

export function Boarding() {
  const { state, dispatch } = useRide();
  const t = state.trip!;
  const items = [
    { label: "You're inside the car", done: t.riderInside },
    { label: "Seatbelt fastened", done: t.belted, action: () => dispatch({ type: "FASTEN_BELT" }) },
    { label: "Doors close and lock when you start", done: false, info: true },
  ];
  return (
    <div className="relative h-full">
      <TripMap bottom={420} />
      <Sheet>
        <div className="text-xs uppercase tracking-wider text-sky-300">Welcome aboard {t.vehicle?.id}</div>
        <div className="text-2xl font-semibold text-white">Ready when you are</div>
        <p className="mt-1 text-xs text-slate-400">To {t.destination.name} · about {minutes(t.quote.minutes)}</p>
        <ul className="mt-4 space-y-2">
          {items.map((it) => (
            <li key={it.label}>
              <button
                onClick={it.action}
                disabled={!it.action || it.done}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  it.done ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100" : it.info ? "border-white/5 bg-transparent text-slate-400" : "border-sky-400/40 bg-sky-500/10 text-white"
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${it.done ? "bg-emerald-500 text-slate-950" : it.info ? "bg-white/10 text-slate-400" : "border border-sky-300 text-sky-200"}`}>
                  {it.done ? <Check className="h-3.5 w-3.5" /> : it.info ? <Lock className="h-3 w-3" /> : null}
                </span>
                <span className="flex-1">{it.label}</span>
                {it.action && !it.done && <span className="text-xs text-sky-300">Tap to confirm</span>}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <RainbowButton onClick={() => dispatch({ type: "START" })} disabled={!t.belted} className="h-12 w-full rounded-2xl text-[15px] font-semibold disabled:opacity-40">
            Start ride
          </RainbowButton>
        </div>
      </Sheet>
    </div>
  );
}

export function InTrip({ onChat, onEmergency }: { onChat: () => void; onEmergency: () => void }) {
  const { state } = useRide();
  const t = state.trip!;
  const total = t.tripRoute?.lengthM ?? 1;
  const progress = Math.min(100, (t.travelledM / total) * 100);
  const pulling = state.phase === "pulling_over";
  return (
    <div className="relative h-full">
      <TripMap bottom={380} />
      <Sheet>
        {pulling ? (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3 text-amber-100">
            <div className="text-sm font-semibold">Pulling over safely…</div>
            <div className="text-xs text-amber-200/80">Slowing to the next safe spot · {Math.round(t.speedMps * 2.237)} mph</div>
          </div>
        ) : (
          <>
            <div className="text-xs uppercase tracking-wider text-sky-300">On the way to</div>
            <div className="text-2xl font-semibold text-white">{t.destination.name}</div>
            <div className="mt-1 text-xs text-slate-400">
              Arriving in {minutes(etaMin(state))} · {Math.round(t.speedMps * 2.237)} mph · doors locked
            </div>
          </>
        )}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 transition-[width] duration-1000" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600">
            <Music2 className="h-5 w-5 text-slate-950" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white">Music</div>
            <div className="truncate text-xs text-slate-400">Connected to {t.vehicle?.id} audio · player coming in the next phase</div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <ActionButton label="Chat with support" onClick={onChat}>
            <MessageCircle className="h-4 w-4" /> Support
          </ActionButton>
          <ActionButton label="Emergency" tone="danger" onClick={onEmergency}>
            <ShieldAlert className="h-4 w-4" /> Emergency
          </ActionButton>
        </div>
      </Sheet>
    </div>
  );
}

export function StoppedSafe({ onChat }: { onChat: () => void }) {
  const { state, dispatch } = useRide();
  const t = state.trip!;
  return (
    <div className="relative h-full">
      <TripMap bottom={380} />
      <Sheet>
        <div className="text-xs uppercase tracking-wider text-emerald-300">Car stopped safely</div>
        <div className="text-xl font-semibold text-white">Parked out of traffic</div>
        <p className="mt-1 text-xs text-slate-400">Support has been notified. You can continue, or end the trip here and pay only for the distance travelled.</p>
        <div className="mt-4 space-y-2">
          <PrimaryButton onClick={() => dispatch({ type: "RESUME" })}>Continue to {t.destination.name}</PrimaryButton>
          <button onClick={() => dispatch({ type: "END_TRIP" })} className="w-full rounded-2xl border border-white/15 py-3.5 text-[15px] font-medium text-white">
            End trip here
          </button>
          <button onClick={onChat} className="w-full py-2 text-sm text-sky-300">
            Talk to support
          </button>
        </div>
      </Sheet>
    </div>
  );
}

export function ArrivedDestination() {
  const { state, dispatch } = useRide();
  const t = state.trip!;
  return (
    <div className="relative h-full">
      <TripMap bottom={330} />
      <Confetti className="pointer-events-none absolute inset-0 z-[550] size-full" options={{ particleCount: 90, spread: 70, origin: { y: 0.55 } }} />
      <Sheet>
        <div className="text-xs uppercase tracking-wider text-emerald-300">You&apos;ve arrived</div>
        <div className="text-2xl font-semibold text-white">{t.destination.name}</div>
        <p className="mt-1 text-xs text-slate-400">The car has parked and your doors are unlocked. Check for your belongings, then watch for bikes as you get out.</p>
        <div className="mt-4">
          <PrimaryButton onClick={() => dispatch({ type: "END_TRIP" })}>End trip · {usd(t.quote.fare)}</PrimaryButton>
        </div>
      </Sheet>
    </div>
  );
}
