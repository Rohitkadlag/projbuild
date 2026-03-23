import { ValidatedBucketManifest } from "@app-builder/bucket-sdk";

export interface ResolvedBinding {
  bucketName: string;
  bindingKey: string;
  boundTo: string;     // the bucket name that satisfies this binding
  capability: string;  // which capability is being bound
}

export function resolveBindings(
  manifests: ValidatedBucketManifest[]
): ResolvedBinding[] {
  const resolved: ResolvedBinding[] = [];
  const capabilityMap = new Map<string, string>(); // capability -> bucketName

  // Build capability map
  for (const m of manifests) {
    for (const cap of m.capabilities.provides) {
      capabilityMap.set(cap, m.name);
    }
  }

  // Resolve bindings
  for (const m of manifests) {
    for (const [bindingKey, sourceBucket] of Object.entries(m.bindings)) {
      const source = manifests.find((x) => x.name === sourceBucket);
      if (source) {
        resolved.push({
          bucketName: m.name,
          bindingKey,
          boundTo: sourceBucket,
          capability: source.capabilities.provides[0] ?? "",
        });
      }
    }

    // Also resolve by required capabilities
    for (const requiredCap of m.capabilities.requires) {
      const provider = capabilityMap.get(requiredCap);
      if (provider && provider !== m.name) {
        resolved.push({
          bucketName: m.name,
          bindingKey: `auto_${requiredCap.replace(".", "_")}`,
          boundTo: provider,
          capability: requiredCap,
        });
      }
    }
  }

  return resolved;
}
