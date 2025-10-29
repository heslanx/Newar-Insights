/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/admin/:path*',
        destination: process.env.ADMIN_API_URL + '/:path*',
      },
      {
        source: '/api/gateway/:path*',
        destination: process.env.API_GATEWAY_URL + '/:path*',
      },
    ];
  },
}

module.exports = nextConfig
