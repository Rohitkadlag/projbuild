import { ChildProcess } from "child_process";

export interface RunningPreview {
  buildId: string;
  apiPort: number;
  apiUrl: string;
  webUrl: string;
  webPort: number;
  previewDir: string;
  dbPath: string;
  demoCredentials: { email: string; password: string } | null;
  startedAt: Date;
  process: ChildProcess;
  webProcess: ChildProcess;
  logs: string[];
  appName: string;
}

class PreviewManager {
  private previews = new Map<string, RunningPreview>();
  private nextPort = 4100;

  allocatePort(): number {
    return this.allocatePorts().apiPort;
  }

  allocatePorts(): { apiPort: number; webPort: number } {
    const apiPort = this.nextPort++;
    const webPort = this.nextPort++;
    return { apiPort, webPort };
  }

  register(preview: RunningPreview): void {
    // Stop existing preview if any to free resources
    if (this.previews.size >= 3) {
      const oldest = [...this.previews.values()].sort(
        (a, b) => a.startedAt.getTime() - b.startedAt.getTime()
      )[0];
      if (oldest) this.stop(oldest.buildId);
    }
    this.previews.set(preview.buildId, preview);
  }

  get(buildId: string): RunningPreview | undefined {
    return this.previews.get(buildId);
  }

  getAll(): RunningPreview[] {
    return [...this.previews.values()];
  }

  stop(buildId: string): boolean {
    const preview = this.previews.get(buildId);
    if (!preview) return false;
    try { preview.process.kill("SIGTERM"); } catch {}
    try { preview.webProcess.kill("SIGTERM"); } catch {}
    this.previews.delete(buildId);
    return true;
  }

  stopAll(): void {
    for (const [id] of this.previews) {
      this.stop(id);
    }
  }
}

// Singleton on the module level (persists across hot reloads in dev)
const globalForPreviewManager = globalThis as unknown as {
  previewManager: PreviewManager;
};

export const previewManager =
  globalForPreviewManager.previewManager ||
  new PreviewManager();

if (process.env.NODE_ENV !== "production") {
  globalForPreviewManager.previewManager = previewManager;
}
