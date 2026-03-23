import type { BucketManifest } from "@app-builder/bucket-sdk";

// Inline manifests so builder works without filesystem access in browser
export const BUCKET_REGISTRY: BucketManifest[] = [
  {
    name: "auth",
    displayName: "Authentication",
    version: "1.0.0",
    category: "core",
    description: "Login, signup, JWT sessions, and user management.",
    icon: "🔐",
    dependencies: [],
    frontend: { routes: ["/login", "/signup", "/profile"], components: ["LoginForm", "SignupForm", "UserMenu"] },
    backend: { routes: ["/api/auth/login", "/api/auth/signup", "/api/auth/me"], services: ["authService"] },
    database: { models: ["User"] },
    events: { emits: ["user.created", "user.logged_in"], listens: [] },
    env: ["DATABASE_URL", "JWT_SECRET"],
    configSchema: {
      googleLogin: { type: "boolean", label: "Enable Google Login", description: "Allow users to sign in with Google", default: false },
      emailVerification: { type: "boolean", label: "Email Verification", description: "Require email verification before login", default: true },
      sessionTtlHours: { type: "number", label: "Session TTL (hours)", description: "JWT token validity duration", default: 24, min: 1, max: 720 },
      roles: { type: "select", label: "Role Strategy", options: ["simple", "rbac", "none"], default: "simple" },
    },
  },
  {
    name: "crud",
    displayName: "CRUD Entity",
    version: "1.0.0",
    category: "data",
    description: "Dynamic create, read, update, delete entity with configurable fields.",
    icon: "📋",
    dependencies: ["auth"],
    frontend: { routes: ["/entities"], components: ["EntityTable", "EntityForm"] },
    backend: { routes: ["/api/entities"], services: ["entityService"] },
    database: { models: ["Entity"] },
    events: { emits: ["entity.created", "entity.updated", "entity.deleted"], listens: ["user.logged_in"] },
    env: ["DATABASE_URL"],
    configSchema: {
      entityName: { type: "string", label: "Entity Name", description: "Model name (Customer, Product, etc.)", default: "Customer", required: true, placeholder: "Customer" },
      tableView: { type: "boolean", label: "Table View", description: "Display records in a sortable table", default: true },
      softDelete: { type: "boolean", label: "Soft Delete", description: "Mark as deleted instead of removing", default: false },
      fields: {
        type: "array",
        label: "Fields",
        description: "Define entity fields",
        itemType: "object",
        default: [
          { name: "fullName", type: "string", required: true },
          { name: "email", type: "string", required: true },
        ],
        itemSchema: {
          name: { type: "string", label: "Field Name", default: "", placeholder: "fieldName" },
          type: { type: "select", label: "Type", options: ["string", "number", "boolean", "date"], default: "string" },
          required: { type: "boolean", label: "Required", default: false },
        },
      },
    },
  },
  {
    name: "dashboard",
    displayName: "Dashboard",
    version: "1.0.0",
    category: "core",
    description: "Overview dashboard with metrics, activity feed, and charts.",
    icon: "📊",
    dependencies: ["auth"],
    frontend: { routes: ["/dashboard"], components: ["MetricsCard", "ActivityFeed", "StatsGrid"] },
    backend: { routes: ["/api/dashboard/stats"], services: ["dashboardService"] },
    database: { models: [] },
    events: { emits: [], listens: ["entity.created", "entity.updated", "user.created"] },
    env: ["DATABASE_URL"],
    configSchema: {
      title: { type: "string", label: "Dashboard Title", default: "Dashboard", placeholder: "My Dashboard" },
      showWelcome: { type: "boolean", label: "Welcome Banner", description: "Show welcome message", default: true },
      metricsStyle: { type: "select", label: "Metrics Style", options: ["cards", "grid", "list"], default: "cards" },
      showCharts: { type: "boolean", label: "Enable Charts", default: true },
    },
  },
  {
    name: "file-upload",
    displayName: "File Upload",
    version: "1.0.0",
    category: "utility",
    description: "File upload, storage management with multiple provider support.",
    icon: "📁",
    dependencies: ["auth"],
    frontend: { routes: ["/files"], components: ["FileUploader", "FileList"] },
    backend: { routes: ["/api/files"], services: ["fileService"] },
    database: { models: ["File"] },
    events: { emits: ["file.uploaded", "file.deleted"], listens: [] },
    env: ["DATABASE_URL", "STORAGE_BUCKET", "STORAGE_ENDPOINT"],
    configSchema: {
      provider: { type: "select", label: "Storage Provider", options: ["local", "s3", "cloudinary", "supabase"], default: "local" },
      maxFileSizeMb: { type: "number", label: "Max File Size (MB)", default: 10, min: 1, max: 500 },
      allowedTypes: { type: "array", label: "Allowed Types", itemType: "string", default: ["image/*", "application/pdf"] },
    },
  },
  {
    name: "notifications",
    displayName: "Notifications",
    version: "1.0.0",
    category: "engagement",
    description: "In-app and email notification system with event listeners.",
    icon: "🔔",
    dependencies: ["auth"],
    frontend: { routes: ["/notifications"], components: ["NotificationBell", "NotificationList"] },
    backend: { routes: ["/api/notifications"], services: ["notificationService"] },
    database: { models: ["Notification"] },
    events: { emits: ["notification.sent"], listens: ["user.created", "entity.created"] },
    env: ["DATABASE_URL"],
    configSchema: {
      emailNotifications: { type: "boolean", label: "Email Notifications", default: false },
      inAppNotifications: { type: "boolean", label: "In-App Notifications", default: true },
      smtpProvider: { type: "select", label: "Email Provider", options: ["sendgrid", "resend", "nodemailer", "none"], default: "none" },
    },
  },
];

export const CATEGORY_ORDER = ["core", "data", "engagement", "admin", "utility"] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  core: "Core",
  data: "Data",
  engagement: "Engagement",
  admin: "Admin",
  utility: "Utility",
};

export function getBucketsByCategory() {
  const grouped: Record<string, BucketManifest[]> = {};
  for (const bucket of BUCKET_REGISTRY) {
    if (!grouped[bucket.category]) grouped[bucket.category] = [];
    grouped[bucket.category].push(bucket);
  }
  return grouped;
}

export function getBucketManifest(name: string): BucketManifest | undefined {
  return BUCKET_REGISTRY.find((b) => b.name === name);
}
