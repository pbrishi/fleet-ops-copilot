import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Copilot Rides",
  description: "Rider app for Copilot Rides, a fictional robotaxi service. Demo with simulated vehicles.",
  appleWebApp: { capable: true, title: "Copilot Rides", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-slate-950">{children}</div>;
}
