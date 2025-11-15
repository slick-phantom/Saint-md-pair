// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Render specific configuration
  output: 'standalone',
  // Environment variables for Render
  env: {
    PORT: process.env.PORT || '3000',
  },
  // Enable strict mode for better error handling
  reactStrictMode: true,
  // Optimize for production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Enable SWC minification
  swcMinify: true,
}

export default nextConfig