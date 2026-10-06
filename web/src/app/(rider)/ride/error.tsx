"use client";

// Safety net for the rider app: if anything crashes (for example, unreadable saved data),
// offer a reset instead of a dead page.
export default function RideError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const resetApp = () => {
    try {
      localStorage.removeItem("copilot-rides:v1");
    } catch {
      // Storage unavailable: nothing to clear.
    }
    reset();
    window.location.reload();
  };
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-950 px-8 text-center">
      <div className="text-4xl">🚘</div>
      <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
      <p className="max-w-xs text-sm text-slate-400">The app couldn&apos;t restore your last ride. Resetting clears the saved ride on this device; your settings and ratings are kept.</p>
      <button onClick={resetApp} className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white">
        Reset and continue
      </button>
    </div>
  );
}
