/**
 * Standart API Hata ve Başarı Yanıt Helper'ları
 * Tüm API route'lar bu helper'ları kullanarak tutarlı yanıt formatı sağlar.
 *
 * Hata formatı:  { success: false, error: string, code?: string }
 * Başarı formatı: { success: true, ...data }
 */

import { NextResponse } from 'next/server';

// ── Hata Yanıt Kodları ─────────────────────────────────────────────────────
export type ErrorCode =
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'BAD_REQUEST'
    | 'VALIDATION_ERROR'
    | 'RATE_LIMITED'
    | 'CONFLICT'
    | 'INTERNAL_ERROR';

// ── Genel API Hata Yanıtı ──────────────────────────────────────────────────
export function apiError(
    error: string,
    status: number,
    code?: ErrorCode
) {
    return NextResponse.json(
        { success: false, error, ...(code && { code }) },
        { status }
    );
}

// ── Genel API Başarı Yanıtı ────────────────────────────────────────────────
export function apiSuccess(data: Record<string, unknown> = {}) {
    return NextResponse.json({ success: true, ...data });
}

// ── Yaygın Hata Yanıtları ──────────────────────────────────────────────────

/** 400 Bad Request */
export function badRequestError(message: string = 'Geçersiz istek') {
    return apiError(message, 400, 'BAD_REQUEST');
}

/** 401 Unauthorized */
export function unauthorizedError(message: string = 'Oturum açmanız gerekiyor') {
    return apiError(message, 401, 'UNAUTHORIZED');
}

/** 403 Forbidden */
export function forbiddenError(message: string = 'Bu işlem için yetkiniz yok') {
    return apiError(message, 403, 'FORBIDDEN');
}

/** 404 Not Found */
export function notFoundError(message: string = 'Kaynak bulunamadı') {
    return apiError(message, 404, 'NOT_FOUND');
}

/** 409 Conflict */
export function conflictError(message: string = 'Çakışma oluştu') {
    return apiError(message, 409, 'CONFLICT');
}

/** 429 Rate Limited */
export function rateLimitedError(message: string = 'İstek limiti aşıldı. Lütfen biraz sonra tekrar deneyin.') {
    return apiError(message, 429, 'RATE_LIMITED');
}

/** 500 Internal Server Error */
export function internalError(message: string = 'Sunucu hatası oluştu') {
    return apiError(message, 500, 'INTERNAL_ERROR');
}
