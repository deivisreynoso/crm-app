import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-lib is bundled; keep Node-only PDF routes on the server runtime
  serverExternalPackages: ["pdf-lib"],
  // Smaller production image; required for Dockerfile runner stage
  output: "standalone",
};

export default nextConfig;
