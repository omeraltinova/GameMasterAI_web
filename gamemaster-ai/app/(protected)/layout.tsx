"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react"; // <--- Yeni görevli bu
import { Header } from "@/components/layout/Header"; // Tasarım parçası (Aynı kalıyor)
import { Sidebar } from "@/components/layout/Sidebar"; // Tasarım parçası (Aynı kalıyor)
import { Spinner } from "@/components/ui";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  
  // ESKİ KOD: const { isAuthenticated, isLoading } = useAuth();
  // YENİ KOD: NextAuth'dan oturum bilgisini istiyoruz
  const { status } = useSession();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  useEffect(() => {
    // Yükleme bitti ama kişi giriş yapmamışsa -> Login sayfasına gönder
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Yüklenirken dönen yuvarlak (Spinner)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Giriş yapmamışsa (yönlendirilene kadar) boş ekran göster
  if (!isAuthenticated) {
    return null;
  }

  // BURASI TASARIM KISMI - HİÇ DEĞİŞMEDİ
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
