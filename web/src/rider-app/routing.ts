import { distanceM, makeRoute, type LatLng, type Route } from "./geo";

// Street routes from the public OSRM demo server, with a gentle fallback when it's unavailable.
// The demo server is for light use only: one request per trip leg, cached per session.
const cache = new Map<string, Route>();

export async function fetchRoute(from: LatLng, to: LatLng): Promise<Route> {
  const key = `${from.join()}>${to.join()}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    const coords: [number, number][] = data.routes?.[0]?.geometry?.coordinates;
    if (!coords?.length) throw new Error("no route");
    const route = makeRoute([from, ...coords.map(([lng, lat]) => [lat, lng] as LatLng), to]);
    cache.set(key, route);
    return route;
  } catch {
    return fallbackRoute(from, to);
  }
}

// An L-shaped "city block" path, close enough for a demo when routing is offline.
export function fallbackRoute(from: LatLng, to: LatLng): Route {
  return makeRoute([from, [from[0], to[1]], to]);
}

// Robotaxis drive conservatively: assume ~16 mph average in the city.
export const CITY_SPEED_MPS = 7.2;
export const etaMinutes = (meters: number) => Math.max(1, Math.round(meters / CITY_SPEED_MPS / 60));
export const straightLineM = distanceM;
