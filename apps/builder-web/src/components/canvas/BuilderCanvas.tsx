"use client";

import { useCallback, useRef } from "react";
import { useBuilderStore } from "@/store/builderStore";
import { PlacedBucketCard } from "./PlacedBucketCard";
import { getBucketManifest } from "@/lib/bucketRegistry";

interface BindingEdge {
  from: { x: number; y: number };
  to: { x: number; y: number };
  label: string;
}

export function BuilderCanvas() {
  const { buckets, selectedBucketId, selectBucket, updateBucketPosition } =
    useBuilderStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      selectBucket(id);
      const bucket = buckets.find((b) => b.id === id);
      if (!bucket) return;

      dragging.current = {
        id,
        startX: e.clientX,
        startY: e.clientY,
        origX: bucket.position.x,
        origY: bucket.position.y,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const dx = ev.clientX - dragging.current.startX;
        const dy = ev.clientY - dragging.current.startY;
        updateBucketPosition(dragging.current.id, {
          x: Math.max(0, dragging.current.origX + dx),
          y: Math.max(0, dragging.current.origY + dy),
        });
      };

      const handleMouseUp = () => {
        dragging.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [buckets, selectBucket, updateBucketPosition]
  );

  // Build binding edges from capabilities
  const edges: BindingEdge[] = [];
  for (const bucket of buckets) {
    const manifest = getBucketManifest(bucket.bucketName);
    if (!manifest) continue;

    for (const [bindingKey, targetName] of Object.entries(manifest.bindings)) {
      const target = buckets.find((b) => b.bucketName === targetName);
      if (!target) continue;

      edges.push({
        from: { x: bucket.position.x + 104, y: bucket.position.y + 56 },
        to: { x: target.position.x + 104, y: target.position.y + 56 },
        label: bindingKey.replace(/Source|Model|From/g, ""),
      });
    }

    // Dependency edges
    for (const dep of manifest.dependencies) {
      const depBucket = buckets.find((b) => b.bucketName === dep);
      if (!depBucket) continue;
      const alreadyHasEdge = edges.some(
        (e) =>
          e.label === dep &&
          e.from.x === bucket.position.x + 104
      );
      if (alreadyHasEdge) continue;

      edges.push({
        from: { x: bucket.position.x + 104, y: bucket.position.y + 56 },
        to: { x: depBucket.position.x + 104, y: depBucket.position.y + 56 },
        label: "needs",
      });
    }
  }

  return (
    <main
      ref={canvasRef}
      className="flex-1 relative overflow-hidden canvas-grid"
      onClick={(e) => {
        if (e.target === canvasRef.current) selectBucket(null);
      }}
    >
      {/* Empty state */}
      {buckets.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-sm px-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="text-text-muted">
                <rect x="4" y="4" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <rect x="18" y="4" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <rect x="4" y="18" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <rect x="18" y="18" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <h3 className="text-text-secondary font-medium mb-2">Canvas is empty</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              Use the <span className="text-accent">AI Build</span> bar above or click buckets in the sidebar to start.
            </p>
          </div>
        </div>
      )}

      {/* Binding / dependency edges */}
      {edges.length > 0 && (
        <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#3d3d47" />
            </marker>
            <marker id="arrowhead-dep" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#4f52c7" />
            </marker>
          </defs>
          {edges.map((edge, i) => {
            const isDep = edge.label === "needs";
            const midX = (edge.from.x + edge.to.x) / 2;
            const midY = (edge.from.y + edge.to.y) / 2;
            return (
              <g key={i}>
                <path
                  d={`M ${edge.from.x} ${edge.from.y} Q ${midX} ${midY - 30} ${edge.to.x} ${edge.to.y}`}
                  fill="none"
                  stroke={isDep ? "#4f52c7" : "#3d3d47"}
                  strokeWidth="1.5"
                  strokeDasharray={isDep ? "4 3" : "none"}
                  markerEnd={isDep ? "url(#arrowhead-dep)" : "url(#arrowhead)"}
                  opacity="0.7"
                />
                <text
                  x={midX}
                  y={midY - 36}
                  textAnchor="middle"
                  fill={isDep ? "#6366f1" : "#52525e"}
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {edge.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}

      {/* Bucket cards */}
      {buckets.map((bucket) => (
        <PlacedBucketCard
          key={bucket.id}
          bucket={bucket}
          isSelected={bucket.id === selectedBucketId}
          onMouseDown={(e) => handleMouseDown(bucket.id, e)}
        />
      ))}

      {/* Canvas info */}
      <div className="absolute bottom-4 right-4 text-[11px] text-text-muted font-mono">
        {buckets.length} bucket{buckets.length !== 1 ? "s" : ""}
        {edges.length > 0 && ` · ${edges.length} connection${edges.length !== 1 ? "s" : ""}`}
      </div>
    </main>
  );
}
