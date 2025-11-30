import type { Player } from '@/lib/types';
import { reducers, getSpacetime } from './client';

function iso(ms: number | null | undefined): string | null {
  if (!ms && ms !== 0) return null;
  try { return new Date(ms!).toISOString(); } catch { return null; }
}

export async function stGetPlayersMine(fid: number): Promise<Player[]> {
  const st = await getSpacetime();
  const inv = (await st.query(`SELECT * FROM inventory_item WHERE owner_fid = ${fid} AND item_type = 'player'`)) as any[];
  const evs = (await st.query(`SELECT payload_json AS payloadJson FROM event WHERE actor_fid = ${fid} AND kind IN ('StarterPackGranted','starter_pack_granted')`)) as any[];
  const meta = new Map<string, any>();
  for (const e of evs || []) {
    try {
      const payload = JSON.parse(e.payloadJson);
      for (const p of payload.players || []) meta.set(p.player_id, p);
    } catch (e) {
      console.error('Failed to parse starter pack payload', e);
    }
  }
  return (inv || []).map((item: any) => {
    const m = meta.get(item.item_id) || {};
    const name = m.name ?? `Player ${String(item.item_id).slice(0, 6)}`;
    const position = (m.position ?? 'MID') as Player['position'];
    const rating = Number(m.rating ?? 70);
    return {
      playerId: item.item_id,
      ownerFid: item.owner_fid,
      name,
      position,
      rating,
      xp: 0,
      morale: 70,
      holdEnd: iso(item.hold_until_ms),
      isNpc: false,
      attributes: { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60 },
    } satisfies Player;
  });
}

export async function stListActiveListings(): Promise<any[]> {
  const st = await getSpacetime();
  const rows = (await st.query(`SELECT * FROM listing WHERE status = 'active' ORDER BY created_at_ms DESC`)) as any[];
  return (rows || []).map((l) => ({
    id: l.id,
    playerId: l.item_id,
    sellerFid: l.seller_fid,
    priceFbcWei: l.price_wei,
    createdAt: iso(l.created_at_ms),
    status: 'active',
  }));
}

export async function stGetListing(id: string): Promise<any | null> {
  const st = await getSpacetime();
  const rows = (await st.query(`SELECT * FROM listing WHERE id = '${id}' LIMIT 1`)) as any[];
  const l = rows?.[0];
  if (!l) return null;
  return {
    id: l.id,
    playerId: l.item_id,
    sellerFid: l.seller_fid,
    priceFbcWei: l.price_wei,
    createdAt: iso(l.created_at_ms),
    status: l.status === 'active' ? 'active' : 'sold',
  };
}

export async function stCloseListingAndTransfer(listingId: string, buyerFid: number): Promise<void> {
  const r = await reducers();
  await r.close_listing_and_transfer(listingId, buyerFid);
}

export async function stListActiveAuctions(): Promise<any[]> {
  const st = await getSpacetime();
  const rows = (await st.query(`SELECT * FROM auction WHERE status = 'active' ORDER BY created_at_ms DESC`)) as any[];
  return (rows || []).map((a) => {
    const currentBid = a.top_bid_wei ?? null;
    const incFloor = 1_000_000_000_000_000_000n;
    const minInc = (BigInt(currentBid || '0') / 50n);
    const minIncWei = (minInc < incFloor ? incFloor : minInc).toString();
    return {
      id: a.id,
      playerId: a.item_id,
      sellerFid: a.seller_fid,
      topBidFbcWei: currentBid,
      currentBidderFid: a.top_bidder_fid ?? null,
      reserveFbcWei: a.reserve_wei,
      endsAt: iso(a.ends_at_ms),
      buyNowFbcWei: a.buy_now_wei ?? null,
      minIncrement: minIncWei,
      antiSnipeUsed: !!a.anti_snipe_used,
      status: 'active',
    };
  });
}

export async function stHasClaimedStarter(fid: number): Promise<boolean> {
  const st = await getSpacetime();
  const rows = (await st.query(`SELECT 1 as ok FROM starter_claim WHERE fid = ${fid} LIMIT 1`)) as any[];
  return !!rows?.[0];
}

export async function stGrantStarterPack(fid: number, players: any[]): Promise<void> {
  const r = await reducers();
  await r.grant_starter_pack(fid, JSON.stringify({ players }));
}

export async function stCreateListing(fid: number, itemId: string, priceFbcWei: string): Promise<any> {
  const r = await reducers();
  await r.create_listing(fid, itemId, priceFbcWei);
  const st = await getSpacetime();
  const rows = (await st.query(`SELECT * FROM listing WHERE seller_fid = ${fid} AND item_id = '${itemId}' ORDER BY created_at_ms DESC LIMIT 1`)) as any[];
  const l = rows?.[0];
  return l ? { id: l.id, playerId: l.item_id, sellerFid: l.seller_fid, priceFbcWei: l.price_wei, createdAt: iso(l.created_at_ms), status: l.status } : null;
}

export async function stCreateAuction(
  fid: number,
  itemId: string,
  reserveFbcWei: string,
  durationSeconds: number,
  buyNowFbcWei?: string | null
): Promise<any> {
  const r = await reducers();
  await r.create_auction(fid, itemId, reserveFbcWei, durationSeconds, buyNowFbcWei ?? null);
  const st = await getSpacetime();
  const rows = (await st.query(`SELECT * FROM auction WHERE seller_fid = ${fid} AND item_id = '${itemId}' ORDER BY created_at_ms DESC LIMIT 1`)) as any[];
  const a = rows?.[0];
  if (!a) return null;
  const currentBid = a.top_bid_wei ?? null;
  const minInc = (BigInt(currentBid || '0') / 50n);
  const minIncWei = (minInc < 1_000_000_000_000_000_000n ? 1_000_000_000_000_000_000n : minInc).toString();
  return {
    id: a.id,
    playerId: a.item_id,
    sellerFid: a.seller_fid,
    topBidFbcWei: currentBid,
    currentBidderFid: a.top_bidder_fid ?? null,
    reserveFbcWei: a.reserve_wei,
    endsAt: iso(a.ends_at_ms),
    buyNowFbcWei: a.buy_now_wei ?? null,
    minIncrement: minIncWei,
    antiSnipeUsed: !!a.anti_snipe_used,
    status: 'active',
  };
}

export async function stPlaceBid(auctionId: string, fid: number, amountFbcWei: string): Promise<string> {
  const st = await getSpacetime();
  const before = (await st.query(`SELECT ends_at_ms FROM auction WHERE id = '${auctionId}' LIMIT 1`)) as any[];
  const prevEnds = before?.[0]?.ends_at_ms as number | undefined;
  const r = await reducers();
  await r.place_bid(fid, auctionId, amountFbcWei);
  const after = (await st.query(`SELECT ends_at_ms FROM auction WHERE id = '${auctionId}' LIMIT 1`)) as any[];
  const nextEnds = after?.[0]?.ends_at_ms as number | undefined;
  if (prevEnds && nextEnds && nextEnds > prevEnds) return 'anti_snipe_triggered';
  return 'bid_placed';
}

export async function stBuyNow(auctionId: string, buyerFid: number, buyNowFbcWei: string): Promise<void> {
  const r = await reducers();
  await r.buy_now(auctionId, buyerFid, buyNowFbcWei);
}

export async function stFinalizeAuction(auctionId: string, winnerFid: number): Promise<void> {
  const r = await reducers();
  await r.finalize_auction(auctionId, winnerFid);
}

export async function stGetAuction(auctionId: string): Promise<any | null> {
  const st = await getSpacetime();
  const rows = (await st.query(`SELECT * FROM auction WHERE id = '${auctionId}' LIMIT 1`)) as any[];
  const a = rows?.[0];
  if (!a) return null;
  const currentBid = a.top_bid_wei ?? null;
  const minInc = (BigInt(currentBid || '0') / 50n);
  const minIncWei = (minInc < 1_000_000_000_000_000_000n ? 1_000_000_000_000_000_000n : minInc).toString();
  const now = Date.now();
  const status = a.status === 'finalized' ? 'finalized' : now > (a.ends_at_ms ?? 0) ? 'awaiting_payment' : 'active';
  return {
    id: a.id,
    playerId: a.item_id,
    sellerFid: a.seller_fid,
    topBidFbcWei: currentBid,
    currentBidderFid: a.top_bidder_fid ?? null,
    reserveFbcWei: a.reserve_wei,
    endsAt: iso(a.ends_at_ms),
    buyNowFbcWei: a.buy_now_wei ?? null,
    minIncrement: minIncWei,
    antiSnipeUsed: !!a.anti_snipe_used,
    status,
  };
}

export async function stLinkWallet(fid: number, address: string): Promise<void> {
  const r = await reducers();
  await r.link_wallet(fid, address);
}

export async function stGetInbox(fid: number): Promise<any[]> {
  const st = await getSpacetime();
  const rows = (await st.query(`SELECT * FROM inbox WHERE fid = ${fid} ORDER BY created_at_ms DESC`)) as any[];
  return (rows || []).map((m) => ({
    id: m.msg_id,
    fid: m.fid,
    type: m.kind ?? null,
    title: m.title,
    body: m.body,
    createdAtMs: m.created_at_ms,
    readAtMs: m.read_at_ms ?? null,
  }));
}

export async function stInboxMarkRead(fid: number, ids: string[]): Promise<void> {
  const r = await reducers();
  await r.inbox_mark_read(fid, JSON.stringify(ids));
}

export async function stGetUser(fid: number): Promise<any | null> {
  const st = await getSpacetime();
  const rows = (await st.query(`SELECT * FROM user WHERE fid = ${fid} LIMIT 1`)) as any[];
  return rows?.[0] ?? null;
}

// PvP reducers
export async function stPvpChallenge(challengerFid: number, challengedFid: number): Promise<{ id: string }> {
  const r = await reducers();
  await r.pvp_create_challenge(challengerFid, challengedFid);
  const st = await getSpacetime();
  const rows = (await st.query(`SELECT id FROM pvp_match WHERE challenger_fid = ${challengerFid} AND challenged_fid = ${challengedFid} ORDER BY created_at_ms DESC LIMIT 1`)) as any[];
  return { id: rows?.[0]?.id as string };
}

export async function stPvpAccept(matchId: string, accepterFid: number): Promise<void> {
  const r = await reducers();
  await r.pvp_accept(matchId, accepterFid);
}

export async function stPvpSubmitResult(matchId: string, reporterFid: number, result: any): Promise<void> {
  const r = await reducers();
  await r.pvp_submit_result(matchId, reporterFid, JSON.stringify(result));
}
