// Small geometry helpers for routes on a map. Coordinates are [lat, lng].
export type LatLng = [number, number];

const EARTH_M = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;

export function distanceM(a: LatLng, b: LatLng) {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(h));
}

export interface Route {
  points: LatLng[];
  cumulative: number[]; // meters from start to each point
  lengthM: number;
}

export function makeRoute(points: LatLng[]): Route {
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + distanceM(points[i - 1], points[i]));
  return { points, cumulative, lengthM: cumulative.at(-1) ?? 0 };
}

// Position along a route after travelling `m` meters, clamped to the route.
export function pointAt(route: Route, m: number): LatLng {
  if (m <= 0) return route.points[0];
  if (m >= route.lengthM) return route.points.at(-1)!;
  let i = 1;
  while (route.cumulative[i] < m) i++;
  const seg = route.cumulative[i] - route.cumulative[i - 1] || 1;
  const t = (m - route.cumulative[i - 1]) / seg;
  const [a, b] = [route.points[i - 1], route.points[i]];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export const metersToMiles = (m: number) => m / 1609.34;
