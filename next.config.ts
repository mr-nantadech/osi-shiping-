import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Force Turbopack to use this project root to avoid picking up other lockfiles in parent dirs.
  turbopack: {
    root: __dirname,
  },
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://osi-shipping-api-qas.osilab.co.th/api/:path*',
      },
      {
        source: '/Permission/:path*',
        destination: 'https://authapi-qas.osilab.co.th/Permission/:path*',
      },
    ];
  },
};

export default nextConfig;
