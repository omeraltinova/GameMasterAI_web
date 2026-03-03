"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Uygulama hatası:", error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4"
            style={{ background: "var(--background)" }}>
            <div className="max-w-lg w-full text-center space-y-8 animate-fade-in">
                {/* Icon */}
                <div className="text-7xl select-none" aria-hidden="true">
                    ⚔️
                </div>

                {/* Title */}
                <h1
                    className="text-3xl font-bold gradient-text"
                    style={{ fontFamily: "var(--font-serif, serif)" }}
                >
                    Büyü Ters Tepti!
                </h1>

                {/* Description */}
                <p className="text-lg" style={{ color: "var(--foreground-secondary)" }}>
                    Beklenmedik bir hata oluştu. Macera geçici olarak kesintiye uğradı.
                </p>

                {/* Error details (dev-friendly, no stack trace leak) */}
                <div
                    className="rounded-xl p-4 text-sm text-left"
                    style={{
                        background: "var(--background-tertiary)",
                        border: "1px solid var(--border)",
                        color: "var(--foreground-muted)",
                    }}
                >
                    <p className="font-mono break-all">
                        {error.message || "Bilinmeyen bir hata oluştu"}
                    </p>
                    {error.digest && (
                        <p className="mt-2 text-xs opacity-60">
                            Hata kodu: {error.digest}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer"
                        style={{
                            background: "var(--primary)",
                            color: "var(--primary-foreground)",
                            boxShadow: "var(--glow-primary)",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--primary-hover)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "var(--primary)";
                            e.currentTarget.style.transform = "translateY(0)";
                        }}
                    >
                        🔄 Tekrar Dene
                    </button>

                    <Link
                        href="/"
                        className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 inline-block"
                        style={{
                            background: "var(--background-elevated)",
                            color: "var(--foreground)",
                            border: "1px solid var(--border)",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-hover)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border)";
                            e.currentTarget.style.transform = "translateY(0)";
                        }}
                    >
                        🏠 Ana Sayfaya Dön
                    </Link>
                </div>

                {/* Flavor text */}
                <p className="text-xs italic" style={{ color: "var(--foreground-muted)" }}>
                    &ldquo;Bazen en güçlü büyüler bile başarısız olur...&rdquo;
                </p>
            </div>
        </div>
    );
}
