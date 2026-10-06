"use client";

import { useEffect, useRef, useState } from "react";
import { useProfile } from "./ProfileProvider";
import { useRide } from "./RideProvider";
import { remainingM, unbeltedSeats } from "./trip";

// Pre-recorded in-car announcements (scripts/generate_announcements.py). Captions mirror the audio
// so the messages also work with sound off and for riders who are deaf or hard of hearing.
export const ANNOUNCEMENTS = {
  welcome: "Welcome to Auto-Drive. Please fasten your seatbelt, and tap Start when you're ready to go.",
  seatbelt: "Please put on your seatbelts. We'll start once everyone is buckled.",
  starting: "Thank you. The doors are closing. Here we go.",
  arriving: "We're arriving at your destination. Please exit on the right, on the curb side.",
  traffic_left: "Watch out. Traffic is approaching on your left. Please exit on the right.",
  traffic_clear: "The traffic has passed. It's safe to exit.",
  pulling_over: "Pulling over safely. Support has been notified.",
  stopped: "We've stopped safely. You can continue, or end your trip here.",
} as const;
export type AnnouncementId = keyof typeof ANNOUNCEMENTS;

const ARRIVING_WITHIN_M = 350;
const SEATBELT_NAG_AFTER_MS = 4000;
const SEATBELT_REPEAT_MS = 15000;

let audio: HTMLAudioElement | null = null;

function play(id: AnnouncementId) {
  try {
    audio ??= new Audio();
    audio.pause();
    audio.src = `/voice/${id}.m4a`;
    void audio.play().catch(() => {
      // Autoplay can be blocked before the first tap; the caption still shows.
    });
  } catch {
    // No audio support: captions only.
  }
}

// Watches the trip and announces key moments. Returns the caption currently on screen.
export function useAnnouncements() {
  const { state } = useRide();
  const { profile } = useProfile();
  const [caption, setCaption] = useState<string | null>(null);
  const said = useRef(new Set<string>());
  const lastNag = useRef(0);
  const enabled = profile.announcements;

  const announce = (id: AnnouncementId, onceKey: string = id) => {
    if (said.current.has(onceKey)) return;
    said.current.add(onceKey);
    if (enabled) play(id);
    setCaption(ANNOUNCEMENTS[id]);
  };

  const t = state.trip;
  const tripKey = t ? `${t.requestedAt}` : "none";
  const phase = state.phase;
  const unbelted = unbeltedSeats(t).length;
  const nearDestination = phase === "in_trip" && remainingM(state) < ARRIVING_WITHIN_M;
  const trafficLeft = !!t?.leftDoorsLocked;

  // New trip: forget what was said on the last one.
  useEffect(() => {
    said.current.clear();
  }, [tripKey]);

  useEffect(() => {
    if (phase === "boarding") announce("welcome");
    if (phase === "in_trip" && said.current.has("welcome")) announce("starting");
    if (phase === "pulling_over") announce("pulling_over");
    if (phase === "stopped_safe" && !trafficLeft) announce("stopped");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (nearDestination) announce("arriving");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearDestination]);

  // Traffic on the left at drop-off: warn, then confirm once it has passed.
  useEffect(() => {
    if (!["arrived_destination", "stopped_safe"].includes(phase)) return;
    if (trafficLeft) announce("traffic_left");
    else if (said.current.has("traffic_left")) announce("traffic_clear");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trafficLeft, phase]);

  // Seat sensors see someone unbuckled: remind them, repeating every 15 seconds.
  useEffect(() => {
    if (phase !== "boarding" || unbelted === 0) return;
    const id = setTimeout(() => {
      if (Date.now() - lastNag.current < SEATBELT_REPEAT_MS) return;
      lastNag.current = Date.now();
      said.current.delete("seatbelt");
      announce("seatbelt");
    }, SEATBELT_NAG_AFTER_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, unbelted]);

  // Captions fade after the message would have finished.
  useEffect(() => {
    if (!caption) return;
    const id = setTimeout(() => setCaption(null), 7000);
    return () => clearTimeout(id);
  }, [caption]);

  // Muting stops the current message.
  useEffect(() => {
    if (!enabled) audio?.pause();
  }, [enabled]);

  return caption;
}
