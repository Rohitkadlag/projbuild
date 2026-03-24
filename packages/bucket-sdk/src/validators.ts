import { z } from "zod";

const bucketCategorySchema = z.enum([
  "core",
  "data",
  "engagement",
  "admin",
  "utility",
  "commerce",
  "content",
]);

const bucketConfigFieldSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal("boolean"),
      label: z.string().optional(),
      description: z.string().optional(),
      default: z.boolean(),
      required: z.boolean().optional(),
    }),
    z.object({
      type: z.literal("string"),
      label: z.string().optional(),
      description: z.string().optional(),
      default: z.string().optional(),
      required: z.boolean().optional(),
      placeholder: z.string().optional(),
    }),
    z.object({
      type: z.literal("number"),
      label: z.string().optional(),
      description: z.string().optional(),
      default: z.number().optional(),
      required: z.boolean().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
    }),
    z.object({
      type: z.literal("select"),
      label: z.string().optional(),
      description: z.string().optional(),
      options: z.array(z.string()).min(1),
      default: z.string().optional(),
      required: z.boolean().optional(),
    }),
    z.object({
      type: z.literal("array"),
      label: z.string().optional(),
      description: z.string().optional(),
      itemType: z.enum(["string", "number", "object"]),
      required: z.boolean().optional(),
      itemSchema: z.record(bucketConfigFieldSchema).optional(),
      default: z.array(z.unknown()).optional(),
    }),
  ])
);

export const bucketManifestSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  version: z.string().min(1),
  category: bucketCategorySchema,
  description: z.string().optional(),
  icon: z.string().optional(),

  dependencies: z.array(z.string()),
  optionalDependencies: z.array(z.string()).default([]),

  capabilities: z.object({
    requires: z.array(z.string()),
    provides: z.array(z.string()),
  }).default({ requires: [], provides: [] }),

  bindings: z.record(z.string()).default({}),

  frontend: z.object({
    routes: z.array(z.string()),
    components: z.array(z.string()),
  }),

  backend: z.object({
    routes: z.array(z.string()),
    services: z.array(z.string()),
  }),

  database: z.object({
    models: z.array(z.string()),
  }),

  events: z.object({
    emits: z.array(z.string()),
    listens: z.array(z.string()),
  }),

  env: z.array(z.string()),

  previewRequirements: z.object({
    env: z.array(z.string()),
    seed: z.boolean(),
    sandboxEnv: z.record(z.string()).optional(),
  }).default({ env: [], seed: false }),

  configSchema: z.record(bucketConfigFieldSchema),
});

export type ValidatedBucketManifest = z.infer<typeof bucketManifestSchema>;

export function validateBucketManifest(input: unknown): ValidatedBucketManifest {
  return bucketManifestSchema.parse(input);
}
