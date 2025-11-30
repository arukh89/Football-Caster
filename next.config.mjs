/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.warpcast.com https://auth.farcaster.xyz https://*.farcaster.xyz https://www.clanker.world https://api.dexscreener.com https://mainnet.base.org https://*.base.org https://*.alchemy.com https://*.ankr.com https://*.vercel.app wss://maincloud.spacetimedb.com wss://*.spacetimedb.com",
              "frame-ancestors *",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
