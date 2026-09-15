import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, isValidIndianPhone, normalizePhone } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, password, email } = body;

    // 1. Validate required fields
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Please enter a valid full name (at least 2 characters)" },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    if (!isValidIndianPhone(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit Indian phone number (starting with 6-9)" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const cleanPhone = normalizePhone(phone);

    // 2. Check if phone is already registered
    const existingPhone = await db.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (existingPhone) {
      return NextResponse.json(
        { error: "An account with this phone number already exists. Please log in." },
        { status: 409 }
      );
    }

    // 3. Optional email check
    let cleanEmail: string | null = null;
    if (email && typeof email === "string" && email.trim().length > 0) {
      cleanEmail = email.trim().toLowerCase();
      const existingEmail = await db.user.findUnique({
        where: { email: cleanEmail },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: "This email is already associated with another account." },
          { status: 409 }
        );
      }
    }

    // 4. Hash password and create user
    const hashedPassword = hashPassword(password);

    const newUser = await db.user.create({
      data: {
        name: name.trim(),
        phone: cleanPhone,
        password: hashedPassword,
        email: cleanEmail,
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("User registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
