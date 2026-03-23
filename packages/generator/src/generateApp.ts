import path from "path";
import { ComposedApp } from "@app-builder/composer";
import { copyTemplate } from "./copyTemplate";
import { injectBucket } from "./injectBucket";
import { mergePrismaSchemas } from "./mergePrismaSchemas";
import { generateRouteIndex } from "./generateRouteIndex";
import { writeEnvAndReadme } from "./writeEnvAndReadme";
import { generateSeedData } from "./generateSeedData";
import { zipApp } from "./zipApp";

export async function generateApp(
  app: ComposedApp,
  rootDir?: string
): Promise<{ outputDir: string; zipPath: string }> {
  const root = rootDir ?? process.cwd();

  console.log(`[generator] Copying base template...`);
  const outputDir = await copyTemplate(app.appName, root);

  for (const bucket of app.buckets) {
    console.log(`[generator] Injecting bucket: ${bucket.name}`);
    await injectBucket(bucket.name, outputDir, root);
  }

  console.log(`[generator] Merging Prisma schemas...`);
  await mergePrismaSchemas(outputDir);

  console.log(`[generator] Generating route index...`);
  await generateRouteIndex(app, outputDir);

  console.log(`[generator] Generating seed data...`);
  await generateSeedData(app, outputDir);

  console.log(`[generator] Writing env and README...`);
  await writeEnvAndReadme(app, outputDir);

  console.log(`[generator] Creating ZIP...`);
  const zipPath = await zipApp(outputDir, app.appName);

  console.log(`[generator] Done! Output: ${outputDir}`);
  return { outputDir, zipPath };
}
