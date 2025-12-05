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
    // NPC-related extensions
    pub is_npc: bool,
    pub elo: i32,
    pub display_name: Option<String>,
    pub ai_persona_json: Option<String>,
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
    // Allowed values: "player", "npc_manager", "squad"
    pub item_type: String,
     pub acquired_at_ms: i64,
     pub hold_until_ms: i64,
     pub source_event_id: String,
 }

// NPC registry: global pool of AI managers
#[table(name = npc_registry, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct NpcRegistry {
    #[primary_key]
    pub npc_fid: i64, // references user.fid (is_npc=true)
    pub token_id: Option<String>,
    pub ai_seed: i64,
    pub difficulty_tier: i16,
    pub budget_fbc_wei: String,
    pub persona: String,
    pub owner_fid: Option<i64>,
    // Emotions/state
    pub manager_confidence: i32,
    pub pressure_level: i32,
    pub mood: String, // calm|confident|stressed|angry|cautious
    // Scheduling
    pub next_decision_at_ms: i64,
    pub last_active_ms: i64,
    pub active: bool,
}

// Assignment of NPCs to users (starter bundle). Composite key simulated via synthetic id.
#[table(name = npc_assignment, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct NpcAssignment {
    #[primary_key]
    pub id: String, // format: "{user_fid}:{npc_fid}"
    pub user_fid: i64,
    pub npc_fid: i64,
    pub assigned_at_ms: i64,
}

// Neynar Squad registry (tradable, not a player)
#[table(name = squad_registry, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct SquadRegistry {
    #[primary_key]
    pub squad_id: String, // e.g., "squad-{source_fid}"
    pub source_fid: i64,
    pub followers: i64,
    pub intelligence_score: i32, // 0..100
    pub rank: String,            // S/A/B/C/D
    pub persona: String,
    pub token_id: String,        // inventory item id for squad
    pub owner_fid: i64,
    pub active: bool,
}

// Player human-like state tracked over time (for item_type == "player")
#[table(name = player_state, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct PlayerState {
    #[primary_key]
    pub player_id: String, // equals inventory_item.item_id for players
    pub age_years: i16,
    pub morale: i32,   // 0..100
    pub fatigue: i32,  // 0..100 (100 = very tired)
    pub injury_status: String, // none|minor|moderate|severe
    pub injury_end_ms: Option<i64>,
    pub satisfaction: i32, // 0..100
    pub loyalty: i32,      // 0..100
    // Rolling 7d
    pub minutes_played_7d: i32,
    pub matches_played_7d: i32,
    pub matches_benched_7d: i32,
    pub last_match_at_ms: Option<i64>,
}

// Match officials (referee crew & VAR)
#[table(name = officials, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct Official {
    #[primary_key]
    pub official_id: String, // e.g., ref-{uuid}
    pub role: String,        // referee|assistant_left|assistant_right|var
    // Attributes 0..100
    pub strictness: i32,
    pub advantage_tendency: i32,
    pub offside_tolerance: i32,
    pub var_propensity: i32,
    pub consistency: i32,
    pub fitness: i32,
    pub reputation: i32,
    pub ai_seed: i64,
    pub active: bool,
    pub last_assigned_ms: i64,
}

// Per-match assignment of officials
#[table(name = match_official_assignment, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct MatchOfficialAssignment {
    #[primary_key]
    pub match_id: String, // refers to pvp_match.id
    pub referee_id: String,
    pub assistant_left_id: String,
    pub assistant_right_id: String,
    pub var_id: Option<String>,
    pub assigned_at_ms: i64,
}

// Optional commentary log (alternatively use Event)
#[table(name = commentary_log, public)]
#[derive(Clone, Serialize, Deserialize)]
pub struct CommentaryLog {
    #[primary_key]
    pub id: String,
    pub match_id: String,
    pub ts_ms: i64,
    pub tone: String, // calm|enthusiastic|critical|dramatic
    pub lang: String,
    pub text: String,
    pub meta_json: String,
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
 
 #[table(name = transaction_used, public)]
 #[derive(Clone, Serialize, Deserialize)]
 pub struct TransactionUsed {
     #[primary_key]
     pub tx_hash: String,
     pub used_at_ms: i64,
     pub used_by_fid: i64,
     pub endpoint: String,
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

fn on_item_transferred(ctx: &ReducerContext, item_id: &str, to_fid: i64) {
    // Update owner in npc_registry or squad_registry based on inventory_item.item_type
    if let Some(item) = ctx.db().inventory_item().item_id().find(&item_id.to_string()) {
        match item.item_type.as_str() {
            "npc_manager" => {
                // find npc by token_id
                let tbl = ctx.db().npc_registry();
                for mut n in tbl.iter() {
                    if n.token_id.as_deref() == Some(&item_id.to_string()) {
                        n.owner_fid = Some(to_fid);
                        tbl.npc_fid().update(n);
                        break;
                    }
                }
            }
            "squad" => {
                let tbl = ctx.db().squad_registry();
                for mut s in tbl.iter() {
                    if s.token_id == item_id {
                        s.owner_fid = to_fid;
                        tbl.squad_id().update(s);
                        break;
                    }
                }
            }
            _ => {}
        }
    }
}
 
 fn append_event(ctx: &ReducerContext, ty: &str, actor_fid: i64, payload_json: String, topic_id: Option<String>) -> Event {
     let id = new_id(ctx, "evt", &format!("{}:{}:{:?}", ty, actor_fid, topic_id));
     let e = Event { id: id.clone(), ts_ms: now_ms(ctx), kind: ty.to_string(), actor_fid, topic_id, payload_json };
     ctx.db().event().insert(e.clone());
     e
 }
 
 fn have_pending_pvp_between(ctx: &ReducerContext, a: i64, b: i64) -> bool {
     // Naive scan for existing pending challenge between the same pair (either direction)
     // Acceptable for small datasets; replace with indexed lookup if available in future.
     let tbl = ctx.db().pvp_match();
     // SAFETY: Table iteration is deterministic within reducer execution.
     for m in tbl.iter() {
         if m.status == "pending" &&
            ((m.challenger_fid == a && m.challenged_fid == b) || (m.challenger_fid == b && m.challenged_fid == a)) {
             return true;
         }
     }
     false
 }
 
 fn validate_pvp_result_json(json: &str) -> Result<(), &'static str> {
     let v: serde_json::Value = serde_json::from_str(json).map_err(|_| "invalid_json")?;
     let home = v.get("home").and_then(|x| x.as_i64()).ok_or("missing_home")?;
     let away = v.get("away").and_then(|x| x.as_i64()).ok_or("missing_away")?;
     if home < 0 || away < 0 { return Err("negative_score"); }
     if home > 20 || away > 20 { return Err("score_out_of_range"); }
     Ok(())
 }
 
 #[reducer]
 pub fn link_wallet(ctx: &ReducerContext, fid: i64, address: String) {
     let now = now_ms(ctx);
     let users = ctx.db().user();
     match users.fid().find(&fid) {
        Some(mut u) => { u.wallet = Some(address.clone()); users.fid().update(u); },
        None => {
            users.insert(User {
                fid,
                wallet: Some(address.clone()),
                created_at_ms: now,
                is_npc: false,
                elo: 1000,
                display_name: None,
                ai_persona_json: None,
            });
        }
     }
     let link = WalletLink { address: normalize(&address), fid, linked_at_ms: now };
     let wl = ctx.db().wallet_link();
     if wl.address().find(&link.address).is_some() { wl.address().delete(&link.address); }
     wl.insert(link);
 }
 
 #[reducer]
 pub fn grant_starter_pack(ctx: &ReducerContext, fid: i64, players_json: String) {
    // Parse and validate payload FIRST to avoid partial writes on bad input
    let payload: StarterPackPayload = match serde_json::from_str(&players_json) {
        Ok(p) => p,
        Err(_) => panic!("invalid_payload"),
    };
    if payload.players.is_empty() { panic!("no_players"); }

    if ctx.db().starter_claim().fid().find(&fid).is_some() { panic!("starter_already_claimed"); }

    let now = now_ms(ctx);
   // Record the claim only after validation
    ctx.db().starter_claim().insert(StarterClaim { fid, claimed_at_ms: now });

    // Store a canonical JSON form of the payload in the event for reliable consumers
    let evt_payload = serde_json::to_string(&payload).unwrap_or_else(|_| players_json.clone());
    let evt = append_event(ctx, "starter_pack_granted", fid, evt_payload, None);

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
    on_item_transferred(ctx, &l.item_id, buyer_fid);
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
    on_item_transferred(ctx, &a.item_id, buyer_fid);
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
    on_item_transferred(ctx, &a.item_id, winner_fid);
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
     if have_pending_pvp_between(ctx, challenger_fid, challenged_fid) { panic!("duplicate_pending"); }
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
     if let Err(code) = validate_pvp_result_json(&result_json) { panic!("{}", code); }
     m.status = "finalized".into();
     m.result_json = Some(result_json.clone());
     tbl.id().update(m.clone());
     append_event(ctx, "pvp_result_submitted", reporter_fid, result_json, Some(match_id));
 }
 
 #[reducer]
 pub fn mark_tx_used(ctx: &ReducerContext, tx_hash: String, fid: i64, endpoint: String) {
     let tx_table = ctx.db().transaction_used();
     // Idempotency: panic if already used
     if tx_table.tx_hash().find(&tx_hash).is_some() {
         panic!("tx_already_used");
     }
     // Mark transaction as used
     tx_table.insert(TransactionUsed {
         tx_hash,
         used_at_ms: now_ms(ctx),
         used_by_fid: fid,
         endpoint,
     });
 }

// --- NPC & Squad Reducers ---

#[reducer]
pub fn npc_create(
    ctx: &ReducerContext,
    npc_fid: i64,
    display_name: String,
    ai_seed: i64,
    difficulty_tier: i16,
    budget_fbc_wei: String,
    persona_json: String,
) {
    let now = now_ms(ctx);

    // Upsert user with NPC flags
    let users = ctx.db().user();
    match users.fid().find(&npc_fid) {
        Some(mut u) => {
            u.is_npc = true;
            u.display_name = Some(display_name.clone());
            u.ai_persona_json = Some(persona_json.clone());
            users.fid().update(u);
        }
        None => {
            users.insert(User {
                fid: npc_fid,
                wallet: None,
                created_at_ms: now,
                is_npc: true,
                elo: 1000,
                display_name: Some(display_name.clone()),
                ai_persona_json: Some(persona_json.clone()),
            });
        }
    }

    // Upsert NPC registry row
    let tbl = ctx.db().npc_registry();
    match tbl.npc_fid().find(&npc_fid) {
        Some(mut n) => {
            n.ai_seed = ai_seed;
            n.difficulty_tier = difficulty_tier;
            n.budget_fbc_wei = budget_fbc_wei.clone();
            n.persona = persona_json;
            n.manager_confidence = 50;
            n.pressure_level = 0;
            n.mood = "calm".to_string();
            n.next_decision_at_ms = now;
            n.last_active_ms = now;
            n.active = true;
            tbl.npc_fid().update(n);
        }
        None => {
            tbl.insert(NpcRegistry {
                npc_fid,
                token_id: None,
                ai_seed,
                difficulty_tier,
                budget_fbc_wei,
                persona: display_name, // store display name or persona JSON? keep display name string
                owner_fid: None,
                manager_confidence: 50,
                pressure_level: 0,
                mood: "calm".to_string(),
                next_decision_at_ms: now,
                last_active_ms: now,
                active: true,
            });
        }
    }
}

#[reducer]
pub fn npc_mint_token(ctx: &ReducerContext, npc_fid: i64, owner_fid: i64) {
    let now = now_ms(ctx);
    let token_id = format!("npc-{}", npc_fid);

    // Ensure inventory item exists (idempotent)
    let items = ctx.db().inventory_item();
    if items.item_id().find(&token_id).is_none() {
        let evt = append_event(ctx, "npc_token_minted", owner_fid, format!("{{\"npc_fid\":{}}}", npc_fid), Some(token_id.clone()));
        items.insert(InventoryItem {
            item_id: token_id.clone(),
            owner_fid,
            item_type: "npc_manager".into(),
            acquired_at_ms: now,
            hold_until_ms: 0,
            source_event_id: evt.id,
        });
    }

    // Update registry owner and token id
    if let Some(mut n) = ctx.db().npc_registry().npc_fid().find(&npc_fid) {
        n.owner_fid = Some(owner_fid);
        n.token_id = Some(token_id);
        ctx.db().npc_registry().npc_fid().update(n);
    }
}

#[reducer]
pub fn npc_assign_for_user(ctx: &ReducerContext, user_fid: i64, count: i16) {
    if count <= 0 { return; }

    let now = now_ms(ctx);
    let mut remaining = count as i32;

    // Collect available NPCs (active, no owner)
    let mut available: Vec<NpcRegistry> = Vec::new();
    for n in ctx.db().npc_registry().iter() {
        if n.active && n.owner_fid.is_none() {
            available.push(n);
        }
    }

    if (available.len() as i32) < remaining {
        panic!("insufficient_npc_pool");
    }

    for n in available.into_iter() {
        if remaining <= 0 { break; }
        // Idempotent assignment id
        let assign_id = format!("{}:{}", user_fid, n.npc_fid);
        let aidx = ctx.db().npc_assignment().id();
        if aidx.find(&assign_id).is_none() {
            ctx.db().npc_assignment().insert(NpcAssignment {
                id: assign_id,
                user_fid,
                npc_fid: n.npc_fid,
                assigned_at_ms: now,
            });
        }
        // Mint token to user if needed
        let token_id = format!("npc-{}", n.npc_fid);
        let items = ctx.db().inventory_item();
        if items.item_id().find(&token_id).is_none() {
            let evt = append_event(ctx, "npc_assigned", user_fid, format!("{{\"npc_fid\":{}}}", n.npc_fid), Some(token_id.clone()));
            items.insert(InventoryItem {
                item_id: token_id.clone(),
                owner_fid: user_fid,
                item_type: "npc_manager".into(),
                acquired_at_ms: now,
                hold_until_ms: 0,
                source_event_id: evt.id,
            });
        }
        // Update registry owner
        if let Some(mut row) = ctx.db().npc_registry().npc_fid().find(&n.npc_fid) {
            row.owner_fid = Some(user_fid);
            row.token_id = Some(token_id);
            ctx.db().npc_registry().npc_fid().update(row);
        }
        remaining -= 1;
    }
}

#[reducer]
pub fn npc_update_state(
    ctx: &ReducerContext,
    npc_fid: i64,
    next_decision_at_ms: i64,
    budget_fbc_wei: String,
) {
    if let Some(mut n) = ctx.db().npc_registry().npc_fid().find(&npc_fid) {
        n.next_decision_at_ms = next_decision_at_ms;
        n.budget_fbc_wei = budget_fbc_wei;
        n.last_active_ms = now_ms(ctx);
        ctx.db().npc_registry().npc_fid().update(n);
    }
}

// --- Player State Reducers (stubs) ---

#[reducer]
pub fn player_profile_init(
    _ctx: &ReducerContext,
    _player_id: String,
    _age_years: i16,
    _morale: i32,
    _fatigue: i32,
    _satisfaction: i32,
    _loyalty: i32,
) { unimplemented!("player_profile_init not implemented yet"); }

#[reducer]
pub fn player_state_apply_match(
    _ctx: &ReducerContext,
    _player_id: String,
    _minutes_played: i32,
    _benched: bool,
    _result: String,
    _events_json: String,
) { unimplemented!("player_state_apply_match not implemented yet"); }

#[reducer]
pub fn player_state_recover_tick(_ctx: &ReducerContext, _now_ms: i64) {
    unimplemented!("player_state_recover_tick not implemented yet");
}

#[reducer]
pub fn player_age_tick(_ctx: &ReducerContext) { unimplemented!("player_age_tick not implemented yet"); }

// --- Officials & Commentary Reducers (stubs) ---

#[reducer]
pub fn official_create(
    _ctx: &ReducerContext,
    _role: String,
    _ai_seed: i64,
    _strictness: i32,
    _advantage_tendency: i32,
    _offside_tolerance: i32,
    _var_propensity: i32,
    _consistency: i32,
    _fitness: i32,
    _reputation: i32,
) { unimplemented!("official_create not implemented yet"); }

#[reducer]
pub fn official_assign_to_match(
    _ctx: &ReducerContext,
    _match_id: String,
    _referee_id: String,
    _assistant_left_id: String,
    _assistant_right_id: String,
    _var_id: Option<String>,
) { unimplemented!("official_assign_to_match not implemented yet"); }

#[reducer]
pub fn official_update_after_match(
    _ctx: &ReducerContext,
    _official_id: String,
    _fitness_delta: i32,
    _reputation_delta: i32,
    _consistency_delta: i32,
) { unimplemented!("official_update_after_match not implemented yet"); }

#[reducer]
pub fn var_review_record(
    _ctx: &ReducerContext,
    _match_id: String,
    _ts_ms: i64,
    _decision: String,
    _reason: String,
    _meta_json: String,
) { unimplemented!("var_review_record not implemented yet"); }

#[reducer]
pub fn commentary_append(
    _ctx: &ReducerContext,
    _match_id: String,
    _ts_ms: i64,
    _tone: String,
    _lang: String,
    _text: String,
    _meta_json: String,
) { unimplemented!("commentary_append not implemented yet"); }
