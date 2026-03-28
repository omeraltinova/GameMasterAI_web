import { NextResponse } from "next/server";
import { getSystemSettings } from "@/lib/admin/systemSettings";

export async function GET() {
  try {
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
