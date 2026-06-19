import { NextRequest, NextResponse } from "next/server";
import { getSystemSettings } from "@/lib/admin/systemSettings";
import { getClientIp, rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limited = await rateLimitResponse(ip, "GET:/api/system/status", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    const settings = await getSystemSettings();

    return NextResponse.json({
      maintenanceMode: settings?.maintenanceMode ?? false,
      maintenanceMessage: settings?.maintenanceMessage ?? "",
    });
  } catch (error) {
    console.error("System status fetch failed:", error);
    return NextResponse.json(
      { maintenanceMode: false, maintenanceMessage: "" },
      { status: 200 }
    );
  }
}
