import type { Player } from '@/lib/types';
import { reducers, getSpacetime } from './client';

function idx(table: any, indexName: string): any {
  const v = table?.[indexName];
  return typeof v === 'function' ? v() : v;
}

function iso(ms: number | null | undefined): string | null {
  if (!ms && ms !== 0) return null;
  try { return new Date(ms!).toISOString(); } catch { return null; }
}

async function getReducer(name: string): Promise<(...args: any[]) => Promise<any>> {
  const r: any = await reducers();
  if (typeof r?.[name] === 'function') return r[name].bind(r);
  if (typeof r?.get === 'function') {
    const fn = r.get(name);
    if (typeof fn === 'function') return fn;
  }
  if (typeof r?.call === 'function') {
    return (...args: any[]) => r.call(name, ...args);
  }
  throw new Error(`Reducer ${name} not available`);
}

function toCamelCase(name: string): string {
  return name.replace(/[_-](\w)/g, (_, c) => c.toUpperCase());
}

async function callReducerCompat(nameSnake: string, argsPositional: any[], argsNamed: Record<string, any>): Promise<any> {
  const r: any = await reducers();
  const camel = toCamelCase(nameSnake);
  const i64Keys = new Set([
    'fid', 'buyerFid', 'sellerFid', 'winnerFid', 'challengerFid', 'challengedFid', 'accepterFid', 'reporterFid',
    // NPC & squad related
    'npcFid', 'userFid', 'aiSeed', 'sourceFid', 'followers', 'ownerFid',
    // Misc durations that some reducers model as i64
    'durationSeconds', 'nextDecisionAtMs', 'tsMs'
  ]);
  const orderedArgNames = Object.keys(argsNamed);
  const positional = argsPositional.map((v, i) => {
    const k = orderedArgNames[i];
    if (k && i64Keys.has(k) && typeof v === 'number' && Number.isInteger(v)) return BigInt(v);
    return v;
  });
  if (typeof r?.call === 'function') return r.call(nameSnake, ...positional);
  if (typeof r?.[camel] === 'function') return r[camel](...positional);
  if (typeof r?.[nameSnake] === 'function') return r[nameSnake](...positional);
  throw new Error(`Reducer ${nameSnake} not available`);
}

export async function stGetPlayersMine(fid: number): Promise<Player[]> {
  const st = await getSpacetime();
  const fidBig = BigInt(fid);
  // Stream inventory filtering to avoid array materialization
  const inv: any[] = [];
  for (const row of st.db.inventoryItem.iter() as Iterable<any>) {
    if (row.ownerFid === fidBig && row.itemType === 'player') inv.push(row);
  }

  // Stream events for starter pack metadata
  const meta = new Map<string, any>();
  for (const e of st.db.event.iter() as Iterable<any>) {
    if (
      e.actorFid === fidBig &&
      (e.kind === 'StarterPackGranted' || e.kind === 'starter_pack_granted')
    ) {
      try {
        const payload = JSON.parse(e.payloadJson);
        for (const p of payload.players || []) meta.set(p.player_id, p);
      } catch {}
    }
  }

  return inv.map((item) => {
    const m = meta.get(item.itemId) || {};
    const name = m.name ?? `Player ${String(item.itemId).slice(0, 6)}`;
    const position = (m.position ?? 'MID') as Player['position'];
    const rating = Number(m.rating ?? 70);
    return {
      playerId: item.itemId,
      ownerFid: Number(item.ownerFid),
      name,
      position,
      rating,
      xp: 0,
      morale: 70,
      holdEnd: iso(Number(item.holdUntilMs)),
      isNpc: false,
      attributes: { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60 },
    } satisfies Player;
  });
}

export async function stListActiveListings(): Promise<any[]> {
  const st = await getSpacetime();
  const rows = (Array.from(st.db.listing.iter()) as any[])
    .filter((l) => l.status === 'active')
    .sort((a, b) => Number(b.createdAtMs - a.createdAtMs));
  return rows.map((l) => ({
    id: l.id,
    playerId: l.itemId,
    sellerFid: Number(l.sellerFid),
    priceFbcWei: l.priceWei,
    createdAt: iso(Number(l.createdAtMs)),
    status: 'active',
  }));
}

export async function stGetListing(id: string): Promise<any | null> {
  const st = await getSpacetime();
  const l = st.db.listing.id().find(id) as any;
  if (!l) return null;
  return {
    id: l.id,
    playerId: l.itemId,
    sellerFid: Number(l.sellerFid),
    priceFbcWei: l.priceWei,
    createdAt: iso(Number(l.createdAtMs)),
    status: l.status === 'active' ? 'active' : 'sold',
  };
}

export async function stCloseListingAndTransfer(listingId: string, buyerFid: number): Promise<void> {
  const r = await reducers();
  await r.close_listing_and_transfer(listingId, buyerFid);
}

export async function stListActiveAuctions(): Promise<any[]> {
  const st = await getSpacetime();
  const rows = (Array.from(st.db.auction.iter()) as any[])
    .filter((a) => a.status === 'active')
    .sort((a, b) => Number(b.createdAtMs - a.createdAtMs));
  return rows.map((a) => {
    const currentBid = a.topBidWei ?? null;
    const incFloor = 1_000_000_000_000_000_000n;
    const minInc = BigInt(currentBid || '0') / 50n;
    const minIncWei = (minInc < incFloor ? incFloor : minInc).toString();
    return {
      id: a.id,
      playerId: a.itemId,
      sellerFid: Number(a.sellerFid),
      topBidFbcWei: currentBid,
      currentBidderFid: a.topBidderFid ? Number(a.topBidderFid) : null,
      reserveFbcWei: a.reserveWei,
      endsAt: iso(Number(a.endsAtMs)),
      buyNowFbcWei: a.buyNowWei ?? null,
      minIncrement: minIncWei,
      antiSnipeUsed: !!a.antiSnipeUsed,
      status: 'active',
    };
  });
}

export async function stHasClaimedStarter(fid: number): Promise<boolean> {
  const st = await getSpacetime();
  const index = idx(st.db.starterClaim, 'fid');
  const row = index?.find ? index.find(BigInt(fid)) : undefined;
  return !!row;
}

/**
 * Check if user has entered before (has any data in system)
 */
export async function stHasEnteredBefore(fid: number): Promise<boolean> {
  const st = await getSpacetime();
  // User has entered if they have any inventory items or claimed starter pack
  const hasInventory = (Array.from(st.db.inventoryItem.iter()) as any[]).some(
    (item) => item.ownerFid === BigInt(fid)
  );
  const scIndex = idx(st.db.starterClaim, 'fid');
  const hasClaimed = !!(scIndex?.find ? scIndex.find(BigInt(fid)) : undefined);
  return hasInventory || hasClaimed;
}

export async function stGrantStarterPack(fid: number, players: any[]): Promise<void> {
  const playersJson = JSON.stringify({ players });
  await callReducerCompat('grant_starter_pack', [fid, playersJson], { fid, playersJson });
}

export async function stCreateListing(fid: number, itemId: string, priceFbcWei: string): Promise<any> {
  const r = await reducers();
  await r.create_listing(fid, itemId, priceFbcWei);
  const st = await getSpacetime();
  const l = (Array.from(st.db.listing.iter()) as any[])
    .filter((x) => x.sellerFid === BigInt(fid) && x.itemId === itemId)
    .sort((a, b) => Number(b.createdAtMs - a.createdAtMs))[0];
  return l
    ? {
        id: l.id,
        playerId: l.itemId,
        sellerFid: Number(l.sellerFid),
        priceFbcWei: l.priceWei,
        createdAt: iso(Number(l.createdAtMs)),
        status: l.status,
      }
    : null;
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
  const a = (Array.from(st.db.auction.iter()) as any[])
    .filter((x) => x.sellerFid === BigInt(fid) && x.itemId === itemId)
    .sort((x, y) => Number(y.createdAtMs - x.createdAtMs))[0];
  if (!a) return null;
  const currentBid = a.topBidWei ?? null;
  const minInc = BigInt(currentBid || '0') / 50n;
  const minIncWei = (minInc < 1_000_000_000_000_000_000n ? 1_000_000_000_000_000_000n : minInc).toString();
  return {
    id: a.id,
    playerId: a.itemId,
    sellerFid: Number(a.sellerFid),
    topBidFbcWei: currentBid,
    currentBidderFid: a.topBidderFid ? Number(a.topBidderFid) : null,
    reserveFbcWei: a.reserveWei,
    endsAt: iso(Number(a.endsAtMs)),
    buyNowFbcWei: a.buyNowWei ?? null,
    minIncrement: minIncWei,
    antiSnipeUsed: !!a.antiSnipeUsed,
    status: 'active',
  };
}

export async function stPlaceBid(auctionId: string, fid: number, amountFbcWei: string): Promise<string> {
  const st = await getSpacetime();
  const before = st.db.auction.id().find(auctionId) as any;
  const prevEnds = before ? Number(before.endsAtMs) : undefined;
  const r = await reducers();
  await r.place_bid(fid, auctionId, amountFbcWei);
  const after = st.db.auction.id().find(auctionId) as any;
  const nextEnds = after ? Number(after.endsAtMs) : undefined;
  if (prevEnds && nextEnds && nextEnds > prevEnds) return 'anti_snipe_triggered';
  return 'bid_placed';
}

export async function stBuyNow(auctionId: string, buyerFid: number, buyNowFbcWei: string): Promise<void> {
  const r = await reducers();
  await r.buy_now(auctionId, buyerFid, buyNowFbcWei);
}

// Atomic purchase flows (idempotent, single-reducer)
export async function stMarketplacePurchaseApply(txHash: string, buyerFid: number, listingId: string): Promise<void> {
  await callReducerCompat(
    'marketplace_purchase_apply',
    [txHash, buyerFid, listingId, '/api/market/buy'],
    { txHash, buyerFid, listingId, endpoint: '/api/market/buy' }
  );
}

export async function stAuctionBuyNowApply(txHash: string, buyerFid: number, auctionId: string, buyNowFbcWei: string): Promise<void> {
  await callReducerCompat(
    'auction_buy_now_apply',
    [txHash, buyerFid, auctionId, buyNowFbcWei, '/api/auctions/buy-now'],
    { txHash, buyerFid, auctionId, buyNowWei: buyNowFbcWei, endpoint: '/api/auctions/buy-now' }
  );
}

export async function stFinalizeAuction(auctionId: string, winnerFid: number): Promise<void> {
  const r = await reducers();
  await r.finalize_auction(auctionId, winnerFid);
}

export async function stGetAuction(auctionId: string): Promise<any | null> {
  const st = await getSpacetime();
  const a = st.db.auction.id().find(auctionId) as any;
  if (!a) return null;
  const currentBid = a.topBidWei ?? null;
  const minInc = BigInt(currentBid || '0') / 50n;
  const minIncWei = (minInc < 1_000_000_000_000_000_000n ? 1_000_000_000_000_000_000n : minInc).toString();
  const now = Date.now();
  const status = a.status === 'finalized' ? 'finalized' : now > Number(a.endsAtMs ?? 0n) ? 'awaiting_payment' : 'active';
  return {
    id: a.id,
    playerId: a.itemId,
    sellerFid: Number(a.sellerFid),
    topBidFbcWei: currentBid,
    currentBidderFid: a.topBidderFid ? Number(a.topBidderFid) : null,
    reserveFbcWei: a.reserveWei,
    endsAt: iso(Number(a.endsAtMs)),
    buyNowFbcWei: a.buyNowWei ?? null,
    minIncrement: minIncWei,
    antiSnipeUsed: !!a.antiSnipeUsed,
    status,
  };
}

export async function stLinkWallet(fid: number, address: string): Promise<void> {
  await callReducerCompat('link_wallet', [fid, address], { fid, address });
}

export async function stGetInbox(fid: number): Promise<any[]> {
  const st = await getSpacetime();
  const rows = (Array.from(st.db.inbox.iter()) as any[])
    .filter((m) => m.fid === BigInt(fid))
    .sort((a, b) => Number(b.createdAtMs - a.createdAtMs));
  return rows.map((m) => ({
    id: m.msgId,
    fid: Number(m.fid),
    type: m.kind ?? null,
    title: m.title,
    body: m.body,
    createdAtMs: Number(m.createdAtMs),
    readAtMs: m.readAtMs ? Number(m.readAtMs) : null,
  }));
}

export async function stInboxMarkRead(fid: number, ids: string[]): Promise<void> {
  const r = await reducers();
  await r.inbox_mark_read(fid, JSON.stringify(ids));
}

export async function stGetUser(fid: number): Promise<any | null> {
  const st = await getSpacetime();
  const uIndex = idx(st.db.user, 'fid');
  const u = uIndex?.find ? (uIndex.find(BigInt(fid)) as any) : null;
  return u ? { ...u, fid: Number(u.fid) } : null;
}

/**
 * Check if transaction hash has been used
 */
export async function stIsTxUsed(txHash: string): Promise<boolean> {
  const st = await getSpacetime();
  const txIndex = idx(st.db.transactionUsed, 'txHash');
  const row = txIndex?.find ? txIndex.find(txHash) : undefined;
  return !!row;
}

/**
 * Mark transaction as used (via reducer) - prevents replay attacks
 */
export async function stMarkTxUsed(txHash: string, fid: number, endpoint: string): Promise<void> {
  const fn = await getReducer('mark_tx_used');
  await fn(txHash, fid, endpoint);
}

// --- NPC & Squad wrappers ---
export async function stNpcAssignForUser(userFid: number, count: number): Promise<void> {
  await callReducerCompat('npc_assign_for_user', [userFid, count], { userFid, count });
}

export async function stNpcCreate(
  npcFid: number,
  displayName: string,
  aiSeed: number,
  difficultyTier: number,
  budgetFbcWei: string,
  personaJson: string,
): Promise<void> {
  await callReducerCompat('npc_create', [npcFid, displayName, aiSeed, difficultyTier, budgetFbcWei, personaJson], {
    npcFid, displayName, aiSeed, difficultyTier, budgetFbcWei, personaJson,
  });
  // Verify write for reliability in dev
  try {
    const st = await getSpacetime();
    const exists = !!st.db.npcRegistry?.npcFid?.()?.find?.(BigInt(npcFid));
    if (!exists) {
      throw new Error('npc_create_noop');
    }
  } catch (_) {
    // fallback to scan
    const st = await getSpacetime();
    const ok = Array.from(st.db.npcRegistry.iter?.() ?? []).some((n: any) => Number(n.npcFid) === npcFid);
    if (!ok) throw new Error('npc_create_noop');
  }
}

export async function stNpcMintToken(npcFid: number, ownerFid: number): Promise<void> {
  const r = await reducers() as any;
  if (typeof r.npc_mint_token === 'function') {
    await r.npc_mint_token(npcFid, ownerFid);
    return;
  }
  await callReducerCompat('npc_mint_token', [npcFid, ownerFid], { npcFid, ownerFid });
}

export async function stSquadMintFromFarcaster(
  sourceFid: number,
  followers: number,
  ownerFid: number,
  intelligenceScore: number,
  rank: string,
  personaJson: string,
): Promise<void> {
  const r = await reducers() as any;
  if (typeof r.squad_mint_from_farcaster === 'function') {
    await r.squad_mint_from_farcaster(sourceFid, followers, ownerFid, intelligenceScore, rank, personaJson);
    return;
  }
  await callReducerCompat('squad_mint_from_farcaster', [sourceFid, followers, ownerFid, intelligenceScore, rank, personaJson], {
    sourceFid, followers, ownerFid, intelligenceScore, rank, personaJson,
  });
}

export async function stNpcUpdateState(npcFid: number, nextDecisionAtMs: number, budgetFbcWei: string): Promise<void> {
  await callReducerCompat('npc_update_state', [npcFid, nextDecisionAtMs, budgetFbcWei], { npcFid, nextDecisionAtMs, budgetFbcWei });
}

// --- NPC query helpers ---
function mapNpcRow(n: any): any {
  return {
    npcFid: Number(n.npcFid),
    tokenId: n.tokenId ?? null,
    aiSeed: Number(n.aiSeed),
    difficultyTier: Number(n.difficultyTier),
    budgetFbcWei: String(n.budgetFbcWei),
    persona: String(n.persona),
    ownerFid: n.ownerFid != null ? Number(n.ownerFid) : null,
    managerConfidence: Number(n.managerConfidence ?? 0),
    pressureLevel: Number(n.pressureLevel ?? 0),
    mood: String(n.mood ?? ''),
    nextDecisionAt: iso(Number(n.nextDecisionAtMs)),
    lastActiveAt: iso(Number(n.lastActiveMs)),
    active: !!n.active,
  };
}

export async function stGetNPC(npcFid: number): Promise<any | null> {
  const st = await getSpacetime();
  try {
    const idxNpc = (st.db as any).npcRegistry?.npcFid?.();
    const row = idxNpc?.find ? idxNpc.find(BigInt(npcFid)) : undefined;
    if (row) return mapNpcRow(row);
  } catch {}
  // Fallback: scan
  for (const n of (st.db as any).npcRegistry?.iter?.() ?? []) {
    if (Number((n as any).npcFid) === npcFid) return mapNpcRow(n);
  }
  return null;
}

export type NpcSortKey = 'lastActive' | 'fid' | 'difficulty' | 'confidence';

export async function stListNPCs(params: {
  page?: number;
  pageSize?: number;
  active?: boolean;
  ownedBy?: number;
  search?: string;
  sort?: NpcSortKey;
  order?: 'asc' | 'desc';
}): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
  const st = await getSpacetime();
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.max(1, Math.min(200, Math.floor(params.pageSize ?? 25)));
  const active = params.active;
  const ownedBy = params.ownedBy;
  const search = (params.search || '').trim().toLowerCase();
  const sort: NpcSortKey = params.sort ?? 'lastActive';
  const order = params.order ?? 'desc';

  let rows = Array.from((st.db as any).npcRegistry?.iter?.() ?? []) as any[];

  if (typeof active === 'boolean') rows = rows.filter((n) => !!n.active === active);
  if (Number.isFinite(ownedBy as any)) rows = rows.filter((n) => (n.ownerFid != null) && Number(n.ownerFid) === ownedBy);
  if (search) {
    rows = rows.filter((n) => {
      const fidStr = String(n.npcFid || '').toLowerCase();
      const tok = String(n.tokenId || '').toLowerCase();
      const persona = String(n.persona || '').toLowerCase();
      return fidStr.includes(search) || tok.includes(search) || persona.includes(search);
    });
  }

  const total = rows.length;

  rows.sort((a, b) => {
    let va = 0, vb = 0;
    switch (sort) {
      case 'fid': va = Number(a.npcFid); vb = Number(b.npcFid); break;
      case 'difficulty': va = Number(a.difficultyTier); vb = Number(b.difficultyTier); break;
      case 'confidence': va = Number(a.managerConfidence ?? 0); vb = Number(b.managerConfidence ?? 0); break;
      case 'lastActive':
      default: va = Number(a.lastActiveMs ?? 0); vb = Number(b.lastActiveMs ?? 0); break;
    }
    const diff = va - vb;
    return order === 'asc' ? diff : -diff;
  });

  const start = (page - 1) * pageSize;
  const slice = rows.slice(start, start + pageSize).map(mapNpcRow);
  return { items: slice, total, page, pageSize };
}

// Player state
export async function stPlayerProfileInit(playerId: string, ageYears: number, morale: number, fatigue: number, satisfaction: number, loyalty: number): Promise<void> {
  await callReducerCompat('player_profile_init', [playerId, ageYears, morale, fatigue, satisfaction, loyalty], {
    playerId, ageYears, morale, fatigue, satisfaction, loyalty,
  });
}

export async function stPlayerStateApplyMatch(playerId: string, minutesPlayed: number, benched: boolean, result: string, eventsJson: string): Promise<void> {
  await callReducerCompat('player_state_apply_match', [playerId, minutesPlayed, benched, result, eventsJson], {
    playerId, minutesPlayed, benched, result, eventsJson,
  });
}

export async function stPlayerStateRecoverTick(nowMs: number): Promise<void> {
  await callReducerCompat('player_state_recover_tick', [nowMs], { nowMs });
}

export async function stPlayerAgeTick(): Promise<void> {
  const r = await reducers() as any;
  if (typeof r.player_age_tick === 'function') return r.player_age_tick();
  await callReducerCompat('player_age_tick', [], {});
}

// Officials
export async function stOfficialCreate(
  role: string,
  aiSeed: number,
  strictness: number,
  advantageTendency: number,
  offsideTolerance: number,
  varPropensity: number,
  consistency: number,
  fitness: number,
  reputation: number,
): Promise<void> {
  const r = await reducers() as any;
  if (typeof r.official_create === 'function') {
    await r.official_create(role, aiSeed, strictness, advantageTendency, offsideTolerance, varPropensity, consistency, fitness, reputation);
    return;
  }
  await callReducerCompat('official_create', [role, aiSeed, strictness, advantageTendency, offsideTolerance, varPropensity, consistency, fitness, reputation], {
    role, aiSeed, strictness, advantageTendency, offsideTolerance, varPropensity, consistency, fitness, reputation,
  });
}

export async function stOfficialAssignToMatch(matchId: string, refereeId: string, assistantLeftId: string, assistantRightId: string, varId?: string | null): Promise<void> {
  await callReducerCompat('official_assign_to_match', [matchId, refereeId, assistantLeftId, assistantRightId, varId ?? null], {
    matchId, refereeId, assistantLeftId, assistantRightId, varId: varId ?? null,
  });
}

export async function stOfficialUpdateAfterMatch(officialId: string, fitnessDelta: number, reputationDelta: number, consistencyDelta: number): Promise<void> {
  await callReducerCompat('official_update_after_match', [officialId, fitnessDelta, reputationDelta, consistencyDelta], {
    officialId, fitnessDelta, reputationDelta, consistencyDelta,
  });
}

export async function stVarReviewRecord(matchId: string, tsMs: number, decision: string, reason: string, metaJson: string): Promise<void> {
  await callReducerCompat('var_review_record', [matchId, tsMs, decision, reason, metaJson], { matchId, tsMs, decision, reason, metaJson });
}

export async function stCommentaryAppend(matchId: string, tsMs: number, tone: string, lang: string, text: string, metaJson: string): Promise<void> {
  await callReducerCompat('commentary_append', [matchId, tsMs, tone, lang, text, metaJson], { matchId, tsMs, tone, lang, text, metaJson });
}

export async function stOfficialSetActive(officialId: string, active: boolean): Promise<void> {
  await callReducerCompat('official_set_active', [officialId, active], { officialId, active });
}

// PvP reducers
export async function stPvpChallenge(challengerFid: number, challengedFid: number): Promise<{ id: string }> {
  const r = await reducers();
  await r.pvp_create_challenge(challengerFid, challengedFid);
  const st = await getSpacetime();
  const row = (Array.from(st.db.pvpMatch.iter()) as any[])
    .filter((m) => m.challengerFid === BigInt(challengerFid) && m.challengedFid === BigInt(challengedFid))
    .sort((a, b) => Number(b.createdAtMs - a.createdAtMs))[0];
  return { id: row?.id as string };
}

export async function stPvpAccept(matchId: string, accepterFid: number): Promise<void> {
  const r = await reducers();
  await r.pvp_accept(matchId, accepterFid);
}

export async function stPvpSubmitResult(matchId: string, reporterFid: number, result: any): Promise<void> {
  const r = await reducers();
  await r.pvp_submit_result(matchId, reporterFid, JSON.stringify(result));
}
