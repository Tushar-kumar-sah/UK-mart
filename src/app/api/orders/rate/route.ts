import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Use the default session (or import authOptions if you have a custom config)
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TypeScript: session.user doesn't have 'id' by default; cast to any.
    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    const { orderId, rating, review } = await request.json();

    if (!orderId || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating data' }, { status: 400 });
    }

    // Verify the order belongs to the user and is DELIVERED
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { userId: true, status: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (order.status !== 'DELIVERED') {
      return NextResponse.json({ error: 'You can only rate delivered orders' }, { status: 400 });
    }

    // Upsert the rating – now db.rating should exist after `prisma generate`
    const upserted = await db.rating.upsert({
      where: { orderId },
      update: { rating, review },
      create: {
        orderId,
        userId,
        rating,
        review,
      },
    });

    return NextResponse.json({ success: true, rating: upserted });
  } catch (error) {
    console.error('Rating API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}