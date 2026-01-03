"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react"; // <-- Burası useAuth değil signIn olmalı
import { Button, Input } from "@/components/ui";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = "E-posta adresi gerekli";
    if (!formData.password) newErrors.password = "Şifre gerekli";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      // NextAuth signIn fonksiyonu
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        setErrors({ general: "Giriş başarısız. Bilgilerinizi kontrol edin." });
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      setErrors({ general: "Bir hata oluştu." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
          {errors.general}
        </div>
      )}

      <Input
        label="E-posta"
        type="email"
        placeholder="ornek@email.com"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={errors.email}
        leftIcon={<Mail className="h-4 w-4" />}
      />

      <div className="relative">
        <Input
          label="Şifre"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          error={errors.password}
          leftIcon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="rounded border-border" />
          <span className="text-foreground-secondary">Beni hatırla</span>
        </label>
        <Link href="#" className="text-primary hover:underline">
          Şifremi unuttum
        </Link>
      </div>

      <Button type="submit" className="w-full" isLoading={isLoading}>
        Giriş Yap
      </Button>

      <p className="text-center text-sm text-foreground-secondary">
        Hesabınız yok mu?{" "}
        <Link href="/register" className="text-primary hover:underline font-medium">
          Kayıt olun
        </Link>
      </p>
    </form>
  );
}