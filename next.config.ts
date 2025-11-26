import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Configure xlsx to be external for server components (moved from experimental in Next.js 16)
  serverExternalPackages: ['xlsx'],
  // Add empty turbopack config to silence the warning since we're using Turbopack by default
  turbopack: {},
};

export default nextConfig;
