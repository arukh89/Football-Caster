/**
 * Request Validation Schemas
 */

import { z } from 'zod';

// ========== AUTH ==========

export const linkWalletSchema = z.object({
  fid: z.number().int().positive(),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  proof: z.string().optional(),
});

// ========== PRICING ==========

export const quoteSchema = z.object({
  usd: z.string().regex(/^\d+(\.\d+)?$/),
});

// ========== STARTER ==========

export const verifyStarterSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

// ========== MARKETPLACE ==========

export const createListingSchema = z.object({
  itemId: z.string().min(1),
  priceWei: z.string().regex(/^\d+$/),
  expiresAt: z.number().int().positive().optional(),
});

export const buyListingSchema = z.object({
  listingId: z.string().uuid(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

// ========== AUCTIONS ==========

export const createAuctionSchema = z.object({
  itemId: z.string().min(1),
  reserveWei: z.string().regex(/^\d+$/),
  durationH: z.number().int().min(1).max(168).default(48),
  buyNowWei: z.string().regex(/^\d+$/).optional(),
});

export const placeBidSchema = z.object({
  auctionId: z.string().uuid(),
  amountWei: z.string().regex(/^\d+$/),
});

export const finalizeAuctionSchema = z.object({
  auctionId: z.string().uuid(),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

// ========== INBOX ==========

export const markReadSchema = z.object({
  ids: z.array(z.string()),
});

/**
 * Validate request body against schema
 */
export function validate<T>(schema: z.Schema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ') };
    }
    return { success: false, error: 'Validation failed' };
  }
}
