import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    const { id, name, nameHi, nameBn, image, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const category = await db.category.update({
      where: { id },
      data: { name, nameHi, nameBn, image, isActive, sortOrder },
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

    // Recursively collect all descendant category IDs (leaf-first order)
    async function collectDescendantIds(parentId: string): Promise<string[]> {
      const children = await db.category.findMany({
        where: { parentId },
        select: { id: true },
      });
      const ids: string[] = [];
      for (const child of children) {
        const childIds = await collectDescendantIds(child.id);
        ids.push(...childIds);
        ids.push(child.id);
      }
      return ids;
    }

    // Collect: children (deepest first), then the target category last
    const descendantIds = await collectDescendantIds(id);
    const allCategoryIds = [...descendantIds, id];

    // Find all products in any of these categories (as category or subcategory)
    const products = await db.product.findMany({
      where: {
        OR: [
          { categoryId: { in: allCategoryIds } },
          { subcategoryId: { in: allCategoryIds } },
        ],
      },
      select: { id: true },
    });

    const productIds = products.map((p) => p.id);

    // Delete order items for these products first (FK constraint)
    if (productIds.length > 0) {
      await db.orderItem.deleteMany({
        where: { productId: { in: productIds } },
      });
    }

    // Delete products linked to these categories
    if (productIds.length > 0) {
      await db.product.deleteMany({
        where: { id: { in: productIds } },
      });
    }

    // Delete categories from leaves to root (children before parent)
    for (const catId of allCategoryIds) {
      await db.category.delete({ where: { id: catId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Category delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category. It may have linked products or subcategories.' },
      { status: 500 }
    );
  }
}