import { describe, expect, it } from "vitest";
import { makeRoute, type LatLng } from "./geo";
import { SUGGESTED_PLACES } from "./places";
import { CANCEL_FEE, FREE_CANCEL_SECONDS, RIDER_SEAT, blockedReason, initialState, reducer, type Action, type State } from "./trip";

const pickup = { name: "Union Square", pos: [37.7879, -122.4075] as LatLng };
const dest = SUGGESTED_PLACES[0];
const pickupRoute = makeRoute([[37.784, -122.41], pickup.pos]);
const tripRoute = makeRoute([pickup.pos, [37.79, -122.40], dest.pos]);
const vehicle = { id: "AV-1029", model: "Sedan G5", color: "Pearl white", roofLight: { name: "teal", hex: "#2dd4bf" } };

const run = (actions: Action[], from: State = initialState) => actions.reduce(reducer, from);
const tickUntil = (s: State, phase: State["phase"], max = 2000) => {
  for (let i = 0; i < max && s.phase !== phase; i++) s = reducer(s, { type: "TICK", dt: 1 });
  return s;
};

const home = run([{ type: "SIGN_IN", name: "Rishi" }]);
const requested = run([{ type: "REQUEST", destination: dest, pickup, quote: { fare: 14.2, miles: 2, minutes: 9 } }], home);
const enRoute = run([{ type: "MATCHED", vehicle, start: pickupRoute.points[0], pickupRoute, tripRoute }], requested);
const atPickup = tickUntil(enRoute, "arrived_pickup");
const boarding = run([{ type: "RIDER_AT_CAR" }, { type: "UNLOCK" }, { type: "BOARD" }], atPickup);
const inTrip = run([{ type: "BELT", seat: RIDER_SEAT }, { type: "START" }], boarding);

describe("happy path", () => {
  it("goes from request to payment to home", () => {
    expect(atPickup.phase).toBe("arrived_pickup");
    expect(inTrip.phase).toBe("in_trip");
    const arrived = tickUntil(inTrip, "arrived_destination");
    expect(arrived.trip?.parked).toBe(true);
    expect(arrived.trip?.doors).toBe("unlocked");
    const paid = run([{ type: "END_TRIP" }, { type: "PAID" }, { type: "DONE" }], arrived);
    expect(paid.phase).toBe("home");
    expect(paid.trip).toBeUndefined();
  });

  it("charges the quoted fare for a completed trip", () => {
    const payment = run([{ type: "END_TRIP" }], tickUntil(inTrip, "arrived_destination"));
    expect(payment.trip?.finalFare).toBe(14.2);
  });
});

describe("safety rule 1: doors never unlock while moving", () => {
  it("blocks unlock while the car is on its way", () => {
    expect(blockedReason(enRoute, { type: "UNLOCK" })).toMatch(/stopped/);
  });
  it("blocks unlock during the trip", () => {
    const s = reducer(inTrip, { type: "UNLOCK" });
    expect(s.trip?.doors).toBe("locked");
    expect(s.notice).toBeTruthy();
  });
  it("blocks unlock while pulling over, allows it once stopped", () => {
    const pulling = reducer(reducer(inTrip, { type: "TICK", dt: 5 }), { type: "EMERGENCY_STOP" });
    expect(blockedReason(pulling, { type: "UNLOCK" })).not.toBeNull();
    const stopped = tickUntil(pulling, "stopped_safe");
    expect(blockedReason(stopped, { type: "UNLOCK" })).toBeNull();
  });
});

describe("safety rule 2: pickup unlock needs the rider at the car", () => {
  it("blocks unlock until the rider is at the car", () => {
    expect(blockedReason(atPickup, { type: "UNLOCK" })).toMatch(/Walk up/);
    expect(blockedReason(reducer(atPickup, { type: "RIDER_AT_CAR" }), { type: "UNLOCK" })).toBeNull();
  });
  it("blocks boarding before unlocking", () => {
    expect(blockedReason(reducer(atPickup, { type: "RIDER_AT_CAR" }), { type: "BOARD" })).toMatch(/Unlock/);
  });
});

describe("safety rule 3: start needs rider inside and belted, and locks doors", () => {
  it("blocks start without a seatbelt", () => {
    expect(blockedReason(boarding, { type: "START" })).toMatch(/seatbelt/);
  });
  it("seat sensors detect the rider when they get in", () => {
    expect(boarding.trip?.seats[RIDER_SEAT]).toEqual({ occupied: true, belted: false });
  });
  it("blocks start until every detected passenger is belted", () => {
    const withGuest = run([{ type: "SEAT_OCCUPIED", seat: "rear_left" }, { type: "BELT", seat: RIDER_SEAT }], boarding);
    expect(blockedReason(withGuest, { type: "START" })).toMatch(/Everyone/);
    expect(blockedReason(reducer(withGuest, { type: "BELT", seat: "rear_left" }), { type: "START" })).toBeNull();
  });
  it("lets a passenger leave before starting, which clears their seat", () => {
    const left = run([{ type: "SEAT_OCCUPIED", seat: "rear_left" }, { type: "SEAT_VACATED", seat: "rear_left" }, { type: "BELT", seat: RIDER_SEAT }], boarding);
    expect(blockedReason(left, { type: "START" })).toBeNull();
  });
  it("doesn't allow seat changes once the car is moving", () => {
    expect(blockedReason(inTrip, { type: "SEAT_OCCUPIED", seat: "front_right" })).not.toBeNull();
  });
  it("can't buckle an empty seat", () => {
    expect(blockedReason(boarding, { type: "BELT", seat: "front_right" })).toMatch(/No one/);
  });
  it("closes and locks the doors on start", () => {
    expect(inTrip.trip?.doors).toBe("locked");
  });
  it("blocks start before getting in", () => {
    expect(blockedReason(atPickup, { type: "START" })).toMatch(/Get in/);
  });
});

describe("safety rule 4: emergency stop decelerates to a safe stop", () => {
  it("slows down over several seconds instead of stopping instantly", () => {
    const pulling = reducer(reducer(inTrip, { type: "TICK", dt: 5 }), { type: "EMERGENCY_STOP" });
    const oneSecond = reducer(pulling, { type: "TICK", dt: 1 });
    expect(oneSecond.phase).toBe("pulling_over");
    expect(oneSecond.trip!.speedMps).toBeGreaterThan(0);
    const stopped = tickUntil(pulling, "stopped_safe");
    expect(stopped.trip?.speedMps).toBe(0);
    expect(stopped.trip?.parked).toBe(true);
  });
  it("is only available while driving", () => {
    expect(blockedReason(atPickup, { type: "EMERGENCY_STOP" })).not.toBeNull();
  });
  it("can resume after a stop, relocking the doors", () => {
    const stopped = tickUntil(reducer(inTrip, { type: "EMERGENCY_STOP" }), "stopped_safe");
    const resumed = reducer(stopped, { type: "RESUME" });
    expect(resumed.phase).toBe("in_trip");
    expect(resumed.trip?.doors).toBe("locked");
  });
});

describe("rule 5: ending early charges only for distance travelled", () => {
  it("prorates the fare and never exceeds the quote", () => {
    let s = reducer(inTrip, { type: "TICK", dt: 20 });
    s = tickUntil(reducer(s, { type: "EMERGENCY_STOP" }), "stopped_safe");
    s = reducer(s, { type: "END_TRIP" });
    expect(s.phase).toBe("payment");
    expect(s.trip?.endedEarly).toBe(true);
    expect(s.trip!.finalFare!).toBeLessThan(14.2);
    expect(s.trip!.finalFare!).toBeGreaterThanOrEqual(7);
  });
  it("blocks ending the trip while moving", () => {
    expect(blockedReason(inTrip, { type: "END_TRIP" })).not.toBeNull();
  });
});

describe("cancellation", () => {
  it("is free within two minutes", () => {
    expect(reducer(enRoute, { type: "CANCEL" }).notice).toMatch(/No charge/);
  });
  it("charges a fee after two minutes", () => {
    let s = enRoute;
    for (let i = 0; i <= FREE_CANCEL_SECONDS; i++) s = reducer(s, { type: "TICK", dt: 1 });
    expect(["en_route", "arrived_pickup"]).toContain(s.phase);
    expect(reducer(s, { type: "CANCEL" }).notice).toContain(`$${CANCEL_FEE}`);
  });
  it("is not possible mid-trip", () => {
    expect(blockedReason(inTrip, { type: "CANCEL" })).not.toBeNull();
  });
});

describe("safety rule 6: exit on the curb side; traffic side stays locked", () => {
  const arrived = tickUntil(inTrip, "arrived_destination");
  it("recommends the curb (right) side", () => {
    expect(arrived.trip?.dropOff?.side).toBe("right");
  });
  it("keeps the left doors locked while the cameras see traffic, then unlocks them", () => {
    expect(arrived.trip?.dropOff?.trafficLeft).toBe(true); // deterministic camera reading for this vehicle + destination
    expect(arrived.trip?.leftDoorsLocked).toBe(true);
    let s = arrived;
    for (let i = 0; i < 10; i++) s = reducer(s, { type: "TICK", dt: 10 });
    expect(s.trip?.leftDoorsLocked).toBe(false);
  });
  it("applies the same rule after an emergency stop", () => {
    const stopped = tickUntil(reducer(inTrip, { type: "EMERGENCY_STOP" }), "stopped_safe");
    expect(stopped.trip?.dropOff?.side).toBe("right");
    expect(stopped.trip?.leftDoorsLocked).toBe(stopped.trip?.dropOff?.trafficLeft);
  });
});
