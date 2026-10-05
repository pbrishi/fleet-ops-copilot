"use client";

import { useSyncExternalStore } from "react";
import { Iphone } from "@/components/ui/iphone";

const query = "(min-width: 768px)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

// Desktop: the app runs inside Magic UI's iPhone frame. Phone: full screen, like an installed app.
export function PhoneShell({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  const desktop = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => true);

  if (!desktop) return <div className="relative h-dvh w-full overflow-hidden">{children}</div>;

  return (
    <div className="flex min-h-dvh items-center justify-center gap-16 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.12),transparent_60%)] px-8 py-10">
      <div className="w-[400px] shrink-0">
        <Iphone>
          <div className="relative h-full w-full overflow-hidden bg-slate-950 [--status-bar:48px]">{children}</div>
        </Iphone>
      </div>
      {aside && <div className="hidden max-w-sm lg:block">{aside}</div>}
    </div>
  );
}
