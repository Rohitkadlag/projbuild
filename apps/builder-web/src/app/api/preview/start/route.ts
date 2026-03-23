import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { resolveDependencies, composeApp } from "@app-builder/composer";
import { previewApp } from "@app-builder/generator";
import { previewManager } from "@/lib/previewManager";

export const maxDuration = 120; // 2 min timeout for long preview builds

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      appName: string;
      buckets: Array<{ bucketName: string; config: Record<string, unknown> }>;
    };

    const { appName, buckets } = body;

    if (!appName || !buckets?.length) {
      return NextResponse.json({ error: "appName and buckets required" }, { status: 400 });
    }

    const rootDir = path.join(process.cwd(), "../..");
    const bucketNames = buckets.map((b) => b.bucketName);
    const configs: Record<string, Record<string, unknown>> = {};
    for (const b of buckets) configs[b.bucketName] = b.config;

    const manifests = resolveDependencies(bucketNames, path.join(rootDir, "buckets"));
    const composed = composeApp(appName, manifests, configs);

    const { apiPort, webPort } = previewManager.allocatePorts();

    const { result, apiProcess, webProcess } = await previewApp(
      composed,
      rootDir,
      apiPort,
      webPort
    );

    previewManager.register({
      ...result,
      appName,
      startedAt: new Date(),
      process: apiProcess,
      webProcess,
    });

    return NextResponse.json({
      success: true,
      buildId: result.buildId,
      apiUrl: result.apiUrl,
      apiPort: result.apiPort,
      webUrl: result.webUrl,
      webPort: result.webPort,
      demoCredentials: result.demoCredentials,
      logs: result.logs,
      endpoints: composed.backendRoutes.map((r) => ({
        method: r.includes("signup") || r.includes("login") || r.includes("POST") ? "POST" : "GET",
        path: r,
        url: `${result.apiUrl}${r}`,
      })),
    });
  } catch (error) {
    console.error("Preview start error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
