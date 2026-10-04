import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FleetProvider } from "@/components/FleetProvider";
import { Sidebar } from "@/components/Sidebar";
import { DotPattern } from "@/components/ui/dot-pattern";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fleet Ops Copilot",
  description: "Autonomous fleet operations console with LLM incident triage, built eval-first.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <FleetProvider>
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
        </FleetProvider>
      </body>
    </html>
  );
}
