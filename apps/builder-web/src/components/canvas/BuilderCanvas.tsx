"use client";

import { useCallback, useRef } from "react";
import { useBuilderStore } from "@/store/builderStore";
import { PlacedBucketCard } from "./PlacedBucketCard";

export function BuilderCanvas() {
  const { buckets, selectedBucketId, selectBucket, updateBucketPosition } =
    useBuilderStore();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Simple drag tracking
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
          <div className="text-center max-w-sm">
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
              Add feature buckets from the left sidebar to start building your app.
            </p>
          </div>
        </div>
      )}

      {/* Event lines SVG (visual connections) */}
      {buckets.length > 1 && (
        <svg className="absolute inset-0 pointer-events-none w-full h-full">
          {buckets.flatMap((src) =>
            buckets
              .filter((dst) => dst.bucketName !== src.bucketName && src.config)
              .filter((dst) =>
                dst.bucketName === "auth" && src.bucketName !== "auth"
              )
              .map((dst) => (
                <line
                  key={`${src.id}-${dst.id}`}
                  x1={src.position.x + 96}
                  y1={src.position.y + 48}
                  x2={dst.position.x + 96}
                  y2={dst.position.y + 48}
                  stroke="#2e2e35"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              ))
          )}
        </svg>
      )}

      {/* Placed bucket cards */}
      {buckets.map((bucket) => (
        <PlacedBucketCard
          key={bucket.id}
          bucket={bucket}
          isSelected={bucket.id === selectedBucketId}
          onMouseDown={(e) => handleMouseDown(bucket.id, e)}
        />
      ))}

      {/* Canvas label */}
      <div className="absolute bottom-4 right-4 text-[11px] text-text-muted font-mono">
        {buckets.length} bucket{buckets.length !== 1 ? "s" : ""} on canvas
      </div>
    </main>
  );
}
