import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  output: 'standalone',
  reactCompiler: true,
  // PaperSync has one user, so the app opens straight on the daily task.
  redirects: () =>
    Promise.resolve([{ source: '/', destination: '/scan', permanent: false }]),
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
