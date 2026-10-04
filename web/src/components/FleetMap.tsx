"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import { useRouter } from "next/navigation";
import { DEPOTS, type Vehicle } from "@/lib/fleet";
import { STATUS_META } from "@/lib/labels";

// Leaflet touches `window`, so this component is only ever loaded client-side (see MapPanel).
export default function FleetMap({ vehicles, center, zoom = 12, height = 420 }: { vehicles: Vehicle[]; center?: [number, number]; zoom?: number; height?: number }) {
  const router = useRouter();
  return (
    <MapContainer
      center={center ?? [37.765, -122.435]}
      zoom={zoom}
      scrollWheelZoom={false}
      style={{ height, width: "100%", borderRadius: "0.75rem", background: "#0b1120" }}
    >
      <TileLayer
        attribution="Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={16}
      />
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={16} />
      {DEPOTS.map((d) => (
        <CircleMarker key={d.name} center={[d.lat, d.lng]} radius={11} pathOptions={{ color: "#64748b", weight: 1, fillOpacity: 0.08, dashArray: "3 3" }}>
          <Tooltip>{d.name}</Tooltip>
        </CircleMarker>
      ))}
      {vehicles.map((v) => {
        const meta = STATUS_META[v.status];
        const alert = v.status === "remote_assist" || v.status === "offline";
        return (
          <CircleMarker
            key={v.id}
            center={[v.lat, v.lng]}
            radius={alert ? 7 : 5}
            pathOptions={{ color: alert ? "#fff" : meta.hex, weight: alert ? 2 : 1, fillColor: meta.hex, fillOpacity: 0.9 }}
            eventHandlers={{ click: () => router.push(`/vehicles/${v.id}`) }}
          >
            <Tooltip>
              <strong>{v.id}</strong> · {meta.label} · {Math.round(v.battery)}%
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
