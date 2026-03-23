import fs from "fs-extra";
import path from "path";

export async function copyTemplate(appName: string, rootDir?: string): Promise<string> {
  const root = rootDir ?? process.cwd();
  const templateDir = path.join(root, "templates/base-app");
  const outputDir = path.join(root, "output", appName);

  await fs.remove(outputDir);
  await fs.copy(templateDir, outputDir);

  return outputDir;
}
