import jwt from 'jsonwebtoken';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getUserFromToken(token: string) {
  const payload = verifyToken(token);
  if (!payload) return null;
  return db.user.findUnique({ where: { id: payload.userId } });
}

export async function createOrUpdateUser(data: {
  googleId?: string;
  email: string;
  name: string;
  avatar?: string;
}) {
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return db.user.update({
      where: { id: existing.id },
      data: { name: data.name, avatar: data.avatar || existing.avatar, googleId: data.googleId || existing.googleId },
    });
  }
  return db.user.create({ data });
}