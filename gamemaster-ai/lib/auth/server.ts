/**
 * Server-side authentication utilities
 * NextAuth session kullanarak authentication kontrolü yapar
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { Session } from 'next-auth';

/**
 * Kullanıcı session'ını al
 */
export async function getUserSession(req?: NextRequest): Promise<Session | null> {
  try {
    const session = await getServerSession(authOptions);
    return session as Session | null;
  } catch (error) {
    console.error('Session alınamadı:', error);
    return null;
  }
}

/**
 * Kullanıcı ID'sini al (authentication gerekli)
 */
export async function getUserId(req?: NextRequest): Promise<string | null> {
  const session = await getUserSession(req);
  // NextAuth 5'te user objesinden ID'yi al
  const userId = session?.user?.id || null;
  return userId;
}

/**
 * Authentication kontrolü - Giriş yapmamışsa 401 döner
 */
export async function requireAuth(req?: NextRequest): Promise<string> {
  const userId = await getUserId(req);

  if (!userId) {
    throw new Error('Oturum açmanız gerekiyor');
  }

  return userId;
}

/**
 * Unauthorized response döner
 */
export function unauthorizedResponse(message: string = 'Oturum açmanız gerekiyor') {
  return NextResponse.json(
    { success: false, error: message, code: 'UNAUTHORIZED' },
    { status: 401 }
  );
}

/**
 * Forbidden response döner
 */
export function forbiddenResponse(message: string = 'Bu işlem için yetkiniz yok') {
  return NextResponse.json(
    { success: false, error: message, code: 'FORBIDDEN' },
    { status: 403 }
  );
}
