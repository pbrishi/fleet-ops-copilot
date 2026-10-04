import path from "node:path";
import type { NextConfig } from "next";

// Static export: the portal is plain HTML/JS with no server, so it can be hosted for free.
const nextConfig: NextConfig = {
  output: "export",
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
