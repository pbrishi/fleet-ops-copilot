"use client";

import { Check, Loader2, Megaphone, Minus, Music2, Pause, Play, Plus, SkipBack, SkipForward, Thermometer, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PLAYLISTS, playlistById } from "../music";
import { DEFAULT_TEMP_F, preferredTemp, useProfile } from "../ProfileProvider";
import { useRide } from "../RideProvider";

const MIN_F = 62;
const MAX_F = 80;

// Cabin lifecycle: set climate from past rides when the rider gets in, resume music,
// remember the final temperature when the trip ends, and advance the simulated player.
export function useCabin() {
  const { state } = useRide();
  const { profile, update, loaded } = useProfile();
  const phase = state.phase;
  const inCar = ["boarding", "in_trip", "pulling_over", "stopped_safe", "arrived_destination"].includes(phase);
  const prevPhase = useRef(phase);

  useEffect(() => {
    if (!loaded) return;
    const from = prevPhase.current;
    prevPhase.current = phase;
    if (phase === "boarding" && from !== "boarding") {
      const learned = preferredTemp(profile.climate.history);
      update((p) => ({
        ...p,
        climate: { ...p.climate, current: learned ?? DEFAULT_TEMP_F, source: learned === null ? "default" : "learned" },
        // Car audio connects when you get in; pick up where the last ride left off.
        music: p.music.connected && p.music.playlistId && p.music.autoPlay ? { ...p.music, playing: true } : p.music,
      }));
    }
    if (phase === "payment" && from !== "payment") {
      update((p) => ({
        ...p,
        climate: { ...p.climate, history: p.climate.current ? [...p.climate.history, p.climate.current].slice(-20) : p.climate.history },
        music: { ...p.music, playing: false }, // you've left the car's speakers
      }));
    }
  }, [phase, loaded, profile.climate.history, update]);

  // Simulated playback: advance the track position once a second while playing in the car.
  const playing = profile.music.playing && inCar;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      update((p) => {
        const list = playlistById(p.music.playlistId);
        if (!list) return p;
        const track = list.tracks[p.music.trackIndex % list.tracks.length];
        const next = p.music.positionSec + 1;
        return next >= track.seconds
          ? { ...p, music: { ...p.music, trackIndex: (p.music.trackIndex + 1) % list.tracks.length, positionSec: 0 } }
          : { ...p, music: { ...p.music, positionSec: next } };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing, update]);
}

export function ClimateCard({ compact = false }: { compact?: boolean }) {
  const { profile, update } = useProfile();
  const temp = profile.climate.current ?? preferredTemp(profile.climate.history) ?? DEFAULT_TEMP_F;
  const set = (t: number) => update((p) => ({ ...p, climate: { ...p.climate, current: Math.min(MAX_F, Math.max(MIN_F, t)), source: "manual" } }));
  const note =
    profile.climate.source === "learned"
      ? "Set based on your past rides"
      : profile.climate.source === "manual"
        ? "We'll remember this for next time"
        : "Default. We'll learn your preference";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-rose-500">
        <Thermometer className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-white">
          Climate <span className="font-semibold tabular-nums">{temp}°F</span>
        </div>
        {!compact && <div className="truncate text-[11px] text-slate-400">{note}</div>}
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => set(temp - 1)} aria-label="Cooler" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white active:scale-95">
          <Minus className="h-4 w-4" />
        </button>
        <button onClick={() => set(temp + 1)} aria-label="Warmer" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white active:scale-95">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function SpotifyBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center justify-center rounded-full bg-[#1DB954] text-black ${className}`} aria-hidden>
      <Music2 className="h-1/2 w-1/2" />
    </span>
  );
}

export function MusicCard({ vehicleId, inCar }: { vehicleId?: string; inCar: boolean }) {
  const { profile, update } = useProfile();
  const [connecting, setConnecting] = useState(false);
  const m = profile.music;
  const list = playlistById(m.playlistId);
  const track = list?.tracks[m.trackIndex % list.tracks.length];

  if (!m.connected || !list || !track) {
    return (
      <>
        <button onClick={() => setConnecting(true)} className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left active:scale-[0.99]" aria-label="Connect Spotify">
          <SpotifyBadge className="h-11 w-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white">{m.connected ? "Choose a playlist" : "Connect Spotify"}</div>
            <div className="truncate text-[11px] text-slate-400">{m.connected ? "Connected · pick what to play" : "Play your music through the car's speakers"}</div>
          </div>
          <span className="rounded-full bg-[#1DB954]/15 px-2.5 py-1 text-xs text-[#1ed760]">{m.connected ? "Choose" : "Connect"}</span>
        </button>
        {connecting && <SpotifySheet onClose={() => setConnecting(false)} />}
      </>
    );
  }

  const toggle = () => update((p) => ({ ...p, music: { ...p.music, playing: !p.music.playing } }));
  const skip = (d: number) => update((p) => ({ ...p, music: { ...p.music, trackIndex: (p.music.trackIndex + d + list.tracks.length) % list.tracks.length, positionSec: 0 } }));
  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setConnecting(true)} aria-label="Change playlist" className={`h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br ${list.gradient}`} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-white">{track.title}</div>
            <div className="truncate text-[11px] text-slate-400">
              {track.artist} · {list.name}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => skip(-1)} aria-label="Previous track" className="p-1.5 text-slate-300">
              <SkipBack className="h-4 w-4 fill-current" />
            </button>
            <button onClick={toggle} aria-label={m.playing ? "Pause" : "Play"} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-950">
              {m.playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 translate-x-px fill-current" />}
            </button>
            <button onClick={() => skip(1)} aria-label="Next track" className="p-1.5 text-slate-300">
              <SkipForward className="h-4 w-4 fill-current" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10px] tabular-nums text-slate-500">
          <span>{fmt(m.positionSec)}</span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-[#1DB954] transition-[width] duration-1000" style={{ width: `${(m.positionSec / track.seconds) * 100}%` }} />
          </div>
          <span>{fmt(track.seconds)}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Volume2 className="h-3.5 w-3.5 text-slate-400" />
          <input
            type="range"
            min={0}
            max={100}
            value={m.volume}
            onChange={(e) => update((p) => ({ ...p, music: { ...p.music, volume: Number(e.target.value) } }))}
            aria-label="Volume"
            className="h-1 flex-1 accent-[#1DB954]"
          />
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <SpotifyBadge className="h-3.5 w-3.5" />
            {inCar ? `${vehicleId ?? "Car"} speakers` : "Plays in the car"}
          </span>
        </div>
      </div>
      {connecting && <SpotifySheet onClose={() => setConnecting(false)} />}
    </>
  );
}

// Simulated connection. A production build would open Spotify's own sign-in (OAuth with PKCE)
// in the browser; this demo never asks for or touches a Spotify account.
function SpotifySheet({ onClose }: { onClose: () => void }) {
  const { profile, update } = useProfile();
  const [step, setStep] = useState<"intro" | "connecting" | "pick">(profile.music.connected ? "pick" : "intro");

  const connect = () => {
    setStep("connecting");
    setTimeout(() => {
      update((p) => ({ ...p, music: { ...p.music, connected: true } }));
      setStep("pick");
    }, 1500);
  };
  const choose = (id: string) => {
    update((p) => ({ ...p, music: { ...p.music, playlistId: id, trackIndex: 0, positionSec: 0, playing: true } }));
    onClose();
  };
  const disconnect = () => {
    update((p) => ({ ...p, music: { ...p.music, connected: false, playing: false, playlistId: undefined } }));
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[860] flex items-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full rounded-t-[28px] border-t border-white/10 bg-slate-950 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <SpotifyBadge className="h-7 w-7" />
            <span className="text-lg font-semibold">Spotify</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-slate-400 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "intro" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-300">Connect once and your music plays through the car&apos;s speakers on every ride, picking up where you left off.</p>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>• Your car&apos;s audio connects automatically when you get in</li>
              <li>• Your playlist, track and volume are remembered between rides</li>
            </ul>
            <button onClick={connect} aria-label="Link my Spotify account" className="w-full rounded-full bg-[#1DB954] py-3.5 text-[15px] font-semibold text-black active:scale-[0.98]">
              Connect Spotify
            </button>
            <p className="text-center text-[11px] text-slate-500">Demo: the connection is simulated and no Spotify account is accessed. A production app would open Spotify&apos;s own sign-in.</p>
          </div>
        )}

        {step === "connecting" && (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-slate-300">
            <Loader2 className="h-6 w-6 animate-spin text-[#1ed760]" />
            Connecting your account…
          </div>
        )}

        {step === "pick" && (
          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-xs text-[#1ed760]">
              <Check className="h-3.5 w-3.5" /> Connected
            </div>
            <div className="mt-3 text-xs uppercase tracking-wider text-slate-500">Your playlists</div>
            <ul className="mt-2 space-y-1">
              {PLAYLISTS.map((p) => (
                <li key={p.id}>
                  <button onClick={() => choose(p.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/[0.05]" aria-label={`Play ${p.name}`}>
                    <span className={`h-11 w-11 shrink-0 rounded-lg bg-gradient-to-br ${p.gradient}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-white">{p.name}</span>
                      <span className="block text-[11px] text-slate-400">
                        {p.description} · {p.tracks.length} songs
                      </span>
                    </span>
                    {profile.music.playlistId === p.id && <span className="text-[11px] text-[#1ed760]">Playing</span>}
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={disconnect} className="mt-3 w-full py-2 text-xs text-slate-500 hover:text-slate-300">
              Disconnect Spotify
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Spotify shortcut for the Home screen: connect before the ride, or change the playlist.
export function SpotifyButton() {
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const connected = profile.music.connected;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={connected ? "Spotify connected. Change playlist" : "Connect Spotify"}
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 backdrop-blur"
      >
        <SpotifyBadge className="h-5 w-5" />
        {connected && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" />}
      </button>
      {open && <SpotifySheet onClose={() => setOpen(false)} />}
    </>
  );
}

// Spoken in-car announcements on/off (captions always show).
export function AnnouncementsToggle() {
  const { profile, update } = useProfile();
  const on = profile.announcements;
  return (
    <button
      onClick={() => update((p) => ({ ...p, announcements: !p.announcements }))}
      role="switch"
      aria-checked={on}
      aria-label="Voice announcements"
      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left"
    >
      <Megaphone className="h-4 w-4 text-slate-300" />
      <span className="flex-1 text-sm text-white">Voice announcements</span>
      <span className={`relative h-6 w-10 rounded-full transition ${on ? "bg-sky-500" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
