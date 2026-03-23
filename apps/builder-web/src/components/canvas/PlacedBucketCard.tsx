"use client";

import { useBuilderStore, type PlacedBucket } from "@/store/builderStore";

const categoryAccents: Record<string, string> = {
  core: "border-indigo-800/50 bg-indigo-950/20",
  data: "border-blue-800/50 bg-blue-950/20",
  engagement: "border-amber-800/50 bg-amber-950/20",
  utility: "border-neutral-700/50 bg-neutral-900/30",
  admin: "border-red-800/50 bg-red-950/20",
};

const categoryDots: Record<string, string> = {
  core: "bg-indigo-500",
  data: "bg-blue-500",
  engagement: "bg-amber-500",
  utility: "bg-neutral-400",
  admin: "bg-red-500",
};

interface PlacedBucketCardProps {
  bucket: PlacedBucket;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function PlacedBucketCard({
  bucket,
  isSelected,
  onMouseDown,
}: PlacedBucketCardProps) {
  const { removeBucket } = useBuilderStore();

  const configEntries = Object.entries(bucket.config).slice(0, 3);
  const accentClass = categoryAccents[bucket.category] ?? categoryAccents.utility;
  const dotClass = categoryDots[bucket.category] ?? categoryDots.utility;

  return (
    <div
      style={{
        position: "absolute",
        left: bucket.position.x,
        top: bucket.position.y,
        userSelect: "none",
      }}
      className={`
        w-52 rounded-2xl border transition-all duration-150 cursor-grab active:cursor-grabbing
        ${isSelected
          ? "border-accent bg-surface-2 bucket-selected"
          : `${accentClass} bg-surface-2 hover:border-border-bright`
        }
        shadow-layer-2
      `}
      onMouseDown={onMouseDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{bucket.icon}</span>
          <div>
            <div className="text-sm font-semibold text-text-primary leading-none mb-1">
              {bucket.displayName}
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
              <span className="text-[10px] text-text-muted font-mono">
                {bucket.category}
              </span>
            </div>
          </div>
        </div>

        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            removeBucket(bucket.id);
          }}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md hover:bg-danger/20 hover:text-danger text-text-muted transition-all"
          style={{ opacity: isSelected ? 1 : undefined }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Config preview */}
      <div className="px-4 py-3 space-y-1.5">
        {configEntries.map(([key, val]) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-text-muted font-mono truncate">{key}</span>
            <span className="text-[10px] text-text-secondary font-mono truncate max-w-[80px]">
              {typeof val === "boolean"
                ? val ? "true" : "false"
                : typeof val === "object"
                ? Array.isArray(val)
                  ? `[${(val as unknown[]).length}]`
                  : "{...}"
                : String(val)}
            </span>
          </div>
        ))}
        {Object.keys(bucket.config).length > 3 && (
          <div className="text-[10px] text-text-muted">
            +{Object.keys(bucket.config).length - 3} more
          </div>
        )}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="px-4 pb-3">
          <div className="text-[10px] text-accent font-mono">
            ← editing in config panel
          </div>
        </div>
      )}
    </div>
  );
}
