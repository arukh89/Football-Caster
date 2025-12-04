/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['spacetimedb'],
  // Ensure Next.js does not bundle/transform server-only package
  serverExternalPackages: ['spacetimedb'],
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
              "connect-src 'self' https://api.warpcast.com https://client.warpcast.com https://*.warpcast.com https://client.farcaster.xyz https://auth.farcaster.xyz https://*.farcaster.xyz https://football-caster-new.vercel.app https://www.clanker.world https://api.dexscreener.com https://mainnet.base.org https://*.base.org https://*.alchemy.com https://*.ankr.com https://*.vercel.app https://maincloud.spacetimedb.com wss://maincloud.spacetimedb.com wss://*.spacetimedb.com",
              "frame-ancestors *",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
      {
        source: '/:image(preview|splash|icon).:ext(png|jpg|jpeg|webp|gif)',
        headers: [
          { key: 'Cache-Control', value: 'public, immutable, no-transform, max-age=300' },
        ],
      },
    ];
  },
};

export default nextConfig;
