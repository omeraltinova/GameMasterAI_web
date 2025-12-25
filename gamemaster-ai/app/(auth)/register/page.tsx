import { RegisterForm } from "@/components/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";
import { Sword } from "lucide-react";

export const metadata = {
  title: "Kayıt Ol - GameMaster AI",
  description: "GameMaster AI'ya katılın ve maceraya başlayın",
};

export default function RegisterPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 p-3 rounded-xl bg-primary/10 w-fit">
          <Sword className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Maceraya Katıl</CardTitle>
        <CardDescription>
          Yeni bir hesap oluşturun ve epik yolculuğa başlayın
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}


