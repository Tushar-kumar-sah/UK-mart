import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const products = await db.product.findMany({
      where: { stock: { lte: 50 } },
      orderBy: { stock: 'asc' },
      include: { category: { select: { name: true } } },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error('Stock fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 });
  }
}