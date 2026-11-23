import type { NextConfig } from 'next';
import { securityHeaders } from './src/lib/securityHeaders';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders(process.env.NODE_ENV === 'development'),
      },
    ];
  },
};

export default nextConfig;
