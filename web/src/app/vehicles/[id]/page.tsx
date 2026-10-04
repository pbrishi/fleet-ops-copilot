import { fleetVehicleIds } from "@/lib/fleet";
import VehicleDetail from "./VehicleDetail";

// Static export: pre-render one page per simulated vehicle.
export const dynamicParams = false;

export function generateStaticParams() {
  return fleetVehicleIds().map((id) => ({ id }));
}

export default async function VehiclePage({ params }: PageProps<"/vehicles/[id]">) {
  const { id } = await params;
  return <VehicleDetail id={id} />;
}
