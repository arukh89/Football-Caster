# Football Caster - Deployment Guide

## 🔒 Security Fixes Implemented

This deployment includes critical security fixes from the December 4, 2025 audit:

- ✅ **CRIT-2**: Treasury address validation (prevents fund loss)
- ✅ **CRIT-3**: Transaction replay protection (prevents exploit)
- ✅ **HIGH-4**: Increased confirmation depth to 10 blocks
- ✅ **HIGH-5**: Production auth guards
- ✅ Error boundary for runtime error handling

---

## 📋 Prerequisites

### Required Software
- Node.js 18+ and pnpm 10+
- SpacetimeDB CLI (for schema deployment)
- Git
- Base network RPC access (Alchemy/Infura recommended)

### Required Accounts
- Vercel account (for deployment)
- SpacetimeDB instance (hosted or local)
- Base wallet with treasury address
- Farcaster account (for Mini App registration)

---

## 🚀 Deployment Steps

### 1. Environment Configuration

Create `.env.production` with the following **REQUIRED** variables:

```bash
# ⚠️ CRITICAL: These MUST be set or deployment will fail

# Treasury address (REQUIRED - deployment fails if missing/zero)
NEXT_PUBLIC_TREASURY_ADDRESS=0xYourTreasuryAddressHere

# FBC Token Contract
NEXT_PUBLIC_FBC_ADDRESS=0xcb6e9f9bab4164eaa97c982dee2d2aaffdb9ab07

# Base Chain RPC (HIGHLY RECOMMENDED - use your own endpoint)
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# SpacetimeDB Connection
SPACETIMEDB_URI=wss://your-instance.spacetimedb.com
SPACETIMEDB_MODULE=footballcaster2

# Farcaster Integration
NEXT_PUBLIC_DEV_FID=250704

# Optional: Starter Pack Pricing
NEXT_PUBLIC_STARTER_PACK_PRICE_USD=1
```

### 2. SpacetimeDB Schema Deployment

The new schema includes transaction replay protection:

```bash
# Navigate to Rust server directory
cd spacetime-server/rust/footballcaster2

# Build the module
cargo build --release --target wasm32-unknown-unknown

# Deploy to SpacetimeDB
spacetime publish footballcaster2 \
  --project-path . \
  --clear-database  # ⚠️ Only for fresh deployments

# Verify deployment
spacetime logs footballcaster2
```

**New Tables Added:**
- `transaction_used`: Tracks used transaction hashes to prevent replay attacks

**New Reducers Added:**
- `mark_tx_used`: Atomically marks transaction as used

### 3. Treasury Address Setup

⚠️ **CRITICAL**: The application will NOT build without a valid treasury address.

```bash
# Verify treasury address is a valid Ethereum address
# Format: 0x followed by 40 hexadecimal characters
# Example: 0x1234567890abcdef1234567890abcdef12345678

# Test validation locally
pnpm build
# Should succeed if treasury address is set correctly
# Should fail with clear error if missing/invalid
```

**Treasury Address Requirements:**
- Must be a valid Ethereum address (0x + 40 hex chars)
- Cannot be zero address (0x0000...0000)
- Should be a wallet you control
- Recommended: Use a multi-sig wallet for security

### 4. Build & Test Locally

```bash
# Install dependencies with frozen lockfile
pnpm install --frozen-lockfile

# Run linting
pnpm lint

# Build for production
pnpm build

# Run locally to test
pnpm dev
```

**Expected Build Behavior:**
- ✅ Build succeeds when `NEXT_PUBLIC_TREASURY_ADDRESS` is set
- ❌ Build fails with clear error if treasury address missing/invalid
- This is **intentional security behavior** to prevent misconfiguration

### 5. Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Set environment variables in Vercel dashboard or CLI
vercel env add NEXT_PUBLIC_TREASURY_ADDRESS production
vercel env add BASE_RPC_URL production
vercel env add SPACETIMEDB_URI production

# Deploy
vercel --prod
```

**Vercel Environment Variables:**
1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.production`
3. Ensure `NEXT_PUBLIC_TREASURY_ADDRESS` is set for Production environment
4. Save and redeploy

### 6. Post-Deployment Verification

#### A. Test Treasury Validation
```bash
# This should return 200 with treasury address
curl https://your-app.vercel.app/api/health

# Verify treasury is not zero address in logs
```

#### B. Test Transaction Replay Protection
```bash
# Attempt to use same txHash twice (should fail second time)
curl -X POST https://your-app.vercel.app/api/starter/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"txHash":"0xSAME_HASH"}'

# First call: Should succeed (if payment valid)
# Second call: Should return 409 Conflict "Transaction hash already used"
```

#### C. Test Confirmation Depth
```bash
# Submit transaction that has <10 confirmations
# Should receive: "Insufficient confirmations: X/10"
```

#### D. Verify Error Boundary
```bash
# Force an error in dev mode
# Should display friendly error UI, not white screen
```

---

## 🔄 Migration Guide (Existing Deployments)

If you're upgrading from a previous version:

### Step 1: Backup Current Data
```bash
# Export current SpacetimeDB data
spacetime sql footballcaster2 "SELECT * FROM inventory_item" > backup_inventory.sql
spacetime sql footballcaster2 "SELECT * FROM listing" > backup_listings.sql
spacetime sql footballcaster2 "SELECT * FROM auction" > backup_auctions.sql
```

### Step 2: Update SpacetimeDB Schema
```bash
# Option A: Migrate in place (preserves data)
cd spacetime-server/rust/footballcaster2
spacetime publish footballcaster2 --upgrade

# Option B: Fresh deployment (data loss)
spacetime publish footballcaster2 --clear-database
```

### Step 3: Update Environment Variables
```bash
# Add treasury address to production
vercel env add NEXT_PUBLIC_TREASURY_ADDRESS production

# Update confirmation requirements (optional)
vercel env add TX_CONFIRMATIONS 10 production
```

### Step 4: Redeploy Application
```bash
git push origin main  # Triggers Vercel deployment
```

---

## ⚠️ Security Checklist

Before going to production, verify:

- [ ] `NEXT_PUBLIC_TREASURY_ADDRESS` is set and valid
- [ ] Treasury address is NOT the zero address
- [ ] You control the private keys for treasury address
- [ ] Base RPC URL is from a reliable provider (not public endpoint)
- [ ] SpacetimeDB schema includes `transaction_used` table
- [ ] `mark_tx_used` reducer is deployed
- [ ] Error boundary displays correctly on test errors
- [ ] Transaction confirmations set to 10+ blocks
- [ ] No `.env` files committed to git
- [ ] All payment endpoints use `requireAuth` middleware
- [ ] Rate limiting configured (Vercel/Cloudflare)

---

## 🐛 Troubleshooting

### Build Fails: "CRITICAL: NEXT_PUBLIC_TREASURY_ADDRESS must be configured"

**Cause**: Treasury address not set or is zero address.

**Fix:**
```bash
# Set treasury address in .env or Vercel
NEXT_PUBLIC_TREASURY_ADDRESS=0xYourRealAddressHere

# Verify it's set
echo $NEXT_PUBLIC_TREASURY_ADDRESS

# Rebuild
pnpm build
```

### Error: "Transaction hash already used"

**Expected Behavior**: This is the replay protection working correctly.

**Explanation**: Each transaction hash can only be used once. If you see this error, it means the transaction was already processed.

### Error: "Insufficient confirmations: X/10"

**Expected Behavior**: Transaction needs more blockchain confirmations.

**Fix:** Wait for more blocks to be mined (~20 seconds on Base network).

### SpacetimeDB Connection Error

**Symptoms**: App loads but data doesn't update in real-time.

**Fix:**
```bash
# Verify SpacetimeDB is running
spacetime logs footballcaster2

# Check connection string
echo $SPACETIMEDB_URI

# Test connection
curl $SPACETIMEDB_URI/health
```

### Vercel Build Timeout

**Cause**: Build process taking too long.

**Fix:**
```bash
# Clear Next.js cache
rm -rf .next

# Use Vercel's build cache
vercel build --prod

# Check for large dependencies
du -sh node_modules/*  | sort -h
```

---

## 📊 Monitoring & Alerts

### Recommended Monitoring

1. **Error Tracking**: Set up Sentry integration
   ```typescript
   // Add to src/app/layout.tsx
   import * as Sentry from "@sentry/nextjs";
   Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN });
   ```

2. **Transaction Monitoring**: Track replay attempt logs
   ```bash
   # Monitor for replay attempts
   vercel logs --filter "Transaction hash already used"
   ```

3. **RPC Monitoring**: Track Base RPC call limits
   ```bash
   # Check RPC usage in Alchemy/Infura dashboard
   ```

### Key Metrics to Track

- Transaction replay attempts (should be rare if not zero)
- Treasury address validation failures
- Confirmation timeout rates
- Error boundary activation rate
- SpacetimeDB connection uptime

---

## 🔐 Security Best Practices

1. **Treasury Management**
   - Use a multi-sig wallet for treasury
   - Set up spending limits
   - Monitor treasury transactions daily

2. **RPC Security**
   - Use private RPC endpoints
   - Rotate API keys quarterly
   - Enable rate limiting

3. **Access Control**
   - Limit who can deploy to production
   - Use Vercel's team features for access control
   - Enable 2FA on all accounts

4. **Backup Strategy**
   - Daily SpacetimeDB backups
   - Test restore procedure monthly
   - Keep 30 days of backups

---

## 📞 Support

For issues during deployment:

1. Check this guide's troubleshooting section
2. Review audit report: `reliability-droid-report.html`
3. Check SpacetimeDB logs: `spacetime logs footballcaster2`
4. Review Vercel deployment logs

---

## 📝 Changelog

### v2.0.0 (December 2025) - Security Hardening

**Breaking Changes:**
- `NEXT_PUBLIC_TREASURY_ADDRESS` now required (build fails if missing)
- Transaction confirmations increased from 5 to 10 blocks
- SpacetimeDB schema updated with replay protection

**Added:**
- Transaction replay protection system
- Treasury address validation
- Error boundary component
- Production auth guards
- `stHasEnteredBefore()` API function

**Fixed:**
- CRIT-2: Treasury address can no longer be zero
- CRIT-3: Transaction hashes can only be used once
- HIGH-4: Increased blockchain confirmation depth
- HIGH-5: Dev fallbacks disabled in production

---

## ✅ Deployment Checklist

Use this checklist for each deployment:

```
Pre-Deployment:
[ ] All tests passing locally
[ ] Lint checks pass
[ ] Build succeeds with treasury address set
[ ] SpacetimeDB schema updated
[ ] Environment variables configured in Vercel
[ ] Backup created

Deployment:
[ ] Deploy SpacetimeDB schema
[ ] Deploy to Vercel
[ ] Verify environment variables
[ ] Run smoke tests

Post-Deployment:
[ ] Test treasury validation
[ ] Test replay protection
[ ] Test error boundary
[ ] Verify confirmation depth
[ ] Monitor logs for 1 hour
[ ] Update team on deployment

Rollback Plan:
[ ] Previous version tagged in git
[ ] Rollback command ready: vercel rollback
[ ] Database backup location documented
```

---

Last Updated: December 2025
Version: 2.0.0
