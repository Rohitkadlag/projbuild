import { NextRequest, NextResponse } from "next/server";
import { previewManager } from "@/lib/previewManager";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const stopped = previewManager.stop(params.id);
  return NextResponse.json({ success: stopped });
}
