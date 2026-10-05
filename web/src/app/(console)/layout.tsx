import { Sidebar } from "@/components/Sidebar";
import { DotPattern } from "@/components/ui/dot-pattern";

// Ops console pages: sidebar navigation and the dot-grid backdrop.
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:flex">
      <Sidebar />
      <main className="relative min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <DotPattern
          width={22}
          height={22}
          cr={0.9}
          className="pointer-events-none fixed inset-0 -z-10 text-slate-500/25 [mask-image:radial-gradient(900px_circle_at_60%_0%,white,transparent)]"
        />
        <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.10),transparent_70%)]" />
        {children}
      </main>
    </div>
  );
}
