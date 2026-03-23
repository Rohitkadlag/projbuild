import path from "path";
import fs from "fs-extra";
import { execSync, spawn, ChildProcess } from "child_process";
import { ComposedApp } from "@app-builder/composer";
import { copyTemplate } from "./copyTemplate";
import { injectBucket } from "./injectBucket";
import { mergePrismaSchemas } from "./mergePrismaSchemas";
import { generateRouteIndex } from "./generateRouteIndex";
import { generateSeedData } from "./generateSeedData";
import { generateWebApp } from "./generateWebApp";

export interface PreviewResult {
  buildId: string;
  apiPort: number;
  apiUrl: string;
  webUrl: string;
  webPort: number;
  previewDir: string;
  dbPath: string;
  demoCredentials: {
    email: string;
    password: string;
  } | null;
  logs: string[];
}

const logs: string[] = [];

function log(msg: string) {
  logs.push(msg);
  console.log(msg);
}

function execSafe(cmd: string, cwd: string): void {
  execSync(cmd, { cwd, stdio: "pipe" });
}

function convertToSQLite(schemaPath: string): void {
  let schema = fs.readFileSync(schemaPath, "utf-8");

  // Replace PostgreSQL provider with SQLite
  schema = schema.replace(
    /provider\s*=\s*"postgresql"/,
    'provider = "sqlite"'
  );

  // Replace env("DATABASE_URL") with direct file path
  schema = schema.replace(
    /url\s*=\s*env\("DATABASE_URL"\)/,
    'url = env("DATABASE_URL")'
  );

  // SQLite doesn't support Json type — replace with String
  schema = schema.replace(/\bJson\b/g, "String");

  fs.writeFileSync(schemaPath, schema, "utf-8");
}

export async function previewApp(
  app: ComposedApp,
  rootDir: string,
  apiPort: number,
  webPort: number
): Promise<{ result: PreviewResult; apiProcess: ChildProcess; webProcess: ChildProcess }> {
  logs.length = 0;

  const buildId = `preview_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const previewDir = path.join(rootDir, "output", buildId);
  const dbPath = path.join(previewDir, "apps", "api", "preview.db");

  log(`[preview] Starting preview build: ${buildId}`);

  // Step 1: Copy template
  log(`[preview] Copying base template...`);
  await copyTemplate(buildId, rootDir);

  // Step 2: Inject buckets
  for (const bucket of app.buckets) {
    log(`[preview] Injecting bucket: ${bucket.name}`);
    await injectBucket(bucket.name, previewDir, rootDir);
  }

  // Step 3: Merge Prisma schemas
  log(`[preview] Merging Prisma schemas...`);
  await mergePrismaSchemas(previewDir);

  // Step 4: Convert to SQLite for preview
  const schemaPath = path.join(previewDir, "packages", "db", "prisma", "schema.prisma");
  log(`[preview] Converting schema to SQLite...`);
  convertToSQLite(schemaPath);

  // Step 5: Copy schema to api prisma dir (needed for prisma generate)
  const apiPrismaDir = path.join(previewDir, "apps", "api", "prisma");
  await fs.ensureDir(apiPrismaDir);
  await fs.copy(schemaPath, path.join(apiPrismaDir, "schema.prisma"));

  // Step 6: Generate route index
  log(`[preview] Generating route index...`);
  await generateRouteIndex(app, previewDir);

  // Step 7: Generate seed data
  log(`[preview] Generating seed data...`);
  await generateSeedData(app, previewDir);

  // Copy seed to api dir
  const seedSrc = path.join(previewDir, "packages", "db", "prisma", "seed.ts");
  if (await fs.pathExists(seedSrc)) {
    await fs.copy(seedSrc, path.join(apiPrismaDir, "seed.ts"));
  }

  // Step 8: Install deps in API directory
  const apiDir = path.join(previewDir, "apps", "api");
  log(`[preview] Installing API dependencies...`);

  // Write a minimal package.json for the api if not complete
  const apiPkg = await fs.readJson(path.join(apiDir, "package.json")).catch(() => ({}));
  apiPkg.prisma = { seed: "ts-node prisma/seed.ts" };
  await fs.writeJson(path.join(apiDir, "package.json"), apiPkg, { spaces: 2 });

  execSafe(`/opt/homebrew/bin/pnpm install --no-frozen-lockfile 2>&1 || npm install 2>&1`, apiDir);

  // Step 9: Generate Prisma client
  log(`[preview] Generating Prisma client...`);
  const dbUrl = `file:${dbPath}`;
  execSafe(`DATABASE_URL="${dbUrl}" npx prisma generate --schema=prisma/schema.prisma`, apiDir);

  // Step 10: Push schema to SQLite db
  log(`[preview] Pushing schema to SQLite database...`);
  execSafe(`DATABASE_URL="${dbUrl}" npx prisma db push --schema=prisma/schema.prisma --accept-data-loss`, apiDir);

  // Step 11: Seed the database
  const seedPath = path.join(apiDir, "prisma", "seed.ts");
  if (await fs.pathExists(seedPath)) {
    log(`[preview] Seeding database with demo data...`);
    try {
      execSafe(`DATABASE_URL="${dbUrl}" npx ts-node prisma/seed.ts`, apiDir);
    } catch (e) {
      log(`[preview] Seed warning: ${String(e).slice(0, 100)}`);
    }
  }

  // Step 12: Write .env for API
  const envContent = `DATABASE_URL="${dbUrl}"\nJWT_SECRET="preview-jwt-secret-not-for-production"\nPORT=${apiPort}\n`;
  await fs.writeFile(path.join(apiDir, ".env"), envContent);

  // Step 13: Start the API server
  log(`[preview] Starting API server on port ${apiPort}...`);
  const apiProcess = spawn(
    "npx",
    ["ts-node-dev", "--respawn", "--transpile-only", "src/index.ts"],
    {
      cwd: apiDir,
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
        JWT_SECRET: "preview-jwt-secret-not-for-production",
        PORT: String(apiPort),
      },
      detached: false,
    }
  );

  // Wait for server to be ready
  await new Promise<void>((resolve) => setTimeout(resolve, 4000));

  log(`[preview] API ready at http://localhost:${apiPort}`);

  // Step 14: Generate frontend pages
  log(`[preview] Generating frontend pages...`);
  await generateWebApp(app, previewDir, apiPort);

  const webDir = path.join(previewDir, "apps", "web");

  // Install web dependencies
  log(`[preview] Installing web dependencies...`);
  execSafe(`/opt/homebrew/bin/pnpm install --no-frozen-lockfile 2>&1 || npm install 2>&1`, webDir);

  // Step 15: Start Next.js frontend
  log(`[preview] Starting Next.js frontend on port ${webPort}...`);
  const webProcess = spawn(
    "npx",
    ["next", "dev", "-p", String(webPort)],
    {
      cwd: webDir,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: `http://localhost:${apiPort}`,
        PORT: String(webPort),
      },
      detached: false,
    }
  );

  // Wait for Next.js to compile (it takes longer than Express)
  log(`[preview] Waiting for Next.js to compile...`);
  await new Promise<void>((resolve) => setTimeout(resolve, 15000));

  log(`[preview] Frontend ready at http://localhost:${webPort}`);

  const hasSeed = app.buckets.some((b) => b.previewRequirements?.seed);

  return {
    result: {
      buildId,
      apiPort,
      apiUrl: `http://localhost:${apiPort}`,
      webUrl: `http://localhost:${webPort}`,
      webPort,
      previewDir,
      dbPath,
      demoCredentials: hasSeed ? { email: "demo@example.com", password: "password" } : null,
      logs: [...logs],
    },
    apiProcess,
    webProcess,
  };
}
