import fs from "fs-extra";
import path from "path";
import { ComposedApp } from "@app-builder/composer";

function getSeedForBucket(bucketName: string, config: Record<string, unknown>): string {
  if (bucketName === "auth") {
    return `
  // Seed demo users
  await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
      password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
      role: "user",
      verified: true,
    },
  });
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
      role: "admin",
      verified: true,
    },
  });
  console.log("✓ Seeded users");
`;
  }

  if (bucketName === "crud") {
    const entityName = (config.entityName as string) ?? "Entity";
    const entityType = (config.entityType as string) ?? "generic";
    const modelName = "entity";

    if (entityType === "commerce") {
      return `
  // Seed sample ${entityName} records
  const products = [
    { title: "Classic T-Shirt", description: "Premium cotton tee", status: "active", data: { price: 29.99, image: "https://via.placeholder.com/300", stock: 50 } },
    { title: "Running Shoes", description: "Lightweight performance shoes", status: "active", data: { price: 89.99, image: "https://via.placeholder.com/300", stock: 30 } },
    { title: "Coffee Mug", description: "14oz ceramic mug", status: "active", data: { price: 14.99, image: "https://via.placeholder.com/300", stock: 100 } },
    { title: "Laptop Bag", description: "Water-resistant 15 inch bag", status: "active", data: { price: 49.99, image: "https://via.placeholder.com/300", stock: 20 } },
    { title: "Wireless Earbuds", description: "Noise-cancelling earbuds", status: "active", data: { price: 129.99, image: "https://via.placeholder.com/300", stock: 15 } },
  ];
  for (const p of products) {
    await prisma.${modelName}.create({ data: p });
  }
  console.log("✓ Seeded ${entityName} records");
`;
    }

    return `
  // Seed sample ${entityName} records
  for (let i = 1; i <= 5; i++) {
    await prisma.${modelName}.create({
      data: {
        title: \`Sample ${entityName} \${i}\`,
        description: \`Description for ${entityName} \${i}\`,
        status: "active",
      },
    });
  }
  console.log("✓ Seeded ${entityName} records");
`;
  }

  return "";
}

export async function generateSeedData(
  app: ComposedApp,
  outputDir: string
): Promise<void> {
  if (!app.needsSeed) return;

  const seedStatements = app.buckets
    .filter((b) => b.previewRequirements.seed)
    .map((b) => getSeedForBucket(b.name, app.configs[b.name] ?? {}))
    .filter(Boolean)
    .join("\n");

  if (!seedStatements.trim()) return;

  const seedContent = `import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
${seedStatements}
  console.log("✓ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.\$disconnect();
  });
`;

  await fs.ensureDir(path.join(outputDir, "packages/db/prisma"));
  await fs.writeFile(
    path.join(outputDir, "packages/db/prisma/seed.ts"),
    seedContent,
    "utf-8"
  );
}
