// THIS FILE IS AUTO-GENERATED. DO NOT EDIT.
// Source: spacetime describe -s maincloud.spacetimedb.com --json footballcaster2
/* eslint-disable */
/* tslint:disable */

// Minimal runtime wrapper using SDK connect() so client code can rely on DbConnection.builder() API.

export class DbConnectionBuilder {
  _uri = "wss://maincloud.spacetimedb.com";
  _moduleName = "footballcaster2";
  withUri(v) { this._uri = v; return this; }
  withModuleName(v) { this._moduleName = v; return this; }
  async build() {
    const mod = await import('spacetimedb');
    const connect = mod.connect || mod.default?.connect;
    if (typeof connect !== 'function') {
      throw new Error('spacetimedb.connect not available');
    }
    return await connect(this._uri, this._moduleName);
  }
}

export class DbConnection {
  static builder() { return new DbConnectionBuilder(); }
}

// Table name constants for convenience
export const tables = {
  "auction": "auction",
  "bid": "bid",
  "event": "event",
  "idempotency": "idempotency",
  "inbox": "inbox",
  "inventory_item": "inventory_item",
  "listing": "listing",
  "pvp_match": "pvp_match",
  "starter_claim": "starter_claim",
  "user": "user",
  "wallet_link": "wallet_link"
} as const;

export interface AuctionRow {
  "id": string;
  "item_id": string;
  "seller_fid": number;
  "reserve_wei": string;
  "ends_at_ms": number;
  "status": string;
  "top_bid_wei": string | null;
  "top_bidder_fid": number | null;
  "buy_now_wei": string | null;
  "anti_snipe_used": boolean;
  "created_at_ms": number;
  "finalized_at_ms": number | null;
}

export interface BidRow {
  "id": string;
  "auction_id": string;
  "fid": number;
  "amount_wei": string;
  "placed_at_ms": number;
}

export interface EventRow {
  "id": string;
  "ts_ms": number;
  "kind": string;
  "actor_fid": number;
  "topic_id": string | null;
  "payload_json": string;
}

export interface IdempotencyRow {
  "id": string;
  "endpoint": string;
  "first_seen_at_ms": number;
  "response_json": string;
  "ttl_until_ms": number;
}

export interface InboxRow {
  "msg_id": string;
  "fid": number;
  "kind": string;
  "title": string;
  "body": string;
  "created_at_ms": number;
  "read_at_ms": number | null;
}

export interface InventoryItemRow {
  "item_id": string;
  "owner_fid": number;
  "item_type": string;
  "acquired_at_ms": number;
  "hold_until_ms": number;
  "source_event_id": string;
}

export interface ListingRow {
  "id": string;
  "item_id": string;
  "seller_fid": number;
  "price_wei": string;
  "status": string;
  "created_at_ms": number;
  "closed_at_ms": number | null;
}

export interface PvpMatchRow {
  "id": string;
  "challenger_fid": number;
  "challenged_fid": number;
  "status": string;
  "created_at_ms": number;
  "accepted_at_ms": number | null;
  "result_json": string | null;
}

export interface StarterClaimRow {
  "fid": number;
  "claimed_at_ms": number;
}

export interface UserRow {
  "fid": number;
  "wallet": string | null;
  "created_at_ms": number;
}

export interface WalletLinkRow {
  "address": string;
  "fid": number;
  "linked_at_ms": number;
}
