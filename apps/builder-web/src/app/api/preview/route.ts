import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { resolveDependencies, composeApp } from "@app-builder/composer";
import { generateApp } from "@app-builder/generator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      appName: string;
      buckets: Array<{ bucketName: string; config: Record<string, unknown> }>;
    };

    const { appName, buckets } = body;
    const rootDir = path.join(process.cwd(), "../..");
    const bucketNames = buckets.map((b) => b.bucketName);
    const configs: Record<string, Record<string, unknown>> = {};
    for (const b of buckets) {
      configs[b.bucketName] = b.config;
    }

    const manifests = resolveDependencies(
      bucketNames,
      path.join(rootDir, "buckets")
    );
    const composed = composeApp(appName, manifests, configs);

    // Check what requirements need to be filled
    const missingEnv = composed.env.filter(
      (key) => !composed.previewEnv[key] && key !== "DATABASE_URL" && key !== "JWT_SECRET"
    );

    return NextResponse.json({
      composed: {
        appName: composed.appName,
        buckets: composed.buckets.map((b) => b.name),
        dbModels: composed.dbModels,
        backendRoutes: composed.backendRoutes,
        frontendRoutes: composed.frontendRoutes,
        env: composed.env,
        previewEnv: composed.previewEnv,
        bindings: composed.bindings,
        needsSeed: composed.needsSeed,
      },
      missingEnv,
      canPreviewNow: missingEnv.length === 0,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
