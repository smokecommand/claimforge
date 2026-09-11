import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Needed for pdf-parse which uses fs module
  serverExternalPackages: ['pdf-parse'],
  experimental: {},
}

export default nextConfig;
