import fs from "fs-extra";
import path from "path";

// ---------------------------------------------------------------------------
// Simple Prisma schema text merger with auto back-relation injection
// ---------------------------------------------------------------------------

interface ModelDef {
  name: string;
  lines: string[];
}

function parseModels(content: string): ModelDef[] {
  const models: ModelDef[] = [];
  const modelRegex = /^model\s+(\w+)\s*\{([^}]*)\}/gm;
  let m: RegExpExecArray | null;
  while ((m = modelRegex.exec(content)) !== null) {
    models.push({
      name: m[1],
      lines: m[2]
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    });
  }
  return models;
}

/** Inject missing inverse relation fields so Prisma validate passes */
function injectBackRelations(models: ModelDef[]): void {
  const modelNames = new Set(models.map((m) => m.name));

  for (const model of models) {
    for (const line of [...model.lines]) {
      // Match:  someField   TargetModel?  @relation(fields: [fkField], ...)
      const rel = line.match(/^(\w+)\s+(\w+)\??\s+@relation\(fields:\s*\[(\w+)\]/);
      if (!rel) continue;

      const targetModelName = rel[2];
      if (!modelNames.has(targetModelName)) continue;

      const targetModel = models.find((m) => m.name === targetModelName)!;
      // inverse list field name: e.g. TeamMember → teamMembers
      const inverseField =
        model.name.charAt(0).toLowerCase() + model.name.slice(1) + "s";

      const alreadyHas = targetModel.lines.some(
        (l) =>
          l.includes(`${model.name}[]`) ||
          l.includes(`${model.name}?`) ||
          new RegExp(`^${inverseField}\\s`).test(l)
      );

      if (!alreadyHas) {
        targetModel.lines.push(`${inverseField} ${model.name}[]`);
      }
    }
  }
}

function serializeModels(models: ModelDef[]): string {
  return models
    .map(
      (m) =>
        `model ${m.name} {\n${m.lines.map((l) => `  ${l}`).join("\n")}\n}`
    )
    .join("\n\n");
}

export async function mergePrismaSchemas(appDir: string): Promise<void> {
  const fragmentsDir = path.join(appDir, "packages/db/prisma/fragments");
  const outputSchema = path.join(appDir, "packages/db/prisma/schema.prisma");

  const header = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`;

  let rawContent = "";

  if (await fs.pathExists(fragmentsDir)) {
    const files = (await fs.readdir(fragmentsDir)).filter((f) =>
      f.endsWith(".prisma")
    );
    for (const file of files) {
      rawContent +=
        "\n" +
        (await fs.readFile(path.join(fragmentsDir, file), "utf-8")) +
        "\n";
    }
  }

  const allModels = parseModels(rawContent);
  injectBackRelations(allModels);
  const mergedModels = serializeModels(allModels);

  await fs.ensureDir(path.dirname(outputSchema));
  await fs.writeFile(outputSchema, header + "\n" + mergedModels + "\n", "utf-8");
}
