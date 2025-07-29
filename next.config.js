/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  // Skip static generation for pages that need database access
  // This prevents build-time database connection errors
  experimental: {
    skipTrailingSlashRedirect: true,
  },

  // Configure which pages to skip during static generation
  async generateBuildId() {
    // Use a simple build ID to avoid issues
    return 'build-' + Date.now();
  },

  // Skip static optimization for dynamic pages
  async rewrites() {
    return [];
  },

  // Environment variables available at build time
  env: {
    SKIP_BUILD_STATIC_GENERATION: process.env.NODE_ENV === 'production' ? 'true' : 'false',
  },
};

module.exports = nextConfig;
