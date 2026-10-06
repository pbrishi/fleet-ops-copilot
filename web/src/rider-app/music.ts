// Simulated music catalog for the in-car player. Fictional playlists and tracks; no audio is streamed.
export interface Track {
  title: string;
  artist: string;
  seconds: number;
}
export interface Playlist {
  id: string;
  name: string;
  description: string;
  gradient: string;
  tracks: Track[];
}

export const PLAYLISTS: Playlist[] = [
  {
    id: "chill-drive",
    name: "Chill Drive",
    description: "Mellow beats for the city",
    gradient: "from-sky-500 to-indigo-600",
    tracks: [
      { title: "Fog Over Twin Peaks", artist: "Lowtide", seconds: 214 },
      { title: "Embarcadero Evenings", artist: "Mira Sol", seconds: 187 },
      { title: "Slow Signals", artist: "Parallel Park", seconds: 236 },
      { title: "Night Shift", artist: "Lowtide", seconds: 198 },
    ],
  },
  {
    id: "morning-focus",
    name: "Morning Focus",
    description: "Instrumental, no lyrics",
    gradient: "from-emerald-400 to-teal-600",
    tracks: [
      { title: "First Light", artist: "Quiet Engines", seconds: 241 },
      { title: "Inbox Zero", artist: "Tidal Desk", seconds: 205 },
      { title: "Long Commute", artist: "Quiet Engines", seconds: 263 },
    ],
  },
  {
    id: "city-lights",
    name: "City Lights",
    description: "Upbeat electronic",
    gradient: "from-fuchsia-500 to-rose-500",
    tracks: [
      { title: "Green Wave", artist: "Neon Lane", seconds: 176 },
      { title: "Overpass", artist: "Kilowatt", seconds: 201 },
      { title: "Market Street", artist: "Neon Lane", seconds: 189 },
      { title: "Roof Light", artist: "Kilowatt", seconds: 222 },
    ],
  },
];

export const playlistById = (id?: string) => PLAYLISTS.find((p) => p.id === id);
