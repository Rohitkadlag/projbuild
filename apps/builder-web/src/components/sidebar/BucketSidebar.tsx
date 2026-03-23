"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import type { BucketManifest } from "@app-builder/bucket-sdk";
import { getBucketsByCategory, CATEGORY_ORDER, CATEGORY_LABELS } from "@/lib/bucketRegistry";
import { createDefaultConfig } from "@/lib/defaultConfig";
import { useBuilderStore } from "@/store/builderStore";

const categoryColors: Record<string, string> = {
  core: "badge-core",
  data: "badge-data",
  engagement: "badge-engagement",
  utility: "badge-utility",
  admin: "badge-admin",
};

function BucketItem({ manifest }: { manifest: BucketManifest }) {
  const { addBucket, buckets } = useBuilderStore();
  const alreadyAdded = buckets.some((b) => b.bucketName === manifest.name);

  function handleAdd() {
    if (alreadyAdded) return;
    const id = nanoid();
    addBucket({
      id,
      bucketName: manifest.name,
      displayName: manifest.displayName,
      icon: manifest.icon ?? "📦",
      category: manifest.category,
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
      },
      config: createDefaultConfig(manifest),
    });
  }

  return (
    <button
      onClick={handleAdd}
      disabled={alreadyAdded}
      className={`
        group w-full text-left rounded-xl p-3 border transition-all duration-150
        ${alreadyAdded
          ? "border-accent/40 bg-accent/5 cursor-default"
          : "border-border bg-surface-2 hover:border-border-bright hover:bg-surface-3 bucket-card-hover cursor-pointer active:scale-[0.98]"
        }
      `}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none mt-0.5">{manifest.icon ?? "📦"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-medium ${alreadyAdded ? "text-accent-bright" : "text-text-primary group-hover:text-white"} transition-colors`}>
              {manifest.displayName}
            </span>
            {alreadyAdded && (
              <span className="text-[10px] text-accent-bright font-mono">added</span>
            )}
          </div>
          <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
            {manifest.description}
          </p>
          {manifest.dependencies.length > 0 && (
            <div className="mt-2 flex items-center gap-1">
              <span className="text-[10px] text-text-muted">needs:</span>
              {manifest.dependencies.map((dep) => (
                <span key={dep} className="text-[10px] font-mono text-text-secondary bg-surface-3 px-1.5 py-0.5 rounded">
                  {dep}
                </span>
              ))}
            </div>
          )}
        </div>
        {!alreadyAdded && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-text-muted">
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        )}
        {alreadyAdded && (
          <div className="shrink-0">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-accent">
              <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}

export function BucketSidebar() {
  const grouped = getBucketsByCategory();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleCategory(cat: string) {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  return (
    <aside className="w-72 h-full flex flex-col border-r border-border bg-surface-1 overflow-hidden animate-slide-in-left">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">
          Feature Buckets
        </h2>
        <p className="text-xs text-text-muted mt-1">
          Click to add to canvas
        </p>
      </div>

      {/* Bucket list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped[cat];
          if (!items || items.length === 0) return null;
          const isCollapsed = collapsed[cat];

          return (
            <div key={cat}>
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between mb-2 px-1"
              >
                <div className="flex items-center gap-2">
                  <span className={`badge ${categoryColors[cat] ?? "badge-utility"}`}>
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span className="text-xs text-text-muted">{items.length}</span>
                </div>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  className={`text-text-muted transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                >
                  <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {!isCollapsed && (
                <div className="space-y-1.5 animate-fade-in">
                  {items.map((manifest) => (
                    <BucketItem key={manifest.name} manifest={manifest} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer tip */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <p className="text-[11px] text-text-muted leading-relaxed">
          Dependencies are resolved automatically when you generate.
        </p>
      </div>
    </aside>
  );
}
