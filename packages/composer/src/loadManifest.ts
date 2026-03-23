import fs from "node:fs";
import path from "node:path";
import { validateBucketManifest, ValidatedBucketManifest } from "@app-builder/bucket-sdk";

export function loadManifest(bucketName: string, bucketsDir?: string): ValidatedBucketManifest {
  const dir = bucketsDir ?? path.join(process.cwd(), "buckets");
  const manifestPath = path.join(dir, bucketName, "bucket.json");

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Bucket manifest not found: ${manifestPath}`);
  }

  const raw = fs.readFileSync(manifestPath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;

  return validateBucketManifest(parsed);
}
