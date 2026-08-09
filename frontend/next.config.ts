import type { NextConfig } from "next";
import withBundleAnalyzer from '@next/bundle-analyzer';

const analyze = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

if (!process.env.BACKEND_URL && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ WARNING: BACKEND_URL environment variable is missing during build!');
}

const nextConfig: NextConfig = {
  transpilePackages: ['recharts', 'lucide-react', 'es-toolkit', 'react-is'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'railway.app' },
      { protocol: 'https', hostname: 'render.com' },
      { protocol: 'https', hostname: '**' } // Allow external images during dev
    ],
  },
  compress: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  },
  async rewrites() {
    const backend = process.env.BACKEND_URL || 'http://localhost:3001';
    return {
      // beforeFiles runs BEFORE filesystem routes — required to bypass NextAuth's [...nextauth] catch-all
      beforeFiles: [
        {
          source: '/api/auth/login',
          destination: `${backend}/api/auth/login`,
        },
      ],
      afterFiles: [
        {
          source: '/api/:path((?!auth).*)',
          destination: `${backend}/api/:path*`,
        },
      ],
      fallback: [],
    };
  },
};

export default analyze(nextConfig);
