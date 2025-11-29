'use client';

import { useState, useEffect } from 'react';
import { Inbox as InboxIcon, Mail, MailOpen, TrendingUp, TrendingDown, Gavel, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/glass/GlassCard';
import { Navigation, DesktopNav } from '@/components/Navigation';
import { useFarcasterIdentity } from '@/hooks/useFarcasterIdentity';
import { API_ENDPOINTS } from '@/lib/constants';
import type { InboxMessage } from '@/lib/types';
import { cn } from '@/lib/utils';

const MESSAGE_ICONS: Record<string, typeof InboxIcon> = {
  morale_summary_team: TrendingUp,
  offer_received: DollarSign,
  offer_accepted: TrendingUp,
  offer_declined: TrendingDown,
  auction_outbid: Gavel,
  auction_won: TrendingUp,
  auction_lost: TrendingDown,
  auction_expired: Gavel,
  auction_sold: DollarSign,
};

const MESSAGE_TITLES: Record<string, string> = {
  morale_summary_team: 'Weekly Morale Report',
  offer_received: 'New Offer Received',
  offer_accepted: 'Offer Accepted',
  offer_declined: 'Offer Declined',
  auction_outbid: 'You\'ve Been Outbid',
  auction_won: 'Auction Won!',
  auction_lost: 'Auction Lost',
  auction_expired: 'Auction Expired',
  auction_sold: 'Player Sold',
};

export default function InboxPage(): JSX.Element {
  const { identity } = useFarcasterIdentity();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastSeenAt, setLastSeenAt] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('inbox_last_seen') || new Date().toISOString() : new Date().toISOString()
  );

  useEffect(() => {
    const fetchMessages = async (): Promise<void> => {
      if (!identity) return;

      try {
        const response = await fetch(`${API_ENDPOINTS.inbox}?fid=${identity.fid}`);
        if (response.ok) {
          const data = (await response.json()) as { messages: InboxMessage[] };
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Failed to fetch inbox:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [identity]);

  const markAllRead = (): void => {
    const now = new Date().toISOString();
    setLastSeenAt(now);
    if (typeof window !== 'undefined') {
      localStorage.setItem('inbox_last_seen', now);
    }
  };

  const unreadCount = messages.filter(
    (m) => new Date(m.timestamp) > new Date(lastSeenAt)
  ).length;

  const renderMessage = (message: InboxMessage): JSX.Element => {
    const Icon = MESSAGE_ICONS[message.type] || Mail;
    const title = MESSAGE_TITLES[message.type] || 'Notification';
    const isUnread = new Date(message.timestamp) > new Date(lastSeenAt);

    return (
      <GlassCard
        key={message.id}
        hover
        className={cn(
          'cursor-pointer',
          isUnread && 'border-primary/30'
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
            isUnread ? 'bg-primary/20' : 'bg-muted'
          )}>
            <Icon className={cn(
              'h-5 w-5',
              isUnread ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn(
                'font-semibold',
                isUnread && 'text-primary'
              )}>
                {title}
              </h3>
              {isUnread && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              {JSON.stringify(message.data)}
            </p>
            
            <div className="mt-2 text-xs text-muted-foreground">
              {new Date(message.timestamp).toLocaleDateString()} at{' '}
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>

          {isUnread ? (
            <Mail className="h-5 w-5 text-primary flex-shrink-0" />
          ) : (
            <MailOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      </GlassCard>
    );
  };

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <InboxIcon className="h-6 w-6 text-white" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                    {unreadCount}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Inbox</h1>
                <p className="text-sm text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread messages` : 'All caught up!'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button onClick={markAllRead} variant="outline">
                Mark All Read
              </Button>
            )}
          </div>

          {/* Info Card */}
          <GlassCard className="mb-6 border-blue-500/20">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <InboxIcon className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-sm">
                <div className="font-semibold mb-1">Inbox Notifications</div>
                <div className="text-muted-foreground space-y-1">
                  <div>• Weekly morale summaries for your team</div>
                  <div>• Offers received and status updates</div>
                  <div>• Auction updates (outbid, won, lost, sold)</div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Messages */}
          <div className="space-y-3">
            {isLoading ? (
              <>
                <div className="glass-skeleton h-24 rounded-lg" />
                <div className="glass-skeleton h-24 rounded-lg" />
                <div className="glass-skeleton h-24 rounded-lg" />
              </>
            ) : messages.length === 0 ? (
              <GlassCard className="text-center py-12">
                <InboxIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <div className="text-lg font-semibold mb-1">No Messages Yet</div>
                <div className="text-sm text-muted-foreground">
                  Your notifications will appear here
                </div>
              </GlassCard>
            ) : (
              messages.map(renderMessage)
            )}
          </div>
        </div>
      </div>
      <Navigation />
    </>
  );
}
