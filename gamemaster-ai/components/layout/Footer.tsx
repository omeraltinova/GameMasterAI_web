import Link from "next/link";
import { Sword, Github, Twitter } from "lucide-react";

const footerLinks = {
  product: [
    { href: "/", label: "Ana Sayfa" },
    { href: "/about", label: "Hakkında" },
    { href: "/demo", label: "Demo" },
  ],
  resources: [
    { href: "/rules", label: "D&D Kuralları" },
    { href: "/scenarios", label: "Senaryolar" },
  ],
  legal: [
    { href: "#", label: "Gizlilik Politikası" },
    { href: "#", label: "Kullanım Şartları" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-background-secondary">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sword className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold text-lg text-foreground">
                GameMaster<span className="text-primary">AI</span>
              </span>
            </Link>
            <p className="text-sm text-foreground-secondary">
              AI destekli D&D 5e oyun yöneticisi. Epik maceralar sizi bekliyor!
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="p-2 rounded-lg bg-background-elevated hover:bg-border transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4 text-foreground-secondary" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-background-elevated hover:bg-border transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4 text-foreground-secondary" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Ürün</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Kaynaklar</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Yasal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-sm text-foreground-muted">
            © {new Date().getFullYear()} GameMaster AI. Tüm hakları saklıdır.
          </p>
          <p className="text-xs text-foreground-muted mt-1">
            D&D ve Dungeons & Dragons, Wizards of the Coast&apos;un tescilli ticari markalarıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}

