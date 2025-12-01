import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable dev indicators in production (only shows in development)
  devIndicators:false,
  // Configure xlsx to be external for server components (moved from experimental in Next.js 16)
  serverExternalPackages: ['xlsx'],
  // Add empty turbopack config to silence the warning since we're using Turbopack by default
  turbopack: {},
  // Production optimizations
  reactStrictMode: true,
  // Compress responses
  compress: true,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Power by header removal (security best practice)
  poweredByHeader: false,
  // Note: swcMinify is enabled by default in Next.js 16, no need to specify
};

export default nextConfig;
