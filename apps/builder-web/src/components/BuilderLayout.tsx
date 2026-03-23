"use client";

import { BucketSidebar } from "./sidebar/BucketSidebar";
import { BuilderCanvas } from "./canvas/BuilderCanvas";
import { ConfigPanel } from "./config-panel/ConfigPanel";
import { TopBar } from "./ui/TopBar";
import { GenerationModal } from "./ui/GenerationModal";

export function BuilderLayout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-surface-0">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <BucketSidebar />
        <BuilderCanvas />
        <ConfigPanel />
      </div>
      <GenerationModal />
    </div>
  );
}
