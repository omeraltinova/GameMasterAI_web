import { LoginForm } from "@/components/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";
import { Sword } from "lucide-react";

export const metadata = {
  title: "Giriş Yap - GameMaster AI",
  description: "GameMaster AI hesabınıza giriş yapın",
};

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 p-3 rounded-xl bg-primary/10 w-fit">
          <Sword className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Hoş Geldiniz</CardTitle>
        <CardDescription>
          Maceraya devam etmek için giriş yapın
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}


