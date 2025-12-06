import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
import './globals.css';
import { Providers } from '@/providers/Providers';
import FarcasterWrapper from "@/components/FarcasterWrapper";
import { PvpNotifier } from '@/components/pvp/PvpNotifier';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
            <html lang="en" className={inter.variable}>
              <head>
                <meta name="fc:miniapp:manifest" content="/.well-known/farcaster.json" />
              </head>
              <body className="min-h-screen bg-background font-sans antialiased championship-gradient">
                <ErrorBoundary>
                  <Providers>
                    <div className="stadium-pattern min-h-screen">
                      <FarcasterWrapper>
                        {children}
                        <PvpNotifier />
                        <Toaster richColors position="top-center" closeButton />
                      </FarcasterWrapper>
                    </div>
                  </Providers>
                </ErrorBoundary>
              </body>
            </html>
          );
}

export const metadata: Metadata = {
  title: "Football Caster Auction App",
  description:
    "Football Caster: Join the marketplace, manage your squad, and participate in auctions using FBC tokens. Enjoy themed glass UI with secure wallet integration and weekly updates.",
  other: {
    "fc:miniapp:manifest": "/.well-known/farcaster.json",
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: "https://football-caster-new.vercel.app/icon.png",
      button: {
        title: "Open App",
        action: {
          type: "launch_frame",
          name: "Football Caster",
          url: "https://football-caster-new.vercel.app/",
          splashImageUrl: "https://football-caster-new.vercel.app/splash.png",
          splashBackgroundColor: "#ffffff",
        },
      },
    }),
  },
};
