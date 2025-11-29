'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, ShoppingBag, Gavel, Inbox, Settings, Play, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/squad', icon: Users, label: 'Squad' },
  { href: '/match', icon: Play, label: 'Match' },
  { href: '/transfers', icon: TrendingUp, label: 'Transfers' },
  { href: '/market', icon: ShoppingBag, label: 'Market' },
  { href: '/auction', icon: Gavel, label: 'Auctions' },
  { href: '/inbox', icon: Inbox, label: 'Inbox' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Navigation(): JSX.Element {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.slice(0, 6).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DesktopNav(): JSX.Element {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 glass border-b border-border">
      <div className="container mx-auto flex items-center justify-between py-4 px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <span className="text-white font-bold">FC</span>
          </div>
          <span className="text-xl font-bold championship-title">Football Caster</span>
        </Link>
        
        <div className="flex items-center gap-1">
          {navItems.slice(0, -1).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
            pathname === '/settings'
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <Settings className="h-5 w-5" />
          <span className="font-medium">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
