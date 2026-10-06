import { distanceM, makeRoute, type LatLng, type Maneuver, type Route } from "./geo";

// Street routes from the public OSRM demo server, with a gentle fallback when it's unavailable.
// The demo server is for light use only: one request per trip leg, cached per session.
const cache = new Map<string, Route>();

export async function fetchRoute(from: LatLng, to: LatLng): Promise<Route> {
  const key = `${from.join()}>${to.join()}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    const coords: [number, number][] = data.routes?.[0]?.geometry?.coordinates;
    if (!coords?.length) throw new Error("no route");
    const route = makeRoute([from, ...coords.map(([lng, lat]) => [lat, lng] as LatLng), to], maneuversFrom(data.routes[0].legs?.[0]?.steps ?? []));
    cache.set(key, route);
    return route;
  } catch {
    return fallbackRoute(from, to);
  }
}

interface OsrmStep {
  distance: number;
  name: string;
  maneuver: { type: string; modifier?: string };
}

// Turn OSRM steps into short spoken-style instructions placed along the route.
function maneuversFrom(steps: OsrmStep[]): Maneuver[] {
  const out: Maneuver[] = [];
  let at = 0;
  for (const step of steps) {
    const { type, modifier = "straight" } = step.maneuver;
    const street = step.name ? ` onto ${step.name}` : "";
    const direction: Maneuver["direction"] = modifier.includes("left") ? "left" : modifier.includes("right") ? "right" : modifier === "uturn" ? "uturn" : "straight";
    if (!["depart", "arrive"].includes(type) && direction !== "straight") {
      const verb = modifier.startsWith("slight") ? "Bear" : modifier === "uturn" ? "Make a U-turn" : "Turn";
      out.push({ atM: at, instruction: verb === "Make a U-turn" ? `Make a U-turn${street}` : `${verb} ${direction}${street}`, direction });
    }
    at += step.distance;
  }
  return out;
}

// An L-shaped "city block" path, close enough for a demo when routing is offline.
export function fallbackRoute(from: LatLng, to: LatLng): Route {
  const corner: LatLng = [from[0], to[1]];
  const turnAt = distanceM(from, corner);
  const goingNorth = to[0] > from[0];
  const goingEast = to[1] > from[1];
  // Driving east then turning north is a left turn; adjust for the other combinations.
  const direction = goingEast === goingNorth ? "left" : "right";
  return makeRoute([from, corner, to], [{ atM: turnAt, instruction: `Turn ${direction}`, direction }]);
}

// Robotaxis drive conservatively: assume ~16 mph average in the city.
export const CITY_SPEED_MPS = 7.2;
export const etaMinutes = (meters: number) => Math.max(1, Math.round(meters / CITY_SPEED_MPS / 60));
export const straightLineM = distanceM;
