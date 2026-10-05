"use client";

import dynamic from "next/dynamic";

const RideMap = dynamic(() => import("./RideMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-900" />,
});

export default RideMap;
