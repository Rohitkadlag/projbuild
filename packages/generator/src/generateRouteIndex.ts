import fs from "fs-extra";
import path from "path";
import { ComposedApp } from "@app-builder/composer";

export async function generateRouteIndex(
  app: ComposedApp,
  outputDir: string
): Promise<void> {
  const bucketNames = app.buckets.map((b) => b.name);

  const imports = bucketNames
    .map((name) => `import ${name}Routes from "./routes/${name}.routes";`)
    .join("\n");

  const uses = bucketNames
    .map((name) => {
      const routes = app.backendRoutes.filter((r) =>
        r.includes(`/${name}`)
      );
      const prefix = routes[0]
        ? routes[0].replace(/\/[^/]+$/, "") || `/${name}`
        : `/api/${name}`;
      return `app.use("${prefix}", ${name}Routes);`;
    })
    .join("\n");

  const content = `import express from "express";
import cors from "cors";
import helmet from "helmet";
${imports}

const app = express();

app.use(helmet());
app.use(cors());
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

  await fs.ensureDir(path.join(outputDir, "apps/api/src"));
  await fs.writeFile(
    path.join(outputDir, "apps/api/src/index.ts"),
    content,
    "utf-8"
  );
}
