// Type definitions for Football Caster

export interface Player {
  playerId: string;
  ownerFid: number;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  rating: number;
  xp: number;
  morale: number;
  holdEnd: string | null; // ISO date string
  isNpc: boolean;
  avatar?: string;
  attributes: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
  };
}

export interface PlayerPrice {
  playerId: string;
  pointValue: number; // Pt value
  spread: number; // Spread percentage
  bidPrice: number; // Pt * (1 - spread/2)
  askPrice: number; // Pt * (1 + spread/2)
  delta: number; // Change from previous week
}

export interface Club {
  fid: number;
  coachId: string | null;
  formation: string;
  chemistry: number;
  stadiumLevel: number;
  kitPrimary: string;
  kitSecondary: string;
  lineup: string[]; // Array of player IDs
  subs: string[];
}

export interface Auction {
  id: string;
  playerId: string;
  sellerFid: number;
  currentBid: string; // FBC in wei
  currentBidderFid: number | null;
  reserve: number; // Point value
  endsAt: string; // ISO date string
  buyNow: string | null; // FBC in wei
  minIncrement: string; // FBC in wei
  antiSnipeUsed: boolean;
  status: 'active' | 'ended' | 'finalized';
}

export interface Listing {
  id: string;
  playerId: string;
  sellerFid: number;
  priceWei: string; // FBC in wei
  createdAt: string;
  status: 'active' | 'sold' | 'cancelled';
}

export interface Offer {
  id: string;
  side: 'buy' | 'sell';
  playerId: string;
  fromFid: number;
  toFid: number | null;
  priceFbc: string;
  expiry: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface InboxMessage {
  id: string;
  type: 'morale_summary_team' | 'offer_received' | 'offer_accepted' | 'offer_declined' | 'auction_outbid' | 'auction_won' | 'auction_lost' | 'auction_expired' | 'auction_sold';
  timestamp: string;
  read: boolean;
  data: Record<string, unknown>;
}

export interface Coach {
  id: string;
  name: string;
  style: string;
  bonus: string;
  hireCost: number;
  image?: string;
}

export interface FarcasterIdentity {
  fid: number;
  username?: string;
  displayName?: string;
  avatar?: string;
}

export interface SnapshotMeta {
  week: number;
  updatedAt: string;
}

export interface WalletState {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  chainId: number | undefined;
}

export interface HoldStatus {
  isActive: boolean;
  endsAt: Date | null;
  hoursRemaining: number | null;
}

export interface MoraleFactors {
  teamPerformance: number;
  usage: number;
  chemistry: number;
  transfer: number;
  social: number;
}

export interface FormationSlot {
  position: string;
  playerId: string | null;
  x: number;
  y: number;
}

export interface ChemistryLink {
  from: string;
  to: string;
  strength: number; // 0-3
}
