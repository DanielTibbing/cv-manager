import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No floating dev-tools badge: /print must render nothing but the resume
  // (the parity harness screenshots it and diffs against the exported PDF).
  devIndicators: false,
  // Traced minimal server for the Electron bundle (.next/standalone).
  // No effect on `next dev`.
  output: "standalone",
};

export default nextConfig;
