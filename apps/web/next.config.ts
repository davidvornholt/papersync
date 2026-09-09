import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: { serverActions: { bodySizeLimit: '16mb' } },
  output: 'standalone',
  reactCompiler: true,
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
