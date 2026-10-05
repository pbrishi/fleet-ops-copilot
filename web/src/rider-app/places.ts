import type { LatLng } from "./geo";

// The demo rider is standing in Union Square.
export const RIDER_HOME = { name: "Union Square", address: "333 Post St", pos: [37.7879, -122.4075] as LatLng };

export interface Place {
  id: string;
  name: string;
  subtitle: string;
  pos: LatLng;
  emoji: string;
}

export const SUGGESTED_PLACES: Place[] = [
  { id: "ferry", name: "Ferry Building", subtitle: "Embarcadero · Food hall", pos: [37.7955, -122.3937], emoji: "⛴️" },
  { id: "oracle", name: "Oracle Park", subtitle: "SoMa · Ballpark", pos: [37.7786, -122.3893], emoji: "⚾" },
  { id: "ggpark", name: "Golden Gate Park", subtitle: "Conservatory of Flowers", pos: [37.7714, -122.4602], emoji: "🌳" },
  { id: "mission", name: "Mission Dolores Park", subtitle: "Mission · Park", pos: [37.7596, -122.4269], emoji: "☀️" },
  { id: "palace", name: "Palace of Fine Arts", subtitle: "Marina", pos: [37.8029, -122.4484], emoji: "🏛️" },
  { id: "chase", name: "Chase Center", subtitle: "Mission Bay · Arena", pos: [37.768, -122.3877], emoji: "🏀" },
];
