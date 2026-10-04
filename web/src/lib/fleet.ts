// Mock robotaxi fleet for the portal. Everything here is synthetic.
// Generation is seeded so the server-rendered HTML and the first client render match.

export type Status =
  | "in_trip"
  | "en_route"
  | "idle"
  | "charging"
  | "remote_assist"
  | "maintenance"
  | "offline";

export type HealthLevel = "ok" | "degraded" | "fault";
export type Subsystem = "lidar" | "cameras" | "radar" | "compute" | "brakes" | "tires" | "battery" | "connectivity";

export interface Fault {
  code: string;
  system: Subsystem;
  severity: "warning" | "critical";
  message: string;
  minutesAgo: number;
}

export interface TelemetryPoint {
  hour: string;
  battery: number;
  computeTemp: number;
}

export interface Vehicle {
  id: string;
  model: string;
  depot: string;
  status: Status;
  lat: number;
  lng: number;
  heading: number; // radians
  speedMph: number;
  battery: number; // percent
  riderOnboard: boolean;
  health: Record<Subsystem, HealthLevel>;
  healthScore: number;
  faults: Fault[];
  assistReason?: string;
  softwareVersion: string;
  odometerMi: number;
  tripsToday: number;
  milesToday: number;
  lastServiceDays: number;
  telemetry: TelemetryPoint[];
}

export interface FleetEvent {
  id: string;
  vehicleId: string;
  kind: "assist" | "fault" | "battery" | "trip" | "service";
  message: string;
  minutesAgo: number;
}

export const SUBSYSTEMS: Subsystem[] = ["lidar", "cameras", "radar", "compute", "brakes", "tires", "battery", "connectivity"];

export const DEPOTS = [
  { name: "Mission Bay Depot", lat: 37.768, lng: -122.392 },
  { name: "SoMa Hub", lat: 37.7765, lng: -122.405 },
  { name: "Bayview Yard", lat: 37.736, lng: -122.388 },
];

// Neighborhood anchors keep simulated vehicles on land.
const ANCHORS: [number, number][] = [
  [37.7849, -122.4094], [37.7599, -122.4148], [37.7955, -122.3995], [37.7609, -122.435],
  [37.781, -122.466], [37.7425, -122.4194], [37.788, -122.433], [37.7716, -122.3935],
  [37.753, -122.49], [37.8005, -122.437], [37.7305, -122.392], [37.775, -122.448],
  [37.7905, -122.4085], [37.7645, -122.4525], [37.7485, -122.4505], [37.7385, -122.4705],
];

export const BOUNDS = { minLat: 37.72, maxLat: 37.805, minLng: -122.5, maxLng: -122.385 };

const FAULT_CATALOG: Omit<Fault, "minutesAgo">[] = [
  { code: "LDR-214", system: "lidar", severity: "warning", message: "Lidar return rate below threshold (front-left)" },
  { code: "LDR-310", system: "lidar", severity: "critical", message: "Lidar unit not responding (roof)" },
  { code: "CAM-108", system: "cameras", severity: "warning", message: "Lens obstruction detected (rear camera)" },
  { code: "RDR-031", system: "radar", severity: "warning", message: "Radar calibration drift (front)" },
  { code: "CMP-402", system: "compute", severity: "warning", message: "Compute module temperature high" },
  { code: "CMP-511", system: "compute", severity: "critical", message: "Compute watchdog reset" },
  { code: "TPM-011", system: "tires", severity: "warning", message: "Low tire pressure (rear-right)" },
  { code: "BRK-220", system: "brakes", severity: "warning", message: "Brake pad wear above 80%" },
  { code: "BAT-305", system: "battery", severity: "warning", message: "Cell voltage imbalance detected" },
  { code: "NET-017", system: "connectivity", severity: "warning", message: "Intermittent cellular link" },
];

const ASSIST_REASONS = [
  "Blocked by double-parked delivery truck",
  "Construction zone, lane closed without detour",
  "Police officer directing traffic at intersection",
  "Unmapped road closure for street event",
];

const STATUS_PLAN: [Status, number][] = [
  ["in_trip", 22], ["en_route", 9], ["idle", 12], ["charging", 9],
  ["remote_assist", 3], ["maintenance", 3], ["offline", 2],
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

function telemetryFor(rand: () => number, battery: number): TelemetryPoint[] {
  // Walk backwards from the current battery level: drain while driving, jump up when charging.
  const points: TelemetryPoint[] = [];
  let level = battery;
  for (let h = 0; h < 24; h++) {
    points.unshift({
      hour: `${String((14 - h + 24) % 24).padStart(2, "0")}:00`,
      battery: round(level),
      computeTemp: round(52 + rand() * 14 + (h > 6 && h < 14 ? 4 : 0)),
    });
    level = level < 30 && rand() < 0.5 ? level : level + (rand() < 0.12 ? -35 : 3 + rand() * 4);
    level = Math.max(8, Math.min(100, level));
  }
  return points;
}

export function generateFleet(seed = 412): { vehicles: Vehicle[]; events: FleetEvent[] } {
  const rand = mulberry32(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const statuses = STATUS_PLAN.flatMap(([s, n]) => Array<Status>(n).fill(s));
  const vehicles: Vehicle[] = statuses.map((status, i) => {
    const depot = DEPOTS[i % DEPOTS.length];
    const atDepot = status === "charging" || status === "maintenance";
    const [aLat, aLng] = atDepot ? [depot.lat, depot.lng] : pick(ANCHORS);
    const spread = atDepot ? 0.0015 : 0.006;
    const moving = status === "in_trip" || status === "en_route";

    const health = Object.fromEntries(SUBSYSTEMS.map((s) => [s, "ok"])) as Record<Subsystem, HealthLevel>;
    const faults: Fault[] = [];
    const faultCount = status === "maintenance" || status === "offline" ? 2 : status === "remote_assist" ? 1 : rand() < 0.15 ? 1 : 0;
    for (let f = 0; f < faultCount; f++) {
      const pool = status === "maintenance" || status === "offline" ? FAULT_CATALOG : FAULT_CATALOG.filter((x) => x.severity === "warning");
      const fault = { ...pick(pool), minutesAgo: Math.floor(rand() * 600) + 5 };
      if (faults.some((x) => x.code === fault.code)) continue;
      faults.push(fault);
      health[fault.system] = fault.severity === "critical" ? "fault" : "degraded";
    }

    const battery =
      status === "charging" ? 15 + rand() * 60 : status === "offline" ? 5 + rand() * 20 : 22 + rand() * 76;
    const healthScore = Math.max(
      12,
      100 - faults.reduce((sum, f) => sum + (f.severity === "critical" ? 35 : 12), 0) - (battery < 20 ? 8 : 0) - Math.floor(rand() * 5),
    );

    return {
      id: `AV-${String(1001 + i * 7).padStart(4, "0")}`,
      model: i % 5 === 0 ? "Van G6" : "Sedan G5",
      depot: depot.name,
      status,
      lat: round(aLat + (rand() - 0.5) * spread * 2, 5),
      lng: round(aLng + (rand() - 0.5) * spread * 2, 5),
      heading: rand() * Math.PI * 2,
      speedMph: moving ? round(8 + rand() * 22) : 0,
      battery: round(battery, 1),
      riderOnboard: status === "in_trip" || (status === "remote_assist" && rand() < 0.67),
      health,
      healthScore,
      faults,
      assistReason: status === "remote_assist" ? ASSIST_REASONS[i % ASSIST_REASONS.length] : undefined,
      softwareVersion: rand() < 0.35 ? "v14.3.0" : "v14.2.1",
      odometerMi: Math.floor(8000 + rand() * 52000),
      tripsToday: status === "offline" ? 0 : Math.floor(rand() * 18),
      milesToday: status === "offline" ? 0 : round(rand() * 140, 1),
      lastServiceDays: Math.floor(rand() * 45),
      telemetry: telemetryFor(rand, battery),
    };
  });

  const events: FleetEvent[] = [];
  vehicles.forEach((v) => {
    if (v.status === "remote_assist") events.push({ id: `e-${v.id}-a`, vehicleId: v.id, kind: "assist", message: `Remote assist requested: ${v.assistReason}`, minutesAgo: Math.floor(rand() * 6) + 1 });
    v.faults.forEach((f) => events.push({ id: `e-${v.id}-${f.code}`, vehicleId: v.id, kind: "fault", message: `${f.code} ${f.message}`, minutesAgo: f.minutesAgo }));
    if (v.battery < 25 && v.status !== "charging") events.push({ id: `e-${v.id}-b`, vehicleId: v.id, kind: "battery", message: `Battery low (${Math.round(v.battery)}%)`, minutesAgo: Math.floor(rand() * 30) + 2 });
    if (v.status === "maintenance") events.push({ id: `e-${v.id}-s`, vehicleId: v.id, kind: "service", message: `Pulled for maintenance at ${v.depot}`, minutesAgo: Math.floor(rand() * 240) + 20 });
  });
  vehicles.filter((v) => v.status === "in_trip").slice(0, 6).forEach((v, i) =>
    events.push({ id: `e-${v.id}-t`, vehicleId: v.id, kind: "trip", message: "Trip started, rider onboard", minutesAgo: 3 + i * 4 }),
  );
  events.sort((a, b) => a.minutesAgo - b.minutesAgo);
  return { vehicles, events };
}

// One simulation step. Called on an interval in the browser only.
export function stepFleet(vehicles: Vehicle[]): Vehicle[] {
  return vehicles.map((v) => {
    if (v.status === "in_trip" || v.status === "en_route") {
      const dist = (v.speedMph / 3600) * 2 * 0.0145; // ~2s of travel, degrees (approx.)
      let lat = v.lat + Math.cos(v.heading) * dist * 6;
      let lng = v.lng + Math.sin(v.heading) * dist * 6;
      let heading = v.heading + (Math.random() - 0.5) * 0.3;
      if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat || lng < BOUNDS.minLng || lng > BOUNDS.maxLng) {
        heading += Math.PI;
        lat = Math.min(BOUNDS.maxLat, Math.max(BOUNDS.minLat, lat));
        lng = Math.min(BOUNDS.maxLng, Math.max(BOUNDS.minLng, lng));
      }
      const speedMph = Math.max(4, Math.min(35, v.speedMph + (Math.random() - 0.5) * 3));
      return { ...v, lat, lng, heading, speedMph: round(speedMph), battery: round(Math.max(3, v.battery - 0.03), 2) };
    }
    if (v.status === "charging") {
      const battery = round(Math.min(100, v.battery + 0.25), 2);
      return battery >= 100 ? { ...v, battery, status: "idle" } : { ...v, battery };
    }
    return v;
  });
}

// A vehicle an operator should look at now. Shared by the sidebar badge and the overview list.
export function needsAttention(v: Vehicle): boolean {
  return (
    v.status === "remote_assist" ||
    v.status === "offline" ||
    v.faults.some((f) => f.severity === "critical") ||
    (v.battery < 20 && v.status !== "charging")
  );
}

export function fleetVehicleIds(): string[] {
  return generateFleet().vehicles.map((v) => v.id);
}
