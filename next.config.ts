import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output produces a minimal self-contained .next/standalone
  // folder optimised for Docker deployments.
  output: "standalone",
};

export default nextConfig;
