import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { fid: number; txHash: string };

    // TODO: Implement entry payment verification
    // - Verify transaction on Base chain
    // - Check FBC token transfer to treasury
    // - Create user club record
    // - Return success status

    console.error('Entry payment endpoint called:', body);

    // Placeholder response
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('Entry payment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
