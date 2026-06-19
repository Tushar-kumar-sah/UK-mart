import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ✅ Prevents static generation at build time
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, nameHi, nameBn, parentId, image, sortOrder } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const category = await db.category.create({
      data: {
        name,
        nameHi: nameHi || '',
        nameBn: nameBn || '',
        parentId: parentId || null,
        image: image || null,
        sortOrder: sortOrder || 0,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Category create error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, nameHi, nameBn, parentId, image, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const category = await db.category.update({
      where: { id },
      data: {
        name,
        nameHi,
        nameBn,
        parentId: parentId ?? null,   // ✅ allow moving a category to a different parent
        image,
        isActive,
        sortOrder,
      },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error('Category update error:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use a transaction to delete everything safely
    const result = await db.$transaction(async (tx) => {
      // 1. Recursively collect all descendant category IDs
      async function collectDescendantIds(parentId: string): Promise<string[]> {
        const children = await tx.category.findMany({
          where: { parentId },
          select: { id: true },
        });
        let ids: string[] = [];
        for (const child of children) {
          const childIds = await collectDescendantIds(child.id);
          ids = ids.concat(childIds, child.id);
        }
        return ids;
      }

      const descendantIds = await collectDescendantIds(id);
      const allCategoryIds = [...descendantIds, id];

      // 2. Find all products belonging to any of these categories
      const products = await tx.product.findMany({
        where: {
          OR: [
            { categoryId: { in: allCategoryIds } },
            { subcategoryId: { in: allCategoryIds } },
          ],
        },
        select: { id: true },
      });
      const productIds = products.map((p) => p.id);

      // 3. Delete order items for these products (FK constraint)
      if (productIds.length > 0) {
        await tx.orderItem.deleteMany({
          where: { productId: { in: productIds } },
        });
      }

      // 4. Delete the products themselves
      if (productIds.length > 0) {
        await tx.product.deleteMany({
          where: { id: { in: productIds } },
        });
      }

      // 5. Delete categories (children first, then parent)
      for (const catId of allCategoryIds) {
        await tx.category.delete({ where: { id: catId } });
      }

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Category delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category. It may have linked products or subcategories.' },
      { status: 500 }
    );
  }
}