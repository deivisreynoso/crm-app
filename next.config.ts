import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-lib is bundled; keep Node-only PDF routes on the server runtime
  serverExternalPackages: ["pdf-lib"],
};

export default nextConfig;
