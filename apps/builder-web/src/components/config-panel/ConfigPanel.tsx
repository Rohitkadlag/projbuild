"use client";

import { useMemo } from "react";
import { useBuilderStore } from "@/store/builderStore";
import { getBucketManifest } from "@/lib/bucketRegistry";
import { ConfigFieldRenderer } from "./ConfigFieldRenderer";

export function ConfigPanel() {
  const { selectedBucketId, buckets, updateBucketConfig } = useBuilderStore();

  const selectedBucket = useMemo(
    () => buckets.find((b) => b.id === selectedBucketId) ?? null,
    [buckets, selectedBucketId]
  );

  const manifest = useMemo(
    () => (selectedBucket ? getBucketManifest(selectedBucket.bucketName) : null),
    [selectedBucket]
  );

  if (!selectedBucket || !manifest) {
    return (
      <aside className="w-80 h-full flex flex-col border-l border-border bg-surface-1 animate-slide-in-right">
        <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">
            Config Panel
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-text-muted">
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <p className="text-sm text-text-secondary font-medium mb-1">No bucket selected</p>
            <p className="text-xs text-text-muted">
              Click a bucket on the canvas to edit its configuration.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const categoryColors: Record<string, string> = {
    core: "text-indigo-400",
    data: "text-blue-400",
    engagement: "text-amber-400",
    utility: "text-neutral-400",
    admin: "text-red-400",
  };

  return (
    <aside className="w-80 h-full flex flex-col border-l border-border bg-surface-1 overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{manifest.icon ?? "📦"}</span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              {manifest.displayName}
            </h2>
            <span className={`text-xs font-mono ${categoryColors[manifest.category] ?? "text-text-muted"}`}>
              {manifest.category}
            </span>
          </div>
        </div>
        {manifest.description && (
          <p className="text-xs text-text-muted leading-relaxed">
            {manifest.description}
          </p>
        )}
      </div>

      {/* Metadata tabs */}
      <div className="px-4 py-3 border-b border-border shrink-0 space-y-2">
        {manifest.database.models.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-[10px] text-text-muted font-mono mt-0.5 w-12 shrink-0">models</span>
            <div className="flex flex-wrap gap-1">
              {manifest.database.models.map((m) => (
                <span key={m} className="text-[10px] font-mono bg-surface-3 text-text-secondary px-1.5 py-0.5 rounded border border-border">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
        {manifest.env.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-[10px] text-text-muted font-mono mt-0.5 w-12 shrink-0">env</span>
            <div className="flex flex-wrap gap-1">
              {manifest.env.map((e) => (
                <span key={e} className="text-[10px] font-mono bg-amber-950/30 text-amber-400 px-1.5 py-0.5 rounded border border-amber-800/30">
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}
        {manifest.events.emits.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-[10px] text-text-muted font-mono mt-0.5 w-12 shrink-0">emits</span>
            <div className="flex flex-wrap gap-1">
              {manifest.events.emits.map((ev) => (
                <span key={ev} className="text-[10px] font-mono bg-green-950/30 text-green-400 px-1.5 py-0.5 rounded border border-green-800/30">
                  {ev}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Config fields */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">
          Configuration
        </h3>
        {Object.entries(manifest.configSchema).map(([fieldKey, field]) => (
          <ConfigFieldRenderer
            key={fieldKey}
            fieldKey={fieldKey}
            field={field}
            value={selectedBucket.config[fieldKey]}
            onChange={(value) =>
              updateBucketConfig(selectedBucket.id, fieldKey, value)
            }
          />
        ))}
        {Object.keys(manifest.configSchema).length === 0 && (
          <p className="text-xs text-text-muted text-center py-8">
            No configuration options for this bucket.
          </p>
        )}
      </div>
    </aside>
  );
}
