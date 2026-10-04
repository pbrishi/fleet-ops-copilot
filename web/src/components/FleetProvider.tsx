"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { generateFleet, stepFleet, type FleetEvent, type Vehicle } from "@/lib/fleet";

interface FleetState {
  vehicles: Vehicle[];
  events: FleetEvent[];
  live: boolean;
  setLive: (live: boolean) => void;
  tick: number;
}

const FleetContext = createContext<FleetState | null>(null);
const initial = generateFleet();

// Holds the simulated fleet at the layout level so the simulation keeps running across pages.
export function FleetProvider({ children }: { children: React.ReactNode }) {
  const [vehicles, setVehicles] = useState(initial.vehicles);
  const [live, setLive] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      setVehicles((vs) => stepFleet(vs));
      setTick((t) => t + 1);
    }, 2000);
    return () => clearInterval(id);
  }, [live]);

  return (
    <FleetContext.Provider value={{ vehicles, events: initial.events, live, setLive, tick }}>
      {children}
    </FleetContext.Provider>
  );
}

export function useFleet() {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error("useFleet must be used inside FleetProvider");
  return ctx;
}
