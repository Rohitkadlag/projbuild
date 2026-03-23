import { NextResponse } from "next/server";
import { previewManager } from "@/lib/previewManager";

export async function GET() {
  const previews = previewManager.getAll().map((p) => ({
    buildId: p.buildId,
    appName: p.appName,
    apiUrl: p.apiUrl,
    apiPort: p.apiPort,
    startedAt: p.startedAt,
    demoCredentials: p.demoCredentials,
  }));
  return NextResponse.json(previews);
}
