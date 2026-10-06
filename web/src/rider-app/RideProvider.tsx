"use client";

import { createContext, useContext, useEffect, useReducer, useRef } from "react";
import { useFleet } from "@/components/FleetProvider";
import type { LatLng } from "./geo";
import { fetchRoute } from "./routing";
import { initialState, migrateState, reducer, type Action, type State } from "./trip";
import { nearbyCars, vehicleInfo } from "./vehicles";

// One real second advances the simulation by this many seconds, so a demo ride takes about a minute.
export const TIME_SCALE = 10;
const STORAGE_KEY = "copilot-rides:v1";
const MIN_MATCHING_MS = 2500; // long enough to see the matching animation

const Ctx = createContext<{ state: State; dispatch: (a: Action) => void; ready: boolean } | null>(null);

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? migrateState(JSON.parse(raw)) : initialState;
  } catch {
    return initialState;
  }
}

export function RideProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { vehicles } = useFleet();
  const vehiclesRef = useRef(vehicles);
  useEffect(() => {
    vehiclesRef.current = vehicles;
  }, [vehicles]);

  // Restore after mount (not during render) so server and client HTML match.
  useEffect(() => {
    dispatch({ type: "RESTORE", state: load() });
  }, []);
  const ready = !!state.hydrated;

  // Persist so a refresh doesn't lose the ride.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable (private mode); the app still works for this session.
    }
  }, [state, ready]);

  // Simulation clock.
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: "TICK", dt: TIME_SCALE }), 1000);
    return () => clearInterval(id);
  }, []);

  // Matching: nearest available car, then street routes for both legs.
  const requestedAt = state.trip?.requestedAt;
  useEffect(() => {
    if (state.phase !== "matching" || !state.trip) return;
    let cancelled = false;
    const { pickup, destination } = state.trip;
    (async () => {
      const started = Date.now();
      const nearest = nearbyCars(vehiclesRef.current, pickup.pos, 1)[0]?.v ?? vehiclesRef.current[0];
      const start: LatLng = [nearest.lat, nearest.lng];
      const [pickupRoute, tripRoute] = await Promise.all([fetchRoute(start, pickup.pos), fetchRoute(pickup.pos, destination.pos)]);
      await new Promise((r) => setTimeout(r, Math.max(0, MIN_MATCHING_MS - (Date.now() - started))));
      if (!cancelled) dispatch({ type: "MATCHED", vehicle: vehicleInfo(nearest), start, pickupRoute, tripRoute });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, requestedAt]);

  // Simulated walk to the car at pickup.
  const atCar = state.trip?.riderAtCar;
  useEffect(() => {
    if (state.phase !== "arrived_pickup" || atCar) return;
    const id = setTimeout(() => dispatch({ type: "RIDER_AT_CAR" }), 4000);
    return () => clearTimeout(id);
  }, [state.phase, atCar]);

  // Toasts disappear on their own.
  useEffect(() => {
    if (!state.notice) return;
    const id = setTimeout(() => dispatch({ type: "DISMISS_NOTICE" }), 3500);
    return () => clearTimeout(id);
  }, [state.notice]);

  return <Ctx.Provider value={{ state, dispatch, ready }}>{children}</Ctx.Provider>;
}

export function useRide() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRide must be used inside RideProvider");
  return ctx;
}
