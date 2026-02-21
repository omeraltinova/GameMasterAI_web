"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
  Button,
} from "@/components/ui";
import { Lock, Save, Shield } from "lucide-react";

interface SecurityTabProps {
  onPasswordChange: (form: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<void>;
  isChangingPassword: boolean;
}

export function SecurityTab({
  onPasswordChange,
  isChangingPassword,
}: SecurityTabProps) {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onPasswordChange(passwordForm);
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          Güvenlik
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-6">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-5 rounded-xl bg-background-elevated border border-border/50"
        >
          <div className="mb-4">
            <h4 className="font-semibold text-lg mb-1">Şifre Değiştir</h4>
            <p className="text-sm text-foreground-muted">
              Hesabınızın güvenliği için güçlü bir şifre kullanın.
            </p>
          </div>
          <Input
            label="Mevcut Şifre"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) =>
              setPasswordForm((prev) => ({
                ...prev,
                currentPassword: e.target.value,
              }))
            }
            placeholder="Mevcut şifreniz"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Yeni Şifre"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  newPassword: e.target.value,
                }))
              }
              placeholder="Yeni şifreniz"
            />
            <Input
              label="Yeni Şifre (Tekrar)"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              placeholder="Yeni şifrenizi doğrulayın"
            />
          </div>
          <Button
            type="submit"
            isLoading={isChangingPassword}
            className="gap-2 mt-2"
          >
            <Save className="h-4 w-4" />
            Şifreyi Güncelle
          </Button>
        </form>

        <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-xl bg-background-elevated border border-border/50 gap-4">
          <div className="text-center sm:text-left">
            <h4 className="font-semibold text-lg mb-1">
              İki Faktörlü Doğrulama
            </h4>
            <p className="text-sm text-foreground-muted">
              Girişlerde ek güvenlik katmanı
            </p>
          </div>
          <Badge variant="outline" className="px-4 py-1.5 shrink-0">
            Yakında
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
