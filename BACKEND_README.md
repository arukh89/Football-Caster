# Football Caster Backend (SpacetimeDB)

## Architecture Overview

Football Caster is a contractless, event-sourced backend using:

- Next.js API routes (Node.js runtime)
- SpacetimeDB as the sole database (generated bindings in `src/spacetime_module_bindings` — do not edit)
- Base mainnet (chainId 8453) for on-chain verification only

Key principles:
- Currency: FBC (Base)
- $1 strict entry in FBC
- Event-sourced: reducers append events; queries read tables/views
- Dev FID bypass: 250704 exempt from fees/hold

## SpacetimeDB Schema (selected tables)

- `event`: kind, tsMs, payloadJson, actor_fid, ...
- `inbox`: kind, created_at_ms, read_at_ms, fid, msg_id, title, body
- `inventory_item`: owner_fid, item_id, item_type, hold_until_ms
- `listing`: id, item_id, seller_fid, price_wei, status, created_at_ms
- `auction`: reserve_wei, ends_at_ms, created_at_ms, top_bid_wei, buy_now_wei, anti_snipe_used

Note: Client queries may alias snake_case → camelCase when needed (e.g., `payload_json AS payloadJson`). Never edit files under `src/spacetime_module_bindings`; adjust Rust module and regenerate if schema changes.

## API Surface (high level)

- Auth: link Farcaster FID ↔ wallet; dev FID 250704 bypass
- Starter: quote ($1) and verify → grants starter pack
- Market: list, buy; hold period enforced (7 days; dev FID exempt)
- Auctions: create, bid (+2% or 1 FBC min inc), anti‑snipe (+3m once), finalize
- Inbox: list messages, mark read

## Security

- Auth: Bearer tokens; no PII stored
- On‑chain verification for payments (FBC token, exact amount, parties, confirmations)
- Idempotency: 15‑minute dedupe per signature
- Logging: error‑only, dedup, rate‑limited; no external sinks

## Development

- Package manager: pnpm
- Node: >= 22.11
- Local run:
  - `pnpm install`
  - `pnpm dev`
- Type/lint: `pnpm typecheck`, `pnpm lint`

## Notes

- No SQLite/Postgres — SpacetimeDB only
- Weekly snapshots are derived from existing events and served as static JSON (CDN)
- Base mainnet only (no Sepolia)

