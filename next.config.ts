import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
  // Suppress ENOENT errors for temporary build files during development
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Reduce file system operations during development
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
  // Turbopack configuration to prevent ENOENT errors (moved from experimental.turbo)
  turbopack: {
    resolveAlias: {},
  },
  // Allow images from Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest.json$/],
});

export default pwaConfig(nextConfig);
