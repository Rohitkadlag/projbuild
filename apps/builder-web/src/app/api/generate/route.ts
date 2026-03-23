import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { resolveDependencies, composeApp } from "@app-builder/composer";
import { generateApp } from "@app-builder/generator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      appName: string;
      buckets: Array<{ bucketName: string; config: Record<string, unknown> }>;
    };

    const { appName, buckets } = body;

    if (!appName || !buckets || buckets.length === 0) {
      return NextResponse.json(
        { error: "appName and buckets are required" },
        { status: 400 }
      );
    }

    const rootDir = path.join(process.cwd(), "../..");
    const bucketNames = buckets.map((b) => b.bucketName);
    const configs: Record<string, Record<string, unknown>> = {};
    for (const b of buckets) {
      configs[b.bucketName] = b.config;
    }

    const manifests = resolveDependencies(bucketNames, path.join(rootDir, "buckets"));
    const composed = composeApp(appName, manifests, configs);

    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(" "));
      originalLog(...args);
    };

    const { zipPath } = await generateApp(composed, rootDir);

    console.log = originalLog;

    const zipBuffer = fs.readFileSync(zipPath);
    const base64 = zipBuffer.toString("base64");

    return NextResponse.json({
      success: true,
      appName,
      logs,
      zipBase64: base64,
      fileName: `${appName}.zip`,
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
