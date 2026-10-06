"use client";

import { MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useFleet } from "@/components/FleetProvider";
import { BlurFade } from "@/components/ui/blur-fade";
import { distanceM, metersToMiles } from "../geo";
import { RIDER_HOME, SUGGESTED_PLACES, type Place } from "../places";
import { quoteFare } from "../pricing";
import { useRide } from "../RideProvider";
import { CRUISE_MPS } from "../trip";
import { nearbyCars, vehicleInfo } from "../vehicles";
import { SpotifyButton } from "./Cabin";
import { Sheet, minutes } from "./kit";
import RideMap from "./RideMapPanel";

const ROAD_FACTOR = 1.35; // street distance vs. straight line, for quick quotes

export function quoteFor(place: Place) {
  const meters = distanceM(RIDER_HOME.pos, place.pos) * ROAD_FACTOR;
  const miles = metersToMiles(meters);
  const mins = meters / CRUISE_MPS / 60;
  return { fare: quoteFare(miles, mins), miles: Math.round(miles * 10) / 10, minutes: Math.round(mins) };
}

export function Home() {
  const { state, dispatch } = useRide();
  const { vehicles } = useFleet();
  const [query, setQuery] = useState("");
  const cars = nearbyCars(vehicles, RIDER_HOME.pos);
  const pickupMins = cars.length ? (cars[0].d * ROAD_FACTOR) / CRUISE_MPS / 60 : null;

  const places = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SUGGESTED_PLACES.filter((p) => !q || `${p.name} ${p.subtitle}`.toLowerCase().includes(q)).map((p) => ({ p, q: quoteFor(p) }));
  }, [query]);

  const request = (place: Place) =>
    dispatch({ type: "REQUEST", destination: place, pickup: { name: RIDER_HOME.name, pos: RIDER_HOME.pos }, quote: quoteFor(place) });

  return (
    <div className="relative h-full">
      <div className="absolute inset-0">
        <RideMap
          rider={RIDER_HOME.pos}
          cars={cars.map(({ v }) => ({ id: v.id, pos: [v.lat, v.lng], color: vehicleInfo(v).roofLight.hex }))}
          fit={[RIDER_HOME.pos, ...cars.slice(0, 4).map(({ v }) => [v.lat, v.lng] as [number, number])]}
          bottomPadding={430}
        />
      </div>

      <div className="absolute inset-x-4 top-[calc(var(--status-bar,env(safe-area-inset-top))+0.5rem)] z-[500] flex items-center justify-between">
        <div className="rounded-full border border-white/10 bg-slate-950/80 px-3.5 py-1.5 text-sm text-white backdrop-blur">
          Hi, {state.riderName} 👋
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-200 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {cars.length} cars nearby{pickupMins !== null && <> · {minutes(pickupMins)}</>}
          </div>
          <SpotifyButton />
        </div>
      </div>

      <Sheet className="max-h-[62%]">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Where to?"
            aria-label="Where to?"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-slate-500">
          <MapPin className="h-3 w-3" /> Pickup: {RIDER_HOME.name}, {RIDER_HOME.address}
        </div>

        <div className="mt-3 text-xs font-medium uppercase tracking-wider text-slate-500">Suggested · one tap to ride</div>
        <ul className="-mx-1 mt-1 max-h-[calc(62vh-180px)] space-y-1 overflow-y-auto px-1 pb-1 md:max-h-[300px]">
          {places.map(({ p, q }, i) => (
            <BlurFade key={p.id} delay={0.05 * i} inView={false} offset={6}>
              <li>
                <button
                  onClick={() => request(p)}
                  aria-label={`Ride to ${p.name} for $${q.fare.toFixed(2)}`}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-white/[0.05] active:scale-[0.99]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-xl">{p.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-white">{p.name}</span>
                    <span className="block truncate text-xs text-slate-400">
                      {p.subtitle} · {q.miles} mi · {minutes(q.minutes)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[15px] font-semibold tabular-nums text-white">
                      ${q.fare.toFixed(2)}
                    </span>
                    <span className="block text-[11px] text-sky-300">Ride now</span>
                  </span>
                </button>
              </li>
            </BlurFade>
          ))}
          {places.length === 0 && <li className="px-2 py-6 text-center text-sm text-slate-500">No matching places in the demo. Try “park” or “Ferry”.</li>}
        </ul>
      </Sheet>
    </div>
  );
}
