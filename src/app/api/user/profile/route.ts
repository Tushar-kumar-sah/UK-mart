import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { normalizePhone, isValidIndianPhone } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userEmail = session.user.email;

    const user = await db.user.findFirst({
      where: {
        OR: [
          ...(userId ? [{ id: userId }] : []),
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userEmail = session.user.email;
    const body = await req.json();
    const { name, phone, address } = body;

    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          ...(userId ? [{ id: userId }] : []),
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: Record<string, any> = {};

    if (name && typeof name === "string" && name.trim().length >= 2) {
      updateData.name = name.trim();
    }

    if (address && typeof address === "string") {
      updateData.address = address.trim();
    }

    if (phone && typeof phone === "string" && phone.trim().length > 0) {
      if (!isValidIndianPhone(phone)) {
        return NextResponse.json(
          { error: "Please enter a valid 10-digit Indian phone number" },
          { status: 400 }
        );
      }
      const cleanPhone = normalizePhone(phone);
      // Check if another user already has this phone
      const phoneTaken = await db.user.findFirst({
        where: {
          phone: cleanPhone,
          id: { not: existingUser.id },
        },
      });
      if (phoneTaken) {
        return NextResponse.json(
          { error: "This phone number is already registered to another user" },
          { status: 409 }
        );
      }
      updateData.phone = cleanPhone;
    }

    const updatedUser = await db.user.update({
      where: { id: existingUser.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        avatar: true,
        role: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
