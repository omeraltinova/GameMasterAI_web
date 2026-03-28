"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui";

type MaintenanceStatus = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
};

const defaultStatus: MaintenanceStatus = {
  maintenanceMode: false,
  maintenanceMessage: "",
};

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [status, setStatus] = useState<MaintenanceStatus>(defaultStatus);
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.role === "ADMIN";
  const isBypassPath = pathname === "/login" || pathname.startsWith("/admin");

  useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/system/status");
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted) {
          setStatus({
            maintenanceMode: Boolean(data.maintenanceMode),
            maintenanceMessage: data.maintenanceMessage || "",
          });
        }
      } catch (error) {
        console.error("Maintenance status fetch failed:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <>{children}</>;
  }

  if (status.maintenanceMode && !isAdmin && !isBypassPath) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <div className="max-w-xl space-y-4">
          <h1 className="text-3xl font-bold">Bakım Modu</h1>
          <p className="text-foreground-secondary">
            {status.maintenanceMessage ||
              "Şu anda bakım çalışması yapıyoruz. Lütfen biraz sonra tekrar deneyin."}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Yenile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {status.maintenanceMode && (
        <div className="w-full bg-warning/10 border-b border-warning/30 text-warning-foreground">
          <div className="container mx-auto px-4 py-2 text-sm">
            <span className="font-medium">Bakım Modu:</span>{" "}
            {status.maintenanceMessage || "Sistem bakımdadır, sadece admin erişimi aktif."}
          </div>
        </div>
      )}
      {children}
    </>
  );
}
