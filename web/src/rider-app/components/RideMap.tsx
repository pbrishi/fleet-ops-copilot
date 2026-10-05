"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import type { LatLng } from "../geo";

export interface MapCar {
  id: string;
  pos: LatLng;
  color: string;
  highlight?: boolean;
}

// The bottom sheet covers the lower part of the screen, so fit the route into the visible area above it.
function FitTo({ points, bottom }: { points: LatLng[]; bottom: number }) {
  const map = useMap();
  const key = points.length ? `${points[0].join()}|${points.at(-1)!.join()}|${points.length}` : "";
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 16, { animate: true });
    else map.fitBounds(points, { paddingTopLeft: [36, 80], paddingBottomRight: [36, bottom], maxZoom: 17, animate: true });
    // Refit only when the set of points changes meaningfully, not on every car movement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

// Leaflet touches `window`, so this is only loaded client-side (see RideMapPanel).
export default function RideMap({
  rider,
  cars = [],
  route,
  fit,
  bottomPadding = 260,
}: {
  rider?: LatLng;
  cars?: MapCar[];
  route?: LatLng[];
  fit: LatLng[];
  bottomPadding?: number;
}) {
  return (
    <MapContainer center={fit[0] ?? [37.7879, -122.4075]} zoom={15} zoomControl={false} attributionControl={false} style={{ height: "100%", width: "100%", background: "#0b1120" }}>
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={16} />
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}" maxNativeZoom={16} />
      {route && route.length > 1 && (
        <>
          <Polyline positions={route} pathOptions={{ color: "#0ea5e9", weight: 9, opacity: 0.18 }} />
          <Polyline positions={route} pathOptions={{ color: "#38bdf8", weight: 4, opacity: 0.95 }} />
        </>
      )}
      {cars.map((c) => (
        <CircleMarker
          key={c.id}
          center={c.pos}
          radius={c.highlight ? 9 : 5}
          pathOptions={{ color: c.highlight ? "#ffffff" : c.color, weight: c.highlight ? 3 : 1, fillColor: c.color, fillOpacity: 1 }}
        />
      ))}
      {rider && (
        <>
          <CircleMarker center={rider} radius={16} pathOptions={{ color: "#38bdf8", weight: 0, fillColor: "#38bdf8", fillOpacity: 0.15 }} />
          <CircleMarker center={rider} radius={7} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#0ea5e9", fillOpacity: 1 }} />
        </>
      )}
      <FitTo points={fit} bottom={bottomPadding} />
    </MapContainer>
  );
}
