/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  transpilePackages: ['spacetimedb'],
  async headers() {
    const connectSrc = [
      "connect-src 'self'",
      "https://api.warpcast.com",
      "https://client.warpcast.com",
      "https://*.warpcast.com",
      "https://client.farcaster.xyz",
      "https://auth.farcaster.xyz",
      "https://*.farcaster.xyz",
      "https://football-caster-new.vercel.app",
      "https://www.clanker.world",
      "https://api.dexscreener.com",
      "https://mainnet.base.org",
      "https://*.base.org",
      "https://*.alchemy.com",
      "https://*.ankr.com",
      "https://*.vercel.app",
      "https://base.api.0x.org",
      "https://api.0x.org",
      "https://maincloud.spacetimedb.com",
      "wss://maincloud.spacetimedb.com",
      "wss://*.spacetimedb.com",
    ];
    if (!isProd) {
      connectSrc.push(
        "ws://127.0.0.1:3000",
        "ws://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3000"
      );
    }

    const csp = [
      "default-src 'self'",
      isProd
        ? "script-src 'self'"
        : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      connectSrc.join(' '),
      isProd
        ? "frame-ancestors 'self' https://*.warpcast.com https://*.vercel.app"
        : "frame-ancestors *",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
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