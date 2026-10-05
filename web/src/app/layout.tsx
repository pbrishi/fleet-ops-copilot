import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FleetProvider } from "@/components/FleetProvider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fleet Ops Copilot",
  description: "Autonomous fleet operations console with LLM incident triage, built eval-first.",
};

// Shared shell: fonts, theme and the simulated fleet (used by both the ops console and the rider app).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <FleetProvider>{children}</FleetProvider>
      </body>
    </html>
  );
}
