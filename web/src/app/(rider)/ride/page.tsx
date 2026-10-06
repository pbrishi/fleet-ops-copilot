"use client";

import Link from "next/link";
import { useState } from "react";
import { ChatSheet } from "@/rider-app/components/ChatSheet";
import { Complete, Payment } from "@/rider-app/components/Checkout";
import { EmergencySheet } from "@/rider-app/components/EmergencySheet";
import { Home } from "@/rider-app/components/Home";
import { StatusBar, Toast } from "@/rider-app/components/kit";
import { PhoneShell } from "@/rider-app/components/PhoneShell";
import { SignIn } from "@/rider-app/components/SignIn";
import { ArrivedDestination, ArrivedPickup, Boarding, EnRoute, InTrip, Matching, StoppedSafe } from "@/rider-app/components/TripScreens";
import { useAnnouncements } from "@/rider-app/announcer";
import { useCabin } from "@/rider-app/components/Cabin";
import { ProfileProvider } from "@/rider-app/ProfileProvider";
import { RideProvider, useRide } from "@/rider-app/RideProvider";
import { Volume2 } from "lucide-react";

export default function RidePage() {
  return (
    <RideProvider>
      <ProfileProvider>
        <PhoneShell aside={<About />}>
          <RiderApp />
        </PhoneShell>
      </ProfileProvider>
    </RideProvider>
  );
}

function RiderApp() {
  const { state, ready } = useRide();
  const caption = useAnnouncements();
  useCabin();
  const [chat, setChat] = useState<{ opener?: string } | null>(null);
  const [emergency, setEmergency] = useState(false);
  const openChat = () => setChat({});

  if (!ready) return <div className="flex h-full items-center justify-center text-3xl">🚘</div>;

  const screens: Record<string, React.ReactNode> = {
    signed_out: <SignIn />,
    home: <Home />,
    matching: <Matching />,
    en_route: <EnRoute onChat={openChat} />,
    arrived_pickup: <ArrivedPickup onChat={openChat} />,
    boarding: <Boarding />,
    in_trip: <InTrip onChat={openChat} onEmergency={() => setEmergency(true)} />,
    pulling_over: <InTrip onChat={openChat} onEmergency={() => setEmergency(true)} />,
    stopped_safe: <StoppedSafe onChat={openChat} />,
    arrived_destination: <ArrivedDestination />,
    payment: <Payment />,
    complete: <Complete />,
  };

  return (
    <div className="relative h-full w-full">
      <StatusBar />
      {screens[state.phase]}
      <Toast text={state.notice} />
      {caption && !state.notice && (
        <div className="pointer-events-none absolute inset-x-4 top-[calc(var(--status-bar,env(safe-area-inset-top))+5.25rem)] z-[690]">
          <div role="status" className="flex items-start gap-2 rounded-2xl border border-sky-400/30 bg-slate-950/90 px-3.5 py-2.5 text-[13px] leading-snug text-sky-50 shadow-xl backdrop-blur">
            <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
            {caption}
          </div>
        </div>
      )}

      {emergency && (
        <EmergencySheet
          onClose={() => setEmergency(false)}
          onSupport={() => setChat({ opener: "I pressed the emergency button and need help." })}
        />
      )}
      {chat && <ChatSheet opener={chat.opener} onClose={() => setChat(null)} />}
    </div>
  );
}

function About() {
  return (
    <div className="space-y-4 text-sm text-slate-400">
      <div className="text-xs uppercase tracking-wider text-sky-300">Copilot Rides · rider app</div>
      <h1 className="text-2xl font-semibold text-white">The customer side of Fleet Ops Copilot</h1>
      <p>Request a car from the same simulated fleet the ops console monitors, watch it arrive, unlock it, ride, and pay. Support chat and voice know your live trip.</p>
      <ul className="space-y-1.5">
        <li>• Safety rules live in one tested state machine: doors never unlock while moving; start needs a fastened seatbelt; emergency stop pulls over gradually.</li>
        <li>• Time runs 10× faster so a demo ride takes about a minute.</li>
        <li>• Remembers you across rides on this device: cabin temperature, Spotify playlist and position, ratings.</li>
        <li>• Spoken announcements (pre-recorded with Gemini TTS) with on-screen captions.</li>
        <li>• Vehicles, payment and car audio are simulated. Nothing you enter leaves your browser except chat messages.</li>
      </ul>
      <p className="text-xs text-slate-500">
        Ops console: <Link href="/" className="text-sky-300 hover:underline">fleet overview</Link>
      </p>
    </div>
  );
}
