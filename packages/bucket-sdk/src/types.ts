export type BucketCategory =
  | "core"
  | "data"
  | "engagement"
  | "admin"
  | "utility";

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
  configSchema: Record<string, BucketConfigField>;
}

export interface PlacedBucket {
  id: string;
  bucketName: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface AppBlueprint {
  appName: string;
  buckets: PlacedBucket[];
}
