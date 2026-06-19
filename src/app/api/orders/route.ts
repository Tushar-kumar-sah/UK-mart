import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============================================================
// GET – fetch all orders (with optional limit/offset)
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const orders = await db.order.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    const total = await db.order.count();

    return NextResponse.json(
      { orders, total, limit, offset },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST – create a new order
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      items,
      totalAmount,
      discountAmount = 0,
      finalAmount,
      customerName,
      customerPhone,
      deliveryAddress,
      pincode,        // ✅ now supported in schema
      notes,
      paymentMethod = 'UPI',
    } = body;

    // Validation
    if (!customerName || !customerPhone || !deliveryAddress || !items?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: customerName, customerPhone, deliveryAddress, items' },
        { status: 400 }
      );
    }

    if (totalAmount < 2500) {
      return NextResponse.json(
        { error: 'Minimum order amount is ₹2,500' },
        { status: 400 }
      );
    }

    // Parse numbers safely
    const parsedTotal = parseFloat(totalAmount) || 0;
    const parsedDiscount = parseFloat(discountAmount) || 0;
    const parsedFinal = parseFloat(finalAmount) || parsedTotal - parsedDiscount;

    // Create order with items
    const order = await db.order.create({
      data: {
        userId: userId || 'guest',
        totalAmount: parsedTotal,
        discountAmount: parsedDiscount,
        finalAmount: parsedFinal,
        customerName,
        customerPhone,
        deliveryAddress,
        pincode: pincode || null,   // ✅ store pincode if provided
        notes: notes || null,
        paymentMethod,
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

    // Update stock for each product
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

    // Update user info if logged in
    if (userId && userId !== 'guest') {
      await db.user.update({
        where: { id: userId },
        data: {
          phone: customerPhone,
          address: deliveryAddress,
        },
      });
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Order create error:', error);
    return NextResponse.json(
      { error: 'Failed to create order: ' + String(error) },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT – update order status and payment status
// ============================================================
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, paymentStatus, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    // Optionally allow updating delivery details (if needed)
    if (rest.customerName) updateData.customerName = rest.customerName;
    if (rest.customerPhone) updateData.customerPhone = rest.customerPhone;
    if (rest.deliveryAddress) updateData.deliveryAddress = rest.deliveryAddress;
    if (rest.pincode) updateData.pincode = rest.pincode;
    if (rest.notes !== undefined) updateData.notes = rest.notes;

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    const order = await db.order.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE – cancel/delete an order (admin only)
// ============================================================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Optionally, instead of hard delete, you could soft-delete or cancel
    // For now, we hard-delete (only if order status is PENDING or CANCELLED)
    const order = await db.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Prevent deletion of delivered or shipped orders
    if (['SHIPPED', 'DELIVERED'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Cannot delete shipped or delivered orders' },
        { status: 400 }
      );
    }

    // Delete order items first (cascade in Prisma if you have onDelete: Cascade)
    await db.order.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Order delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}