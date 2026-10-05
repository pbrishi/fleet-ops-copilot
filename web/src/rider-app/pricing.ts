// Fictional Copilot Rides fares. Quoted before booking and locked unless the destination changes.
export const FARE = { base: 2.5, perMile: 1.9, perMinute: 0.35, minimum: 7 };

export function quoteFare(miles: number, minutes: number) {
  const raw = FARE.base + FARE.perMile * miles + FARE.perMinute * minutes;
  return Math.round(Math.max(FARE.minimum, raw) * 100) / 100;
}

export function fareBreakdown(miles: number, minutes: number) {
  const distance = FARE.perMile * miles;
  const time = FARE.perMinute * minutes;
  const total = quoteFare(miles, minutes);
  const minimumTopUp = Math.max(0, total - (FARE.base + distance + time));
  return { base: FARE.base, distance, time, minimumTopUp, total };
}

export const usd = (n: number) => `$${n.toFixed(2)}`;
