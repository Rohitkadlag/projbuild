import fs from "fs";
import archiver from "archiver";
import path from "path";

export function zipApp(sourceDir: string, appName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(path.dirname(sourceDir), `${appName}.zip`);
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve(outputPath));
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(sourceDir, appName);
    archive.finalize();
  });
}
