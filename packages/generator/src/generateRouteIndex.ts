import fs from "fs-extra";
import path from "path";
import { ComposedApp } from "@app-builder/composer";

export async function generateRouteIndex(
  app: ComposedApp,
  outputDir: string
): Promise<void> {
  const routesDir = path.join(outputDir, "apps/api/src/routes");
  await fs.ensureDir(routesDir);

  // Scan actual injected route files rather than assuming names from bucket names
  const routeFiles = (await fs.readdir(routesDir))
    .filter((f) => f.endsWith(".routes.ts"))
    .sort();

  // Derive entity plural for the crud entity route prefix
  const crudConfig = app.configs?.["crud"] as Record<string, unknown> | undefined;
  const entityName =
    typeof crudConfig?.["entityName"] === "string"
      ? crudConfig["entityName"]
      : "Item";
  const entityPlural = entityName.toLowerCase() + "s";

  // Map filename → mount prefix
  function prefixFor(filename: string): string {
    const base = filename.replace(".routes.ts", "");
    if (base === "entity") return `/api/${entityPlural}`;
    if (base === "auth") return "/api/auth";
    if (base === "cart") return "/api/cart";
    if (base === "dashboard") return "/api/dashboard";
    if (base === "notifications") return "/api/notifications";
    return `/api/${base}`;
  }

  const imports = routeFiles
    .map((f, i) => {
      const varName = f.replace(".routes.ts", "").replace(/-/g, "_") + "Routes";
      return `import ${varName} from "./routes/${f.replace(".ts", "")}";`;
    })
    .join("\n");

  const uses = routeFiles
    .map((f) => {
      const varName = f.replace(".routes.ts", "").replace(/-/g, "_") + "Routes";
      return `app.use("${prefixFor(f)}", ${varName});`;
    })
    .join("\n");

  const content = `import express from "express";
import cors from "cors";
import helmet from "helmet";
${imports}

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

${uses}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(\`API running on http://localhost:\${PORT}\`);
});

export default app;
`;

  await fs.writeFile(
    path.join(outputDir, "apps/api/src/index.ts"),
    content,
    "utf-8"
  );
}
