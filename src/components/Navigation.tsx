'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, ShoppingBag, Gavel, Inbox, Settings, Play, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/squad', icon: Users, label: 'Squad' },
  { href: '/match', icon: Play, label: 'Match' },
  { href: '/transfer', icon: TrendingUp, label: 'Transfers' },
  { href: '/market', icon: ShoppingBag, label: 'Market' },
  { href: '/auction', icon: Gavel, label: 'Auctions' },
  { href: '/inbox', icon: Inbox, label: 'Inbox' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Navigation(): JSX.Element {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Toggle bar */}
      <div className="glass border-t border-border flex items-center justify-center py-2">
        <button
          className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 font-semibold"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close Menu' : 'Open Menu'}
        </button>
      </div>

      {/* Collapsible panel */}
      {open && (
        <div className="glass border-t border-border pb-4">
          <div className="grid grid-cols-3 gap-3 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-1 px-2 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-medium text-center">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}

export function DesktopNav(): JSX.Element {
  const pathname = usePathname();
  async function checkInbox(): Promise<void> {
    try {
      const res = await fetch('/api/inbox?unread=true', { cache: 'no-store' });
      const data = await res.json();
      const count = (data?.messages || []).length;
      toast(count > 0 ? `${count} unread message(s)` : 'Inbox up to date');
    } catch {}
  }

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

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => void checkInbox()}>
            <RefreshCw className="h-4 w-4" /> Check Inbox
          </Button>
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
      </div>
    </nav>
  );
}
