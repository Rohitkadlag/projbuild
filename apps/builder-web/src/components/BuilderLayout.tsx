"use client";

import { BucketSidebar } from "./sidebar/BucketSidebar";
import { BuilderCanvas } from "./canvas/BuilderCanvas";
import { ConfigPanel } from "./config-panel/ConfigPanel";
import { TopBar } from "./ui/TopBar";
import { AIPromptBar } from "./ui/AIPromptBar";
import { GenerationModal } from "./ui/GenerationModal";
import { PreviewPanel } from "./ui/PreviewPanel";

export function BuilderLayout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-surface-0">
      <TopBar />
      <AIPromptBar />
      <div className="flex flex-1 overflow-hidden">
        <BucketSidebar />
        <BuilderCanvas />
        <ConfigPanel />
      </div>
      <GenerationModal />
      <PreviewPanel />
    </div>
  );
}
