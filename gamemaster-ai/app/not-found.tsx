import Link from "next/link";

export default function NotFound() {
    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: "var(--background)" }}
        >
            <div className="max-w-lg w-full text-center space-y-8 animate-fade-in">
                {/* Icon */}
                <div className="text-7xl select-none" aria-hidden="true">
                    🗺️
                </div>

                {/* 404 Badge */}
                <div
                    className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
                    style={{
                        background: "var(--background-tertiary)",
                        color: "var(--warning)",
                        border: "1px solid var(--border)",
                    }}
                >
                    404
                </div>

                {/* Title */}
                <h1
                    className="text-3xl font-bold gradient-text"
                    style={{ fontFamily: "var(--font-serif, serif)" }}
                >
                    Macera Bulunamadı
                </h1>

                {/* Description */}
                <p className="text-lg" style={{ color: "var(--foreground-secondary)" }}>
                    Aradığınız sayfa mevcut değil veya taşınmış olabilir.
                    Haritada yanlış bir yol izlemiş olabilirsiniz.
                </p>

                {/* Horizontal divider */}
                <div
                    className="flex items-center gap-4 px-8"
                    style={{ color: "var(--foreground-muted)" }}
                >
                    <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                    <span className="text-xs">◆</span>
                    <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/"
                        className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5"
                        style={{
                            background: "var(--primary)",
                            color: "var(--primary-foreground)",
                            boxShadow: "var(--glow-primary)",
                        }}
                    >
                        🏠 Ana Sayfaya Dön
                    </Link>

                    <Link
                        href="/dashboard"
                        className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5"
                        style={{
                            background: "var(--background-elevated)",
                            color: "var(--foreground)",
                            border: "1px solid var(--border)",
                        }}
                    >
                        🎮 Oyun Paneline Git
                    </Link>
                </div>

                {/* Flavor text */}
                <p
                    className="text-xs italic"
                    style={{ color: "var(--foreground-muted)" }}
                >
                    &ldquo;Her kayboluş, yeni bir keşfin başlangıcıdır...&rdquo;
                </p>
            </div>
        </div>
    );
}
