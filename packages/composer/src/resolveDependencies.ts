import { ValidatedBucketManifest } from "@app-builder/bucket-sdk";
import { loadManifest } from "./loadManifest";

export function resolveDependencies(
  selected: string[],
  bucketsDir?: string
): ValidatedBucketManifest[] {
  const visited = new Set<string>();
  const resolved: ValidatedBucketManifest[] = [];

  function visit(bucketName: string) {
    if (visited.has(bucketName)) return;
    const manifest = loadManifest(bucketName, bucketsDir);
    visited.add(bucketName);
    for (const dep of manifest.dependencies) {
      visit(dep);
    }
    resolved.push(manifest);
  }

  for (const bucket of selected) {
    visit(bucket);
  }

  return resolved;
}
