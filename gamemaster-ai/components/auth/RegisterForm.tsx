"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.username) {
      newErrors.username = "Kullanıcı adı gerekli";
    } else if (formData.username.length < 3) {
      newErrors.username = "Kullanıcı adı en az 3 karakter olmalı";
    }

    if (!formData.email) {
      newErrors.email = "E-posta adresi gerekli";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Geçerli bir e-posta adresi girin";
    }

    if (!formData.password) {
      newErrors.password = "Şifre gerekli";
    } else if (formData.password.length < 6) {
      newErrors.password = "Şifre en az 6 karakter olmalı";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Şifre tekrarı gerekli";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Şifreler eşleşmiyor";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await register(formData.email, formData.username, formData.password);
      router.push("/dashboard");
    } catch (error) {
      setErrors({ general: "Kayıt başarısız. Lütfen tekrar deneyin." });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors.general && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
          {errors.general}
        </div>
      )}

      <Input
        label="Kullanıcı Adı"
        type="text"
        placeholder="maceraci123"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        error={errors.username}
        leftIcon={<User className="h-4 w-4" />}
      />

      <Input
        label="E-posta"
        type="email"
        placeholder="ornek@email.com"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={errors.email}
        leftIcon={<Mail className="h-4 w-4" />}
      />

      <Input
        label="Şifre"
        type={showPassword ? "text" : "password"}
        placeholder="••••••••"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        error={errors.password}
        hint="En az 6 karakter"
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

      <Input
        label="Şifre Tekrar"
        type={showConfirmPassword ? "text" : "password"}
        placeholder="••••••••"
        value={formData.confirmPassword}
        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
        error={errors.confirmPassword}
        leftIcon={<Lock className="h-4 w-4" />}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="hover:text-foreground transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />

      <div className="flex items-start gap-2">
        <input type="checkbox" id="terms" className="mt-1 rounded border-border" required />
        <label htmlFor="terms" className="text-sm text-foreground-secondary">
          <Link href="#" className="text-primary hover:underline">
            Kullanım şartlarını
          </Link>{" "}
          ve{" "}
          <Link href="#" className="text-primary hover:underline">
            gizlilik politikasını
          </Link>{" "}
          kabul ediyorum
        </label>
      </div>

      <Button type="submit" className="w-full" isLoading={isLoading}>
        Kayıt Ol
      </Button>

      <p className="text-center text-sm text-foreground-secondary">
        Zaten hesabınız var mı?{" "}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Giriş yapın
        </Link>
      </p>
    </form>
  );
}


