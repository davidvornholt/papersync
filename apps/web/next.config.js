/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,

  // Mark @react-pdf/renderer as external to avoid SSR issues
  serverExternalPackages: ['@react-pdf/renderer'],

  // Turbopack configuration (empty since no special config needed)
  turbopack: {},
};

module.exports = nextConfig;
