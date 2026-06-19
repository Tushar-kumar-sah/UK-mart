import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Run all queries in parallel
    const [
      totalOrders,
      totalRevenue,
      totalProducts,
      totalUsers,
      activeOffers,
      pendingOrders,
      todayRevenue,
      lowStock,
      recentOrders,
      statusBreakdown,
      categoryBreakdown,
    ] = await Promise.all([
      db.order.count(),
      db.order.aggregate({ _sum: { finalAmount: true } }),
      db.product.count({ where: { isActive: true } }),
      db.user.count(),
      db.offer.count({ where: { isActive: true } }),
      db.order.count({ where: { status: 'PENDING' } }),
      db.order.aggregate({
        _sum: { finalAmount: true },
        where: { createdAt: { gte: today } },
      }),
      db.product.count({
        where: { stock: { lte: 50 } },
      }),
      db.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          customerName: true,
          totalAmount: true,
          finalAmount: true,
          status: true,
          createdAt: true,
        },
      }),
      db.order.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      db.product.groupBy({
        by: ['categoryId'],
        _count: { categoryId: true },
      }),
    ]);

    // Build the response object with safe defaults
    const response = {
      totalOrders: totalOrders || 0,
      totalRevenue: totalRevenue._sum?.finalAmount || 0,
      totalProducts: totalProducts || 0,
      totalUsers: totalUsers || 0,
      activeOffers: activeOffers || 0,
      pendingOrders: pendingOrders || 0,
      todayRevenue: todayRevenue._sum?.finalAmount || 0,
      lowStock: lowStock || 0,
      recentOrders: recentOrders || [],
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      categoryBreakdown: categoryBreakdown.map((c) => ({
        categoryId: c.categoryId,
        _count: { categoryId: c._count.categoryId },
      })),
    };

    // Add cache control headers to prevent stale data
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}