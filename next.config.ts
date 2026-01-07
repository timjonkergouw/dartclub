import type { NextConfig } from "next";

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
};

export default nextConfig;
