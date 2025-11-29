'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, User, Wallet, Shield, Zap, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/glass/GlassCard';
import { StatPill } from '@/components/glass/StatPill';
import { Navigation, DesktopNav } from '@/components/Navigation';
import { useFarcasterIdentity } from '@/hooks/useFarcasterIdentity';
import { useWallet } from '@/hooks/useWallet';
import { DEV_FID } from '@/lib/constants';

export default function SettingsPage(): JSX.Element {
  const { identity } = useFarcasterIdentity();
  const { wallet, connect, disconnect, isCorrectChain } = useWallet();
  
  const [showDevInfo, setShowDevInfo] = useState<boolean>(true);
  const [reducedTransparency, setReducedTransparency] = useState<boolean>(false);

  const isDev = identity?.fid === DEV_FID;

  const handleLiteMode = (enabled: boolean): void => {
    setReducedTransparency(enabled);
    if (enabled) {
      document.documentElement.classList.add('lite');
    } else {
      document.documentElement.classList.remove('lite');
    }
  };

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center">
              <SettingsIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your account and preferences
              </p>
            </div>
          </div>

          {/* Identity Section */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <User className="h-5 w-5" />
              Identity
            </h2>
            <GlassCard>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Farcaster ID</div>
                    <div className="text-sm text-muted-foreground">
                      {identity ? identity.fid : 'Not loaded'}
                    </div>
                  </div>
                  {isDev && (
                    <span className="dev-badge">DEV</span>
                  )}
                </div>

                {identity?.username && (
                  <div>
                    <div className="font-semibold">Username</div>
                    <div className="text-sm text-muted-foreground">
                      @{identity.username}
                    </div>
                  </div>
                )}

                {isDev && (
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Label htmlFor="show-dev" className="font-semibold">
                          Show Developer Badge
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Display dev badge on your profile
                        </p>
                      </div>
                      <Switch
                        id="show-dev"
                        checked={showDevInfo}
                        onCheckedChange={setShowDevInfo}
                      />
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Wallet Section */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet
            </h2>
            <GlassCard>
              <div className="space-y-4">
                {wallet.isConnected ? (
                  <>
                    <div>
                      <div className="font-semibold mb-1">Connected Wallet</div>
                      <div className="text-sm text-muted-foreground font-mono">
                        {wallet.address}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatPill
                        label="Chain"
                        value={isCorrectChain ? 'Base' : 'Wrong Network'}
                        variant={isCorrectChain ? 'success' : 'danger'}
                      />
                      <StatPill
                        label="Chain ID"
                        value={wallet.chainId || 'Unknown'}
                        variant="default"
                      />
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={disconnect}
                    >
                      Disconnect Wallet
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Connect your wallet to pay entry fees and trade players
                    </p>
                    <Button onClick={connect} className="w-full gap-2">
                      <Wallet className="h-4 w-4" />
                      Connect Wallet
                    </Button>
                  </>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Accessibility Section */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Accessibility
            </h2>
            <GlassCard>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor="lite-mode" className="font-semibold">
                      Lite Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Reduce glass transparency for better readability
                    </p>
                  </div>
                  <Switch
                    id="lite-mode"
                    checked={reducedTransparency}
                    onCheckedChange={handleLiteMode}
                  />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Dev Features */}
          {isDev && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Code className="h-5 w-5" />
                Developer Features
              </h2>
              <GlassCard className="border-cyan-500/20">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-cyan-600" />
                    <span className="font-semibold">Active Developer Perks</span>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>No marketplace fees (0% instead of 2%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>No 7-day hold period on players</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Instant trading permissions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Developer badge displayed on all interactions</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* About Section */}
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              About
            </h2>
            <GlassCard>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-semibold">1.0.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-semibold">Base Mainnet</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Chain ID</span>
                  <span className="font-semibold">8453</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
      <Navigation />
    </>
  );
}
