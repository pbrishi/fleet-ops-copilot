import { distanceM, type LatLng } from "./geo";
import type { VehicleInfo } from "./trip";
import type { Vehicle } from "@/lib/fleet";

const COLORS = ["Pearl white", "Graphite", "Midnight blue"];
const ROOF_LIGHTS = [
  { name: "teal", hex: "#2dd4bf" },
  { name: "violet", hex: "#a78bfa" },
  { name: "amber", hex: "#fbbf24" },
  { name: "pink", hex: "#f472b6" },
];

// Stable look for each simulated vehicle, so the rider can spot "the pearl white car with the teal light".
export function vehicleInfo(v: Pick<Vehicle, "id" | "model">): VehicleInfo {
  const n = Number(v.id.replace(/\D/g, "")) || 0;
  return { id: v.id, model: v.model, color: COLORS[n % COLORS.length], roofLight: ROOF_LIGHTS[n % ROOF_LIGHTS.length] };
}

// Cars a rider could be matched with: available, or heading to a pickup that might free up.
export function nearbyCars(vehicles: Vehicle[], at: LatLng, n = 6) {
  return vehicles
    .filter((v) => v.status === "idle")
    .map((v) => ({ v, d: distanceM(at, [v.lat, v.lng]) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n);
}
