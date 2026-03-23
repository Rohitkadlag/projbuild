import fs from "fs-extra";
import path from "path";

export async function injectBucket(
  bucketName: string,
  outputDir: string,
  rootDir?: string
): Promise<void> {
  const root = rootDir ?? process.cwd();
  const bucketDir = path.join(root, "buckets", bucketName);

  const frontendSrc = path.join(bucketDir, "frontend");
  const backendSrc = path.join(bucketDir, "backend");
  const dbSrc = path.join(bucketDir, "database");

  const webDest = path.join(outputDir, "apps/web/src");
  const apiDest = path.join(outputDir, "apps/api/src");
  const dbDest = path.join(outputDir, "packages/db/prisma/fragments");

  if (await fs.pathExists(frontendSrc)) {
    await fs.copy(frontendSrc, webDest, { overwrite: true });
  }

  if (await fs.pathExists(backendSrc)) {
    await fs.copy(backendSrc, apiDest, { overwrite: true });
  }

  if (await fs.pathExists(dbSrc)) {
    await fs.ensureDir(dbDest);
    const files = await fs.readdir(dbSrc);
    for (const file of files) {
      await fs.copy(
        path.join(dbSrc, file),
        path.join(dbDest, `${bucketName}_${file}`)
      );
    }
  }
}
