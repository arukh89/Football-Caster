use spacetimedb::{reducer, table, ReducerContext, Table, DbContext};
use serde::{Deserialize, Serialize};

pub const HOLD_DAYS: i64 = 7;
pub const ANTI_SNIPE_EXTEND_SECONDS: i64 = 180;
pub const DEV_FID: i64 = 250704;

fn now_ms(ctx: &ReducerContext) -> i64 {
    (ctx.timestamp.to_micros_since_unix_epoch() / 1000) as i64
}

fn new_id(ctx: &ReducerContext, kind: &str, extra: &str) -> String {
    let base = format!("{}:{}:{}", kind, ctx.timestamp.to_micros_since_unix_epoch(), extra);
    uuid::Uuid::new_v5(&uuid::Uuid::NAMESPACE_URL, base.as_bytes()).to_string()
}

fn normalize(addr: &str) -> String { addr.to_lowercase() }

fn parse_wei(x: Option<&str>) -> i128 { x.and_then(|s| s.parse::<i128>().ok()).unwrap_or(0) }

#[table(name = user, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct User {
    #[primary_key]
    pub fid: i64,
    pub wallet: Option<String>,
    pub created_at_ms: i64,
}

#[table(name = wallet_link, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct WalletLink {
    #[primary_key]
    pub address: String,
    pub fid: i64,
    pub linked_at_ms: i64,
}

#[table(name = starter_claim, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct StarterClaim {
    #[primary_key]
    pub fid: i64,
    pub claimed_at_ms: i64,
}

#[table(name = inventory_item, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct InventoryItem {
    #[primary_key]
    pub item_id: String,
    pub owner_fid: i64,
    pub item_type: String,
    pub acquired_at_ms: i64,
    pub hold_until_ms: i64,
    pub source_event_id: String,
}

#[table(name = listing, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct Listing {
    #[primary_key]
    pub id: String,
    pub item_id: String,
    pub seller_fid: i64,
    pub price_wei: String,
    pub status: String,
    pub created_at_ms: i64,
    pub closed_at_ms: Option<i64>,
}

#[table(name = auction, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct Auction {
    #[primary_key]
    pub id: String,
    pub item_id: String,
    pub seller_fid: i64,
    pub reserve_wei: String,
    pub ends_at_ms: i64,
    pub status: String,
    pub top_bid_wei: Option<String>,
    pub top_bidder_fid: Option<i64>,
    pub buy_now_wei: Option<String>,
    pub anti_snipe_used: bool,
    pub created_at_ms: i64,
    pub finalized_at_ms: Option<i64>,
}

#[table(name = bid, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct Bid {
    #[primary_key]
    pub id: String,
    pub auction_id: String,
    pub fid: i64,
    pub amount_wei: String,
    pub placed_at_ms: i64,
}

#[table(name = event, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct Event {
    #[primary_key]
    pub id: String,
    pub ts_ms: i64,
    pub kind: String,
    pub actor_fid: i64,
    pub topic_id: Option<String>,
    pub payload_json: String,
}

#[table(name = inbox, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct Inbox {
    #[primary_key]
    pub msg_id: String,
    pub fid: i64,
    pub kind: String,
    pub title: String,
    pub body: String,
    pub created_at_ms: i64,
    pub read_at_ms: Option<i64>,
}

#[table(name = pvp_match, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct PvpMatch {
    #[primary_key]
    pub id: String,
    pub challenger_fid: i64,
    pub challenged_fid: i64,
    pub status: String, // pending, active, finalized
    pub created_at_ms: i64,
    pub accepted_at_ms: Option<i64>,
    pub result_json: Option<String>,
}

#[table(name = idempotency, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct Idempotency {
    #[primary_key]
    pub id: String,
    pub endpoint: String,
    pub first_seen_at_ms: i64,
    pub response_json: String,
    pub ttl_until_ms: i64,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct StarterPlayer { pub player_id: String, pub name: Option<String>, pub position: Option<String>, pub rating: Option<i32> }

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct StarterPackPayload { pub players: Vec<StarterPlayer> }

fn push_inbox(ctx: &ReducerContext, fid: i64, msg_id: String, ty: &str, title: &str, body: &str) {
    ctx.db().inbox().insert(Inbox { msg_id, fid, kind: ty.to_string(), title: title.to_string(), body: body.to_string(), created_at_ms: now_ms(ctx), read_at_ms: None });
}

fn transfer_item(ctx: &ReducerContext, item_id: &str, from_fid: i64, to_fid: i64, event_id: &str) -> Result<(), String> {
    let by_pk = ctx.db().inventory_item().item_id();
    let item = by_pk.find(&item_id.to_string()).ok_or("item_not_found")?;
    if item.owner_fid != from_fid { return Err("not_owner".into()); }
    by_pk.update(InventoryItem { owner_fid: to_fid, acquired_at_ms: now_ms(ctx), source_event_id: event_id.to_string(), ..item });
    Ok(())
}

fn append_event(ctx: &ReducerContext, ty: &str, actor_fid: i64, payload_json: String, topic_id: Option<String>) -> Event {
    let id = new_id(ctx, "evt", &format!("{}:{}:{:?}", ty, actor_fid, topic_id));
    let e = Event { id: id.clone(), ts_ms: now_ms(ctx), kind: ty.to_string(), actor_fid, topic_id, payload_json };
    ctx.db().event().insert(e.clone());
    e
}

#[reducer]
pub fn link_wallet(ctx: &ReducerContext, fid: i64, address: String) {
    let now = now_ms(ctx);
    let users = ctx.db().user();
    match users.fid().find(&fid) {
        Some(mut u) => { u.wallet = Some(address.clone()); users.fid().update(u); },
        None => { users.insert(User { fid, wallet: Some(address.clone()), created_at_ms: now }); }
    }
    let link = WalletLink { address: normalize(&address), fid, linked_at_ms: now };
    let wl = ctx.db().wallet_link();
    if wl.address().find(&link.address).is_some() { wl.address().delete(&link.address); }
    wl.insert(link);
}

#[reducer]
pub fn grant_starter_pack(ctx: &ReducerContext, fid: i64, players_json: String) {
    if ctx.db().starter_claim().fid().find(&fid).is_some() { panic!("starter_already_claimed"); }
    let now = now_ms(ctx);
    ctx.db().starter_claim().insert(StarterClaim { fid, claimed_at_ms: now });
    let evt = append_event(ctx, "starter_pack_granted", fid, players_json.clone(), None);
    let payload: StarterPackPayload = serde_json::from_str(&players_json).unwrap_or_default();
    let hold_until = now + HOLD_DAYS * 24 * 60 * 60 * 1000;
    for p in payload.players.iter() {
        let items = ctx.db().inventory_item();
        if items.item_id().find(&p.player_id).is_some() { items.item_id().delete(&p.player_id); }
        items.insert(InventoryItem { item_id: p.player_id.clone(), owner_fid: fid, item_type: "player".into(), acquired_at_ms: now, hold_until_ms: hold_until, source_event_id: evt.id.clone() });
    }
    push_inbox(ctx, fid, format!("starter-{}", evt.id), "starter_pack", "Starter Pack Granted", &format!("You received {} players from starter pack.", payload.players.len()));
}

#[reducer]
pub fn create_listing(ctx: &ReducerContext, fid: i64, item_id: String, price_wei: String) {
    let item = ctx.db().inventory_item().item_id().find(&item_id).ok_or("item_not_found").unwrap();
    if item.owner_fid != fid { panic!("not_owner"); }
    if now_ms(ctx) < item.hold_until_ms && fid != DEV_FID { panic!("in_hold"); }
    let id = new_id(ctx, "lst", &format!("{}:{}", fid, item_id));
    let listing = Listing { id: id.clone(), item_id, seller_fid: fid, price_wei, status: "active".into(), created_at_ms: now_ms(ctx), closed_at_ms: None };
    ctx.db().listing().insert(listing);
}

#[reducer]
pub fn close_listing_and_transfer(ctx: &ReducerContext, listing_id: String, buyer_fid: i64) {
    let listings = ctx.db().listing();
    let mut l = listings.id().find(&listing_id).ok_or("listing_not_found").unwrap();
    if l.status != "active" { panic!("listing_closed"); }
    l.status = "closed".into();
    l.closed_at_ms = Some(now_ms(ctx));
    listings.id().update(l.clone());
    let evt = append_event(ctx, "ListingSold", buyer_fid, serde_json::to_string(&l).unwrap_or("{}".into()), Some(listing_id.clone()));
    transfer_item(ctx, &l.item_id, l.seller_fid, buyer_fid, &evt.id).unwrap();
    push_inbox(ctx, l.seller_fid, format!("listing-sold-{}", evt.id), "listing_sold", "Item Sold!", "Your item was purchased.");
    push_inbox(ctx, buyer_fid, format!("listing-bought-{}", evt.id), "listing_bought", "Purchase Complete", "You bought an item.");
}

#[reducer]
pub fn create_auction(ctx: &ReducerContext, fid: i64, item_id: String, reserve_wei: String, duration_seconds: i64, buy_now_wei: Option<String>) {
    let item = ctx.db().inventory_item().item_id().find(&item_id).ok_or("item_not_found").unwrap();
    if item.owner_fid != fid { panic!("not_owner"); }
    if now_ms(ctx) < item.hold_until_ms && fid != DEV_FID { panic!("in_hold"); }
    let id = new_id(ctx, "auc", &format!("{}:{}", fid, item_id));
    let ends = now_ms(ctx) + duration_seconds * 1000;
    let a = Auction { id: id.clone(), item_id, seller_fid: fid, reserve_wei, ends_at_ms: ends, status: "active".into(), top_bid_wei: None, top_bidder_fid: None, buy_now_wei, anti_snipe_used: false, created_at_ms: now_ms(ctx), finalized_at_ms: None };
    ctx.db().auction().insert(a);
}

#[reducer]
pub fn place_bid(ctx: &ReducerContext, fid: i64, auction_id: String, amount_wei: String) {
    let auctions = ctx.db().auction();
    let mut a = auctions.id().find(&auction_id).ok_or("auction_not_found").unwrap();
    if a.status != "active" { panic!("auction_closed"); }
    if now_ms(ctx) > a.ends_at_ms { panic!("auction_ended"); }
    let current = parse_wei(a.top_bid_wei.as_deref());
    let next = parse_wei(Some(&amount_wei));
    if current == 0 {
        let reserve = parse_wei(Some(&a.reserve_wei));
        if next < reserve { panic!("below_reserve"); }
    } else {
        let min_inc = ((current as f64) * 1.02).round() as i128;
        if next < min_inc { panic!("below_increment"); }
    }
    let bid_id = new_id(ctx, "bid", &format!("{}:{}:{}", fid, auction_id, amount_wei));
    ctx.db().bid().insert(Bid { id: bid_id, auction_id: auction_id.clone(), fid, amount_wei: amount_wei.clone(), placed_at_ms: now_ms(ctx) });
    let mut anti = false;
    let mut new_ends = a.ends_at_ms;
    if !a.anti_snipe_used && a.ends_at_ms - now_ms(ctx) <= ANTI_SNIPE_EXTEND_SECONDS * 1000 {
        anti = true; new_ends = a.ends_at_ms + ANTI_SNIPE_EXTEND_SECONDS * 1000;
    }
    a.top_bid_wei = Some(amount_wei);
    a.top_bidder_fid = Some(fid);
    a.anti_snipe_used = a.anti_snipe_used || anti;
    a.ends_at_ms = new_ends;
    auctions.id().update(a);
}

#[reducer]
pub fn buy_now(ctx: &ReducerContext, auction_id: String, buyer_fid: i64, buy_now_wei: String) {
    let auctions = ctx.db().auction();
    let mut a = auctions.id().find(&auction_id).ok_or("auction_not_found").unwrap();
    if a.status != "active" { panic!("auction_closed"); }
    if a.buy_now_wei.as_deref() != Some(&buy_now_wei) { panic!("invalid_buy_now"); }
    let evt = append_event(ctx, "AuctionBuyNow", buyer_fid, serde_json::to_string(&a).unwrap_or("{}".into()), Some(auction_id));
    a.status = "finalized".into();
    a.finalized_at_ms = Some(now_ms(ctx));
    a.top_bid_wei = Some(buy_now_wei);
    a.top_bidder_fid = Some(buyer_fid);
    auctions.id().update(a.clone());
    transfer_item(ctx, &a.item_id, a.seller_fid, buyer_fid, &evt.id).unwrap();
}

#[reducer]
pub fn finalize_auction(ctx: &ReducerContext, auction_id: String, winner_fid: i64) {
    let auctions = ctx.db().auction();
    let mut a = auctions.id().find(&auction_id).ok_or("auction_not_found").unwrap();
    if a.status != "active" { panic!("auction_closed"); }
    if a.top_bidder_fid != Some(winner_fid) { panic!("not_winner"); }
    let evt = append_event(ctx, "AuctionFinalized", winner_fid, serde_json::to_string(&a).unwrap_or("{}".into()), Some(auction_id));
    a.status = "finalized".into();
    a.finalized_at_ms = Some(now_ms(ctx));
    auctions.id().update(a.clone());
    transfer_item(ctx, &a.item_id, a.seller_fid, winner_fid, &evt.id).unwrap();
}

#[reducer]
pub fn inbox_mark_read(ctx: &ReducerContext, fid: i64, msg_ids_json: String) {
    let ids: Vec<String> = serde_json::from_str(&msg_ids_json).unwrap_or_default();
    for id in ids.iter() {
        let inbox_tbl = ctx.db().inbox();
        if let Some(mut m) = inbox_tbl.msg_id().find(id) { if m.fid == fid { m.read_at_ms = Some(now_ms(ctx)); inbox_tbl.msg_id().update(m); } }
    }
}

#[reducer]
pub fn pvp_create_challenge(ctx: &ReducerContext, challenger_fid: i64, challenged_fid: i64) {
    if challenger_fid == challenged_fid { panic!("same_fid"); }
    // Prevent duplicate active/pending matches between same pair
    let sql = format!("SELECT id FROM pvp_match WHERE ((challenger_fid = {} AND challenged_fid = {}) OR (challenger_fid = {} AND challenged_fid = {})) AND status IN ('pending','active') LIMIT 1", challenger_fid, challenged_fid, challenged_fid, challenger_fid);
    if let Ok(rows) = ctx.db().query(&sql) { if !rows.is_empty() { panic!("match_exists"); } }
    let id = new_id(ctx, "pvp", &format!("{}:{}", challenger_fid, challenged_fid));
    let m = PvpMatch { id: id.clone(), challenger_fid, challenged_fid, status: "pending".into(), created_at_ms: now_ms(ctx), accepted_at_ms: None, result_json: None };
    ctx.db().pvp_match().insert(m);
    append_event(ctx, "pvp_match_created", challenger_fid, "{}".into(), Some(id.clone()));
    push_inbox(ctx, challenged_fid, format!("pvp-challenge-{}", id), "pvp_challenge", "New Challenge", &format!("FID {} challenged you.", challenger_fid));
}

#[reducer]
pub fn pvp_accept(ctx: &ReducerContext, match_id: String, accepter_fid: i64) {
    let tbl = ctx.db().pvp_match();
    let mut m = tbl.id().find(&match_id).ok_or("match_not_found").unwrap();
    if m.status != "pending" { panic!("invalid_state"); }
    if m.challenged_fid != accepter_fid { panic!("not_challenged"); }
    m.status = "active".into();
    m.accepted_at_ms = Some(now_ms(ctx));
    tbl.id().update(m.clone());
    append_event(ctx, "pvp_match_accepted", accepter_fid, "{}".into(), Some(match_id));
}

#[reducer]
pub fn pvp_submit_result(ctx: &ReducerContext, match_id: String, reporter_fid: i64, result_json: String) {
    let tbl = ctx.db().pvp_match();
    let mut m = tbl.id().find(&match_id).ok_or("match_not_found").unwrap();
    if m.status != "active" { panic!("invalid_state"); }
    if reporter_fid != m.challenger_fid && reporter_fid != m.challenged_fid { panic!("not_participant"); }
    m.status = "finalized".into();
    m.result_json = Some(result_json.clone());
    tbl.id().update(m.clone());
    append_event(ctx, "pvp_result_submitted", reporter_fid, result_json, Some(match_id));
}
