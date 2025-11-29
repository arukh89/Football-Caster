/**
 * POST /api/auth/link
 * Link Farcaster FID to wallet address
 */

import { type NextRequest, NextResponse } from 'next/server';
import { stLinkWallet } from '@/lib/spacetime/api';
import { validate, linkWalletSchema } from '@/lib/middleware/validation';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const validation = validate(linkWalletSchema, body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { fid, wallet } = validation.data;
    await stLinkWallet(fid, wallet);

    // Return simple bearer token for dev: "fid:wallet"
    return NextResponse.json({ success: true, token: `${fid}:${wallet.toLowerCase()}`, fid, wallet: wallet.toLowerCase() });
  } catch (error) {
    console.error('Link wallet error:', error);
    return NextResponse.json(
      { error: 'Failed to link wallet' },
      { status: 500 }
    );
  }
}
