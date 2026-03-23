import { ValidatedBucketManifest } from "@app-builder/bucket-sdk";

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
  configs: Record<string, Record<string, unknown>>;
}

export function composeApp(
  appName: string,
  manifests: ValidatedBucketManifest[],
  configs: Record<string, Record<string, unknown>> = {}
): ComposedApp {
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
    configs,
  };
}
