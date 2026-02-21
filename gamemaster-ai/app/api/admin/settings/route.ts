import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSystemSettings, upsertSystemSettings } from "@/lib/admin/systemSettings";
import { logAdminAction } from "@/lib/admin/audit";
import { DEFAULT_AI_REQUESTS_PER_MINUTE } from "@/lib/security/aiRateLimit";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const settings = await getSystemSettings();

    const aiRequestsPerMinute = settings
      ? settings.aiRequestsPerMinute ?? 0
      : DEFAULT_AI_REQUESTS_PER_MINUTE;

    return NextResponse.json({
      maintenanceMode: settings?.maintenanceMode ?? false,
      maintenanceMessage: settings?.maintenanceMessage ?? "",
      aiPrimaryModel: settings?.aiPrimaryModel ?? "",
      aiFallbackModel: settings?.aiFallbackModel ?? "",
      aiSuggestionsModel: (settings as any)?.aiSuggestionsModel ?? "",
      aiRequestsPerMinute,
      updatedAt: settings?.updatedAt ?? null,
    });
  } catch (error) {
    console.error("Sistem ayarları alınamadı:", error);
    return NextResponse.json({ error: "Sistem ayarları alınamadı" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const body = await req.json();
    const aiRequestsPerMinute = Math.max(0, Number(body.aiRequestsPerMinute) || 0);

    const settings = await upsertSystemSettings({
      maintenanceMode: Boolean(body.maintenanceMode),
      maintenanceMessage: body.maintenanceMessage ?? "",
      aiPrimaryModel: body.aiPrimaryModel ?? "",
      aiFallbackModel: body.aiFallbackModel ?? "",
      aiSuggestionsModel: body.aiSuggestionsModel ?? "",
      aiRequestsPerMinute,
      updatedById: session.user.id,
    });

    await logAdminAction({
      adminId: session.user.id,
      action: "SYSTEM_SETTINGS_UPDATE",
      entityType: "SystemSetting",
      entityId: settings.id,
      metadata: {
        maintenanceMode: settings.maintenanceMode,
        aiPrimaryModel: settings.aiPrimaryModel,
        aiFallbackModel: settings.aiFallbackModel,
        aiSuggestionsModel: (settings as any).aiSuggestionsModel,
        aiRequestsPerMinute: settings.aiRequestsPerMinute,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sistem ayarları güncellenemedi:", error);
    return NextResponse.json({ error: "Sistem ayarları güncellenemedi" }, { status: 500 });
  }
}
