import type { BucketManifest } from "@app-builder/bucket-sdk";

export const BUCKET_REGISTRY: BucketManifest[] = [
  {
    name: "auth",
    displayName: "Authentication",
    version: "1.0.0",
    category: "core",
    description: "Login, signup, JWT sessions, and user management.",
    icon: "🔐",
    dependencies: [],
    optionalDependencies: [],
    capabilities: { requires: [], provides: ["user.identity", "user.session"] },
    bindings: {},
    frontend: { routes: ["/login", "/signup", "/profile"], components: ["LoginForm", "SignupForm", "UserMenu"] },
    backend: { routes: ["/api/auth/login", "/api/auth/signup", "/api/auth/me"], services: ["authService"] },
    database: { models: ["User"] },
    events: { emits: ["user.created", "user.logged_in"], listens: [] },
    env: ["DATABASE_URL", "JWT_SECRET"],
    previewRequirements: { env: [], seed: true, sandboxEnv: { JWT_SECRET: "sandbox-jwt-secret" } },
    configSchema: {
      googleLogin: { type: "boolean", label: "Enable Google Login", description: "Allow sign in with Google", default: false },
      emailVerification: { type: "boolean", label: "Email Verification", description: "Require email verification", default: true },
      sessionTtlHours: { type: "number", label: "Session TTL (hours)", default: 24, min: 1, max: 720 },
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
    optionalDependencies: [],
    capabilities: { requires: ["user.identity"], provides: ["catalog.read", "catalog.write", "catalog.manage"] },
    bindings: {},
    frontend: { routes: ["/entities"], components: ["EntityTable", "EntityForm"] },
    backend: { routes: ["/api/entities"], services: ["entityService"] },
    database: { models: ["Entity"] },
    events: { emits: ["entity.created", "entity.updated", "entity.deleted"], listens: ["user.logged_in"] },
    env: ["DATABASE_URL"],
    previewRequirements: { env: [], seed: true },
    configSchema: {
      entityName: { type: "string", label: "Entity Name", description: "Model name (Product, Course, etc.)", default: "Customer", required: true, placeholder: "Customer" },
      entityType: { type: "select", label: "Entity Type", description: "How this entity is used", options: ["generic", "commerce", "content", "user-data"], default: "generic" },
      tableView: { type: "boolean", label: "Table View", default: true },
      softDelete: { type: "boolean", label: "Soft Delete", default: false },
      fields: {
        type: "array", label: "Fields", description: "Entity fields", itemType: "object",
        default: [{ name: "fullName", type: "string", required: true }, { name: "email", type: "string", required: true }],
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
    optionalDependencies: ["crud", "cart"],
    capabilities: { requires: ["user.identity"], provides: ["dashboard.view"] },
    bindings: { dataSource: "crud" },
    frontend: { routes: ["/dashboard"], components: ["MetricsCard", "ActivityFeed", "StatsGrid"] },
    backend: { routes: ["/api/dashboard/stats"], services: ["dashboardService"] },
    database: { models: [] },
    events: { emits: [], listens: ["entity.created", "user.created"] },
    env: ["DATABASE_URL"],
    previewRequirements: { env: [], seed: false },
    configSchema: {
      title: { type: "string", label: "Dashboard Title", default: "Dashboard", placeholder: "My Dashboard" },
      showWelcome: { type: "boolean", label: "Welcome Banner", default: true },
      metricsStyle: { type: "select", label: "Metrics Style", options: ["cards", "grid", "list"], default: "cards" },
      showCharts: { type: "boolean", label: "Enable Charts", default: true },
    },
  },
  {
    name: "cart",
    displayName: "Shopping Cart",
    version: "1.0.0",
    category: "commerce",
    description: "Full shopping cart — add/remove items, quantities, and checkout flow.",
    icon: "🛒",
    dependencies: [],
    optionalDependencies: ["auth", "crud"],
    capabilities: { requires: ["catalog.read"], provides: ["cart.manage"] },
    bindings: { catalogSource: "crud", userSource: "auth" },
    frontend: { routes: ["/cart", "/checkout"], components: ["AddToCartButton", "CartDrawer", "CartPage"] },
    backend: { routes: ["/api/cart", "/api/cart/:id", "/api/checkout"], services: ["cartService"] },
    database: { models: ["Cart", "CartItem"] },
    events: { emits: ["cart.item_added", "cart.item_removed", "order.placed"], listens: ["user.logged_in", "entity.deleted"] },
    env: ["DATABASE_URL"],
    previewRequirements: { env: [], seed: true },
    configSchema: {
      guestCart: { type: "boolean", label: "Allow Guest Cart", description: "Let unauthenticated users add to cart", default: true },
      maxQuantity: { type: "number", label: "Max Quantity Per Item", default: 99, min: 1, max: 999 },
      checkoutEnabled: { type: "boolean", label: "Enable Checkout", default: true },
      paymentProvider: { type: "select", label: "Payment Provider", options: ["none", "stripe", "mock"], default: "mock" },
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
    optionalDependencies: [],
    capabilities: { requires: ["user.identity"], provides: ["storage.upload", "storage.manage"] },
    bindings: {},
    frontend: { routes: ["/files"], components: ["FileUploader", "FileList"] },
    backend: { routes: ["/api/files"], services: ["fileService"] },
    database: { models: ["File"] },
    events: { emits: ["file.uploaded", "file.deleted"], listens: [] },
    env: ["DATABASE_URL", "STORAGE_BUCKET", "STORAGE_ENDPOINT"],
    previewRequirements: { env: [], seed: false, sandboxEnv: { STORAGE_BUCKET: "sandbox", STORAGE_ENDPOINT: "local" } },
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
    optionalDependencies: [],
    capabilities: { requires: ["user.identity"], provides: ["notification.send"] },
    bindings: {},
    frontend: { routes: ["/notifications"], components: ["NotificationBell", "NotificationList"] },
    backend: { routes: ["/api/notifications"], services: ["notificationService"] },
    database: { models: ["Notification"] },
    events: { emits: ["notification.sent"], listens: ["user.created", "entity.created"] },
    env: ["DATABASE_URL"],
    previewRequirements: { env: [], seed: false },
    configSchema: {
      emailNotifications: { type: "boolean", label: "Email Notifications", default: false },
      inAppNotifications: { type: "boolean", label: "In-App Notifications", default: true },
      smtpProvider: { type: "select", label: "Email Provider", options: ["sendgrid", "resend", "nodemailer", "none"], default: "none" },
    },
  },
];

export const CATEGORY_ORDER = ["core", "data", "commerce", "engagement", "admin", "utility"] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  core: "Core",
  data: "Data",
  commerce: "Commerce",
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
