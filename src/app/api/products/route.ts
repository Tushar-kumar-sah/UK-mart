import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============================================================
// GET – fetch all products (for admin)
// ============================================================
export async function GET() {
  try {
    const products = await db.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, nameHi: true, nameBn: true } },
        subcategory: { select: { id: true, name: true, nameHi: true, nameBn: true } },
      },
    });

    return NextResponse.json(products, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Products fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST – create a new product
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name,
      nameHi,
      nameBn,
      description,
      descriptionHi,
      descriptionBn,
      categoryId,
      subcategoryId,
      basePrice,
      baseUnit,
      availableUnits,
      imageUrl,
      stock,
      unitType,
    } = body;

    if (!name?.trim() || !categoryId || basePrice === undefined || basePrice === null) {
      return NextResponse.json(
        { error: 'Name, category, and price are required' },
        { status: 400 }
      );
    }

    const parsedBasePrice = parseFloat(basePrice);
    if (isNaN(parsedBasePrice)) {
      return NextResponse.json(
        { error: 'Invalid base price' },
        { status: 400 }
      );
    }

    // Handle availableUnits – ensure it's a JSON string
    let unitsString = availableUnits;
    if (Array.isArray(availableUnits)) {
      unitsString = JSON.stringify(availableUnits);
    } else if (typeof availableUnits === 'string') {
      try {
        JSON.parse(availableUnits); // if it's valid JSON, it's fine
      } catch {
        // not valid JSON – treat as comma-separated and convert to JSON array
        const parts = availableUnits.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (parts.length > 0) {
          unitsString = JSON.stringify(parts);
        }
      }
    } else {
      unitsString = JSON.stringify(['100g', '250g', '500g', '1kg', '2kg']);
    }

    const product = await db.product.create({
      data: {
        name: name.trim(),
        nameHi: nameHi?.trim() || '',
        nameBn: nameBn?.trim() || '',
        description: description?.trim() || '',
        descriptionHi: descriptionHi?.trim() || '',
        descriptionBn: descriptionBn?.trim() || '',
        categoryId,
        subcategoryId: subcategoryId || null,
        basePrice: parsedBasePrice,
        baseUnit: baseUnit?.trim() || '1kg',
        availableUnits: unitsString,
        imageUrl: imageUrl?.trim() || null,
        stock: parseFloat(stock) || 0,
        unitType: unitType || 'weight',
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Product create error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT – update an existing product
// ============================================================
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};

    const fieldMap: Record<string, (val: any) => any> = {
      name: (v) => v?.trim() || '',
      nameHi: (v) => v?.trim() || '',
      nameBn: (v) => v?.trim() || '',
      description: (v) => v?.trim() || '',
      descriptionHi: (v) => v?.trim() || '',
      descriptionBn: (v) => v?.trim() || '',
      categoryId: (v) => v,
      subcategoryId: (v) => v || null,
      basePrice: (v) => {
        const num = parseFloat(v);
        if (isNaN(num)) throw new Error('Invalid base price');
        return num;
      },
      baseUnit: (v) => v?.trim() || '1kg',
      availableUnits: (v) => {
        if (!v) return JSON.stringify(['100g', '250g', '500g', '1kg', '2kg']);
        if (Array.isArray(v)) return JSON.stringify(v);
        if (typeof v === 'string') {
          try {
            JSON.parse(v);
            return v;
          } catch {
            const parts = v.split(',').map((s: string) => s.trim()).filter(Boolean);
            return JSON.stringify(parts);
          }
        }
        return JSON.stringify(['100g', '250g', '500g', '1kg', '2kg']);
      },
      imageUrl: (v) => v?.trim() || null,
      stock: (v) => parseFloat(v) || 0,
      unitType: (v) => v || 'weight',
      isActive: (v) => v !== false,
    };

    for (const [key, transform] of Object.entries(fieldMap)) {
      if (fields[key] !== undefined) {
        try {
          updateData[key] = transform(fields[key]);
        } catch (err) {
          // ✅ fixed: cast err to Error
          return NextResponse.json(
            { error: `Invalid value for field '${key}': ${(err as Error).message}` },
            { status: 400 }
          );
        }
      }
    }

    updateData.updatedAt = new Date();

    const product = await db.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Product update error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE – remove a product
// ============================================================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    await db.orderItem.deleteMany({
      where: { productId: id },
    });

    await db.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Product delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}