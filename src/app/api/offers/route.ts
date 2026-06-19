import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============================================================
// GET – fetch all offers
// ============================================================
export async function GET() {
  try {
    const offers = await db.offer.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(offers, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Offers fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST – create a new offer
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.name || body.discountValue === undefined || body.discountValue === null) {
      return NextResponse.json(
        { error: 'Name and discount value are required' },
        { status: 400 }
      );
    }

    const now = new Date();
    const offer = await db.offer.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || '',
        discountType: body.discountType || 'PERCENTAGE',
        discountValue: parseFloat(body.discountValue) || 0,
        minOrderAmount: parseFloat(body.minOrderAmount) || 0,
        maxDiscount: body.maxDiscount ? parseFloat(body.maxDiscount) : null,
        isActive: body.isActive !== false,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        // Always set these, even if the model has defaults (helps with type safety)
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json(offer, { status: 201 });
  } catch (error) {
    console.error('Offer create error:', error);
    return NextResponse.json(
      { error: 'Failed to create offer' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT – update an existing offer
// ============================================================
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    // Build update object, only including fields that were sent
    const updateData: Record<string, unknown> = {};

    // Allowed fields and their transformation
    const fieldMap: Record<string, (val: any) => unknown> = {
      name: (v) => v?.trim() || '',
      description: (v) => v?.trim() || '',
      discountType: (v) => v || 'PERCENTAGE',
      discountValue: (v) => (v !== undefined && v !== null ? parseFloat(v) : 0),
      minOrderAmount: (v) => (v !== undefined && v !== null ? parseFloat(v) : 0),
      maxDiscount: (v) => (v ? parseFloat(v) : null),
      isActive: (v) => v !== false,
      startDate: (v) => (v ? new Date(v) : null),
      endDate: (v) => (v ? new Date(v) : null),
    };

    for (const [key, transform] of Object.entries(fieldMap)) {
      if (fields[key] !== undefined) {
        updateData[key] = transform(fields[key]);
      }
    }

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    const offer = await db.offer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(offer);
  } catch (error) {
    console.error('Offer update error:', error);
    return NextResponse.json(
      { error: 'Failed to update offer' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE – remove an offer
// ============================================================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    await db.offer.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Offer delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete offer' },
      { status: 500 }
    );
  }
}