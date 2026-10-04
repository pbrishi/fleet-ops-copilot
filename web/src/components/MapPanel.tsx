"use client";

import dynamic from "next/dynamic";

const FleetMap = dynamic(() => import("./FleetMap"), {
  ssr: false,
  loading: () => <div className="flex h-full min-h-48 items-center justify-center text-sm text-slate-500">Loading map…</div>,
});

export default FleetMap;
