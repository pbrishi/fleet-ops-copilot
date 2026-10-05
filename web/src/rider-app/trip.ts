// Trip state machine for the Copilot Rides rider app.
//
// Every rider action goes through `blockedReason` first, so the safety rules live in one
// place and are unit-tested (trip.test.ts) instead of being scattered across buttons:
//   1. Doors unlock only when the car is stopped and parked, never while moving.
//   2. At pickup, doors also need the rider to be at the car.
//   3. Starting needs the rider inside and belted; starting closes and locks the doors.
//   4. Emergency stop pulls over to the next safe spot (decelerates), never stops in-lane instantly.
//   5. Ending early charges only for the distance actually travelled.

import { pointAt, metersToMiles, type LatLng, type Route } from "./geo";
import type { Place } from "./places";
import { quoteFare } from "./pricing";

export type Phase =
  | "signed_out"
  | "home"
  | "matching"
  | "en_route"
  | "arrived_pickup"
  | "boarding"
  | "in_trip"
  | "pulling_over"
  | "stopped_safe"
  | "arrived_destination"
  | "payment"
  | "complete";

export interface VehicleInfo {
  id: string;
  model: string;
  color: string;
  roofLight: { name: string; hex: string };
}

export interface Trip {
  pickup: { name: string; pos: LatLng };
  destination: Place;
  quote: { fare: number; miles: number; minutes: number };
  vehicle?: VehicleInfo;
  pickupRoute?: Route;
  tripRoute?: Route;
  carPos?: LatLng;
  travelledM: number; // along the current leg
  speedMps: number;
  parked: boolean;
  doors: "locked" | "unlocked" | "open";
  riderAtCar: boolean;
  riderInside: boolean;
  belted: boolean;
  requestedAt: number;
  tripStartedAt?: number;
  tripEndedAt?: number;
  tripDistanceM: number;
  endedEarly?: boolean;
  finalFare?: number;
  cancelFee?: number;
}

export interface State {
  phase: Phase;
  riderName?: string;
  trip?: Trip;
  simTime: number; // simulated seconds since app start
  notice?: string; // last blocked-action explanation, shown as a toast
  hydrated?: boolean; // saved state has been restored on the client
}

export type Action =
  | { type: "SIGN_IN"; name: string }
  | { type: "SIGN_OUT" }
  | { type: "REQUEST"; destination: Place; pickup: { name: string; pos: LatLng }; quote: Trip["quote"] }
  | { type: "MATCHED"; vehicle: VehicleInfo; start: LatLng; pickupRoute: Route; tripRoute: Route }
  | { type: "CANCEL" }
  | { type: "TICK"; dt: number }
  | { type: "RIDER_AT_CAR" }
  | { type: "UNLOCK" }
  | { type: "BOARD" }
  | { type: "FASTEN_BELT" }
  | { type: "START" }
  | { type: "EMERGENCY_STOP" }
  | { type: "RESUME" }
  | { type: "END_TRIP" }
  | { type: "PAID" }
  | { type: "DONE" }
  | { type: "DISMISS_NOTICE" }
  | { type: "NOTIFY"; text: string }
  | { type: "RESTORE"; state: State };

export const CRUISE_MPS = 7.2; // ~16 mph average in the city
const PULL_OVER_DECEL = 1.5; // m/s², a gentle stop
export const FREE_CANCEL_SECONDS = 120;
export const CANCEL_FEE = 5;

export const initialState: State = { phase: "signed_out", simTime: 0 };

const isMoving = (t?: Trip) => !!t && (t.speedMps > 0 || !t.parked);

// Why an action isn't allowed right now, or null if it is.
export function blockedReason(state: State, action: Action): string | null {
  const t = state.trip;
  switch (action.type) {
    case "REQUEST":
      return state.phase === "home" ? null : "You already have a trip in progress.";
    case "CANCEL":
      return ["matching", "en_route", "arrived_pickup"].includes(state.phase) ? null : "This trip can't be cancelled now. Use Pull over or End trip.";
    case "UNLOCK":
      if (!t || !["arrived_pickup", "arrived_destination", "stopped_safe"].includes(state.phase)) return "Doors unlock when the car has stopped for you.";
      if (isMoving(t)) return "Doors stay locked while the car is moving.";
      if (state.phase === "arrived_pickup" && !t.riderAtCar) return "Walk up to the car first. Doors unlock when you're next to it.";
      return t.doors === "locked" ? null : "Doors are already unlocked.";
    case "BOARD":
      if (state.phase !== "arrived_pickup") return "There's no car waiting for you yet.";
      return t?.doors === "unlocked" ? null : "Unlock the doors first.";
    case "FASTEN_BELT":
      return state.phase === "boarding" && t?.riderInside ? null : "Get in the car first.";
    case "START":
      if (state.phase !== "boarding" || !t?.riderInside) return "Get in the car first.";
      if (!t.belted) return "Fasten your seatbelt to start the ride.";
      return isMoving(t) ? "The car is already moving." : null;
    case "EMERGENCY_STOP":
      return state.phase === "in_trip" ? null : "Emergency stop is available while the car is driving.";
    case "RESUME":
      if (state.phase !== "stopped_safe") return "The car isn't stopped.";
      if (t?.doors === "open") return "Close the doors before continuing.";
      return t?.belted ? null : "Fasten your seatbelt to continue.";
    case "END_TRIP":
      if (!["arrived_destination", "stopped_safe"].includes(state.phase)) return "You can end the trip once the car has stopped.";
      return isMoving(t) ? "Wait for the car to stop." : null;
    case "PAID":
      return state.phase === "payment" ? null : "Nothing to pay right now.";
    default:
      return null;
  }
}

function advance(trip: Trip, route: Route, metres: number): Trip {
  const travelledM = Math.min(route.lengthM, trip.travelledM + metres);
  return { ...trip, travelledM, carPos: pointAt(route, travelledM) };
}

export function finalFareFor(trip: Trip, endedAt: number) {
  if (!trip.endedEarly) return trip.quote.fare;
  const minutes = ((endedAt - (trip.tripStartedAt ?? endedAt)) / 60);
  // Prorated by actual distance and time, never more than the quote.
  return Math.min(trip.quote.fare, quoteFare(metersToMiles(trip.tripDistanceM), minutes));
}

export function reducer(state: State, action: Action): State {
  const reason = blockedReason(state, action);
  if (reason) return { ...state, notice: reason };
  const t = state.trip;

  switch (action.type) {
    case "RESTORE":
      return { ...action.state, hydrated: true };
    case "SIGN_IN":
      return { ...state, phase: "home", riderName: action.name, notice: undefined };
    case "SIGN_OUT":
      return { ...initialState, simTime: state.simTime, hydrated: state.hydrated };
    case "DISMISS_NOTICE":
      return { ...state, notice: undefined };
    case "NOTIFY":
      return { ...state, notice: action.text };
    case "REQUEST":
      return {
        ...state,
        phase: "matching",
        notice: undefined,
        trip: {
          pickup: action.pickup,
          destination: action.destination,
          quote: action.quote,
          travelledM: 0,
          speedMps: 0,
          parked: true,
          doors: "locked",
          riderAtCar: false,
          riderInside: false,
          belted: false,
          requestedAt: state.simTime,
          tripDistanceM: 0,
        },
      };
    case "MATCHED":
      if (state.phase !== "matching" || !t) return state;
      return {
        ...state,
        phase: "en_route",
        trip: { ...t, vehicle: action.vehicle, pickupRoute: action.pickupRoute, tripRoute: action.tripRoute, carPos: action.start, speedMps: CRUISE_MPS, parked: false },
      };
    case "CANCEL": {
      const fee = state.simTime - (t?.requestedAt ?? 0) <= FREE_CANCEL_SECONDS ? 0 : CANCEL_FEE;
      return { ...state, phase: "home", trip: undefined, notice: fee ? `Trip cancelled. A $${CANCEL_FEE} cancellation fee applies.` : "Trip cancelled. No charge." };
    }
    case "TICK":
      return tick(state, action.dt);
    case "RIDER_AT_CAR":
      return state.phase === "arrived_pickup" && t ? { ...state, trip: { ...t, riderAtCar: true } } : state;
    case "UNLOCK":
      return { ...state, notice: undefined, trip: { ...t!, doors: "unlocked" } };
    case "BOARD":
      return { ...state, phase: "boarding", notice: undefined, trip: { ...t!, doors: "open", riderInside: true } };
    case "FASTEN_BELT":
      return { ...state, notice: undefined, trip: { ...t!, belted: true } };
    case "START":
      // Starting closes and locks the doors, then the car pulls away.
      return {
        ...state,
        phase: "in_trip",
        notice: undefined,
        trip: { ...t!, doors: "locked", parked: false, speedMps: CRUISE_MPS, travelledM: 0, carPos: t!.tripRoute?.points[0] ?? t!.carPos, tripStartedAt: state.simTime },
      };
    case "EMERGENCY_STOP":
      return { ...state, phase: "pulling_over", notice: undefined };
    case "RESUME":
      return { ...state, phase: "in_trip", notice: undefined, trip: { ...t!, doors: "locked", parked: false, speedMps: CRUISE_MPS } };
    case "END_TRIP": {
      const endedEarly = state.phase === "stopped_safe";
      const ended = { ...t!, endedEarly, tripEndedAt: state.simTime, doors: "unlocked" as const };
      return { ...state, phase: "payment", notice: undefined, trip: { ...ended, finalFare: finalFareFor(ended, state.simTime) } };
    }
    case "PAID":
      return { ...state, phase: "complete", notice: undefined };
    case "DONE":
      return { ...state, phase: "home", trip: undefined, notice: undefined };
    default:
      return state;
  }
}

function tick(state: State, dt: number): State {
  const simTime = state.simTime + dt;
  const t = state.trip;
  if (!t) return { ...state, simTime };

  if (state.phase === "en_route" && t.pickupRoute) {
    const next = advance(t, t.pickupRoute, t.speedMps * dt);
    if (next.travelledM >= t.pickupRoute.lengthM) {
      return { ...state, simTime, phase: "arrived_pickup", trip: { ...next, carPos: t.pickup.pos, speedMps: 0, parked: true, travelledM: 0 } };
    }
    return { ...state, simTime, trip: next };
  }

  if (state.phase === "in_trip" && t.tripRoute) {
    const next = advance(t, t.tripRoute, t.speedMps * dt);
    const withDistance = { ...next, tripDistanceM: next.travelledM };
    if (next.travelledM >= t.tripRoute.lengthM) {
      // Parked at the destination: doors unlock for the rider to get out.
      return { ...state, simTime, phase: "arrived_destination", trip: { ...withDistance, speedMps: 0, parked: true, doors: "unlocked" } };
    }
    return { ...state, simTime, trip: withDistance };
  }

  if (state.phase === "pulling_over" && t.tripRoute) {
    const speed = Math.max(0, t.speedMps - PULL_OVER_DECEL * dt);
    const next = advance(t, t.tripRoute, ((t.speedMps + speed) / 2) * dt);
    const withDistance = { ...next, tripDistanceM: next.travelledM, speedMps: speed };
    if (speed === 0) return { ...state, simTime, phase: "stopped_safe", trip: { ...withDistance, parked: true } };
    return { ...state, simTime, trip: withDistance };
  }

  return { ...state, simTime };
}

// Remaining distance on the active leg, for ETA displays.
export function remainingM(state: State) {
  const t = state.trip;
  if (!t) return 0;
  if (state.phase === "en_route") return Math.max(0, (t.pickupRoute?.lengthM ?? 0) - t.travelledM);
  if (["in_trip", "pulling_over"].includes(state.phase)) return Math.max(0, (t.tripRoute?.lengthM ?? 0) - t.travelledM);
  return 0;
}
