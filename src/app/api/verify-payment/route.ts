import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      // order data
      userId,
      items,
      totalAmount,
      discountAmount,
      finalAmount,
      customerName,
      customerPhone,
      deliveryAddress,
      pincode,
      notes,
      paymentMethod = 'RAZORPAY',
    } = body;

    // 1. Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // 2. Create order in database
    if (!customerName || !customerPhone || !deliveryAddress || !items?.length) {
      return NextResponse.json(
        { error: 'Missing order fields' },
        { status: 400 }
      );
    }

    const parsedTotal = parseFloat(totalAmount) || 0;
    const parsedDiscount = parseFloat(discountAmount) || 0;
    const parsedFinal = parseFloat(finalAmount) || parsedTotal - parsedDiscount;

    const order = await db.order.create({
      data: {
        userId: userId || 'guest',
        totalAmount: parsedTotal,
        discountAmount: parsedDiscount,
        finalAmount: parsedFinal,
        customerName,
        customerPhone,
        deliveryAddress,
        pincode: pincode || null,
        notes: notes || null,
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: parseFloat(item.quantity) || 0,
            unit: item.unit || 'piece',
            pricePerUnit: parseFloat(item.pricePerUnit) || 0,
            totalPrice: parseFloat(item.totalPrice) || 0,
          })),
        },
      },
      include: { items: true },
    });

    // 3. Update stock
    for (const item of items) {
      const productId = item.productId;
      const qty = parseFloat(item.quantity) || 0;
      if (productId && qty > 0) {
        await db.product.update({
          where: { id: productId },
          data: { stock: { decrement: qty } },
        });
      }
    }

    // 4. Update user info if logged in
    if (userId && userId !== 'guest') {
      await db.user.update({
        where: { id: userId },
        data: {
          phone: customerPhone,
          address: deliveryAddress,
        },
      });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}