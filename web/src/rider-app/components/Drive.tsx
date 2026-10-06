"use client";

import { ArrowLeft, ArrowRight, ArrowUp, Camera, CornerUpLeft, Flag, Lock, ShieldCheck, UserPlus, UserX } from "lucide-react";
import { formatDistance, nextManeuver } from "../geo";
import { useRide } from "../RideProvider";
import { RIDER_SEAT, SEATS, remainingM, type SeatId, type Trip } from "../trip";

const SEAT_LABEL: Record<SeatId, string> = {
  front_right: "Front",
  rear_left: "Rear left",
  rear_middle: "Rear middle",
  rear_right: "Rear right",
};

// Top-down seat map driven by the (simulated) seat sensors. Tapping an empty seat simulates a
// passenger sitting down; tapping an occupied seat buckles that passenger.
export function SeatMap() {
  const { state, dispatch } = useRide();
  const t = state.trip!;

  const seat = (id: SeatId) => {
    const s = t.seats[id];
    const mine = id === RIDER_SEAT;
    const tone = !s.occupied ? "border-dashed border-white/15 bg-transparent text-slate-500" : s.belted ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100" : "animate-pulse border-amber-400/70 bg-amber-500/15 text-amber-100";
    return (
      <div key={id} className="flex flex-col items-center gap-1">
        <button
          onClick={() => dispatch(s.occupied ? (s.belted ? { type: "NOTIFY", text: `${SEAT_LABEL[id]} passenger is buckled.` } : { type: "BELT", seat: id }) : { type: "SEAT_OCCUPIED", seat: id })}
          aria-label={!s.occupied ? `Simulate a passenger in the ${SEAT_LABEL[id]} seat` : s.belted ? `${SEAT_LABEL[id]} seat buckled` : `Buckle the ${SEAT_LABEL[id]} seat`}
          className={`flex h-14 w-full flex-col items-center justify-center rounded-xl border text-[10px] leading-tight transition active:scale-95 ${tone}`}
        >
          {!s.occupied ? <UserPlus className="h-4 w-4" /> : <span className="text-base">{s.belted ? "✓" : "⚠"}</span>}
          <span>{!s.occupied ? "Empty" : s.belted ? "Buckled" : "Buckle up"}</span>
        </button>
        <span className="text-[10px] text-slate-500">
          {SEAT_LABEL[id]}
          {mine ? " · you" : ""}
        </span>
        {s.occupied && !mine && (
          <button onClick={() => dispatch({ type: "SEAT_VACATED", seat: id })} aria-label={`Passenger leaves the ${SEAT_LABEL[id]} seat`} className="text-[10px] text-slate-500 hover:text-slate-300">
            <UserX className="inline h-3 w-3" /> leave
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>Seat sensors</span>
        <span>Tap an empty seat to add a passenger</span>
      </div>
      <div className="mx-auto w-full max-w-[260px] rounded-[26px] border border-white/10 bg-slate-900/60 p-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-14 w-full items-center justify-center rounded-xl bg-white/[0.03] text-[10px] text-slate-600">No driver</div>
            <span className="text-[10px] text-slate-600">Front left</span>
          </div>
          <div />
          {seat("front_right")}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">{(["rear_left", "rear_middle", "rear_right"] as SeatId[]).map(seat)}</div>
      </div>
    </div>
  );
}

export const seatsSummary = (t: Trip) => {
  const occupied = SEATS.filter((id) => t.seats[id].occupied);
  const waiting = occupied.filter((id) => !t.seats[id].belted).length;
  return { occupied: occupied.length, waiting };
};

const ICONS = { left: ArrowLeft, right: ArrowRight, straight: ArrowUp, uturn: CornerUpLeft };

// Turn-by-turn banner during the ride; switches to an arrival prompt on the final approach.
export function NavBanner({ arriving }: { arriving: boolean }) {
  const { state } = useRide();
  const t = state.trip!;
  const route = t.tripRoute;
  if (!route) return null;
  const left = remainingM(state);
  const next = nextManeuver(route, t.travelledM);

  const [Icon, headline, sub] = arriving
    ? [Flag, `Arriving at ${t.destination.name}`, `${formatDistance(left)} · on the right`]
    : next
      ? [ICONS[next.direction], next.instruction, `In ${formatDistance(next.inM)}`]
      : [ArrowUp, `Continue to ${t.destination.name}`, `${formatDistance(left)} to go`];

  return (
    <div className="absolute inset-x-3 top-[calc(var(--status-bar,env(safe-area-inset-top))+0.5rem)] z-[520]">
      <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl ${arriving ? "bg-emerald-600" : "bg-sky-600"}`}>
        <Icon className="h-8 w-8 shrink-0 text-white" strokeWidth={2.5} />
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-white/80">{sub}</div>
          <div className="truncate text-[17px] font-semibold leading-tight text-white">{headline}</div>
        </div>
      </div>
    </div>
  );
}

// Where to get out: curb side recommended; traffic side held locked while the cameras see traffic.
export function ExitGuide() {
  const { state } = useRide();
  const t = state.trip!;
  const traffic = !!t.leftDoorsLocked;
  return (
    <div className="flex items-stretch gap-3">
      <div className="relative w-[92px] shrink-0">
        <div className="relative mx-auto h-[118px] w-[58px] rounded-[18px] border border-white/20 bg-slate-800">
          <div className="absolute inset-x-2 top-2 h-5 rounded-md bg-sky-900/70" />
          <div className="absolute inset-x-2 bottom-2 h-4 rounded-md bg-sky-900/50" />
          {/* left doors */}
          <div className={`absolute -left-1 top-[34px] h-[52px] w-1.5 rounded-full ${traffic ? "bg-rose-500" : "bg-slate-500"}`} />
          {/* right doors */}
          <div className="absolute -right-1 top-[34px] h-[52px] w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
        </div>
        {traffic && <div className="absolute left-0 top-1/2 -translate-y-1/2 text-lg">🚲</div>}
        <ArrowRight className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-300" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2 text-emerald-200">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">Exit on the right, curb side</span>
        </div>
        {traffic ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            <div className="flex items-center gap-1.5 font-semibold">
              <Camera className="h-3.5 w-3.5" /> Traffic approaching on the left
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-rose-100/80">
              <Lock className="h-3 w-3" /> Left doors stay locked until it passes
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300">
            <Camera className="mr-1 inline h-3.5 w-3.5" /> Cameras see no approaching traffic. Both sides are unlocked.
          </div>
        )}
        <p className="text-[10px] text-slate-500">Camera detection is simulated in this demo.</p>
      </div>
    </div>
  );
}
