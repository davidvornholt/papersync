import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Mark @react-pdf/renderer as external to avoid SSR issues
  serverExternalPackages: ['@react-pdf/renderer'],

  // Turbopack configuration (empty since no special config needed)
  turbopack: {},
};

export default nextConfig;
