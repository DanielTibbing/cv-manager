import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No floating dev-tools badge: /print must render nothing but the resume
  // (the parity harness screenshots it and diffs against the exported PDF).
  devIndicators: false,
  // Traced minimal server for the Electron bundle (.next/standalone).
  // No effect on `next dev`.
  output: "standalone",
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@puppeteer/browsers"],
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./node_modules/puppeteer/**/*",
      "./node_modules/puppeteer-core/**/*",
      "./node_modules/@puppeteer/**/*",
    ],
  },
  outputFileTracingExcludes: {
    "*": [
      "build/**/*",
      "dist/**/*",
      "data/**/*",
      "exports/**/*",
      "parity-out/**/*",
    ],
  },
};

export default nextConfig;
