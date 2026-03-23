export type BucketCategory =
  | "core"
  | "data"
  | "engagement"
  | "admin"
  | "utility"
  | "commerce";

export type BucketConfigField =
  | {
      type: "boolean";
      label?: string;
      description?: string;
      default: boolean;
      required?: boolean;
    }
  | {
      type: "string";
      label?: string;
      description?: string;
      default?: string;
      required?: boolean;
      placeholder?: string;
    }
  | {
      type: "number";
      label?: string;
      description?: string;
      default?: number;
      required?: boolean;
      min?: number;
      max?: number;
    }
  | {
      type: "select";
      label?: string;
      description?: string;
      options: string[];
      default?: string;
      required?: boolean;
    }
  | {
      type: "array";
      label?: string;
      description?: string;
      itemType: "string" | "number" | "object";
      required?: boolean;
      itemSchema?: Record<string, BucketConfigField>;
      default?: unknown[];
    };

export interface BucketManifest {
  name: string;
  displayName: string;
  version: string;
  category: BucketCategory;
  description?: string;
  icon?: string;

  dependencies: string[];
  optionalDependencies: string[];

  capabilities: {
    requires: string[];   // e.g. ["catalog.read"]
    provides: string[];   // e.g. ["cart.manage", "user.identity"]
  };

  bindings: Record<string, string>; // e.g. { "catalogSource": "crud", "userSource": "auth" }

  frontend: {
    routes: string[];
    components: string[];
  };

  backend: {
    routes: string[];
    services: string[];
  };

  database: {
    models: string[];
  };

  events: {
    emits: string[];
    listens: string[];
  };

  env: string[];

  previewRequirements: {
    env: string[];
    seed: boolean;
    sandboxEnv?: Record<string, string>;
  };

  configSchema: Record<string, BucketConfigField>;
}

export interface PlacedBucket {
  id: string;
  bucketName: string;
  displayName: string;
  icon: string;
  category: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface AppBlueprint {
  appName: string;
  buckets: PlacedBucket[];
}
