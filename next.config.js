/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  // Skip trailing slash redirect (moved out of experimental in Next.js 14)
  skipTrailingSlashRedirect: true,

  // Configure build ID
  async generateBuildId() {
    // Use a simple build ID to avoid issues
    return 'build-' + Date.now();
  },

  // Environment variables available at build time
  env: {
    SKIP_BUILD_STATIC_GENERATION: process.env.NODE_ENV === 'production' ? 'true' : 'false',
  },
};

module.exports = nextConfig;
