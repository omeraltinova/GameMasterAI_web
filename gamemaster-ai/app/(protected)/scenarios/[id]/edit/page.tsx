"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ScenarioForm } from "@/components/scenario/ScenarioForm";
import { Button } from "@/components/ui";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function EditScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [scenario, setScenario] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchScenario = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/scenarios/${id}`);
        if (!res.ok) {
          router.push("/scenarios");
          return;
        }
        const data = await res.json();
        setScenario(data);
      } catch (error) {
        console.error("Scenario fetch failed", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScenario();
  }, [id, router]);

  const handleSubmit = async (data: any) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/scenarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push(`/scenarios/${id}`);
        router.refresh();
      } else {
        alert("Senaryo guncellenemedi.");
      }
    } catch (error) {
      console.error("Scenario update failed", error);
      alert("Bir hata olustu.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-4">Senaryo bulunamadi</h1>
        <Button variant="outline" onClick={() => router.push("/scenarios")}>
          Senaryolara Don
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8 animate-fade-in space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Senaryoyu Duzenle</h1>
          <p className="text-muted-foreground">{scenario.title}</p>
        </div>
      </div>

      <ScenarioForm
        initialData={scenario}
        onSubmit={handleSubmit}
        isLoading={isSaving}
        isEdit
      />
    </div>
  );
}
