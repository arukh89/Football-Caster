import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
import './globals.css';
import { Providers } from '@/providers/Providers';
import FarcasterWrapper from "@/components/FarcasterWrapper";
import { StarterExperience } from '@/providers/StarterExperience';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
            <html lang="en" className={inter.variable}>
              <head>
                <meta name="fc:miniapp" content="true" />
                <meta name="fc:miniapp:manifest" content="/.well-known/farcaster.json" />
              </head>
              <body className="min-h-screen bg-background font-sans antialiased championship-gradient">
                <Providers>
                  <StarterExperience>
                    <div className="stadium-pattern min-h-screen">
                      <FarcasterWrapper>
                        {children}
                      </FarcasterWrapper>
                    </div>
                  </StarterExperience>
                </Providers>
              </body>
            </html>
          );
}

export const metadata: Metadata = {
        title: "Football Caster Auction App",
        description: "Football Caster: Join the marketplace, manage your squad, and participate in auctions using FBC tokens. Enjoy themed glass UI with secure wallet integration and weekly updates.",
        other: { "fc:frame": JSON.stringify({
          version: "next",
          imageUrl: "https://football-caster-new.vercel.app/thumbnail.jpg",
          button: {
            title: "Shoot this",
            action: {
              type: "launch_frame",
              name: "Football Caster Auction App",
              url: "https://football-caster-new.vercel.app/",
              splashImageUrl: "https://football-caster-new.vercel.app/preview.jpg",
              splashBackgroundColor: "#ffffff"
            }
          }
        }
        ) }
    };
