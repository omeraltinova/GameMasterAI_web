import Link from "next/link";
import { Sword, Github, Twitter, GraduationCap } from "lucide-react";

const footerLinks = {
  product: [
    { href: "/", label: "Ana Sayfa" },
    { href: "/demo", label: "Demo" },
  ],
  resources: [
    { href: "/rules", label: "5e SRD Kuralları" },
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
      <div className="container mx-auto px-4 py-12 ">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
          <div className="max-w-xs w-1/2">
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
              AI destekli 5e SRD oyun yöneticisi. Epik maceralar sizi bekliyor!
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com/omeraltinova/GameMasterAI_web"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-background-elevated hover:bg-border transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4 text-foreground-secondary" />
              </a>
            
            </div>
          </div>
          </div>
          <div className="max-w-xs w-1/7">
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
          </div>
          <div className="max-w-xs w-2/4">
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
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border mt-8 pt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/5 border border-accent/20 mb-4">
            <GraduationCap className="h-4 w-4 text-accent" />
            <span className="text-xs text-foreground-secondary">
              Bu proje <strong className="text-accent">eğitim amaçlı</strong> geliştirilmiş bir öğrenci projesidir.
            </span>
          </div>
          <p className="text-sm text-foreground-muted">
            © {new Date().getFullYear()} GameMaster AI. Tüm hakları saklıdır.
          </p>
          <p className="text-xs text-foreground-muted mt-1 max-w-2xl mx-auto leading-relaxed">
            This work includes material taken from the{" "}
            <a
              href="https://dnd.wizards.com/resources/systems-reference-document"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground-secondary transition-colors"
            >
              System Reference Document 5.1
            </a>
            {" "}(&ldquo;SRD 5.1&rdquo;) by Wizards of the Coast LLC and available at{" "}
            <a
              href="https://dnd.wizards.com/resources/systems-reference-document"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground-secondary transition-colors"
            >
              https://dnd.wizards.com/resources/systems-reference-document
            </a>
            . The SRD 5.1 is licensed under the{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/legalcode"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground-secondary transition-colors"
            >
              Creative Commons Attribution 4.0 International License
            </a>
            {" "}available at{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/legalcode"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground-secondary transition-colors"
            >
              https://creativecommons.org/licenses/by/4.0/legalcode
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}

