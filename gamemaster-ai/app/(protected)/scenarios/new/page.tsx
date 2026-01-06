
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScenarioForm } from "@/components/scenario/ScenarioForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";

export default function NewScenarioPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push("/scenarios");
        router.refresh();
      } else {
        console.error("Failed to create scenario");
        alert("Senaryo oluşturulurken bir hata oluştu.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-3xl py-8 animate-fade-in space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
           <h1 className="text-3xl font-bold">Yeni Senaryo Oluştur</h1>
           <p className="text-muted-foreground">Kendi dünyanı ve hikayeni tasarla</p>
        </div>
      </div>

      <ScenarioForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
