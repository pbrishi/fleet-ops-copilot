import path from "node:path";
import type { NextConfig } from "next";

// Pages are prerendered; the only server code is the rider chat API route (holds the Gemini key).
const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
