import type { BucketManifest, BucketConfigField } from "@app-builder/bucket-sdk";

function getDefault(field: BucketConfigField): unknown {
  switch (field.type) {
    case "boolean":
      return field.default;
    case "string":
      return field.default ?? "";
    case "number":
      return field.default ?? 0;
    case "select":
      return field.default ?? field.options[0] ?? "";
    case "array":
      return field.default ?? [];
    default:
      return null;
  }
}

export function createDefaultConfig(
  manifest: Pick<BucketManifest, "configSchema">
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(manifest.configSchema).map(([key, field]) => [
      key,
      getDefault(field),
    ])
  );
}
