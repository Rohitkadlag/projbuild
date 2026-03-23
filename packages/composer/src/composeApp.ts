import { ValidatedBucketManifest } from "@app-builder/bucket-sdk";
import { resolveBindings, ResolvedBinding } from "./resolveBindings";

export interface ComposedApp {
  appName: string;
  buckets: ValidatedBucketManifest[];
  frontendRoutes: string[];
  frontendComponents: string[];
  backendRoutes: string[];
  backendServices: string[];
  dbModels: string[];
  env: string[];
  events: {
    emits: string[];
    listens: string[];
  };
  bindings: ResolvedBinding[];
  configs: Record<string, Record<string, unknown>>;
  previewEnv: Record<string, string>;
  needsSeed: boolean;
}

export function composeApp(
  appName: string,
  manifests: ValidatedBucketManifest[],
  configs: Record<string, Record<string, unknown>> = {}
): ComposedApp {
  const bindings = resolveBindings(manifests);

  // Collect sandbox env from all buckets that provide them
  const previewEnv: Record<string, string> = {
    DATABASE_URL: "file:./dev.db",
    JWT_SECRET: "sandbox-preview-secret-change-in-prod",
  };
  for (const m of manifests) {
    Object.assign(previewEnv, m.previewRequirements.sandboxEnv ?? {});
  }

  const needsSeed = manifests.some((m) => m.previewRequirements.seed);

  return {
    appName,
    buckets: manifests,
    frontendRoutes: [...new Set(manifests.flatMap((m) => m.frontend.routes))],
    frontendComponents: [...new Set(manifests.flatMap((m) => m.frontend.components))],
    backendRoutes: [...new Set(manifests.flatMap((m) => m.backend.routes))],
    backendServices: [...new Set(manifests.flatMap((m) => m.backend.services))],
    dbModels: [...new Set(manifests.flatMap((m) => m.database.models))],
    env: [...new Set(manifests.flatMap((m) => m.env))],
    events: {
      emits: [...new Set(manifests.flatMap((m) => m.events.emits))],
      listens: [...new Set(manifests.flatMap((m) => m.events.listens))],
    },
    bindings,
    configs,
    previewEnv,
    needsSeed,
  };
}
