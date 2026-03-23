import fs from "fs-extra";
import path from "path";

export async function mergePrismaSchemas(appDir: string): Promise<void> {
  const fragmentsDir = path.join(appDir, "packages/db/prisma/fragments");
  const outputSchema = path.join(appDir, "packages/db/prisma/schema.prisma");

  let header = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`;

  let models = "";

  if (await fs.pathExists(fragmentsDir)) {
    const files = (await fs.readdir(fragmentsDir)).filter((f) =>
      f.endsWith(".prisma")
    );

    for (const file of files) {
      const content = await fs.readFile(
        path.join(fragmentsDir, file),
        "utf-8"
      );
      models += "\n" + content + "\n";
    }
  }

  await fs.ensureDir(path.dirname(outputSchema));
  await fs.writeFile(outputSchema, header + models, "utf-8");
}
