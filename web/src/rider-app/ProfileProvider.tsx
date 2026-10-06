"use client";

import { createContext, useCallback, useContext, useEffect, useReducer } from "react";

// What the app remembers about the rider across rides, on this device only (localStorage).

export interface MusicSettings {
  connected: boolean; // simulated Spotify connection
  playing: boolean;
  playlistId?: string;
  trackIndex: number;
  positionSec: number;
  volume: number; // 0-100
  autoPlay: boolean; // resume automatically when the next ride starts
}

export interface RideRating {
  at: string; // ISO date
  vehicleId?: string;
  overall: number;
  comfort?: number;
  timeToArrive?: number;
  rideQuality?: number;
  comment?: string;
}

export interface Profile {
  music: MusicSettings;
  // Temperature (°F) the rider settled on in past rides (newest last), and this ride's setting.
  climate: { history: number[]; current?: number; source?: "learned" | "default" | "manual" };
  ratings: RideRating[];
  announcements: boolean; // spoken in-car messages
}

const KEY = "copilot-rides:profile:v1";
export const DEFAULT_TEMP_F = 70;
const DEFAULT_PROFILE: Profile = {
  music: { connected: false, playing: false, trackIndex: 0, positionSec: 0, volume: 60, autoPlay: true },
  climate: { history: [] },
  ratings: [],
  announcements: true,
};

// Preferred cabin temperature: the median of the last five rides, so one odd ride doesn't swing it.
export function preferredTemp(history: number[]) {
  const recent = history.slice(-5).sort((a, b) => a - b);
  return recent.length ? recent[Math.floor(recent.length / 2)] : null;
}

type Updater = (p: Profile) => Profile;
const Ctx = createContext<{ profile: Profile; update: (fn: Updater) => void; loaded: boolean } | null>(null);

type ProfileState = { profile: Profile; loaded: boolean };
type ProfileAction = { type: "load"; saved: Partial<Profile> } | { type: "update"; fn: Updater };

function profileReducer(s: ProfileState, a: ProfileAction): ProfileState {
  if (a.type === "load") return { profile: { ...DEFAULT_PROFILE, ...a.saved, music: { ...DEFAULT_PROFILE.music, ...a.saved.music } }, loaded: true };
  return { ...s, profile: a.fn(s.profile) };
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(profileReducer, { profile: DEFAULT_PROFILE, loaded: false });

  // Load after mount, not during render, so server and client HTML match.
  useEffect(() => {
    let saved: Partial<Profile> = {};
    try {
      saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {
      // Unavailable or corrupt storage: start fresh.
    }
    dispatch({ type: "load", saved });
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state.profile));
    } catch {
      // Storage unavailable (private mode): preferences last for this session only.
    }
  }, [state]);

  const update = useCallback((fn: Updater) => dispatch({ type: "update", fn }), []);
  return <Ctx.Provider value={{ profile: state.profile, update, loaded: state.loaded }}>{children}</Ctx.Provider>;
}

export function useProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}
